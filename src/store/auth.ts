import { create } from 'zustand'
import type { AppUser, Role } from '@/types'
import { startAutoSync, stopAutoSync } from '@/lib/sync'
import { api, ApiAuthError, ApiOfflineError, hasToken, setToken } from '@/lib/api'
import { estRoleConnu as estRoleConnue } from '@/config/roles'

// ---------------------------------------------------------------------
// REPLI HORS LIGNE — À NE PAS CONFONDRE AVEC L'AUTHENTIFICATION.
//
// La source d'autorité est le serveur : POST /api/auth/login vérifie le
// PIN contre les hachages argon2 de la table `roles_configuration` et
// renvoie un jeton JWT portant le rôle.
//
// Les codes ci-dessous ne servent QUE si le serveur est injoignable,
// afin que l'exploitation puisse continuer sans Internet — c'est la
// raison d'être de l'architecture offline-first (Dexie).
//
// Faiblesse assumée : ces codes restent embarqués dans le binaire client
// (Vite « inline » toute variable VITE_*). À corriger ensuite, en
// mémorisant localement un hachage du PIN validé une première fois en
// ligne, au lieu de comparer des secrets en clair.
//
// Note : les anciennes valeurs codées en dur ('7643', '7494', …) ont été
// retirées — elles étaient présentes dans l'historique Git.
// ---------------------------------------------------------------------
const MOTS_DE_PASSE: Record<Role, string> = {
  admin: import.meta.env.VITE_PIN_ADMIN || '',
  commercial: import.meta.env.VITE_PIN_COMMERCIAL || '',
  technique: import.meta.env.VITE_PIN_TECHNIQUE || '',
  observateur: import.meta.env.VITE_PIN_OBSERVATEUR || '',
}

// Utilisateurs prédéfinis (identité affichée ; le rôle fait foi côté serveur)
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

// `estRoleConnue` est partagé avec la couche de synchronisation, qui en a
// besoin pour lire le rôle depuis la session.

/** Cherche un rôle correspondant au code, dans la table de repli locale. */
function roleDepuisCodeLocal(code: string): Role | null {
  if (!code) return null
  const trouve = Object.entries(MOTS_DE_PASSE).find(
    ([, attendu]) => attendu.length > 0 && attendu === code,
  )
  return (trouve?.[0] as Role | undefined) ?? null
}

interface AuthState {
  user: AppUser | null
  erreur: string | null
  /** Vrai pendant l'appel de connexion (permet de désactiver le bouton). */
  chargement: boolean
  /**
   * Vrai quand la session a été ouverte en repli hors ligne parce que le
   * serveur était injoignable. Les données saisies dans cet état ne sont
   * pas encore validées par le serveur.
   */
  horsLigne: boolean
  connecter: (motDePasse: string) => Promise<boolean>
  deconnecter: () => void
  syncEnabled: boolean
  toggleSync: () => void
}

const userInitial: AppUser | null = JSON.parse(sessionStorage.getItem('univol_user') || 'null')

/** Une session ouverte AVEC jeton serveur permet de synchroniser. */
const synchronisationPossible = () => hasToken()

export const useAuth = create<AuthState>((set) => ({
  user: userInitial,
  erreur: null,
  chargement: false,
  horsLigne: false,
  // Reprise automatique de la synchronisation si un jeton valide est déjà
  // en session (l'utilisateur était connecté au serveur).
  syncEnabled: synchronisationPossible(),

  connecter: async (motDePasse) => {
    set({ erreur: null, chargement: true })

    // -----------------------------------------------------------------
    // 1) Le serveur fait autorité.
    // -----------------------------------------------------------------
    try {
      const { role, token } = await api.login(motDePasse)

      // Refus explicite : ne jamais faire confiance à un rôle inattendu
      // (un défaut silencieux vers 'admin' ouvrirait une élévation de privilèges).
      if (!estRoleConnue(role)) {
        set({
          erreur: 'Rôle inconnu renvoyé par le serveur.',
          chargement: false,
        })
        return false
      }

      setToken(token)
      const user = UTILISATEURS[role]
      sessionStorage.setItem('univol_user', JSON.stringify(user))
      set({ user, erreur: null, chargement: false, horsLigne: false })

      // Synchronisation automatique vers le backend UniVol (toutes les 60 s).
      startAutoSync(60_000)
      set({ syncEnabled: true })

      return true
    } catch (error) {
      // Le serveur a répondu et a refusé → aucun repli local.
      if (!(error instanceof ApiOfflineError)) {
        const message =
          error instanceof ApiAuthError
            ? 'Mot de passe incorrect.'
            : error instanceof Error
              ? error.message
              : 'Connexion impossible.'
        set({ erreur: message, chargement: false })
        return false
      }
      // ApiOfflineError : serveur injoignable → on passe au repli local.
    }

    // -----------------------------------------------------------------
    // 2) Repli hors ligne : le serveur est injoignable.
    // -----------------------------------------------------------------
    const role = roleDepuisCodeLocal(motDePasse)

    if (!role) {
      set({ erreur: 'Mot de passe incorrect.', chargement: false })
      return false
    }

    const user = UTILISATEURS[role]
    sessionStorage.setItem('univol_user', JSON.stringify(user))
    set({
      user,
      erreur: null,
      chargement: false,
      horsLigne: true,
      syncEnabled: false,
    })
    return true
  },

  deconnecter: () => {
    stopAutoSync()
    setToken(null)
    sessionStorage.removeItem('univol_user')
    set({ user: null, syncEnabled: false, horsLigne: false, erreur: null })
  },

  toggleSync: () => {
    // Sans jeton serveur (session ouverte en repli hors ligne), il n'y a
    // rien à synchroniser : il faut d'abord se reconnecter avec le serveur.
    if (!synchronisationPossible()) {
      set({
        erreur: 'Serveur non connecté — reconnectez-vous avec votre PIN pour synchroniser.',
      })
      return
    }
    set((state) => {
      const newState = !state.syncEnabled
      if (newState) {
        startAutoSync(60000)
      } else {
        stopAutoSync()
      }
      return { syncEnabled: newState }
    })
  },
}))

// Le modèle de rôles vit désormais dans src/config/roles.ts : il est partagé
// avec la couche de synchronisation, qui doit filtrer les tables selon le
// rôle connecté (sans quoi un technicien tente de synchroniser des modules
// auxquels il n'a pas accès, et le serveur répond 403).
//
// Réexporté ici pour ne pas casser les imports existants des pages.
export { ROLE_LABELS, ROLE_MODULE_ACCESS } from '@/config/roles'
