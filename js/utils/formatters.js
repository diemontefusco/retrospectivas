/**
 * RETROS - Formateadores y helpers de presentación.
 */

export function escapeHtml(value) {
  if (value === null || value === undefined) {
    return "";
  }

  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

export function todayLocalISO() {
  const d = new Date();
  const local = new Date(d.getTime() - d.getTimezoneOffset() * 60000);
  return local.toISOString().slice(0, 10);
}

export function formatLandingDate(value) {
  if (!value) return "Fecha no definida";
  const d = new Date(`${value}T12:00:00`);
  return d.toLocaleDateString("es-AR", {
    day: "2-digit", month: "2-digit", year: "numeric"
  });
}
