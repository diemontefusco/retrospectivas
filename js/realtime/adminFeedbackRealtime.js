import { supabaseClient } from "../services/supabase.js";

let adminToolFeedbackChannel = null;

export function subscribeAdminToolFeedback({ refreshAdminFeedbackLists, loadAdminRetros }) {
  if (adminToolFeedbackChannel) {
    supabaseClient.removeChannel(adminToolFeedbackChannel);
    adminToolFeedbackChannel = null;
  }

  adminToolFeedbackChannel = supabaseClient
    .channel("admin-feedback-live")
    .on("postgres_changes", {
      event: "*",
      schema: "public",
      table: "tool_feedback"
    }, () => {
      refreshAdminFeedbackLists();
    })
    .on("postgres_changes", {
      event: "*",
      schema: "public",
      table: "retro_feedback"
    }, async () => {
      // Si una retro acaba de finalizar, refrescamos también el listado de retros
      // antes de reconstruir las sugerencias provenientes de ellas.
      try {
        await loadAdminRetros();
      } catch (error) {
        console.error("Error actualizando retrospectivas del admin:", error);
      }
      await refreshAdminFeedbackLists();
    })
    .subscribe();

  return adminToolFeedbackChannel;
}

