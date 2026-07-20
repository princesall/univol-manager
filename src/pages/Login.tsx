import { useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { Lock, ArrowRight, Sparkles } from 'lucide-react'
import { useAuth } from '@/store/auth'
import { Button } from '@/components/ui/Button'
import { assetUrl } from '@/lib/assets'

const APP_VERSION = typeof __APP_VERSION__ !== 'undefined' ? __APP_VERSION__ : '0.0.0'

export function Login() {
  const [motDePasse, setMotDePasse] = useState('')
  const { connecter, erreur } = useAuth()
  const navigate = useNavigate()

  function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (connecter(motDePasse)) navigate('/')
  }

  return (
    <div className="grid min-h-screen grid-cols-1 lg:grid-cols-5">
      {/* Left — brand panel */}
      <div className="relative hidden overflow-hidden bg-ink-950 lg:col-span-2 lg:flex lg:flex-col lg:justify-between lg:p-10">
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.07]"
          style={{
            backgroundImage:
              'radial-gradient(circle at 20% 20%, white 1px, transparent 1px)',
            backgroundSize: '28px 28px',
          }}
        />
        <div className="relative flex items-center gap-2.5">
          <img src={assetUrl('logo.jpg')} alt="UniVol Mali" className="h-12 w-12 rounded-full object-cover" />
          <p className="font-display text-lg font-semibold text-parchment-50">UniVol Manager</p>
        </div>

        <div className="relative">
          <p className="font-display text-3xl font-medium leading-snug text-parchment-50">
            Du couvoir au marché,<br />chaque lot compte.
          </p>
          <p className="mt-4 max-w-sm text-sm leading-relaxed text-parchment-100/60">
            Suivi des incubations, du poulailler, des ventes et des stocks — centralisé,
            fiable, disponible même sans connexion.
          </p>
        </div>

        <p className="relative text-xs text-parchment-100/40">
          UniVol Mali — Bamako · v{APP_VERSION}
        </p>
      </div>

      {/* Right — form */}
      <div className="col-span-1 flex items-center justify-center px-6 py-16 lg:col-span-3">
        <div className="w-full max-w-sm">
          <div className="mb-8 lg:hidden">
            <div className="mb-3 inline-flex items-center gap-2">
              <img src={assetUrl('logo.jpg')} alt="UniVol Mali" className="h-9 w-9 rounded-full object-cover" />
              <p className="font-display text-lg font-semibold">UniVol Manager</p>
            </div>
          </div>

          {/* Message de bienvenue — visible pour confirmer version / mise à jour */}
          <div className="mb-5 flex items-start gap-2.5 rounded-xl border border-yolk-500/25 bg-yolk-500/10 px-3.5 py-3">
            <Sparkles size={16} className="mt-0.5 shrink-0 text-yolk-600" aria-hidden />
            <div className="min-w-0">
              <p className="text-sm font-semibold text-ink-950">
                Bienvenue sur UniVol Manager
              </p>
              <p className="mt-0.5 text-xs leading-relaxed text-ink-700/75">
                Gestion couvoir, poulailler et stocks — UniVol Mali.
                {' '}
                <span className="font-medium text-ink-900">Version {APP_VERSION}</span>
              </p>
            </div>
          </div>

          <h1 className="font-display text-2xl font-semibold text-ink-950">Connexion</h1>
          <p className="mt-1.5 text-sm text-ink-700/70">
            Entrez votre mot de passe pour accéder à votre espace.
          </p>

          <form onSubmit={handleSubmit} className="mt-7 space-y-4">
            <div>
              <label className="mb-1.5 block text-xs font-medium text-ink-800">Mot de passe</label>
              <div className="flex items-center gap-2.5 rounded-lg border border-ink-900/12 bg-white px-3.5 py-2.5 focus-within:border-yolk-500 focus-within:ring-2 focus-within:ring-yolk-500/20">
                <Lock size={16} className="text-ink-700/40" />
                <input
                  type="password"
                  required
                  value={motDePasse}
                  onChange={(e) => setMotDePasse(e.target.value)}
                  placeholder="••••"
                  className="w-full bg-transparent text-sm outline-none placeholder:text-ink-700/35"
                  maxLength={4}
                />
              </div>
            </div>

            {erreur && (
              <p className="rounded-lg bg-signal-red/8 px-3.5 py-2.5 text-xs font-medium text-signal-red">
                {erreur}
              </p>
            )}

            <Button type="submit" className="w-full">
              Se connecter <ArrowRight size={15} />
            </Button>
          </form>
        </div>
      </div>
    </div>
  )
}
