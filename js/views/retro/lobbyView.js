import { state } from "../../core/state.js";
import { escapeHtml } from "../../utils/formatters.js";

export function lobbyScreen(getParticipantName, isParticipantReady) {
  const visibleParticipants = state.participants
    .filter(participant => String(participant.nombre || "").trim())
    .map(participant => ({
      ...participant,
      isActive: state.participantPresenceReady
        ? state.activeParticipantSessions.has(participant.session_id)
        : true
    }));

  const readyCount = visibleParticipants.filter(participant => participant.listo).length;
  const totalCount = visibleParticipants.length;
  const currentName = getParticipantName();
  const currentReady = isParticipantReady();

  const sortedParticipants = [...visibleParticipants].sort((a, b) => {
    const aIsFacilitator = a.session_id === state.facilitatorSessionId;
    const bIsFacilitator = b.session_id === state.facilitatorSessionId;
    if (aIsFacilitator && !bIsFacilitator) return -1;
    if (!aIsFacilitator && bIsFacilitator) return 1;
    return (a.nombre || "").localeCompare(b.nombre || "", "es", { sensitivity: "base" });
  });

  return `
    <section>
      <h2>Preparémonos para la retro.</h2>
      <p class="lead">
        Ingresá tu nombre y apellido y marcate como listo.
        El facilitador va a iniciar la retro cuando considere que es momento de empezar.
      </p>
      <div class="card" style="margin-top:1.875rem;">
        <div class="eyebrow" style="margin-bottom:0.625rem;">Tu identificación</div>
        <input id="participantName" type="text" value="${escapeHtml(currentName)}" placeholder="Nombre y apellido" autocomplete="name" style="width:100%;" ${currentReady ? "disabled" : ""}>
        ${currentReady ? `
          <button id="editParticipantBtn" class="participant-name-edit-btn" type="button">Cambiar nombre</button>
        ` : `
          <button id="readyBtn" class="primary participant-ready-btn" type="button">Listo para empezar</button>
        `}
      </div>
      <div class="card" style="margin-top:1.25rem;">
        <div class="eyebrow" style="margin-bottom:0.875rem;">Participantes</div>
        <div style="display:grid;gap:0.625rem;">
          ${visibleParticipants.length === 0
            ? `<p style="margin:0;opacity:.65;">Todavía no hay participantes.</p>`
            : sortedParticipants.map(participant => {
                const isFacilitator = participant.session_id === state.facilitatorSessionId;
                return `
                  <div class="participant-row ${participant.isActive ? "is-online" : "is-offline"} ${state.realtimeFeedback?.type === "participant" && state.realtimeFeedback.id === participant.session_id ? "realtime-participant" : ""}">
                    <div class="participant-identity">
                      <span class="participant-presence-dot" aria-hidden="true"></span>
                      ${isFacilitator ? `<span class="participant-facilitator-icon" title="Facilitador" aria-label="Facilitador">👑</span>` : ""}
                      <div class="participant-copy">
                        <div class="participant-name" style="font-weight:${isFacilitator ? "700" : "500"};">${escapeHtml(String(participant.nombre || "").trim())}</div>
                        <div class="participant-connection">${participant.isActive ? "Conectado" : "Desconectado"}${isFacilitator ? " · Facilitador" : ""}</div>
                      </div>
                    </div>
                    <span class="badge participant-ready-status ${participant.listo ? "is-ready" : "is-pending"}">
                      ${participant.listo ? "✓ Listo" : "○ Pendiente"}
                    </span>
                  </div>
                `;
              }).join("")}
        </div>
        <div class="participant-summary">
          <span><strong>${readyCount}</strong> de ${totalCount} listos</span>
        </div>
      </div>
      ${state.isFacilitator ? `
        <div class="card" style="margin-top:1.25rem;border-color:rgba(84,255,209,.25);">
          <p style="margin:0;opacity:.75;">Podés iniciar la retro aunque todavía no estén todos listos.</p>
        </div>
      ` : ""}
    </section>
  `;
}
