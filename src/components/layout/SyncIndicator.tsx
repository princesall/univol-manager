import { useEffect, useState } from 'react'
import { Cloud, CloudOff, RefreshCw } from 'lucide-react'
import clsx from 'clsx'
import { useAuth } from '@/store/auth'
import { manualSync } from '@/lib/sync'
import { getSupabaseClient } from '@/lib/supabase'

export function SyncIndicator() {
  const [online, setOnline] = useState(navigator.onLine)
  const [syncing, setSyncing] = useState(false)
  const [lastSync, setLastSync] = useState<Date | null>(null)
  const { syncEnabled } = useAuth()

  const handleManualSync = async () => {
    if (!syncEnabled || !online) return
    
    setSyncing(true)
    const result = await manualSync()
    setSyncing(false)
    
    if (result.success) {
      setLastSync(new Date())
      console.log('Synchronisation réussie:', result)
    } else {
      console.error('Erreur de synchronisation:', result.errors)
    }
  }

  useEffect(() => {
    const goOnline = () => {
      setOnline(true)
      if (syncEnabled) {
        handleManualSync()
      }
    }
    const goOffline = () => setOnline(false)
    window.addEventListener('online', goOnline)
    window.addEventListener('offline', goOffline)
    return () => {
      window.removeEventListener('online', goOnline)
      window.removeEventListener('offline', goOffline)
    }
  }, [syncEnabled])

  const supabaseConfigured = getSupabaseClient() !== null

  if (!supabaseConfigured) {
    return (
      <div
        className="flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium bg-ink-900/[0.02] text-ink-700/60"
        title="Supabase non configuré — mode hors ligne uniquement"
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
        online ? 'bg-moss-500/12 text-moss-600 hover:bg-moss-500/15' : 'bg-yolk-500/15 text-yolk-700'
      )}
      onClick={handleManualSync}
      title={online ? 'Cliquez pour synchroniser maintenant' : 'Hors ligne — les données sont enregistrées localement'}
    >
      {syncing ? (
        <RefreshCw size={13} className="animate-spin" />
      ) : online ? (
        <Cloud size={13} />
      ) : (
        <CloudOff size={13} />
      )}
      {syncing ? 'Synchronisation…' : online ? lastSync ? `Sync: ${lastSync.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}` : 'Synchronisé' : 'Hors ligne'}
    </div>
  )
}
