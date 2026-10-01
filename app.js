/**
  RETROS
  © Todos los derechos reservados.
  El contenido, diseño y funcionalidades de esta aplicación son propiedad de Diego Gabriel Montefusco.
 */
import { RETRO_CODE, MAX_VOTES_PER_PARTICIPANT, urlParams } from "./js/core/config.js";
import { state } from "./js/core/state.js";
import { supabaseClient } from "./js/services/supabase.js";
import { fetchRetroByCode, fetchRetroHistory, fetchRetroSummary, fetchRetroTitleContext, fetchAdminRetroHistory, fetchRetroTypes, createRetroWithTitle, setRetroType, fetchRetroState, setRetroPublicada, deleteRetro } from "./js/services/retroService.js";
import { fetchParticipant, createParticipant, fetchParticipants, setParticipantProfile as updateParticipantProfile } from "./js/services/participantService.js";
import { fetchCards, createActivityCard, updateActivityCard, deleteActivityCard, createSummaryCard, updateSummaryCard, deleteSummaryCard, setCardTopic } from "./js/services/cardService.js";
import { fetchTopics, createTopic, renameTopic, deleteTopic, reorderTopics } from "./js/services/topicService.js";
import { fetchVotes, fetchMyVotes, castVote, recoverVote } from "./js/services/voteService.js";
import { fetchGuidingQuestions, fetchRetroQuestionAnswers, createGuidingQuestion, updateGuidingQuestion, deleteGuidingQuestion, clearAllGuidingQuestions, saveGuidingQuestionAnswer } from "./js/services/questionService.js";
import { fetchActions, createAction, createSummaryAction, updateAction, deleteAction } from "./js/services/actionService.js";
import { resetRetro as resetRetroData, claimFacilitator as claimFacilitatorData, releaseFacilitator as releaseFacilitatorData, startRetro as startRetroData, markRetroStarted, validateGuidingQuestionsAnswered, advanceRetroStep, markRetroFinished, previousRetroStep as previousRetroStepData } from "./js/services/retroControlService.js";
import { fetchMyRetroFeedback, submitRetroFeedback, fetchRetroFeedbackSummary, fetchToolFeedback, fetchRetroToolFeedback, submitToolFeedback, deleteToolFeedback, deleteAllToolFeedback, deleteRetroToolFeedback, deleteAllRetroToolFeedback } from "./js/services/feedbackService.js";
import { subscribeToRetro } from "./js/realtime/retroRealtime.js";
import { subscribeToParticipants } from "./js/realtime/participantsRealtime.js";
import { subscribeToCards } from "./js/realtime/cardsRealtime.js";
import { subscribeToTopics } from "./js/realtime/topicsRealtime.js";
import { subscribeToVotes, broadcastVoteUpdate } from "./js/realtime/votesRealtime.js";
import { subscribeToGuidingQuestions } from "./js/realtime/questionsRealtime.js";
import { subscribeToActions } from "./js/realtime/actionsRealtime.js";
import { subscribeAdminToolFeedback } from "./js/realtime/adminFeedbackRealtime.js";
import { normalizeTopicText, getDynamicTopics, shouldSkipVotingStep, getGroupedCards } from "./js/domain/topics.js";
import { getTopVotedTopic, getConversationContext } from "./js/domain/voting.js";
import { buildGeneralGuidingQuestionSuggestions, buildGuidingQuestionSuggestions, questionExists } from "./js/domain/questions.js";
import { STEPS, getRetroSteps, normalizeStepForTopics, getProgressMeta } from "./js/domain/retroFlow.js";
import { escapeHtml, todayLocalISO } from "./js/utils/formatters.js";
import { mountDateFields } from "../../../components/dateField.js";
import { landingHome, landingCreateForm, landingSummaryView, landingFeedbackView } from "./js/views/landing/landingView.js";
import { adminLoginView, adminToolFeedbackRow, adminRetroToolFeedbackRow, adminPanelView } from "./js/views/admin/adminView.js";
import { lobbyScreen } from "./js/views/retro/lobbyView.js";
import { facilitatorControls, facilitatorModal } from "./js/views/retro/facilitatorView.js";
import { introScreen, checkInScreen, activityScreen } from "./js/views/retro/activityView.js";
import { topicsView } from "./js/views/retro/topicsView.js";
import { votingView } from "./js/views/retro/votingView.js";
import { questionsView } from "./js/views/retro/questionsView.js";
import { actionsView } from "./js/views/retro/actionsView.js";
import { summaryView } from "./js/views/retro/summaryView.js";
import { bindSummaryBindings } from "./js/views/retro/bindings/summaryBindings.js";
import { bindFacilitatorBindings } from "./js/views/retro/bindings/facilitatorBindings.js";
import { bindLobbyBindings } from "./js/views/retro/bindings/lobbyBindings.js";
import { bindTopicsBindings } from "./js/views/retro/bindings/topicsBindings.js";
import { bindVotingBindings } from "./js/views/retro/bindings/votingBindings.js";
import { bindActivityBindings } from "./js/views/retro/bindings/activityBindings.js";
import { bindQuestionsBindings } from "./js/views/retro/bindings/questionsBindings.js";
import { bindActionsBindings } from "./js/views/retro/bindings/actionsBindings.js";
import { postMortemTechnicalForm, postMortemActivityView, postMortemActionsView, postMortemSummaryView } from "./js/views/retro/postMortemView.js";
import { fetchPostMortem, savePostMortem, savePostMortemField } from "./js/services/postMortemService.js";
import { subscribeToPostMortem } from "./js/realtime/postMortemRealtime.js";
import { bindPostMortemBindings } from "./js/views/retro/bindings/postMortemBindings.js";

console.log("Código de retro:", RETRO_CODE);


function getCurrentRetroSteps() {
  return getRetroSteps(state.retroType);
}

function isPostMortem() {
  return state.retroType === "post_mortem";
}

function showTransientSavedStatus(statusElement) {
  if (!statusElement) return;

  if (statusElement.__fadeTimer) clearTimeout(statusElement.__fadeTimer);
  if (statusElement.__clearTimer) clearTimeout(statusElement.__clearTimer);

  statusElement.classList.remove("is-fading-out");
  statusElement.classList.add("is-visible", "is-saved");
  statusElement.innerHTML = '<span>✓ Guardado!</span>';

  statusElement.__fadeTimer = setTimeout(() => {
    statusElement.classList.add("is-fading-out");
  }, 2200);

  statusElement.__clearTimer = setTimeout(() => {
    statusElement.classList.remove("is-visible", "is-saved", "is-fading-out");
    statusElement.textContent = "";
  }, 2650);
}

