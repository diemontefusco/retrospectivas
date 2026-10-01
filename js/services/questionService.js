import { supabaseClient } from './supabase.js';

export async function fetchGuidingQuestions(retroId) {
  return await supabaseClient
    .from('preguntas_guia')
    .select('id, retro_id, topic_key, pregunta, respuesta, origen, autor_session_id, orden, created_at')
    .eq('retro_id', retroId)
    .order('orden', { ascending: true })
    .order('created_at', { ascending: true });
}

export async function fetchRetroQuestionAnswers(retroId) {
  return await supabaseClient
    .from('preguntas_guia')
    .select('id, pregunta, respuesta, topic_key, origen, orden, created_at')
    .eq('retro_id', retroId)
    .order('orden', { ascending: true })
    .order('created_at', { ascending: true });
}

export async function createGuidingQuestion({ retroId, sessionId, topicKey, pregunta, origen }) {
  return await supabaseClient.rpc('create_guiding_question', {
    p_retro_id: retroId,
    p_session_id: sessionId,
    p_topic_key: topicKey,
    p_pregunta: pregunta,
    p_origen: origen
  });
}

export async function updateGuidingQuestion({ retroId, sessionId, questionId, pregunta }) {
  return await supabaseClient.rpc('update_guiding_question', {
    p_retro_id: retroId,
    p_session_id: sessionId,
    p_question_id: questionId,
    p_pregunta: pregunta
  });
}

export async function deleteGuidingQuestion({ retroId, sessionId, questionId }) {
  return await supabaseClient.rpc('delete_guiding_question', {
    p_retro_id: retroId,
    p_session_id: sessionId,
    p_question_id: questionId
  });
}

export async function clearAllGuidingQuestions({ retroId, sessionId }) {
  return await supabaseClient.rpc('clear_all_guiding_questions', {
    p_retro_id: retroId,
    p_session_id: sessionId
  });
}

export async function saveGuidingQuestionAnswer({ retroId, sessionId, questionId, respuesta }) {
  return await supabaseClient.rpc('save_guiding_question_answer', {
    p_retro_id: retroId,
    p_session_id: sessionId,
    p_question_id: questionId,
    p_respuesta: respuesta
  });
}
