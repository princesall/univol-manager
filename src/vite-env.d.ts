/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_SUPABASE_URL: string
  readonly VITE_SUPABASE_ANON_KEY: string
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
