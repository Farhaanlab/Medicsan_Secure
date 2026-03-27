import { createClient } from "@supabase/supabase-js";

const supabaseUrl = "https://bhctrpzryyeebgshppsa.supabase.co";
const supabaseAnonKey = "sb_publishable_dFGfHHb8uOQw2zBy_barnw_SMW6R74_";

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    detectSessionInUrl: true,
    flowType: 'implicit',
    autoRefreshToken: true,
    persistSession: true,
  },
});
