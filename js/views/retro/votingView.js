import { state } from "../../core/state.js";
import { MAX_VOTES_PER_PARTICIPANT } from "../../core/config.js";
import { escapeHtml } from "../../utils/formatters.js";
import { getDynamicTopics, getTopicCount } from "../../domain/topics.js";

export function votingView() {

    const remainingVotes =
      Math.max(
        0,
        MAX_VOTES_PER_PARTICIPANT -
          state.usedVotes
      );

    return `
      <section>

        <div class="eyebrow">
          Votación
        </div>

        <h2>
          ¿Dónde deberíamos poner energía?
        </h2>

        <p class="lead">
          Tenés 3 votos. Elegí los temas que consideres
          más importantes para conversar.
        </p>

        <div
          class="badge"
          style="margin:1.25rem 0">

          Te quedan
          <strong>
            ${remainingVotes}
          </strong>
          voto${remainingVotes === 1 ? "" : "s"}

        </div>

        <div class="topic-list">

          ${getDynamicTopics().length === 0
            ? `<div class="empty-state card">
                <div class="empty-state-icon" aria-hidden="true">—</div>
                <strong>No hay temas para votar</strong>
                <span>La etapa de votación debería omitirse cuando no existen temas en común.</span>
              </div>`
            : getDynamicTopics()
            .map(topic => {

              const totalVotes =
                state.votes[topic.key] || 0;

              const myVotes =
                state.myVotes[topic.key] || 0;

              const cardCount =
                getTopicCount(topic.key);

              const disabled =
                remainingVotes === 0;

              return `
                <div
                  class="topic"
                  style="align-items:center;">

                  <div>

                    <strong>
                      ${escapeHtml(topic.label)}
                    </strong>

                    <div
                      class="badge"
                      style="margin-top:0.375rem">

                      ${cardCount}
                      tarjeta${cardCount === 1 ? "" : "s"}

                      ·

                      <span class="topic-vote-total ${state.realtimeFeedback?.type === "vote" && state.realtimeFeedback.id === topic.key ? "realtime-pulse" : ""}">${totalVotes} voto${totalVotes === 1 ? "" : "s"}</span>

                      ${
                        myVotes > 0
                          ? ` · vos: ${myVotes}`
                          : ""
                      }

                    </div>

                  </div>


                  <div class="topic-vote-actions">
                    ${
                      myVotes > 0
                        ? `
                          <button
                            type="button"
                            class="secondary recover-vote"
                            data-recover-topic="${escapeHtml(topic.key)}"
                            title="Recuperar un voto de este tema">
                            ↶ Recuperar voto
                          </button>
                        `
                        : ""
                    }

                    ${
                      disabled
                        ? `<span class="vote-exhausted-note">Sin votos</span>`
                        : `<button
                            class="primary vote"
                            data-topic="${escapeHtml(topic.key)}">
                            Votar +1
                          </button>`
                    }
                  </div>

                </div>
              `;

            })
            .join("")}

        </div>

      </section>
    `;
}
