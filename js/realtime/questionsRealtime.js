import { supabaseClient } from "../services/supabase.js";
import { state, isUserEditingField } from "../core/state.js";

export function subscribeToGuidingQuestions({ loadGuidingQuestions, render }) {

  const channel = supabaseClient
    .channel("guiding-questions-realtime-" + state.retroId);

  state.guidingQuestionsRealtimeChannel = channel;

  channel
    .on(
      "postgres_changes",
      {
        event: "*",
        schema: "public",
        table: "preguntas_guia",
        filter: `retro_id=eq.${state.retroId}`
      },
      async payload => {
        console.log("Cambio de preguntas recibido:", payload);
        await loadGuidingQuestions();

        if (state.step === 5 || state.step === 6 || state.step === 7) {
          const editingAnswer = Object.values(state.editingQuestionAnswers).some(Boolean);
          if (!editingAnswer && !isUserEditingField()) render();
        }
      }
    )
    .on(
      "broadcast",
      { event: "guiding_question_answer_updated" },
      async payload => {
        if (!payload?.payload?.question_id) return;

        console.log("Cambio de respuesta recibido por Broadcast:", payload);
        await loadGuidingQuestions();

        if (state.step === 5 || state.step === 6 || state.step === 7) {
          const editingAnswer = Object.values(state.editingQuestionAnswers).some(Boolean);
          if (!editingAnswer && !isUserEditingField()) render();
        }
      }
    )
    .on(
      "broadcast",
      { event: "guiding_questions_changed" },
      async payload => {
        console.log("Cambio de preguntas recibido por Broadcast:", payload);
        await loadGuidingQuestions();

        if (state.step === 5 || state.step === 6 || state.step === 7) {
          const editingAnswer = Object.values(state.editingQuestionAnswers).some(Boolean);
          if (!editingAnswer && !isUserEditingField()) render();
        }
      }
    )
    .subscribe(status => {
      console.log("Realtime preguntas:", status);
    });
}


