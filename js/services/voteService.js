import { supabaseClient } from './supabase.js';

export async function fetchVotes(retroId) {
  return await supabaseClient
    .from('votos')
    .select('*')
    .eq('retro_id', retroId);
}

export async function fetchMyVotes(retroId, participantId) {
  return await supabaseClient
    .from('voto_participantes')
    .select('topic_key')
    .eq('retro_id', retroId)
    .eq('participante_id', participantId);
}

export async function castVote({ retroId, participantId, topicKey }) {
  return await supabaseClient.rpc('cast_vote', {
    p_retro_id: retroId,
    p_participante_id: participantId,
    p_topic_key: topicKey
  });
}

export async function recoverVote({ retroId, participantId, topicKey }) {
  return await supabaseClient.rpc('recover_vote', {
    p_retro_id: retroId,
    p_participante_id: participantId,
    p_topic_key: topicKey
  });
}
