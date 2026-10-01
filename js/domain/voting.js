import { state } from "../core/state.js";
import { getDynamicTopics, getGroupedCards } from "./topics.js";

function getTopVotedTopics() {
  const topics = getDynamicTopics();

  if (!topics.length) return [];

  const maxVotes = Math.max(
    ...topics.map(topic => state.votes[topic.key] || 0)
  );

  // Si nadie votó, no existe un tema priorizado.
  if (maxVotes <= 0) return [];

  return topics
    .filter(topic => (state.votes[topic.key] || 0) === maxVotes)
    .sort((a, b) =>
      (a.orden - b.orden) ||
      a.label.localeCompare(b.label)
    );
}

function getTopVotedTopic() {
  return getTopVotedTopics()[0] || null;
}

function getConversationContext() {
  const topics = getDynamicTopics();

  if (topics.length === 0) {
    return {
      scenario: "no-topics",
      topics: [],
      cards: [...state.cards],
      message: "No hay temas en común. Revisemos todas las tarjetas de la actividad y usemos las preguntas para profundizar."
    };
  }

  if (topics.length === 1) {
    return {
      scenario: "single-topic",
      topics: [topics[0]],
      cards: getGroupedCards(topics[0].key),
      message: `Solo hay un tema en común: “${topics[0].label}”. Revisemos las tarjetas vinculadas y profundicemos con las preguntas.`
    };
  }

  const topTopics = getTopVotedTopics();

  if (!topTopics.length) {
    return {
      scenario: "voting-pending",
      topics: [],
      cards: [],
      message: "Hay más de un tema en común. Primero debemos votar para definir dónde profundizar."
    };
  }

  if (topTopics.length > 1) {
    return {
      scenario: "tie",
      topics: topTopics,
      cards: topTopics.flatMap(topic => getGroupedCards(topic.key)),
      message: `Hay empate entre los temas: ${topTopics.map(topic => `“${topic.label}”`).join(", ")}. Revisemos las tarjetas de cada tema y profundicemos con las preguntas.`
    };
  }

  return {
    scenario: "winner",
    topics: [topTopics[0]],
    cards: getGroupedCards(topTopics[0].key),
    message: `El tema “${topTopics[0].label}” fue el que más votos recibió. Revisemos sus tarjetas y profundicemos con las preguntas.`
  };
}


export { getTopVotedTopics, getTopVotedTopic, getConversationContext };
