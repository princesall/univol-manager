/// <reference types="vite/client" />

/** Injecté par vite.config.ts depuis package.json */
declare const __APP_VERSION__: string

interface ImportMetaEnv {
  readonly VITE_SUPABASE_URL: string
  readonly VITE_SUPABASE_ANON_KEY: string
  /** Origine du backend UniVol, ex. https://13.140.187.105 (sans /api). */
  readonly VITE_API_URL: string
  /** Codes de repli hors ligne (voir src/store/auth.ts). */
  readonly VITE_PIN_ADMIN: string
  readonly VITE_PIN_COMMERCIAL: string
  readonly VITE_PIN_TECHNIQUE: string
  readonly VITE_PIN_OBSERVATEUR: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}

/** API desktop exposée par electron/preload.cjs (uniquement dans Electron). */
interface UnivolDesktopApi {
  platform: string
  isElectron: true
  checkForUpdates: () => Promise<{ ok: boolean; version?: string | null; message?: string }>
  installUpdate: () => Promise<{ ok: boolean }>
  onUpdateStatus: (
    callback: (payload: {
      status: string
      version?: string
      releaseDate?: string
      percent?: number
      transferred?: number
      total?: number
      bytesPerSecond?: number
      message?: string
    }) => void,
  ) => () => void
}

interface Window {
  univolDesktop?: UnivolDesktopApi
}
