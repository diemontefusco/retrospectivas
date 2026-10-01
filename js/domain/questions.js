import { state } from "../core/state.js";
import { normalizeTopicText, getMeaningfulTokens, titleCaseTopic } from "./topics.js";

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

function buildGeneralGuidingQuestionSuggestions(cards) {
  const redCount = cards.filter(card => card.etapa === "red").length;
  const blueCount = cards.filter(card => card.etapa === "blue").length;
  const focusWords = getQuestionFocusWords(cards, "");
  const focus = focusWords.length ? `, especialmente alrededor de ${focusWords.join(" y ")}` : "";

  const suggestions = [
    `¿Qué patrón común aparece detrás de las situaciones que surgieron en la actividad${focus}?`,
    redCount > 0
      ? "¿Qué condición de nuestra forma de trabajar está generando o sosteniendo los problemas que aparecieron?"
      : "¿Qué parte de nuestra forma de trabajar podríamos cambiar para mejorar lo que apareció en la actividad?",
    blueCount > 0
      ? "¿Qué aprendizaje de estas situaciones deberíamos incorporar a nuestra forma de trabajar?"
      : "¿Qué información, decisión o coordinación nos está faltando para abordar mejor lo que apareció?"
  ];

  return Array.from(new Set(suggestions)).slice(0, 3);
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


export { getQuestionFocusWords, buildGeneralGuidingQuestionSuggestions, buildGuidingQuestionSuggestions, questionExists };
