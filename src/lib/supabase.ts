import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { supabaseConfig, checkSupabaseConfig } from '@/config/supabase'

// Client non générique (schéma dynamique multi-tables) — évite le type `never` de PostgREST
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AppSupabase = SupabaseClient<any, 'public', any>

let supabaseClient: AppSupabase | null = null

export function getSupabaseClient(): AppSupabase | null {
  if (!checkSupabaseConfig()) {
    return null
  }

  if (!supabaseClient) {
    supabaseClient = createClient(supabaseConfig.url, supabaseConfig.anonKey)
  }

  return supabaseClient
}

export const supabase = getSupabaseClient()
