import { state } from "../../core/state.js";
import { escapeHtml } from "../../utils/formatters.js";

export function facilitatorControls(getParticipantName) {
  let content = "";

  if (state.isFacilitator) {
    content = `
      <div style="margin-bottom:1.75rem;display:flex;align-items:center;justify-content:space-between;gap:1rem;flex-wrap:wrap;padding:0.75rem 1rem;border:0.0625rem solid rgba(84,255,209,.25);border-radius:0.875rem;background:rgba(84,255,209,.05);">
        <div>
          <div style="font-size:0.8125rem;opacity:.8;margin-bottom:0.25rem;">Facilitador: <strong>${escapeHtml(state.facilitatorName || getParticipantName())}</strong></div>
          <strong>Tenés el control de la retro.</strong>
        </div>
        <div style="display:flex;gap:0.5rem;align-items:center;flex-wrap:wrap;">
          <button id="resetRetroBtn" style="padding:0.5625rem 0.875rem;border-radius:0.625rem;cursor:pointer;background:transparent;border:0.0625rem solid rgba(255,120,120,.5);color:inherit;">Reiniciar sala</button>
          <button id="releaseFacilitatorBtn" style="padding:0.5625rem 0.875rem;border-radius:0.625rem;cursor:pointer;background:transparent;border:0.0625rem solid #54FFD1;color:#54FFD1;">Liberar control</button>
        </div>
      </div>
    `;
  } else if (state.facilitatorSessionId) {
    content = `
      <div style="margin-bottom:1.75rem;padding:0.75rem 1rem;border:0.0625rem solid rgba(255,255,255,.12);border-radius:0.875rem;background:rgba(255,255,255,.03);">
        <div style="font-size:0.8125rem;opacity:.8;margin-bottom:0.25rem;">Facilitador: <strong>${escapeHtml(state.facilitatorName || "Sin identificar")}</strong></div>
        <strong>Tiene el control de la retro.</strong>
      </div>
    `;
  } else {
    content = `
      <div style="margin-bottom:1.75rem;display:flex;align-items:center;justify-content:space-between;gap:1rem;flex-wrap:wrap;padding:0.75rem 1rem;border:0.0625rem solid rgba(255,255,255,.12);border-radius:0.875rem;background:rgba(255,255,255,.03);">
        <div>
          <div style="font-size:0.6875rem;letter-spacing:.08em;text-transform:uppercase;opacity:.6;margin-bottom:0.25rem;">CONTROL DE LA RETRO</div>
          <strong>Todavía no hay un facilitador</strong>
        </div>
        <button id="claimFacilitatorBtn" class="primary" style="padding:0.625rem 1rem;">Tomar control como facilitador</button>
      </div>
    `;
  }

  return content;
}

export function facilitatorModal() {
  return `
    <div id="facilitatorModal" style="display:none;position:fixed;inset:0;z-index:9999;align-items:center;justify-content:center;padding:1.5rem;background:rgba(0,0,0,.72);backdrop-filter:blur(0.375rem);">
      <div style="width:min(28.75rem, 100%);padding:1.75rem;border-radius:1.125rem;background:#111;border:0.0625rem solid rgba(255,255,255,.14);box-shadow:0 1.25rem 5rem rgba(0,0,0,.5);">
        <div style="font-size:0.6875rem;letter-spacing:.08em;text-transform:uppercase;opacity:.6;margin-bottom:0.625rem;">CONTROL DE LA RETRO</div>
        <h3 style="margin:0 0 0.75rem 0;">¿Tomar control como facilitador?</h3>
        <p style="margin:0;line-height:1.6;opacity:.78;">Vas a controlar el avance de la retro para todos los participantes.</p>
        <div style="display:flex;justify-content:flex-start;gap:0.625rem;margin-top:1.5rem;flex-wrap:wrap;">
          <button id="confirmClaimFacilitatorBtn" class="primary" style="padding:0.6875rem 1rem;">Sí, tomar el control</button>
          <button id="cancelClaimFacilitatorBtn" style="padding:0.6875rem 1rem;border-radius:0.625rem;cursor:pointer;background:transparent;border:0.0625rem solid rgba(255,255,255,.18);color:inherit;">Cancelar</button>
        </div>
      </div>
    </div>
  `;
}
