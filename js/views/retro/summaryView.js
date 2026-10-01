import { state } from "../../core/state.js";
import { escapeHtml } from "../../utils/formatters.js";
import { getDynamicTopics, getGroupedCards } from "../../domain/topics.js";

export function summaryView() {

    const topTopic =
      getDynamicTopics()
        .slice()
        .sort(
          (a, b) =>
            (state.votes[b.key] || 0) -
            (state.votes[a.key] || 0)
        )[0];

    const mainTopicCards =
      topTopic ? getGroupedCards(topTopic.key) : [];

    const mainTopicQuestions = topTopic
      ? (state.guidingQuestions || []).filter(q => !q.topicKey || q.topicKey === topTopic.key)
      : (state.guidingQuestions || []);

    const formatDuration = (start, end) => {
      if (!start || !end) return "Tiempo total no disponible todavía";
      const ms = Math.max(0, new Date(end).getTime() - new Date(start).getTime());
      const totalSeconds = Math.floor(ms / 1000);
      const hours = Math.floor(totalSeconds / 3600);
      const minutes = Math.floor((totalSeconds % 3600) / 60);
      const seconds = totalSeconds % 60;
      return `${hours} h ${minutes} min ${seconds} s`;
    };

    return `
      <section>
        <div class="eyebrow">Cierre</div>

        <h2>Resumen de la actividad</h2>

        <p class="lead">
          El resumen final reúne lo que observamos, el tema que priorizamos,
          las preguntas que nos hicimos y las acciones que acordamos.
          El facilitador puede ajustar cualquier elemento para que el resultado final
          represente lo que el equipo acuerda.
        </p>

        <div class="card" style="margin-top:1.75rem;display:flex;align-items:center;justify-content:space-between;gap:1.125rem;flex-wrap:wrap">
          <div>
            <div style="font-size:1.375rem;font-weight:700">
              Duración total: ${escapeHtml(formatDuration(state.retroStartedAt, state.retroFinishedAt))}
            </div>
            <div class="badge" style="margin-top:0.375rem">
              Tiempo transcurrido desde el inicio de la retro hasta su finalización.
            </div>
          </div>
        </div>

        <div class="card" style="margin-top:1.125rem">
          <div class="section-heading-row" style="display:flex;align-items:center;justify-content:space-between;gap:0.75rem">
            <div class="badge">TEMA PRINCIPAL</div>
            ${state.isFacilitator ? `
              <div style="display:flex;gap:0.5rem">
                ${topTopic ? `<button type="button" class="summary-edit-topic" data-topic-key="${escapeHtml(topTopic.key)}" title="Modificar tema">✏️</button>
                <button type="button" class="summary-delete-topic" data-topic-key="${escapeHtml(topTopic.key)}" title="Eliminar tema">🗑️</button>` : ""}
                <button type="button" class="summary-add-topic" title="Agregar tema en común">+ Agregar tema</button>
              </div>` : ""}
          </div>
          <h3 style="font-size:1.5rem;margin-top:0.75rem">
            ${topTopic ? `&quot;${escapeHtml(topTopic.label)}&quot;` : "Todavía no hay un tema principal"}
          </h3>
          <p style="margin-top:0.5rem">
            ${topTopic ? `${state.votes[topTopic.key] || 0} votos` : "No se registraron votos."}
          </p>
        </div>

        <div class="card" style="margin-top:1.125rem">
          <div class="section-heading-row" style="display:flex;align-items:center;justify-content:space-between;gap:0.75rem;flex-wrap:wrap">
            <div>
              <div class="badge">EVIDENCIAS · TARJETAS VINCULADAS</div>
              <p style="margin-top:0.625rem">Estas son las situaciones que dieron origen al tema principal.</p>
            </div>
            ${state.isFacilitator ? `<button type="button" class="summary-add-card">+ Agregar tarjeta</button>` : ""}
          </div>
          ${mainTopicCards.length
            ? `<div style="display:grid;gap:0.625rem;margin-top:1.125rem">
                ${mainTopicCards.map(card => `
                  <div class="topic" style="display:flex;align-items:flex-start;justify-content:space-between;gap:0.75rem">
                    <div>
                      <div class="badge">${card.etapa === "green" ? "¿Qué salió bien?" : card.etapa === "red" ? "¿Qué nos dolió?" : "Ideas / Sugerencias"}</div>
                      <div style="margin-top:0.375rem">${escapeHtml(card.contenido)}</div>
                    </div>
                    ${state.isFacilitator ? `<div style="display:flex;gap:0.375rem;flex-shrink:0">
                      <button type="button" class="summary-edit-card" data-card-id="${escapeHtml(card.id)}" title="Modificar tarjeta">✏️</button>
                      <button type="button" class="summary-delete-card" data-card-id="${escapeHtml(card.id)}" title="Eliminar tarjeta">🗑️</button>
                    </div>` : ""}
                  </div>`).join("")}
              </div>`
            : `<div class="badge" style="margin-top:1rem">No hay tarjetas vinculadas al tema principal.</div>`}
        </div>

        <div class="card" style="margin-top:1.125rem">
          <div class="section-heading-row" style="display:flex;align-items:center;justify-content:space-between;gap:0.75rem;flex-wrap:wrap">
            <div>
              <div class="badge">PREGUNTAS QUE NOS HICIMOS</div>
              <p style="margin-top:0.625rem">Preguntas que usamos para profundizar y abrir posibilidades de mejora.</p>
            </div>
            ${state.isFacilitator ? `<button type="button" class="summary-add-question">+ Agregar pregunta</button>` : ""}
          </div>
          ${mainTopicQuestions.length
            ? `<div style="display:grid;gap:0.625rem;margin-top:1.125rem">
                ${mainTopicQuestions.map((question, index) => `
                  <div class="topic" style="display:flex;align-items:flex-start;justify-content:space-between;gap:0.75rem">
                    <div style="display:grid;gap:0.4375rem;min-width:0">
                        <div style="display:flex;gap:0.75rem;min-width:0"><strong>${index + 1}.</strong><span>${escapeHtml(question.text)}</span></div>
                        <div style="margin-left:1.75rem;opacity:.78"><strong>Respuesta:</strong> ${escapeHtml(question.answer || "Sin respuesta")}</div>
                      </div>
                    ${state.isFacilitator ? `<div style="display:flex;gap:0.375rem;flex-shrink:0">
                      <button type="button" class="summary-edit-question" data-question-id="${escapeHtml(question.id)}" title="Modificar pregunta">✏️</button>
                      <button type="button" class="summary-delete-question" data-question-id="${escapeHtml(question.id)}" title="Eliminar pregunta">🗑️</button>
                    </div>` : ""}
                  </div>`).join("")}
              </div>`
            : `<div class="badge" style="margin-top:1rem">No se registraron preguntas.</div>`}
        </div>

        <div class="card" style="margin-top:1.125rem">
          <div class="section-heading-row" style="display:flex;align-items:center;justify-content:space-between;gap:0.75rem;flex-wrap:wrap">
            <div>
              <div class="badge">ACCIONES ACORDADAS</div>
              <p style="margin-top:0.625rem">Las decisiones que surgieron para transformar lo conversado en mejoras concretas.</p>
            </div>
            ${state.isFacilitator ? `<button type="button" class="summary-add-action">+ Agregar acción</button>` : ""}
          </div>
          ${state.actions.length
            ? `<div style="display:grid;gap:0.75rem;margin-top:1.125rem">
                ${state.actions.map(action => `
                  <div class="topic" style="display:flex;align-items:flex-start;justify-content:space-between;gap:0.75rem">
                    <div>
                      <strong>${escapeHtml(action.text)}</strong>
                      <div class="badge" style="margin-top:0.375rem">${escapeHtml(action.owner)} · ${escapeHtml(action.date)}</div>
                    </div>
                    ${state.isFacilitator ? `<div style="display:flex;gap:0.375rem;flex-shrink:0">
                      <button type="button" class="summary-edit-action" data-action-id="${escapeHtml(action.id)}" title="Modificar acción">✏️</button>
                      <button type="button" class="summary-delete-action" data-action-id="${escapeHtml(action.id)}" title="Eliminar acción">🗑️</button>
                    </div>` : ""}
                  </div>`).join("")}
              </div>`
            : `<div class="badge" style="margin-top:1rem">Todavía no hay acciones acordadas.</div>`}
        </div>

        <div class="big-number" style="margin-top:1.75rem">✓</div>
        <p class="badge">Actividad finalizada</p>
      </section>
    `;
}
