import { useEffect, useState } from 'react'
import { Download, RefreshCw, X, AlertCircle } from 'lucide-react'
import clsx from 'clsx'

type UpdateStatus =
  | { status: 'idle' }
  | { status: 'checking' }
  | { status: 'available'; version?: string }
  | { status: 'not-available'; version?: string }
  | {
      status: 'downloading'
      percent?: number
      transferred?: number
      total?: number
    }
  | { status: 'downloaded'; version?: string }
  | { status: 'error'; message?: string }

function isElectronDesktop(): boolean {
  return typeof window !== 'undefined' && Boolean(window.univolDesktop?.isElectron)
}

/**
 * Bandeau de mise à jour desktop (Electron uniquement).
 * Invisible dans le navigateur / PWA.
 */
export function UpdateBanner() {
  const [info, setInfo] = useState<UpdateStatus>({ status: 'idle' })
  const [dismissed, setDismissed] = useState(false)
  const [installing, setInstalling] = useState(false)

  useEffect(() => {
    if (!isElectronDesktop() || !window.univolDesktop) return

    const unsub = window.univolDesktop.onUpdateStatus((payload) => {
      setInfo(payload as UpdateStatus)
      // Nouvelle info utile → réafficher le bandeau
      if (
        payload.status === 'available' ||
        payload.status === 'downloading' ||
        payload.status === 'downloaded' ||
        payload.status === 'error'
      ) {
        setDismissed(false)
      }
    })

    return unsub
  }, [])

  if (!isElectronDesktop() || dismissed) return null

  const visible =
    info.status === 'available' ||
    info.status === 'downloading' ||
    info.status === 'downloaded' ||
    info.status === 'error'

  if (!visible) return null

  const handleInstall = async () => {
    if (!window.univolDesktop) return
    setInstalling(true)
    try {
      await window.univolDesktop.installUpdate()
    } catch {
      setInstalling(false)
      setInfo({ status: 'error', message: "Impossible d'installer la mise à jour." })
    }
  }

  const percent =
    info.status === 'downloading' && typeof info.percent === 'number'
      ? Math.min(100, Math.max(0, Math.round(info.percent)))
      : null

  return (
    <div
      className={clsx(
        'flex flex-wrap items-center gap-3 border-b px-4 py-2.5 text-sm sm:px-6 lg:px-8',
        info.status === 'error'
          ? 'border-red-200 bg-red-50 text-red-900'
          : 'border-yolk-500/30 bg-yolk-500/10 text-ink-900',
      )}
      role="status"
    >
      <div className="flex min-w-0 flex-1 items-start gap-2.5">
        {info.status === 'error' ? (
          <AlertCircle size={18} className="mt-0.5 shrink-0 text-red-600" />
        ) : info.status === 'downloaded' ? (
          <RefreshCw size={18} className="mt-0.5 shrink-0 text-yolk-600" />
        ) : (
          <Download size={18} className="mt-0.5 shrink-0 text-yolk-600" />
        )}

        <div className="min-w-0">
          {info.status === 'available' && (
            <p>
              Nouvelle version disponible
              {info.version ? (
                <>
                  {' '}
                  <span className="font-semibold">v{info.version}</span>
                </>
              ) : null}
              . Téléchargement en cours…
            </p>
          )}

          {info.status === 'downloading' && (
            <div className="space-y-1.5">
              <p>
                Téléchargement de la mise à jour
                {percent !== null ? ` — ${percent}%` : '…'}
              </p>
              {percent !== null && (
                <div className="h-1.5 w-full max-w-xs overflow-hidden rounded-full bg-ink-900/10">
                  <div
                    className="h-full rounded-full bg-yolk-500 transition-all duration-300"
                    style={{ width: `${percent}%` }}
                  />
                </div>
              )}
            </div>
          )}

          {info.status === 'downloaded' && (
            <p>
              Mise à jour
              {info.version ? (
                <>
                  {' '}
                  <span className="font-semibold">v{info.version}</span>
                </>
              ) : null}{' '}
              prête. Redémarrez l&apos;application pour l&apos;installer.
            </p>
          )}

          {info.status === 'error' && (
            <p>
              Échec de la mise à jour
              {info.message ? ` : ${info.message}` : '.'}
            </p>
          )}
        </div>
      </div>

      <div className="flex shrink-0 items-center gap-2">
        {info.status === 'downloaded' && (
          <button
            type="button"
            onClick={() => void handleInstall()}
            disabled={installing}
            className="inline-flex items-center gap-1.5 rounded-md bg-ink-900 px-3 py-1.5 text-xs font-semibold text-parchment-50 transition hover:bg-ink-800 disabled:opacity-60"
          >
            <RefreshCw size={14} className={installing ? 'animate-spin' : undefined} />
            {installing ? 'Redémarrage…' : 'Redémarrer maintenant'}
          </button>
        )}

        <button
          type="button"
          onClick={() => setDismissed(true)}
          className="rounded-md p-1.5 text-ink-700/60 transition hover:bg-ink-900/5 hover:text-ink-900"
          aria-label="Masquer la notification"
          title="Masquer"
        >
          <X size={16} />
        </button>
      </div>
    </div>
  )
}
