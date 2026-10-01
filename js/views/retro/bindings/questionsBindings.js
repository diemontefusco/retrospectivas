export function bindQuestionsBindings(ctx) {
  const {
    state,
    createGuidingQuestion,
    updateGuidingQuestion,
    deleteGuidingQuestion,
    clearAllGuidingQuestions,
    saveGuidingQuestionAnswer,
    normalizeTopicText,
    getGroupedCards,
    getTopVotedTopic,
    getConversationContext,
    buildGeneralGuidingQuestionSuggestions,
    buildGuidingQuestionSuggestions,
    questionExists,
    setAnswerDraft,
    clearAnswerDraft,
    setAnswerAutosaveStatus,
    autosaveGuidingQuestionAnswer,
    scheduleGuidingQuestionAutosave,
    render,
    loadGuidingQuestions
  } = ctx;

    // PREGUNTAS
    // ===================================================
  
    const generateQuestionsBtn =
      document.querySelector("#generateQuestionsBtn");
  
    if (generateQuestionsBtn) {
      generateQuestionsBtn.onclick = async () => {
        if (!state.isFacilitator) {
          alert("Solo el facilitador puede generar las preguntas.");
          return;
        }
  
        const context = getConversationContext();
  
        if (context.scenario === "voting-pending") {
          alert("Todavía no se definió el tema a profundizar. Primero completen la votación.");
          return;
        }
  
        const suggestions = context.scenario === "no-topics"
          ? buildGeneralGuidingQuestionSuggestions(context.cards)
              .map(text => ({ text, topicKey: null }))
          : context.topics.flatMap(topic =>
              buildGuidingQuestionSuggestions(topic, getGroupedCards(topic.key))
                .map(text => ({ text, topicKey: topic.key }))
            );
        const automaticQuestions = state.guidingQuestions.filter(
          question => question.origin === "automatica"
        );
        const automaticSlots = Math.max(0, 3 - automaticQuestions.length);
        const questionsToGenerate = suggestions
          .filter(item => !questionExists(item.text))
          .slice(0, automaticSlots);
  
        if (!questionsToGenerate.length) {
          alert(
            automaticQuestions.length >= 3
              ? "Ya se generaron las 3 preguntas automáticas permitidas.\n\nPodés modificarlas o agregar preguntas manualmente."
              : "Las preguntas sugeridas ya estaban cargadas."
          );
          return;
        }
  
        generateQuestionsBtn.disabled = true;
        generateQuestionsBtn.textContent = "Generando…";
  
        try {
          let added = 0;
  
          for (const question of questionsToGenerate) {
            const { data, error } = await createGuidingQuestion({
              retroId: state.retroId,
              sessionId: state.participantSessionId,
              topicKey: question.topicKey,
              pregunta: question.text,
              origen: "automatica"
            });
  
            if (error) throw error;
            if (!data?.success) {
              throw new Error(data?.message || "No se pudo crear la pregunta.");
            }
            added += 1;
          }
  
          await loadGuidingQuestions();
          render();
  
          alert(
            added
              ? `${added} pregunta${added === 1 ? "" : "s"} guía generada${added === 1 ? "" : "s"}.`
              : "Las preguntas sugeridas ya estaban cargadas."
          );
        } catch (error) {
          console.error("Error generando preguntas:", error);
          alert("No se pudieron generar las preguntas.\n\n" + error.message);
          generateQuestionsBtn.disabled = false;
          generateQuestionsBtn.textContent = "Generar preguntas";
        }
      };
    }
  
    const clearAllGuidingQuestionsBtn = document.querySelector("#clearAllGuidingQuestionsBtn");
  
    if (clearAllGuidingQuestionsBtn) {
      clearAllGuidingQuestionsBtn.onclick = async () => {
        if (!state.isFacilitator || !state.guidingQuestions.length) return;
        if (!confirm("¿Borrar todas?\n\nSe eliminarán las preguntas automáticas y manuales.")) return;
        clearAllGuidingQuestionsBtn.disabled = true; clearAllGuidingQuestionsBtn.textContent = "Borrando…";
        try {
          const { data, error } = await clearAllGuidingQuestions({
            retroId: state.retroId,
            sessionId: state.participantSessionId
          });
          if (error) throw error;
          if (!data?.success) throw new Error(data?.message || "No se pudieron borrar las preguntas.");
          if (state.guidingQuestionsRealtimeChannel) {
            await state.guidingQuestionsRealtimeChannel.send({
              type: "broadcast",
              event: "guiding_questions_changed",
              payload: {
                action: "clear"
              }
            });
          }
          await loadGuidingQuestions(); render();
        } catch (error) {
          console.error("Error borrando todas las preguntas:", error);
          alert("No se pudieron borrar las preguntas.\n\n" + error.message);
          clearAllGuidingQuestionsBtn.disabled = false; clearAllGuidingQuestionsBtn.textContent = "🗑️ Borrar todas";
        }
      };
    }
  
  
    const addGuidingQuestionBtn =
      document.querySelector("#addGuidingQuestionBtn");
  
    if (addGuidingQuestionBtn) {
      addGuidingQuestionBtn.onclick = async () => {
        const input = document.querySelector("#guidingQuestionText");
        const text = input ? input.value.trim() : "";
  
        if (!text) {
          alert("Escribí una pregunta.");
          if (input) input.focus();
          return;
        }
  
        if (questionExists(text)) {
          alert("Esa pregunta ya fue agregada.");
          return;
        }
  
        const topTopic = getTopVotedTopic();
  
        addGuidingQuestionBtn.disabled = true;
        addGuidingQuestionBtn.textContent = "Guardando…";
  
        try {
          const { data, error } = await createGuidingQuestion({
            retroId: state.retroId,
            sessionId: state.participantSessionId,
            topicKey: topTopic?.key || null,
            pregunta: text,
            origen: "manual"
          });
  
          if (error) throw error;
          if (!data?.success) {
            throw new Error(data?.message || "No se pudo guardar la pregunta.");
          }
  
          await loadGuidingQuestions();
          render();
        } catch (error) {
          console.error("Error agregando pregunta:", error);
          alert("No se pudo agregar la pregunta.\n\n" + error.message);
          addGuidingQuestionBtn.disabled = false;
          addGuidingQuestionBtn.textContent = "+ Agregar pregunta";
        }
      };
    }
  
    // ===================================================
    // RESPUESTAS: EDICIÓN DIRECTA Y GUARDADO AL SALIR
    // ===================================================
  
    document.querySelectorAll(".guiding-question-answer").forEach(input => {
      const questionId = input.dataset.questionId;

      const beginAnswerEditing = () => {
        if (!input.readOnly) return;

        state.editingQuestionAnswers[questionId] = true;
        input.readOnly = false;
        setAnswerAutosaveStatus(questionId, "editing");
      };

      // En iOS/Safari habilitamos la edición durante el gesto táctil.
      // Así el tap puede abrir el teclado aunque el textarea haya comenzado readonly.
      input.addEventListener("pointerdown", beginAnswerEditing);
      input.addEventListener("touchstart", beginAnswerEditing, { passive: true });

      input.addEventListener("click", () => {
        beginAnswerEditing();
        input.focus();
        try {
          input.setSelectionRange(input.value.length, input.value.length);
        } catch (_) {}
      });

      input.addEventListener("input", () => {
        state.editingQuestionAnswers[questionId] = true;
        setAnswerDraft(questionId, input.value);
        setAnswerAutosaveStatus(questionId, String(input.value || "").trim() ? "saving" : "empty");
        scheduleGuidingQuestionAutosave(questionId, input.value);
      });
  
      input.addEventListener("blur", async () => {
        if (!state.editingQuestionAnswers[questionId]) return;
  
        const answer = input.value.trim();
        if (!answer) {
          clearTimeout(state.answerAutosaveTimers[questionId]);
          setAnswerAutosaveStatus(questionId, "empty");
          return;
        }
  
        clearTimeout(state.answerAutosaveTimers[questionId]);
        const saved = await autosaveGuidingQuestionAnswer(questionId, answer);
  
        if (saved) {
          delete state.editingQuestionAnswers[questionId];
          setAnswerAutosaveStatus(questionId, "saved");
          render();
        }
      });
    });
  
    document
      .querySelectorAll(".edit-guiding-question")
      .forEach(button => {
        button.onclick = async () => {
          if (!state.isFacilitator) return;
  
          const questionId = button.dataset.questionId;
          const question = state.guidingQuestions.find(item => item.id === questionId);
          if (!question) return;
  
          const newText = prompt("Modificar pregunta:", question.text);
          const cleanText = String(newText || "").trim();
  
          if (!cleanText || cleanText === question.text) return;
  
          const duplicate = state.guidingQuestions.some(item =>
            item.id !== questionId && normalizeTopicText(item.text) === normalizeTopicText(cleanText)
          );
  
          if (duplicate) {
            alert("Esa pregunta ya fue agregada.");
            return;
          }
  
          try {
            const { data, error } = await updateGuidingQuestion({
              retroId: state.retroId,
              sessionId: state.participantSessionId,
              questionId,
              pregunta: cleanText
            });
  
            if (error) throw error;
            if (!data?.success) {
              throw new Error(data?.message || "No se pudo modificar la pregunta.");
            }
  
            const { error: answerResetError } = await saveGuidingQuestionAnswer({
              retroId: state.retroId,
              sessionId: state.participantSessionId,
              questionId,
              respuesta: ""
            });
            if (answerResetError) throw answerResetError;
            clearTimeout(state.answerAutosaveTimers[questionId]);
            clearAnswerDraft(questionId);
            delete state.editingQuestionAnswers[questionId];
            delete state.answerAutosaveStatus[questionId];
  
            await loadGuidingQuestions();
            render();
          } catch (error) {
            console.error("Error modificando pregunta:", error);
            alert("No se pudo modificar la pregunta.\n\n" + error.message);
          }
        };
      });
  
  
    document
      .querySelectorAll(".delete-guiding-question")
      .forEach(button => {
        button.onclick = async () => {
          if (!state.isFacilitator) return;
  
          const questionId = button.dataset.questionId;
          const question = state.guidingQuestions.find(item => item.id === questionId);
          if (!question) return;
  
          if (!confirm(`¿Eliminar esta pregunta?\n\n${question.text}`)) return;
  
          try {
            const { data, error } = await deleteGuidingQuestion({
              retroId: state.retroId,
              sessionId: state.participantSessionId,
              questionId
            });
  
            if (error) throw error;
            if (!data?.success) {
              throw new Error(data?.message || "No se pudo eliminar la pregunta.");
            }
  
            if (state.guidingQuestionsRealtimeChannel) {
              await state.guidingQuestionsRealtimeChannel.send({
                type: "broadcast",
                event: "guiding_questions_changed",
                payload: {
                  action: "delete",
                  question_id: questionId
                }
              });
            }
  
            await loadGuidingQuestions();
            render();
          } catch (error) {
            console.error("Error eliminando pregunta:", error);
            alert("No se pudo eliminar la pregunta.\n\n" + error.message);
          }
        };
      });
  
  
    // ===================================================
}
