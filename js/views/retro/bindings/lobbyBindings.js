export function bindLobbyBindings(ctx) {
  const {
    state,
    setParticipantProfile,
    render
  } = ctx;

    // LOBBY - PERFIL
    // ===================================================
  
    const readyBtn =
      document.querySelector("#readyBtn");
  
    if (readyBtn) {
      readyBtn.onclick = async () => {
        const input = document.querySelector("#participantName");
        const name = input ? input.value.trim() : "";
  
        if (!name) {
          alert("Ingresá tu nombre y apellido.");
          if (input) input.focus();
          return;
        }
  
        readyBtn.disabled = true;
        readyBtn.textContent = "Guardando...";
  
        const saved = await setParticipantProfile(name, true);
  
        if (!saved && document.body.contains(readyBtn)) {
          readyBtn.disabled = false;
          readyBtn.textContent = "Listo para empezar";
        }
      };
    }
  
    const editParticipantBtn =
      document.querySelector("#editParticipantBtn");
  
    if (editParticipantBtn) {
      editParticipantBtn.onclick = async () => {
        const input = document.querySelector("#participantName");
        if (!input) return;
  
        input.disabled = false;
        input.focus();
        input.select();
  
        const current = state.participant || {};
        state.participant = { ...current, listo: false };
        await setParticipantProfile(input.value, false);
      };
    }
  
  
    // ===================================================
    // CHECK-IN
    // ===================================================
  
    document
      .querySelectorAll("[data-energy]")
      .forEach(button => {
  
        button.onclick = () => {
  
          state.energy =
            Number(button.dataset.energy);
  
          render();
  
        };
  
      });
  
  
    // ===================================================
}
