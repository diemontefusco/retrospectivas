const SUPABASE_URL = "https://cjhnxghbbblnmumkutyy.supabase.co";
const SUPABASE_KEY = "sb_publishable_7U9b09ElsfExwu8hzDS49Q_CigP-_1s";

const supabaseClient = supabase.createClient(
  SUPABASE_URL,
  SUPABASE_KEY
);


// =====================================================
// RETRO ACTUAL
// =====================================================

const urlParams = new URLSearchParams(window.location.search);

const RETRO_CODE =
  urlParams.get("retro") || null;

console.log("Código de retro:", RETRO_CODE);


// =====================================================
// ESTADO
// =====================================================

let suppressCardRealtime = false;

const state = {
  step: 0,
  energy: null,

  // Votos acumulados de todos los participantes
  votes: {},

  // Votos realizados por este participante
  myVotes: {},

  // Cantidad de votos utilizados
  usedVotes: 0,

  // Session ID del navegador
  participantSessionId: null,

  // ID del participante en Supabase
  participantId: null,

  // Datos del participante
  participant: null,

  // Tarjetas de la retro
  cards: [],

  // Temas en común persistidos de la retro
  topics: [],

  // Retro actual
  retroId: null,

  // Preguntas de la conversación
  guidingQuestions: [],

  // Acciones
  actions: [],

  // ---------------------------------------------------
  // FACILITADOR
  // ---------------------------------------------------

  isFacilitator: false,

  facilitatorSessionId: null,
  facilitatorName: null,
  retroStarted: false,
  retroStartedAt: null,
  retroFinishedAt: null,
  feedbackSubmitted: false,
  feedbackLoaded: false,
  showFeedback: false,
  participants: [],

  // Autosave de respuestas
  answerAutosaveTimers: {},
  answerAutosaveStatus: {},
  editingQuestionAnswers: {}
};


// =====================================================
// CONFIGURACIÓN
// =====================================================

const MAX_VOTES_PER_PARTICIPANT = 3;

const TOPIC_STOP_WORDS = new Set([
  "para", "como", "pero", "porque", "cuando", "donde", "desde", "hasta",
  "entre", "sobre", "ante", "hacia", "segun", "tambien", "muy", "mas",
  "menos", "todo", "toda", "todos", "todas", "algo", "nada", "esto",
  "esta", "este", "estas", "estos", "que", "del", "las", "los", "una",
  "uno", "unos", "unas", "con", "sin", "por", "una", "hay", "fue",
  "ser", "son", "era", "eran", "nos", "nosotros", "nuestro", "nuestra",
  "muy", "ya", "se", "su", "sus", "al", "el", "la", "y", "o", "a",
  "en", "de", "un", "es", "me", "te", "le", "lo", "mi", "tu", "para"
]);