function setPostMortemAutosaveStatus(fieldKey, status) {
  state.postMortemAutosaveStatus[fieldKey] = status;

  const statusElement = document.querySelector(`.postmortem-autosave-status[data-postmortem-status="${fieldKey}"]`);
  if (!statusElement) return;

  statusElement.classList.remove("is-fading-out", "is-saved");

  if (status === "saving") {
    statusElement.textContent = "Guardando…";
    statusElement.classList.add("is-visible");
  } else if (status === "saved") {
    showTransientSavedStatus(statusElement);
  } else if (status === "error") {
    statusElement.textContent = "No se pudo guardar. Se reintentará al editar.";
    statusElement.classList.add("is-visible");
  } else {
    statusElement.textContent = "";
    statusElement.classList.remove("is-visible");
  }
}

function postMortemFormValues() {
  const values = {};
  document.querySelectorAll("[data-postmortem-field]").forEach(input => {
    values[input.dataset.postmortemField] = String(input.value || "").trim();
  });
  return values;
}

function validatePostMortemForm(values) {
  const labels = {
    ticket: "Ticket / Problem",
    mttr_final: "MTTR Final",
    impacto: "Impacto",
    contactacion: "Contactación",
    reincidente: "Reincidente",
    tarea: "Tarea",
    resumen_breve: "Resumen breve"
  };
  const missing = Object.entries(labels).filter(([key]) => !values[key]);
  if (missing.length) {
    alert(`Completá los campos obligatorios: ${missing.map(([, label]) => label).join(", ")}.`);
    const first = document.querySelector(`[data-postmortem-field="${missing[0][0]}"]`);
    first?.focus();
    return false;
  }
  return true;
}

async function saveCurrentPostMortemForm() {
  const values = postMortemFormValues();
  if (!validatePostMortemForm(values)) return false;
  const { data, error } = await savePostMortem({
    retroId: state.retroId,
    sessionId: state.participantSessionId,
    ticket: values.ticket,
    mttrFinal: values.mttr_final,
    impacto: values.impacto,
    contactacion: values.contactacion,
    reincidente: values.reincidente,
    tarea: values.tarea,
    resumenBreve: values.resumen_breve
  });
  if (error || !data?.success) {
    alert("No se pudo guardar la ficha técnica.\n\n" + (error?.message || data?.message || "Error desconocido."));
    return false;
  }
  await loadPostMortem();
  return true;
}

