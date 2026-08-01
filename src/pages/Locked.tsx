import { Lock } from 'lucide-react'
import { assetUrl } from '@/lib/assets'
import { LOCK_MESSAGE } from '@/config/access'

const APP_VERSION = typeof __APP_VERSION__ !== 'undefined' ? __APP_VERSION__ : '0.0.0'

export function Locked() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-ink-950 px-6 py-16 text-center">
      <img src={assetUrl('logo.jpg')} alt="UniVol Mali" className="h-14 w-14 rounded-full object-cover" />

      <div className="mt-6 flex h-12 w-12 items-center justify-center rounded-full bg-signal-red/15">
        <Lock size={20} className="text-signal-red" />
      </div>

      <h1 className="mt-5 font-display text-xl font-semibold text-parchment-50">
        {LOCK_MESSAGE.titre}
      </h1>
      <p className="mt-3 max-w-md text-sm leading-relaxed text-parchment-100/70">
        {LOCK_MESSAGE.corps}
      </p>

      <p className="mt-10 text-xs text-parchment-100/30">UniVol Manager · v{APP_VERSION}</p>
    </div>
  )
}
