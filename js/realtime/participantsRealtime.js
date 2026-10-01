import { supabaseClient } from "../services/supabase.js";
import { state, isUserEditingField } from "../core/state.js";

export function refreshParticipantPresence(channel, render) {

  if (!channel) {
    return;
  }

  const presenceState = channel.presenceState();
  const activeSessions = new Set();

  Object.values(presenceState || {}).forEach(metas => {
    (metas || []).forEach(meta => {
      if (meta?.session_id) {
        activeSessions.add(meta.session_id);
      }
    });
  });

  state.activeParticipantSessions = activeSessions;
  state.participantPresenceReady = true;

  console.log(
    "Participantes conectados:",
    Array.from(activeSessions)
  );

  if (!isUserEditingField()) render();
}


export function subscribeToParticipants({ loadParticipants, render }) {

  const channel = supabaseClient
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
        if (!isUserEditingField()) render();
      }
    )
    .on(
      "presence",
      { event: "sync" },
      () => {
        refreshParticipantPresence(channel, render);
      }
    )
    .on(
      "presence",
      { event: "join" },
      ({ key, newPresences }) => {
        console.log("Participante conectado:", key, newPresences);
        state.realtimeFeedback = { type: "participant", id: key };
        refreshParticipantPresence(channel, render);
        setTimeout(() => {
          if (state.realtimeFeedback?.type === "participant" && state.realtimeFeedback.id === key) {
            state.realtimeFeedback = null;
          }
        }, 360);
      }
    )
    .on(
      "presence",
      { event: "leave" },
      ({ key, leftPresences }) => {
        console.log("Participante desconectado:", key, leftPresences);
        state.realtimeFeedback = { type: "participant", id: key };
        refreshParticipantPresence(channel, render);
        setTimeout(() => {
          if (state.realtimeFeedback?.type === "participant" && state.realtimeFeedback.id === key) {
            state.realtimeFeedback = null;
          }
        }, 360);
      }
    );

  state.participantPresenceChannel = channel;

  channel.subscribe(async status => {
    console.log("Realtime participantes:", status);

    if (status === "SUBSCRIBED") {
      const { error } = await channel.track({
        session_id: state.participantSessionId
      });

      if (error) {
        console.error("Error registrando presencia del participante:", error);
      }

      refreshParticipantPresence(channel, render);
    }
  });
}