async function savePostMortemFieldValue(fieldKey, value) {
  const cleanValue = String(value || "").trim();
  if (!cleanValue) return false;

  const { data, error } = await savePostMortemField({
    retroId: state.retroId,
    sessionId: state.participantSessionId,
    field: fieldKey,
    value: cleanValue
  });

  if (error || !data?.success) {
    console.error("No se pudo guardar el campo de la ficha técnica:", error || data);
    return false;
  }

  state.postMortem = {
    ...(state.postMortem || {}),
    [fieldKey]: cleanValue
  };
  return true;
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

  statusElement.classList.remove("is-fading-out", "is-saved");

  if (status === "saving") {
    statusElement.textContent = "Guardando…";
    statusElement.classList.add("is-visible");
  } else if (status === "saved") {
    showTransientSavedStatus(statusElement);
  } else if (status === "error") {
    statusElement.textContent = "No se pudo guardar. Se reintentará al editar.";
    statusElement.classList.add("is-visible");
  } else {
    statusElement.textContent = "";
    statusElement.classList.remove("is-visible");
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
    const { data, error } = await saveGuidingQuestionAnswer({
      retroId: state.retroId,
      sessionId: state.participantSessionId,
      questionId,
      respuesta: answer
    });

    if (error) throw error;
    if (!data?.success) throw new Error(data?.message || "No se pudo guardar la respuesta.");

    question.answer = answer;
    clearAnswerDraft(questionId);
    setAnswerAutosaveStatus(questionId, "saved");

    if (state.guidingQuestionsRealtimeChannel) {
      await state.guidingQuestionsRealtimeChannel.send({
        type: "broadcast",
        event: "guiding_question_answer_updated",
        payload: {
          question_id: questionId
        }
      });
    }

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


async function broadcastTopicCreated(topic) {
  if (!state.topicRealtimeChannel || !topic?.topic_key || !topic?.label) {
    return;
  }

  try {
    await state.topicRealtimeChannel.send({
      type: "broadcast",
      event: "topic_created",
      payload: {
        id: topic.id || null,
        retro_id: topic.retro_id || state.retroId,
        topic_key: topic.topic_key,
        label: topic.label,
        orden: topic.orden ?? 9999,
        created_at: topic.created_at || new Date().toISOString()
      }
    });

    console.log("Tema en común enviado por Broadcast:", topic);
  } catch (error) {
    console.error("Error enviando tema en común por Broadcast:", error);
  }
}

async function broadcastTopicDeleted(topicKey) {
  if (!state.topicRealtimeChannel || !topicKey) {
    return;
  }

  try {
    await state.topicRealtimeChannel.send({
      type: "broadcast",
      event: "topic_deleted",
      payload: {
        retro_id: state.retroId,
        topic_key: topicKey
      }
    });

    console.log("Tema en común eliminado enviado por Broadcast:", topicKey);
  } catch (error) {
    console.error("Error enviando eliminación de tema por Broadcast:", error);
  }
}



// =====================================================
// HELPERS
// =====================================================




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
  const sessionId = getParticipantSessionId();
  if (!sessionId) return false;
  console.log("Session ID:", sessionId);
  const { data: existing, error: searchError } = await fetchParticipant(state.retroId, sessionId);
  if (searchError) {
    console.error("Error buscando participante:", searchError);
    return false;
  }
  if (existing) {
    state.participant = existing;
    state.participantId = existing.id;
    console.log("Participante recuperado:", existing);
    return true;
  }
  const { data: created, error: createError } = await createParticipant(state.retroId, sessionId);
  if (createError) {
    console.error("Error creando participante:", createError);
    return false;
  }
  state.participant = created;
  state.participantId = created.id;
  console.log("Nuevo participante creado:", created);
  return true;
}


// =====================================================
// CARGAR VOTOS DEL PARTICIPANTE
// =====================================================

async function loadMyVotes() {
  if (!state.participantId) return;
  const { data, error } = await fetchMyVotes(state.retroId, state.participantId);
  if (error) {
    console.error("Error cargando votos del participante:", error);
    state.myVotes = {};
    state.usedVotes = 0;
    return;
  }
  state.myVotes = {};
  (data || []).forEach(row => {
    state.myVotes[row.topic_key] = (state.myVotes[row.topic_key] || 0) + 1;
  });
  state.usedVotes = (data || []).length;
  console.log("Mis votos:", state.myVotes);
  console.log("Votos utilizados:", state.usedVotes);
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

  const { data, error } = await updateParticipantProfile(
    state.retroId,
    state.participantSessionId,
    cleanName,
    listo
  );

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
  if (!state.retroId) return;
  const { data, error } = await fetchParticipants(state.retroId);
  if (error) {
    console.error("Error cargando participantes:", error);
    return;
  }
  state.participants = data || [];
  const current = state.participants.find(participant => participant.id === state.participantId);
  if (current) {
    state.participant = current;
  } else {
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
    return false;
  }

  // El facilitador debe estar identificado antes de ejecutar
  // claim_facilitator. Si el nombre todavía está en el input
  // pero aún no fue guardado, lo guardamos primero.
  const input = document.querySelector("#participantName");
  const participantName = String(
    state.participant?.nombre ||
    input?.value ||
    ""
  ).trim();

  if (!participantName) {
    alert("Ingresá tu nombre y apellido.");
    if (input) input.focus();
    return false;
  }

  const profileSaved = await setParticipantProfile(
    participantName,
    true
  );

  if (!profileSaved) {
    return false;
  }

  const { data, error } = await claimFacilitatorData(
    state.retroId,
    state.participantSessionId
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

    return false;
  }


  console.log(
    "Resultado claim facilitador:",
    data
  );


  // ---------------------------------------------------
  // Volvemos a consultar la retro para conocer
  // el estado real del facilitador.
  // ---------------------------------------------------

  await refreshRetroState();
  await loadParticipants();

  render();
  return true;
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

  const { data, error } = await resetRetroData(
    state.retroId,
    state.participantSessionId
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


  const { data, error } = await releaseFacilitatorData(
    state.retroId,
    state.participantSessionId
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
      await claimFacilitatorData(state.retroId, state.participantSessionId);

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

  const { data, error } = await startRetroData(
    state.retroId,
    state.participantSessionId
  );

  if (error) {
    console.error("Error iniciando retro:", error);
    alert("No se pudo iniciar la retro.\n\n" + error.message);
    return;
  }

  console.log("Retro iniciada:", data);
  state.retroStarted = true;
  state.step = Number(data?.step || 0);

  const { data: startedData, error: startedError } = await markRetroStarted(
    state.retroId,
    state.participantSessionId
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

  const { data, error } = await claimFacilitatorData(
    state.retroId,
    state.participantSessionId
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


  const currentSteps = getCurrentRetroSteps();

  if (
    state.step >=
    currentSteps.length - 1
  ) {
    return;
  }

  if (isPostMortem() && state.step === 0) {
    const saved = await saveCurrentPostMortemForm();
    if (!saved) return;
  }

  // La etapa de Preguntas requiere que todas las preguntas registradas
  // tengan una respuesta guardada antes de poder continuar.
  if (!isPostMortem() && state.step === 5) {
    const { data: validationData, error: validationError } = await validateGuidingQuestionsAnswered(
      state.retroId
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


  const { data, error } = await advanceRetroStep(
    state.retroId,
    state.participantSessionId
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
    const { data: skippedData, error: skippedError } = await advanceRetroStep(
      state.retroId,
      state.participantSessionId
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

  if (state.step === currentSteps.length - 1) {
    const { data: finishedData, error: finishedError } = await markRetroFinished(
      state.retroId,
      state.participantSessionId
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


  const { data, error } = await previousRetroStepData(
    state.retroId,
    state.participantSessionId
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
    const { data: skippedData, error: skippedError } = await previousRetroStepData(
      state.retroId,
      state.participantSessionId
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

  const { data, error } = await fetchRetroState(state.retroId);


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

// =====================================================
// MODAL FACILITADOR
// =====================================================

// =====================================================
// FEEDBACK FINAL
// =====================================================

async function loadMyFeedback() {
  if (!state.retroId || !state.participantSessionId) return;
  const { data, error } = await fetchMyRetroFeedback(state.retroId, state.participantSessionId);
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

  const { data, error } = await submitRetroFeedback(
    state.retroId,
    state.participantSessionId,
    rating,
    observations,
    toolFeedback
  );

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
      <section class="feedback-complete">
        <div class="big-number feedback-complete-icon">✓</div>
        <div class="eyebrow">Feedback enviado</div>
        <h2 class="feedback-complete-title">Gracias por compartir tu mirada</h2>
        <p class="lead feedback-complete-lead">
          Tu feedback nos ayuda a mejorar tanto el espacio como la herramienta.
        </p>
        <div class="feedback-complete-actions">
          <button type="button" id="feedbackBackBtn">
            ← Volver al cierre
          </button>
          <button type="button" id="feedbackHomeBtn" class="primary">
            Volver a la página principal
          </button>
        </div>
      </section>
    `;
  }

  return `
    <section class="feedback-form">
      <div class="eyebrow">Retro finalizada</div>
      <h2 class="feedback-form-title">¿Cómo fue el encuentro?</h2>
      <p class="lead feedback-form-lead">
        Queremos conocer tu experiencia para seguir mejorando estos espacios.
      </p>

      <div class="card feedback-form-card">
        <label class="badge" for="feedbackRating">CALIFICÁ EL ENCUENTRO · 1 A 10</label>
        <select id="feedbackRating">
          <option value="">Seleccioná una calificación</option>
          ${Array.from({length:10}, (_,i) => {
            const n=i+1; return `<option value="${n}" ${Number(feedback.rating)===n?'selected':''}>${n}</option>`;
          }).join("")}
        </select>

        <label class="badge feedback-field-label" for="feedbackObservations">OBSERVACIONES · OBLIGATORIO</label>
        <textarea id="feedbackObservations" rows="6" placeholder="Dejanos tus observaciones sobre el encuentro…" class="feedback-textarea">${escapeHtml(feedback.observaciones || "")}</textarea>

        <label class="badge feedback-field-label" for="feedbackTool">FEEDBACK SOBRE LA HERRAMIENTA</label>
        <textarea id="feedbackTool" rows="4" placeholder="¿Qué mejorarías de la herramienta? ¿Qué funcionalidad nueva agregarías?" class="feedback-textarea">${escapeHtml(feedback.feedback_herramienta || "")}</textarea>

        <button id="submitFeedbackBtn" class="primary feedback-submit">Enviar feedback</button>
        <button type="button" id="feedbackBackBtn" class="feedback-back">
          ← Volver al cierre
        </button>
      </div>
    </section>
  `;
}

function showLoading() {
  const spinner = document.querySelector("#loadingSpinner");
  if (!spinner) return;
  spinner.classList.add("is-visible");
  spinner.setAttribute("aria-hidden", "false");
}

function hideLoading() {
  const spinner = document.querySelector("#loadingSpinner");
  if (!spinner) return;
  spinner.classList.remove("is-visible");
  spinner.setAttribute("aria-hidden", "true");
}

function updateStageIndicator(visible = true) {
  const indicator = document.querySelector("#stageIndicator");
  const label = document.querySelector("#stageLabel");
  const count = document.querySelector("#stageCount");
  if (!indicator || !label || !count) return;

  if (!visible || !state.retroId) {
    indicator.classList.remove("is-visible");
    indicator.setAttribute("aria-hidden", "true");
    return;
  }

  const steps = getCurrentRetroSteps();
  const currentStep = Number(state.step || 0);
  const meta = getProgressMeta(currentStep, state.retroType);
  const currentLabel = steps[currentStep] || steps[Math.max(0, currentStep - 1)] || "Etapa";
  const nextCount = `${meta.current}/${meta.total}`;
  const changed = label.textContent !== currentLabel || count.textContent !== nextCount;

  label.textContent = currentLabel;
  count.textContent = nextCount;
  indicator.classList.add("is-visible");
  if (changed) {
    indicator.classList.remove("stage-changing");
    requestAnimationFrame(() => {
      indicator.classList.add("stage-changing");
    });
    clearTimeout(indicator.__stageTimer);
    indicator.__stageTimer = setTimeout(() => indicator.classList.remove("stage-changing"), 360);
  }
  indicator.setAttribute("aria-hidden", "false");
}

// =====================================================
// RENDER PRINCIPAL
// =====================================================

function render() {

  const backBtn =
    document.querySelector("#backBtn");

  const nextBtn =
    document.querySelector("#nextBtn");

  const app =
    document.querySelector("#app");

  const toolFeedbackBtn = document.querySelector("#toolFeedbackBtn");
  if (toolFeedbackBtn) toolFeedbackBtn.style.display = "inline-flex";


  updateStageIndicator(Boolean(state.retroId && !state.showFeedback));

  if (!backBtn || !nextBtn || !app) {
    console.error(
      "No se encontraron elementos principales de la interfaz."
    );

    return;
  }

  // El footer es persistente y vive fuera de #app. Cada render de una sala
  // puede ocurrir varias veces, por lo que volvemos a enlazar el CTA.
  bindToolFeedback();

  if (state.retroFinishedAt && state.step === getCurrentRetroSteps().length - 1 && state.showFeedback) {
    backBtn.style.visibility = "hidden";
    backBtn.disabled = true;
    nextBtn.style.display = "none";
    app.innerHTML = feedbackLanding();
    window.scrollTo({ top: 0, left: 0, behavior: "auto" });

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

  // El avance de la retro es responsabilidad exclusiva del facilitador.
  // Para el resto de los participantes no mostramos un botón inactivo
  // en el footer, ya que no tiene ninguna acción disponible.
  if (!state.isFacilitator) {
    nextBtn.style.display = "none";
    nextBtn.disabled = true;
  } else if (!state.retroStarted) {
    nextBtn.style.display = "";
    nextBtn.textContent = "Iniciar";
    nextBtn.disabled = false;
  } else if (state.step === getCurrentRetroSteps().length - 1) {
    nextBtn.style.display = "";
    nextBtn.textContent = "Terminar";
    nextBtn.disabled = false;
  } else {
    nextBtn.style.display = "";
    nextBtn.textContent = "Avanzar";
    nextBtn.disabled = false;
  }


  // ---------------------------------------------------
  // CONTENIDO
  // ---------------------------------------------------

  const activeScreens = isPostMortem() ? postMortemScreens : screens;

  app.innerHTML =
    facilitatorControls(getParticipantName) +
    (state.retroStarted
      ? activeScreens[state.step]()
      : lobbyScreen(getParticipantName, isParticipantReady)) +
    facilitatorModal();


  bind();
}


// =====================================================
// PANTALLAS
// =====================================================

const screens = [

  // 1. INICIO
  introScreen,

  // 2. CHECK-IN
  checkInScreen,

  // 3. ACTIVIDAD
  activityScreen,

  // ===================================================

  topicsView,
  votingView,
  () => questionsView(getQuestionAnswerForRender),
  actionsView,
  summaryView
];

const postMortemScreens = [
  postMortemTechnicalForm,
  postMortemActivityView,
  postMortemActionsView,
  postMortemSummaryView
];



// =====================================================
// LANDING / HISTORIAL
// =====================================================

let landingRetros = [];
let landingView = "home";
let landingSelectedRetro = null;
let landingReturnContext = "home";

// =====================================================
// FEEDBACK DE LA HERRAMIENTA
// =====================================================

function closeToolFeedbackModal() {
  const modal = document.querySelector("#toolFeedbackModal");
  if (!modal) return;
  modal.classList.remove("is-open");
  modal.setAttribute("aria-hidden", "true");
}

function resetToolFeedbackModal() {
  const input = document.querySelector("#toolFeedbackInput");
  const status = document.querySelector("#toolFeedbackStatus");
  const counter = document.querySelector("#toolFeedbackCounter");
  const submitBtn = document.querySelector("#toolFeedbackSubmitBtn");
  const cancelBtn = document.querySelector(".tool-feedback-cancel");
  const actions = document.querySelector(".tool-feedback-actions");
  const meta = document.querySelector(".tool-feedback-meta");
  const title = document.querySelector("#toolFeedbackTitle");
  const lead = document.querySelector("#toolFeedbackModal .lead");

  document.querySelector("#toolFeedbackDialog")?.classList.remove("is-confirmation");
  if (title) title.textContent = "¿Qué mejorarías de la herramienta?";
  if (lead) lead.textContent = "Contanos qué te gustaría cambiar, mejorar o sumar.";
  if (input) {
    input.value = "";
    input.hidden = false;
  }
  if (counter) {
    counter.textContent = "0 / 2000";
    counter.hidden = false;
  }
  if (meta) meta.hidden = false;
  if (actions) actions.hidden = false;
  if (cancelBtn) {
    cancelBtn.hidden = false;
    cancelBtn.textContent = "Cerrar";
    cancelBtn.classList.remove("primary");
    cancelBtn.classList.add("ghost");
  }
  if (submitBtn) {
    submitBtn.hidden = false;
    submitBtn.disabled = false;
    submitBtn.textContent = "Enviar feedback →";
  }
  if (status) {
    status.classList.remove("is-visible");
    status.textContent = "";
  }
}

function openToolFeedbackModal() {
  const modal = document.querySelector("#toolFeedbackModal");
  const input = document.querySelector("#toolFeedbackInput");
  if (!modal) return;
  resetToolFeedbackModal();
  modal.classList.add("is-open");
  modal.setAttribute("aria-hidden", "false");
  if (input) input.focus();
}

function bindToolFeedback() {
  const openBtn = document.querySelector("#toolFeedbackBtn");
  const submitBtn = document.querySelector("#toolFeedbackSubmitBtn");
  const input = document.querySelector("#toolFeedbackInput");
  const counter = document.querySelector("#toolFeedbackCounter");
  const closeBtn = document.querySelector(".tool-feedback-cancel");

  if (openBtn) openBtn.onclick = openToolFeedbackModal;
  if (closeBtn) closeBtn.onclick = closeToolFeedbackModal;
  document.querySelectorAll("[data-tool-feedback-close]").forEach(el => {
    el.onclick = closeToolFeedbackModal;
  });

  if (input && counter) {
    input.oninput = () => {
      counter.textContent = `${input.value.length} / 2000`;
    };
  }

  if (submitBtn) {
    submitBtn.onclick = async () => {
      const feedback = String(input?.value || "").trim();
      const status = document.querySelector("#toolFeedbackStatus");
      if (!feedback) {
        if (status) {
          status.textContent = "Escribí una sugerencia antes de enviarla.";
          status.classList.add("is-visible");
        }
        input?.focus();
        return;
      }

      submitBtn.disabled = true;
      submitBtn.textContent = "Enviando…";

      const { data: savedFeedback, error } = await submitToolFeedback(feedback);

      if (error || !savedFeedback?.success || !savedFeedback?.id) {
        submitBtn.disabled = false;
        submitBtn.textContent = "Enviar feedback →";
        if (status) {
          status.textContent = "No se pudo confirmar el guardado del feedback.\n\n" + (error?.message || "La base no devolvió una confirmación válida.");
          status.classList.add("is-visible");
        }
        return;
      }

      submitBtn.disabled = false;
      submitBtn.textContent = "Enviar feedback →";
      const dialog = document.querySelector("#toolFeedbackDialog");
      const actions = document.querySelector(".tool-feedback-actions");
      const meta = document.querySelector(".tool-feedback-meta");
      const title = document.querySelector("#toolFeedbackTitle");
      const lead = document.querySelector("#toolFeedbackModal .lead");
      const cancelBtn = document.querySelector(".tool-feedback-cancel");
    
      if (input) input.hidden = true;
      if (counter) counter.hidden = true;
      if (meta) meta.hidden = true;
      if (dialog) dialog.classList.add("is-confirmation");
          if (actions) actions.hidden = false;
      if (cancelBtn) {
        cancelBtn.hidden = false;
        cancelBtn.textContent = "Volver a la APP";
        cancelBtn.classList.remove("ghost");
        cancelBtn.classList.add("primary");
      }
      if (submitBtn) submitBtn.hidden = true;
      if (title) title.textContent = "¡Gracias!";
      if (lead) lead.textContent = "Tu feedback fue enviado correctamente.";
      if (status) {
        status.textContent = "";
        status.classList.remove("is-visible");
      }
    };
  }
}






function landingShell(content) {
  const app = document.querySelector("#app");
  const topbar = document.querySelector(".topbar");
  const backBtn = document.querySelector("#backBtn");
  const nextBtn = document.querySelector("#nextBtn");

  if (topbar) {
    topbar.innerHTML = `
      <div class="brand"><img class="brand-logo" src="./logo.svg" alt=""> <span>RETROS</span></div>
      ${landingView === "home" ? `
        <nav class="landing-nav">
          <button id="landingHistoryNavBtn" class="ghost landing-nav-btn">Ver Retros</button>
          <button id="landingNewRetroNavBtn" class="primary landing-nav-btn">+ Nueva retro</button>
        </nav>
      ` : landingView === "create" ? `
        <nav class="landing-nav">
          <button id="landingBackBtn" class="ghost landing-nav-btn">Volver a la home</button>
        </nav>
      ` : ""}
    `;
  }

  if (backBtn) { backBtn.style.display = "none"; backBtn.disabled = true; }
  if (nextBtn) nextBtn.style.display = "none";
  if (app) app.innerHTML = content;

  // Cada vista pública (incluidos resumen y feedback) comienza desde el inicio.
  window.scrollTo({ top: 0, left: 0, behavior: "auto" });

  // El feedback está disponible también desde las vistas públicas (home/admin).
  // El botón vive fuera de #app, por eso hay que volver a enlazarlo cada vez
  // que se reemplaza el contenido de la landing.
  const toolFeedbackBtn = document.querySelector("#toolFeedbackBtn");
  if (toolFeedbackBtn) toolFeedbackBtn.style.display = "inline-flex";
  bindToolFeedback();
}










async function loadLandingRetros() {
  const { data, error } = await fetchRetroHistory();
  if (error) {
    console.error("Error cargando historial:", error);
    landingRetros = [];
    return;
  }
  const retros = data || [];
  if (!retros.length) {
    landingRetros = [];
    return;
  }
  const { data: typeRows, error: typeError } = await fetchRetroTypes(retros.map(retro => retro.id));
  if (typeError) {
    console.warn("No se pudo recuperar el tipo de retro del historial:", typeError);
    landingRetros = retros;
    return;
  }
  const typesById = new Map((typeRows || []).map(row => [row.id, row.tipo_retro]));
  landingRetros = retros.map(retro => ({ ...retro, tipo_retro: typesById.get(retro.id) || retro.tipo_retro || "standard" }));
}

async function renderLanding() {
  if (landingView === "create") landingShell(landingCreateForm());
  else if (landingView === "summary") landingShell(landingSummaryView(landingSelectedRetro));
  else if (landingView === "feedback") landingShell(landingFeedbackView(landingSelectedRetro));
  else landingShell(landingHome(landingRetros));

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
      if (btn.dataset.disabledAction === "true") {
        const notice = document.querySelector(`[data-disabled-notice="${btn.dataset.retroId}"]`);
        if (notice) {
          notice.classList.add("is-visible");
          notice.setAttribute("aria-hidden", "false");
          window.clearTimeout(notice._hideTimer);
          notice._hideTimer = window.setTimeout(() => {
            notice.classList.remove("is-visible");
            notice.setAttribute("aria-hidden", "true");
          }, 3200);
        }
        return;
      }
      btn.disabled = true;
      const { data, error } = await fetchRetroSummary(btn.dataset.retroId);
      btn.disabled = false;
      if (error) return alert("No se pudo cargar el resumen.\n\n" + error.message);

      const { data: questionAnswers, error: questionAnswersError } = await fetchRetroQuestionAnswers(btn.dataset.retroId);

      if (questionAnswersError) return alert("No se pudieron cargar las respuestas de las preguntas.\n\n" + questionAnswersError.message);

      let retroContext = null;
      const { data: contextData } = await fetchRetroTitleContext(btn.dataset.retroId);
      retroContext = contextData || null;
      landingSelectedRetro = {
        ...(data || {}),
        retro: { ...(data?.retro || {}), ...(retroContext || {}) },
        questions: questionAnswers || []
      };
      landingView = "summary";
      renderLanding();
    };
  });

  document.querySelectorAll(".landing-feedback-btn").forEach(btn => {
    btn.onclick = async () => {
      if (btn.dataset.disabledAction === "true") {
        const notice = document.querySelector(`[data-disabled-notice="${btn.dataset.retroId}"]`);
        if (notice) {
          notice.classList.add("is-visible");
          notice.setAttribute("aria-hidden", "false");
          window.clearTimeout(notice._hideTimer);
          notice._hideTimer = window.setTimeout(() => {
            notice.classList.remove("is-visible");
            notice.setAttribute("aria-hidden", "true");
          }, 3200);
        }
        return;
      }
      btn.disabled = true;
      const { data, error } = await fetchRetroFeedbackSummary(btn.dataset.retroId);
      btn.disabled = false;
      if (error) return alert("No se pudo cargar el feedback.\n\n" + error.message);
      const { data: contextData } = await fetchRetroTitleContext(btn.dataset.retroId);
      landingSelectedRetro = {
        ...(data || {}),
        retro: { ...(data?.retro || {}), ...(contextData || {}) }
      };
      landingView = "feedback";
      renderLanding();
    };
  });

  document.querySelectorAll(".landing-join-btn").forEach(btn => {
    btn.onclick = () => {
      const code = String(btn.dataset.retroCode || "").trim();
      if (!code) return alert("No se encontró el código de la retrospectiva.");
      window.location.href = `?retro=${encodeURIComponent(code)}`;
    };
  });

  mountDateFields(document);

  const createBtn = document.querySelector("#createRetroBtn");
  if (createBtn) createBtn.onclick = async () => {
    const title = document.querySelector("#retroTitle")?.value.trim();
    const teams = document.querySelector("#retroTeams")?.value.trim();
    const date = document.querySelector("#retroDate")?.value || todayLocalISO();
    const retroType = document.querySelector("#retroType")?.value || "standard";
    if (!title) return alert("Ingresá el título de la retrospectiva.");
    if (!teams) return alert("Ingresá el nombre del equipo o equipos participantes.");
    if (!date) return alert("Seleccioná la fecha de la retrospectiva.");
    createBtn.disabled = true; createBtn.textContent = "Creando…";
    const { data, error } = await createRetroWithTitle(title, teams, date);
    if (error) {
      createBtn.disabled = false; createBtn.textContent = "Crear sala";
      return alert("No se pudo crear la retrospectiva.\n\n" + error.message);
    }
    const { data: typeData, error: typeError } = await setRetroType(data.id, retroType);
    if (typeError || !typeData?.success) {
      createBtn.disabled = false; createBtn.textContent = "Crear sala";
      return alert("La sala se creó, pero no se pudo guardar el tipo de retro.\n\n" + (typeError?.message || typeData?.message || "Error desconocido."));
    }
    window.location.href = `?retro=${encodeURIComponent(data.codigo)}`;
  };
}


// =====================================================
// ADMIN PRIVADO
// =====================================================

let adminRetros = [];
let adminToolFeedback = [];
let adminRetroToolFeedback = [];



async function loadAdminToolFeedback() {
  const { data, error } = await fetchToolFeedback();
  const rows = (data || []).map(({ id, feedback, created_at }) => ({ id, feedback, created_at }));

  if (error) throw error;
  adminToolFeedback = rows || [];
}

async function loadAdminRetroToolFeedback() {
  const finishedRetros = (adminRetros || []).filter(retro => !!retro.finalizada_en);

  const results = await Promise.all(finishedRetros.map(async retro => {
    const [{ data: feedbackRows, error: feedbackError }, { data: titleData, error: titleError }] = await Promise.all([
      fetchRetroToolFeedback(retro.id),
      fetchRetroTitleContext(retro.id)
    ]);

    if (feedbackError) throw feedbackError;
    if (titleError) throw titleError;

    const titleContext = titleData || {};

    return (feedbackRows || [])
      .filter(item => String(item.feedback_herramienta || "").trim())
      .map(item => ({
        id: item.id,
        retro_id: retro.id,
        retro_titulo: titleContext.titulo || "Retrospectiva",
        equipos: titleContext.equipos || retro.equipos || retro.nombre || "",
        fecha: titleContext.fecha || retro.fecha,
        feedback: item.feedback_herramienta,
        created_at: item.created_at
      }));
  }));

  adminRetroToolFeedback = results.flat().sort((a, b) =>
    new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime()
  );
}

function renderAdminToolFeedbackList() {
  const list = document.querySelector("#adminToolFeedbackList");
  if (!list) return;
  list.innerHTML = adminToolFeedback.length
    ? adminToolFeedback.map(adminToolFeedbackRow).join("")
    : `<p style="opacity:.65;margin:1rem 0 0">Todavía no hay sugerencias recibidas.</p>`;
  renderAdminToolFeedbackHeadingAction();
  bindAdminToolFeedbackActions();
}

function renderAdminToolFeedbackHeadingAction() {
  const headingRow = document.querySelector(".admin-feedback-global-actions");
  if (!headingRow) return;
  const existing = headingRow.querySelector("#adminDeleteAllFeedbackBtn");
  if (adminToolFeedback.length) {
    if (existing) return;
    headingRow.insertAdjacentHTML("beforeend", `<button id="adminDeleteAllFeedbackBtn" class="admin-delete-all-feedback-btn" type="button" aria-label="Eliminar todas las sugerencias del footer" title="Eliminar todas las sugerencias del footer">🗑️ Borrar todas</button>`);
  } else if (existing) {
    existing.remove();
  }
}

async function refreshAdminToolFeedbackList() {
  try {
    await loadAdminToolFeedback();
    renderAdminToolFeedbackList();
  } catch (error) {
    console.error("Error actualizando sugerencias de la herramienta:", error);
  }
}







function renderAdminRetroToolFeedbackList() {
  const list = document.querySelector("#adminRetroToolFeedbackList");
  if (!list) return;
  list.innerHTML = adminRetroToolFeedback.length
    ? adminRetroToolFeedback.map(adminRetroToolFeedbackRow).join("")
    : `<p style="opacity:.65;margin:1rem 0 0">Todavía no hay sugerencias de retros finalizadas.</p>`;
  bindAdminRetroToolFeedbackActions();
}

async function refreshAdminFeedbackLists() {
  try {
    await Promise.all([loadAdminToolFeedback(), loadAdminRetroToolFeedback()]);
    renderAdminToolFeedbackList();
    renderAdminRetroToolFeedbackList();
  } catch (error) {
    console.error("Error actualizando feedback del admin:", error);
  }
}





async function loadAdminRetros() {
  const { data, error } = await fetchAdminRetroHistory();
  if (error) throw error;

  const retros = data || [];
  const enrichedRetros = await Promise.all(retros.map(async retro => {
    // get_admin_retro_history no siempre devuelve el título de la retro.
    // Reutilizamos el mismo contexto que ya usa el feedback para obtenerlo
    // desde la fuente de verdad del título.
    try {
      const { data: titleData, error: titleError } = await fetchRetroTitleContext(retro.id);

      if (titleError) {
        console.warn("No se pudo recuperar el título de la retro:", retro.id, titleError);
        return retro;
      }

      const titleContext = titleData || {};
      return {
        ...retro,
        titulo: titleContext.titulo || retro.titulo || null,
        equipos: titleContext.equipos || retro.equipos || retro.nombre || null,
        fecha: titleContext.fecha || retro.fecha || null
      };
    } catch (titleError) {
      console.warn("Error recuperando contexto de título de la retro:", retro.id, titleError);
      return retro;
    }
  }));

  const { data: typeRows, error: typeError } = await fetchRetroTypes(enrichedRetros.map(retro => retro.id));
  const typesById = new Map((typeRows || []).map(row => [row.id, row.tipo_retro]));
  if (typeError) console.warn("No se pudo recuperar el tipo de retro del panel de admin:", typeError);
  adminRetros = enrichedRetros.map(retro => ({ ...retro, tipo_retro: typesById.get(retro.id) || retro.tipo_retro || "standard" }));
}

async function renderAdmin() {
  const { data: { session }, error: sessionError } = await supabaseClient.auth.getSession();

  if (sessionError) {
    console.error("Error recuperando la sesión de administrador:", sessionError);
    landingShell(adminLoginView("No se pudo recuperar la sesión. Volvé a ingresar."));
    bindAdminLogin();
    return;
  }

  if (!session) {
    landingShell(adminLoginView());
    bindAdminLogin();
    return;
  }

  try {
    await loadAdminRetros();
    await loadAdminToolFeedback();
    await loadAdminRetroToolFeedback();
  } catch (error) {
    // La autenticación y la autorización son estados distintos.
    // No cerramos la sesión automáticamente: si el login fue correcto pero
    // el usuario no está en admin_users, la sesión sigue siendo válida.
    console.error("La sesión existe, pero la cuenta no está autorizada como admin:", error);
    landingShell(adminLoginView("La cuenta inició sesión correctamente, pero no está autorizada como administradora."));
    bindAdminLogin();
    return;
  }

  landingShell(adminPanelView(adminRetros, adminToolFeedback, adminRetroToolFeedback));
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

function bindAdminToolFeedbackActions() {
  document.querySelectorAll(".admin-delete-feedback-btn").forEach(btn => {
    if (btn.dataset.retroFeedbackId) return;
    btn.onclick = async () => {
      if (!confirm("¿Borrar esta sugerencia? Esta acción no se puede deshacer.")) return;
      btn.disabled = true;
      const { error } = await deleteToolFeedback(btn.dataset.feedbackId);
      if (error) {
        btn.disabled = false;
        return alert("No se pudo borrar la sugerencia.\n\n" + error.message);
      }
      await refreshAdminToolFeedbackList();
    };
  });

  const deleteAllFeedbackBtn = document.querySelector("#adminDeleteAllFeedbackBtn");
  if (deleteAllFeedbackBtn) {
    deleteAllFeedbackBtn.onclick = async () => {
      const confirmed = window.confirm(
        "Vas a eliminar todas las sugerencias, tanto las enviadas desde el footer como las enviadas desde retros.\n\nEsta acción no se puede deshacer.\n\n¿Querés continuar?"
      );
      if (!confirmed) return;

      deleteAllFeedbackBtn.disabled = true;
      deleteAllFeedbackBtn.textContent = "Borrando…";
      const { error: toolFeedbackError } = await deleteAllToolFeedback();
      if (toolFeedbackError) {
        deleteAllFeedbackBtn.disabled = false;
        deleteAllFeedbackBtn.textContent = "🗑️ Borrar todas";
        return alert("No se pudieron borrar las sugerencias.\n\n" + toolFeedbackError.message);
      }

      const { error: retroFeedbackError } = await deleteAllRetroToolFeedback(adminRetroToolFeedback);
      if (retroFeedbackError) {
        deleteAllFeedbackBtn.disabled = false;
        deleteAllFeedbackBtn.textContent = "🗑️ Borrar todas";
        return alert("No se pudieron borrar todas las sugerencias de retros.\n\n" + retroFeedbackError.message);
      }

      await refreshAdminFeedbackLists();
    };
  }
}

let adminRetroToolFeedbackDelegationBound = false;

function bindAdminRetroToolFeedbackActions() {
  if (adminRetroToolFeedbackDelegationBound) return;
  adminRetroToolFeedbackDelegationBound = true;

  document.addEventListener("click", async event => {
    const btn = event.target.closest?.(".admin-delete-retro-feedback-btn");
    if (!btn) return;

    event.preventDefault();
    event.stopPropagation();

    const feedbackId = btn.dataset.retroFeedbackId;
    if (!feedbackId) {
      alert("No se encontró el identificador de la sugerencia.");
      return;
    }

    if (!confirm("¿Borrar esta sugerencia? Esta acción no se puede deshacer.")) return;

    btn.disabled = true;
    const { data, error } = await deleteRetroToolFeedback(feedbackId);

    if (error || data?.success !== true) {
      btn.disabled = false;
      return alert("No se pudo borrar la sugerencia.\n\n" + (error?.message || "La operación no fue confirmada por el servidor."));
    }

    await refreshAdminFeedbackLists();
  });
}

function bindAdminPanel() {
  bindAdminToolFeedbackActions();
  bindAdminRetroToolFeedbackActions();
  subscribeAdminToolFeedback({ refreshAdminFeedbackLists, loadAdminRetros });

  const historyNavBtn = document.querySelector("#landingHistoryNavBtn");
  if (historyNavBtn) {
    historyNavBtn.onclick = async () => {
      landingReturnContext = "admin";
      landingView = "home";
      await loadLandingRetros();
      renderLanding();
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
      const { error } = await setRetroPublicada(
        btn.dataset.retroId,
        !current
      );
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

      const { error } = await deleteRetro(btn.dataset.retroId);

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
  const { data, error } = await fetchRetroByCode(RETRO_CODE);
  if (error) {
    console.error("Error cargando retro:", error);
    alert("No se encontró la retro: " + RETRO_CODE);
    return false;
  }
  state.retroId = data.id;
  state.retroType = data.tipo_retro === "post_mortem" ? "post_mortem" : "standard";
  state.postMortem = null;
  state.step = Number(data.paso_actual || 0);
  state.facilitatorSessionId = data.facilitador_session_id || null;
  state.facilitatorName = data.facilitador_nombre || null;
  state.retroStarted = Boolean(data.iniciada);
  state.retroStartedAt = data.iniciada_en || null;
  state.retroFinishedAt = data.finalizada_en || null;
  state.showFeedback = Boolean(data.finalizada_en);
  updateFacilitatorState();
  console.log("Retro cargada:", data);
  return true;
}


// =====================================================
// CARGAR TARJETAS
// =====================================================

async function loadCards() {
  const { data, error } = await fetchCards(state.retroId);
  if (error) {
    console.error("Error cargando tarjetas:", error);
    return;
  }
  state.cards = data || [];
  console.log("Tarjetas cargadas:", state.cards);
}


// =====================================================
// CARGAR FICHA POST MORTEM
// =====================================================

async function loadPostMortem() {
  if (!isPostMortem() || !state.retroId) return;
  const { data, error } = await fetchPostMortem(state.retroId);
  if (error) {
    console.error("Error cargando ficha de post mortem:", error);
    return;
  }
  state.postMortem = data || null;
}


// =====================================================
// CARGAR TÓPICOS
// =====================================================

async function loadTopics() {
  const { data, error } = await fetchTopics(state.retroId);
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
  const { data, error } = await fetchGuidingQuestions(state.retroId);
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
  const { data, error } = await fetchActions(state.retroId);
  if (error) {
    console.error("Error cargando acciones:", error);
    return;
  }
  state.actions = (data || []).map(action => ({
    id: action.id,
    text: action.descripcion,
    owner: action.responsable,
    date: action.fecha || "Por definir",
    successCriteria: action.criterio_exito ?? action.como_sabremos ?? action.criterio ?? null,
    raw: action
  }));
  console.log("Acciones cargadas:", state.actions);
}


// =====================================================
// CARGAR VOTOS GLOBALES
// =====================================================

async function loadVotes() {
  const { data, error } = await fetchVotes(state.retroId);
  if (error) {
    console.error("Error cargando votos:", error);
    return;
  }
  state.votes = {};
  (data || []).forEach(row => {
    state.votes[row.topic_key] = row.votos || 0;
  });
  console.log("Votos cargados:", state.votes);
}


// =====================================================
// REALTIME - RETRO / FACILITADOR
// =====================================================

// =====================================================
// REALTIME - PARTICIPANTES
// =====================================================

// =====================================================
// REALTIME - CARDS
// =====================================================

// =====================================================
// REALTIME - TÓPICOS
// =====================================================

// =====================================================
// REALTIME - VOTOS
// =====================================================

// =====================================================
// REALTIME - PREGUNTAS
// =====================================================

// =====================================================
// REALTIME - ACCIONES
// =====================================================

// =====================================================
// EVENTOS
// =====================================================

async function persistTopicOrder(orderedTopics) {
  if (!state.isFacilitator || !state.retroId || !state.participantSessionId) return false;

  const payload = orderedTopics.map((topic, index) => ({
    topic_key: topic.key,
    orden: index
  }));

  const { data, error } = await reorderTopics({
    retroId: state.retroId,
    sessionId: state.participantSessionId,
    orders: payload
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

  const bindingContext = {
    MAX_VOTES_PER_PARTICIPANT,
    state,
    createActivityCard,
    updateActivityCard,
    deleteActivityCard,
    createSummaryCard,
    updateSummaryCard,
    deleteSummaryCard,
    setCardTopic,
    createTopic,
    renameTopic,
    deleteTopic,
    castVote,
    recoverVote,
    createGuidingQuestion,
    updateGuidingQuestion,
    deleteGuidingQuestion,
    clearAllGuidingQuestions,
    saveGuidingQuestionAnswer,
    createAction,
    createSummaryAction,
    updateAction,
    deleteAction,
    normalizeTopicText,
    getDynamicTopics,
    getGroupedCards,
    getTopVotedTopic,
    getConversationContext,
    buildGeneralGuidingQuestionSuggestions,
    buildGuidingQuestionSuggestions,
    questionExists,
    setAnswerDraft,
    clearAnswerDraft,
    setAnswerAutosaveStatus,
    autosaveGuidingQuestionAnswer,
    scheduleGuidingQuestionAutosave,
    broadcastTopicCreated,
    broadcastTopicDeleted,
    setParticipantProfile,
    openFacilitatorConfirmation,
    closeFacilitatorConfirmation,
    confirmClaimFacilitator,
    resetRetro,
    releaseFacilitator,
    render,
    loadCards,
    loadTopics,
    loadGuidingQuestions,
    loadActions,
    loadVotes,
    broadcastVoteUpdate,
    moveTopic,
    dropTopic,
    saveCurrentPostMortemForm,
    savePostMortemFieldValue,
    loadPostMortem,
    setPostMortemAutosaveStatus,
  };

  bindSummaryBindings(bindingContext);
  bindPostMortemBindings(bindingContext);
  bindFacilitatorBindings(bindingContext);
  bindLobbyBindings(bindingContext);
  bindTopicsBindings(bindingContext);
  bindVotingBindings(bindingContext);
  bindActivityBindings(bindingContext);
  bindQuestionsBindings(bindingContext);
  bindActionsBindings(bindingContext);
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
    if (state.step >= getCurrentRetroSteps().length - 1) {
      const shouldFinish = window.confirm(
        "¿Confirmás que querés finalizar la retro?\n\nUna vez finalizada, el equipo pasará a la instancia de feedback."
      );

      if (!shouldFinish) {
        return;
      }
    }

    showLoading();

    try {
      if (!state.retroStarted) {
        await startRetro();
        return;
      }

      if (state.step >= getCurrentRetroSteps().length - 1) {
        const { data, error } = await markRetroFinished(
          state.retroId,
          state.participantSessionId
        );

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
    } finally {
      hideLoading();
    }

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


    showLoading();
    try {
      await previousRetroStep();
    } finally {
      hideLoading();
    }

  };


// =====================================================
// NAVEGACIÓN DE LA SESIÓN
// =====================================================

function configureRetroTopbar() {
  const topbar = document.querySelector(".topbar");
  if (!topbar) return;

  topbar.innerHTML = `
    <div class="brand"><img class="brand-logo" src="./logo.svg" alt=""><span>RETROS</span></div>
    <div id="stageIndicator" class="stage-indicator" aria-live="polite" aria-hidden="true">
      <span id="stageLabel" class="stage-label">Inicio</span>
      <span id="stageCount" class="stage-count">1/1</span>
    </div>
    <div class="retro-topbar-actions">
      <button id="retroHomeBtn" class="retro-home-btn ghost" type="button">Volver a la home</button>
    </div>
  `;

  document.querySelector("#retroHomeBtn")?.addEventListener("click", () => {
    window.location.href = window.location.pathname;
  });
}


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

  configureRetroTopbar();


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

  await loadPostMortem();

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

  subscribeToRetro({ normalizeStepForTopics, updateFacilitatorState, render });

  subscribeToParticipants({ loadParticipants, render });

  subscribeToCards({ normalizeStepForTopics, render });

  subscribeToPostMortem({ loadPostMortem, render });

  subscribeToTopics({ loadTopics, normalizeStepForTopics, render });

  subscribeToGuidingQuestions({ loadGuidingQuestions, render });

  subscribeToVotes({ render });

  subscribeToActions({ loadActions, render });


  // ---------------------------------------------------
  // RENDER
  // ---------------------------------------------------

  render();

}


showLoading();
initialize().finally(hideLoading);
