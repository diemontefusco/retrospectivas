import { supabaseClient } from "../services/supabase.js";
import { state, suppressCardRealtime, isUserEditingField } from "../core/state.js";

export function subscribeToCards({ normalizeStepForTopics, render }) {

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
            state.realtimeFeedback = { type: "card", id: payload.new.id };

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
            state.realtimeFeedback = { type: "card", id: payload.new.id };

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
          state.retroType === "post_mortem"
            ? state.step >= 1 && state.step <= 3
            : (state.step === 2 || state.step === 3 || state.step === 4 || state.step === 5)
        ) {

          if (!isUserEditingField()) render();

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


