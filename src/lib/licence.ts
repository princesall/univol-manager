import { apiConfig } from '@/config/api'

const CACHE_KEY = 'univol_licence_cache'
const DEVICE_KEY = 'univol_device_id'
const GRACE_MS = 7 * 86_400_000

const APP_VERSION =
  typeof __APP_VERSION__ !== 'undefined' ? __APP_VERSION__ : '0.0.0'

export const ORGANISATION_ID =
  import.meta.env.VITE_ORGANISATION_ID || 'univol-mali'

export interface LicenceEtat {
  actif: boolean
  motif: string
  message: string
  organisation_id?: string
  licence_id?: string
  plan?: string
  date_debut?: string | null
  date_fin?: string | null
  jours_restants?: number
  max_postes?: number
  poste_id?: string
  verifie_le: string
  source: 'api' | 'cache'
}

/** Identifiant stable du poste, conservé dans le stockage local. */
export function getDeviceId(): string {
  try {
    const existing = localStorage.getItem(DEVICE_KEY)
    if (existing) return existing

    const generated =
      typeof globalThis.crypto?.randomUUID === 'function'
        ? globalThis.crypto.randomUUID()
        : `device_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`

    localStorage.setItem(DEVICE_KEY, generated)
    return generated
  } catch {
    return `device_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`
  }
}

function deviceName(): string {
  try {
    const platform = navigator.platform || 'Poste'
    return `${platform} · UniVol ${APP_VERSION}`
  } catch {
    return `Poste · UniVol ${APP_VERSION}`
  }
}

function readCache(): LicenceEtat | null {
  try {
    const raw = localStorage.getItem(CACHE_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as LicenceEtat
    if (!parsed || typeof parsed.actif !== 'boolean') return null
    return parsed
  } catch {
    return null
  }
}

function writeCache(etat: LicenceEtat): void {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify(etat))
  } catch {
    // quota ou stockage indisponible : la vérification en ligne reste la source
  }
}

/**
 * Vérifie la licence auprès du backend.
 *
 * En cas de panne réseau, on accepte le dernier état actif pendant 7 jours
 * maximum, à condition que la date de fin de licence soit encore valide.
 * Sans cache, l'application reste verrouillée : une première activation
 * nécessite Internet.
 */
export async function verifierLicence(): Promise<LicenceEtat> {
  const cached = readCache()

  if (!apiConfig.baseUrl) {
    return offlineState(cached)
  }

  const controller = new AbortController()
  const timer = window.setTimeout(() => controller.abort(), 10_000)

  try {
    const response = await fetch(`${apiConfig.baseUrl}/api/licence/verifier`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        organisation_id: ORGANISATION_ID,
        device_id: getDeviceId(),
        nom_poste: deviceName(),
        version: APP_VERSION,
      }),
      signal: controller.signal,
    })

    const text = await response.text()
    let payload: {
      success?: boolean
      message?: string
      data?: Omit<LicenceEtat, 'source'>
    } | null = null

    try {
      payload = text ? JSON.parse(text) : null
    } catch {
      payload = null
    }

    if (!response.ok || !payload?.success || !payload.data) {
      throw new Error(payload?.message || `Erreur HTTP ${response.status}.`)
    }

    const etat: LicenceEtat = {
      ...payload.data,
      source: 'api',
    }
    writeCache(etat)
    return etat
  } catch {
    return offlineState(cached)
  } finally {
    window.clearTimeout(timer)
  }
}

function offlineState(cached: LicenceEtat | null): LicenceEtat {
  if (cached) {
    const fin = cached.date_fin ? new Date(cached.date_fin).getTime() : 0
    const derniereVerification = new Date(cached.verifie_le).getTime()
    const recent = Date.now() - derniereVerification <= GRACE_MS

    if (cached.actif && fin > Date.now() && recent) {
      return {
        ...cached,
        source: 'cache',
        message: `Mode hors ligne — licence valide jusqu’au ${new Date(
          fin,
        ).toLocaleDateString('fr-FR')}.`,
      }
    }

    if (!cached.actif) {
      return {
        ...cached,
        source: 'cache',
      }
    }
  }

  return {
    actif: false,
    motif: 'hors_ligne',
    message:
      'Impossible de vérifier la licence. Connectez cet ordinateur à Internet pour activer ou vérifier l’application.',
    date_fin: cached?.date_fin ?? null,
    verifie_le: new Date().toISOString(),
    source: 'cache',
  }
}
