/**
 * RETROS - Vistas de Administración.
 * Estas funciones son presentacionales: no acceden al DOM ni a Supabase.
 */

import { escapeHtml, formatLandingDate } from "../../utils/formatters.js";

function adminLoginView(message = "") {
  return `
    <section style="max-width:35rem;margin:0 auto;padding:5rem 1.25rem">
      <div class="pill">ADMINISTRACIÓN PRIVADA</div>
      <h1 style="font-size:clamp(2.375rem,5vw,3.5rem);margin:1.375rem 0 0.75rem">Administrar retrospectivas</h1>
      <p class="lead">Ingresá con tu cuenta de administrador para gestionar qué retrospectivas aparecen en el historial público.</p>
      ${message ? `<div class="card" style="margin-top:1.25rem">${escapeHtml(message)}</div>` : ""}
      <div class="card" style="margin-top:1.5rem">
        <label class="badge" for="adminEmail">EMAIL</label>
        <input id="adminEmail" type="email" autocomplete="username" style="width:100%;margin-top:0.625rem;padding:0.8125rem;border-radius:0.625rem;background:#111;color:inherit;border:0.0625rem solid rgba(255,255,255,.18)">
        <label class="badge" for="adminPassword" style="display:block;margin-top:1.25rem">CONTRASEÑA</label>
        <input id="adminPassword" type="password" autocomplete="current-password" style="width:100%;margin-top:0.625rem;padding:0.8125rem;border-radius:0.625rem;background:#111;color:inherit;border:0.0625rem solid rgba(255,255,255,.18)">
        <button id="adminLoginBtn" class="primary" style="margin-top:1.5rem;width:100%;padding:0.875rem">Ingresar →</button>
      </div>
      <p style="margin-top:1.125rem;opacity:.55;font-size:0.8125rem">Esta sección está protegida por autenticación de Supabase.</p>
    </section>
  `;
}

function adminToolFeedbackRow(item) {
  const id = escapeHtml(item.id || "");
  const text = escapeHtml(item.feedback || "");
  const date = item.created_at ? new Date(item.created_at).toLocaleString("es-AR") : "";
  return `
    <div class="admin-feedback-row">
      <div class="admin-feedback-content">
        <div>${text}</div>
        ${date ? `<div class="admin-feedback-date">${escapeHtml(date)}</div>` : ""}
      </div>
      <button type="button" class="admin-delete-feedback-btn" data-feedback-id="${id}" aria-label="Eliminar sugerencia" title="Eliminar sugerencia">🗑️</button>
    </div>
  `;
}

function adminRetroToolFeedbackRow(item) {
  const id = escapeHtml(item.id || "");
  const title = escapeHtml(item.retro_titulo || "Retrospectiva");
  const teams = escapeHtml(item.equipos || "");
  const date = item.fecha ? escapeHtml(formatLandingDate(item.fecha)) : "";
  const feedback = escapeHtml(item.feedback || "");
  const created = item.created_at ? new Date(item.created_at).toLocaleString("es-AR") : "";
  const meta = [teams, date].filter(Boolean).join(" · ");

  return `
    <div class="admin-feedback-row admin-retro-feedback-row">
      <div class="admin-feedback-content">
        <div style="font-weight:700">${title}</div>
        ${meta ? `<div style="opacity:.65;margin-top:.3rem">${meta}</div>` : ""}
        <div style="margin-top:.7rem">${feedback}</div>
        ${created ? `<div class="admin-feedback-date">${escapeHtml(created)}</div>` : ""}
      </div>
      <button type="button" class="admin-delete-retro-feedback-btn admin-delete-feedback-btn" data-retro-feedback-id="${id}" aria-label="Eliminar sugerencia" title="Eliminar sugerencia">🗑️</button>
    </div>
  `;
}

