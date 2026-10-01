import { supabaseClient } from "../services/supabase.js";
import { state } from "../core/state.js";

export function subscribeToPostMortem({ loadPostMortem, render }) {
  const channel = supabaseClient.channel("postmortem-realtime-" + state.retroId);
  state.postMortemRealtimeChannel = channel;

  channel.on("postgres_changes", {
    event: "*",
    schema: "public",
    table: "retro_postmortems",
    filter: `retro_id=eq.${state.retroId}`
  }, async () => {
    await loadPostMortem();
    const editingField = Object.values(state.editingPostMortemFields || {}).some(Boolean);
    if (state.retroType === "post_mortem" && state.step <= 3 && !editingField) render();
  }).subscribe(status => console.log("Realtime post mortem:", status));
}
