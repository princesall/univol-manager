import { HashRouter, Routes, Route } from 'react-router-dom'
import { APP_LOCKED } from '@/config/access'
import { Locked } from '@/pages/Locked'
import { Login } from '@/pages/Login'
import { Dashboard } from '@/pages/Dashboard'
import { Couvoir } from '@/pages/Couvoir'
import { Poulailler } from '@/pages/Poulailler'
import { Betail } from '@/pages/Betail'
import { Ventes } from '@/pages/Ventes'
import { Depenses } from '@/pages/Depenses'
import { Achats } from '@/pages/Achats'
import { Stocks } from '@/pages/Stocks'
import { Clients } from '@/pages/Clients'
import { Fournisseurs } from '@/pages/Fournisseurs'
import { Rapports } from '@/pages/Rapports'
import { Journal } from '@/pages/Journal'
import { AppShell } from '@/components/layout/AppShell'
import { ProtectedRoute, ModuleRoute } from '@/components/layout/ProtectedRoute'

export default function App() {
  if (APP_LOCKED) return <Locked />

  return (
    <HashRouter>
      <Routes>
        <Route path="/connexion" element={<Login />} />
        <Route
          element={
            <ProtectedRoute>
              <AppShell />
            </ProtectedRoute>
          }
        >
          <Route path="/" element={<Dashboard />} />
          <Route path="/couvoir" element={<ModuleRoute moduleKey="couvoir"><Couvoir /></ModuleRoute>} />
          <Route path="/poulailler" element={<ModuleRoute moduleKey="poulailler"><Poulailler /></ModuleRoute>} />
          <Route path="/betail" element={<ModuleRoute moduleKey="betail"><Betail /></ModuleRoute>} />
          <Route path="/achats" element={<ModuleRoute moduleKey="achats"><Achats /></ModuleRoute>} />
          <Route path="/depenses" element={<ModuleRoute moduleKey="depenses"><Depenses /></ModuleRoute>} />
          <Route path="/ventes" element={<ModuleRoute moduleKey="ventes"><Ventes /></ModuleRoute>} />
          <Route path="/stocks" element={<ModuleRoute moduleKey="stocks"><Stocks /></ModuleRoute>} />
          <Route path="/clients" element={<ModuleRoute moduleKey="clients"><Clients /></ModuleRoute>} />
          <Route path="/fournisseurs" element={<ModuleRoute moduleKey="fournisseurs"><Fournisseurs /></ModuleRoute>} />
          <Route path="/rapports" element={<ModuleRoute moduleKey="rapports"><Rapports /></ModuleRoute>} />
          <Route path="/journal" element={<ModuleRoute moduleKey="journal"><Journal /></ModuleRoute>} />
          <Route
            path="*"
            element={
              <div className="flex flex-col items-center justify-center rounded-xl2 border border-dashed border-ink-900/15 bg-ink-900/[0.02] px-6 py-20 text-center">
                <p className="font-display text-lg font-semibold text-ink-900">Page introuvable</p>
                <p className="mt-1.5 max-w-sm text-sm text-ink-700/70">
                  Si tu viens d'ouvrir un lien vers une page nouvellement ajoutée, essaie de recharger
                  complètement l'application (Ctrl+Shift+R ou Cmd+Shift+R).
                </p>
              </div>
            }
          />
        </Route>
      </Routes>
    </HashRouter>
  )
}
