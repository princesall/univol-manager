import { useMemo, useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend } from 'recharts'
import { format, subMonths, isSameMonth } from 'date-fns'
import { fr } from 'date-fns/locale'
import { FileText, TrendingUp, Egg, Boxes } from 'lucide-react'
import { db } from '@/lib/db'
import { Card, Badge, StatCard } from '@/components/ui/Primitives'
import { Button } from '@/components/ui/Button'

export function Rapports() {
  const lots = useLiveQuery(() => db.lotsIncubation.toArray(), [])
  const ventes = useLiveQuery(() => db.ventes.toArray(), [])
  const depenses = useLiveQuery(() => db.depenses.toArray(), [])
  const achats = useLiveQuery(() => db.achats.toArray(), [])
  const stockItems = useLiveQuery(() => db.stockItems.toArray(), [])
  const [exportEnCours, setExportEnCours] = useState<'production' | 'financier' | null>(null)

  const clos = (lots ?? []).filter((l) => l.statut === 'eclos')
  const tauxMoyen =
    clos.length > 0
      ? Math.round((clos.reduce((s, l) => s + (l.poussinsEclos ?? 0) / l.quantiteOeufs, 0) / clos.length) * 100)
      : 0

  const dataFinanciere = useMemo(() => {
    const mois = Array.from({ length: 6 }).map((_, i) => subMonths(new Date(), 5 - i))
    return mois.map((m) => ({
      mois: format(m, 'MMM', { locale: fr }),
      ventes: (ventes ?? []).filter((v) => isSameMonth(new Date(v.dateVente), m)).reduce((s, v) => s + v.montantTotal, 0),
      depenses: (depenses ?? []).filter((d) => isSameMonth(new Date(d.date), m)).reduce((s, d) => s + d.montant, 0),
      achats: (achats ?? []).filter((a) => isSameMonth(new Date(a.date), m)).reduce((s, a) => s + a.montant, 0),
    }))
  }, [ventes, depenses, achats])

  const caTotal = (ventes ?? []).reduce((s, v) => s + v.montantTotal, 0)
  const depensesTotal = (depenses ?? []).reduce((s, d) => s + d.montant, 0)
  // Le résultat net doit intégrer les achats (œufs, aliments, matériel),
  // pas seulement les dépenses générales — sinon la rentabilité affichée
  // est largement surestimée.
  const achatsTotal = (achats ?? []).reduce((s, a) => s + a.montant, 0)
  const resultatNet = caTotal - depensesTotal - achatsTotal

  const LABEL_STATUT: Record<string, string> = { paye: 'Payé', partiel: 'Partiel', attente: 'En attente' }

  async function exporterProduction() {
    setExportEnCours('production')
    try {
      const { exporterRapportProductionWord } = await import('@/lib/wordReport')
      await exporterRapportProductionWord(
        (lots ?? []).map((l) => ({
          reference: l.reference,
          dateMiseEnCouveuse: format(new Date(l.dateMiseEnCouveuse), 'dd/MM/yyyy'),
          dateEclosion: l.dateEclosionReelle ? format(new Date(l.dateEclosionReelle), 'dd/MM/yyyy') : '—',
          oeufs: l.quantiteOeufs,
          poussinsEclos: l.poussinsEclos ?? '—',
          tauxEclosion: l.poussinsEclos ? Math.round((l.poussinsEclos / l.quantiteOeufs) * 100) : '—',
        })),
        tauxMoyen,
        clos.length
      )
    } finally {
      setExportEnCours(null)
    }
  }

  async function exporterFinancier() {
    setExportEnCours('financier')
    try {
      const { exporterRapportFinancierWord } = await import('@/lib/wordReport')
      const lignes = [
        ...(ventes ?? []).map((v) => ({
          type: 'Vente' as const,
          reference: v.reference,
          tiers: v.clientNom,
          montant: v.montantTotal,
          statut: LABEL_STATUT[v.statutPaiement] ?? v.statutPaiement,
          date: format(new Date(v.dateVente), 'dd/MM/yyyy'),
        })),
        ...(achats ?? []).map((a) => ({
          type: 'Achat' as const,
          reference: a.reference,
          tiers: a.fournisseurNom,
          montant: a.montant,
          statut: LABEL_STATUT[a.statutPaiement] ?? a.statutPaiement,
          date: format(new Date(a.date), 'dd/MM/yyyy'),
        })),
        ...(depenses ?? []).map((d) => ({
          type: 'Dépense' as const,
          reference: d.reference,
          tiers: d.description,
          montant: d.montant,
          statut: '—',
          date: format(new Date(d.date), 'dd/MM/yyyy'),
        })),
      ]
      await exporterRapportFinancierWord(lignes, {
        ventes: caTotal,
        depenses: depensesTotal,
        achats: achatsTotal,
        net: resultatNet,
      })
    } finally {
      setExportEnCours(null)
    }
  }

  return (
    <div className="space-y-7">
      <div>
        <h1 className="font-display text-2xl font-semibold text-ink-950">Rapports & statistiques</h1>
        <p className="mt-1 text-sm text-ink-700/60">Vue consolidée de la production, des finances et des stocks.</p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard label="Taux d'éclosion moyen" value={`${tauxMoyen}%`} sub={`Sur ${clos.length} lot(s) clos`} icon={<Egg size={18} />} accent="yolk" />
        <StatCard label="Résultat net cumulé" value={`${resultatNet.toLocaleString('fr-FR')} FCFA`} sub="Ventes moins dépenses et achats, depuis le début" icon={<TrendingUp size={18} />} accent={resultatNet >= 0 ? 'moss' : 'clay'} />
        <StatCard label="Articles en stock" value={String((stockItems ?? []).length)} sub="Aliments et matériel suivis" icon={<Boxes size={18} />} />
      </div>

      <Card className="p-6">
        <div className="mb-1 flex items-center justify-between">
          <p className="font-display text-base font-semibold text-ink-950">Ventes, Dépenses et Achats (6 derniers mois)</p>
          <Button size="sm" variant="secondary" onClick={exporterFinancier} disabled={exportEnCours === 'financier'}>
            <FileText size={13} /> {exportEnCours === 'financier' ? 'Génération…' : 'Exporter en Word'}
          </Button>
        </div>
        <p className="mb-4 text-xs text-ink-700/60">Comparaison mensuelle du chiffre d'affaires et des charges</p>
        <div className="h-72">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={dataFinanciere} margin={{ left: -10 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1D2B2214" vertical={false} />
              <XAxis dataKey="mois" tick={{ fontSize: 12, fill: '#3A4E4099' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 12, fill: '#3A4E4099' }} axisLine={false} tickLine={false} tickFormatter={(v) => `${v / 1000}k`} />
              <Tooltip
                contentStyle={{ borderRadius: 10, border: '1px solid #1D2B2214', fontSize: 12 }}
                formatter={(v: number) => `${v.toLocaleString('fr-FR')} FCFA`}
              />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              <Bar dataKey="ventes" name="Ventes" fill="#C4841D" radius={[4, 4, 0, 0]} />
              <Bar dataKey="depenses" name="Dépenses" fill="#96432A" radius={[4, 4, 0, 0]} />
              <Bar dataKey="achats" name="Achats" fill="#6E9469" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </Card>

      <Card className="overflow-hidden">
        <div className="flex items-center justify-between border-b border-ink-900/8 bg-ink-900/[0.02] px-5 py-3.5">
          <p className="font-display text-sm font-semibold text-ink-950">Rapport de production — tous les lots</p>
          <Button size="sm" variant="secondary" onClick={exporterProduction} disabled={exportEnCours === 'production'}>
            <FileText size={13} /> {exportEnCours === 'production' ? 'Génération…' : 'Exporter en Word'}
          </Button>
        </div>
        <div className="overflow-x-auto">
<table className="w-full min-w-[640px] text-sm">
          <thead>
            <tr className="border-b border-ink-900/8 text-left text-xs font-medium uppercase tracking-wide text-ink-700/60">
              <th className="px-5 py-3">Lot</th>
              <th className="px-5 py-3">Œufs</th>
              <th className="px-5 py-3">Poussins éclos</th>
              <th className="px-5 py-3">Taux d'éclosion</th>
              <th className="px-5 py-3">Statut</th>
            </tr>
          </thead>
          <tbody>
            {(lots ?? []).map((l) => {
              const taux = l.poussinsEclos ? Math.round((l.poussinsEclos / l.quantiteOeufs) * 100) : null
              return (
                <tr key={l.id} className="border-b border-ink-900/6 last:border-0 hover:bg-ink-900/[0.015]">
                  <td className="px-5 py-3 font-mono-data text-xs font-medium text-ink-900">{l.reference}</td>
                  <td className="px-5 py-3 text-ink-700">{l.quantiteOeufs.toLocaleString('fr-FR')}</td>
                  <td className="px-5 py-3 text-ink-700">{l.poussinsEclos?.toLocaleString('fr-FR') ?? '—'}</td>
                  <td className="px-5 py-3">
                    {taux !== null ? (
                      <Badge tone={taux >= 90 ? 'success' : taux >= 80 ? 'warning' : 'danger'}>{taux}%</Badge>
                    ) : (
                      <span className="text-ink-700/40">—</span>
                    )}
                  </td>
                  <td className="px-5 py-3">
                    <Badge tone={l.statut === 'eclos' ? 'success' : 'info'}>{l.statut === 'eclos' ? 'Éclos' : 'En cours'}</Badge>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
</div>
      </Card>
    </div>
  )
}
