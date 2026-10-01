import { state } from "../../core/state.js";
import { escapeHtml, todayLocalISO } from "../../utils/formatters.js";

export function actionsView() {
    return `
    <section>

      <div class="eyebrow">
        Acciones
      </div>

      <h2>
        Convirtamos la conversación en algo concreto.
      </h2>

      <p class="lead">
        Una acción útil tiene un responsable y una fecha.
        Evitemos acciones genéricas.
      </p>

      <div class="card" style="margin-top:1.5rem">
        <div class="badge">PREGUNTAS</div>
        <p style="margin-top:0.625rem">
          Estas son las preguntas que respondimos en la instancia anterior.
          Usémoslas como punto de partida para definir acciones de mejora.
        </p>

        ${
          state.guidingQuestions && state.guidingQuestions.length
            ? `
              <div style="display:grid;gap:0.625rem;margin-top:1.125rem">
                ${state.guidingQuestions.map((question, index) => `
                  <div class="topic" style="display:flex;align-items:flex-start;gap:0.75rem">
                    <strong>${index + 1}.</strong>
                    <div style="display:grid;gap:0.3125rem;min-width:0">
                      <span>${escapeHtml(question.text)}</span>
                      <span style="opacity:.72">Respuesta: ${escapeHtml(question.answer || "Sin respuesta")}</span>
                    </div>
                  </div>
                `).join("")}
              </div>
            `
            : `
              <div class="empty-state compact" style="margin-top:1rem">
                <strong>Todavía no hay preguntas</strong>
                <span>No hay respuestas previas para usar como punto de partida.</span>
              </div>
            `
        }
      </div>

      <div class="action-form">

        <input
          id="actionText"
          placeholder="¿Qué vamos a hacer?">

        <input
          id="actionOwner"
          placeholder="Responsable">

        <div class="date-input-wrap">
          <input
            id="actionDate"
            class="action-date-input"
            type="date"
            value="${todayLocalISO()}">
        </div>

        <textarea
          id="actionWhy"
          placeholder="¿Cómo sabremos que funcionó?"></textarea>

      </div>


      <button
        class="primary"
        id="addAction"
        style="margin-top:0.75rem">

        Agregar acción +

      </button>


      <div class="actions">

        ${
          state.actions
            .map(action => `
              <div class="action ${state.realtimeFeedback?.type === "action" && state.realtimeFeedback.id === action.id ? "realtime-enter" : ""}">

                <div>

                  <strong>
                    ${escapeHtml(action.text)}
                  </strong>

                  <div class="badge">
                    ${escapeHtml(action.owner)}
                    ·
                    ${escapeHtml(action.date)}
                  </div>
                  ${action.successCriteria ? `<div style="margin-top:0.5rem;opacity:.78"><strong>¿Cómo sabremos que funcionó?</strong><br>${escapeHtml(action.successCriteria)}</div>` : ""}

                </div>

              </div>
            `)
            .join("")
        }

      </div>

    </section>
  `;
}
