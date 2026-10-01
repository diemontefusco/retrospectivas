import { supabaseClient } from "./supabase.js";

export async function fetchPostMortem(retroId) {
  return await supabaseClient
    .from("retro_postmortems")
    .select("*")
    .eq("retro_id", retroId)
    .maybeSingle();
}

export async function savePostMortem({ retroId, sessionId, ticket, mttrFinal, impacto, contactacion, reincidente, tarea, resumenBreve }) {
  return await supabaseClient.rpc("save_retro_postmortem", {
    p_retro_id: retroId,
    p_session_id: sessionId,
    p_ticket: ticket,
    p_mttr_final: mttrFinal,
    p_impacto: impacto,
    p_contactacion: contactacion,
    p_reincidente: reincidente,
    p_tarea: tarea,
    p_resumen_breve: resumenBreve
  });
}


export async function savePostMortemField({ retroId, sessionId, field, value }) {
  return await supabaseClient.rpc("save_retro_postmortem_field", {
    p_retro_id: retroId,
    p_session_id: sessionId,
    p_field: field,
    p_value: value
  });
}
