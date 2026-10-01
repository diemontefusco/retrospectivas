/**
 * RETROS - Vistas de Landing.
 * Estas funciones son presentacionales: no acceden al DOM ni a Supabase.
 */

import { escapeHtml, formatLandingDate, todayLocalISO } from "../../utils/formatters.js";

function retroTypeLabel(type) {
  return type === "post_mortem" ? "Post mortem" : "Retro standard";
}

function landingHome(landingRetros = []) {
  return `
    <section class="landing-home">
      <div class="landing-hero">
        <h1>
          Tu espacio para reflexionar, aprender y mejorar en equipo
        </h1>
        <p class="lead">
          Bienvenido a tu asistente de retrospectivas. Un lugar donde vas a poder consultar las retros anteriores, ver resúmenes y facilitar nuevas sesiones en minutos de la forma más sencilla posible.
        </p>
      </div>

      <div class="landing-actions">
        <div class="eyebrow">¿Qué podés hacer?</div>
        <div class="landing-action-grid">
          <button type="button" class="card landing-action-card" id="landingExploreHistoryBtn">
            <h3>📊 Explorar el historial <span>→</span></h3>
            <p>Revisá las retros de los distintos equipos y descubrí patrones de mejora.</p>
          </button>
          <button type="button" class="card landing-action-card" id="landingExploreSummaryBtn">
            <h3>💡 Revisar aprendizajes y acuerdos <span>→</span></h3>
            <p>Volvé sobre los puntos clave y compromisos tomados en sesiones anteriores.</p>
          </button>
        </div>
      </div>

      <div id="landingHistorySection" class="card landing-history-card">
        <div class="landing-history-header">
          <h2>Historial de retros</h2>
        </div>
        <div id="landingHistory" class="landing-history-content">
          ${landingRetros.length ? landingRetros.map(landingRetroRow).join("") : `
            <div class="landing-empty-state">
              <div class="landing-empty-icon">📋</div>
              <h3>Todavía no hay retros</h3>
              <p>Cuando finalices una retrospectiva, va a aparecer acá automáticamente.</p>
            </div>
          `}
        </div>
      </div>
    </section>
  `;
}

function landingRetroRow(retro) {
  const title = escapeHtml(retro.titulo || "Retrospectiva");
  const teams = escapeHtml(retro.equipos || retro.nombre || "Equipos no definidos");
  const date = escapeHtml(formatLandingDate(retro.fecha));
  const finished = Boolean(retro.finalizada_en);
  const started = Boolean(retro.iniciada);
  const status = finished ? "Finalizada" : started ? "En curso" : "En preparación";

  return `
    <div class="landing-history-row" style="display:flex;justify-content:space-between;align-items:center;gap:1.125rem;padding:1.125rem 0;border-bottom:0.0625rem solid rgba(255,255,255,.08);flex-wrap:wrap">
      <div style="min-width:16.25rem;flex:1">
        <div style="font-size:1.125rem;font-weight:700">${title}</div>
        <div style="opacity:.72;margin-top:0.25rem">${teams} · ${date}</div>
        <div style="opacity:.65;margin-top:0.3125rem">${status}</div>
        <div style="margin-top:0.5rem"><strong class="retro-type-label">${escapeHtml(retroTypeLabel(retro.tipo_retro))}</strong></div>
      </div>
      <div class="landing-history-actions">
        <button class="landing-summary-btn ${finished ? "" : "landing-history-disabled-btn"}" data-retro-id="${retro.id}" data-disabled-action="${finished ? "false" : "true"}" ${finished ? "" : "aria-disabled=\"true\""} style="padding:0.5625rem 0.8125rem">Ver resumen</button>
        <button class="landing-feedback-btn ${finished ? "" : "landing-history-disabled-btn"}" data-retro-id="${retro.id}" data-disabled-action="${finished ? "false" : "true"}" ${finished ? "" : "aria-disabled=\"true\""} style="padding:0.5625rem 0.8125rem">Ver feedback</button>
        ${!finished ? `<button class="landing-join-btn primary" data-retro-code="${escapeHtml(retro.codigo || "")}" style="padding:0.5625rem 0.8125rem">Unirse a la retro →</button>` : ""}
      </div>
      ${!finished ? `<div class="landing-history-disabled-notice" data-disabled-notice="${retro.id}">Esta información estará disponible al finalizar la retrospectiva.</div>` : ""}
    </div>
  `;
}

