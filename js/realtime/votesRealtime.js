import { supabaseClient } from "../services/supabase.js";
import { state, isUserEditingField } from "../core/state.js";

let votesChannel = null;

export async function broadcastVoteUpdate({ topicKey, topicVotes }) {
  if (!votesChannel) return;

  try {
    await votesChannel.send({
      type: "broadcast",
      event: "vote-updated",
      payload: { topic_key: topicKey, topic_votes: topicVotes }
    });
  } catch (error) {
    console.warn("No se pudo emitir la actualización realtime del voto:", error);
  }
}

export function subscribeToVotes({ render }) {

  votesChannel = supabaseClient

    .channel(
      "votes-realtime-" +
      state.retroId
    )

    .on(
      "broadcast",
      { event: "vote-updated" },
      payload => {
        const update = payload?.payload;
        if (!update?.topic_key || update.topic_votes === undefined) return;

        if (update.topic_votes > 0) {
          state.votes[update.topic_key] = update.topic_votes;
        } else {
          delete state.votes[update.topic_key];
        }

        state.realtimeFeedback = { type: "vote", id: update.topic_key };

        if (state.step === 4 || state.step === 5 || state.step === 7) {
          if (!isUserEditingField()) render();
          if (state.realtimeFeedback) {
            setTimeout(() => { state.realtimeFeedback = null; }, 240);
          }
        }
      }
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

        const row = payload.new;

        if (payload.eventType === "DELETE") {
          if (payload.old?.topic_key) {
            delete state.votes[payload.old.topic_key];
          }
        } else if (row) {
          state.votes[row.topic_key] = row.votos || 0;
          state.realtimeFeedback = { type: "vote", id: row.topic_key };
        }

        if (
          state.step === 4 ||
          state.step === 5 ||
          state.step === 7
        ) {

          if (!isUserEditingField()) render();
          if (state.realtimeFeedback) setTimeout(() => { state.realtimeFeedback = null; }, 240);

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


