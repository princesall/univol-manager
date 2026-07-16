import { create } from 'zustand'
import type { AppUser, Role } from '@/types'
import { getSupabaseClient } from '@/lib/supabase'
import { startAutoSync } from '@/lib/sync'

// Mots de passe prédéfinis par rôle
const MOTS_DE_PASSE: Record<Role, string> = {
  admin: '7643',
  commercial: '7494',
  technique: '7009',
  observateur: '7959',
}

// Utilisateurs prédéfinis
const UTILISATEURS: Record<Role, AppUser> = {
  admin: {
    id: 'u_admin',
    nom: 'Administrateur',
    email: 'admin@univol.ml',
    role: 'admin',
    actif: true,
  },
  commercial: {
    id: 'u_commercial',
    nom: 'Gestionnaire Commercial',
    email: 'commercial@univol.ml',
    role: 'commercial',
    actif: true,
  },
  technique: {
    id: 'u_technique',
    nom: 'Gestionnaire Technique',
    email: 'technique@univol.ml',
    role: 'technique',
    actif: true,
  },
  observateur: {
    id: 'u_observateur',
    nom: 'Observateur',
    email: 'observateur@univol.ml',
    role: 'observateur',
    actif: true,
  },
}

interface AuthState {
  user: AppUser | null
  erreur: string | null
  connecter: (motDePasse: string) => boolean
  deconnecter: () => void
  syncEnabled: boolean
  toggleSync: () => void
}

export const useAuth = create<AuthState>((set) => ({
  user: JSON.parse(sessionStorage.getItem('univol_user') || 'null'),
  erreur: null,
  syncEnabled: false,
  connecter: (motDePasse) => {
    const role = Object.entries(MOTS_DE_PASSE).find(([_, mdp]) => mdp === motDePasse)?.[0] as Role
    if (!role) {
      set({ erreur: 'Mot de passe incorrect.' })
      return false
    }
    const user = UTILISATEURS[role]
    sessionStorage.setItem('univol_user', JSON.stringify(user))
    set({ user, erreur: null })

    // Démarrer la synchronisation si Supabase est configuré
    const supabase = getSupabaseClient()
    if (supabase) {
      startAutoSync(60000) // Synchronisation toutes les 60 secondes
      set({ syncEnabled: true })
    }

    return true
  },
  deconnecter: () => {
    sessionStorage.removeItem('univol_user')
    set({ user: null, syncEnabled: false })
  },
  toggleSync: () => {
    const supabase = getSupabaseClient()
    if (!supabase) {
      set({ erreur: 'Supabase n\'est pas configuré' })
      return
    }
    set((state) => {
      const newState = !state.syncEnabled
      if (newState) {
        startAutoSync(60000)
      }
      return { syncEnabled: newState }
    })
  },
}))

export const ROLE_LABELS: Record<Role, string> = {
  admin: 'Administrateur',
  commercial: 'Gestionnaire Commercial',
  technique: 'Gestionnaire Technique',
  observateur: 'Observateur',
}

export const ROLE_MODULE_ACCESS: Record<Role, string[]> = {
  admin: ['dashboard', 'couvoir', 'poulailler', 'betail', 'achats', 'depenses', 'ventes', 'stocks', 'clients', 'fournisseurs', 'rapports', 'journal'],
  commercial: ['dashboard', 'achats', 'depenses', 'ventes', 'stocks', 'clients', 'fournisseurs'],
  technique: ['dashboard', 'couvoir', 'poulailler', 'betail', 'stocks'],
  observateur: ['dashboard', 'rapports'],
}