function adminFeedbackView(adminToolFeedback = [], adminRetroToolFeedback = []) {
  return `
    <div class="admin-feedback-global-actions">
      <h2 class="admin-feedback-heading">Feedback de la APP</h2>
      ${(adminToolFeedback.length || adminRetroToolFeedback.length) ? `<button id="adminDeleteAllFeedbackBtn" class="admin-delete-all-feedback-btn" type="button" aria-label="Eliminar todas las sugerencias" title="Eliminar todas las sugerencias">🗑️ Borrar todas</button>` : ""}
    </div>

    <div class="admin-feedback-block">
      <div class="admin-feedback-heading-row">
        <h2 class="admin-feedback-heading">Sugerencias desde footer</h2>
      </div>
      <div class="admin-feedback-list" id="adminToolFeedbackList">
        ${adminToolFeedback.length ? adminToolFeedback.map(adminToolFeedbackRow).join("") : `<p style="opacity:.65;margin:1rem 0 0">Todavía no hay sugerencias recibidas.</p>`}
      </div>
    </div>


    <div class="admin-feedback-block">
      <h2 class="admin-feedback-heading">Sugerencias desde retros</h2>
      <div class="admin-feedback-list" id="adminRetroToolFeedbackList">
        ${adminRetroToolFeedback.length ? adminRetroToolFeedback.map(adminRetroToolFeedbackRow).join("") : `<p style="opacity:.65;margin:1rem 0 0">Todavía no hay sugerencias de retros finalizadas.</p>`}
      </div>
    </div>
  `;
}

function adminPanelView(adminRetros = [], adminToolFeedback = [], adminRetroToolFeedback = []) {
  return `
    <section style="max-width:70rem;margin:0 auto;padding:3.5rem 1.25rem 5rem">
      <div style="display:flex;justify-content:space-between;align-items:end;gap:1rem;flex-wrap:wrap">
        <div>
          <h1 style="margin:0 0 0.5rem">Panel de admin</h1>
          <p class="lead" style="margin:0">Gestioná las retrospectivas y el feedback de la herramienta.</p>
        </div>
        <button id="adminLogoutBtn" style="padding:0.625rem 0.875rem">Cerrar sesión</button>
      </div>
      <div class="card" style="margin-top:2rem">
        ${adminRetros.length ? adminRetros.map(adminRetroRow).join("") : `<p style="opacity:.65;margin:0">No hay retrospectivas registradas.</p>`}
      </div>

      <div class="card" id="adminToolFeedbackSection" style="margin-top:1.5rem">
        ${adminFeedbackView(adminToolFeedback, adminRetroToolFeedback)}
      </div>
    </section>
  `;
}

function adminRetroRow(retro) {
  const title = escapeHtml(retro.titulo || "Retrospectiva");
  const teams = escapeHtml(retro.equipos || retro.nombre || "Equipos no definidos");
  const date = escapeHtml(formatLandingDate(retro.fecha));
  const published = !!retro.publicada;
  const started = Boolean(retro.iniciada);
  const status = retro.finalizada_en ? "Finalizada" : started ? "En curso" : "En preparación";
  return `
    <div style="display:flex;justify-content:space-between;align-items:center;gap:1.125rem;padding:1.125rem 0;border-bottom:0.0625rem solid rgba(255,255,255,.08);flex-wrap:wrap">
      <div style="min-width:17.5rem;flex:1">
        <div style="font-size:1.125rem;font-weight:700">${title}</div>
        <div style="opacity:.72;margin-top:0.25rem">${teams} · ${date}</div>
        <div style="opacity:.65;margin-top:0.3125rem">${status}</div>
        <div style="margin-top:0.5rem"><strong class="retro-type-label">${escapeHtml(retro.tipo_retro === "post_mortem" ? "Post mortem" : "Retro standard")}</strong></div>
        <div style="opacity:.55;margin-top:0.25rem">${published ? "Visible públicamente" : "Archivada"}</div>
      </div>
      <div style="display:flex;gap:0.5rem;align-items:center">
        <button class="admin-toggle-public-btn" data-retro-id="${retro.id}" data-publicada="${published}" style="padding:0.5625rem 0.8125rem">
          ${published ? "Archivar" : "Publicar"}
        </button>
        <button class="admin-delete-retro-btn" data-retro-id="${retro.id}" data-retro-label="${teams} · ${date}" style="padding:0.5625rem 0.8125rem;border-color:rgba(255,100,100,.35);color:#d70000">
          Eliminar
        </button>
      </div>
    </div>
  `;
}

export { adminLoginView, adminToolFeedbackRow, adminRetroToolFeedbackRow, adminFeedbackView, adminPanelView, adminRetroRow };