function landingCreateForm() {
  return `
    <section class="landing-create">
      <h2>Prepará una nueva sesión</h2>
      <p class="lead">Indicá el título, quiénes van a participar y la fecha de la retrospectiva.</p>
      <div class="card landing-create-card">
        <div class="landing-form-field">
          <label class="badge" for="retroTitle">TÍTULO DE LA RETRO <span class="required-mark">*</span></label>
          <input id="retroTitle" type="text" placeholder="Retro fin de Q3 - Playback" autocomplete="off" required>
        </div>

        <div class="landing-form-field">
          <label class="badge" for="retroTeams">EQUIPOS QUE PARTICIPAN <span class="required-mark">*</span></label>
          <input id="retroTeams" type="text" placeholder="Ej. Playback, Catálogo y Contenido" autocomplete="off" required>
        </div>

        <div class="landing-form-field">
          <label class="badge" for="retroDate">FECHA <span class="required-mark">*</span></label>
          <div class="landing-date-input-wrap">
            <input id="retroDate" type="date" value="${todayLocalISO()}" required>
          </div>
        </div>

        <div class="landing-form-field">
          <label class="badge" for="retroType">TIPO DE RETRO <span class="required-mark">*</span></label>
          <select id="retroType" required>
            <option value="standard" selected>Retro standard</option>
            <option value="post_mortem">Post mortem</option>
          </select>
        </div>

        <button id="createRetroBtn" class="primary landing-create-submit">Crear sala</button>
        <p class="landing-create-hint">Creá la sala y compartí el link para que los participantes se sumen.</p>
      </div>
    </section>
  `;
}

function landingSummaryView(summary) {
  const retro = summary?.retro || {};
  const cards = summary?.cards || [];
  const questions = summary?.questions || [];
  const actions = summary?.actions || [];
  const topics = summary?.topics || [];
  const topTopic = topics.find(t => t.key === summary?.top_topic_key) || topics[0];

  const activityLabels = {
    green: "¿Qué salió bien?",
    red: "¿Qué nos dolió?",
    blue: "Ideas / Sugerencias"
  };

  const cardsForTopic = topTopic ? cards.filter(c => c.topic_key === topTopic.key) : cards;

  const renderAction = action => {
    const title = action.descripcion || action.text || "Sin título";
    const owner = action.responsable || action.owner || "Por definir";
    const date = action.fecha || action.date || "Por definir";
    const successCriteria = action.criterio_exito ?? action.como_sabremos ?? action.criterio ?? action.successCriteria ?? null;

    return `
      <div style="padding:1rem 0;border-bottom:0.0625rem solid rgba(255,255,255,.08)">
        <div style="font-weight:700;font-size:1rem">${escapeHtml(title)}</div>
        <div style="display:grid;gap:0.5rem;margin-top:0.625rem">
          <div><span class="badge">RESPONSABLE</span><div style="margin-top:0.25rem">${escapeHtml(owner)}</div></div>
          <div><span class="badge">FECHA COMPROMETIDA</span><div style="margin-top:0.25rem">${escapeHtml(date)}</div></div>
          ${successCriteria ? `<div><span class="badge">¿CÓMO SABREMOS QUE FUNCIONÓ?</span><div style="margin-top:0.25rem">${escapeHtml(successCriteria)}</div></div>` : ""}
        </div>
      </div>
    `;
  };

  return `
    <section style="max-width:61.25rem;margin:0 auto;padding:3rem 1.25rem 5rem">
      <button id="landingBackBtn" style="padding:0.5625rem 0.8125rem">← Volver al historial</button>
      <div class="eyebrow" style="margin-top:1.875rem">Resumen de retrospectiva</div>
      <h2 style="margin-top:0.625rem">${escapeHtml(retro.titulo || "Retrospectiva")}</h2>
      <p class="lead">${escapeHtml(retro.equipos || retro.nombre || "Equipos no definidos")} · ${formatLandingDate(retro.fecha)}${retro.finalizada_en ? ` · Finalizada ${new Date(retro.finalizada_en).toLocaleString("es-AR")}` : ""}</p>

      <div class="card" style="margin-top:1.625rem">
        <div class="eyebrow">Tema principal</div>
        <h3 style="margin-top:0.625rem">${escapeHtml(topTopic?.label ? `"${topTopic.label}"` : "Sin tema principal definido")}</h3>
        ${cardsForTopic.length ? `<div style="display:grid;gap:0.625rem;margin-top:1rem">${cardsForTopic.map(c=>`<div style="padding:0.75rem 0.875rem;border-radius:0.625rem;background:rgba(255,255,255,.04)">${escapeHtml(c.contenido)}</div>`).join("")}</div>` : `<p style="opacity:.65">No hay tarjetas asociadas a este tema.</p>`}
      </div>

      <div class="grid" style="margin-top:1.25rem">
        <div class="card"><div class="eyebrow">Preguntas</div>${questions.length ? `<div style="display:grid;gap:0.875rem;margin-top:0.75rem">${questions.map((q,index)=>`<div style="padding-bottom:0.75rem;border-bottom:0.0625rem solid rgba(255,255,255,.08)"><div><strong>${index + 1}.</strong> ${escapeHtml(q.pregunta || q.text || "")}</div><div style="margin-top:0.4375rem;opacity:.78"><strong>Respuesta:</strong> ${escapeHtml(q.respuesta || q.answer || "Sin respuesta")}</div></div>`).join("")}</div>` : `<p style="opacity:.65">No se registraron preguntas.</p>`}</div>
        <div class="card">
          <div class="eyebrow">Acciones acordadas</div>
          ${actions.length ? `<div style="margin-top:0.25rem">${actions.map(renderAction).join("")}</div>` : `<p style="opacity:.65">No se registraron acciones.</p>`}
        </div>
      </div>

      <div class="card" style="margin-top:1.25rem">
        <div class="eyebrow">Actividad completa</div>
        ${cards.length ? `<div style="display:grid;gap:0.75rem;margin-top:0.875rem">${cards.map(c=>`
          <div style="padding:0.75rem 0.875rem;border-radius:0.625rem;background:rgba(255,255,255,.04)">
            <div class="badge">${escapeHtml(activityLabels[c.etapa] || c.etapa || "Actividad")}</div>
            <div style="margin-top:0.375rem">${escapeHtml(c.contenido)}</div>
          </div>
        `).join("")}</div>` : `<p style="opacity:.65">No hay tarjetas registradas.</p>`}
      </div>
    </section>
  `;
}

