/** RETROS - Cliente Supabase */

import { SUPABASE_URL, SUPABASE_KEY } from "../core/config.js";

export const supabaseClient = supabase.createClient(
  SUPABASE_URL,
  SUPABASE_KEY
);
