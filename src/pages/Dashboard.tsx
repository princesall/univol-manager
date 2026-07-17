import { useLiveQuery } from 'dexie-react-hooks'
import { AreaChart, Area, ResponsiveContainer, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts'
import { Egg, TrendingDown, Wallet, PackageCheck, AlertTriangle, Clock } from 'lucide-react'
import { db, filterActive } from '@/lib/db'
import { StatCard, Card, Badge } from '@/components/ui/Primitives'
import { useAuth, ROLE_LABELS } from '@/store/auth'
import { differenceInCalendarDays, format, isSameMonth, subMonths, startOfMonth } from 'date-fns'
import { fr } from 'date-fns/locale'

const MOIS_LABELS = ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Juin', 'Juil', 'Août', 'Sep', 'Oct', 'Nov', 'Déc']

export function Dashboard() {
  const { user } = useAuth()
  const lots = useLiveQuery(() => db.lotsIncubation.toArray().then(filterActive), [])
  const bandes = useLiveQuery(() => db.bandesVolaille.where('statut').equals('en_elevage').toArray().then(filterActive), [])
  const ventes = useLiveQuery(() => db.ventes.toArray().then(filterActive), [])
  const depenses = useLiveQuery(() => db.depenses.toArray().then(filterActive), [])
  const achats = useLiveQuery(() => db.achats.toArray().then(filterActive), [])
  const stockItems = useLiveQuery(() => db.stockItems.toArray().then(filterActive), [])

  const enCours = lots?.filter((l) => l.statut === 'en_cours') ?? []
  const eclos = lots?.filter((l) => l.statut === 'eclos') ?? []

  const totalPoussins = (bandes ?? []).reduce((s, b) => s + b.effectifActuel, 0)

  const caMois = (ventes ?? [])
    .filter((v) => isSameMonth(new Date(v.dateVente), new Date()))
    .reduce((s, v) => s + v.montantTotal, 0)

  const depensesMois = (depenses ?? [])
    .filter((d) => isSameMonth(new Date(d.date), new Date()))
    .reduce((s, d) => s + d.montant, 0)

  // Le résultat net doit inclure les achats (œufs, aliments, matériel) —
  // souvent le plus gros poste de coût — pas seulement les "dépenses"
  // générales, sinon la rentabilité affichée est largement surestimée.
  const achatsMois = (achats ?? [])
    .filter((a) => isSameMonth(new Date(a.date), new Date()))
    .reduce((s, a) => s + a.montant, 0)
  const resultatNetMois = caMois - depensesMois - achatsMois
  const tauxMoyen =
    eclos.length > 0
      ? Math.round(
          (eclos.reduce((s, l) => s + (l.poussinsEclos ?? 0) / l.quantiteOeufs, 0) / eclos.length) * 100
        )
      : 0

  // Calculer les données du graphique d'évolution sur les 6 derniers mois
  const chartData = Array.from({ length: 6 }, (_, i) => {
    const moisIndex = (new Date().getMonth() - 5 + i + 12) % 12
    const moisDate = subMonths(new Date(), 5 - i)
    const debutMois = startOfMonth(moisDate)
    const finMois = new Date(moisDate.getFullYear(), moisDate.getMonth() + 1, 0)

    const lotsDuMois = eclos.filter((l) => {
      const dateEclosion = new Date(l.dateEclosionPrevue)
      return dateEclosion >= debutMois && dateEclosion <= finMois
    })

    const taux =
      lotsDuMois.length > 0
        ? Math.round(
            (lotsDuMois.reduce((s, l) => s + (l.poussinsEclos ?? 0) / l.quantiteOeufs, 0) / lotsDuMois.length) * 100
          )
        : 0

    return { mois: MOIS_LABELS[moisIndex], taux: taux || 0 }
  })

  // Calculer la variation par rapport au mois dernier
  const variationMoisDernier =
    chartData.length >= 2
      ? chartData[chartData.length - 1].taux - chartData[chartData.length - 2].taux
      : 0

  const lotProche = enCours
    .map((l) => ({ ...l, jours: differenceInCalendarDays(new Date(l.dateEclosionPrevue), new Date()) }))
    .sort((a, b) => a.jours - b.jours)[0]

  // Alertes dynamiques
  const ventesImpayees = (ventes ?? []).filter((v) => v.statutPaiement === 'attente' || v.montantPaye < v.montantTotal)
  const stockAliments = (stockItems ?? []).filter((s) => s.categorie === 'aliment')
  const stockCritique = stockAliments.filter((s) => s.quantite < 100) // Seuil arbitraire de 100

  return (
    <div className="space-y-7">
      <div className="flex flex-col items-start gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-ink-700/60">
            {user && ROLE_LABELS[user.role]}
          </p>
          <h1 className="mt-1 font-display text-2xl font-semibold text-ink-950">
            Bonjour, {user?.nom.split(' ')[0]}
          </h1>
        </div>
        <p className="text-sm text-ink-700/60">
          {format(new Date(), "EEEE d MMMM yyyy", { locale: fr })}
        </p>
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-3">
        <StatCard
          label="Lots en incubation"
          value={String(enCours.length)}
          sub={`${enCours.reduce((s, l) => s + l.quantiteOeufs, 0).toLocaleString('fr-FR')} œufs en cours`}
          icon={<Egg size={18} />}
          accent="yolk"
        />
        <StatCard
          label="Taux d'éclosion moyen"
          value={`${tauxMoyen}%`}
          sub="Sur les 4 derniers lots clos"
          icon={<TrendingDown size={18} />}
          accent="moss"
        />
        <StatCard
          label="Effectif au poulailler"
          value={totalPoussins.toLocaleString('fr-FR')}
          sub={`Réparti sur ${(bandes ?? []).length} bande(s) en élevage`}
          icon={<PackageCheck size={18} />}
        />
        <StatCard
          label="Chiffre d'affaires du mois"
          value={`${caMois.toLocaleString('fr-FR')} FCFA`}
          sub="Toutes ventes confondues"
          icon={<Wallet size={18} />}
          accent="moss"
        />
        <StatCard
          label="Résultat net du mois"
          value={`${resultatNetMois.toLocaleString('fr-FR')} FCFA`}
          sub={`Dépenses : ${depensesMois.toLocaleString('fr-FR')} FCFA · Achats : ${achatsMois.toLocaleString('fr-FR')} FCFA`}
          icon={<Wallet size={18} />}
          accent={resultatNetMois >= 0 ? 'moss' : 'clay'}
        />
        <StatCard
          label="Prochaine éclosion"
          value={lotProche ? `${lotProche.jours} j` : '—'}
          sub={lotProche ? lotProche.reference : 'Aucun lot en cours'}
          icon={<Clock size={18} />}
          accent="clay"
        />
      </div>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
        <Card className="col-span-2 p-6">
          <div className="mb-1 flex items-center justify-between">
            <p className="font-display text-base font-semibold text-ink-950">
              Évolution du taux d'éclosion
            </p>
            {variationMoisDernier !== 0 && (
              <Badge tone={variationMoisDernier > 0 ? 'success' : 'danger'}>
                {variationMoisDernier > 0 ? '+' : ''}{variationMoisDernier} pts vs mois dernier
              </Badge>
            )}
          </div>
          <p className="mb-4 text-xs text-ink-700/60">Moyenne mensuelle, tous couvoirs confondus</p>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData} margin={{ left: -20, top: 10 }}>
                <defs>
                  <linearGradient id="tauxGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#E6A22E" stopOpacity={0.35} />
                    <stop offset="100%" stopColor="#E6A22E" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#1D2B2214" vertical={false} />
                <XAxis dataKey="mois" tick={{ fontSize: 12, fill: '#3A4E4099' }} axisLine={false} tickLine={false} />
                <YAxis domain={[80, 100]} tick={{ fontSize: 12, fill: '#3A4E4099' }} axisLine={false} tickLine={false} />
                <Tooltip
                  contentStyle={{ borderRadius: 10, border: '1px solid #1D2B2214', fontSize: 12 }}
                  formatter={(v: number) => [`${v}%`, "Taux d'éclosion"]}
                />
                <Area type="monotone" dataKey="taux" stroke="#C4841D" strokeWidth={2} fill="url(#tauxGradient)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card className="p-6">
          <p className="mb-4 font-display text-base font-semibold text-ink-950">Alertes</p>
          <div className="space-y-3">
            <AlertRow
              severite="attention"
              titre="Éclosion imminente"
              detail={lotProche ? `${lotProche.reference} — dans ${lotProche.jours} jour(s)` : 'Aucune alerte'}
            />
            {stockCritique.length > 0 && (
              <AlertRow
                severite="critique"
                titre="Stock aliment bas"
                detail={`${stockCritique.length} article(s) sous le seuil critique`}
              />
            )}
            {ventesImpayees.length > 0 && (
              <AlertRow
                severite="info"
                titre="Paiement en attente"
                detail={`${ventesImpayees.length} facture(s) client(s) impayée(s)`}
              />
            )}
            {stockCritique.length === 0 && ventesImpayees.length === 0 && (
              <div className="rounded-lg bg-ink-900/[0.02] px-3.5 py-2.5 text-xs text-ink-700/60">
                Aucune alerte active
              </div>
            )}
          </div>
        </Card>
      </div>
    </div>
  )
}

function AlertRow({
  severite,
  titre,
  detail,
}: {
  severite: 'info' | 'attention' | 'critique'
  titre: string
  detail: string
}) {
  const colors = {
    info: 'text-ink-700 bg-ink-900/6',
    attention: 'text-yolk-700 bg-yolk-500/12',
    critique: 'text-signal-red bg-signal-red/10',
  }
  return (
    <div className="flex items-start gap-3 rounded-lg p-2.5 hover:bg-ink-900/[0.02]">
      <div className={`mt-0.5 rounded-full p-1.5 ${colors[severite]}`}>
        <AlertTriangle size={13} />
      </div>
      <div>
        <p className="text-sm font-medium text-ink-900">{titre}</p>
        <p className="text-xs text-ink-700/60">{detail}</p>
      </div>
    </div>
  )
}
