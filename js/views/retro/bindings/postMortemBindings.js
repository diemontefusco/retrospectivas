export function bindPostMortemBindings(ctx) {
  const { state, savePostMortemFieldValue, setPostMortemAutosaveStatus } = ctx;

  if (state.retroType !== "post_mortem" || !state.retroStarted || state.step !== 0) return;

  document.querySelectorAll("[data-postmortem-field]").forEach(input => {
    const fieldKey = input.dataset.postmortemField;

    const saveField = async () => {
      if (!state.editingPostMortemFields[fieldKey]) return false;

      const value = input.value.trim();

      if (!value) {
        setPostMortemAutosaveStatus(fieldKey, "empty");
        return false;
      }

      setPostMortemAutosaveStatus(fieldKey, "saving");

      try {
        const saved = await savePostMortemFieldValue(fieldKey, value);
        if (saved) {
          delete state.editingPostMortemFields[fieldKey];
          setPostMortemAutosaveStatus(fieldKey, "saved");
          return true;
        }

        setPostMortemAutosaveStatus(fieldKey, "error");
        return false;
      } catch (error) {
        console.error("Error guardando campo de ficha técnica:", error);
        setPostMortemAutosaveStatus(fieldKey, "error");
        return false;
      }
    };

    const scheduleSave = () => {
      clearTimeout(state.postMortemAutosaveTimers[fieldKey]);
      const value = String(input.value || "").trim();

      setPostMortemAutosaveStatus(fieldKey, value ? "saving" : "empty");

      if (!value) return;

      state.postMortemAutosaveTimers[fieldKey] = setTimeout(() => {
        void saveField();
      }, 900);
    };

    input.addEventListener("click", () => {
      if (!input.readOnly) return;
      state.editingPostMortemFields[fieldKey] = true;
      input.readOnly = false;
      setPostMortemAutosaveStatus(fieldKey, "editing");
      input.focus();
      input.setSelectionRange(input.value.length, input.value.length);
    });

    input.addEventListener("input", () => {
      state.editingPostMortemFields[fieldKey] = true;
      scheduleSave();
    });

    input.addEventListener("blur", async () => {
      if (!state.editingPostMortemFields[fieldKey]) return;

      clearTimeout(state.postMortemAutosaveTimers[fieldKey]);
      const value = input.value.trim();

      if (!value) {
        delete state.editingPostMortemFields[fieldKey];
        input.readOnly = true;
        setPostMortemAutosaveStatus(fieldKey, "empty");
        return;
      }

      // El blur guarda inmediatamente, igual que la respuesta de Preguntas.
      // Si el usuario se queda quieto, el debounce de 900 ms ya habrá guardado.
      const saved = await saveField();
      input.readOnly = true;

      if (saved) {
        // El estado "Guardado!" es transitorio y se desvanece desde app.js.
        setPostMortemAutosaveStatus(fieldKey, "saved");
      }
    });
  });
}
