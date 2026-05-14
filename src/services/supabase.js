import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY

export const supabase = createClient(supabaseUrl, supabaseKey)

// Required headers for all Supabase Edge Function calls
export const edgeFunctionHeaders = {
  'Authorization': `Bearer ${supabaseKey}`,
  'Content-Type': 'application/json'
}
