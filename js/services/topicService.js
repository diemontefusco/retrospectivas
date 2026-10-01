import { supabaseClient } from './supabase.js';

export async function fetchTopics(retroId) {
  return await supabaseClient
    .from('retro_topics')
    .select('id, retro_id, topic_key, label, orden, created_at')
    .eq('retro_id', retroId)
    .order('orden', { ascending: true })
    .order('created_at', { ascending: true });
}


export async function createTopic({ retroId, sessionId, label }) {
  return await supabaseClient.rpc('create_topic', {
    p_retro_id: retroId,
    p_session_id: sessionId,
    p_label: label
  });
}

export async function renameTopic({ retroId, sessionId, topicKey, label, parameterName = 'p_new_label' }) {
  return await supabaseClient.rpc('rename_topic', {
    p_retro_id: retroId,
    p_session_id: sessionId,
    p_topic_key: topicKey,
    [parameterName]: label
  });
}

export async function deleteTopic({ retroId, sessionId, topicKey }) {
  return await supabaseClient.rpc('delete_topic', {
    p_retro_id: retroId,
    p_session_id: sessionId,
    p_topic_key: topicKey
  });
}

export async function reorderTopics({ retroId, sessionId, orders }) {
  return await supabaseClient.rpc('reorder_topics', {
    p_retro_id: retroId,
    p_session_id: sessionId,
    p_orders: orders
  });
}
