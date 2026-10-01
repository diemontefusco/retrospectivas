export function bindFacilitatorBindings(ctx) {
  const {
    openFacilitatorConfirmation,
    closeFacilitatorConfirmation,
    confirmClaimFacilitator,
    resetRetro,
    releaseFacilitator
  } = ctx;

    // FACILITADOR - TOMAR CONTROL
    // ===================================================
  
    const claimButton =
      document.querySelector(
        "#claimFacilitatorBtn"
      );
  
    if (claimButton) {
  
      claimButton.onclick = () => {
  
        openFacilitatorConfirmation();
  
      };
  
    }
  
  
    // ===================================================
    // FACILITADOR - CONFIRMAR
    // ===================================================
  
    const confirmClaimButton =
      document.querySelector(
        "#confirmClaimFacilitatorBtn"
      );
  
    if (confirmClaimButton) {
  
      confirmClaimButton.onclick = async () => {
  
        confirmClaimButton.disabled =
          true;
  
        confirmClaimButton.textContent =
          "Tomando control...";
  
        await confirmClaimFacilitator();
  
      };
  
    }
  
  
    // ===================================================
    // FACILITADOR - CANCELAR
    // ===================================================
  
    const cancelClaimButton =
      document.querySelector(
        "#cancelClaimFacilitatorBtn"
      );
  
    if (cancelClaimButton) {
  
      cancelClaimButton.onclick = () => {
  
        closeFacilitatorConfirmation();
  
      };
  
    }
  
  
    // ===================================================
    // FACILITADOR - REINICIAR SALA
    // ===================================================
  
    const resetButton =
      document.querySelector(
        "#resetRetroBtn"
      );
  
    if (resetButton) {
  
      resetButton.onclick = async () => {
  
        resetButton.disabled = true;
        resetButton.textContent = "Reiniciando...";
  
        await resetRetro();
  
        if (document.body.contains(resetButton)) {
          resetButton.disabled = false;
          resetButton.textContent = "Reiniciar sala";
        }
      };
  
    }
  
  
    // ===================================================
    // FACILITADOR - LIBERAR
    // ===================================================
  
    const releaseButton =
      document.querySelector(
        "#releaseFacilitatorBtn"
      );
  
    if (releaseButton) {
  
      releaseButton.onclick = async () => {
  
        releaseButton.disabled =
          true;
  
        await releaseFacilitator();
  
      };
  
    }
  
  
    // ===================================================
}
