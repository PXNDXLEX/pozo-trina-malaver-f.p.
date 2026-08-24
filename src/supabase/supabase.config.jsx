import {createClient} from '@supabase/supabase-js'

const supabaseUrl = 'https://nhvgvozuaxsahxpfeuyi.supabase.co'

const supabaseAnonKey = 'sb_publishable_Mf7SsOQo4U6zf1-ZfwNXmw_vS5Mhgpl'

export const supabase = createClient(supabaseUrl, supabaseAnonKey)