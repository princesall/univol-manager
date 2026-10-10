import { apiConfig, checkApiConfig } from '@/config/api'

/**
 * Client HTTP du backend UniVol (Fastify + JWT).
 *
 * Principe offline-first : ce module ne stocke AUCUNE donnée métier.
 * Il transporte. Dexie reste la source locale de vérité ; toute erreur
 * réseau se traduit par une `ApiOfflineError` que l'appelant peut
 * intercepter pour continuer à travailler hors ligne plutôt que de
 * bloquer la saisie de l'utilisateur.
 *
 * Les réponses du serveur sont en `snake_case` (colonnes PostgreSQL).
 * La conversion vers le `camelCase` des types Dexie appartient à la
 * couche de synchronisation, pas à ce transport.
 */

/** Le serveur est injoignable (réseau coupé, DNS, TLS, CORS, délai dépassé). */
export class ApiOfflineError extends Error {
  constructor(message = 'Serveur injoignable.') {
    super(message)
    this.name = 'ApiOfflineError'
  }
}

/** 401 : jeton absent, expiré ou invalide. Le jeton local est effacé. */
export class ApiAuthError extends Error {
  constructor(message = 'Session invalide ou expirée.') {
    super(message)
    this.name = 'ApiAuthError'
  }
}

/** Erreur métier renvoyée par l'API (400, 403, 404, 409, 500…). */
export class ApiError extends Error {
  readonly status: number

  constructor(status: number, message: string) {
    super(message)
    this.name = 'ApiError'
    this.status = status
  }
}

const TOKEN_KEY = 'univol_api_token'

let token: string | null = sessionStorage.getItem(TOKEN_KEY)

export function getToken(): string | null {
  return token
}

export function hasToken(): boolean {
  return Boolean(token)
}

export function setToken(value: string | null): void {
  token = value
  if (value) sessionStorage.setItem(TOKEN_KEY, value)
  else sessionStorage.removeItem(TOKEN_KEY)
}

interface Envelope<T> {
  success: boolean
  message?: string
  count?: number
  data?: T
}

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  if (!checkApiConfig()) {
    throw new ApiOfflineError("VITE_API_URL n'est pas configuré.")
  }

  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), apiConfig.timeoutMs)

  let response: Response
  try {
    response = await fetch(`${apiConfig.baseUrl}${path}`, {
      ...init,
      signal: controller.signal,
      headers: {
        Accept: 'application/json',
        // Uniquement quand il y a un corps : garde les GET « simples »
        // et évite un pré-vol CORS inutile.
        ...(init.body ? { 'Content-Type': 'application/json' } : {}),
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...(init.headers ?? {}),
      },
    })
  } catch {
    // AbortError (délai), erreur DNS, TLS, réseau coupé, blocage CORS :
    // dans tous ces cas l'appelant doit retomber en mode hors ligne.
    throw new ApiOfflineError()
  } finally {
    clearTimeout(timer)
  }

  let payload: Envelope<T> | null = null
  try {
    payload = (await response.json()) as Envelope<T>
  } catch {
    payload = null
  }

  if (response.status === 401) {
    setToken(null)
    throw new ApiAuthError(payload?.message ?? 'PIN ou session invalide.')
  }

  if (!response.ok || payload?.success === false) {
    throw new ApiError(
      response.status,
      payload?.message ?? `Erreur serveur (${response.status}).`,
    )
  }

  // Le serveur répond soit { success, data }, soit un objet brut (/health).
  if (payload && typeof payload === 'object' && 'data' in payload && payload.data !== undefined) {
    return payload.data
  }
  return payload as unknown as T
}

const send = (method: string, body: unknown): RequestInit => ({
  method,
  body: JSON.stringify(body),
})

/** Fabrique les 4 opérations standard d'une ressource (vos routes CRUD). */
function resource(collectionPath: string) {
  return {
    list: <T = unknown>() => request<T[]>(collectionPath),
    create: <T = unknown>(body: unknown) => request<T>(collectionPath, send('POST', body)),
    update: <T = unknown>(id: string, body: unknown) =>
      request<T>(`${collectionPath}/${encodeURIComponent(id)}`, send('PUT', body)),
    remove: (id: string) =>
      request<unknown>(`${collectionPath}/${encodeURIComponent(id)}`, { method: 'DELETE' }),
  }
}

