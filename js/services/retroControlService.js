import { supabaseClient } from "./supabase.js";

export async function resetRetro(retroId, sessionId) {
  return await supabaseClient.rpc("reset_retro", {
    p_retro_id: retroId,
    p_session_id: sessionId
  });
}

export async function claimFacilitator(retroId, sessionId) {
  return await supabaseClient.rpc("claim_facilitator", {
    p_retro_id: retroId,
    p_session_id: sessionId
  });
}

export async function releaseFacilitator(retroId, sessionId) {
  return await supabaseClient.rpc("release_facilitator", {
    p_retro_id: retroId,
    p_session_id: sessionId
  });
}

export async function startRetro(retroId, sessionId) {
  return await supabaseClient.rpc("start_retro", {
    p_retro_id: retroId,
    p_session_id: sessionId
  });
}

export async function markRetroStarted(retroId, sessionId) {
  return await supabaseClient.rpc("mark_retro_started", {
    p_retro_id: retroId,
    p_session_id: sessionId
  });
}

export async function validateGuidingQuestionsAnswered(retroId) {
  return await supabaseClient.rpc("validate_guiding_questions_answered", {
    p_retro_id: retroId
  });
}

export async function advanceRetroStep(retroId, sessionId) {
  return await supabaseClient.rpc("advance_retro", {
    p_retro_id: retroId,
    p_session_id: sessionId
  });
}

export async function markRetroFinished(retroId, sessionId) {
  return await supabaseClient.rpc("mark_retro_finished", {
    p_retro_id: retroId,
    p_session_id: sessionId
  });
}


export async function previousRetroStep(retroId, sessionId) {
  return await supabaseClient.rpc("previous_retro_step", {
    p_retro_id: retroId,
    p_session_id: sessionId
  });
}
