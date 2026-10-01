import { supabaseClient } from "../services/supabase.js";
import { state, isUserEditingField } from "../core/state.js";

export function subscribeToActions({ loadActions, render }) {

  const channel = supabaseClient.channel(
    "actions-realtime-" +
    state.retroId
  );

  state.actionRealtimeChannel = channel;

  channel

    .on(
      "broadcast",
      { event: "action_deleted" },
      async payload => {
        const deletedId = payload?.payload?.actionId;
        if (!deletedId) return;

        state.actions = state.actions.filter(action => action.id !== deletedId);
        await loadActions();

        if (state.retroType === "post_mortem" ? (state.step === 2 || state.step === 3) : (state.step === 6 || state.step === 7)) {
          if (!isUserEditingField()) render();
          if (state.realtimeFeedback) setTimeout(() => { state.realtimeFeedback = null; }, 240);
        }
      }
    )

    .on(
      "postgres_changes",
      {
        event: "*",
        schema: "public",
        table: "acciones",
        filter:
          `retro_id=eq.${state.retroId}`
      },

      async payload => {

        console.log(
          "Cambio de acción recibido:",
          payload
        );

        if (payload.eventType === "DELETE") {
          const deletedId = payload.old?.id;
          if (deletedId) {
            state.actions = state.actions.filter(action => action.id !== deletedId);
          }
          // Re-sync the source of truth after a deletion so the UI also recovers
          // when the DELETE payload does not expose the old primary key.
          await loadActions();
        } else if (payload.new) {
          const nextAction = {
            id: payload.new.id,
            text: payload.new.descripcion,
            owner: payload.new.responsable || "Por definir",
            date: payload.new.fecha || "Por definir",
            successCriteria: payload.new.criterio_exito ?? payload.new.como_sabremos ?? payload.new.criterio ?? null,
            raw: payload.new
          };

          const index = state.actions.findIndex(action => action.id === nextAction.id);
          if (index >= 0) {
            state.actions[index] = nextAction;
          } else {
            state.actions.push(nextAction);
          }
          state.realtimeFeedback = { type: "action", id: nextAction.id };
        }

        if (state.retroType === "post_mortem" ? (state.step === 2 || state.step === 3) : (state.step === 6 || state.step === 7)) {
          if (!isUserEditingField()) render();
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


