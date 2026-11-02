import { Lock, RefreshCw } from 'lucide-react'
import { assetUrl } from '@/lib/assets'
import { LOCK_MESSAGE } from '@/config/access'
import { Button } from '@/components/ui/Button'

const APP_VERSION = typeof __APP_VERSION__ !== 'undefined' ? __APP_VERSION__ : '0.0.0'

export function Locked({
  titre = LOCK_MESSAGE.titre,
  corps = LOCK_MESSAGE.corps,
  onRetry,
  chargement = false,
}: {
  titre?: string
  corps?: string
  onRetry?: () => void
  chargement?: boolean
}) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-ink-950 px-6 py-16 text-center">
      <img src={assetUrl('logo.jpg')} alt="UniVol Mali" className="h-14 w-14 rounded-full object-cover" />

      <div className="mt-6 flex h-12 w-12 items-center justify-center rounded-full bg-signal-red/15">
        <Lock size={20} className="text-signal-red" />
      </div>

      <h1 className="mt-5 font-display text-xl font-semibold text-parchment-50">
        {titre}
      </h1>
      <p className="mt-3 max-w-md text-sm leading-relaxed text-parchment-100/70">
        {corps}
      </p>

      {onRetry ? (
        <Button
          variant="primary"
          className="mt-7"
          chargement={chargement}
          onClick={onRetry}
        >
          <RefreshCw size={15} />
          Réessayer
        </Button>
      ) : null}

      <p className="mt-8 max-w-sm text-xs leading-relaxed text-parchment-100/35">
        La licence est vérifiée auprès du serveur UniVol. Si le problème
        persiste, contactez votre administrateur.
      </p>

      <p className="mt-8 text-xs text-parchment-100/30">UniVol Manager · v{APP_VERSION}</p>
    </div>
  )
}
