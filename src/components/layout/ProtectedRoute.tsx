import { type ReactNode } from 'react'
import { Navigate } from 'react-router-dom'
import { useAuth, ROLE_MODULE_ACCESS } from '@/store/auth'

export function ProtectedRoute({ children }: { children: ReactNode }) {
  const { user } = useAuth()
  if (!user) return <Navigate to="/connexion" replace />
  return <>{children}</>
}

export function ModuleRoute({ moduleKey, children }: { moduleKey: string; children: ReactNode }) {
  const { user } = useAuth()
  if (!user) return <Navigate to="/connexion" replace />
  if (!ROLE_MODULE_ACCESS[user.role].includes(moduleKey)) {
    return (
      <div className="flex flex-col items-center justify-center rounded-xl2 border border-dashed border-ink-900/15 bg-ink-900/[0.02] px-6 py-20 text-center">
        <p className="font-display text-lg font-semibold text-ink-900">Accès non autorisé</p>
        <p className="mt-1.5 max-w-sm text-sm text-ink-700/70">
          Votre rôle ne dispose pas des permissions nécessaires pour consulter ce module.
        </p>
      </div>
    )
  }
  return <>{children}</>
}