function normalizeTopicText(value) {
  return String(value || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function answerDraftStorageKey(questionId) {
  return `retro-answer-draft-${state.retroId}-${questionId}-${state.participantSessionId || "session"}`;
}

function getAnswerDraft(questionId) {
  try {
    return localStorage.getItem(answerDraftStorageKey(questionId)) || "";
  } catch (error) {
    return "";
  }
}

function setAnswerDraft(questionId, value) {
  try {
    if (String(value || "").trim()) {
      localStorage.setItem(answerDraftStorageKey(questionId), String(value));
    } else {
      localStorage.removeItem(answerDraftStorageKey(questionId));
    }
  } catch (error) {
    console.warn("No se pudo guardar el borrador local de la respuesta:", error);
  }
}

function clearAnswerDraft(questionId) {
  try {
    localStorage.removeItem(answerDraftStorageKey(questionId));
  } catch (error) {
    // El autosave en Supabase sigue funcionando aunque localStorage no esté disponible.
  }
}

function setAnswerAutosaveStatus(questionId, status) {
  state.answerAutosaveStatus[questionId] = status;

  const statusElement = document.querySelector(`.answer-autosave-status[data-question-id="${questionId}"]`);
  if (!statusElement) return;

  if (status === "saving") {
    statusElement.textContent = "Guardando…";
    statusElement.style.color = "";
  } else if (status === "saved") {
    statusElement.innerHTML = '<span style="color:#35d07f;font-weight:600;">✓ Respuesta guardada</span>';
  } else if (status === "error") {
    statusElement.textContent = "No se pudo guardar. Se reintentará al editar.";
    statusElement.style.color = "";
  } else {
    statusElement.textContent = "";
    statusElement.style.color = "";
  }
}

function getQuestionAnswerForRender(question) {
  const draft = getAnswerDraft(question.id);
  if (draft && !String(question.answer || "").trim()) return draft;
  return question.answer || "";
}

async function autosaveGuidingQuestionAnswer(questionId, value) {
  const answer = String(value || "").trim();
  const question = state.guidingQuestions.find(item => item.id === questionId);
  if (!question) return false;

  if (!answer) {
    setAnswerAutosaveStatus(questionId, "empty");
    return false;
  }

  if (answer === String(question.answer || "").trim()) {
    clearAnswerDraft(questionId);
    setAnswerAutosaveStatus(questionId, "saved");
    return true;
  }

  setAnswerAutosaveStatus(questionId, "saving");

  try {
    const { data, error } = await supabaseClient.rpc("save_guiding_question_answer", {
      p_retro_id: state.retroId,
      p_session_id: state.participantSessionId,
      p_question_id: questionId,
      p_respuesta: answer
    });

    if (error) throw error;
    if (!data?.success) throw new Error(data?.message || "No se pudo guardar la respuesta.");

    question.answer = answer;
    clearAnswerDraft(questionId);
    setAnswerAutosaveStatus(questionId, "saved");
    return true;
  } catch (error) {
    console.error("Error en autosave de respuesta:", error);
    setAnswerAutosaveStatus(questionId, "error");
    return false;
  }
}

function scheduleGuidingQuestionAutosave(questionId, value, immediate = false) {
  clearTimeout(state.answerAutosaveTimers[questionId]);
  setAnswerDraft(questionId, value);
  setAnswerAutosaveStatus(questionId, String(value || "").trim() ? "saving" : "empty");

  const delay = immediate ? 0 : 900;
  state.answerAutosaveTimers[questionId] = setTimeout(async () => {
    await autosaveGuidingQuestionAnswer(questionId, value);
  }, delay);
}


function stemTopicToken(token) {
  let value = String(token || "");
  if (value.length <= 4) return value;

  const suffixes = [
    "amientos", "imiento", "imientos", "aciones", "acion",
    "mente", "ando", "iendo", "ados", "adas", "idos", "idas",
    "es", "os", "as", "s"
  ];

  for (const suffix of suffixes) {
    if (value.endsWith(suffix) && value.length - suffix.length >= 4) {
      return value.slice(0, -suffix.length);
    }
  }

  return value;
}

function getMeaningfulTokens(value) {
  return normalizeTopicText(value)
    .split(" ")
    .map(token => stemTopicToken(token.trim()))
    .filter(token =>
      token.length >= 4 &&
      !TOPIC_STOP_WORDS.has(token) &&
      !/^\d+$/.test(token)
    );
}


function topicKeyFromLabel(label) {
  return String(label || "")
    .trim()
    .slice(0, 120);
}


function titleCaseTopic(label) {
  return String(label || "")
    .split(" ")
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}



function getTopVotedTopic() {
  return getDynamicTopics()
    .slice()
    .sort((a, b) =>
      (state.votes[b.key] || 0) -
      (state.votes[a.key] || 0) ||
      (b.count || 0) - (a.count || 0) ||
      a.label.localeCompare(b.label)
    )[0] || null;
}

function getQuestionFocusWords(cards, topicLabel) {
  const topicTokens = new Set(getMeaningfulTokens(topicLabel));
  const counts = new Map();

  cards.forEach(card => {
    const unique = new Set(getMeaningfulTokens(card.contenido));
    unique.forEach(token => {
      if (topicTokens.has(token)) return;
      counts.set(token, (counts.get(token) || 0) + 1);
    });
  });

  return Array.from(counts.entries())
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .slice(0, 2)
    .map(([token]) => titleCaseTopic(token));
}

function buildGuidingQuestionSuggestions(topic, cards) {
  if (!topic) return [];

  const label = topic.label;
  const quotedLabel = `"${label}"`;
  const focusWords = getQuestionFocusWords(cards, label);
  const focus = focusWords.length
    ? `, especialmente alrededor de ${focusWords.join(" y ")}`
    : "";

  const redCount = cards.filter(card => card.etapa === "red").length;
  const blueCount = cards.filter(card => card.etapa === "blue").length;

  const suggestions = [
    `¿Qué patrón común hay detrás de las situaciones vinculadas a ${quotedLabel}${focus}?`,
    redCount > 0
      ? `¿Qué condición de nuestro sistema de trabajo está generando o sosteniendo los problemas asociados a ${quotedLabel}?`
      : `¿Qué parte de nuestra forma de trabajar podríamos cambiar para mejorar lo que aparece alrededor de ${quotedLabel}?`,
    blueCount > 0
      ? `¿Qué aprendimos de estas situaciones que deberíamos incorporar a nuestra forma de trabajar para que ${quotedLabel} evolucione?`
      : `¿Qué información, decisión o coordinación nos está faltando para abordar mejor ${quotedLabel}?`
  ];

  return Array.from(new Set(suggestions)).slice(0, 3);
}

function questionExists(text) {
  const normalized = normalizeTopicText(text);
  return state.guidingQuestions.some(question =>
    normalizeTopicText(question.text) === normalized
  );
}

function getDynamicTopics() {
  const grouped = new Map();

  // Los temas en común persistidos son la fuente principal porque permiten
  // tener temas en común manuales aunque todavía no tengan tarjetas asignadas.
  (state.topics || []).forEach(topic => {
    grouped.set(topic.topic_key, {
      key: topic.topic_key,
      label: topic.label,
      count: 0,
      orden: topic.orden || 0
    });
  });

  // Fallback para datos existentes que todavía no hayan sido migrados
  // a retro_topics.
  state.cards
    .filter(card => card.topic_key)
    .forEach(card => {
      const key = card.topic_key;

      if (!grouped.has(key)) {
        grouped.set(key, {
          key,
          label: key,
          count: 0,
          orden: 9999
        });
      }

      grouped.get(key).count += 1;
    });

  return Array.from(grouped.values())
    .sort((a, b) =>
      (a.orden - b.orden) ||
      b.count - a.count ||
      a.label.localeCompare(b.label)
    );
}


function shouldSkipVotingStep() {
  return getDynamicTopics().length <= 1;
}

function normalizeStepForTopics(step) {
  const numericStep = Number(step);
  return numericStep === 4 && shouldSkipVotingStep() ? 5 : numericStep;
}

function getProgressMeta(step) {
  const skippedVoting = shouldSkipVotingStep();
  const visibleSteps = skippedVoting
    ? steps.filter((_, index) => index !== 4)
    : steps;
  const visibleIndex = visibleSteps.indexOf(steps[Number(step)]);

  return {
    current: Math.max(0, visibleIndex) + 1,
    total: visibleSteps.length
  };
}

function getTopicLabel(topicKey) {
  if (!topicKey) return "Sin agrupar";

  const topic = getDynamicTopics()
    .find(topic => topic.key === topicKey);

  return topic ? topic.label : topicKey;
}


function getTopicCount(topicKey) {
  return state.cards.filter(
    card => card.topic_key === topicKey
  ).length;
}


function getGroupedCards(topicKey) {
  return state.cards.filter(
    card => card.topic_key === topicKey
  );
}

function buildDynamicTopics(cards) {
  const prepared = cards.map(card => ({
    card,
    tokens: new Set(getMeaningfulTokens(card.contenido))
  }));

  if (!prepared.length) {
    return { candidates: [], assignments: new Map() };
  }

  // La agrupación automática busca patrones en las palabras con mayor
  // presencia temática. No usa categorías predefinidas y nunca propone
  // más de 3 temas en común.
  const frequencies = new Map();
  const positions = new Map();

  prepared.forEach(item => {
    item.tokens.forEach(token => {
      frequencies.set(token, (frequencies.get(token) || 0) + 1);
      if (!positions.has(token)) positions.set(token, []);
    });

    const tokens = Array.from(item.tokens);
    tokens.forEach((token, index) => positions.get(token).push(index));
  });

  // Peso temático simple: prioriza concurrencia entre textos y, en empate,
  // palabras más específicas/largas. Los stop words ya fueron excluidos.
  const scoredTokens = Array.from(frequencies.entries())
    .map(([token, frequency]) => ({
      token,
      frequency,
      score: frequency * (1 + Math.min(token.length, 12) / 12)
    }))
    .sort((a, b) =>
      b.score - a.score ||
      b.frequency - a.frequency ||
      b.token.length - a.token.length ||
      a.token.localeCompare(b.token)
    );

  // Elegimos hasta 3 palabras clave suficientemente concurrentes y
  // procurando que cada una represente un grupo diferente de tarjetas.
  const keywords = [];
  const coveredCards = new Set();

  for (const candidate of scoredTokens) {
    if (keywords.length >= 3) break;
    if (candidate.frequency < 2) continue;

    const matching = prepared.filter(item => item.tokens.has(candidate.token));
    if (matching.length < 2) continue;

    // Evitar que las 3 claves sean prácticamente el mismo grupo.
    const matchingIds = new Set(matching.map(item => item.card.id));
    const overlapWithExisting = keywords.some(keyword => {
      const existingIds = keyword.cardIds;
      const intersection = existingIds.filter(id => matchingIds.has(id)).length;
      const union = new Set([...existingIds, ...matchingIds]).size;
      return union > 0 && intersection / union >= 0.8;
    });

    if (overlapWithExisting) continue;

    keywords.push({
      token: candidate.token,
      frequency: candidate.frequency,
      cardIds: matching.map(item => item.card.id)
    });

    matching.forEach(item => coveredCards.add(item.card.id));
  }

  // Si no encontramos palabras repetidas, usamos similitud entre tarjetas
  // para detectar hasta 3 grupos sin inventar categorías.
  if (!keywords.length) {
    const remaining = new Set(prepared.map(item => item.card.id));

    while (remaining.size >= 2 && keywords.length < 3) {
      let bestPair = null;

      for (const seedId of remaining) {
        const seed = prepared.find(item => item.card.id === seedId);
        if (!seed) continue;

        for (const candidate of prepared) {
          if (candidate.card.id === seedId || !remaining.has(candidate.card.id)) continue;

          const intersection = Array.from(seed.tokens)
            .filter(token => candidate.tokens.has(token)).length;
          const union = new Set([...seed.tokens, ...candidate.tokens]).size;
          const similarity = union ? intersection / union : 0;

          if (!bestPair || similarity > bestPair.similarity) {
            bestPair = { seed, candidate, similarity };
          }
        }
      }

      if (!bestPair || bestPair.similarity <= 0) break;

      const groupIds = [bestPair.seed.card.id, bestPair.candidate.card.id];
      const groupItems = [bestPair.seed, bestPair.candidate];
      const groupFrequency = new Map();

      groupItems.forEach(item => {
        item.tokens.forEach(token => {
          groupFrequency.set(token, (groupFrequency.get(token) || 0) + 1);
        });
      });

      const keyword = Array.from(groupFrequency.entries())
        .sort((a, b) => b[1] - a[1] || b[0].length - a[0].length || a[0].localeCompare(b[0]))[0]?.[0];

      if (!keyword) break;

      keywords.push({ token: keyword, frequency: 2, cardIds: groupIds });
      groupIds.forEach(id => remaining.delete(id));
    }
  }

  // Si todavía no hay ningún grupo, usamos la palabra más relevante de los
  // textos como único tema en común, manteniendo el máximo de 3.
  if (!keywords.length) {
    const fallback = scoredTokens[0];
    if (fallback) {
      keywords.push({
        token: fallback.token,
        frequency: fallback.frequency,
        cardIds: prepared
          .filter(item => item.tokens.has(fallback.token))
          .map(item => item.card.id)
      });
    }
  }

  const candidates = keywords.slice(0, 3).map(keyword => ({
    key: topicKeyFromLabel(titleCaseTopic(keyword.token)),
    label: titleCaseTopic(keyword.token)
  }));

  const assignments = new Map();

  // Asignamos cada texto al tema cuya palabra clave comparte, priorizando
  // la cantidad de palabras relevantes compartidas con el grupo.
  prepared.forEach(item => {
    let best = null;

    candidates.forEach((candidate, index) => {
      const keyword = keywords[index];
      const keywordMatches = item.tokens.has(keyword.token) ? 1 : 0;
      const groupItems = prepared.filter(groupItem => keyword.cardIds.includes(groupItem.card.id));
      const groupTokens = new Set(groupItems.flatMap(groupItem => Array.from(groupItem.tokens)));
      const shared = Array.from(item.tokens).filter(token => groupTokens.has(token)).length;
      const score = keywordMatches * 100 + shared;

      if (!best || score > best.score) {
        best = { candidate, score };
      }
    });

    if (best) {
      assignments.set(item.card.id, {
        key: best.candidate.key,
        label: best.candidate.label,
        count: 1
      });
    }
  });

  return {
    candidates,
    assignments
  };
}

const steps = [
  "Inicio",
  "Check-in",
  "Actividad",
  "Agrupación",
  "Votación",
  "Preguntas",
  "Acciones",
  "Cierre"
];


// =====================================================
// HELPERS
// =====================================================

function escapeHtml(value) {
  if (value === null || value === undefined) {
    return "";
  }

  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}


// =====================================================
// SESSION ID
// =====================================================

function getParticipantSessionId() {

  if (!state.retroId) {
    console.error(
      "No se puede generar Session ID sin retroId."
    );

    return null;
  }

  const storageKey =
    `retro-session-id-${state.retroId}`;

  let sessionId =
    localStorage.getItem(storageKey);

  if (!sessionId) {

    sessionId =
      crypto.randomUUID();

    localStorage.setItem(
      storageKey,
      sessionId
    );

    console.log(
      "Nuevo Session ID generado:",
      sessionId
    );

  } else {

    console.log(
      "Session ID recuperado:",
      sessionId
    );
  }

  state.participantSessionId =
    sessionId;

  return sessionId;
}


// =====================================================
// PARTICIPANTE
// =====================================================

async function loadParticipant() {

  const sessionId =
    getParticipantSessionId();

  if (!sessionId) {
    return false;
  }

  console.log(
    "Session ID:",
    sessionId
  );


  // ---------------------------------------------------
  // BUSCAR PARTICIPANTE EXISTENTE
  // ---------------------------------------------------

  const {
    data: existing,
    error: searchError
  } = await supabaseClient
    .from("participantes")
    .select("*")
    .eq("retro_id", state.retroId)
    .eq("session_id", sessionId)
    .maybeSingle();


  if (searchError) {

    console.error(
      "Error buscando participante:",
      searchError
    );

    return false;
  }


  if (existing) {

    state.participant =
      existing;

    state.participantId =
      existing.id;

    console.log(
      "Participante recuperado:",
      existing
    );

    return true;
  }


  // ---------------------------------------------------
  // CREAR PARTICIPANTE
  // ---------------------------------------------------

  const {
    data: created,
    error: createError
  } = await supabaseClient
    .from("participantes")
    .insert({
      retro_id: state.retroId,
      session_id: sessionId
    })
    .select()
    .single();


  if (createError) {

    console.error(
      "Error creando participante:",
      createError
    );

    return false;
  }


  state.participant =
    created;

  state.participantId =
    created.id;

  console.log(
    "Nuevo participante creado:",
    created
  );

  return true;
}


// =====================================================
// CARGAR VOTOS DEL PARTICIPANTE
// =====================================================

async function loadMyVotes() {

  if (!state.participantId) {
    return;
  }

  const {
    data,
    error
  } = await supabaseClient
    .from("voto_participantes")
    .select("topic_key")
    .eq("retro_id", state.retroId)
    .eq("participante_id", state.participantId);


  if (error) {

    console.error(
      "Error cargando votos del participante:",
      error
    );

    state.myVotes = {};
    state.usedVotes = 0;

    return;
  }


  state.myVotes = {};

  (data || []).forEach(row => {

    state.myVotes[row.topic_key] =
      (state.myVotes[row.topic_key] || 0) + 1;

  });


  state.usedVotes =
    (data || []).length;


  console.log(
    "Mis votos:",
    state.myVotes
  );

  console.log(
    "Votos utilizados:",
    state.usedVotes
  );
}


// =====================================================
// PERFIL DEL PARTICIPANTE
// =====================================================

async function setParticipantProfile(nombre, listo) {

  if (!state.retroId || !state.participantSessionId) {
    return false;
  }

  // Si el participante fue eliminado por un reinicio de sala,
  // recreamos la sesión antes de guardar el perfil.
  if (!state.participantId) {
    const recreated = await loadParticipant();
    if (!recreated || !state.participantId) {
      return false;
    }
  }

  const cleanName = String(nombre || "").trim();

  if (!cleanName) {
    alert("Ingresá tu nombre y apellido.");
    return false;
  }

  const { data, error } = await supabaseClient
    .rpc("set_participant_profile", {
      p_retro_id: state.retroId,
      p_session_id: state.participantSessionId,
      p_nombre: cleanName,
      p_listo: Boolean(listo)
    });

  if (error) {
    console.error("Error actualizando perfil:", error);
    alert("No se pudo guardar tu perfil.\n\n" + error.message);
    return false;
  }

  state.participant = {
    ...(state.participant || {}),
    nombre: cleanName,
    listo: Boolean(listo)
  };

  console.log("Perfil actualizado:", data);
  await loadParticipants();
  render();
  return true;
}


async function loadParticipants() {

  if (!state.retroId) {
    return;
  }

  const { data, error } = await supabaseClient
    .from("participantes")
    .select("id, retro_id, session_id, nombre, listo")
    .eq("retro_id", state.retroId);

  if (error) {
    console.error("Error cargando participantes:", error);
    return;
  }

  state.participants = data || [];

  const current = state.participants.find(
    participant => participant.id === state.participantId
  );

  if (current) {
    state.participant = current;
  } else {
    // Si el participante fue eliminado (por ejemplo, al reiniciar la sala),
    // limpiar también la identidad local para volver a pedir nombre y apellido.
    state.participant = null;
    state.participantId = null;
  }
}


function getParticipantName() {
  return (state.participant?.nombre || "").trim();
}


function isParticipantReady() {
  return Boolean(state.participant?.listo);
}


function lobbyScreen() {

  const readyCount = state.participants.filter(
    participant => participant.listo
  ).length;

  const totalCount = state.participants.length;
  const currentName = getParticipantName();
  const currentReady = isParticipantReady();

  const sortedParticipants = [...state.participants].sort((a, b) => {
    const aIsFacilitator = a.session_id === state.facilitatorSessionId;
    const bIsFacilitator = b.session_id === state.facilitatorSessionId;

    if (aIsFacilitator && !bIsFacilitator) return -1;
    if (!aIsFacilitator && bIsFacilitator) return 1;

    return (a.nombre || "").localeCompare(
      b.nombre || "",
      "es",
      { sensitivity: "base" }
    );
  });

  return `
    <section>

      <div class="eyebrow">
        Antes de empezar
      </div>

      <h2>
        Preparémonos para la retro.
      </h2>

      <p class="lead">
        Ingresá tu nombre y apellido y marcate como listo.
        El facilitador va a iniciar la retro cuando considere que es momento de empezar.
      </p>

      <div
        class="card"
        style="margin-top:30px;">

        <div class="eyebrow" style="margin-bottom:10px;">
          Tu identificación
        </div>

        <input
          id="participantName"
          type="text"
          value="${escapeHtml(currentName)}"
          placeholder="Nombre y apellido"
          autocomplete="name"
          style="width:100%;"
          ${currentReady ? "disabled" : ""}>

        <button
          id="readyBtn"
          class="primary"
          style="margin-top:12px;"
          ${currentReady ? "disabled" : ""}>
          ${currentReady ? "✓ Listo para empezar" : "Listo para empezar"}
        </button>

        ${currentReady ? `
          <button
            id="editParticipantBtn"
            style="
              margin-top:10px;
              padding:9px 14px;
              border-radius:10px;
              cursor:pointer;
              background:transparent;
              border:1px solid rgba(255,255,255,.18);
              color:inherit;
            ">
            Cambiar nombre
          </button>
        ` : ""}

      </div>

      <div
        class="card"
        style="margin-top:20px;">

        <div class="eyebrow" style="margin-bottom:14px;">
          Participantes
        </div>

        <div style="display:grid;gap:10px;">
          ${
            state.participants.length === 0
              ? `<p style="margin:0;opacity:.65;">Todavía no hay participantes.</p>`
              : sortedParticipants.map(participant => {
                  const isFacilitator =
                    participant.session_id === state.facilitatorSessionId;

                  return `
                    <div
                      style="
                        display:flex;
                        align-items:center;
                        justify-content:space-between;
                        gap:12px;
                        padding:10px 0;
                        border-bottom:1px solid rgba(255,255,255,.07);
                      ">
                      <div style="display:flex;align-items:center;gap:9px;min-width:0;">
                        ${isFacilitator ? `
                          <span
                            title="Facilitador"
                            aria-label="Facilitador"
                            style="font-size:18px;line-height:1;">
                            👑
                          </span>
                        ` : ""}
                        <div style="min-width:0;">
                          <div style="font-weight:${isFacilitator ? "700" : "500"};">
                            ${escapeHtml(participant.nombre || "Sin identificar")}
                          </div>
                          ${isFacilitator ? `
                            <div style="font-size:11px;letter-spacing:.06em;text-transform:uppercase;opacity:.6;margin-top:2px;">
                              Facilitador
                            </div>
                          ` : ""}
                        </div>
                      </div>
                      <span
                        class="badge"
                        style="
                          flex-shrink:0;
                          ${participant.listo
                            ? "border-color:rgba(84,255,209,.3);"
                            : "opacity:.65;"}
                        ">
                        ${participant.listo ? "✓ Listo" : "○ Pendiente"}
                      </span>
                    </div>
                  `;
                }).join("")
          }
        </div>

        <p style="margin:18px 0 0;opacity:.7;">
          ${readyCount} de ${totalCount} listos
        </p>

      </div>

      ${state.isFacilitator ? `
        <div
          class="card"
          style="margin-top:20px;border-color:rgba(84,255,209,.25);">
          <strong>
            Tenés el control como facilitador.
          </strong>
          <p style="margin-bottom:0;opacity:.75;">
            Podés iniciar la retro aunque todavía no estén todos listos.
          </p>
        </div>
      ` : ""}

    </section>
  `;
}


// =====================================================
// FACILITADOR - ESTADO
// =====================================================

function updateFacilitatorState() {

  state.isFacilitator =
    Boolean(
      state.facilitatorSessionId &&
      state.participantSessionId &&
      state.facilitatorSessionId ===
        state.participantSessionId
    );

}


// =====================================================
// FACILITADOR - TOMAR CONTROL
// =====================================================

async function claimFacilitator() {

  if (
    !state.retroId ||
    !state.participantSessionId
  ) {
    return;
  }

  const {
    data,
    error
  } = await supabaseClient
    .rpc(
      "claim_facilitator",
      {
        p_retro_id:
          state.retroId,

        p_session_id:
          state.participantSessionId
      }
    );


  if (error) {

    console.error(
      "Error tomando control como facilitador:",
      error
    );

    alert(
      "No se pudo tomar el control como facilitador.\n\n" +
      error.message
    );

    return;
  }


  console.log(
    "Resultado claim facilitador:",
    data
  );


  // Al tomar el control, el facilitador queda
  // identificado y listo para comenzar.
  await setParticipantProfile(
    state.participant?.nombre || "",
    true
  );


  // ---------------------------------------------------
  // Volvemos a consultar la retro para conocer
  // el estado real del facilitador.
  // ---------------------------------------------------

  await refreshRetroState();
  await loadParticipants();

  render();
}


// =====================================================
// FACILITADOR - CONFIRMACIÓN
// =====================================================

function openFacilitatorConfirmation() {

  const modal =
    document.querySelector("#facilitatorModal");

  if (!modal) {
    return;
  }

  modal.style.display = "flex";
}


function closeFacilitatorConfirmation() {

  const modal =
    document.querySelector("#facilitatorModal");

  if (!modal) {
    return;
  }

  modal.style.display = "none";
}


async function confirmClaimFacilitator() {

  closeFacilitatorConfirmation();

  await claimFacilitator();
}


// =====================================================
// FACILITADOR - LIBERAR CONTROL
// =====================================================

// =====================================================
// FACILITADOR - REINICIAR SALA
// =====================================================

async function resetRetro() {

  if (!state.retroId || !state.participantSessionId) {
    return;
  }

  const confirmed = window.confirm(
    "¿Reiniciar la sala?\n\n" +
    "Se van a borrar todas las tarjetas de actividad, agrupaciones, votos, acciones y participantes.\n" +
    "Todos tendrán que volver a ingresar su nombre para participar.\n\n" +
    "Esta acción no se puede deshacer."
  );

  if (!confirmed) {
    return;
  }

  const { data, error } = await supabaseClient.rpc(
    "reset_retro",
    {
      p_retro_id: state.retroId,
      p_session_id: state.participantSessionId
    }
  );

  if (error) {
    console.error("Error reiniciando la sala:", error);
    alert(
      "No se pudo reiniciar la sala.\n\n" +
      error.message
    );
    return;
  }

  console.log("Sala reiniciada:", data);

  state.step = 0;
  state.retroStarted = false;
  state.votes = {};
  state.myVotes = {};
  state.usedVotes = 0;
  state.cards = [];
  state.guidingQuestions = [];
  state.actions = [];
  state.answerAutosaveTimers = {};
  state.answerAutosaveStatus = {};
  state.editingQuestionAnswers = {};
  state.facilitatorSessionId = null;
  state.facilitatorName = null;
  state.isFacilitator = false;

  localStorage.removeItem(
    `retro-my-votes-${state.retroId}`
  );

  await refreshRetroState();

  // El reset elimina también al participante actual.
  // Lo recreamos como una sesión nueva, todavía sin nombre/listo,
  // para que la sala vuelva a mostrar 0 de 1 y crezca a medida
  // que ingresen nuevas personas.
  await loadParticipant();
  await loadParticipants();
  render();
}


async function releaseFacilitator() {

  if (
    !state.retroId ||
    !state.participantSessionId
  ) {
    return;
  }

  const confirmed =
    window.confirm(
      "¿Liberar el control como facilitador?\n\n" +
      "Otro participante podrá tomar el control de la retro."
    );

  if (!confirmed) {
    return;
  }


  const {
    data,
    error
  } = await supabaseClient
    .rpc(
      "release_facilitator",
      {
        p_retro_id:
          state.retroId,

        p_session_id:
          state.participantSessionId
      }
    );


  if (error) {

    console.error(
      "Error liberando control:",
      error
    );

    alert(
      "No se pudo liberar el control.\n\n" +
      error.message
    );

    return;
  }


  console.log(
    "Control de facilitador liberado:",
    data
  );


  await refreshRetroState();

  render();
}


// =====================================================
// FACILITADOR - INICIAR RETRO
// =====================================================

async function startRetro() {

  if (!state.retroId || !state.participantSessionId) {
    return;
  }

  // Antes de iniciar, sincronizamos con Supabase para evitar que
  // el estado local quede desactualizado respecto del facilitador real.
  await refreshRetroState();

  // Si el facilitador se perdió por un refresh/race condition,
  // intentamos reclamarlo nuevamente para esta misma sesión.
  if (!state.isFacilitator) {
    const { data: claimData, error: claimError } =
      await supabaseClient.rpc("claim_facilitator", {
        p_retro_id: state.retroId,
        p_session_id: state.participantSessionId
      });

    if (claimError || !claimData?.is_facilitator) {
      console.error("No se pudo confirmar el control de facilitación:", claimError || claimData);
      alert(
        "No se pudo iniciar la retro.\n\n" +
        "La sesión actual no figura como facilitador. Volvé a tomar el control e intentá nuevamente."
      );
      await refreshRetroState();
      render();
      return;
    }

    await refreshRetroState();
  }

  const { data, error } = await supabaseClient
    .rpc("start_retro", {
      p_retro_id: state.retroId,
      p_session_id: state.participantSessionId
    });

  if (error) {
    console.error("Error iniciando retro:", error);
    alert("No se pudo iniciar la retro.\n\n" + error.message);
    return;
  }

  console.log("Retro iniciada:", data);
  state.retroStarted = true;
  state.step = Number(data?.step || 0);

  const { data: startedData, error: startedError } = await supabaseClient.rpc(
    "mark_retro_started",
    {
      p_retro_id: state.retroId,
      p_session_id: state.participantSessionId
    }
  );

  if (startedError) {
    console.error("No se pudo registrar el inicio de la retro:", startedError);
  } else if (startedData?.iniciada_en) {
    state.retroStartedAt = startedData.iniciada_en;
  }

  render();
}


// =====================================================
// FACILITADOR - AVANZAR
// =====================================================

async function ensureFacilitatorControl() {

  if (!state.retroId || !state.participantSessionId) {
    return false;
  }

  // Siempre verificamos contra Supabase antes de ejecutar una acción
  // exclusiva del facilitador. Esto evita que un evento Realtime
  // o un estado local viejo deje al navegador creyendo que tiene el control.
  await refreshRetroState();

  if (state.isFacilitator) {
    return true;
  }

  const { data, error } = await supabaseClient.rpc(
    "claim_facilitator",
    {
      p_retro_id: state.retroId,
      p_session_id: state.participantSessionId
    }
  );

  if (error || !data?.is_facilitator) {
    console.error(
      "No se pudo confirmar el control de facilitación:",
      error || data
    );
    return false;
  }

  await refreshRetroState();
  await loadParticipants();
  return state.isFacilitator;
}


async function advanceRetro() {

  const hasControl = await ensureFacilitatorControl();

  if (!hasControl) {

    console.log(
      "Solo el facilitador puede avanzar la retro."
    );

    alert(
      "No se pudo avanzar la retro.\n\n" +
      "La sesión actual no figura como facilitador en la sala."
    );

    render();
    return;
  }


  if (
    state.step >=
    steps.length - 1
  ) {
    return;
  }

  // La etapa de Preguntas requiere que todas las preguntas registradas
  // tengan una respuesta guardada antes de poder continuar.
  if (state.step === 5) {
    const { data: validationData, error: validationError } = await supabaseClient.rpc(
      "validate_guiding_questions_answered",
      { p_retro_id: state.retroId }
    );

    if (validationError) {
      console.error("No se pudo validar las respuestas de las preguntas:", validationError);
      alert("No se pudo verificar si todas las preguntas tienen respuesta.\n\n" + validationError.message);
      return;
    }

    if (!validationData?.all_answered) {
      await loadGuidingQuestions();
      const stillUnanswered = state.guidingQuestions.filter(question => !String(question.answer || "").trim());
      alert(
        stillUnanswered.length === 1
          ? "Hay una pregunta sin respuesta. Respondela y guardá la respuesta antes de continuar."
          : `Hay ${stillUnanswered.length} preguntas sin respuesta. Respondelas y guardá las respuestas antes de continuar.`
      );
      const firstUnanswered = stillUnanswered[0];
      if (firstUnanswered) {
        const input = document.querySelector(`#questionAnswer-${firstUnanswered.id}`);
        if (input) input.focus();
      }
      return;
    }
  }


  const {
    data,
    error
  } = await supabaseClient
    .rpc(
      "advance_retro",
      {
        p_retro_id:
          state.retroId,

        p_session_id:
          state.participantSessionId
      }
    );


  if (error) {

    console.error(
      "Error avanzando retro:",
      error
    );

    alert(
      "No se pudo avanzar la retro.\n\n" +
      error.message
    );

    return;
  }


  console.log(
    "Retro avanzada:",
    data
  );

  // El cambio de etapa llegará también por Realtime.
  // Actualizamos localmente para que la respuesta
  // sea inmediata.
  if (
    data &&
    data.step !== undefined
  ) {

    state.step =
      Number(data.step);

  }

  // Si existe uno o ningún tema en común, no tiene sentido pasar por votación.
  // Avanzamos una etapa adicional para llegar directamente a Preguntas.
  if (state.step === 4 && shouldSkipVotingStep()) {
    const { data: skippedData, error: skippedError } = await supabaseClient
      .rpc(
        "advance_retro",
        {
          p_retro_id: state.retroId,
          p_session_id: state.participantSessionId
        }
      );

    if (skippedError) {
      console.error("Error omitiendo la etapa de votación:", skippedError);
      alert(
        "No se pudo omitir la etapa de votación.\n\n" +
        skippedError.message
      );
      return;
    }

    if (skippedData?.step !== undefined) {
      state.step = Number(skippedData.step);
    }
  }

  if (state.step === steps.length - 1) {
    const { data: finishedData, error: finishedError } = await supabaseClient.rpc(
      "mark_retro_finished",
      {
        p_retro_id: state.retroId,
        p_session_id: state.participantSessionId
      }
    );

    if (finishedError) {
      console.error("No se pudo registrar el cierre de la retro:", finishedError);
    } else if (finishedData?.finalizada_en) {
      state.retroFinishedAt = finishedData.finalizada_en;
    }
  }

  render();
}


// =====================================================
// FACILITADOR - RETROCEDER
// =====================================================

async function previousRetroStep() {

  if (!state.isFacilitator) {

    console.log(
      "Solo el facilitador puede retroceder la retro."
    );

    return;
  }


  if (state.step <= 0) {
    return;
  }


  const {
    data,
    error
  } = await supabaseClient
    .rpc(
      "previous_retro_step",
      {
        p_retro_id:
          state.retroId,

        p_session_id:
          state.participantSessionId
      }
    );


  if (error) {

    console.error(
      "Error retrocediendo retro:",
      error
    );

    alert(
      "No se pudo retroceder la retro.\n\n" +
      error.message
    );

    return;
  }


  console.log(
    "Retro retrocedida:",
    data
  );


  if (
    data &&
    data.step !== undefined
  ) {

    state.step =
      Number(data.step);

  }

  // Si la retro tiene uno o ningún tema, la etapa 4 (Votación) se omite también
  // al volver hacia atrás: desde Preguntas volvemos directamente a Agrupación.
  if (state.step === 4 && shouldSkipVotingStep()) {
    const { data: skippedData, error: skippedError } = await supabaseClient
      .rpc(
        "previous_retro_step",
        {
          p_retro_id: state.retroId,
          p_session_id: state.participantSessionId
        }
      );

    if (skippedError) {
      console.error("Error omitiendo la etapa de votación al retroceder:", skippedError);
      alert(
        "No se pudo omitir la etapa de votación.\n\n" +
        skippedError.message
      );
      return;
    }

    if (skippedData?.step !== undefined) {
      state.step = Number(skippedData.step);
    }
  }

  render();
}


// =====================================================
// FACILITADOR - REFRESCAR ESTADO
// =====================================================

async function refreshRetroState() {

  if (!state.retroId) {
    return;
  }

  const {
    data,
    error
  } = await supabaseClient
    .from("retros")
    .select(
      "id, codigo, nombre, paso_actual, facilitador_session_id, facilitador_nombre, iniciada, iniciada_en, finalizada_en"
    )
    .eq("id", state.retroId)
    .single();


  if (error) {

    console.error(
      "Error refrescando estado de la retro:",
      error
    );

    return;
  }


  state.step =
    normalizeStepForTopics(Number(data.paso_actual || 0));

  state.facilitatorSessionId =
    data.facilitador_session_id || null;

  state.facilitatorName =
    data.facilitador_nombre || null;

  state.retroStarted =
    Boolean(data.iniciada);

  state.retroStartedAt = data.iniciada_en || null;
  state.retroFinishedAt = data.finalizada_en || null;
  state.showFeedback = Boolean(data.finalizada_en);

  updateFacilitatorState();


  console.log(
    "Estado de retro actualizado:",
    {
      step: state.step,
      facilitatorSessionId:
        state.facilitatorSessionId,
      isFacilitator:
        state.isFacilitator
    }
  );
}


// =====================================================
// CONTROL DE FACILITADOR - UI
// =====================================================

function facilitatorControls() {

  let content = "";


  // ---------------------------------------------------
  // SOY FACILITADOR
  // ---------------------------------------------------

  if (state.isFacilitator) {

    content = `
      <div
        style="
          margin-bottom:28px;
          display:flex;
          align-items:center;
          justify-content:space-between;
          gap:16px;
          flex-wrap:wrap;
          padding:12px 16px;
          border:1px solid rgba(84,255,209,.25);
          border-radius:14px;
          background:rgba(84,255,209,.05);
        "
      >

        <div>
          <div
            style="
              font-size:11px;
              letter-spacing:.08em;
              text-transform:uppercase;
              opacity:.7;
              margin-bottom:4px;
            "
          >
            FACILITADOR
          </div>

          <strong>
            Tenés el control de la retro
          </strong>
          <div style="margin-top:4px;opacity:.7;font-size:13px;">
            ${escapeHtml(state.facilitatorName || getParticipantName())}
          </div>
        </div>

        <div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap;">

          <button
            id="resetRetroBtn"
            style="
              padding:9px 14px;
              border-radius:10px;
              cursor:pointer;
              background:transparent;
              border:1px solid rgba(255,120,120,.5);
              color:inherit;
            "
          >
            Reiniciar sala
          </button>

          <button
            id="releaseFacilitatorBtn"
            style="
              padding:9px 14px;
              border-radius:10px;
              cursor:pointer;
              background:transparent;
              border:1px solid #54FFD1;
              color:#54FFD1;
            "
          >
            Liberar control
          </button>

        </div>

      </div>
    `;

  }


  // ---------------------------------------------------
  // OTRO FACILITADOR
  // ---------------------------------------------------

  else if (state.facilitatorSessionId) {

    content = `
      <div
        style="
          margin-bottom:28px;
          padding:12px 16px;
          border:1px solid rgba(255,255,255,.12);
          border-radius:14px;
          background:rgba(255,255,255,.03);
        "
      >

        <div
          style="
            font-size:11px;
            letter-spacing:.08em;
            text-transform:uppercase;
            opacity:.6;
            margin-bottom:4px;
          "
        >
          PARTICIPANTE
        </div>

        <strong>
          El facilitador controla el avance de la retro
        </strong>
        ${state.facilitatorName ? `
          <div style="margin-top:4px;opacity:.7;font-size:13px;">
            ${escapeHtml(state.facilitatorName)}
          </div>
        ` : ""}

      </div>
    `;

  }


  // ---------------------------------------------------
  // NADIE TIENE CONTROL
  // ---------------------------------------------------

  else {

    content = `
      <div
        style="
          margin-bottom:28px;
          display:flex;
          align-items:center;
          justify-content:space-between;
          gap:16px;
          flex-wrap:wrap;
          padding:12px 16px;
          border:1px solid rgba(255,255,255,.12);
          border-radius:14px;
          background:rgba(255,255,255,.03);
        "
      >

        <div>
          <div
            style="
              font-size:11px;
              letter-spacing:.08em;
              text-transform:uppercase;
              opacity:.6;
              margin-bottom:4px;
            "
          >
            CONTROL DE LA RETRO
          </div>

          <strong>
            Todavía no hay un facilitador
          </strong>
        </div>

        <button
          id="claimFacilitatorBtn"
          class="primary"
          style="
            padding:10px 16px;
          "
        >
          Tomar control como facilitador
        </button>

      </div>
    `;

  }


  return content;
}


// =====================================================
// MODAL FACILITADOR
// =====================================================

function facilitatorModal() {

  return `
    <div
      id="facilitatorModal"
      style="
        display:none;
        position:fixed;
        inset:0;
        z-index:9999;
        align-items:center;
        justify-content:center;
        padding:24px;
        background:rgba(0,0,0,.72);
        backdrop-filter:blur(6px);
      "
    >

      <div
        style="
          width:min(460px, 100%);
          padding:28px;
          border-radius:18px;
          background:#111;
          border:1px solid rgba(255,255,255,.14);
          box-shadow:0 20px 80px rgba(0,0,0,.5);
        "
      >

        <div
          style="
            font-size:11px;
            letter-spacing:.08em;
            text-transform:uppercase;
            opacity:.6;
            margin-bottom:10px;
          "
        >
          CONTROL DE LA RETRO
        </div>

        <h3
          style="
            margin:0 0 12px 0;
          "
        >
          ¿Tomar control como facilitador?
        </h3>

        <p
          style="
            margin:0;
            line-height:1.6;
            opacity:.78;
          "
        >
          Vas a controlar el avance de la retro
          para todos los participantes.
        </p>

        <div
          style="
            display:flex;
            justify-content:flex-start;
            gap:10px;
            margin-top:24px;
            flex-wrap:wrap;
          "
        >

          <button
            id="confirmClaimFacilitatorBtn"
            class="primary"
            style="
              padding:11px 16px;
            "
          >
            Sí, tomar el control
          </button>

          <button
            id="cancelClaimFacilitatorBtn"
            style="
              padding:11px 16px;
              border-radius:10px;
              cursor:pointer;
              background:transparent;
              border:1px solid rgba(255,255,255,.18);
              color:inherit;
            "
          >
            Cancelar
          </button>

        </div>

      </div>

    </div>
  `;
}


// =====================================================
// FEEDBACK FINAL
// =====================================================

async function loadMyFeedback() {
  if (!state.retroId || !state.participantSessionId) return;

  const { data, error } = await supabaseClient
    .from("retro_feedback")
    .select("id, rating, observaciones, feedback_herramienta")
    .eq("retro_id", state.retroId)
    .eq("session_id", state.participantSessionId)
    .maybeSingle();

  if (error) {
    console.error("Error cargando feedback:", error);
    return;
  }

  state.feedbackLoaded = true;
  state.feedbackSubmitted = Boolean(data);
  state.myFeedback = data || null;
}

async function submitFeedback() {
  const ratingEl = document.querySelector("#feedbackRating");
  const observationsEl = document.querySelector("#feedbackObservations");
  const toolFeedbackEl = document.querySelector("#feedbackTool");
  const submitBtn = document.querySelector("#submitFeedbackBtn");

  const rating = Number(ratingEl?.value || 0);
  const observations = String(observationsEl?.value || "").trim();
  const toolFeedback = String(toolFeedbackEl?.value || "").trim();

  if (!rating || rating < 1 || rating > 10) {
    alert("Por favor calificá el encuentro del 1 al 10.");
    return;
  }

  if (!observations) {
    alert("Las observaciones sobre el encuentro son obligatorias.");
    observationsEl?.focus();
    return;
  }

  if (submitBtn) {
    submitBtn.disabled = true;
    submitBtn.textContent = "Guardando…";
  }

  const { data, error } = await supabaseClient.rpc("submit_retro_feedback", {
    p_retro_id: state.retroId,
    p_session_id: state.participantSessionId,
    p_rating: rating,
    p_observaciones: observations,
    p_feedback_herramienta: toolFeedback || null
  });

  if (error) {
    console.error("Error guardando feedback:", error);
    alert("No se pudo guardar el feedback.\n\n" + error.message);
    if (submitBtn) {
      submitBtn.disabled = false;
      submitBtn.textContent = "Enviar feedback";
    }
    return;
  }

  state.feedbackSubmitted = true;
  state.myFeedback = data;
  render();
}

function feedbackLanding() {
  const feedback = state.myFeedback || {};

  if (state.feedbackSubmitted) {
    return `
      <section style="max-width:720px;margin:0 auto;text-align:center;padding:52px 20px">
        <div class="big-number" style="margin-bottom:16px">✓</div>
        <div class="eyebrow">Feedback enviado</div>
        <h2 style="margin-top:10px">Gracias por compartir tu mirada</h2>
        <p class="lead" style="margin-top:14px">
          Tu feedback nos ayuda a mejorar tanto el espacio como la herramienta.
        </p>
        <div style="display:flex;gap:10px;justify-content:center;flex-wrap:wrap;margin-top:24px">
          <button type="button" id="feedbackBackBtn" style="padding:11px 16px;border-radius:10px;cursor:pointer;background:transparent;border:1px solid rgba(255,255,255,.18);color:inherit">
            ← Volver al cierre
          </button>
          <button type="button" id="feedbackHomeBtn" class="primary" style="padding:11px 16px">
            Volver a la página principal
          </button>
        </div>
      </section>
    `;
  }

  return `
    <section style="max-width:760px;margin:0 auto;padding:42px 20px">
      <div class="eyebrow">Retro finalizada</div>
      <h2 style="margin-top:10px">¿Cómo fue el encuentro?</h2>
      <p class="lead" style="margin-top:12px">
        Queremos conocer tu experiencia para seguir mejorando estos espacios.
      </p>

      <div class="card" style="margin-top:28px">
        <label class="badge" for="feedbackRating">CALIFICÁ EL ENCUENTRO · 1 A 10</label>
        <select id="feedbackRating" style="width:100%;margin-top:10px;padding:12px;border-radius:10px;background:#111;color:inherit;border:1px solid rgba(255,255,255,.18)">
          <option value="">Seleccioná una calificación</option>
          ${Array.from({length:10}, (_,i) => {
            const n=i+1; return `<option value="${n}" ${Number(feedback.rating)===n?'selected':''}>${n}</option>`;
          }).join("")}
        </select>

        <label class="badge" for="feedbackObservations" style="display:block;margin-top:24px">OBSERVACIONES · OBLIGATORIO</label>
        <textarea id="feedbackObservations" rows="6" placeholder="Dejanos tus observaciones sobre el encuentro…" style="width:100%;margin-top:10px;resize:vertical">${escapeHtml(feedback.observaciones || "")}</textarea>

        <label class="badge" for="feedbackTool" style="display:block;margin-top:24px">FEEDBACK SOBRE LA HERRAMIENTA</label>
        <textarea id="feedbackTool" rows="4" placeholder="¿Qué mejorarías de la herramienta? ¿Qué funcionalidad nueva agregarías?" style="width:100%;margin-top:10px;resize:vertical">${escapeHtml(feedback.feedback_herramienta || "")}</textarea>

        <button id="submitFeedbackBtn" class="primary" style="margin-top:24px;width:100%;padding:13px 18px">Enviar feedback</button>
        <button type="button" id="feedbackBackBtn" style="margin-top:12px;width:100%;padding:11px 16px;border-radius:10px;cursor:pointer;background:transparent;border:1px solid rgba(255,255,255,.18);color:inherit">
          ← Volver al cierre
        </button>
      </div>
    </section>
  `;
}

// =====================================================
// RENDER PRINCIPAL
// =====================================================

function render() {

  const stepLabel =
    document.querySelector("#stepLabel");

  const progressBar =
    document.querySelector("#progressBar");

  const backBtn =
    document.querySelector("#backBtn");

  const nextBtn =
    document.querySelector("#nextBtn");

  const app =
    document.querySelector("#app");


  if (!stepLabel || !progressBar || !backBtn || !nextBtn || !app) {
    console.error(
      "No se encontraron elementos principales de la interfaz."
    );

    return;
  }

  if (state.retroFinishedAt && state.step === steps.length - 1 && state.showFeedback) {
    stepLabel.textContent = "Feedback";
    progressBar.style.width = "100%";
    backBtn.style.visibility = "hidden";
    backBtn.disabled = true;
    nextBtn.style.display = "none";
    app.innerHTML = feedbackLanding();

    const feedbackBackBtn = document.querySelector("#feedbackBackBtn");
    if (feedbackBackBtn) {
      feedbackBackBtn.onclick = () => {
        state.showFeedback = false;
        render();
      };
    }

    const submitFeedbackBtn = document.querySelector("#submitFeedbackBtn");
    if (submitFeedbackBtn) submitFeedbackBtn.onclick = submitFeedback;

    const feedbackHomeBtn = document.querySelector("#feedbackHomeBtn");
    if (feedbackHomeBtn) feedbackHomeBtn.onclick = () => {
      window.location.href = "https://diemontefusco.github.io/retrospectivas/";
    };
    return;
  }

  nextBtn.style.display = "";
  backBtn.textContent = "← Atrás";

  if (!state.retroStarted) {
    stepLabel.textContent = "Preparación";
    progressBar.style.width = "0%";
  } else {
    const progressMeta = getProgressMeta(state.step);
    stepLabel.textContent =
      `${progressMeta.current} / ${progressMeta.total}`;

    progressBar.style.width =
      `${(progressMeta.current / progressMeta.total) * 100}%`;
  }


  // ---------------------------------------------------
  // BOTÓN ATRÁS
  // ---------------------------------------------------

  if (
    state.isFacilitator &&
    state.step > 0
  ) {

    backBtn.style.visibility =
      "visible";

    backBtn.disabled =
      false;

  } else {

    backBtn.style.visibility =
      "hidden";

    backBtn.disabled =
      true;

  }


  // ---------------------------------------------------
  // BOTÓN SIGUIENTE
  // ---------------------------------------------------

  if (!state.retroStarted) {

    backBtn.style.visibility = "hidden";
    backBtn.disabled = true;

    if (state.isFacilitator) {
      nextBtn.textContent = "Iniciar retro →";
      nextBtn.disabled = false;
    } else {
      nextBtn.textContent = "Esperando al facilitador";
      nextBtn.disabled = true;
    }

  } else if (state.step === steps.length - 1) {

    nextBtn.textContent = "Retro finalizada ✓";
    nextBtn.disabled = !state.isFacilitator;

  } else if (!state.isFacilitator) {

    nextBtn.textContent = "Esperando al facilitador";
    nextBtn.disabled = true;

  } else {

    nextBtn.textContent =
      state.step === 0
        ? "Continuar →"
        : "Continuar →";

    nextBtn.disabled = false;
  }


  // ---------------------------------------------------
  // CONTENIDO
  // ---------------------------------------------------

  app.innerHTML =
    facilitatorControls() +
    (state.retroStarted
      ? screens[state.step]()
      : lobbyScreen()) +
    facilitatorModal();


  bind();
}


// =====================================================
// PANTALLAS
// =====================================================

const screens = [

  // ===================================================
  // 1. INICIO
  // ===================================================

  () => `
    <section class="hero">

      <div class="pill">
        RETRO · Q3 2026
      </div>

      <h1>
        Llevemos adelante la retro teniendo en cuenta...
      </h1>

      <p class="lead">
        Independientemente de los resultados, partimos de la base de que cada quien dio su máximo con las herramientas y el contexto que tenía.
      </p>

      <div class="retro-principles">

        <div class="principle-card">
          <h3>Valores Scrum</h3>
          <div class="capsules">
            <span class="capsule">Enfoque</span>
            <span class="capsule">Apertura</span>
            <span class="capsule">Respeto</span>
            <span class="capsule">Compromiso</span>
            <span class="capsule">Valentía</span>
          </div>
        </div>

        <div class="principle-card">
          <h3>Principios Kanban</h3>
          <div class="capsules">
            <span class="capsule">Empezá donde estés</span>
            <span class="capsule">Establecé cambios evolutivos</span>
            <span class="capsule">Promové el liderazgo en todos los niveles</span>
          </div>
        </div>

      </div>

    </section>
  `,


  // ===================================================
  // 2. CHECK-IN
  // ===================================================

  () => `
    <section>

      <div class="eyebrow">
        Check-in
      </div>

      <h2>
        ¿Con qué energía llegás?
      </h2>

      <p class="lead">
        No buscamos una respuesta correcta.
        Queremos tener una lectura rápida del estado del equipo.
      </p>

      <div class="choice-row">

        ${["😣", "😕", "😐", "🙂", "🚀"]
          .map((emoji, index) => `
            <button
              class="choice ${state.energy === index ? "selected" : ""}"
              data-energy="${index}">
              ${emoji}
            </button>
          `)
          .join("")}

      </div>

    </section>
  `,


  // ===================================================
  // 3. ACTIVIDAD
  // ===================================================

  () => `
    <section>

      <div class="eyebrow">
        Actividad
      </div>

      <h2>
        ¿Qué pasó durante este período?
      </h2>

      <p class="lead">
        Compartí algo que funcionó, algo que nos trabó
        o algo que aprendimos. Las tarjetas se pueden mover
        entre columnas y editar para construir una actividad
        que represente al equipo.
      </p>

      <div
        class="card"
        style="margin-top:30px">

        <div class="action-form">

          <select id="cardType">

            <option value="green">
              ¿Qué salió bien?
            </option>

            <option value="red">
              ¿Qué nos dolió?
            </option>

            <option value="blue">
              Ideas / Sugerencias
            </option>

          </select>

          <textarea
            id="cardText"
            placeholder="Escribí tu tarjeta..."></textarea>

        </div>

        <button
          class="primary"
          id="addCard"
          style="margin-top:12px">

          Agregar tarjeta +

        </button>

      </div>

      <p class="badge" style="margin-top:18px">
        Podés arrastrar una tarjeta para moverla de una columna a otra.
      </p>

      <div
        class="columns"
        style="margin-top:20px">

        ${[
          {
            key: "green",
            label: "¿Qué salió bien?",
            description: "Prácticas que conviene mantener."
          },
          {
            key: "red",
            label: "¿Qué nos dolió?",
            description: "Problemas o bloqueos sufridos."
          },
          {
            key: "blue",
            label: "Ideas / Sugerencias",
            description: "Ideas o propuestas de mejora para el siguiente ciclo."
          }
        ].map(column => {
          const columnCards = state.cards.filter(card => card.etapa === column.key);
          return `
            <div
              class="column activity-column"
              data-etapa="${column.key}"
              style="min-height:180px">

              <div class="column-title">
                <div>
                  ${column.label}
                  <small>· ${columnCards.length}</small>
                </div>
                <div style="font-size:13px;font-weight:400;line-height:1.4;opacity:.7;margin-top:6px">
                  ${column.description}
                </div>
              </div>

              <div class="activity-drop-zone" data-etapa="${column.key}" style="min-height:120px">
                ${columnCards.length
                  ? columnCards.map(card => `
                    <div
                      class="sticky activity-card"
                      draggable="true"
                      data-card-id="${escapeHtml(card.id)}"
                      style="position:relative;cursor:grab;padding-right:76px;"
                      title="Arrastrá para mover la tarjeta">

                      <div>${escapeHtml(card.contenido)}</div>

                      <div
                        style="
                          position:absolute;
                          right:8px;
                          top:8px;
                          display:flex;
                          gap:5px;
                        ">
                        <button
                          type="button"
                          class="activity-edit-card"
                          data-card-id="${escapeHtml(card.id)}"
                          draggable="false"
                          title="Modificar tarjeta"
                          aria-label="Modificar tarjeta"
                          style="width:30px;height:30px;border-radius:8px;border:1px solid rgba(0,0,0,.15);background:rgba(255,255,255,.7);cursor:pointer;">
                          ✏️
                        </button>
                        <button
                          type="button"
                          class="activity-delete-card"
                          data-card-id="${escapeHtml(card.id)}"
                          draggable="false"
                          title="Eliminar tarjeta"
                          aria-label="Eliminar tarjeta"
                          style="width:30px;height:30px;border-radius:8px;border:1px solid rgba(0,0,0,.15);background:rgba(255,255,255,.7);cursor:pointer;">
                          🗑️
                        </button>
                      </div>
                    </div>
                  `).join("")
                  : `<div class="badge activity-empty" style="padding:20px 8px;text-align:center">Arrastrá tarjetas acá</div>`}
              </div>
            </div>
          `;
        }).join("")}

      </div>

    </section>
  `,

  // ===================================================
  // 4. AGRUPACIÓN
  // ===================================================

  () => {

    const dynamicTopics = getDynamicTopics();

    const ungroupedCards =
      state.cards.filter(card => !card.topic_key);

    return `
      <section>

        <div class="eyebrow">
          Agrupación
        </div>

        <h2>
          ¿Qué temas en común aparecen en la actividad?
        </h2>

        <p class="lead">
          Los temas en común se generan a partir de lo que escribió el equipo.
          No hay categorías predefinidas.
        </p>

        ${
          state.isFacilitator
            ? `
              <div class="card" style="margin-top:30px">
                <h3>Generar agrupación automática</h3>
                <p>
                  El sistema analiza las tarjetas de la actividad, detecta patrones de palabras y propone hasta 3 temas en común.
                </p>
                <div style="display:flex;gap:10px;align-items:center;flex-wrap:wrap;margin-top:12px;">
                  <button class="primary" id="generateTopicsBtn" style="margin-top:0">
                    ${dynamicTopics.length ? "Volver a generar temas en común" : "Generar temas en común"}
                  </button>
                  <button type="button" id="clearAllTopicsBtn" ${dynamicTopics.length ? "" : "disabled"}
                    style="padding:10px 14px;border-radius:10px;border:1px solid rgba(255,255,255,.14);background:${dynamicTopics.length ? "transparent" : "rgba(255,255,255,.05)"};color:${dynamicTopics.length ? "inherit" : "rgba(255,255,255,.35)"};cursor:${dynamicTopics.length ? "pointer" : "not-allowed"};opacity:${dynamicTopics.length ? "1" : ".65"};" title="Borrar todos los temas en común">
                    🗑️ Borrar todos
                  </button>
                </div>
              </div>
            `
            : `
              <div class="card" style="margin-top:30px">
                <p>
                  El facilitador está generando los temas en común a partir de la actividad.
                </p>
              </div>
            `
        }

        ${
          state.isFacilitator
            ? `
              <div style="display:flex;align-items:center;gap:10px;margin-top:24px;">
                <button
                  id="addTopicBtn"
                  type="button"
                  style="
                    padding:10px 14px;
                    border-radius:10px;
                    cursor:pointer;
                    background:transparent;
                    border:1px solid rgba(255,255,255,.18);
                    color:inherit;
                  ">
                  + Agregar tema en común
                </button>
              </div>
            `
            : ""
        }

        <div class="topic-list" style="margin-top:30px">
          ${
            dynamicTopics.length
              ? dynamicTopics.map(topic => `
                  <div
                    class="topic topic-sortable"
                    draggable="${state.isFacilitator ? "true" : "false"}"
                    data-topic-key="${escapeHtml(topic.key)}"
                    style="display:flex;align-items:center;justify-content:space-between;gap:16px;">
                    <div style="display:flex;align-items:center;gap:12px;min-width:0;">
                      ${
                        state.isFacilitator
                          ? `<span class="topic-drag-handle" title="Arrastrar para reordenar" aria-label="Arrastrar para reordenar">⋮⋮</span>`
                          : ""
                      }
                      <div style="min-width:0;">
                        <strong>${escapeHtml(topic.label)}</strong>
                        <span class="badge" style="margin-left:8px;">
                          ${topic.count}
                          tarjeta${topic.count === 1 ? "" : "s"}
                        </span>
                      </div>
                    </div>

                    ${
                      state.isFacilitator
                        ? `
                          <div style="display:flex;gap:6px;align-items:center;flex-shrink:0;">
                            <button type="button" class="topic-move-btn" data-topic-move="up" data-topic-key="${escapeHtml(topic.key)}" title="Subir tema" aria-label="Subir tema">↑</button>
                            <button type="button" class="topic-move-btn" data-topic-move="down" data-topic-key="${escapeHtml(topic.key)}" title="Bajar tema" aria-label="Bajar tema">↓</button>
                            <button
                              type="button"
                              data-topic-action="rename"
                              style="
                                width:36px;
                                height:36px;
                                border-radius:9px;
                                cursor:pointer;
                                background:transparent;
                                border:1px solid rgba(255,255,255,.14);
                                color:inherit;
                              "
                              data-topic-key="${escapeHtml(topic.key)}"
                              title="Renombrar tema"
                              aria-label="Renombrar tema">
                              ✏️
                            </button>
                            <button
                              type="button"
                              data-topic-action="delete"
                              style="
                                width:36px;
                                height:36px;
                                border-radius:9px;
                                cursor:pointer;
                                background:transparent;
                                border:1px solid rgba(255,255,255,.14);
                                color:inherit;
                              "
                              data-topic-key="${escapeHtml(topic.key)}"
                              title="Eliminar tema"
                              aria-label="Eliminar tema">
                              🗑️
                            </button>
                          </div>
                        `
                        : ""
                    }
                  </div>
                `).join("")
              : `
                <div class="card">
                  <p>
                    Todavía no hay temas en común. Generá una agrupación automática o agregá uno manualmente.
                  </p>
                </div>
              `
          }
        </div>

        ${
          ungroupedCards.length
            ? `
              <div class="card" style="margin-top:30px">
                <h3>Tarjetas sin agrupar</h3>
                <p>
                  ${ungroupedCards.length}
                  tarjeta${ungroupedCards.length === 1 ? "" : "s"}
                  no encontró un tema suficientemente claro.
                </p>
              </div>
            `
            : ""
        }

        <div
          style="
            margin-top:30px;
            display:grid;
            gap:16px;
          ">

          ${
            state.cards.length === 0
              ? `
                <div class="card">
                  <p>
                    Todavía no hay tarjetas en esta retro.
                  </p>
                </div>
              `
              : state.cards.map(card => `
                <div
                  class="card"
                  style="
                    display:flex;
                    gap:20px;
                    align-items:center;
                    justify-content:space-between;
                    flex-wrap:wrap;
                  ">

                  <div style="flex:1;min-width:250px;">
                    <div class="badge" style="margin-bottom:10px">
                      ${
                        card.etapa === "green"
                          ? "¿Qué salió bien?"
                          : card.etapa === "red"
                            ? "¿Qué nos dolió?"
                            : "Ideas / Sugerencias"
                      }
                    </div>
                    <strong>${escapeHtml(card.contenido)}</strong>
                  </div>

                  <div style="min-width:250px;">
                    <select
                      class="card-topic-select"
                      data-card-id="${card.id}"
                      style="width:100%;">
                      <option value="">Sin agrupar</option>
                      ${dynamicTopics.map(topic => `
                        <option
                          value="${escapeHtml(topic.key)}"
                          ${card.topic_key === topic.key ? "selected" : ""}>
                          ${escapeHtml(topic.label)}
                        </option>
                      `).join("")}
                    </select>
                  </div>

                </div>
              `).join("")
          }

        </div>

      </section>
    `;
  },


  // ===================================================
  // 5. VOTACIÓN
  // ===================================================

  () => {

    const remainingVotes =
      Math.max(
        0,
        MAX_VOTES_PER_PARTICIPANT -
          state.usedVotes
      );

    return `
      <section>

        <div class="eyebrow">
          Votación
        </div>

        <h2>
          ¿Dónde deberíamos poner energía?
        </h2>

        <p class="lead">
          Tenés 3 votos. Elegí los temas que consideres
          más importantes para conversar.
        </p>

        <div
          class="badge"
          style="margin:20px 0">

          Te quedan
          <strong>
            ${remainingVotes}
          </strong>
          voto${remainingVotes === 1 ? "" : "s"}

        </div>


        <div class="topic-list">

          ${getDynamicTopics()
            .map(topic => {

              const totalVotes =
                state.votes[topic.key] || 0;

              const myVotes =
                state.myVotes[topic.key] || 0;

              const cardCount =
                getTopicCount(topic.key);

              const disabled =
                remainingVotes === 0;

              return `
                <div class="topic">

                  <div>

                    <strong>
                      ${topic.label}
                    </strong>

                    <div
                      class="badge"
                      style="margin-top:6px">

                      ${cardCount}
                      tarjeta${cardCount === 1 ? "" : "s"}

                      ·

                      ${totalVotes}
                      voto${totalVotes === 1 ? "" : "s"}

                      ${
                        myVotes > 0
                          ? ` · vos: ${myVotes}`
                          : ""
                      }

                    </div>

                  </div>


                  <button
                    class="primary vote"
                    data-topic="${topic.key}"
                    ${disabled ? "disabled" : ""}>

                    ${
                      disabled
                        ? "Sin votos"
                        : "Votar +1"
                    }

                  </button>

                </div>
              `;

            })
            .join("")}

        </div>

      </section>
    `;
  },


  // ===================================================
  // 6. PREGUNTAS
  // ===================================================

  () => {

    const topTopic = getTopVotedTopic();
    const topicCards = topTopic ? getGroupedCards(topTopic.key) : [];
    const questions = state.guidingQuestions || [];
    const isFacilitator = state.isFacilitator;

    return `
      <section>

        <div class="eyebrow">
          Preguntas
        </div>

        <h2>
          ${topTopic ? escapeHtml(topTopic.label) : "Tema priorizado"}
        </h2>

        <p class="lead">
          Este es el tema que recibió más votos.
          Ahora el objetivo es hacernos preguntas que nos ayuden a entender
          qué hay detrás y responderlas para abrir el camino hacia acciones de mejora.
        </p>

        ${
          topicCards.length
            ? `
              <div class="card" style="margin-top:28px">
                <h3>Lo que apareció en la actividad</h3>
                <div style="display:grid;gap:10px;margin-top:18px">
                  ${topicCards.map(card => `
                    <div class="sticky">
                      ${escapeHtml(card.contenido)}
                    </div>
                  `).join("")}
                </div>
              </div>
            `
            : `
              <div class="card" style="margin-top:28px">
                <p>No hay tarjetas asignadas a este tema en común.</p>
              </div>
            `
        }

        ${
          isFacilitator
            ? `
              <div class="card" style="margin-top:28px">
                <h3>Propuestas de preguntas</h3>
                <p>
                  El sistema puede proponer preguntas a partir del tema priorizado
                  y de las situaciones que aparecieron en la actividad.
                </p>
                <button class="primary" id="generateQuestionsBtn" style="margin-top:12px">
                  Generar preguntas
                </button>
                <button type="button" id="clearAllGuidingQuestionsBtn" ${questions.length ? "" : "disabled"}
                  style="margin-top:10px;padding:10px 14px;border-radius:10px;border:1px solid rgba(255,255,255,.14);background:${questions.length ? "transparent" : "rgba(255,255,255,.05)"};color:${questions.length ? "inherit" : "rgba(255,255,255,.35)"};cursor:${questions.length ? "pointer" : "not-allowed"};opacity:${questions.length ? "1" : ".65"};" title="Borrar todas las preguntas">
                  🗑️ Borrar todas las preguntas
                </button>
              </div>
            `
            : `
              <div class="card" style="margin-top:28px">
                <p>
                  El facilitador puede generar algunas preguntas de partida.
                  Después, todos pueden sumar las que consideren necesarias.
                </p>
              </div>
            `
        }

        <div class="card" style="margin-top:28px">
          <h3>Preguntas del equipo</h3>
          <p>
            Cada pregunta necesita una respuesta. Las respuestas quedan guardadas
            y serán parte del resumen final de la retrospectiva.
          </p>

          <div style="display:grid;gap:12px;margin-top:18px">
            ${
              questions.length
                ? questions.map((question, index) => `
                    <div class="topic" style="display:grid;gap:14px;">
                      <div style="display:flex;align-items:flex-start;justify-content:space-between;gap:16px;">
                        <div style="display:flex;gap:12px;min-width:0;">
                          <strong>${index + 1}.</strong>
                          <span>${escapeHtml(question.text)}</span>
                        </div>
                        ${
                          isFacilitator
                            ? `
                              <div style="display:flex;gap:8px;flex-shrink:0;">
                                <button
                                  type="button"
                                  class="edit-guiding-question"
                                  data-question-id="${escapeHtml(question.id)}"
                                  title="Modificar pregunta"
                                  aria-label="Modificar pregunta"
                                  style="width:34px;height:34px;border-radius:9px;cursor:pointer;background:transparent;border:1px solid rgba(255,255,255,.14);color:inherit;">✏️</button>
                                <button
                                  type="button"
                                  class="delete-guiding-question"
                                  data-question-id="${escapeHtml(question.id)}"
                                  title="Eliminar pregunta"
                                  aria-label="Eliminar pregunta"
                                  style="width:34px;height:34px;border-radius:9px;cursor:pointer;background:transparent;border:1px solid rgba(255,255,255,.14);color:inherit;">🗑️</button>
                              </div>
                            `
                            : ""
                        }
                      </div>

                      <div style="display:grid;gap:8px;">
                        <label for="questionAnswer-${escapeHtml(question.id)}" class="badge">RESPUESTA · OBLIGATORIA</label>
                        <textarea
                          id="questionAnswer-${escapeHtml(question.id)}"
                          class="guiding-question-answer"
                          data-question-id="${escapeHtml(question.id)}"
                          rows="4"
                          ${question.answer && !state.editingQuestionAnswers[question.id] ? "disabled" : ""}
                          required
                          aria-required="true"
                          placeholder="Escriban la respuesta a esta pregunta..."
                          style="width:100%;resize:vertical;">${escapeHtml(getQuestionAnswerForRender(question))}</textarea>
                        <div class="answer-autosave-row">
                          <span class="answer-autosave-status" data-question-id="${escapeHtml(question.id)}" aria-live="polite">
                            ${
                              state.answerAutosaveStatus[question.id] === "saving"
                                ? "Guardando…"
                                : state.answerAutosaveStatus[question.id] === "error"
                                  ? "No se pudo guardar. Se reintentará al editar."
                                  : ""
                            }
                          </span>
                          ${
                            question.answer
                              ? `
                                <div style="display:flex;align-items:center;gap:8px;">
                                  <button
                                    type="button"
                                    class="edit-guiding-question-answer"
                                    data-question-id="${escapeHtml(question.id)}"
                                    title="Modificar respuesta"
                                    aria-label="Modificar respuesta"
                                    style="width:34px;height:34px;border-radius:9px;cursor:pointer;background:transparent;border:1px solid rgba(255,255,255,.14);color:inherit;">✏️</button>
                                  <button
                                    type="button"
                                    class="delete-guiding-question-answer"
                                    data-question-id="${escapeHtml(question.id)}"
                                    title="Eliminar respuesta"
                                    aria-label="Eliminar respuesta"
                                    style="width:34px;height:34px;border-radius:9px;cursor:pointer;background:transparent;border:1px solid rgba(255,255,255,.14);color:inherit;">🗑️</button>
                                </div>
                              `
                              : ""
                          }
                        </div>
                      </div>
                    </div>
                  `).join("")
                : `
                    <div class="badge">
                      Todavía no hay preguntas. Generá algunas o agregá una del equipo.
                    </div>
                  `
            }
          </div>

          <div style="display:grid;gap:10px;margin-top:22px">
            <textarea
              id="guidingQuestionText"
              rows="3"
              placeholder="¿Qué pregunta nos ayudaría a entender mejor qué podemos mejorar?"
              style="width:100%;resize:vertical;"></textarea>
            <button
              class="primary"
              id="addGuidingQuestionBtn">
              + Agregar pregunta
            </button>
          </div>
        </div>

      </section>
    `;
  },


  // ===================================================
  // 7. ACCIONES
  // ===================================================

  () => `
    <section>

      <div class="eyebrow">
        Acciones
      </div>

      <h2>
        Convirtamos la conversación en algo concreto.
      </h2>

      <p class="lead">
        Una acción útil tiene un responsable y una fecha.
        Evitemos acciones genéricas.
      </p>

      <div class="card" style="margin-top:24px">
        <div class="badge">PREGUNTAS</div>
        <p style="margin-top:10px">
          Estas son las preguntas que respondimos en la instancia anterior.
          Usémoslas como punto de partida para definir acciones de mejora.
        </p>

        ${
          state.guidingQuestions && state.guidingQuestions.length
            ? `
              <div style="display:grid;gap:10px;margin-top:18px">
                ${state.guidingQuestions.map((question, index) => `
                  <div class="topic" style="display:flex;align-items:flex-start;gap:12px">
                    <strong>${index + 1}.</strong>
                    <div style="display:grid;gap:5px;min-width:0">
                      <span>${escapeHtml(question.text)}</span>
                      <span style="opacity:.72">Respuesta: ${escapeHtml(question.answer || "Sin respuesta")}</span>
                    </div>
                  </div>
                `).join("")}
              </div>
            `
            : `
              <div class="badge" style="margin-top:16px">
                No se registraron preguntas en la instancia anterior.
              </div>
            `
        }
      </div>

      <div class="action-form">

        <input
          id="actionText"
          placeholder="¿Qué vamos a hacer?">

        <input
          id="actionOwner"
          placeholder="Responsable">

        <input
          id="actionDate"
          type="date">

        <textarea
          id="actionWhy"
          placeholder="¿Cómo sabremos que funcionó?"></textarea>

      </div>


      <button
        class="primary"
        id="addAction"
        style="margin-top:12px">

        Agregar acción +

      </button>


      <div class="actions">

        ${
          state.actions
            .map(action => `
              <div class="action">

                <div>

                  <strong>
                    ${escapeHtml(action.text)}
                  </strong>

                  <div class="badge">
                    ${escapeHtml(action.owner)}
                    ·
                    ${escapeHtml(action.date)}
                  </div>
                  ${action.successCriteria ? `<div style="margin-top:8px;opacity:.78"><strong>¿Cómo sabremos que funcionó?</strong><br>${escapeHtml(action.successCriteria)}</div>` : ""}

                </div>

              </div>
            `)
            .join("")
        }

      </div>

    </section>
  `,


  // ===================================================
  // 8. CIERRE
  // ===================================================

  () => {

    const topTopic =
      getDynamicTopics()
        .slice()
        .sort(
          (a, b) =>
            (state.votes[b.key] || 0) -
            (state.votes[a.key] || 0)
        )[0];

    const mainTopicCards =
      topTopic ? getGroupedCards(topTopic.key) : [];

    const mainTopicQuestions = topTopic
      ? (state.guidingQuestions || []).filter(q => !q.topicKey || q.topicKey === topTopic.key)
      : (state.guidingQuestions || []);

    const formatDuration = (start, end) => {
      if (!start || !end) return "Tiempo total no disponible todavía";
      const ms = Math.max(0, new Date(end).getTime() - new Date(start).getTime());
      const totalSeconds = Math.floor(ms / 1000);
      const hours = Math.floor(totalSeconds / 3600);
      const minutes = Math.floor((totalSeconds % 3600) / 60);
      const seconds = totalSeconds % 60;
      return `${hours} h ${minutes} min ${seconds} s`;
    };

    return `
      <section>
        <div class="eyebrow">Cierre</div>

        <h2>Resumen de la actividad</h2>

        <p class="lead">
          El resumen final reúne lo que observamos, el tema que priorizamos,
          las preguntas que nos hicimos y las acciones que acordamos.
          El facilitador puede ajustar cualquier elemento para que el resultado final
          represente lo que el equipo acuerda.
        </p>

        <div class="card" style="margin-top:28px;display:flex;align-items:center;justify-content:space-between;gap:18px;flex-wrap:wrap">
          <div>
            <div style="font-size:22px;font-weight:700">
              Duración total: ${escapeHtml(formatDuration(state.retroStartedAt, state.retroFinishedAt))}
            </div>
            <div class="badge" style="margin-top:6px">
              Tiempo transcurrido desde el inicio de la retro hasta su finalización.
            </div>
          </div>
        </div>

        <div class="card" style="margin-top:18px">
          <div style="display:flex;align-items:center;justify-content:space-between;gap:12px">
            <div class="badge">TEMA PRINCIPAL</div>
            ${state.isFacilitator ? `
              <div style="display:flex;gap:8px">
                ${topTopic ? `<button type="button" class="summary-edit-topic" data-topic-key="${escapeHtml(topTopic.key)}" title="Modificar tema">✏️</button>
                <button type="button" class="summary-delete-topic" data-topic-key="${escapeHtml(topTopic.key)}" title="Eliminar tema">🗑️</button>` : ""}
                <button type="button" class="summary-add-topic" title="Agregar tema en común">+ Agregar tema</button>
              </div>` : ""}
          </div>
          <h3 style="font-size:24px;margin-top:12px">
            ${topTopic ? `&quot;${escapeHtml(topTopic.label)}&quot;` : "Todavía no hay un tema principal"}
          </h3>
          <p style="margin-top:8px">
            ${topTopic ? `${state.votes[topTopic.key] || 0} votos` : "No se registraron votos."}
          </p>
        </div>

        <div class="card" style="margin-top:18px">
          <div style="display:flex;align-items:center;justify-content:space-between;gap:12px;flex-wrap:wrap">
            <div>
              <div class="badge">EVIDENCIAS · TARJETAS VINCULADAS</div>
              <p style="margin-top:10px">Estas son las situaciones que dieron origen al tema principal.</p>
            </div>
            ${state.isFacilitator ? `<button type="button" class="summary-add-card">+ Agregar tarjeta</button>` : ""}
          </div>
          ${mainTopicCards.length
            ? `<div style="display:grid;gap:10px;margin-top:18px">
                ${mainTopicCards.map(card => `
                  <div class="topic" style="display:flex;align-items:flex-start;justify-content:space-between;gap:12px">
                    <div>
                      <div class="badge">${card.etapa === "green" ? "¿Qué salió bien?" : card.etapa === "red" ? "¿Qué nos dolió?" : "Ideas / Sugerencias"}</div>
                      <div style="margin-top:6px">${escapeHtml(card.contenido)}</div>
                    </div>
                    ${state.isFacilitator ? `<div style="display:flex;gap:6px;flex-shrink:0">
                      <button type="button" class="summary-edit-card" data-card-id="${escapeHtml(card.id)}" title="Modificar tarjeta">✏️</button>
                      <button type="button" class="summary-delete-card" data-card-id="${escapeHtml(card.id)}" title="Eliminar tarjeta">🗑️</button>
                    </div>` : ""}
                  </div>`).join("")}
              </div>`
            : `<div class="badge" style="margin-top:16px">No hay tarjetas vinculadas al tema principal.</div>`}
        </div>

        <div class="card" style="margin-top:18px">
          <div style="display:flex;align-items:center;justify-content:space-between;gap:12px;flex-wrap:wrap">
            <div>
              <div class="badge">PREGUNTAS QUE NOS HICIMOS</div>
              <p style="margin-top:10px">Preguntas que usamos para profundizar y abrir posibilidades de mejora.</p>
            </div>
            ${state.isFacilitator ? `<button type="button" class="summary-add-question">+ Agregar pregunta</button>` : ""}
          </div>
          ${mainTopicQuestions.length
            ? `<div style="display:grid;gap:10px;margin-top:18px">
                ${mainTopicQuestions.map((question, index) => `
                  <div class="topic" style="display:flex;align-items:flex-start;justify-content:space-between;gap:12px">
                    <div style="display:grid;gap:7px;min-width:0">
                        <div style="display:flex;gap:12px;min-width:0"><strong>${index + 1}.</strong><span>${escapeHtml(question.text)}</span></div>
                        <div style="margin-left:28px;opacity:.78"><strong>Respuesta:</strong> ${escapeHtml(question.answer || "Sin respuesta")}</div>
                      </div>
                    ${state.isFacilitator ? `<div style="display:flex;gap:6px;flex-shrink:0">
                      <button type="button" class="summary-edit-question" data-question-id="${escapeHtml(question.id)}" title="Modificar pregunta">✏️</button>
                      <button type="button" class="summary-delete-question" data-question-id="${escapeHtml(question.id)}" title="Eliminar pregunta">🗑️</button>
                    </div>` : ""}
                  </div>`).join("")}
              </div>`
            : `<div class="badge" style="margin-top:16px">No se registraron preguntas.</div>`}
        </div>

        <div class="card" style="margin-top:18px">
          <div style="display:flex;align-items:center;justify-content:space-between;gap:12px;flex-wrap:wrap">
            <div>
              <div class="badge">ACCIONES ACORDADAS</div>
              <p style="margin-top:10px">Las decisiones que surgieron para transformar lo conversado en mejoras concretas.</p>
            </div>
            ${state.isFacilitator ? `<button type="button" class="summary-add-action">+ Agregar acción</button>` : ""}
          </div>
          ${state.actions.length
            ? `<div style="display:grid;gap:12px;margin-top:18px">
                ${state.actions.map(action => `
                  <div class="topic" style="display:flex;align-items:flex-start;justify-content:space-between;gap:12px">
                    <div>
                      <strong>${escapeHtml(action.text)}</strong>
                      <div class="badge" style="margin-top:6px">${escapeHtml(action.owner)} · ${escapeHtml(action.date)}</div>
                    </div>
                    ${state.isFacilitator ? `<div style="display:flex;gap:6px;flex-shrink:0">
                      <button type="button" class="summary-edit-action" data-action-id="${escapeHtml(action.id)}" title="Modificar acción">✏️</button>
                      <button type="button" class="summary-delete-action" data-action-id="${escapeHtml(action.id)}" title="Eliminar acción">🗑️</button>
                    </div>` : ""}
                  </div>`).join("")}
              </div>`
            : `<div class="badge" style="margin-top:16px">Todavía no hay acciones acordadas.</div>`}
        </div>

        <div class="big-number" style="margin-top:28px">✓</div>
        <p class="badge">Actividad finalizada · Q3 2026</p>
      </section>
    `;
  }
];



// =====================================================
// LANDING / HISTORIAL
// =====================================================

let landingRetros = [];
let landingView = "home";
let landingSelectedRetro = null;
let landingReturnContext = "home";

function todayLocalISO() {
  const d = new Date();
  const local = new Date(d.getTime() - d.getTimezoneOffset() * 60000);
  return local.toISOString().slice(0, 10);
}

function formatLandingDate(value) {
  if (!value) return "Fecha no definida";
  const d = new Date(`${value}T12:00:00`);
  return d.toLocaleDateString("es-AR", {
    day: "2-digit", month: "2-digit", year: "numeric"
  });
}

function landingShell(content) {
  const app = document.querySelector("#app");
  const topbar = document.querySelector(".topbar");
  const stepLabel = document.querySelector("#stepLabel");
  const progressBar = document.querySelector("#progressBar");
  const backBtn = document.querySelector("#backBtn");
  const nextBtn = document.querySelector("#nextBtn");

  if (topbar) {
    topbar.innerHTML = `
      <div class="brand"><span class="brand-dot"></span> RETROS</div>
      ${landingView === "home" ? `
        <nav class="landing-nav">
          <button id="landingHistoryNavBtn" class="ghost landing-nav-btn">Ver retros</button>
          <button id="landingNewRetroNavBtn" class="primary landing-nav-btn">+ Nueva retro</button>
        </nav>
      ` : ""}
    `;
  }

  if (stepLabel) stepLabel.textContent = "";
  if (progressBar) progressBar.style.width = "0%";
  if (backBtn) { backBtn.style.display = "none"; backBtn.disabled = true; }
  if (nextBtn) nextBtn.style.display = "none";
  if (app) app.innerHTML = content;
}

function landingHome() {
  return `
    <section class="landing-home">
      <div class="landing-hero">
        <h1>
          Tu espacio para reflexionar, aprender y mejorar en equipo
        </h1>
        <p class="lead">
          Bienvenido a tu asistente de retrospectivas. Un lugar donde vas a poder consultar las retros anteriores, ver resúmenes y facilitar nuevas sesiones en minutos de la forma más sencilla posible.
        </p>
      </div>

      <div class="landing-actions">
        <div class="eyebrow">¿Qué podés hacer?</div>
        <div class="landing-action-grid">
          <button type="button" class="card landing-action-card" id="landingExploreHistoryBtn">
            <h3>📊 Explorar el historial <span>→</span></h3>
            <p>Revisá las retros de los distintos equipos y descubrí patrones de mejora.</p>
          </button>
          <button type="button" class="card landing-action-card" id="landingExploreSummaryBtn">
            <h3>💡 Revisar aprendizajes y acuerdos <span>→</span></h3>
            <p>Volvé sobre los puntos clave y compromisos tomados en sesiones anteriores.</p>
          </button>
        </div>
      </div>

      <div id="landingHistorySection" class="card landing-history-card">
        <div class="landing-history-header">
          <h2>Historial de retros</h2>
        </div>
        <div id="landingHistory" class="landing-history-content">
          ${landingRetros.length ? landingRetros.map(landingRetroRow).join("") : `
            <div class="landing-empty-state">
              <div class="landing-empty-icon">📋</div>
              <h3>Todavía no hay retros</h3>
              <p>Cuando finalices una retrospectiva, va a aparecer acá automáticamente.</p>
            </div>
          `}
        </div>
      </div>
    </section>
  `;
}

function landingRetroRow(retro) {
  const teams = escapeHtml(retro.equipos || retro.nombre || "Equipos no definidos");
  const date = escapeHtml(formatLandingDate(retro.fecha));
  const status = retro.finalizada_en ? "Finalizada" : "En preparación";
  return `
    <div style="display:flex;justify-content:space-between;align-items:center;gap:18px;padding:18px 0;border-bottom:1px solid rgba(255,255,255,.08);flex-wrap:wrap">
      <div style="min-width:260px;flex:1">
        <div style="font-size:18px;font-weight:700">${teams} · ${date}</div>
        <div style="opacity:.65;margin-top:5px">${status}</div>
      </div>
      <div style="display:flex;gap:8px;flex-wrap:wrap">
        <button class="landing-summary-btn" data-retro-id="${retro.id}" style="padding:9px 13px">Ver resumen</button>
        <button class="landing-feedback-btn" data-retro-id="${retro.id}" style="padding:9px 13px">Ver feedback</button>
      </div>
    </div>
  `;
}

function landingCreateForm() {
  return `
    <section style="max-width:760px;margin:0 auto;padding:56px 20px 80px">
      <button id="landingBackBtn" style="padding:9px 13px;margin-bottom:30px">← Volver</button>
      <div class="eyebrow">Nueva retrospectiva</div>
      <h2 style="margin-top:10px">Prepará una nueva sesión</h2>
      <p class="lead">Indicá quiénes van a participar y la fecha de la retrospectiva.</p>
      <div class="card" style="margin-top:28px">
        <label class="badge" for="retroTeams">EQUIPO(S) PARTICIPANTE(S) · OBLIGATORIO</label>
        <input id="retroTeams" type="text" placeholder="Ej. Playback, Catálogo y Contenido" style="width:100%;margin-top:10px;padding:13px;border-radius:10px;background:#111;color:inherit;border:1px solid rgba(255,255,255,.18)" autocomplete="off">
        <label class="badge" for="retroDate" style="display:block;margin-top:24px">FECHA · OBLIGATORIO</label>
        <input id="retroDate" type="date" value="${todayLocalISO()}" style="width:100%;margin-top:10px;padding:13px;border-radius:10px;background:#111;color:inherit;border:1px solid rgba(255,255,255,.18)">
        <button id="createRetroBtn" class="primary" style="margin-top:26px;width:100%;padding:14px">Crear retrospectiva →</button>
      </div>
    </section>
  `;
}

function landingSummaryView(summary) {
  const retro = summary?.retro || {};
  const cards = summary?.cards || [];
  const questions = summary?.questions || [];
  const actions = summary?.actions || [];
  const topics = summary?.topics || [];
  const topTopic = topics.find(t => t.key === summary?.top_topic_key) || topics[0];

  const activityLabels = {
    green: "¿Qué salió bien?",
    red: "¿Qué nos dolió?",
    blue: "Ideas / Sugerencias"
  };

  const cardsForTopic = topTopic ? cards.filter(c => c.topic_key === topTopic.key) : cards;

  const renderAction = action => {
    const title = action.descripcion || action.text || "Sin título";
    const owner = action.responsable || action.owner || "Por definir";
    const date = action.fecha || action.date || "Por definir";
    const successCriteria = action.criterio_exito ?? action.como_sabremos ?? action.criterio ?? action.successCriteria ?? null;

    return `
      <div style="padding:16px 0;border-bottom:1px solid rgba(255,255,255,.08)">
        <div style="font-weight:700;font-size:16px">${escapeHtml(title)}</div>
        <div style="display:grid;gap:8px;margin-top:10px">
          <div><span class="badge">RESPONSABLE</span><div style="margin-top:4px">${escapeHtml(owner)}</div></div>
          <div><span class="badge">FECHA COMPROMETIDA</span><div style="margin-top:4px">${escapeHtml(date)}</div></div>
          ${successCriteria ? `<div><span class="badge">¿CÓMO SABREMOS QUE FUNCIONÓ?</span><div style="margin-top:4px">${escapeHtml(successCriteria)}</div></div>` : ""}
        </div>
      </div>
    `;
  };

  return `
    <section style="max-width:980px;margin:0 auto;padding:48px 20px 80px">
      <button id="landingBackBtn" style="padding:9px 13px">← Volver al historial</button>
      <div class="eyebrow" style="margin-top:30px">Resumen de retrospectiva</div>
      <h2 style="margin-top:10px">${escapeHtml(retro.equipos || retro.nombre || "Retrospectiva")}</h2>
      <p class="lead">${formatLandingDate(retro.fecha)}${retro.finalizada_en ? ` · Finalizada ${new Date(retro.finalizada_en).toLocaleString("es-AR")}` : ""}</p>

      <div class="card" style="margin-top:26px">
        <div class="eyebrow">Tema principal</div>
        <h3 style="margin-top:10px">${escapeHtml(topTopic?.label ? `"${topTopic.label}"` : "Sin tema principal definido")}</h3>
        ${cardsForTopic.length ? `<div style="display:grid;gap:10px;margin-top:16px">${cardsForTopic.map(c=>`<div style="padding:12px 14px;border-radius:10px;background:rgba(255,255,255,.04)">${escapeHtml(c.contenido)}</div>`).join("")}</div>` : `<p style="opacity:.65">No hay tarjetas asociadas a este tema.</p>`}
      </div>

      <div class="grid" style="margin-top:20px">
        <div class="card"><div class="eyebrow">Preguntas</div>${questions.length ? `<div style="display:grid;gap:14px;margin-top:12px">${questions.map((q,index)=>`<div style="padding-bottom:12px;border-bottom:1px solid rgba(255,255,255,.08)"><div><strong>${index + 1}.</strong> ${escapeHtml(q.pregunta || q.text || "")}</div><div style="margin-top:7px;opacity:.78"><strong>Respuesta:</strong> ${escapeHtml(q.respuesta || q.answer || "Sin respuesta")}</div></div>`).join("")}</div>` : `<p style="opacity:.65">No se registraron preguntas.</p>`}</div>
        <div class="card">
          <div class="eyebrow">Acciones acordadas</div>
          ${actions.length ? `<div style="margin-top:4px">${actions.map(renderAction).join("")}</div>` : `<p style="opacity:.65">No se registraron acciones.</p>`}
        </div>
      </div>

      <div class="card" style="margin-top:20px">
        <div class="eyebrow">Actividad completa</div>
        ${cards.length ? `<div style="display:grid;gap:12px;margin-top:14px">${cards.map(c=>`
          <div style="padding:12px 14px;border-radius:10px;background:rgba(255,255,255,.04)">
            <div class="badge">${escapeHtml(activityLabels[c.etapa] || c.etapa || "Actividad")}</div>
            <div style="margin-top:6px">${escapeHtml(c.contenido)}</div>
          </div>
        `).join("")}</div>` : `<p style="opacity:.65">No hay tarjetas registradas.</p>`}
      </div>
    </section>
  `;
}
function landingFeedbackView(data) {
  const rows = data?.feedback || [];
  const avg = data?.average_rating;
  return `
    <section style="max-width:980px;margin:0 auto;padding:48px 20px 80px">
      <button id="landingBackBtn" style="padding:9px 13px">← Volver al historial</button>
      <div class="eyebrow" style="margin-top:30px">Feedback de la retrospectiva</div>
      <h2 style="margin-top:10px">${escapeHtml(data?.retro?.equipos || data?.retro?.nombre || "Retrospectiva")}</h2>
      <div class="grid" style="margin-top:24px">
        <div class="card"><div class="eyebrow">Respuestas</div><div class="big-number">${rows.length}</div></div>
        <div class="card"><div class="eyebrow">Promedio</div><div class="big-number">${avg == null ? "—" : Number(avg).toFixed(1)}</div><p style="opacity:.65">sobre 10</p></div>
      </div>
      <div class="card" style="margin-top:20px">
        <div class="eyebrow">Comentarios</div>
        ${rows.length ? rows.map(r=>`<div style="padding:18px 0;border-bottom:1px solid rgba(255,255,255,.08)"><div style="font-weight:700">${r.rating}/10</div><p style="margin:8px 0">${escapeHtml(r.observaciones)}</p>${r.feedback_herramienta ? `<p style="margin:8px 0;opacity:.7"><strong>Herramienta:</strong> ${escapeHtml(r.feedback_herramienta)}</p>` : ""}</div>`).join("") : `<p style="opacity:.65">Todavía no hay feedback cargado para esta retrospectiva.</p>`}
      </div>
    </section>
  `;
}

async function loadLandingRetros() {
  const { data, error } = await supabaseClient.rpc("get_retro_history");
  if (error) {
    console.error("Error cargando historial:", error);
    landingRetros = [];
    return;
  }
  landingRetros = data || [];
}

async function renderLanding() {
  if (landingView === "create") landingShell(landingCreateForm());
  else if (landingView === "summary") landingShell(landingSummaryView(landingSelectedRetro));
  else if (landingView === "feedback") landingShell(landingFeedbackView(landingSelectedRetro));
  else landingShell(landingHome());

  bindLanding();
}

function bindLanding() {
  const historyNavBtn = document.querySelector("#landingHistoryNavBtn");
  if (historyNavBtn) {
    historyNavBtn.onclick = () => {
      const historySection = document.querySelector("#landingHistorySection");
      if (historySection) historySection.scrollIntoView({ behavior: "smooth", block: "start" });
    };
  }

  const newRetroNavBtn = document.querySelector("#landingNewRetroNavBtn");
  if (newRetroNavBtn) {
    newRetroNavBtn.onclick = () => {
      landingReturnContext = "home";
      landingView = "create";
      renderLanding();
    };
  }

  const exploreHistoryBtn = document.querySelector("#landingExploreHistoryBtn");
  const exploreSummaryBtn = document.querySelector("#landingExploreSummaryBtn");

  const scrollToLandingHistory = () => {
    const historySection = document.querySelector("#landingHistorySection");
    if (historySection) historySection.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  if (exploreHistoryBtn) exploreHistoryBtn.onclick = scrollToLandingHistory;
  if (exploreSummaryBtn) exploreSummaryBtn.onclick = scrollToLandingHistory;

  const back = document.querySelector("#landingBackBtn");
  if (back) back.onclick = async () => {
    if (landingReturnContext === "admin") {
      landingView = "home";
      landingReturnContext = "home";
      await renderAdmin();
      return;
    }
    landingView = "home";
    await loadLandingRetros();
    renderLanding();
  };

  document.querySelectorAll(".landing-summary-btn").forEach(btn => {
    btn.onclick = async () => {
      btn.disabled = true;
      const { data, error } = await supabaseClient.rpc("get_retro_summary", { p_retro_id: btn.dataset.retroId });
      btn.disabled = false;
      if (error) return alert("No se pudo cargar el resumen.\n\n" + error.message);

      const { data: questionAnswers, error: questionAnswersError } = await supabaseClient
        .from("preguntas_guia")
        .select("id, pregunta, respuesta, topic_key, origen, orden, created_at")
        .eq("retro_id", btn.dataset.retroId)
        .order("orden", { ascending: true })
        .order("created_at", { ascending: true });

      if (questionAnswersError) return alert("No se pudieron cargar las respuestas de las preguntas.\n\n" + questionAnswersError.message);

      landingSelectedRetro = {
        ...(data || {}),
        questions: questionAnswers || []
      };
      landingView = "summary";
      renderLanding();
    };
  });

  document.querySelectorAll(".landing-feedback-btn").forEach(btn => {
    btn.onclick = async () => {
      btn.disabled = true;
      const { data, error } = await supabaseClient.rpc("get_retro_feedback_summary", { p_retro_id: btn.dataset.retroId });
      btn.disabled = false;
      if (error) return alert("No se pudo cargar el feedback.\n\n" + error.message);
      landingSelectedRetro = data;
      landingView = "feedback";
      renderLanding();
    };
  });

  const createBtn = document.querySelector("#createRetroBtn");
  if (createBtn) createBtn.onclick = async () => {
    const teams = document.querySelector("#retroTeams")?.value.trim();
    const date = document.querySelector("#retroDate")?.value || todayLocalISO();
    if (!teams) return alert("Ingresá el nombre del equipo o equipos participantes.");
    createBtn.disabled = true; createBtn.textContent = "Creando…";
    const { data, error } = await supabaseClient.rpc("create_retro", { p_equipos: teams, p_fecha: date });
    if (error) {
      createBtn.disabled = false; createBtn.textContent = "Crear retrospectiva →";
      return alert("No se pudo crear la retrospectiva.\n\n" + error.message);
    }
    window.location.href = `?retro=${encodeURIComponent(data.codigo)}`;
  };
}


// =====================================================
// ADMIN PRIVADO
// =====================================================

let adminRetros = [];

function adminLoginView(message = "") {
  return `
    <section style="max-width:560px;margin:0 auto;padding:80px 20px">
      <div class="pill">ADMINISTRACIÓN PRIVADA</div>
      <h1 style="font-size:clamp(38px,5vw,56px);margin:22px 0 12px">Administrar retrospectivas</h1>
      <p class="lead">Ingresá con tu cuenta de administrador para gestionar qué retrospectivas aparecen en el historial público.</p>
      ${message ? `<div class="card" style="margin-top:20px">${escapeHtml(message)}</div>` : ""}
      <div class="card" style="margin-top:24px">
        <label class="badge" for="adminEmail">EMAIL</label>
        <input id="adminEmail" type="email" autocomplete="username" style="width:100%;margin-top:10px;padding:13px;border-radius:10px;background:#111;color:inherit;border:1px solid rgba(255,255,255,.18)">
        <label class="badge" for="adminPassword" style="display:block;margin-top:20px">CONTRASEÑA</label>
        <input id="adminPassword" type="password" autocomplete="current-password" style="width:100%;margin-top:10px;padding:13px;border-radius:10px;background:#111;color:inherit;border:1px solid rgba(255,255,255,.18)">
        <button id="adminLoginBtn" class="primary" style="margin-top:24px;width:100%;padding:14px">Ingresar →</button>
      </div>
      <p style="margin-top:18px;opacity:.55;font-size:13px">Esta sección está protegida por autenticación de Supabase.</p>
    </section>
  `;
}

function adminPanelView() {
  return `
    <section style="max-width:1120px;margin:0 auto;padding:56px 20px 80px">
      <div style="display:flex;justify-content:space-between;align-items:end;gap:16px;flex-wrap:wrap">
        <div>
          <div class="pill">ADMINISTRACIÓN PRIVADA</div>
          <h1 style="margin:18px 0 8px">Retrospectivas</h1>
          <p class="lead" style="margin:0">Administrá cuáles quedan disponibles en el historial público.</p>
        </div>
        <button id="adminLogoutBtn" style="padding:10px 14px">Cerrar sesión</button>
      </div>
      <div class="card" style="margin-top:32px">
        ${adminRetros.length ? adminRetros.map(adminRetroRow).join("") : `<p style="opacity:.65;margin:0">No hay retrospectivas registradas.</p>`}
      </div>
    </section>
  `;
}

function adminRetroRow(retro) {
  const teams = escapeHtml(retro.equipos || retro.nombre || "Equipos no definidos");
  const date = escapeHtml(formatLandingDate(retro.fecha));
  const published = !!retro.publicada;
  const status = retro.finalizada_en ? "Finalizada" : "En preparación";
  return `
    <div style="display:flex;justify-content:space-between;align-items:center;gap:18px;padding:18px 0;border-bottom:1px solid rgba(255,255,255,.08);flex-wrap:wrap">
      <div style="min-width:280px;flex:1">
        <div style="font-size:18px;font-weight:700">${teams} · ${date}</div>
        <div style="opacity:.65;margin-top:5px">${status} · ${published ? "Visible públicamente" : "Archivada"}</div>
      </div>
      <div style="display:flex;gap:8px;align-items:center">
        <button class="admin-toggle-public-btn" data-retro-id="${retro.id}" data-publicada="${published}" style="padding:9px 13px">
          ${published ? "Archivar" : "Publicar"}
        </button>
        <button class="admin-delete-retro-btn" data-retro-id="${retro.id}" data-retro-label="${teams} · ${date}" style="padding:9px 13px;border-color:rgba(255,100,100,.35);color:#d70000">
          Eliminar
        </button>
      </div>
    </div>
  `;
}

async function loadAdminRetros() {
  const { data, error } = await supabaseClient.rpc("get_admin_retro_history");
  if (error) throw error;
  adminRetros = data || [];
}

async function renderAdmin() {
  const { data: { session } } = await supabaseClient.auth.getSession();
  if (!session) {
    landingShell(adminLoginView());
    bindAdminLogin();
    return;
  }

  try {
    await loadAdminRetros();
  } catch (error) {
    landingShell(adminLoginView("La cuenta autenticada no tiene permisos de administrador."));
    await supabaseClient.auth.signOut();
    bindAdminLogin();
    return;
  }

  landingShell(adminPanelView());
  bindAdminPanel();
}

function bindAdminLogin() {
  const btn = document.querySelector("#adminLoginBtn");
  if (!btn) return;
  btn.onclick = async () => {
    const email = document.querySelector("#adminEmail")?.value.trim();
    const password = document.querySelector("#adminPassword")?.value || "";
    if (!email || !password) return alert("Ingresá email y contraseña.");
    btn.disabled = true;
    btn.textContent = "Ingresando…";
    const { error } = await supabaseClient.auth.signInWithPassword({ email, password });
    if (error) {
      btn.disabled = false;
      btn.textContent = "Ingresar →";
      return alert("No se pudo iniciar sesión.\n\n" + error.message);
    }
    await renderAdmin();
  };
}

function bindAdminPanel() {
  const historyNavBtn = document.querySelector("#landingHistoryNavBtn");
  if (historyNavBtn) {
    historyNavBtn.onclick = () => {
      const historySection = document.querySelector("#landingHistorySection");
      if (historySection) historySection.scrollIntoView({ behavior: "smooth", block: "start" });
    };
  }

  const newRetroNavBtn = document.querySelector("#landingNewRetroNavBtn");
  if (newRetroNavBtn) {
    newRetroNavBtn.onclick = () => {
      landingReturnContext = "admin";
      landingView = "create";
      renderLanding();
    };
  }

  const logout = document.querySelector("#adminLogoutBtn");
  if (logout) logout.onclick = async () => {
    await supabaseClient.auth.signOut();
    await renderAdmin();
  };

  document.querySelectorAll(".admin-toggle-public-btn").forEach(btn => {
    btn.onclick = async () => {
      const current = btn.dataset.publicada === "true";
      btn.disabled = true;
      const { error } = await supabaseClient.rpc("set_retro_publicada", {
        p_retro_id: btn.dataset.retroId,
        p_publicada: !current
      });
      if (error) {
        btn.disabled = false;
        return alert("No se pudo actualizar la retrospectiva.\n\n" + error.message);
      }
      await renderAdmin();
    };
  });

  document.querySelectorAll(".admin-delete-retro-btn").forEach(btn => {
    btn.onclick = async () => {
      const label = btn.dataset.retroLabel || "esta retrospectiva";
      const confirmed = window.confirm(
        `Vas a eliminar definitivamente ${label}.\n\nSe borrarán también sus tarjetas, temas, votos, participantes, preguntas, acciones y feedback. Esta acción no se puede deshacer.\n\n¿Querés continuar?`
      );
      if (!confirmed) return;

      btn.disabled = true;
      btn.textContent = "Eliminando…";

      const { error } = await supabaseClient.rpc("delete_retro", {
        p_retro_id: btn.dataset.retroId
      });

      if (error) {
        btn.disabled = false;
        btn.textContent = "Eliminar";
        return alert("No se pudo eliminar la retrospectiva.\n\n" + error.message);
      }

      await renderAdmin();
    };
  });
}

async function initializeAdmin() {
  await renderAdmin();
}

async function initializeLanding() {
  await loadLandingRetros();
  await renderLanding();
}

// =====================================================
// CARGAR RETRO
// =====================================================

async function loadRetro() {

  const { data, error } =
    await supabaseClient
      .from("retros")
      .select(
        "id, codigo, nombre, paso_actual, facilitador_session_id, facilitador_nombre, iniciada, iniciada_en, finalizada_en"
      )
      .eq("codigo", RETRO_CODE)
      .single();

  if (error) {

    console.error(
      "Error cargando retro:",
      error
    );

    alert(
      "No se encontró la retro: " +
      RETRO_CODE
    );

    return false;
  }

  state.retroId =
    data.id;

  state.step =
    Number(data.paso_actual || 0);

  state.facilitatorSessionId =
    data.facilitador_session_id || null;

  state.facilitatorName =
    data.facilitador_nombre || null;

  state.retroStarted =
    Boolean(data.iniciada);

  state.retroStartedAt = data.iniciada_en || null;
  state.retroFinishedAt = data.finalizada_en || null;
  state.showFeedback = Boolean(data.finalizada_en);

  updateFacilitatorState();

  console.log(
    "Retro cargada:",
    data
  );

  return true;
}


// =====================================================
// CARGAR TARJETAS
// =====================================================

async function loadCards() {

  const { data, error } =
    await supabaseClient
      .from("cards")
      .select("*")
      .eq("retro_id", state.retroId)
      .order("created_at", {
        ascending: true
      });

  if (error) {

    console.error(
      "Error cargando tarjetas:",
      error
    );

    return;
  }

  state.cards =
    data || [];

  console.log(
    "Tarjetas cargadas:",
    state.cards
  );
}


// =====================================================
// CARGAR TÓPICOS
// =====================================================

async function loadTopics() {

  const { data, error } =
    await supabaseClient
      .from("retro_topics")
      .select("id, retro_id, topic_key, label, orden, created_at")
      .eq("retro_id", state.retroId)
      .order("orden", { ascending: true })
      .order("created_at", { ascending: true });

  if (error) {
    console.error("Error cargando temas en común:", error);
    state.topics = [];
    return;
  }

  state.topics = data || [];

  console.log("Temas en común cargados:", state.topics);
}


// =====================================================
// CARGAR PREGUNTAS
// =====================================================

async function loadGuidingQuestions() {

  const { data, error } = await supabaseClient
    .from("preguntas_guia")
    .select("id, retro_id, topic_key, pregunta, respuesta, origen, autor_session_id, orden, created_at")
    .eq("retro_id", state.retroId)
    .order("orden", { ascending: true })
    .order("created_at", { ascending: true });

  if (error) {
    console.error("Error cargando preguntas:", error);
    state.guidingQuestions = [];
    return;
  }

  state.guidingQuestions = (data || []).map(question => {
    const answer = question.respuesta || "";
    if (answer) clearAnswerDraft(question.id);

    return {
      id: question.id,
      topicKey: question.topic_key,
      text: question.pregunta,
      answer,
      origin: question.origen,
      authorSessionId: question.autor_session_id,
      order: question.orden
    };
  });

  console.log("Preguntas cargadas:", state.guidingQuestions);
}


// =====================================================
// CARGAR ACCIONES
// =====================================================

async function loadActions() {

  const { data, error } =
    await supabaseClient
      .from("acciones")
      .select("*")
      .eq("retro_id", state.retroId)
      .order("created_at", {
        ascending: true
      });

  if (error) {

    console.error(
      "Error cargando acciones:",
      error
    );

    return;
  }

  state.actions =
    (data || []).map(action => ({
      id: action.id,
      text: action.descripcion,
      owner: action.responsable,
      date: action.fecha || "Por definir",
      successCriteria: action.criterio_exito ?? action.como_sabremos ?? action.criterio ?? null,
      raw: action
    }));

  console.log(
    "Acciones cargadas:",
    state.actions
  );
}


// =====================================================
// CARGAR VOTOS GLOBALES
// =====================================================

async function loadVotes() {

  const { data, error } =
    await supabaseClient
      .from("votos")
      .select("*")
      .eq("retro_id", state.retroId);

  if (error) {

    console.error(
      "Error cargando votos:",
      error
    );

    return;
  }

  state.votes = {};

  (data || []).forEach(row => {

    state.votes[row.topic_key] =
      row.votos || 0;

  });

  console.log(
    "Votos cargados:",
    state.votes
  );
}


// =====================================================
// REALTIME - RETRO / FACILITADOR
// =====================================================

function subscribeToRetro() {

  supabaseClient

    .channel(
      "retro-realtime-" +
      state.retroId
    )

    .on(
      "postgres_changes",
      {
        event: "UPDATE",
        schema: "public",
        table: "retros",
        filter:
          `id=eq.${state.retroId}`
      },

      payload => {

        console.log(
          "Cambio de estado de retro recibido:",
          payload
        );


        if (!payload.new) {
          return;
        }


        const newStep =
          normalizeStepForTopics(
            Number(payload.new.paso_actual || 0)
          );

        const newFacilitator =
          payload.new.facilitador_session_id ||
          null;

        state.step =
          newStep;

        state.facilitatorSessionId =
          newFacilitator;

        state.facilitatorName =
          payload.new.facilitador_nombre || null;

        state.retroStarted =
          Boolean(payload.new.iniciada);
        state.retroStartedAt = payload.new.iniciada_en || state.retroStartedAt;
        state.retroFinishedAt = payload.new.finalizada_en || state.retroFinishedAt;

        updateFacilitatorState();


        render();

      }
    )

    .subscribe(status => {

      console.log(
        "Realtime retro:",
        status
      );

    });
}


// =====================================================
// REALTIME - PARTICIPANTES
// =====================================================

function subscribeToParticipants() {

  supabaseClient
    .channel("participants-realtime-" + state.retroId)
    .on(
      "postgres_changes",
      {
        event: "*",
        schema: "public",
        table: "participantes",
        filter: `retro_id=eq.${state.retroId}`
      },
      async payload => {
        console.log("Cambio en participante:", payload);
        await loadParticipants();
        render();
      }
    )
    .subscribe(status => {
      console.log("Realtime participantes:", status);
    });
}


// =====================================================
// REALTIME - CARDS
// =====================================================

function subscribeToCards() {

  supabaseClient

    .channel(
      "cards-realtime-" +
      state.retroId
    )

    .on(
      "postgres_changes",
      {
        event: "*",
        schema: "public",
        table: "cards",
        filter:
          `retro_id=eq.${state.retroId}`
      },

      payload => {

        if (suppressCardRealtime) {
          console.log("Realtime cards ignorado durante generación de temas en común:", payload);
          return;
        }

        console.log(
          "Cambio en tarjeta:",
          payload
        );


        // INSERT

        if (
          payload.eventType === "INSERT"
        ) {

          const exists =
            state.cards.some(
              card =>
                card.id === payload.new.id
            );

          if (!exists) {

            state.cards.push(
              payload.new
            );

          }

        }


        // UPDATE

        if (
          payload.eventType === "UPDATE"
        ) {

          const index =
            state.cards.findIndex(
              card =>
                card.id === payload.new.id
            );

          if (index !== -1) {

            state.cards[index] =
              payload.new;

          }

        }


        // DELETE

        if (
          payload.eventType === "DELETE"
        ) {

          state.cards =
            state.cards.filter(
              card =>
                card.id !== payload.old.id
            );

        }


        state.step = normalizeStepForTopics(state.step);

        if (
          state.step === 2 ||
          state.step === 3 ||
          state.step === 4 ||
          state.step === 5
        ) {

          render();

        }

      }
    )

    .subscribe(status => {

      console.log(
        "Realtime cards:",
        status
      );

    });
}


// =====================================================
// REALTIME - TÓPICOS
// =====================================================

function subscribeToTopics() {

  supabaseClient
    .channel("topics-realtime-" + state.retroId)
    .on(
      "postgres_changes",
      {
        event: "*",
        schema: "public",
        table: "retro_topics",
        filter: `retro_id=eq.${state.retroId}`
      },
      async payload => {
        console.log("Cambio de temas en común recibido:", payload);
        await loadTopics();
        state.step = normalizeStepForTopics(state.step);

        if (state.step >= 3 && state.step <= 7) {
          render();
        }
      }
    )
    .subscribe(status => {
      console.log("Realtime topics:", status);
    });
}


// =====================================================
// REALTIME - VOTOS
// =====================================================

function subscribeToVotes() {

  supabaseClient

    .channel(
      "votes-realtime-" +
      state.retroId
    )

    .on(
      "postgres_changes",
      {
        event: "*",
        schema: "public",
        table: "votos",
        filter:
          `retro_id=eq.${state.retroId}`
      },

      payload => {

        console.log(
          "Cambio de votos recibido:",
          payload
        );

        const row =
          payload.new;

        if (!row) {
          return;
        }

        state.votes[row.topic_key] =
          row.votos || 0;

        if (
          state.step === 4 ||
          state.step === 5 ||
          state.step === 7
        ) {

          render();

        }

      }
    )

    .subscribe(status => {

      console.log(
        "Realtime votos:",
        status
      );

    });
}


// =====================================================
// REALTIME - PREGUNTAS
// =====================================================

function subscribeToGuidingQuestions() {

  supabaseClient
    .channel("guiding-questions-realtime-" + state.retroId)
    .on(
      "postgres_changes",
      {
        event: "*",
        schema: "public",
        table: "preguntas_guia",
        filter: `retro_id=eq.${state.retroId}`
      },
      async payload => {
        console.log("Cambio de preguntas recibido:", payload);
        await loadGuidingQuestions();

        if (state.step === 5 || state.step === 6 || state.step === 7) {
          const editingAnswer = Object.values(state.editingQuestionAnswers).some(Boolean);
          if (!editingAnswer) render();
        }
      }
    )
    .subscribe(status => {
      console.log("Realtime preguntas:", status);
    });
}


// =====================================================
// REALTIME - ACCIONES
// =====================================================

function subscribeToActions() {

  supabaseClient

    .channel(
      "actions-realtime-" +
      state.retroId
    )

    .on(
      "postgres_changes",
      {
        event: "INSERT",
        schema: "public",
        table: "acciones",
        filter:
          `retro_id=eq.${state.retroId}`
      },

      payload => {

        console.log(
          "Nueva acción recibida:",
          payload.new
        );

        if (!payload.new) {
          return;
        }

        const exists =
          state.actions.some(
            action =>
              action.id === payload.new.id
          );

        if (exists) {
          return;
        }

        state.actions.push({
          id: payload.new.id,
          text: payload.new.descripcion,
          owner:
            payload.new.responsable ||
            "Por definir",
          date:
            payload.new.fecha ||
            "Por definir",
          successCriteria: payload.new.criterio_exito ?? payload.new.como_sabremos ?? payload.new.criterio ?? null,
          raw: payload.new
        });

        if (
          state.step === 6 ||
          state.step === 7
        ) {

          render();

        }

      }
    )

    .subscribe(status => {

      console.log(
        "Realtime acciones:",
        status
      );

    });
}


// =====================================================
// EVENTOS
// =====================================================

async function persistTopicOrder(orderedTopics) {
  if (!state.isFacilitator || !state.retroId || !state.participantSessionId) return false;

  const payload = orderedTopics.map((topic, index) => ({
    topic_key: topic.key,
    orden: index
  }));

  const { data, error } = await supabaseClient.rpc("reorder_topics", {
    p_retro_id: state.retroId,
    p_session_id: state.participantSessionId,
    p_orders: payload
  });

  if (error) throw error;
  if (!data?.success) throw new Error(data?.message || "No se pudo guardar el orden de los temas.");

  await loadTopics();
  return true;
}

async function moveTopic(topicKey, direction) {
  const topics = getDynamicTopics().slice();
  const index = topics.findIndex(topic => topic.key === topicKey);
  if (index < 0) return;

  const targetIndex = direction === "up" ? index - 1 : index + 1;
  if (targetIndex < 0 || targetIndex >= topics.length) return;

  [topics[index], topics[targetIndex]] = [topics[targetIndex], topics[index]];

  state.topics = state.topics.map(topic => {
    const nextIndex = topics.findIndex(item => item.key === topic.topic_key);
    return nextIndex >= 0 ? { ...topic, orden: nextIndex } : topic;
  });

  render();

  try {
    await persistTopicOrder(topics);
    render();
  } catch (error) {
    console.error("Error reordenando temas:", error);
    await loadTopics();
    render();
    alert("No se pudo guardar el nuevo orden.\n\n" + error.message);
  }
}

async function dropTopic(topicKey, draggedTopicKey) {
  if (!draggedTopicKey || draggedTopicKey === topicKey) return;

  const topics = getDynamicTopics().slice();
  const fromIndex = topics.findIndex(topic => topic.key === draggedTopicKey);
  const toIndex = topics.findIndex(topic => topic.key === topicKey);
  if (fromIndex < 0 || toIndex < 0) return;

  const [moved] = topics.splice(fromIndex, 1);
  topics.splice(toIndex, 0, moved);

  state.topics = state.topics.map(topic => {
    const nextIndex = topics.findIndex(item => item.key === topic.topic_key);
    return nextIndex >= 0 ? { ...topic, orden: nextIndex } : topic;
  });

  render();

  try {
    await persistTopicOrder(topics);
    render();
  } catch (error) {
    console.error("Error reordenando temas:", error);
    await loadTopics();
    render();
    alert("No se pudo guardar el nuevo orden.\n\n" + error.message);
  }
}

async function bind() {

  // ===================================================
  // CIERRE — EDICIÓN DEL RESUMEN
  // ===================================================

  const summaryAddTopic = document.querySelector(".summary-add-topic");
  if (summaryAddTopic) {
    summaryAddTopic.onclick = async () => {
      if (!state.isFacilitator) return;
      const label = prompt("Nombre del nuevo tema en común:");
      const clean = String(label || "").trim();
      if (!clean) return;
      const { data, error } = await supabaseClient.rpc("create_topic", {
        p_retro_id: state.retroId,
        p_session_id: state.participantSessionId,
        p_topic_key: topicKeyFromLabel(clean),
        p_label: clean
      });
      if (error) return alert("No se pudo agregar el tema.\n\n" + error.message);
      if (!data?.success) return alert(data?.message || "No se pudo agregar el tema.");
      await loadTopics();
      render();
    };
  }

  document.querySelectorAll(".summary-edit-topic").forEach(button => {
    button.onclick = async () => {
      const topic = getDynamicTopics().find(item => item.key === button.dataset.topicKey);
      if (!topic || !state.isFacilitator) return;
      const value = prompt("Modificar tema en común:", topic.label);
      const clean = String(value || "").trim();
      if (!clean || clean === topic.label) return;
      const { data, error } = await supabaseClient.rpc("rename_topic", {
        p_retro_id: state.retroId, p_session_id: state.participantSessionId,
        p_topic_key: topic.key, p_label: clean
      });
      if (error || !data?.success) return alert("No se pudo modificar el tema.\n\n" + (error?.message || data?.message || "Error"));
      await loadTopics(); render();
    };
  });

  document.querySelectorAll(".summary-delete-topic").forEach(button => {
    button.onclick = async () => {
      const topic = getDynamicTopics().find(item => item.key === button.dataset.topicKey);
      if (!topic || !state.isFacilitator) return;
      if (!confirm(`¿Eliminar el tema en común "${topic.label}"?\n\nLas tarjetas quedarán sin agrupar.`)) return;
      const { data, error } = await supabaseClient.rpc("delete_topic", {
        p_retro_id: state.retroId, p_session_id: state.participantSessionId, p_topic_key: topic.key
      });
      if (error || !data?.success) return alert("No se pudo eliminar el tema.\n\n" + (error?.message || data?.message || "Error"));
      await loadTopics(); await loadCards(); await loadVotes(); render();
    };
  });

  const summaryAddCard = document.querySelector(".summary-add-card");
  if (summaryAddCard) {
    summaryAddCard.onclick = async () => {
      if (!state.isFacilitator) return;
      const text = prompt("Texto de la nueva tarjeta:");
      const clean = String(text || "").trim();
      if (!clean) return;
      const type = prompt("Tipo de tarjeta: ¿qué salió bien? / ¿qué nos dolió? / ideas / sugerencias", "¿qué nos dolió?") || "¿qué nos dolió?";
      const normalizedType = normalizeTopicText(type);
      const etapa = normalizedType.includes("sal") || normalizedType.includes("func") ? "green" : normalizedType.includes("idea") || normalizedType.includes("suger") || normalizedType.includes("aprend") ? "blue" : "red";
      const topTopic = getTopVotedTopic();
      const { data, error } = await supabaseClient.rpc("create_summary_card", {
        p_retro_id: state.retroId, p_session_id: state.participantSessionId,
        p_contenido: clean, p_etapa: etapa, p_topic_key: topTopic?.key || null
      });
      if (error || !data?.success) return alert("No se pudo agregar la tarjeta.\n\n" + (error?.message || data?.message || "Error"));
      await loadCards(); render();
    };
  }

  document.querySelectorAll(".summary-edit-card").forEach(button => {
    button.onclick = async () => {
      if (!state.isFacilitator) return;
      const card = state.cards.find(item => item.id === button.dataset.cardId);
      if (!card) return;
      const value = prompt("Modificar tarjeta:", card.contenido);
      const clean = String(value || "").trim();
      if (!clean || clean === card.contenido) return;
      const { data, error } = await supabaseClient.rpc("update_summary_card", {
        p_retro_id: state.retroId, p_session_id: state.participantSessionId,
        p_card_id: card.id, p_contenido: clean
      });
      if (error || !data?.success) return alert("No se pudo modificar la tarjeta.\n\n" + (error?.message || data?.message || "Error"));
      await loadCards(); render();
    };
  });

  document.querySelectorAll(".summary-delete-card").forEach(button => {
    button.onclick = async () => {
      if (!state.isFacilitator) return;
      const card = state.cards.find(item => item.id === button.dataset.cardId);
      if (!card) return;
      if (!confirm(`¿Eliminar esta tarjeta?\n\n${card.contenido}`)) return;
      const { data, error } = await supabaseClient.rpc("delete_summary_card", {
        p_retro_id: state.retroId, p_session_id: state.participantSessionId, p_card_id: card.id
      });
      if (error || !data?.success) return alert("No se pudo eliminar la tarjeta.\n\n" + (error?.message || data?.message || "Error"));
      await loadCards(); render();
    };
  });

  const summaryAddQuestion = document.querySelector(".summary-add-question");
  if (summaryAddQuestion) summaryAddQuestion.onclick = async () => {
    if (!state.isFacilitator) return;
    const value = prompt("Nueva pregunta:");
    const clean = String(value || "").trim();
    if (!clean) return;
    if (questionExists(clean)) return alert("Esa pregunta ya fue agregada.");
    const topTopic = getTopVotedTopic();
    const { data, error } = await supabaseClient.rpc("create_guiding_question", {
      p_retro_id: state.retroId, p_session_id: state.participantSessionId,
      p_topic_key: topTopic?.key || null, p_pregunta: clean, p_origen: "manual"
    });
    if (error || !data?.success) return alert("No se pudo agregar la pregunta.\n\n" + (error?.message || data?.message || "Error"));
    await loadGuidingQuestions(); render();
  };

  document.querySelectorAll(".summary-edit-question").forEach(button => {
    button.onclick = async () => {
      const q = state.guidingQuestions.find(item => item.id === button.dataset.questionId);
      if (!q || !state.isFacilitator) return;
      const value = prompt("Modificar pregunta:", q.text);
      const clean = String(value || "").trim();
      if (!clean || clean === q.text) return;
      const { data, error } = await supabaseClient.rpc("update_guiding_question", {
        p_retro_id: state.retroId, p_session_id: state.participantSessionId,
        p_question_id: q.id, p_pregunta: clean
      });
      if (error || !data?.success) return alert("No se pudo modificar la pregunta.\n\n" + (error?.message || data?.message || "Error"));
      const { error: answerResetError } = await supabaseClient.rpc("save_guiding_question_answer", {
        p_retro_id: state.retroId, p_session_id: state.participantSessionId,
        p_question_id: q.id, p_respuesta: ""
      });
      if (answerResetError) return alert("La pregunta se modificó, pero no se pudo reiniciar su respuesta.\n\n" + answerResetError.message);
      await loadGuidingQuestions(); render();
    };
  });

  document.querySelectorAll(".summary-delete-question").forEach(button => {
    button.onclick = async () => {
      const q = state.guidingQuestions.find(item => item.id === button.dataset.questionId);
      if (!q || !state.isFacilitator) return;
      if (!confirm(`¿Eliminar esta pregunta?\n\n${q.text}`)) return;
      const { data, error } = await supabaseClient.rpc("delete_guiding_question", {
        p_retro_id: state.retroId, p_session_id: state.participantSessionId, p_question_id: q.id
      });
      if (error || !data?.success) return alert("No se pudo eliminar la pregunta.\n\n" + (error?.message || data?.message || "Error"));
      await loadGuidingQuestions(); render();
    };
  });

  const summaryAddAction = document.querySelector(".summary-add-action");
  if (summaryAddAction) summaryAddAction.onclick = () => {
    const text = prompt("¿Qué vamos a hacer?");
    const clean = String(text || "").trim();
    if (!clean) return;
    const owner = prompt("Responsable:", "Por definir") || "Por definir";
    const date = prompt("Fecha (AAAA-MM-DD, opcional):", "") || null;
    (async () => {
      const { data, error } = await supabaseClient.rpc("create_summary_action", {
        p_retro_id: state.retroId, p_session_id: state.participantSessionId,
        p_descripcion: clean, p_responsable: owner.trim() || "Por definir", p_fecha: date || null
      });
      if (error || !data?.success) return alert("No se pudo agregar la acción.\n\n" + (error?.message || data?.message || "Error"));
      await loadActions(); render();
    })();
  };

  document.querySelectorAll(".summary-edit-action").forEach(button => {
    button.onclick = async () => {
      const action = state.actions.find(item => item.id === button.dataset.actionId);
      if (!action || !state.isFacilitator) return;
      const text = prompt("Modificar acción:", action.text);
      const clean = String(text || "").trim();
      if (!clean) return;
      const owner = prompt("Responsable:", action.owner || "Por definir");
      const date = prompt("Fecha (AAAA-MM-DD, opcional):", action.date === "Por definir" ? "" : action.date) || null;
      const { data, error } = await supabaseClient.rpc("update_action", {
        p_retro_id: state.retroId, p_session_id: state.participantSessionId,
        p_action_id: action.id, p_descripcion: clean, p_responsable: String(owner || "Por definir").trim() || "Por definir", p_fecha: date || null
      });
      if (error || !data?.success) return alert("No se pudo modificar la acción.\n\n" + (error?.message || data?.message || "Error"));
      await loadActions(); render();
    };
  });

  document.querySelectorAll(".summary-delete-action").forEach(button => {
    button.onclick = async () => {
      const action = state.actions.find(item => item.id === button.dataset.actionId);
      if (!action || !state.isFacilitator) return;
      if (!confirm(`¿Eliminar esta acción?\n\n${action.text}`)) return;
      const { data, error } = await supabaseClient.rpc("delete_action", {
        p_retro_id: state.retroId, p_session_id: state.participantSessionId, p_action_id: action.id
      });
      if (error || !data?.success) return alert("No se pudo eliminar la acción.\n\n" + (error?.message || data?.message || "Error"));
      await loadActions(); render();
    };
  });



  // ===================================================
  // FACILITADOR - TOMAR CONTROL
  // ===================================================

  const claimButton =
    document.querySelector(
      "#claimFacilitatorBtn"
    );

  if (claimButton) {

    claimButton.onclick = () => {

      openFacilitatorConfirmation();

    };

  }


  // ===================================================
  // FACILITADOR - CONFIRMAR
  // ===================================================

  const confirmClaimButton =
    document.querySelector(
      "#confirmClaimFacilitatorBtn"
    );

  if (confirmClaimButton) {

    confirmClaimButton.onclick = async () => {

      confirmClaimButton.disabled =
        true;

      confirmClaimButton.textContent =
        "Tomando control...";

      await confirmClaimFacilitator();

    };

  }


  // ===================================================
  // FACILITADOR - CANCELAR
  // ===================================================

  const cancelClaimButton =
    document.querySelector(
      "#cancelClaimFacilitatorBtn"
    );

  if (cancelClaimButton) {

    cancelClaimButton.onclick = () => {

      closeFacilitatorConfirmation();

    };

  }


  // ===================================================
  // FACILITADOR - REINICIAR SALA
  // ===================================================

  const resetButton =
    document.querySelector(
      "#resetRetroBtn"
    );

  if (resetButton) {

    resetButton.onclick = async () => {

      resetButton.disabled = true;
      resetButton.textContent = "Reiniciando...";

      await resetRetro();

      if (document.body.contains(resetButton)) {
        resetButton.disabled = false;
        resetButton.textContent = "Reiniciar sala";
      }
    };

  }


  // ===================================================
  // FACILITADOR - LIBERAR
  // ===================================================

  const releaseButton =
    document.querySelector(
      "#releaseFacilitatorBtn"
    );

  if (releaseButton) {

    releaseButton.onclick = async () => {

      releaseButton.disabled =
        true;

      await releaseFacilitator();

    };

  }


  // ===================================================
  // LOBBY - PERFIL
  // ===================================================

  const readyBtn =
    document.querySelector("#readyBtn");

  if (readyBtn) {
    readyBtn.onclick = async () => {
      const input = document.querySelector("#participantName");
      const name = input ? input.value.trim() : "";

      if (!name) {
        alert("Ingresá tu nombre y apellido.");
        if (input) input.focus();
        return;
      }

      readyBtn.disabled = true;
      readyBtn.textContent = "Guardando...";
      await setParticipantProfile(name, true);
    };
  }

  const editParticipantBtn =
    document.querySelector("#editParticipantBtn");

  if (editParticipantBtn) {
    editParticipantBtn.onclick = async () => {
      const input = document.querySelector("#participantName");
      if (!input) return;

      input.disabled = false;
      input.focus();
      input.select();

      const current = state.participant || {};
      state.participant = { ...current, listo: false };
      await setParticipantProfile(input.value, false);
    };
  }


  // ===================================================
  // CHECK-IN
  // ===================================================

  document
    .querySelectorAll("[data-energy]")
    .forEach(button => {

      button.onclick = () => {

        state.energy =
          Number(button.dataset.energy);

        render();

      };

    });


  // ===================================================
  // AGRUPACIÓN
  // ===================================================

  const generateTopicsBtn =
    document.querySelector("#generateTopicsBtn");

  if (generateTopicsBtn) {
    generateTopicsBtn.onclick = async () => {
      console.log("Click en Generar temas en común", {
        isFacilitator: state.isFacilitator,
        cards: state.cards.length,
        retroId: state.retroId,
        step: state.step
      });

      if (!state.isFacilitator) {
        alert("Solo el facilitador puede generar los temas en común.");
        return;
      }

      if (!state.cards.length) {
        alert("Todavía no hay tarjetas para agrupar.");
        return;
      }

      generateTopicsBtn.disabled = true;
      generateTopicsBtn.textContent = "Generando…";

      try {
        const { candidates, assignments } = buildDynamicTopics(state.cards);

        if (!assignments.size) {
          throw new Error("No se pudieron detectar temas en las tarjetas.");
        }

        const updates = state.cards.map(card => ({
          id: card.id,
          topic_key: assignments.get(card.id)?.key || null
        }));

        console.log("Iniciando generación de temas en común", {
          cards: state.cards.length,
          updates,
          candidates: candidates.map(topic => topic.label)
        });

        // Persistimos primero los temas en común propuestos para que existan
        // incluso si alguno todavía no tiene tarjetas asignadas.
        for (const topic of candidates) {
          const { data, error } = await supabaseClient.rpc(
            "upsert_topic",
            {
              p_retro_id: state.retroId,
              p_session_id: state.participantSessionId,
              p_topic_key: topic.key,
              p_label: topic.label
            }
          );

          if (error) throw error;
          if (!data?.success) {
            throw new Error(data?.message || `No se pudo crear el tema en común ${topic.label}.`);
          }
        }

        await loadTopics();

        // Bloqueamos el realtime de cards durante esta operación para que
        // una actualización intermedia no vuelva a pintar datos viejos.
        suppressCardRealtime = true;

        // Pintado optimista: la pantalla muestra inmediatamente la agrupación
        // que acabamos de generar, incluso antes de terminar la persistencia.
        state.cards = state.cards.map(card => ({
          ...card,
          topic_key: assignments.get(card.id)?.key || null
        }));
        render();

        // La tabla cards tiene RLS. En vez de hacer UPDATE directo desde el
        // navegador, usamos una RPC que valida que quien agrupa sea el
        // facilitador actual y realiza el UPDATE de forma segura.
        const results = await Promise.all(
          updates.map(async update => {
            const { data, error } = await supabaseClient.rpc(
              "set_card_topic",
              {
                p_retro_id: state.retroId,
                p_session_id: state.participantSessionId,
                p_card_id: update.id,
                p_topic_key: update.topic_key
              }
            );

            if (error) throw error;

            if (!data || !data.success) {
              throw new Error(
                data?.message ||
                `No se pudo actualizar la tarjeta ${update.id}.`
              );
            }

            return data;
          })
        );

        console.log("Actualizaciones confirmadas por Supabase:", results);

        // Verificación final contra la base antes de considerar terminada
        // la agrupación.
        const { data: verifiedCards, error: verifyError } =
          await supabaseClient
            .from("cards")
            .select("id, topic_key")
            .eq("retro_id", state.retroId);

        if (verifyError) throw verifyError;

        const missing = updates.filter(update => {
          const row = verifiedCards?.find(card => card.id === update.id);
          return !row || row.topic_key !== update.topic_key;
        });

        if (missing.length) {
          throw new Error(
            `La base no confirmó ${missing.length} agrupación${missing.length === 1 ? "" : "es"}. Revisá RLS/permisos de UPDATE en cards.`
          );
        }

        // Usamos la respuesta verificada para el render definitivo.
        state.cards = state.cards.map(card => {
          const fresh = verifiedCards.find(row => row.id === card.id);
          return fresh ? { ...card, topic_key: fresh.topic_key } : card;
        });

        render();

        console.log("Temas en común generados:", candidates.map(topic => topic.label));
        console.log(`Tarjetas actualizadas: ${results.length}/${updates.length}`);
        console.log("Cards verificadas:", verifiedCards);

        alert(
          `Agrupación generada correctamente\n\n` +
          `${candidates.length} temas en común\n` +
          `${results.length} tarjetas agrupadas`
        );
      } catch (error) {
        console.error("Error generando temas en común:", error);

        // Si falló la persistencia, recuperamos el estado real de Supabase.
        await loadCards();
        render();

        alert(
          "No se pudo generar la agrupación.\n\n" +
          error.message
        );
      } finally {
        suppressCardRealtime = false;
        generateTopicsBtn.disabled = false;
        generateTopicsBtn.textContent = "Regenerar temas en común";
      }
    };
  }

  // ---------------------------------------------------
  // CREAR / RENOMBRAR / ELIMINAR TÓPICOS
  // ---------------------------------------------------

  const clearAllTopicsBtn = document.querySelector("#clearAllTopicsBtn");

  if (clearAllTopicsBtn) {
    clearAllTopicsBtn.onclick = async () => {
      if (!state.isFacilitator || !getDynamicTopics().length) return;
      if (!confirm("¿Borrar todos los temas en común?\n\nLas tarjetas quedarán como \"Sin agrupar\" y se eliminarán los votos asociados.")) return;
      clearAllTopicsBtn.disabled = true; clearAllTopicsBtn.textContent = "Borrando…";
      try {
        const { data, error } = await supabaseClient.rpc("clear_all_topics", { p_retro_id: state.retroId, p_session_id: state.participantSessionId });
        if (error) throw error;
        if (!data?.success) throw new Error(data?.message || "No se pudieron borrar los temas en común.");
        await loadTopics(); await loadCards(); await loadVotes(); render();
      } catch (error) {
        console.error("Error borrando todos los temas en común:", error);
        alert("No se pudieron borrar los temas en común.\n\n" + error.message);
        clearAllTopicsBtn.disabled = false; clearAllTopicsBtn.textContent = "🗑️ Borrar todos";
      }
    };
  }


  const addTopicBtn = document.querySelector("#addTopicBtn");

  if (addTopicBtn) {
    addTopicBtn.onclick = async () => {
      const label = prompt("Nombre del nuevo tema en común:");
      const cleanLabel = String(label || "").trim();

      if (!cleanLabel) return;

      addTopicBtn.disabled = true;

      try {
        const { data, error } = await supabaseClient.rpc(
          "create_topic",
          {
            p_retro_id: state.retroId,
            p_session_id: state.participantSessionId,
            p_label: cleanLabel
          }
        );

        if (error) throw error;
        if (!data?.success) throw new Error(data?.message || "No se pudo crear el tema en común.");

        await loadTopics();
        render();
      } catch (error) {
        console.error("Error creando tema en común:", error);
        alert("No se pudo crear el tema en común.\n\n" + error.message);
        addTopicBtn.disabled = false;
      }
    };
  }


  document.querySelectorAll("[data-topic-move]").forEach(button => {
    button.onclick = async () => {
      if (!state.isFacilitator) return;
      await moveTopic(button.dataset.topicKey, button.dataset.topicMove);
    };
  });

  let draggedTopicKey = null;
  document.querySelectorAll(".topic-sortable").forEach(topicEl => {
    topicEl.addEventListener("dragstart", event => {
      if (!state.isFacilitator) return;
      draggedTopicKey = topicEl.dataset.topicKey;
      topicEl.classList.add("topic-dragging");
      event.dataTransfer.effectAllowed = "move";
      event.dataTransfer.setData("text/plain", draggedTopicKey);
    });

    topicEl.addEventListener("dragend", () => {
      draggedTopicKey = null;
      topicEl.classList.remove("topic-dragging");
      document.querySelectorAll(".topic-drag-over").forEach(el => el.classList.remove("topic-drag-over"));
    });

    topicEl.addEventListener("dragover", event => {
      if (!state.isFacilitator || !draggedTopicKey) return;
      event.preventDefault();
      topicEl.classList.add("topic-drag-over");
      event.dataTransfer.dropEffect = "move";
    });

    topicEl.addEventListener("dragleave", () => {
      topicEl.classList.remove("topic-drag-over");
    });

    topicEl.addEventListener("drop", async event => {
      if (!state.isFacilitator) return;
      event.preventDefault();
      topicEl.classList.remove("topic-drag-over");
      const sourceKey = event.dataTransfer.getData("text/plain") || draggedTopicKey;
      draggedTopicKey = null;
      await dropTopic(topicEl.dataset.topicKey, sourceKey);
    });
  });


  document
    .querySelectorAll("[data-topic-action]")
    .forEach(button => {
      button.onclick = async () => {
        const action = button.dataset.topicAction;
        const topicKey = button.dataset.topicKey;
        const topic = getDynamicTopics().find(item => item.key === topicKey);

        if (!topic) return;

        if (action === "rename") {
          const newLabel = prompt("Nuevo nombre del tema en común:", topic.label);
          const cleanLabel = String(newLabel || "").trim();

          if (!cleanLabel || cleanLabel === topic.label) return;

          try {
            const { data, error } = await supabaseClient.rpc(
              "rename_topic",
              {
                p_retro_id: state.retroId,
                p_session_id: state.participantSessionId,
                p_topic_key: topicKey,
                p_new_label: cleanLabel
              }
            );

            if (error) throw error;
            if (!data?.success) throw new Error(data?.message || "No se pudo renombrar el tema en común.");

            await loadTopics();
            render();
          } catch (error) {
            console.error("Error renombrando tema en común:", error);
            alert("No se pudo renombrar el tema en común.\n\n" + error.message);
          }

          return;
        }

        if (action === "delete") {
          const confirmed = confirm(
            `¿Eliminar el tema en común "${topic.label}"?\n\nLas tarjetas asignadas quedarán como \"Sin agrupar\".`
          );

          if (!confirmed) return;

          try {
            const { data, error } = await supabaseClient.rpc(
              "delete_topic",
              {
                p_retro_id: state.retroId,
                p_session_id: state.participantSessionId,
                p_topic_key: topicKey
              }
            );

            if (error) throw error;
            if (!data?.success) throw new Error(data?.message || "No se pudo eliminar el tema en común.");

            await loadTopics();
            await loadCards();
            render();
          } catch (error) {
            console.error("Error eliminando tema en común:", error);
            alert("No se pudo eliminar el tema en común.\n\n" + error.message);
          }
        }
      };
    });


  document
    .querySelectorAll(".card-topic-select")
    .forEach(select => {

      select.onchange = async () => {

        const cardId = select.dataset.cardId;
        const topicKey = select.value || null;

        select.disabled = true;

        try {
          const { data, error } = await supabaseClient.rpc(
            "set_card_topic",
            {
              p_retro_id: state.retroId,
              p_session_id: state.participantSessionId,
              p_card_id: cardId,
              p_topic_key: topicKey
            }
          );

          if (error) throw error;
          if (!data?.success) throw new Error(data?.message || "No se pudo actualizar el agrupamiento.");

          const index = state.cards.findIndex(card => card.id === cardId);
          if (index !== -1) {
            state.cards[index] = {
              ...state.cards[index],
              topic_key: topicKey
            };
          }

          await loadTopics();
          render();
        } catch (error) {
          console.error("Error actualizando agrupación:", error);
          alert("No se pudo actualizar el agrupamiento.\n\n" + error.message);
          select.disabled = false;
        }
      };
    });

  // ===================================================
  // VOTACIÓN
  // ===================================================

  document
    .querySelectorAll(".vote")
    .forEach(button => {

      button.onclick = async () => {

        const topicKey =
          button.dataset.topic;


        if (!state.participantId) {

          alert(
            "No se pudo identificar tu participación en la retro."
          );

          return;
        }


        if (
          state.usedVotes >=
          MAX_VOTES_PER_PARTICIPANT
        ) {

          alert(
            "Ya utilizaste tus 3 votos."
          );

          return;
        }


        button.disabled = true;


        // ---------------------------------------------
        // REGISTRAR VOTO DEL PARTICIPANTE
        // ---------------------------------------------

        const {
          data,
          error
        } = await supabaseClient
          .rpc(
            "cast_vote",
            {
              p_retro_id:
                state.retroId,

              p_participante_id:
                state.participantId,

              p_topic_key:
                topicKey
            }
          );


        if (error) {

          console.error(
            "Error guardando voto:",
            error
          );

          alert(
            "No se pudo registrar el voto.\n\n" +
            error.message
          );

          button.disabled = false;

          return;
        }


        console.log(
          "Voto guardado:",
          data
        );


        // ---------------------------------------------
        // ACTUALIZAR VOTOS DEL PARTICIPANTE
        // ---------------------------------------------

        state.myVotes[topicKey] =
          (state.myVotes[topicKey] || 0) + 1;

        state.usedVotes =
          state.usedVotes + 1;


        // ---------------------------------------------
        // ACTUALIZAR TOTAL GLOBAL
        // ---------------------------------------------

        if (
          data &&
          data.topic_key &&
          data.votos !== undefined
        ) {

          state.votes[data.topic_key] =
            data.votos;

        } else {

          // El RPC actual devuelve JSON con
          // used_votes / remaining_votes.
          // El realtime de votos actualizará
          // el total global.

          await loadVotes();

        }


        render();

      };

    });


  // ===================================================
  // ACTIVIDAD - AGREGAR TARJETA
  // ===================================================

  const addCard =
    document.querySelector("#addCard");


  if (addCard) {

    addCard.onclick = async () => {

      const text =
        document
          .querySelector("#cardText")
          .value
          .trim();

      const type =
        document
          .querySelector("#cardType")
          .value;


      if (!text) {

        alert(
          "Escribí algo antes de agregar la tarjeta."
        );

        return;
      }


      addCard.disabled = true;


      const {
        data,
        error
      } = await supabaseClient
        .from("cards")
        .insert({
          contenido: text,
          etapa: type,
          retro_id: state.retroId,
          topic_key: null
        })
        .select()
        .single();


      if (error) {

        console.error(
          "Error guardando tarjeta:",
          error
        );

        alert(
          "No se pudo guardar la tarjeta.\n\n" +
          error.message
        );

        addCard.disabled = false;

        return;
      }


      console.log(
        "Tarjeta guardada:",
        data
      );


      const exists =
        state.cards.some(
          card =>
            card.id === data.id
        );

      if (!exists) {

        state.cards.push(
          data
        );

      }


      render();

    };

  }


  // ===================================================
  // ACTIVIDAD - EDITAR / ELIMINAR / DRAG & DROP
  // ===================================================

  document
    .querySelectorAll(".activity-edit-card")
    .forEach(button => {
      button.onclick = async event => {
        event.preventDefault();
        event.stopPropagation();

        const cardId = button.dataset.cardId;
        const card = state.cards.find(item => item.id === cardId);
        if (!card) return;

        const updatedText = prompt("Modificar tarjeta:", card.contenido);
        if (updatedText === null) return;

        const cleanText = updatedText.trim();
        if (!cleanText) {
          alert("La tarjeta no puede quedar vacía.");
          return;
        }

        try {
          const { data, error } = await supabaseClient.rpc(
            "update_activity_card",
            {
              p_retro_id: state.retroId,
              p_session_id: state.participantSessionId,
              p_card_id: cardId,
              p_contenido: cleanText,
              p_etapa: card.etapa
            }
          );

          if (error) throw error;
          if (!data?.success) {
            throw new Error(data?.message || "No se pudo modificar la tarjeta.");
          }

          const index = state.cards.findIndex(item => item.id === cardId);
          if (index !== -1) {
            state.cards[index] = {
              ...state.cards[index],
              contenido: cleanText
            };
          }

          render();
        } catch (error) {
          console.error("Error modificando tarjeta:", error);
          alert("No se pudo modificar la tarjeta.\n\n" + error.message);
        }
      };
    });

  document
    .querySelectorAll(".activity-delete-card")
    .forEach(button => {
      button.onclick = async event => {
        event.preventDefault();
        event.stopPropagation();

        const cardId = button.dataset.cardId;
        const card = state.cards.find(item => item.id === cardId);
        if (!card) return;

        const confirmed = confirm(
          `¿Eliminar esta tarjeta?\n\n"${card.contenido}"`
        );
        if (!confirmed) return;

        try {
          const { data, error } = await supabaseClient.rpc(
            "delete_activity_card",
            {
              p_retro_id: state.retroId,
              p_session_id: state.participantSessionId,
              p_card_id: cardId
            }
          );

          if (error) throw error;
          if (!data?.success) {
            throw new Error(data?.message || "No se pudo eliminar la tarjeta.");
          }

          state.cards = state.cards.filter(item => item.id !== cardId);
          render();
        } catch (error) {
          console.error("Error eliminando tarjeta:", error);
          alert("No se pudo eliminar la tarjeta.\n\n" + error.message);
        }
      };
    });

  document
    .querySelectorAll(".activity-card")
    .forEach(cardElement => {
      cardElement.addEventListener("dragstart", event => {
        const cardId = cardElement.dataset.cardId;
        event.dataTransfer.effectAllowed = "move";
        event.dataTransfer.setData("text/plain", cardId);
        cardElement.style.opacity = "0.45";
      });

      cardElement.addEventListener("dragend", () => {
        cardElement.style.opacity = "1";
        document
          .querySelectorAll(".activity-drop-zone")
          .forEach(zone => {
            zone.classList.remove("activity-drag-over");
            zone.style.background = "";
            zone.style.outline = "";
          });
      });
    });

  document
    .querySelectorAll(".activity-drop-zone")
    .forEach(zone => {
      zone.addEventListener("dragover", event => {
        event.preventDefault();
        event.dataTransfer.dropEffect = "move";
        zone.classList.add("activity-drag-over");
        zone.style.background = "rgba(255,255,255,.04)";
        zone.style.outline = "2px dashed rgba(255,255,255,.22)";
      });

      zone.addEventListener("dragleave", event => {
        if (!zone.contains(event.relatedTarget)) {
          zone.classList.remove("activity-drag-over");
          zone.style.background = "";
          zone.style.outline = "";
        }
      });

      zone.addEventListener("drop", async event => {
        event.preventDefault();
        zone.classList.remove("activity-drag-over");
        zone.style.background = "";
        zone.style.outline = "";

        const cardId = event.dataTransfer.getData("text/plain");
        const newEtapa = zone.dataset.etapa;
        const card = state.cards.find(item => item.id === cardId);

        if (!card || !newEtapa || card.etapa === newEtapa) return;

        try {
          const { data, error } = await supabaseClient.rpc(
            "update_activity_card",
            {
              p_retro_id: state.retroId,
              p_session_id: state.participantSessionId,
              p_card_id: cardId,
              p_contenido: card.contenido,
              p_etapa: newEtapa
            }
          );

          if (error) throw error;
          if (!data?.success) {
            throw new Error(data?.message || "No se pudo mover la tarjeta.");
          }

          const index = state.cards.findIndex(item => item.id === cardId);
          if (index !== -1) {
            state.cards[index] = {
              ...state.cards[index],
              etapa: newEtapa
            };
          }

          render();
        } catch (error) {
          console.error("Error moviendo tarjeta:", error);
          alert("No se pudo mover la tarjeta.\n\n" + error.message);
        }
      });
    });

  // ===================================================
  // PREGUNTAS
  // ===================================================

  const generateQuestionsBtn =
    document.querySelector("#generateQuestionsBtn");

  if (generateQuestionsBtn) {
    generateQuestionsBtn.onclick = async () => {
      if (!state.isFacilitator) {
        alert("Solo el facilitador puede generar las preguntas.");
        return;
      }

      const topTopic = getTopVotedTopic();
      const topicCards = topTopic ? getGroupedCards(topTopic.key) : [];

      if (!topTopic) {
        alert("Todavía no hay un tema en común priorizado.");
        return;
      }

      const suggestions = buildGuidingQuestionSuggestions(topTopic, topicCards);
      const automaticQuestions = state.guidingQuestions.filter(
        question => question.origin === "automatica"
      );
      const automaticSlots = Math.max(0, 3 - automaticQuestions.length);
      const questionsToGenerate = suggestions
        .filter(question => !questionExists(question))
        .slice(0, automaticSlots);

      if (!questionsToGenerate.length) {
        alert(
          automaticQuestions.length >= 3
            ? "Ya se generaron las 3 preguntas automáticas permitidas.\n\nPodés modificarlas o agregar preguntas manualmente."
            : "Las preguntas sugeridas ya estaban cargadas."
        );
        return;
      }

      generateQuestionsBtn.disabled = true;
      generateQuestionsBtn.textContent = "Generando…";

      try {
        let added = 0;

        for (const question of questionsToGenerate) {
          const { data, error } = await supabaseClient.rpc(
            "create_guiding_question",
            {
              p_retro_id: state.retroId,
              p_session_id: state.participantSessionId,
              p_topic_key: topTopic.key,
              p_pregunta: question,
              p_origen: "automatica"
            }
          );

          if (error) throw error;
          if (!data?.success) {
            throw new Error(data?.message || "No se pudo crear la pregunta.");
          }
          added += 1;
        }

        await loadGuidingQuestions();
        render();

        alert(
          added
            ? `${added} pregunta${added === 1 ? "" : "s"} guía generada${added === 1 ? "" : "s"}.`
            : "Las preguntas sugeridas ya estaban cargadas."
        );
      } catch (error) {
        console.error("Error generando preguntas:", error);
        alert("No se pudieron generar las preguntas.\n\n" + error.message);
        generateQuestionsBtn.disabled = false;
        generateQuestionsBtn.textContent = "Generar preguntas";
      }
    };
  }

  const clearAllGuidingQuestionsBtn = document.querySelector("#clearAllGuidingQuestionsBtn");

  if (clearAllGuidingQuestionsBtn) {
    clearAllGuidingQuestionsBtn.onclick = async () => {
      if (!state.isFacilitator || !state.guidingQuestions.length) return;
      if (!confirm("¿Borrar todas las preguntas?\n\nSe eliminarán las preguntas automáticas y manuales.")) return;
      clearAllGuidingQuestionsBtn.disabled = true; clearAllGuidingQuestionsBtn.textContent = "Borrando…";
      try {
        const { data, error } = await supabaseClient.rpc("clear_all_guiding_questions", { p_retro_id: state.retroId, p_session_id: state.participantSessionId });
        if (error) throw error;
        if (!data?.success) throw new Error(data?.message || "No se pudieron borrar las preguntas.");
        await loadGuidingQuestions(); render();
      } catch (error) {
        console.error("Error borrando todas las preguntas:", error);
        alert("No se pudieron borrar las preguntas.\n\n" + error.message);
        clearAllGuidingQuestionsBtn.disabled = false; clearAllGuidingQuestionsBtn.textContent = "🗑️ Borrar todas las preguntas";
      }
    };
  }


  const addGuidingQuestionBtn =
    document.querySelector("#addGuidingQuestionBtn");

  if (addGuidingQuestionBtn) {
    addGuidingQuestionBtn.onclick = async () => {
      const input = document.querySelector("#guidingQuestionText");
      const text = input ? input.value.trim() : "";

      if (!text) {
        alert("Escribí una pregunta.");
        if (input) input.focus();
        return;
      }

      if (questionExists(text)) {
        alert("Esa pregunta ya fue agregada.");
        return;
      }

      const topTopic = getTopVotedTopic();

      addGuidingQuestionBtn.disabled = true;
      addGuidingQuestionBtn.textContent = "Guardando…";

      try {
        const { data, error } = await supabaseClient.rpc(
          "create_guiding_question",
          {
            p_retro_id: state.retroId,
            p_session_id: state.participantSessionId,
            p_topic_key: topTopic?.key || null,
            p_pregunta: text,
            p_origen: "manual"
          }
        );

        if (error) throw error;
        if (!data?.success) {
          throw new Error(data?.message || "No se pudo guardar la pregunta.");
        }

        await loadGuidingQuestions();
        render();
      } catch (error) {
        console.error("Error agregando pregunta:", error);
        alert("No se pudo agregar la pregunta.\n\n" + error.message);
        addGuidingQuestionBtn.disabled = false;
        addGuidingQuestionBtn.textContent = "+ Agregar pregunta";
      }
    };
  }

  // ===================================================
  // AUTOSAVE DE RESPUESTAS
  // ===================================================

  document.querySelectorAll(".guiding-question-answer").forEach(input => {
    const questionId = input.dataset.questionId;

    input.addEventListener("input", () => {
      state.editingQuestionAnswers[questionId] = true;
      scheduleGuidingQuestionAutosave(questionId, input.value);

      const status = document.querySelector(`.answer-autosave-status[data-question-id="${questionId}"]`);
      if (status) {
        status.textContent = String(input.value || "").trim() ? "Guardando…" : "";
        status.style.color = "";
      }
    });

    input.addEventListener("blur", () => {
      const answer = input.value.trim();
      if (answer) scheduleGuidingQuestionAutosave(questionId, answer, true);
    });
  });

  document.querySelectorAll(".edit-guiding-question-answer").forEach(button => {
    button.onclick = () => {
      const questionId = button.dataset.questionId;
      state.editingQuestionAnswers[questionId] = true;
      setAnswerAutosaveStatus(questionId, "editing");
      render();
      const input = document.querySelector(`#questionAnswer-${questionId}`);
      if (input) {
        input.disabled = false;
        input.focus();
        input.setSelectionRange(input.value.length, input.value.length);
      }
    };
  });

  document.querySelectorAll(".delete-guiding-question-answer").forEach(button => {
    button.onclick = async () => {
      const questionId = button.dataset.questionId;
      const question = state.guidingQuestions.find(item => item.id === questionId);
      if (!question || !question.answer) return;

      if (!confirm("¿Eliminar la respuesta de esta pregunta?")) return;

      clearTimeout(state.answerAutosaveTimers[questionId]);
      button.disabled = true;

      try {
        const { data, error } = await supabaseClient.rpc("save_guiding_question_answer", {
          p_retro_id: state.retroId,
          p_session_id: state.participantSessionId,
          p_question_id: questionId,
          p_respuesta: ""
        });
        if (error) throw error;
        if (!data?.success) throw new Error(data?.message || "No se pudo eliminar la respuesta.");

        question.answer = "";
        delete state.editingQuestionAnswers[questionId];
        delete state.answerAutosaveStatus[questionId];
        clearAnswerDraft(questionId);
        render();
      } catch (error) {
        console.error("Error eliminando respuesta:", error);
        alert("No se pudo eliminar la respuesta.\n\n" + error.message);
        button.disabled = false;
      }
    };
  });

  document
    .querySelectorAll(".edit-guiding-question")
    .forEach(button => {
      button.onclick = async () => {
        if (!state.isFacilitator) return;

        const questionId = button.dataset.questionId;
        const question = state.guidingQuestions.find(item => item.id === questionId);
        if (!question) return;

        const newText = prompt("Modificar pregunta:", question.text);
        const cleanText = String(newText || "").trim();

        if (!cleanText || cleanText === question.text) return;

        const duplicate = state.guidingQuestions.some(item =>
          item.id !== questionId && normalizeTopicText(item.text) === normalizeTopicText(cleanText)
        );

        if (duplicate) {
          alert("Esa pregunta ya fue agregada.");
          return;
        }

        try {
          const { data, error } = await supabaseClient.rpc(
            "update_guiding_question",
            {
              p_retro_id: state.retroId,
              p_session_id: state.participantSessionId,
              p_question_id: questionId,
              p_pregunta: cleanText
            }
          );

          if (error) throw error;
          if (!data?.success) {
            throw new Error(data?.message || "No se pudo modificar la pregunta.");
          }

          const { error: answerResetError } = await supabaseClient.rpc("save_guiding_question_answer", {
            p_retro_id: state.retroId,
            p_session_id: state.participantSessionId,
            p_question_id: questionId,
            p_respuesta: ""
          });
          if (answerResetError) throw answerResetError;
          clearTimeout(state.answerAutosaveTimers[questionId]);
          clearAnswerDraft(questionId);
          delete state.editingQuestionAnswers[questionId];
          delete state.answerAutosaveStatus[questionId];

          await loadGuidingQuestions();
          render();
        } catch (error) {
          console.error("Error modificando pregunta:", error);
          alert("No se pudo modificar la pregunta.\n\n" + error.message);
        }
      };
    });


  document
    .querySelectorAll(".delete-guiding-question")
    .forEach(button => {
      button.onclick = async () => {
        if (!state.isFacilitator) return;

        const questionId = button.dataset.questionId;
        const question = state.guidingQuestions.find(item => item.id === questionId);
        if (!question) return;

        if (!confirm(`¿Eliminar esta pregunta?\n\n${question.text}`)) return;

        try {
          const { data, error } = await supabaseClient.rpc(
            "delete_guiding_question",
            {
              p_retro_id: state.retroId,
              p_session_id: state.participantSessionId,
              p_question_id: questionId
            }
          );

          if (error) throw error;
          if (!data?.success) {
            throw new Error(data?.message || "No se pudo eliminar la pregunta.");
          }

          await loadGuidingQuestions();
          render();
        } catch (error) {
          console.error("Error eliminando pregunta:", error);
          alert("No se pudo eliminar la pregunta.\n\n" + error.message);
        }
      };
    });


  // ===================================================
  // ACCIONES
  // ===================================================

  const add =
    document.querySelector("#addAction");


  if (add) {

    add.onclick = async () => {

      const text =
        document
          .querySelector("#actionText")
          .value
          .trim();


      if (!text) {

        alert(
          "Escribí una acción."
        );

        return;
      }


      const owner =
        document
          .querySelector("#actionOwner")
          .value
          .trim()
        || "Por definir";


      const date =
        document
          .querySelector("#actionDate")
          .value
        || null;


      add.disabled = true;


      const {
        data,
        error
      } = await supabaseClient
        .from("acciones")
        .insert({
          descripcion: text,
          responsable: owner,
          fecha: date,
          retro_id: state.retroId
        })
        .select()
        .single();


      if (error) {

        console.error(
          "ERROR SUPABASE",
          error
        );

        alert(
          "ERROR SUPABASE\n\n" +
          "Code: " +
          (error?.code || "N/A") +
          "\nMessage: " +
          (error?.message || "N/A") +
          "\nDetails: " +
          (error?.details || "N/A")
        );

        add.disabled = false;

        return;
      }


      console.log(
        "Acción guardada:",
        data
      );


      const newAction = {

        id:
          data.id,

        text:
          data.descripcion,

        owner:
          data.responsable,

        date:
          data.fecha ||
          "Por definir"

      };


      state.actions.push(
        newAction
      );


      render();

    };

  }

}


// =====================================================
// BOTÓN SIGUIENTE
// =====================================================

document
  .querySelector("#nextBtn")
  .onclick = async () => {

    if (!state.isFacilitator) {
      return;
    }

    // En el lobby, el mismo botón inicia la retro.
    // Una vez iniciada, pasa a avanzar de etapa.
    if (!state.retroStarted) {
      await startRetro();
      return;
    }

    if (
      state.step >=
      steps.length - 1
    ) {
      const shouldFinish = window.confirm(
        "¿Confirmás que querés finalizar la retro?\n\nUna vez finalizada, el equipo pasará a la instancia de feedback."
      );

      if (!shouldFinish) {
        return;
      }

      const { data, error } = await supabaseClient.rpc("mark_retro_finished", {
        p_retro_id: state.retroId,
        p_session_id: state.participantSessionId
      });

      if (error) {
        console.error("Error finalizando retro:", error);
        alert("No se pudo finalizar la retro.\n\n" + error.message);
        return;
      }

      state.retroFinishedAt = data?.finalizada_en || new Date().toISOString();
      state.showFeedback = true;
      await loadMyFeedback();
      render();
      return;
    }

    await advanceRetro();

  };


// =====================================================
// BOTÓN ATRÁS
// =====================================================

document
  .querySelector("#backBtn")
  .onclick = async () => {

    if (!state.isFacilitator) {

      return;

    }


    if (state.step <= 0) {

      return;

    }


    await previousRetroStep();

  };


// =====================================================
// INICIAR
// =====================================================

async function initialize() {

  const isAdminRoute = urlParams.get("admin") === "1";

  if (isAdminRoute) {
    await initializeAdmin();
    return;
  }

  if (!RETRO_CODE) {
    await initializeLanding();
    return;
  }

  console.log(
    "Inicializando retro..."
  );


  // ---------------------------------------------------
  // RETRO
  // ---------------------------------------------------

  const retroLoaded =
    await loadRetro();


  if (!retroLoaded) {
    return;
  }


  // ---------------------------------------------------
  // PARTICIPANTE
  // ---------------------------------------------------

  const participantLoaded =
    await loadParticipant();


  if (!participantLoaded) {

    console.error(
      "No se pudo inicializar participante."
    );

    return;
  }


  // ---------------------------------------------------
  // REFRESCAR ESTADO DE FACILITADOR
  // ---------------------------------------------------

  await refreshRetroState();


  // ---------------------------------------------------
  // DATOS
  // ---------------------------------------------------

  await loadCards();

  await loadTopics();

  await loadGuidingQuestions();

  state.step = normalizeStepForTopics(state.step);

  await loadActions();

  await loadVotes();

  await loadMyVotes();

  await loadParticipants();

  if (state.retroFinishedAt) {
    await loadMyFeedback();
  }


  // ---------------------------------------------------
  // REALTIME
  // ---------------------------------------------------

  subscribeToRetro();

  subscribeToParticipants();

  subscribeToCards();

  subscribeToTopics();

  subscribeToGuidingQuestions();

  subscribeToVotes();

  subscribeToActions();


  // ---------------------------------------------------
  // RENDER
  // ---------------------------------------------------

  render();

}


initialize();
