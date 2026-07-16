import { createClient } from '@supabase/supabase-js'
import { supabaseConfig, checkSupabaseConfig } from '@/config/supabase'

let supabaseClient: ReturnType<typeof createClient> | null = null

export function getSupabaseClient() {
  if (!checkSupabaseConfig()) {
    return null
  }

  if (!supabaseClient) {
    supabaseClient = createClient(supabaseConfig.url, supabaseConfig.anonKey)
  }

  return supabaseClient
}

export const supabase = getSupabaseClient()
