import { state } from "../../core/state.js";
import { escapeHtml } from "../../utils/formatters.js";
import { getDynamicTopics, getTopicCount } from "../../domain/topics.js";

export function topicsView() {

    const dynamicTopics = getDynamicTopics();

    const ungroupedCards =
      state.cards.filter(card => !card.topic_key);

    return `
      <section>

        <div class="eyebrow">
          Agrupación
        </div>

        <h2>
          ¿Qué temas en común aparecen en la actividad?
        </h2>

        <p class="lead">
          El facilitador define manualmente los temas en común que aparecen en la actividad.
          No hay categorías predefinidas ni agrupación automática.
        </p>

        ${
          state.isFacilitator
            ? `
              <div class="section-action-row" style="margin-top:1.5rem;">
                <button
                  id="addTopicBtn"
                  type="button"
                  style="
                    padding:0.625rem 0.875rem;
                    border-radius:0.625rem;
                    cursor:pointer;
                    background:transparent;
                    border:0.0625rem solid rgba(255,255,255,.18);
                    color:inherit;
                  ">
                  + Agregar tema en común
                </button>
              </div>
            `
            : ""
        }

        <div class="topic-list" style="margin-top:1.875rem">
          ${
            dynamicTopics.length
              ? dynamicTopics.map(topic => `
                  <div
                    class="topic topic-sortable"
                    draggable="${state.isFacilitator ? "true" : "false"}"
                    data-topic-key="${escapeHtml(topic.key)}"
                    style="display:flex;align-items:center;justify-content:space-between;gap:1rem;">
                    <div style="display:flex;align-items:center;gap:0.75rem;min-width:0;">
                      ${
                        state.isFacilitator
                          ? `<span class="topic-drag-handle" title="Arrastrar para reordenar" aria-label="Arrastrar para reordenar">⋮⋮</span>`
                          : ""
                      }
                      <div style="min-width:0;">
                        <strong>${escapeHtml(topic.label)}</strong>
                        <span class="badge" style="margin-left:0.5rem;">
                          ${topic.count}
                          tarjeta${topic.count === 1 ? "" : "s"}
                        </span>
                      </div>
                    </div>

                    ${
                      state.isFacilitator
                        ? `
                          <div style="display:flex;gap:0.375rem;align-items:center;flex-shrink:0;">
                            <button type="button" class="topic-move-btn" data-topic-move="up" data-topic-key="${escapeHtml(topic.key)}" title="Subir tema" aria-label="Subir tema">↑</button>
                            <button type="button" class="topic-move-btn" data-topic-move="down" data-topic-key="${escapeHtml(topic.key)}" title="Bajar tema" aria-label="Bajar tema">↓</button>
                            <button
                              type="button"
                              data-topic-action="rename"
                              style="
                                width:2.25rem;
                                height:2.25rem;
                                border-radius:0.5625rem;
                                cursor:pointer;
                                background:transparent;
                                border:0.0625rem solid rgba(255,255,255,.14);
                                color:inherit;
                              "
                              data-topic-key="${escapeHtml(topic.key)}"
                              title="Renombrar tema"
                              aria-label="Renombrar tema">
                              ✏️
                            </button>
                            <button
                              type="button"
                              data-topic-action="delete"
                              style="
                                width:2.25rem;
                                height:2.25rem;
                                border-radius:0.5625rem;
                                cursor:pointer;
                                background:transparent;
                                border:0.0625rem solid rgba(255,255,255,.14);
                                color:inherit;
                              "
                              data-topic-key="${escapeHtml(topic.key)}"
                              title="Eliminar tema"
                              aria-label="Eliminar tema">
                              🗑️
                            </button>
                          </div>
                        `
                        : ""
                    }
                  </div>
                `).join("")
              : `
                <div class="empty-state card">
                  <div class="empty-state-icon" aria-hidden="true">＋</div>
                  <strong>Todavía no hay temas en común</strong>
                  <span>El facilitador puede crear el primer tema y después asignar las tarjetas que correspondan.</span>
                </div>
              `
          }
        </div>

        ${
          ungroupedCards.length
            ? `
              <div class="card" style="margin-top:1.875rem">
                <h3>Tarjetas sin agrupar</h3>
                <p>
                  ${ungroupedCards.length}
                  tarjeta${ungroupedCards.length === 1 ? "" : "s"}
                  no encontró un tema suficientemente claro.
                </p>
              </div>
            `
            : ""
        }

        <div
          style="
            margin-top:1.875rem;
            display:grid;
            gap:1rem;
          ">

          ${
            state.cards.length === 0
              ? `
                <div class="empty-state card">
                  <div class="empty-state-icon" aria-hidden="true">＋</div>
                  <strong>Todavía no hay tarjetas</strong>
                  <span>Volvé a Actividad para registrar lo que pasó durante el período.</span>
                </div>
              `
              : state.cards.map(card => `
                <div
                  class="card"
                  style="
                    display:flex;
                    gap:1.25rem;
                    align-items:center;
                    justify-content:space-between;
                    flex-wrap:wrap;
                  ">

                  <div style="flex:1;min-width:15.625rem;">
                    <div class="badge" style="margin-bottom:0.625rem">
                      ${
                        card.etapa === "green"
                          ? "¿Qué salió bien?"
                          : card.etapa === "red"
                            ? "¿Qué nos dolió?"
                            : "Ideas / Sugerencias"
                      }
                    </div>
                    <strong>${escapeHtml(card.contenido)}</strong>
                  </div>

                  <div style="min-width:15.625rem;">
                    <select
                      class="card-topic-select"
                      data-card-id="${card.id}"
                      style="width:100%;">
                      <option value="">Sin agrupar</option>
                      ${dynamicTopics.map(topic => `
                        <option
                          value="${escapeHtml(topic.key)}"
                          ${card.topic_key === topic.key ? "selected" : ""}>
                          ${escapeHtml(topic.label)}
                        </option>
                      `).join("")}
                    </select>
                  </div>

                </div>
              `).join("")
          }

        </div>

      </section>
    `;
}
