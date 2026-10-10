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
  HardDriveDownload,
  CloudUpload,
  AlertTriangle,
} from 'lucide-react'
import clsx from 'clsx'
import { useAuth, ROLE_LABELS, ROLE_MODULE_ACCESS } from '@/store/auth'
import { SyncIndicator } from '@/components/layout/SyncIndicator'
import { UpdateBanner } from '@/components/layout/UpdateBanner'
import { ConflitsSync } from '@/components/layout/ConflitsSync'
import { startAutoSync, stopAutoSync, migrationInitiale, surConflits, type Conflit } from '@/lib/sync'
import { exporterDonneesLocales } from '@/lib/backup'
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

  // Synchronisation automatique vers le backend UniVol, quand elle est activée
  useEffect(() => {
    if (!syncEnabled) {
      stopAutoSync()
      return
    }
    startAutoSync(60_000)
    return () => stopAutoSync()
  }, [syncEnabled])

  // -------------------------------------------------------------------
  // Sauvegarde et envoi des données, accessibles par bouton : aucune
  // manipulation de console n'est nécessaire.
  // -------------------------------------------------------------------
  const [sauvegardeEnCours, setSauvegardeEnCours] = useState(false)
  const [envoiEnCours, setEnvoiEnCours] = useState(false)
  const [messageDonnees, setMessageDonnees] = useState<string | null>(null)
  const [conflits, setConflits] = useState<Conflit[]>([])
  const [conflitsOuverts, setConflitsOuverts] = useState(false)

  // Les conflits sont publiés à la fin de chaque cycle de synchronisation.
  useEffect(() => surConflits(setConflits), [])

  async function handleSauvegarder() {
    setSauvegardeEnCours(true)
    setMessageDonnees(null)
    try {
      const resultat = await exporterDonneesLocales()
      setMessageDonnees(
        `Sauvegarde créée : ${resultat.total} enregistrements (${resultat.fichier}). ` +
          'Copiez ce fichier sur une clé USB.',
      )
    } catch (erreur) {
      setMessageDonnees(
        `Échec de la sauvegarde : ${erreur instanceof Error ? erreur.message : String(erreur)}`,
      )
    } finally {
      setSauvegardeEnCours(false)
    }
  }

  async function handleEnvoyer() {
    const confirme = window.confirm(
      'Envoyer TOUTES les données locales vers le serveur ?\n\n' +
        'Cette opération crée ou met à jour les enregistrements sur le VPS. ' +
        'Vos données locales ne sont pas supprimées, mais assurez-vous d’avoir ' +
        'fait une sauvegarde avant de continuer.',
    )
    if (!confirme) return

    setEnvoiEnCours(true)
    setMessageDonnees(null)
    try {
      const resultat = await migrationInitiale()
      setMessageDonnees(
        resultat.errors.length > 0
          ? `Envoi terminé : ${resultat.uploaded} transmis, ${resultat.errors.length} erreur(s). ` +
            `Par table — ${resultat.resume}. Causes — ${resultat.causes}`
          : `Envoi réussi : ${resultat.uploaded} enregistrement(s) transmis au serveur.`,
      )
    } catch (erreur) {
      setMessageDonnees(
        `Échec de l'envoi : ${erreur instanceof Error ? erreur.message : String(erreur)}`,
      )
    } finally {
      setEnvoiEnCours(false)
    }
  }

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

      {/* Sauvegarde et envoi des données — accessibles par simple clic */}
      <div className="space-y-0.5 border-t border-parchment-100/10 px-3 py-3">
        <p className="px-2 pb-1 text-[10px] font-semibold uppercase tracking-wider text-parchment-100/40">
          Données locales
        </p>

        <button
          onClick={handleSauvegarder}
          disabled={sauvegardeEnCours}
          className="flex w-full items-center gap-2.5 rounded-lg px-2 py-2 text-left text-xs font-medium text-parchment-100/70 transition-colors hover:bg-parchment-100/5 hover:text-parchment-100 disabled:opacity-40"
          title="Télécharge un fichier contenant toutes vos données locales"
        >
          <HardDriveDownload size={15} className="shrink-0" />
          <span className="min-w-0 flex-1">
            {sauvegardeEnCours ? 'Sauvegarde en cours…' : 'Sauvegarder sur ce PC'}
          </span>
        </button>

        <button
          onClick={handleEnvoyer}
          disabled={envoiEnCours || !syncEnabled}
          className="flex w-full items-center gap-2.5 rounded-lg px-2 py-2 text-left text-xs font-medium text-parchment-100/70 transition-colors hover:bg-parchment-100/5 hover:text-parchment-100 disabled:opacity-40"
          title={
            syncEnabled
              ? 'Envoie toutes les données locales vers votre serveur'
              : 'Connectez-vous au serveur pour activer cette action'
          }
        >
          <CloudUpload size={15} className="shrink-0" />
          <span className="min-w-0 flex-1">
            {envoiEnCours ? 'Envoi en cours…' : 'Envoyer vers le serveur'}
          </span>
        </button>

        {conflits.length > 0 && (
          <button
            onClick={() => setConflitsOuverts(true)}
            className="flex w-full items-center gap-2.5 rounded-lg px-2 py-2 text-left text-xs font-medium text-yolk-400 transition-colors hover:bg-yolk-500/10"
            title="Voir les enregistrements refusés par le serveur"
          >
            <AlertTriangle size={15} className="shrink-0" />
            <span className="min-w-0 flex-1">
              Voir les {conflits.length} conflit{conflits.length > 1 ? 's' : ''}
            </span>
          </button>
        )}

        {messageDonnees && (
          <p className="max-h-28 overflow-y-auto px-2 pt-1.5 text-[10px] leading-relaxed break-words text-parchment-100/55">
            {messageDonnees}
          </p>
        )}
      </div>

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
      <ConflitsSync open={conflitsOuverts} onClose={() => setConflitsOuverts(false)} />

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
