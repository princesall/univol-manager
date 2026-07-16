// Configuration Supabase
// Remplacez ces valeurs par vos clés Supabase réelles
export const supabaseConfig = {
  url: import.meta.env.VITE_SUPABASE_URL || '',
  anonKey: import.meta.env.VITE_SUPABASE_ANON_KEY || '',
}

// Vérification que les variables d'environnement sont définies
export function checkSupabaseConfig() {
  if (!supabaseConfig.url || !supabaseConfig.anonKey) {
    console.warn(
      'Configuration Supabase manquante. Veuillez définir VITE_SUPABASE_URL et VITE_SUPABASE_ANON_KEY dans votre fichier .env'
    )
    return false
  }
  return true
}
