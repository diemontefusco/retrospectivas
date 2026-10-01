import { supabaseClient } from './supabase.js';

export async function fetchMyRetroFeedback(retroId, sessionId) {
  return await supabaseClient
    .from('retro_feedback')
    .select('id, rating, observaciones, feedback_herramienta')
    .eq('retro_id', retroId)
    .eq('session_id', sessionId)
    .maybeSingle();
}

export async function submitRetroFeedback(retroId, sessionId, rating, observations, toolFeedback) {
  return await supabaseClient.rpc('submit_retro_feedback', {
    p_retro_id: retroId,
    p_session_id: sessionId,
    p_rating: rating,
    p_observaciones: observations,
    p_feedback_herramienta: toolFeedback || null
  });
}

export async function fetchRetroFeedbackSummary(retroId) {
  return await supabaseClient.rpc('get_retro_feedback_summary', { p_retro_id: retroId });
}

export async function fetchToolFeedback() {
  return await supabaseClient
    .from('tool_feedback')
    .select('*')
    .order('created_at', { ascending: false });
}

export async function fetchRetroToolFeedback(retroId) {
  return await supabaseClient
    .from('retro_feedback')
    .select('*')
    .eq('retro_id', retroId)
    .order('created_at', { ascending: false });
}


export async function submitToolFeedback(feedback) {
  return await supabaseClient.rpc('submit_tool_feedback', {
    p_feedback: feedback
  });
}

export async function deleteToolFeedback(feedbackId) {
  return await supabaseClient
    .from('tool_feedback')
    .delete()
    .eq('id', feedbackId);
}

export async function deleteAllToolFeedback() {
  return await supabaseClient
    .from('tool_feedback')
    .delete()
    .not('id', 'is', null);
}

export async function deleteRetroToolFeedback(feedbackId) {
  return await supabaseClient.rpc('admin_delete_retro_tool_feedback', {
    p_feedback_id: feedbackId
  });
}

export async function deleteAllRetroToolFeedback(feedbackItems = []) {
  const results = await Promise.all(
    feedbackItems.map(item => deleteRetroToolFeedback(item.id))
  );
  const failed = results.find(result => result?.error || result?.data?.success !== true);
  if (failed) {
    return { data: null, error: failed.error || new Error('No se pudieron borrar todas las sugerencias de retros.') };
  }
  return { data: { success: true }, error: null };
}
