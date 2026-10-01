import { state } from "../../core/state.js";
import { escapeHtml, todayLocalISO } from "../../utils/formatters.js";

const FIELDS = [
  { key: "ticket", label: "Ticket / Problem", placeholder: "Helix-XXX / Problem NOC ME" },
  { key: "mttr_final", label: "MTTR Final", placeholder: "HH:MM" },
  { key: "impacto", label: "Impacto", placeholder: "N° Clientes / Experiencia afectada" },
  { key: "contactacion", label: "Contactación", placeholder: "N° Llamadas al Call / Canales" },
  { key: "reincidente", label: "Reincidente", placeholder: "[S/N]" },
  { key: "tarea", label: "Tarea", placeholder: "[S/N]" },
  { key: "resumen_breve", label: "Resumen breve", placeholder: "Frase de alto nivel" }
];

export function postMortemTechnicalForm() {
  const data = state.postMortem || {};
  return `
    <section class="postmortem-form-screen">
      <div class="eyebrow">Post mortem</div>
      <div class="postmortem-rules card">
        <div style="font-weight:700;margin-bottom:.75rem">Reglas de Convivencia:</div>
        <p><em>Foco en procesos y flujos, no en personas.</em></p>
        <p><em>Cero Debugging: Causa raíz profunda se investiga afuera.</em></p>
        <p><em>Accionable sin Owner único y fecha, no existe.</em></p>
      </div>

      <div class="card postmortem-form-card">
        <div class="eyebrow">Ficha Técnica</div>
        <div class="postmortem-form-grid">
          ${FIELDS.map(field => `
            <div class="postmortem-field ${field.key === "resumen_breve" ? "postmortem-field-full" : ""}">
              <label class="badge" for="postmortem-${field.key}">${field.label} <span class="required-mark">*</span></label>
              <input id="postmortem-${field.key}" data-postmortem-field="${field.key}" type="text" value="${escapeHtml(data[field.key] || "")}" placeholder="${escapeHtml(field.placeholder)}" ${state.editingPostMortemFields[field.key] ? "" : "readonly"} required aria-required="true">
              <div class="postmortem-autosave-row">
                <span class="postmortem-autosave-status" data-postmortem-status="${field.key}" aria-live="polite">
                  ${state.postMortemAutosaveStatus[field.key] === "saving" ? "Guardando…" : state.postMortemAutosaveStatus[field.key] === "saved" ? "Guardado!" : state.postMortemAutosaveStatus[field.key] === "error" ? "No se pudo guardar. Se reintentará al editar." : ""}
                </span>
                ${state.editingPostMortemFields[field.key] ? `<span style="opacity:.65;font-size:.875rem;">Editando…</span>` : ""}
              </div>
              ${field.hint ? `<small>${escapeHtml(field.hint)}</small>` : ""}
            </div>
          `).join("")}
        </div>
      </div>
    </section>
  `;
}