const enc = encodeURIComponent

export const api = {
  /** GET /health — diagnostic, sans authentification. */
  health: () => request<{ status: string; service: string }>('/health'),

  /** POST /api/auth/login — renvoie le rôle et le jeton JWT. */
  login: (pin: string) =>
    request<{ role: string; token: string }>('/api/auth/login', send('POST', { pin })),

  clients: resource('/api/clients'),
  fournisseurs: resource('/api/fournisseurs'),
  achats: resource('/api/achats'),
  depenses: resource('/api/depenses'),
  ventes: resource('/api/ventes'),

  /** Couvoir — lots d'incubation (table `lots_incubation`). */
  couvoir: {
    ...resource('/api/couvoir'),
    detail: <T = unknown>(id: string) => request<T>(`/api/couvoir/${enc(id)}`),
    mirage1: (id: string, body: { date_mirage1?: string; quantite_apres_mirage1: number }) =>
      request<unknown>(`/api/couvoir/${enc(id)}/mirage1`, send('POST', body)),
    mirage2: (id: string, body: { date_mirage2?: string; quantite_apres_mirage2: number }) =>
      request<unknown>(`/api/couvoir/${enc(id)}/mirage2`, send('POST', body)),
    eclosion: (
      id: string,
      body: {
        date_eclosion_reelle?: string
        poussins_eclos: number
        oeufs_infeconds: number
        mortalite_embryonnaire: number
      },
    ) => request<unknown>(`/api/couvoir/${enc(id)}/eclosion`, send('POST', body)),
  },

  /**
   * Stocks — articles et mouvements.
   * Attention : `POST /api/stocks/:id/mouvements` met à jour la quantité
   * côté serveur dans une transaction. Ne jamais appeler `update` pour
   * changer une quantité : la route PUT ne l'accepte pas (par conception).
   */
  stocks: {
    ...resource('/api/stocks'),
    detail: <T = unknown>(id: string) => request<T>(`/api/stocks/${enc(id)}`),
    allMouvements: <T = unknown>() => request<T[]>('/api/stocks/mouvements'),
    mouvements: <T = unknown>(stockItemId: string) =>
      request<T[]>(`/api/stocks/${enc(stockItemId)}/mouvements`),
    createMouvement: <T = unknown>(
      stockItemId: string,
      body: {
        type: 'entree' | 'sortie'
        source: string
        quantite: number
        date?: string
        notes?: string | null
        motif?: string | null
      },
    ) => request<T>(`/api/stocks/${enc(stockItemId)}/mouvements`, send('POST', body)),
  },
}

/**
 * Contrat d'API côté client — état vérifié le 10 octobre 2026 sur le
 * backend déployé (les 15 tables métier ont désormais leurs routes).
 *
 * À NOTER :
 *   - `stock_mouvements` n'a pas de route CRUD générique. Les mouvements
 *     ne sont donc PAS poussés vers le serveur (voir src/lib/sync.ts) :
 *     la route existante `POST /api/stocks/:id/mouvements` modifie aussi
 *     la quantité en stock, ce qui produirait un double comptage.
 *   - `GET /api/stocks` renvoie une liste de colonnes explicite (sans
 *     `supprime_le`) et n'accepte pas le filtre `?depuis=`.
 *
 * PRÉ-REQUIS SERVEUR (tous satisfaits au 10/10/2026) :
 *   - CORS : origines `null` (Electron en file://), `http://localhost:5173`
 *     (Vite en développement) et l'origine publique.
 *   - CORP : `crossOriginResourcePolicy: 'cross-origin'` pour permettre la
 *     lecture croisée de la réponse.
 */

/**
 * Transport générique, également utilisé par la couche de synchronisation
 * (src/lib/sync.ts) pour les appels dynamiques table par table.
 */
export { request as apiRequest }

