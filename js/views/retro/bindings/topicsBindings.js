export function bindTopicsBindings(ctx) {
  const {
    state,
    setCardTopic,
    createTopic,
    renameTopic,
    deleteTopic,
    getDynamicTopics,
    broadcastTopicCreated,
    broadcastTopicDeleted,
    render,
    loadCards,
    loadTopics,
    moveTopic,
    dropTopic
  } = ctx;

    // AGRUPACIÓN
    // ===================================================
  
    const addTopicBtn = document.querySelector("#addTopicBtn");
  
    if (addTopicBtn) {
      addTopicBtn.onclick = async () => {
        const label = prompt("Nombre del nuevo tema en común:");
        const cleanLabel = String(label || "").trim();
  
        if (!cleanLabel) return;
  
        addTopicBtn.disabled = true;
  
        try {
          const { data, error } = await createTopic({
            retroId: state.retroId,
            sessionId: state.participantSessionId,
            label: cleanLabel
          });
  
          if (error) throw error;
          if (!data?.success) throw new Error(data?.message || "No se pudo crear el tema en común.");
  
          await loadTopics();
  
          const createdTopic = state.topics.find(
            topic => topic.topic_key === (data.topic_key || data.topicKey)
          ) || state.topics.find(
            topic => topic.label === cleanLabel
          );
  
          if (createdTopic) {
            await broadcastTopicCreated(createdTopic);
          }
  
          render();
        } catch (error) {
          console.error("Error creando tema en común:", error);
          alert("No se pudo crear el tema en común.\n\n" + error.message);
          addTopicBtn.disabled = false;
        }
      };
    }
  
  
    document.querySelectorAll("[data-topic-move]").forEach(button => {
      button.onclick = async () => {
        if (!state.isFacilitator) return;
        await moveTopic(button.dataset.topicKey, button.dataset.topicMove);
      };
    });
  
    let draggedTopicKey = null;
    document.querySelectorAll(".topic-sortable").forEach(topicEl => {
      topicEl.addEventListener("dragstart", event => {
        if (!state.isFacilitator) return;
        draggedTopicKey = topicEl.dataset.topicKey;
        topicEl.classList.add("topic-dragging");
        event.dataTransfer.effectAllowed = "move";
        event.dataTransfer.setData("text/plain", draggedTopicKey);
      });
  
      topicEl.addEventListener("dragend", () => {
        draggedTopicKey = null;
        topicEl.classList.remove("topic-dragging");
        document.querySelectorAll(".topic-drag-over").forEach(el => el.classList.remove("topic-drag-over"));
      });
  
      topicEl.addEventListener("dragover", event => {
        if (!state.isFacilitator || !draggedTopicKey) return;
        event.preventDefault();
        topicEl.classList.add("topic-drag-over");
        event.dataTransfer.dropEffect = "move";
      });
  
      topicEl.addEventListener("dragleave", () => {
        topicEl.classList.remove("topic-drag-over");
      });
  
      topicEl.addEventListener("drop", async event => {
        if (!state.isFacilitator) return;
        event.preventDefault();
        topicEl.classList.remove("topic-drag-over");
        const sourceKey = event.dataTransfer.getData("text/plain") || draggedTopicKey;
        draggedTopicKey = null;
        await dropTopic(topicEl.dataset.topicKey, sourceKey);
      });
    });
  
  
    document
      .querySelectorAll("[data-topic-action]")
      .forEach(button => {
        button.onclick = async () => {
          const action = button.dataset.topicAction;
          const topicKey = button.dataset.topicKey;
          const topic = getDynamicTopics().find(item => item.key === topicKey);
  
          if (!topic) return;
  
          if (action === "rename") {
            const newLabel = prompt("Nuevo nombre del tema en común:", topic.label);
            const cleanLabel = String(newLabel || "").trim();
  
            if (!cleanLabel || cleanLabel === topic.label) return;
  
            try {
              const { data, error } = await renameTopic({
                retroId: state.retroId,
                sessionId: state.participantSessionId,
                topicKey,
                label: cleanLabel
              });
  
              if (error) throw error;
              if (!data?.success) throw new Error(data?.message || "No se pudo renombrar el tema en común.");
  
              await loadTopics();
              render();
            } catch (error) {
              console.error("Error renombrando tema en común:", error);
              alert("No se pudo renombrar el tema en común.\n\n" + error.message);
            }
  
            return;
          }
  
          if (action === "delete") {
            const confirmed = confirm(
              `¿Eliminar el tema en común "${topic.label}"?\n\nLas tarjetas asignadas quedarán como \"Sin agrupar\".`
            );
  
            if (!confirmed) return;
  
            try {
              const { data, error } = await deleteTopic({
                retroId: state.retroId,
                sessionId: state.participantSessionId,
                topicKey
              });
  
              if (error) throw error;
              if (!data?.success) throw new Error(data?.message || "No se pudo eliminar el tema en común.");
  
              await broadcastTopicDeleted(topic.key);
              await loadTopics();
              await loadCards();
              render();
            } catch (error) {
              console.error("Error eliminando tema en común:", error);
              alert("No se pudo eliminar el tema en común.\n\n" + error.message);
            }
          }
        };
      });
  
  
    document
      .querySelectorAll(".card-topic-select")
      .forEach(select => {
  
        select.onchange = async () => {
  
          const cardId = select.dataset.cardId;
          const topicKey = select.value || null;
  
          select.disabled = true;
  
          try {
            const { data, error } = await setCardTopic({
              retroId: state.retroId,
              sessionId: state.participantSessionId,
              cardId,
              topicKey
            });
  
            if (error) throw error;
            if (!data?.success) throw new Error(data?.message || "No se pudo actualizar el agrupamiento.");
  
            const index = state.cards.findIndex(card => card.id === cardId);
            if (index !== -1) {
              state.cards[index] = {
                ...state.cards[index],
                topic_key: topicKey
              };
            }
  
            await loadTopics();
            render();
          } catch (error) {
            console.error("Error actualizando agrupación:", error);
            alert("No se pudo actualizar el agrupamiento.\n\n" + error.message);
            select.disabled = false;
          }
        };
      });
  
    // ===================================================
}
