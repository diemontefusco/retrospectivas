export function bindActivityBindings(ctx) {
  const {
    state,
    createActivityCard,
    updateActivityCard,
    deleteActivityCard,
    render
  } = ctx;

    // ACTIVIDAD - AGREGAR TARJETA
    // ===================================================
  
    const addCard =
      document.querySelector("#addCard");
  
  
    if (addCard) {
  
      addCard.onclick = async () => {
  
        const text =
          document
            .querySelector("#cardText")
            .value
            .trim();
  
        const type =
          document
            .querySelector("#cardType")
            .value;
  
  
        if (!text) {
  
          alert(
            "Escribí algo antes de agregar la tarjeta."
          );
  
          return;
        }
  
  
        addCard.disabled = true;
  
  
        const { data, error } = await createActivityCard({
          contenido: text,
          etapa: type,
          retroId: state.retroId
        });
  
  
        if (error) {
  
          console.error(
            "Error guardando tarjeta:",
            error
          );
  
          alert(
            "No se pudo guardar la tarjeta.\n\n" +
            error.message
          );
  
          addCard.disabled = false;
  
          return;
        }
  
  
        console.log(
          "Tarjeta guardada:",
          data
        );
  
  
        const exists =
          state.cards.some(
            card =>
              card.id === data.id
          );
  
        if (!exists) {
  
          state.cards.push(
            data
          );
  
        }
  
  
        render();
  
      };
  
    }
  
  
    // ===================================================
    // ACTIVIDAD - EDITAR / ELIMINAR / DRAG & DROP
    // ===================================================
  
    document
      .querySelectorAll(".activity-edit-card")
      .forEach(button => {
        button.onclick = async event => {
          event.preventDefault();
          event.stopPropagation();
  
          const cardId = button.dataset.cardId;
          const card = state.cards.find(item => item.id === cardId);
          if (!card) return;
  
          const updatedText = prompt("Modificar tarjeta:", card.contenido);
          if (updatedText === null) return;
  
          const cleanText = updatedText.trim();
          if (!cleanText) {
            alert("La tarjeta no puede quedar vacía.");
            return;
          }
  
          try {
            const { data, error } = await updateActivityCard({
              retroId: state.retroId,
              sessionId: state.participantSessionId,
              cardId,
              contenido: cleanText,
              etapa: card.etapa
            });
  
            if (error) throw error;
            if (!data?.success) {
              throw new Error(data?.message || "No se pudo modificar la tarjeta.");
            }
  
            const index = state.cards.findIndex(item => item.id === cardId);
            if (index !== -1) {
              state.cards[index] = {
                ...state.cards[index],
                contenido: cleanText
              };
            }
  
            render();
          } catch (error) {
            console.error("Error modificando tarjeta:", error);
            alert("No se pudo modificar la tarjeta.\n\n" + error.message);
          }
        };
      });
  
    document
      .querySelectorAll(".activity-delete-card")
      .forEach(button => {
        button.onclick = async event => {
          event.preventDefault();
          event.stopPropagation();
  
          const cardId = button.dataset.cardId;
          const card = state.cards.find(item => item.id === cardId);
          if (!card) return;
  
          const confirmed = confirm(
            `¿Eliminar esta tarjeta?\n\n"${card.contenido}"`
          );
          if (!confirmed) return;
  
          try {
            const { data, error } = await deleteActivityCard({
              retroId: state.retroId,
              sessionId: state.participantSessionId,
              cardId
            });
  
            if (error) throw error;
            if (!data?.success) {
              throw new Error(data?.message || "No se pudo eliminar la tarjeta.");
            }
  
            state.cards = state.cards.filter(item => item.id !== cardId);
            render();
          } catch (error) {
            console.error("Error eliminando tarjeta:", error);
            alert("No se pudo eliminar la tarjeta.\n\n" + error.message);
          }
        };
      });
  
    document
      .querySelectorAll(".activity-card")
      .forEach(cardElement => {
        cardElement.addEventListener("dragstart", event => {
          const cardId = cardElement.dataset.cardId;
          event.dataTransfer.effectAllowed = "move";
          event.dataTransfer.setData("text/plain", cardId);
          cardElement.style.opacity = "0.45";
        });
  
        cardElement.addEventListener("dragend", () => {
          cardElement.style.opacity = "1";
          document
            .querySelectorAll(".activity-drop-zone")
            .forEach(zone => {
              zone.classList.remove("activity-drag-over");
              zone.style.background = "";
              zone.style.outline = "";
            });
        });
      });
  
    document
      .querySelectorAll(".activity-drop-zone")
      .forEach(zone => {
        zone.addEventListener("dragover", event => {
          event.preventDefault();
          event.dataTransfer.dropEffect = "move";
          zone.classList.add("activity-drag-over");
          zone.style.background = "rgba(255,255,255,.04)";
          zone.style.outline = "0.125rem dashed rgba(255,255,255,.22)";
        });
  
        zone.addEventListener("dragleave", event => {
          if (!zone.contains(event.relatedTarget)) {
            zone.classList.remove("activity-drag-over");
            zone.style.background = "";
            zone.style.outline = "";
          }
        });
  
        zone.addEventListener("drop", async event => {
          event.preventDefault();
          zone.classList.remove("activity-drag-over");
          zone.style.background = "";
          zone.style.outline = "";
  
          const cardId = event.dataTransfer.getData("text/plain");
          const newEtapa = zone.dataset.etapa;
          const card = state.cards.find(item => item.id === cardId);
  
          if (!card || !newEtapa || card.etapa === newEtapa) return;
  
          try {
            const { data, error } = await updateActivityCard({
              retroId: state.retroId,
              sessionId: state.participantSessionId,
              cardId,
              contenido: card.contenido,
              etapa: newEtapa
            });
  
            if (error) throw error;
            if (!data?.success) {
              throw new Error(data?.message || "No se pudo mover la tarjeta.");
            }
  
            const index = state.cards.findIndex(item => item.id === cardId);
            if (index !== -1) {
              state.cards[index] = {
                ...state.cards[index],
                etapa: newEtapa
              };
            }
  
            render();
          } catch (error) {
            console.error("Error moviendo tarjeta:", error);
            alert("No se pudo mover la tarjeta.\n\n" + error.message);
          }
        });
      });
  
    // ===================================================
}
