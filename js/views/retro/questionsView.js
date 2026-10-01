import { state } from "../../core/state.js";
import { escapeHtml } from "../../utils/formatters.js";
import { getConversationContext } from "../../domain/voting.js";
import { getGroupedCards } from "../../domain/topics.js";

export function questionsView(getQuestionAnswerForRender = (question) => question.answer || "") {

    const context = getConversationContext();
    const questions = state.guidingQuestions || [];
    const isFacilitator = state.isFacilitator;
    const tied = context.scenario === "tie";
    const prioritizedTopicKeys = new Set(context.topics.map(topic => topic.key));
    const prioritizedQuestions = context.scenario === "no-topics"
      ? questions
      : questions.filter(question =>
          !question.topicKey || prioritizedTopicKeys.has(question.topicKey)
        );

    return `
      <section>

        <div class="eyebrow">
          Preguntas
        </div>

        <h2>
          ${
            context.scenario === "no-topics"
              ? "No hay temas en común"
              : context.scenario === "single-topic"
                ? escapeHtml(context.topics[0].label)
                : context.scenario === "tie"
                  ? "Empate entre temas"
                  : context.scenario === "winner"
                    ? escapeHtml(context.topics[0].label)
                    : "Votación pendiente"
          }
        </h2>

        <p class="lead">${escapeHtml(context.message)}</p>

        ${
          context.topics.length || context.scenario === "no-topics"
            ? `
              <div style="display:grid;gap:1.125rem;margin-top:1.75rem">
                ${context.scenario === "no-topics"
                  ? `<div class="card"><div class="badge">TODAS LAS TARJETAS</div><div style="display:grid;gap:0.625rem;margin-top:1.125rem">${context.cards.map(card => `<div class="sticky">${escapeHtml(card.contenido)}</div>`).join("")}</div></div>`
                  : context.topics.map(topic => {
                  const topicCards = getGroupedCards(topic.key);
                  const voteCount = state.votes[topic.key] || 0;
                  return `
                    <div class="card">
                      <div style="display:flex;align-items:center;justify-content:space-between;gap:1rem;flex-wrap:wrap">
                        <div>
                          <div class="badge">${
                            tied
                              ? "TEMA EMPATADO"
                              : context.scenario === "single-topic"
                                ? "ÚNICO TEMA"
                                : "TEMA PRIORIZADO"
                          }</div>
                          <h3 style="margin-top:0.5rem">${escapeHtml(topic.label)}</h3>
                        </div>
                        ${
                          context.scenario === "single-topic"
                            ? ""
                            : `<div class="badge">${voteCount} voto${voteCount === 1 ? "" : "s"}</div>`
                        }
                      </div>
                      ${
                        topicCards.length
                          ? `<div style="display:grid;gap:0.625rem;margin-top:1.125rem">${topicCards.map(card => `<div class="sticky">${escapeHtml(card.contenido)}</div>`).join("")}</div>`
                          : `<div class="badge" style="margin-top:1rem">No hay tarjetas asignadas a este tema en común.</div>`
                      }
                    </div>
                  `;
                }).join("")}
              </div>
            `
            : ""
        }

        ${
          isFacilitator
            ? `
              <div class="card" style="margin-top:1.75rem">
                <h3>Propuestas de preguntas</h3>
                <p>
                  ${
                    context.scenario === "no-topics"
                      ? "El sistema puede proponer preguntas a partir de todas las tarjetas de la actividad."
                      : context.scenario === "single-topic"
                        ? "El sistema puede proponer preguntas a partir del único tema en común y de sus tarjetas."
                        : context.scenario === "tie"
                          ? "El sistema puede proponer preguntas a partir de los temas empatados y de sus tarjetas."
                          : "El sistema puede proponer preguntas a partir del tema priorizado y de sus tarjetas."
                  }
                </p>
                <button class="primary" id="generateQuestionsBtn" style="margin-top:0.75rem">
                  Generar preguntas
                </button>
                <button type="button" id="clearAllGuidingQuestionsBtn" ${questions.length ? "" : "disabled"}
                  style="margin-top:0.625rem;padding:0.625rem 0.875rem;border-radius:0.625rem;border:0.0625rem solid rgba(255,255,255,.14);background:${questions.length ? "transparent" : "rgba(255,255,255,.05)"};color:${questions.length ? "inherit" : "rgba(255,255,255,.35)"};cursor:${questions.length ? "pointer" : "not-allowed"};opacity:${questions.length ? "1" : ".65"};" title="Borrar todas">
                  🗑️ Borrar todas
                </button>
              </div>
            `
            : `
              <div class="card" style="margin-top:1.75rem">
                <p>
                  El facilitador puede generar algunas preguntas de partida.
                  Después, todos pueden sumar las que consideren necesarias.
                </p>
              </div>
            `
        }

        <div class="card" style="margin-top:1.75rem">
          <h3>Preguntas del equipo</h3>
          <p>
            Cada pregunta necesita una respuesta. Las respuestas quedan guardadas
            y serán parte del resumen final de la retrospectiva.
          </p>

          <div style="display:grid;gap:0.75rem;margin-top:1.125rem">
            ${
              prioritizedQuestions.length
                ? prioritizedQuestions.map((question, index) => `
                    <div class="topic" style="display:grid;gap:0.875rem;">
                      <div style="display:flex;align-items:flex-start;justify-content:space-between;gap:1rem;min-width:0;">
                        <div style="display:flex;gap:0.75rem;min-width:0;flex:1;overflow-wrap:anywhere;word-break:break-word;">
                          <strong>${index + 1}.</strong>
                          <span style="min-width:0;overflow-wrap:anywhere;word-break:break-word;">${escapeHtml(question.text)}</span>
                        </div>
                        ${
                          isFacilitator
                            ? `
                              <div style="display:flex;gap:0.5rem;flex-shrink:0;">
                                <button
                                  type="button"
                                  class="edit-guiding-question"
                                  data-question-id="${escapeHtml(question.id)}"
                                  title="Modificar pregunta"
                                  aria-label="Modificar pregunta"
                                  style="width:2.125rem;height:2.125rem;border-radius:0.5625rem;cursor:pointer;background:transparent;border:0.0625rem solid rgba(255,255,255,.14);color:inherit;">✏️</button>
                                <button
                                  type="button"
                                  class="delete-guiding-question"
                                  data-question-id="${escapeHtml(question.id)}"
                                  title="Eliminar pregunta"
                                  aria-label="Eliminar pregunta"
                                  style="width:2.125rem;height:2.125rem;border-radius:0.5625rem;cursor:pointer;background:transparent;border:0.0625rem solid rgba(255,255,255,.14);color:inherit;">🗑️</button>
                              </div>
                            `
                            : ""
                        }
                      </div>

                      <div style="display:grid;gap:0.5rem;">
                        <label for="questionAnswer-${escapeHtml(question.id)}" class="badge">RESPUESTA <span style="color:#a07ffe;">*</span></label>
                        <textarea
                          id="questionAnswer-${escapeHtml(question.id)}"
                          class="guiding-question-answer"
                          data-question-id="${escapeHtml(question.id)}"
                          rows="4"
                          ${question.answer && !state.editingQuestionAnswers[question.id] ? "readonly" : ""}
                          required
                          aria-required="true"
                          placeholder="Escriban la respuesta a esta pregunta..."
                          style="width:100%;resize:vertical;">${escapeHtml(getQuestionAnswerForRender(question))}</textarea>
                        <div class="answer-autosave-row">
                          <span class="answer-autosave-status" data-question-id="${escapeHtml(question.id)}" aria-live="polite">
                            ${
                              state.answerAutosaveStatus[question.id] === "saving"
                                ? "Guardando…"
                                : state.answerAutosaveStatus[question.id] === "saved"
                                  ? "Guardado!"
                                  : state.answerAutosaveStatus[question.id] === "error"
                                    ? "No se pudo guardar. Se reintentará al editar."
                                    : ""
                            }
                          </span>
                          ${
                            question.answer && state.editingQuestionAnswers[question.id]
                              ? `<span style="opacity:.65;font-size:.875rem;">Editando…</span>`
                              : ""
                          }
                        </div>
                      </div>
                    </div>
                  `).join("")
                : `
                    <div class="empty-state compact">
                      <strong>Todavía no hay preguntas</strong>
                      <span>Generá algunas propuestas o agregá una del equipo para iniciar la conversación.</span>
                    </div>
                  `
            }
          </div>

          <div style="display:grid;gap:0.625rem;margin-top:1.375rem">
            <textarea
              id="guidingQuestionText"
              rows="3"
              placeholder="¿Qué pregunta nos ayudaría a entender mejor qué podemos mejorar?"
              style="width:100%;resize:vertical;"></textarea>
            <div class="section-action-row">
              <button
                class="primary"
                id="addGuidingQuestionBtn">
                + Agregar pregunta
              </button>
            </div>
          </div>
        </div>

      </section>
    `;
}
