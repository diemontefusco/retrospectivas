import { supabaseClient } from "../services/supabase.js";
import { state, isUserEditingField } from "../core/state.js";

export function subscribeToTopics({ loadTopics, normalizeStepForTopics, render }) {

  const channel = supabaseClient
    .channel("topics-realtime-" + state.retroId);

  state.topicRealtimeChannel = channel;

  channel
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
          if (!isUserEditingField()) render();
        }
      }
    )
    .on(
      "broadcast",
      { event: "topic_deleted" },
      payload => {
        const topicKey = payload?.payload?.topic_key;
        if (!topicKey) return;

        console.log("Eliminación de tema recibida por Broadcast:", topicKey);

        state.topics = state.topics.filter(
          topic => topic.topic_key !== topicKey
        );

        state.cards = state.cards.map(card =>
          card.topic_key === topicKey
            ? { ...card, topic_key: null }
            : card
        );

        delete state.votes[topicKey];

        state.step = normalizeStepForTopics(state.step);

        if (state.step >= 3 && state.step <= 7) {
          if (!isUserEditingField()) render();
        }
      }
    )
    .on(
      "broadcast",
      { event: "topic_created" },
      payload => {
        const topic = payload?.payload;

        if (!topic?.topic_key || !topic?.label) {
          return;
        }

        console.log("Tema en común recibido por Broadcast:", topic);

        const existingIndex = state.topics.findIndex(
          item => item.topic_key === topic.topic_key
        );

        const normalizedTopic = {
          id: topic.id || null,
          retro_id: topic.retro_id || state.retroId,
          topic_key: topic.topic_key,
          label: topic.label,
          orden: Number.isFinite(Number(topic.orden))
            ? Number(topic.orden)
            : 9999,
          created_at: topic.created_at || new Date().toISOString()
        };

        if (existingIndex >= 0) {
          state.topics[existingIndex] = {
            ...state.topics[existingIndex],
            ...normalizedTopic
          };
        } else {
          state.topics.push(normalizedTopic);
        }

        state.topics.sort((a, b) =>
          (Number(a.orden || 0) - Number(b.orden || 0)) ||
          String(a.created_at || "").localeCompare(String(b.created_at || ""))
        );

        state.step = normalizeStepForTopics(state.step);

        if (state.step >= 3 && state.step <= 7) {
          if (!isUserEditingField()) render();
        }
      }
    )
    .subscribe(status => {
      console.log("Realtime topics:", status);
    });
}


