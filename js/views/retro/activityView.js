import { state } from "../../core/state.js";
import { escapeHtml } from "../../utils/formatters.js";

export function introScreen() {
  return `
    <section class="hero">
      <h1>Llevemos adelante la retro teniendo en cuenta...</h1>
      <p class="lead">Independientemente de los resultados, partimos de la base de que cada quien dio su máximo con las herramientas y el contexto que tenía.</p>
      <div class="retro-principles">
        <div class="principle-card">
          <h3>Valores Scrum</h3>
          <div class="capsules">
            <span class="capsule">Enfoque</span>
            <span class="capsule">Apertura</span>
            <span class="capsule">Respeto</span>
            <span class="capsule">Compromiso</span>
            <span class="capsule">Valentía</span>
          </div>
        </div>
        <div class="principle-card">
          <h3>Principios Kanban</h3>
          <div class="capsules">
            <span class="capsule">Empezá donde estés</span>
            <span class="capsule">Establecé cambios evolutivos</span>
            <span class="capsule">Promové el liderazgo en todos los niveles</span>
          </div>
        </div>
      </div>
    </section>
  `;
}

export function checkInScreen() {
  return `
    <section>
      <div class="eyebrow">Check-in</div>
      <h2>¿Con qué energía llegás?</h2>
      <p class="lead">No buscamos una respuesta correcta. Queremos tener una lectura rápida del estado del equipo.</p>
      <div class="choice-row">
        ${["😣", "😕", "😐", "🙂", "🚀"].map((emoji, index) => `
          <button class="choice ${state.energy === index ? "selected" : ""}" data-energy="${index}">${emoji}</button>
        `).join("")}
      </div>
    </section>
  `;
}

export function activityScreen() {
  const columns = [
    { key: "green", label: "¿Qué salió bien?", description: "Prácticas que conviene mantener." },
    { key: "red", label: "¿Qué nos dolió?", description: "Problemas o bloqueos sufridos." },
    { key: "blue", label: "Ideas / Sugerencias", description: "Ideas o propuestas de mejora para el siguiente ciclo." }
  ];

  return `
    <section>
      <div class="eyebrow">Actividad</div>
      <h2>¿Qué pasó durante este período?</h2>
      <p class="lead">Compartí algo que funcionó, algo que nos trabó o algo que aprendimos. Las tarjetas se pueden mover entre columnas y editar para construir una actividad que represente al equipo.</p>
      <div class="card" style="margin-top:1.875rem">
        <div class="action-form">
          <select id="cardType">
            <option value="green">¿Qué salió bien?</option>
            <option value="red">¿Qué nos dolió?</option>
            <option value="blue">Ideas / Sugerencias</option>
          </select>
          <textarea id="cardText" placeholder="Escribí tu tarjeta..."></textarea>
        </div>
        <div class="section-action-row"><button class="primary" id="addCard">Agregar tarjeta +</button></div>
      </div>
      <p class="badge" style="margin-top:1.125rem">Podés arrastrar una tarjeta para moverla de una columna a otra.</p>
      <div class="columns" style="margin-top:1.25rem">
        ${columns.map(column => {
          const columnCards = state.cards.filter(card => card.etapa === column.key);
          return `
            <div class="column activity-column" data-etapa="${column.key}" style="min-height:11.25rem">
              <div class="column-title">
                <div>${column.label}<small>· ${columnCards.length}</small></div>
                <div style="font-size:0.8125rem;font-weight:400;line-height:1.4;opacity:.7;margin-top:0.375rem">${column.description}</div>
              </div>
              <div class="activity-drop-zone" data-etapa="${column.key}" style="min-height:7.5rem">
                ${columnCards.length
                  ? columnCards.map(card => `
                    <div class="sticky activity-card ${state.realtimeFeedback?.type === "card" && state.realtimeFeedback.id === card.id ? "realtime-enter" : ""}" draggable="true" data-card-id="${escapeHtml(card.id)}" style="position:relative;cursor:grab;padding-right:4.75rem;" title="Arrastrá para mover la tarjeta">
                      <div>${escapeHtml(card.contenido)}</div>
                      <div style="position:absolute;right:0.5rem;top:0.5rem;display:flex;gap:0.3125rem;">
                        <button type="button" class="activity-edit-card" data-card-id="${escapeHtml(card.id)}" draggable="false" title="Modificar tarjeta" aria-label="Modificar tarjeta" style="width:1.875rem;height:1.875rem;border-radius:0.5rem;border:0.0625rem solid rgba(0,0,0,.15);background:rgba(255,255,255,.7);cursor:pointer;">✏️</button>
                        <button type="button" class="activity-delete-card" data-card-id="${escapeHtml(card.id)}" draggable="false" title="Eliminar tarjeta" aria-label="Eliminar tarjeta" style="width:1.875rem;height:1.875rem;border-radius:0.5rem;border:0.0625rem solid rgba(0,0,0,.15);background:rgba(255,255,255,.7);cursor:pointer;">🗑️</button>
                      </div>
                    </div>
                  `).join("")
                  : `<div class="empty-state activity-empty">
                      <div class="empty-state-icon" aria-hidden="true">＋</div>
                      <strong>Este espacio está libre</strong>
                      <span>Agregá una tarjeta o arrastrá una existente acá.</span>
                    </div>`}
              </div>
            </div>
          `;
        }).join("")}
      </div>
    </section>
  `;
}
