import { supabaseClient } from './supabase.js';

export async function fetchCards(retroId) {
  return await supabaseClient
    .from('cards')
    .select('*')
    .eq('retro_id', retroId)
    .order('created_at', { ascending: true });
}

export async function createActivityCard({ contenido, etapa, retroId }) {
  return await supabaseClient
    .from('cards')
    .insert({ contenido, etapa, retro_id: retroId, topic_key: null })
    .select()
    .single();
}

const POST_MORTEM_STAGES = new Set([
  'detection',
  'mitigation',
  'customer_containment',
  'prevention'
]);

export async function updateActivityCard({ retroId, sessionId, cardId, contenido, etapa }) {
  const functionName = POST_MORTEM_STAGES.has(etapa)
    ? 'update_postmortem_activity_card'
    : 'update_activity_card';

  return await supabaseClient.rpc(functionName, {
    p_retro_id: retroId,
    p_session_id: sessionId,
    p_card_id: cardId,
    p_contenido: contenido,
    p_etapa: etapa
  });
}

export async function deleteActivityCard({ retroId, sessionId, cardId }) {
  return await supabaseClient.rpc('delete_activity_card', {
    p_retro_id: retroId,
    p_session_id: sessionId,
    p_card_id: cardId
  });
}

export async function createSummaryCard({ retroId, sessionId, contenido, etapa, topicKey }) {
  return await supabaseClient.rpc('create_summary_card', {
    p_retro_id: retroId,
    p_session_id: sessionId,
    p_contenido: contenido,
    p_etapa: etapa,
    p_topic_key: topicKey
  });
}

export async function updateSummaryCard({ retroId, sessionId, cardId, contenido }) {
  return await supabaseClient.rpc('update_summary_card', {
    p_retro_id: retroId,
    p_session_id: sessionId,
    p_card_id: cardId,
    p_contenido: contenido
  });
}

export async function deleteSummaryCard({ retroId, sessionId, cardId }) {
  return await supabaseClient.rpc('delete_summary_card', {
    p_retro_id: retroId,
    p_session_id: sessionId,
    p_card_id: cardId
  });
}


export async function setCardTopic({ retroId, sessionId, cardId, topicKey }) {
  return await supabaseClient.rpc('set_card_topic', {
    p_retro_id: retroId,
    p_session_id: sessionId,
    p_card_id: cardId,
    p_topic_key: topicKey
  });
}
