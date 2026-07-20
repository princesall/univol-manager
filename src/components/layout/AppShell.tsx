import { useState, useEffect } from 'react'
import { NavLink, Outlet, useNavigate, useLocation } from 'react-router-dom'
import {
  LayoutDashboard,
  Egg,
  Bird,
  Beef,
  ShoppingCart,
  Receipt,
  BadgeDollarSign,
  Boxes,
  Users,
  Truck,
  BarChart3,
  ScrollText,
  LogOut,
  Menu,
  X,
} from 'lucide-react'
import clsx from 'clsx'
import { useAuth, ROLE_LABELS, ROLE_MODULE_ACCESS } from '@/store/auth'
import { SyncIndicator } from '@/components/layout/SyncIndicator'
import { UpdateBanner } from '@/components/layout/UpdateBanner'
import { startAutoSync, stopAutoSync } from '@/lib/sync'
import { getSupabaseClient } from '@/lib/supabase'
import { assetUrl } from '@/lib/assets'

const NAV_ITEMS = [
  { key: 'dashboard', to: '/', label: 'Tableau de bord', icon: LayoutDashboard },
  { key: 'couvoir', to: '/couvoir', label: 'Couvoir', icon: Egg },
  { key: 'poulailler', to: '/poulailler', label: 'Poulailler', icon: Bird },
  { key: 'betail', to: '/betail', label: 'Bétail', icon: Beef },
  { key: 'achats', to: '/achats', label: 'Achats', icon: ShoppingCart },
  { key: 'depenses', to: '/depenses', label: 'Dépenses', icon: Receipt },
  { key: 'ventes', to: '/ventes', label: 'Ventes', icon: BadgeDollarSign },
  { key: 'stocks', to: '/stocks', label: 'Stocks', icon: Boxes },
  { key: 'clients', to: '/clients', label: 'Clients', icon: Users },
  { key: 'fournisseurs', to: '/fournisseurs', label: 'Fournisseurs', icon: Truck },
  { key: 'rapports', to: '/rapports', label: 'Rapports', icon: BarChart3 },
  { key: 'journal', to: '/journal', label: "Journal d'activités", icon: ScrollText },
] as const

export function AppShell() {
  const { user, deconnecter, syncEnabled } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [menuOuvert, setMenuOuvert] = useState(false)

  // Synchronisation automatique uniquement si Supabase est configuré et sync activée
  useEffect(() => {
    if (!syncEnabled || !getSupabaseClient()) {
      stopAutoSync()
      return
    }
    startAutoSync(60000)
    return () => stopAutoSync()
  }, [syncEnabled])

  if (!user) return null

  const allowed = ROLE_MODULE_ACCESS[user.role]
  const items = NAV_ITEMS.filter((i) => allowed.includes(i.key))
  const pageActuelle = items.find((i) => (i.to === '/' ? location.pathname === '/' : location.pathname.startsWith(i.to)))

  const sidebarContent = (
    <>
      <div className="flex items-center gap-2.5 px-5 py-6">
        <img src={assetUrl('logo.jpg')} alt="UniVol Mali" className="h-11 w-11 shrink-0 rounded-full object-cover" />
        <div>
          <p className="font-display text-base font-semibold leading-tight">UniVol</p>
          <p className="text-[11px] uppercase tracking-wider text-parchment-100/50">Manager</p>
        </div>
        <button
          onClick={() => setMenuOuvert(false)}
          className="ml-auto rounded-md p-1.5 text-parchment-100/60 hover:bg-parchment-100/10 lg:hidden"
        >
          <X size={18} />
        </button>
      </div>

      <nav className="flex-1 space-y-0.5 overflow-y-auto px-3">
        {items.map(({ key, to, label, icon: Icon }) => (
          <NavLink
            key={key}
            to={to}
            end={to === '/'}
            onClick={() => setMenuOuvert(false)}
            className={({ isActive }) =>
              clsx(
                'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors',
                isActive
                  ? 'bg-parchment-100/10 text-yolk-400'
                  : 'text-parchment-100/65 hover:bg-parchment-100/5 hover:text-parchment-100'
              )
            }
          >
            <Icon size={17} strokeWidth={2} />
            {label}
          </NavLink>
        ))}
      </nav>

      <div className="border-t border-parchment-100/10 p-3">
        <div className="flex items-center gap-3 rounded-lg px-2 py-2">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-yolk-500 text-xs font-semibold text-ink-950">
            {user.nom.split(' ').map((n) => n[0]).join('').slice(0, 2)}
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium">{user.nom}</p>
            <p className="truncate text-[11px] text-parchment-100/50">{ROLE_LABELS[user.role]}</p>
          </div>
          <button
            onClick={() => {
              deconnecter()
              navigate('/connexion')
            }}
            className="shrink-0 rounded-md p-1.5 text-parchment-100/50 hover:bg-parchment-100/10 hover:text-parchment-100"
            title="Se déconnecter"
          >
            <LogOut size={16} />
          </button>
        </div>
      </div>
    </>
  )

  return (
    <div className="flex h-screen bg-parchment-50">
      {/* Sidebar — fixe sur desktop, tiroir sur mobile/tablette */}
      <aside className="hidden w-64 shrink-0 flex-col bg-ink-950 text-parchment-100 lg:flex">
        {sidebarContent}
      </aside>

      {menuOuvert && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div className="absolute inset-0 bg-ink-950/50 backdrop-blur-[1px]" onClick={() => setMenuOuvert(false)} />
          <aside className="absolute inset-y-0 left-0 flex w-72 max-w-[85vw] flex-col bg-ink-950 text-parchment-100 shadow-2xl">
            {sidebarContent}
          </aside>
        </div>
      )}

      {/* Main content */}
      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
        <UpdateBanner />
        <header className="flex items-center justify-between gap-3 border-b border-ink-900/8 bg-parchment-50/80 px-4 py-3.5 backdrop-blur sm:px-6 lg:px-8 lg:py-4">
          <div className="flex min-w-0 items-center gap-3">
            <button
              onClick={() => setMenuOuvert(true)}
              className="shrink-0 rounded-md p-1.5 text-ink-800 hover:bg-ink-900/5 lg:hidden"
              aria-label="Ouvrir le menu"
            >
              <Menu size={20} />
            </button>
            <p className="truncate font-display text-sm font-semibold text-ink-900 lg:hidden">
              {pageActuelle?.label ?? 'UniVol'}
            </p>
          </div>
          <SyncIndicator />
        </header>
        <main className="flex-1 overflow-y-auto px-4 py-5 sm:px-6 lg:px-8 lg:py-7">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
