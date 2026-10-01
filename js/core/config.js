/** RETROS - Configuración central */

export const SUPABASE_URL = "https://cjhnxghbbblnmumkutyy.supabase.co";
export const SUPABASE_KEY = "sb_publishable_7U9b09ElsfExwu8hzDS49Q_CigP-_1s";

export const urlParams = new URLSearchParams(window.location.search);
export const RETRO_CODE = urlParams.get("retro") || null;

export const MAX_VOTES_PER_PARTICIPANT = 3;

export const TOPIC_STOP_WORDS = new Set([
  "para", "como", "pero", "porque", "cuando", "donde", "desde", "hasta",
  "entre", "sobre", "ante", "hacia", "segun", "tambien", "muy", "mas",
  "menos", "todo", "toda", "todos", "todas", "algo", "nada", "esto",
  "esta", "este", "estas", "estos", "que", "del", "las", "los", "una",
  "uno", "unos", "unas", "con", "sin", "por", "una", "hay", "fue",
  "ser", "son", "era", "eran", "nos", "nosotros", "nuestro", "nuestra",
  "muy", "ya", "se", "su", "sus", "al", "el", "la", "y", "o", "a",
  "en", "de", "un", "es", "me", "te", "le", "lo", "mi", "tu", "para"
]);