export function postMortemActivityView() {
  const columns = [
    { key: "detection", label: "Detección", description: "Cómo identificamos el incidente o problema." },
    { key: "mitigation", label: "Mitigación", description: "Qué hicimos para reducir o detener el impacto." },
    { key: "customer_containment", label: "Contención al cliente", description: "Cómo protegimos y comunicamos al cliente." },
    { key: "prevention", label: "Prevención", description: "Qué cambios acordamos para evitar recurrencia." }
  ];

  return `
    <section>
      <div class="eyebrow">Actividad</div>
      <h2>Reconstruyamos el incidente de punta a punta.</h2>
      <p class="lead">Registrá los hechos en cada etapa. Las tarjetas se pueden mover, modificar y eliminar en tiempo real.</p>
      <div class="card" style="margin-top:1.875rem">
        <div class="action-form">
          <select id="cardType">
            ${columns.map(column => `<option value="${column.key}">${column.label}</option>`).join("")}
          </select>
          <textarea id="cardText" placeholder="Escribí tu tarjeta..."></textarea>
        </div>
        <div class="section-action-row"><button class="primary" id="addCard">Agregar tarjeta +</button></div>
      </div>
      <p class="badge" style="margin-top:1.125rem">Podés arrastrar una tarjeta para moverla de una columna a otra.</p>
      <div class="columns postmortem-columns" style="margin-top:1.25rem">
        ${columns.map(column => {
          const columnCards = state.cards.filter(card => card.etapa === column.key);
          return `
            <div class="column activity-column" data-etapa="${column.key}" style="min-height:11.25rem">
              <div class="column-title">
                <div>${column.label}<small>· ${columnCards.length}</small></div>
                <div style="font-size:0.8125rem;font-weight:400;line-height:1.4;opacity:.7;margin-top:0.375rem">${column.description}</div>
              </div>
              <div class="activity-drop-zone" data-etapa="${column.key}" style="min-height:7.5rem">
                ${columnCards.length ? columnCards.map(card => `
                  <div class="sticky activity-card ${state.realtimeFeedback?.type === "card" && state.realtimeFeedback.id === card.id ? "realtime-enter" : ""}" draggable="true" data-card-id="${escapeHtml(card.id)}" style="position:relative;cursor:grab;padding-right:4.75rem;" title="Arrastrá para mover la tarjeta">
                    <div>${escapeHtml(card.contenido)}</div>
                    <div style="position:absolute;right:0.5rem;top:0.5rem;display:flex;gap:0.3125rem;">
                      <button type="button" class="activity-edit-card" data-card-id="${escapeHtml(card.id)}" draggable="false" title="Modificar tarjeta" aria-label="Modificar tarjeta" style="width:1.875rem;height:1.875rem;border-radius:0.5rem;border:0.0625rem solid rgba(0,0,0,.15);background:rgba(255,255,255,.7);cursor:pointer;">✏️</button>
                      <button type="button" class="activity-delete-card" data-card-id="${escapeHtml(card.id)}" draggable="false" title="Eliminar tarjeta" aria-label="Eliminar tarjeta" style="width:1.875rem;height:1.875rem;border-radius:0.5rem;border:0.0625rem solid rgba(0,0,0,.15);background:rgba(255,255,255,.7);cursor:pointer;">🗑️</button>
                    </div>
                  </div>
                `).join("") : `<div class="badge activity-empty" style="padding:1.25rem 0.5rem;text-align:center">Arrastrá tarjetas acá</div>`}
              </div>
            </div>
          `;
        }).join("")}
      </div>
    </section>
  `;
}

export function postMortemActionsView() {
  return `
    <section>
      <div class="eyebrow">Acciones</div>
      <h2>Convirtamos el aprendizaje en acciones concretas.</h2>
      <p class="lead">Estas son las tarjetas que construimos durante el análisis. Usémoslas como punto de partida para definir acciones con responsable y fecha.</p>

      <div class="card" style="margin-top:1.5rem">
        <div class="badge">TARJETAS DE LA RETRO</div>
        ${state.cards.length ? `
          <div style="display:grid;gap:0.625rem;margin-top:1rem">
            ${state.cards.map(card => `
              <div class="topic">
                <div class="badge">${escapeHtml(postMortemColumnLabel(card.etapa))}</div>
                <div style="margin-top:0.375rem">${escapeHtml(card.contenido)}</div>
              </div>
            `).join("")}
          </div>
        ` : `<div class="badge" style="margin-top:1rem">No se registraron tarjetas.</div>`}
      </div>

      <div class="action-form">
        <input id="actionText" placeholder="¿Qué vamos a hacer?">
        <input id="actionOwner" placeholder="Responsable">
        <div class="date-input-wrap">
        <input id="actionDate" class="action-date-input" type="date" value="${todayLocalISO()}">
      </div>
        <textarea id="actionWhy" placeholder="¿Cómo sabremos que funcionó?"></textarea>
      </div>
      <div class="section-action-row"><button class="primary" id="addAction">Agregar acción +</button></div>

      <div class="actions">
        ${state.actions.map(action => `
          <div class="action ${state.realtimeFeedback?.type === "action" && state.realtimeFeedback.id === action.id ? "realtime-enter" : ""}">
            <div>
              <strong>${escapeHtml(action.text)}</strong>
              <div class="badge">${escapeHtml(action.owner)} · ${escapeHtml(action.date)}</div>
              ${action.successCriteria ? `<div style="margin-top:0.5rem;opacity:.78"><strong>¿Cómo sabremos que funcionó?</strong><br>${escapeHtml(action.successCriteria)}</div>` : ""}
            </div>
          </div>
        `).join("")}
      </div>
    </section>
  `;
}

