import { supabaseClient } from './supabase.js';

export async function fetchParticipant(retroId, sessionId) {
  return await supabaseClient
    .from('participantes')
    .select('*')
    .eq('retro_id', retroId)
    .eq('session_id', sessionId)
    .maybeSingle();
}

export async function createParticipant(retroId, sessionId) {
  return await supabaseClient
    .from('participantes')
    .insert({ retro_id: retroId, session_id: sessionId })
    .select()
    .single();
}

export async function fetchParticipants(retroId) {
  return await supabaseClient
    .from('participantes')
    .select('id, retro_id, session_id, nombre, listo')
    .eq('retro_id', retroId);
}


export async function setParticipantProfile(retroId, sessionId, nombre, listo) {
  return await supabaseClient.rpc('set_participant_profile', {
    p_retro_id: retroId,
    p_session_id: sessionId,
    p_nombre: nombre,
    p_listo: Boolean(listo)
  });
}
