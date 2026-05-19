import { createClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || "https://placeholder-project.supabase.co";
const supabaseKey = import.meta.env.VITE_SUPABASE_KEY || "placeholder-key";

let supabase;
try {
  supabase = createClient(supabaseUrl, supabaseKey);
} catch (e) {
  console.error("Supabase initialization error:", e);
  supabase = {};
}

export default supabase;
