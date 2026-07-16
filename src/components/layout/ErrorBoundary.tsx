import { Component, type ErrorInfo, type ReactNode } from 'react'
import { AlertTriangle, RefreshCw } from 'lucide-react'

interface Props {
  children: ReactNode
}

interface State {
  erreur: Error | null
}

/**
 * Filet de sécurité global : si un composant plante pendant le rendu
 * (bug, donnée inattendue, cache obsolète après une mise à jour…), on
 * affiche un message clair avec un bouton de rechargement plutôt qu'une
 * page blanche silencieuse — beaucoup plus facile à diagnostiquer et à
 * résoudre pour l'utilisateur.
 */
export class ErrorBoundary extends Component<Props, State> {
  state: State = { erreur: null }

  static getDerivedStateFromError(erreur: Error): State {
    return { erreur }
  }

  componentDidCatch(erreur: Error, info: ErrorInfo) {
    console.error('Erreur applicative interceptée :', erreur, info.componentStack)
  }

  render() {
    if (this.state.erreur) {
      return (
        <div className="flex min-h-screen flex-col items-center justify-center bg-parchment-50 px-6 text-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-signal-red/10 text-signal-red">
            <AlertTriangle size={26} />
          </div>
          <p className="mt-5 font-display text-xl font-semibold text-ink-950">Une erreur est survenue</p>
          <p className="mt-2 max-w-md text-sm text-ink-700/70">
            Si ceci se produit juste après une mise à jour de l'application, un rechargement complet résout
            généralement le problème (l'ancienne version en cache est alors remplacée).
          </p>
          <button
            onClick={() => window.location.reload()}
            className="mt-6 inline-flex items-center gap-2 rounded-lg bg-yolk-500 px-4 py-2.5 text-sm font-medium text-ink-950 hover:bg-yolk-400"
          >
            <RefreshCw size={15} /> Recharger l'application
          </button>
          {this.state.erreur.message && (
            <p className="mt-6 max-w-md break-words rounded-lg bg-ink-900/[0.03] px-3.5 py-2.5 font-mono-data text-[11px] text-ink-700/60">
              {this.state.erreur.message}
            </p>
          )}
        </div>
      )
    }
    return this.props.children
  }
}
