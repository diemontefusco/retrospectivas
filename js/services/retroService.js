import { supabaseClient } from './supabase.js';

export async function fetchRetroByCode(code) {
  return await supabaseClient
    .from('retros')
    .select('id, codigo, nombre, paso_actual, facilitador_session_id, facilitador_nombre, iniciada, iniciada_en, finalizada_en, tipo_retro')
    .eq('codigo', code)
    .single();
}

export async function fetchRetroHistory() {
  return await supabaseClient.rpc('get_retro_history_with_title');
}

export async function fetchRetroSummary(retroId) {
  return await supabaseClient.rpc('get_retro_summary', { p_retro_id: retroId });
}

export async function fetchRetroTitleContext(retroId) {
  return await supabaseClient.rpc('get_retro_title_context', { p_retro_id: retroId });
}

export async function fetchAdminRetroHistory() {
  return await supabaseClient.rpc('get_admin_retro_history');
}

export async function fetchRetroTypes(retroIds = []) {
  if (!retroIds.length) return { data: [], error: null };
  return await supabaseClient.rpc('get_retro_types', { p_retro_ids: retroIds });
}

export async function createRetroWithTitle(title, teams, date) {
  return await supabaseClient.rpc('create_retro_with_title', {
    p_titulo: title,
    p_equipos: teams,
    p_fecha: date
  });
}

export async function setRetroType(retroId, retroType) {
  return await supabaseClient.rpc('set_retro_type', {
    p_retro_id: retroId,
    p_tipo_retro: retroType
  });
}


export async function fetchRetroState(retroId) {
  return await supabaseClient
    .from('retros')
    .select('id, codigo, nombre, paso_actual, facilitador_session_id, facilitador_nombre, iniciada, iniciada_en, finalizada_en, tipo_retro')
    .eq('id', retroId)
    .single();
}

export async function setRetroPublicada(retroId, publicada) {
  return await supabaseClient.rpc('set_retro_publicada', {
    p_retro_id: retroId,
    p_publicada: publicada
  });
}

export async function deleteRetro(retroId) {
  return await supabaseClient.rpc('delete_retro', {
    p_retro_id: retroId
  });
}