export function postMortemSummaryView() {
  const data = state.postMortem || {};
  const fields = [
    ["Ticket / Problem", data.ticket],
    ["MTTR Final", data.mttr_final],
    ["Impacto", data.impacto],
    ["Contactación", data.contactacion],
    ["Reincidente", data.reincidente],
    ["Tarea", data.tarea],
    ["Resumen breve", data.resumen_breve]
  ];

  return `
    <section>
      <div class="eyebrow">Cierre</div>
      <h2>Resumen del post mortem</h2>
      <p class="lead">El equipo puede revisar y ajustar las tarjetas y acciones antes de cerrar el encuentro.</p>

      <div class="card" style="margin-top:1.5rem">
        <div class="eyebrow">Ficha Técnica</div>
        <div class="postmortem-summary-grid">
          ${fields.map(([label, value]) => `<div><div class="badge">${escapeHtml(label)}</div><div style="margin-top:0.375rem">${escapeHtml(value || "Sin completar")}</div></div>`).join("")}
        </div>
      </div>

      <div class="card" style="margin-top:1.125rem">
        <div class="eyebrow">Tarjetas del incidente</div>
        <div class="postmortem-summary-cards">
          ${state.cards.length ? state.cards.map(card => `
            <div class="topic" style="display:flex;align-items:flex-start;justify-content:space-between;gap:0.75rem">
              <div>
                <div class="badge">${escapeHtml(postMortemColumnLabel(card.etapa))}</div>
                <div style="margin-top:0.375rem">${escapeHtml(card.contenido)}</div>
              </div>
              ${state.isFacilitator ? `<div style="display:flex;gap:0.375rem;flex-shrink:0"><button type="button" class="postmortem-summary-edit-card" data-card-id="${escapeHtml(card.id)}" title="Modificar tarjeta">✏️</button><button type="button" class="postmortem-summary-delete-card" data-card-id="${escapeHtml(card.id)}" title="Eliminar tarjeta">🗑️</button></div>` : ""}
            </div>
          `).join("") : `<div class="badge">No hay tarjetas registradas.</div>`}
        </div>
      </div>

      <div class="card" style="margin-top:1.125rem">
        <div style="display:flex;align-items:center;justify-content:space-between;gap:0.75rem;flex-wrap:wrap">
          <div><div class="eyebrow">Acciones acordadas</div><p style="margin-top:0.5rem">Compromisos definidos por el equipo a partir del análisis.</p></div>
          ${state.isFacilitator ? `<button type="button" class="summary-add-action">+ Agregar acción</button>` : ""}
        </div>
        ${state.actions.length ? `<div style="display:grid;gap:0.75rem;margin-top:1.125rem">${state.actions.map(action => `
          <div class="topic" style="display:flex;align-items:flex-start;justify-content:space-between;gap:0.75rem">
            <div><strong>${escapeHtml(action.text)}</strong><div class="badge" style="margin-top:0.375rem">${escapeHtml(action.owner)} · ${escapeHtml(action.date)}</div>${action.successCriteria ? `<div style="margin-top:0.5rem;opacity:.78"><strong>¿Cómo sabremos que funcionó?</strong><br>${escapeHtml(action.successCriteria)}</div>` : ""}</div>
            ${state.isFacilitator ? `<div style="display:flex;gap:0.375rem;flex-shrink:0"><button type="button" class="summary-edit-action" data-action-id="${escapeHtml(action.id)}" title="Modificar acción">✏️</button><button type="button" class="summary-delete-action" data-action-id="${escapeHtml(action.id)}" title="Eliminar acción">🗑️</button></div>` : ""}
          </div>`).join("")}</div>` : `<div class="badge" style="margin-top:1rem">Todavía no hay acciones acordadas.</div>`}
      </div>

      <div class="big-number" style="margin-top:1.75rem">✓</div>
      <p class="badge">Post mortem listo para feedback</p>
    </section>
  `;
}

function postMortemColumnLabel(key) {
  return ({ detection: "Detección", mitigation: "Mitigación", customer_containment: "Contención al cliente", prevention: "Prevención" })[key] || key || "Actividad";
}
