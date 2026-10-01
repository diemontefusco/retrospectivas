import { supabaseClient } from './supabase.js';

export async function fetchActions(retroId) {
  return await supabaseClient
    .from('acciones')
    .select('*')
    .eq('retro_id', retroId)
    .order('created_at', { ascending: true });
}

export async function createAction({ descripcion, responsable, fecha, retroId }) {
  return await supabaseClient
    .from('acciones')
    .insert({ descripcion, responsable, fecha, retro_id: retroId })
    .select()
    .single();
}

export async function createSummaryAction({ retroId, sessionId, descripcion, responsable, fecha }) {
  return await supabaseClient.rpc('create_summary_action', {
    p_retro_id: retroId,
    p_session_id: sessionId,
    p_descripcion: descripcion,
    p_responsable: responsable,
    p_fecha: fecha
  });
}

export async function updateAction({ retroId, sessionId, actionId, descripcion, responsable, fecha }) {
  return await supabaseClient.rpc('update_action', {
    p_retro_id: retroId,
    p_session_id: sessionId,
    p_action_id: actionId,
    p_descripcion: descripcion,
    p_responsable: responsable,
    p_fecha: fecha
  });
}

export async function deleteAction({ retroId, sessionId, actionId }) {
  return await supabaseClient.rpc('delete_action', {
    p_retro_id: retroId,
    p_session_id: sessionId,
    p_action_id: actionId
  });
}
