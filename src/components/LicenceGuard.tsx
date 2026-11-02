import { useEffect } from 'react'
import { useLicence } from '@/store/licence'
import { Locked } from '@/pages/Locked'
import { assetUrl } from '@/lib/assets'

/**
 * Contrôle d'accès par licence.
 *
 * La vérification est faite avant l'écran de connexion. En cas de suspension
 * ou d'expiration, l'utilisateur ne peut ni se connecter ni utiliser les
 * données locales. L'état est revalidé toutes les 6 heures et au retour
 * d'Internet.
 */
export function LicenceGuard({ children }: { children: React.ReactNode }) {
  const { etat, message, verifier } = useLicence()

  useEffect(() => {
    void verifier()
  }, [verifier])

  useEffect(() => {
    const onOnline = () => {
      void verifier()
    }

    window.addEventListener('online', onOnline)
    const timer = window.setInterval(() => {
      void verifier()
    }, 6 * 60 * 60 * 1000)

    return () => {
      window.removeEventListener('online', onOnline)
      window.clearInterval(timer)
    }
  }, [verifier])

  if (etat === 'inconnu' || etat === 'verification') {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-ink-950 px-6 py-16 text-center">
        <img
          src={assetUrl('logo.jpg')}
          alt="UniVol Mali"
          className="h-14 w-14 rounded-full object-cover"
        />
        <p className="mt-6 text-sm text-parchment-100/70">
          Vérification de la licence…
        </p>
      </div>
    )
  }

  if (etat === 'inactive') {
    return (
      <Locked
        titre="Accès suspendu"
        corps={message}
        onRetry={() => void verifier()}
      />
    )
  }

  return <>{children}</>
}
