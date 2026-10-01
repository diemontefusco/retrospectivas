import { TOPIC_STOP_WORDS } from "../core/config.js";
import { state } from "../core/state.js";

function normalizeTopicText(value) {
  return String(value || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
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


export { normalizeTopicText, stemTopicToken, getMeaningfulTokens, topicKeyFromLabel, titleCaseTopic, getDynamicTopics, shouldSkipVotingStep, getTopicLabel, getTopicCount, getGroupedCards };
