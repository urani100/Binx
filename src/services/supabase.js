import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://ttnunlnryjtvnnqvpplb.supabase.co'
const supabaseKey = 'sb_publishable__CQ-Fkl8RvwzAoRSix5gyw_JVuUxSqr'

export const supabase = createClient(supabaseUrl, supabaseKey)
