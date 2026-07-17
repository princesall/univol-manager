import { useEffect, useState } from 'react'
import { Cloud, CloudOff, RefreshCw, AlertCircle } from 'lucide-react'
import clsx from 'clsx'
import { useAuth } from '@/store/auth'
import { manualSync } from '@/lib/sync'
import { getSupabaseClient } from '@/lib/supabase'

export function SyncIndicator() {
  const [online, setOnline] = useState(navigator.onLine)
  const [syncing, setSyncing] = useState(false)
  const [lastSync, setLastSync] = useState<Date | null>(null)
  const [lastError, setLastError] = useState<string | null>(null)
  const { syncEnabled } = useAuth()

  const handleManualSync = async () => {
    if (!syncEnabled || !online) return

    setSyncing(true)
    setLastError(null)
    try {
      const result = await manualSync()
      if (result.success) {
        setLastSync(new Date())
        setLastError(null)
        console.log('Synchronisation réussie:', result)
      } else {
        setLastError(result.errors[0] ?? 'Erreur de synchronisation')
        // Même en cas d'erreurs partielles, on garde l'heure si des rows ont bougé
        if (result.uploaded > 0 || result.downloaded > 0) {
          setLastSync(new Date())
        }
        console.error('Erreur de synchronisation:', result.errors)
      }
    } catch (e) {
      setLastError(e instanceof Error ? e.message : 'Erreur de synchronisation')
    } finally {
      setSyncing(false)
    }
  }

  useEffect(() => {
    const goOnline = () => {
      setOnline(true)
      if (syncEnabled) {
        void handleManualSync()
      }
    }
    const goOffline = () => setOnline(false)
    window.addEventListener('online', goOnline)
    window.addEventListener('offline', goOffline)
    return () => {
      window.removeEventListener('online', goOnline)
      window.removeEventListener('offline', goOffline)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [syncEnabled])

  const supabaseConfigured = getSupabaseClient() !== null

  if (!supabaseConfigured) {
    return (
      <div
        className="flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium bg-ink-900/[0.02] text-ink-700/60"
        title="Supabase non configuré — mode hors ligne uniquement. Définissez VITE_SUPABASE_URL et VITE_SUPABASE_ANON_KEY."
      >
        <CloudOff size={13} />
        Hors ligne
      </div>
    )
  }

  if (!syncEnabled) {
    return (
      <div
        className="flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium bg-yolk-500/15 text-yolk-700 cursor-pointer hover:bg-yolk-500/20"
        title="Cliquez pour activer la synchronisation"
        onClick={() => useAuth.getState().toggleSync()}
      >
        <CloudOff size={13} />
        Sync désactivée
      </div>
    )
  }

  return (
    <div
      className={clsx(
        'flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium cursor-pointer',
        lastError
          ? 'bg-red-500/12 text-red-700 hover:bg-red-500/15'
          : online
            ? 'bg-moss-500/12 text-moss-600 hover:bg-moss-500/15'
            : 'bg-yolk-500/15 text-yolk-700'
      )}
      onClick={handleManualSync}
      title={
        lastError
          ? `Erreur: ${lastError} — cliquez pour réessayer`
          : online
            ? 'Cliquez pour synchroniser maintenant'
            : 'Hors ligne — les données sont enregistrées localement'
      }
    >
      {syncing ? (
        <RefreshCw size={13} className="animate-spin" />
      ) : lastError ? (
        <AlertCircle size={13} />
      ) : online ? (
        <Cloud size={13} />
      ) : (
        <CloudOff size={13} />
      )}
      {syncing
        ? 'Synchronisation…'
        : lastError
          ? 'Erreur sync'
          : online
            ? lastSync
              ? `Sync: ${lastSync.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}`
              : 'Synchronisé'
            : 'Hors ligne'}
    </div>
  )
}
