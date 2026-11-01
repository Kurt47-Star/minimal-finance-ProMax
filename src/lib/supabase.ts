import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://lxihyplnvsyvxuehrwln.supabase.co'
const supabaseAnonKey = 'sb_publishable_Gl8BTNCVoz2-8rbcWdNGDg_DpA1Iqoj'

export const supabase = createClient(supabaseUrl, supabaseAnonKey)