function landingFeedbackView(data) {
  const rows = data?.feedback || [];
  const avg = data?.average_rating;
  return `
    <section style="max-width:61.25rem;margin:0 auto;padding:3rem 1.25rem 5rem">
      <button id="landingBackBtn" style="padding:0.5625rem 0.8125rem">← Volver al historial</button>
      <div class="eyebrow" style="margin-top:1.875rem">Feedback de la retrospectiva</div>
      <h2 style="margin-top:0.625rem">${escapeHtml(data?.retro?.titulo || "Retrospectiva")}</h2>
      <p class="lead">${escapeHtml(data?.retro?.equipos || data?.retro?.nombre || "Equipos no definidos")} · ${formatLandingDate(data?.retro?.fecha)}</p>
      <div class="grid" style="margin-top:1.5rem">
        <div class="card"><div class="eyebrow">Respuestas</div><div class="big-number">${rows.length}</div></div>
        <div class="card"><div class="eyebrow">Promedio</div><div class="big-number">${avg == null ? "—" : Number(avg).toFixed(1)}</div><p style="opacity:.65">sobre 10</p></div>
      </div>
      <div class="card" style="margin-top:1.25rem">
        <div class="eyebrow">Comentarios</div>
        ${rows.length ? rows.map(r=>`<div style="padding:1.125rem 0;border-bottom:0.0625rem solid rgba(255,255,255,.08)"><div style="font-weight:700">${r.rating}/10</div><p style="margin:0.5rem 0">${escapeHtml(r.observaciones)}</p>${r.feedback_herramienta ? `<p style="margin:0.5rem 0;opacity:.7"><strong>Herramienta:</strong> ${escapeHtml(r.feedback_herramienta)}</p>` : ""}</div>`).join("") : `<p style="opacity:.65">Todavía no hay feedback cargado para esta retrospectiva.</p>`}
      </div>
    </section>
  `;
}

export { landingHome, landingRetroRow, landingCreateForm, landingSummaryView, landingFeedbackView };
