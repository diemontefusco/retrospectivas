export function bindSummaryBindings(ctx) {
  const {
    state,
    createActivityCard,
    updateActivityCard,
    deleteActivityCard,
    createSummaryCard,
    updateSummaryCard,
    deleteSummaryCard,
    createTopic,
    renameTopic,
    deleteTopic,
    createGuidingQuestion,
    updateGuidingQuestion,
    deleteGuidingQuestion,
    saveGuidingQuestionAnswer,
    createSummaryAction,
    updateAction,
    deleteAction,
    normalizeTopicText,
    getDynamicTopics,
    getTopVotedTopic,
    questionExists,
    broadcastTopicCreated,
    broadcastTopicDeleted,
    render,
    loadCards,
    loadTopics,
    loadGuidingQuestions,
    loadActions,
    loadVotes
  } = ctx;

    // CIERRE — EDICIÓN DEL RESUMEN
    // ===================================================
  
    const summaryAddTopic = document.querySelector(".summary-add-topic");
    if (summaryAddTopic) {
      summaryAddTopic.onclick = async () => {
        if (!state.isFacilitator) return;
        const label = prompt("Nombre del nuevo tema en común:");
        const clean = String(label || "").trim();
        if (!clean) return;
        const { data, error } = await createTopic({
          retroId: state.retroId,
          sessionId: state.participantSessionId,
          label: clean
        });
        if (error) return alert("No se pudo agregar el tema.\n\n" + error.message);
        if (!data?.success) return alert(data?.message || "No se pudo agregar el tema.");
        await loadTopics();
  
        const createdTopic = state.topics.find(
          topic => topic.topic_key === (data.topic_key || data.topicKey)
        ) || state.topics.find(
          topic => topic.label === clean
        );
  
        if (createdTopic) {
          await broadcastTopicCreated(createdTopic);
        }
  
        render();
      };
    }
  
    document.querySelectorAll(".summary-edit-topic").forEach(button => {
      button.onclick = async () => {
        const topic = getDynamicTopics().find(item => item.key === button.dataset.topicKey);
        if (!topic || !state.isFacilitator) return;
        const value = prompt("Modificar tema en común:", topic.label);
        const clean = String(value || "").trim();
        if (!clean || clean === topic.label) return;
        const { data, error } = await renameTopic({
          retroId: state.retroId, sessionId: state.participantSessionId,
          topicKey: topic.key, label: clean, parameterName: "p_new_label"
        });
        if (error || !data?.success) return alert("No se pudo modificar el tema.\n\n" + (error?.message || data?.message || "Error"));
        await loadTopics(); render();
      };
    });
  
    document.querySelectorAll(".summary-delete-topic").forEach(button => {
      button.onclick = async () => {
        const topic = getDynamicTopics().find(item => item.key === button.dataset.topicKey);
        if (!topic || !state.isFacilitator) return;
        if (!confirm(`¿Eliminar el tema en común "${topic.label}"?\n\nLas tarjetas quedarán sin agrupar.`)) return;
        const { data, error } = await deleteTopic({
          retroId: state.retroId, sessionId: state.participantSessionId, topicKey: topic.key
        });
        if (error || !data?.success) return alert("No se pudo eliminar el tema.\n\n" + (error?.message || data?.message || "Error"));
        await broadcastTopicDeleted(topic.key);
        await loadTopics(); await loadCards(); await loadVotes(); render();
      };
    });
  
    const summaryAddCard = document.querySelector(".summary-add-card");
    if (summaryAddCard) {
      summaryAddCard.onclick = async () => {
        if (!state.isFacilitator) return;
        const text = prompt("Texto de la nueva tarjeta:");
        const clean = String(text || "").trim();
        if (!clean) return;
        const type = prompt("Tipo de tarjeta: ¿qué salió bien? / ¿qué nos dolió? / ideas / sugerencias", "¿qué nos dolió?") || "¿qué nos dolió?";
        const normalizedType = normalizeTopicText(type);
        const etapa = normalizedType.includes("sal") || normalizedType.includes("func") ? "green" : normalizedType.includes("idea") || normalizedType.includes("suger") || normalizedType.includes("aprend") ? "blue" : "red";
        const topTopic = getTopVotedTopic();
        const { data, error } = await createSummaryCard({
          retroId: state.retroId, sessionId: state.participantSessionId,
          contenido: clean, etapa, topicKey: topTopic?.key || null
        });
        if (error || !data?.success) return alert("No se pudo agregar la tarjeta.\n\n" + (error?.message || data?.message || "Error"));
        await loadCards(); render();
      };
    }
  
    document.querySelectorAll(".summary-edit-card").forEach(button => {
      button.onclick = async () => {
        if (!state.isFacilitator) return;
        const card = state.cards.find(item => item.id === button.dataset.cardId);
        if (!card) return;
        const value = prompt("Modificar tarjeta:", card.contenido);
        const clean = String(value || "").trim();
        if (!clean || clean === card.contenido) return;
        const { data, error } = await updateSummaryCard({
          retroId: state.retroId, sessionId: state.participantSessionId,
          cardId: card.id, contenido: clean
        });
        if (error || !data?.success) return alert("No se pudo modificar la tarjeta.\n\n" + (error?.message || data?.message || "Error"));
        await loadCards(); render();
      };
    });
  
    document.querySelectorAll(".summary-delete-card").forEach(button => {
      button.onclick = async () => {
        if (!state.isFacilitator) return;
        const card = state.cards.find(item => item.id === button.dataset.cardId);
        if (!card) return;
        if (!confirm(`¿Eliminar esta tarjeta?\n\n${card.contenido}`)) return;
        const { data, error } = await deleteSummaryCard({
          retroId: state.retroId, sessionId: state.participantSessionId, cardId: card.id
        });
        if (error || !data?.success) return alert("No se pudo eliminar la tarjeta.\n\n" + (error?.message || data?.message || "Error"));
        await loadCards(); render();
      };
    });
  
    const summaryAddQuestion = document.querySelector(".summary-add-question");
    if (summaryAddQuestion) summaryAddQuestion.onclick = async () => {
      if (!state.isFacilitator) return;
      const value = prompt("Nueva pregunta:");
      const clean = String(value || "").trim();
      if (!clean) return;
      if (questionExists(clean)) return alert("Esa pregunta ya fue agregada.");
      const topTopic = getTopVotedTopic();
      const { data, error } = await createGuidingQuestion({
        retroId: state.retroId, sessionId: state.participantSessionId,
        topicKey: topTopic?.key || null, pregunta: clean, origen: "manual"
      });
      if (error || !data?.success) return alert("No se pudo agregar la pregunta.\n\n" + (error?.message || data?.message || "Error"));
      await loadGuidingQuestions(); render();
    };
  
    document.querySelectorAll(".summary-edit-question").forEach(button => {
      button.onclick = async () => {
        const q = state.guidingQuestions.find(item => item.id === button.dataset.questionId);
        if (!q || !state.isFacilitator) return;
        const value = prompt("Modificar pregunta:", q.text);
        const clean = String(value || "").trim();
        if (!clean || clean === q.text) return;
        const { data, error } = await updateGuidingQuestion({
          retroId: state.retroId, sessionId: state.participantSessionId,
          questionId: q.id, pregunta: clean
        });
        if (error || !data?.success) return alert("No se pudo modificar la pregunta.\n\n" + (error?.message || data?.message || "Error"));
        const { error: answerResetError } = await saveGuidingQuestionAnswer({
          retroId: state.retroId, sessionId: state.participantSessionId,
          questionId: q.id, respuesta: ""
        });
        if (answerResetError) return alert("La pregunta se modificó, pero no se pudo reiniciar su respuesta.\n\n" + answerResetError.message);
        await loadGuidingQuestions(); render();
      };
    });
  
    document.querySelectorAll(".summary-delete-question").forEach(button => {
      button.onclick = async () => {
        const q = state.guidingQuestions.find(item => item.id === button.dataset.questionId);
        if (!q || !state.isFacilitator) return;
        if (!confirm(`¿Eliminar esta pregunta?\n\n${q.text}`)) return;
        const { data, error } = await deleteGuidingQuestion({
          retroId: state.retroId, sessionId: state.participantSessionId, questionId: q.id
        });
        if (error || !data?.success) return alert("No se pudo eliminar la pregunta.\n\n" + (error?.message || data?.message || "Error"));
        if (state.guidingQuestionsRealtimeChannel) {
          await state.guidingQuestionsRealtimeChannel.send({
            type: "broadcast",
            event: "guiding_questions_changed",
            payload: {
              action: "delete",
              question_id: q.id
            }
          });
        }
        await loadGuidingQuestions(); render();
      };
    });
  
    const summaryAddAction = document.querySelector(".summary-add-action");
    if (summaryAddAction) summaryAddAction.onclick = () => {
      const text = prompt("¿Qué vamos a hacer?");
      const clean = String(text || "").trim();
      if (!clean) return;
      const owner = prompt("Responsable:", "Por definir") || "Por definir";
      const date = prompt("Fecha (AAAA-MM-DD, opcional):", "") || null;
      (async () => {
        const { data, error } = await createSummaryAction({
          retroId: state.retroId, sessionId: state.participantSessionId,
          descripcion: clean, responsable: owner.trim() || "Por definir", fecha: date || null
        });
        if (error || !data?.success) return alert("No se pudo agregar la acción.\n\n" + (error?.message || data?.message || "Error"));
        await loadActions(); render();
      })();
    };
  
    document.querySelectorAll(".summary-edit-action").forEach(button => {
      button.onclick = async () => {
        const action = state.actions.find(item => item.id === button.dataset.actionId);
        if (!action || !state.isFacilitator) return;
        const text = prompt("Modificar acción:", action.text);
        const clean = String(text || "").trim();
        if (!clean) return;
        const owner = prompt("Responsable:", action.owner || "Por definir");
        const date = prompt("Fecha (AAAA-MM-DD, opcional):", action.date === "Por definir" ? "" : action.date) || null;
        const { data, error } = await updateAction({
          retroId: state.retroId, sessionId: state.participantSessionId,
          actionId: action.id, descripcion: clean, responsable: String(owner || "Por definir").trim() || "Por definir", fecha: date || null
        });
        if (error || !data?.success) return alert("No se pudo modificar la acción.\n\n" + (error?.message || data?.message || "Error"));
        await loadActions(); render();
      };
    });
  
    document.querySelectorAll(".summary-delete-action").forEach(button => {
      button.onclick = async () => {
        const action = state.actions.find(item => item.id === button.dataset.actionId);
        if (!action || !state.isFacilitator) return;
        if (!confirm(`¿Eliminar esta acción?\n\n${action.text}`)) return;
        const { data, error } = await deleteAction({
          retroId: state.retroId, sessionId: state.participantSessionId, actionId: action.id
        });
        if (error || !data?.success) return alert("No se pudo eliminar la acción.\n\n" + (error?.message || data?.message || "Error"));
  
        // Supabase/Postgres DELETE no está llegando de forma consistente a
        // postgres_changes en este proyecto. Broadcast garantiza que el resto
        // de participantes reciba la eliminación en tiempo real.
        if (state.actionRealtimeChannel) {
          const { error: broadcastError } = await state.actionRealtimeChannel.send({
            type: "broadcast",
            event: "action_deleted",
            payload: { actionId: action.id }
          });
  
          if (broadcastError) {
            console.warn("No se pudo notificar la eliminación en tiempo real:", broadcastError);
          }
        }
  
        await loadActions();
        render();
      };
    });
  
  
  

    document.querySelectorAll(".postmortem-summary-edit-card").forEach(button => {
      button.onclick = async () => {
        if (!state.isFacilitator) return;
        const card = state.cards.find(item => item.id === button.dataset.cardId);
        if (!card) return;
        const value = prompt("Modificar tarjeta:", card.contenido);
        const clean = String(value || "").trim();
        if (!clean || clean === card.contenido) return;
        const { data, error } = await updateActivityCard({
          retroId: state.retroId, sessionId: state.participantSessionId,
          cardId: card.id, contenido: clean, etapa: card.etapa
        });
        if (error || !data?.success) return alert("No se pudo modificar la tarjeta.\n\n" + (error?.message || data?.message || "Error"));
        await loadCards(); render();
      };
    });

    document.querySelectorAll(".postmortem-summary-delete-card").forEach(button => {
      button.onclick = async () => {
        if (!state.isFacilitator) return;
        const card = state.cards.find(item => item.id === button.dataset.cardId);
        if (!card) return;
        if (!confirm(`¿Eliminar esta tarjeta?\n\n${card.contenido}`)) return;
        const { data, error } = await deleteActivityCard({
          retroId: state.retroId, sessionId: state.participantSessionId, cardId: card.id
        });
        if (error || !data?.success) return alert("No se pudo eliminar la tarjeta.\n\n" + (error?.message || data?.message || "Error"));
        await loadCards(); render();
      };
    });

    // ===================================================
}
