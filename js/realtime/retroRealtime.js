import { supabaseClient } from "../services/supabase.js";
import { state } from "../core/state.js";

export function subscribeToRetro({ normalizeStepForTopics, updateFacilitatorState, render }) {

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


        if (payload.new.tipo_retro) {
          state.retroType = payload.new.tipo_retro === "post_mortem" ? "post_mortem" : "standard";
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


