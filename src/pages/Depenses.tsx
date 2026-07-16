import { useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { format, isSameMonth } from 'date-fns'
import { fr } from 'date-fns/locale'
import { Plus, Receipt, PieChart, TrendingDown, Pencil, Trash2 } from 'lucide-react'
import { db, genId, genReference, logActivity } from '@/lib/db'
import { useAuth } from '@/store/auth'
import { Button } from '@/components/ui/Button'
import { Card, Badge, StatCard, EmptyState } from '@/components/ui/Primitives'
import { Modal, FormField, inputClass } from '@/components/ui/Modal'
import { SearchInput } from '@/components/ui/SearchInput'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import type { CategorieDepense, Depense } from '@/types'
import { PieChart as RPieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts'

const LABEL_CATEGORIE: Record<CategorieDepense, string> = {
  alimentation: 'Alimentation',
  electricite: 'Électricité',
  transport: 'Transport',
  salaires: 'Salaires',
  entretien: 'Entretien',
  autre: 'Autre',
}

const COULEUR_CATEGORIE: Record<CategorieDepense, string> = {
  alimentation: '#C4841D',
  electricite: '#4F7A4A',
  transport: '#96432A',
  salaires: '#28392E',
  entretien: '#6E9469',
  autre: '#3A4E40',
}

export function Depenses() {
  const { user } = useAuth()
  const depenses = useLiveQuery(() => db.depenses.orderBy('date').reverse().toArray(), [])
  const [recherche, setRecherche] = useState('')
  const [modal, setModal] = useState<{ mode: 'creer' } | { mode: 'modifier'; depense: Depense } | null>(null)
  const [depenseASupprimer, setDepenseASupprimer] = useState<Depense | null>(null)

  const peutModifier = user?.role === 'admin' || user?.role === 'commercial'
  const toutes = depenses ?? []
  const q = recherche.trim().toLowerCase()
  const list = q ? toutes.filter((d) => d.description.toLowerCase().includes(q)) : toutes

  const ceMois = toutes.filter((d) => isSameMonth(new Date(d.date), new Date()))
  const totalMois = ceMois.reduce((s, d) => s + d.montant, 0)

  const parCategorie = (Object.keys(LABEL_CATEGORIE) as CategorieDepense[])
    .map((cat) => ({
      name: LABEL_CATEGORIE[cat],
      value: ceMois.filter((d) => d.categorie === cat).reduce((s, d) => s + d.montant, 0),
      color: COULEUR_CATEGORIE[cat],
    }))
    .filter((c) => c.value > 0)

  const categoriePrincipale = [...parCategorie].sort((a, b) => b.value - a.value)[0]

  async function confirmerSuppression() {
    if (!depenseASupprimer) return
    await db.depenses.delete(depenseASupprimer.id)
    await logActivity(user?.nom ?? '', 'Suppression de dépense', depenseASupprimer.description)
    setDepenseASupprimer(null)
  }

  return (
    <div className="space-y-7">
      <div className="flex flex-col items-start gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="font-display text-2xl font-semibold text-ink-950">Dépenses</h1>
          <p className="mt-1 text-sm text-ink-700/60">
            Suivi des charges de l'entreprise par catégorie et par période.
          </p>
        </div>
        {peutModifier && (
          <Button onClick={() => setModal({ mode: 'creer' })}>
            <Plus size={16} /> Nouvelle dépense
          </Button>
        )}
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard
          label="Dépenses du mois"
          value={`${totalMois.toLocaleString('fr-FR')} FCFA`}
          sub={`${ceMois.length} dépense(s) ce mois-ci`}
          icon={<TrendingDown size={18} />}
          accent="clay"
        />
        <StatCard
          label="Catégorie principale"
          value={categoriePrincipale ? categoriePrincipale.name : '—'}
          sub={categoriePrincipale ? `${categoriePrincipale.value.toLocaleString('fr-FR')} FCFA ce mois-ci` : 'Aucune dépense'}
          icon={<PieChart size={18} />}
        />
        <StatCard
          label="Total enregistré"
          value={String(toutes.length)}
          sub="Depuis le début"
          icon={<Receipt size={18} />}
          accent="yolk"
        />
      </div>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
        <Card className="p-6 lg:col-span-2">
          <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="font-display text-base font-semibold text-ink-950">Historique</p>
            {toutes.length > 0 && (
              <SearchInput value={recherche} onChange={setRecherche} placeholder="Rechercher…" />
            )}
          </div>
          {toutes.length === 0 ? (
            <EmptyState
              title="Aucune dépense enregistrée"
              description="Ajoutez vos charges (aliments, électricité, transport, salaires…) pour suivre votre rentabilité réelle."
              action={
                peutModifier && (
                  <Button size="sm" onClick={() => setModal({ mode: 'creer' })}>
                    <Plus size={14} /> Nouvelle dépense
                  </Button>
                )
              }
            />
          ) : (
            <div className="-mx-2">
              <div className="overflow-x-auto">
                <table className="w-full min-w-[640px] text-sm">
                  <thead>
                    <tr className="border-b border-ink-900/8 text-left text-xs font-medium uppercase tracking-wide text-ink-700/60">
                      <th className="px-2 py-2.5">Description</th>
                      <th className="px-2 py-2.5">Catégorie</th>
                      <th className="px-2 py-2.5">Montant</th>
                      <th className="px-2 py-2.5">Date</th>
                      <th className="px-2 py-2.5" />
                    </tr>
                  </thead>
                  <tbody>
                    {list.length === 0 && (
                      <tr>
                        <td colSpan={5} className="px-2 py-8 text-center text-sm text-ink-700/50">
                          Aucun résultat pour « {recherche} ».
                        </td>
                      </tr>
                    )}
                    {list.map((d) => (
                      <tr key={d.id} className="border-b border-ink-900/6 last:border-0 hover:bg-ink-900/[0.015]">
                        <td className="px-2 py-3 text-ink-900">{d.description}</td>
                        <td className="px-2 py-3">
                          <Badge tone="neutral">{LABEL_CATEGORIE[d.categorie]}</Badge>
                        </td>
                        <td className="px-2 py-3 font-medium text-ink-900">{d.montant.toLocaleString('fr-FR')} FCFA</td>
                        <td className="px-2 py-3 text-ink-700">{format(new Date(d.date), 'd MMM yyyy', { locale: fr })}</td>
                        <td className="px-2 py-3">
                          {peutModifier && (
                            <div className="flex justify-end gap-1">
                              <Button size="sm" variant="ghost" onClick={() => setModal({ mode: 'modifier', depense: d })} title="Modifier">
                                <Pencil size={13} />
                              </Button>
                              <Button size="sm" variant="ghost" onClick={() => setDepenseASupprimer(d)} title="Supprimer">
                                <Trash2 size={13} className="text-signal-red" />
                              </Button>
                            </div>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </Card>

        <Card className="p-6">
          <p className="mb-1 font-display text-base font-semibold text-ink-950">Répartition du mois</p>
          <p className="mb-4 text-xs text-ink-700/60">Par catégorie de dépense</p>
          {parCategorie.length === 0 ? (
            <p className="py-10 text-center text-sm text-ink-700/50">Aucune donnée ce mois-ci</p>
          ) : (
            <>
              <div className="h-48">
                <ResponsiveContainer width="100%" height="100%">
                  <RPieChart>
                    <Pie data={parCategorie} dataKey="value" nameKey="name" innerRadius={45} outerRadius={72} paddingAngle={2}>
                      {parCategorie.map((c) => (
                        <Cell key={c.name} fill={c.color} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(v: number) => `${v.toLocaleString('fr-FR')} FCFA`} />
                  </RPieChart>
                </ResponsiveContainer>
              </div>
              <div className="mt-3 space-y-1.5">
                {parCategorie.map((c) => (
                  <div key={c.name} className="flex items-center justify-between text-xs">
                    <span className="flex items-center gap-1.5 text-ink-700">
                      <span className="h-2 w-2 rounded-full" style={{ backgroundColor: c.color }} />
                      {c.name}
                    </span>
                    <span className="font-medium text-ink-900">{c.value.toLocaleString('fr-FR')} FCFA</span>
                  </div>
                ))}
              </div>
            </>
          )}
        </Card>
      </div>

      <DepenseFormModal
        open={!!modal}
        depenseExistante={modal?.mode === 'modifier' ? modal.depense : null}
        onClose={() => setModal(null)}
        utilisateurNom={user?.nom ?? ''}
      />
      <ConfirmDialog
        open={!!depenseASupprimer}
        title="Supprimer cette dépense ?"
        description={`La dépense « ${depenseASupprimer?.description} » sera définitivement supprimée. Cette action est irréversible.`}
        onConfirm={confirmerSuppression}
        onCancel={() => setDepenseASupprimer(null)}
      />
    </div>
  )
}

function DepenseFormModal({
  open,
  depenseExistante,
  onClose,
  utilisateurNom,
}: {
  open: boolean
  depenseExistante: Depense | null
  onClose: () => void
  utilisateurNom: string
}) {
  const [description, setDescription] = useState('')
  const [categorie, setCategorie] = useState<CategorieDepense>('alimentation')
  const [montant, setMontant] = useState('')
  const [date, setDate] = useState(format(new Date(), 'yyyy-MM-dd'))
  const [cle, setCle] = useState<string | null>(null)

  const estModification = !!depenseExistante

  if (open && depenseExistante && cle !== depenseExistante.id) {
    setCle(depenseExistante.id)
    setDescription(depenseExistante.description)
    setCategorie(depenseExistante.categorie)
    setMontant(String(depenseExistante.montant))
    setDate(format(new Date(depenseExistante.date), 'yyyy-MM-dd'))
  }
  if (open && !depenseExistante && cle !== 'nouveau') {
    setCle('nouveau')
    setDescription('')
    setCategorie('alimentation')
    setMontant('')
    setDate(format(new Date(), 'yyyy-MM-dd'))
  }

  async function submit() {
    if (!description || !montant) return
    const maintenant = new Date().toISOString()

    if (estModification && depenseExistante) {
      await db.depenses.update(depenseExistante.id, {
        categorie,
        montant: Number(montant),
        date: new Date(date).toISOString(),
        description,
        modifieLe: maintenant,
        syncStatus: 'en_attente',
      })
      await logActivity(utilisateurNom, 'Modification de dépense', description)
      onClose()
      return
    }

    await db.depenses.add({
      id: genId('dep'),
      reference: genReference('DEP'),
      categorie,
      montant: Number(montant),
      date: new Date(date).toISOString(),
      description,
      creePar: utilisateurNom,
      creeLe: maintenant,
      modifieLe: maintenant,
      syncStatus: 'en_attente',
    })
    await logActivity(utilisateurNom, 'Enregistrement de dépense', description)
    onClose()
  }

  return (
    <Modal open={open} onClose={onClose} title={estModification ? 'Modifier la dépense' : 'Nouvelle dépense'}>
      <div className="space-y-4">
        <FormField label="Description">
          <input
            className={inputClass}
            placeholder="Achat d'aliments, réparation groupe électrogène…"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
        </FormField>
        <FormField label="Catégorie">
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            {(Object.keys(LABEL_CATEGORIE) as CategorieDepense[]).map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => setCategorie(c)}
                className={`rounded-lg border px-3 py-2 text-xs font-medium transition-colors ${
                  categorie === c
                    ? 'border-yolk-500 bg-yolk-500/10 text-yolk-700'
                    : 'border-ink-900/12 text-ink-700 hover:bg-ink-900/[0.02]'
                }`}
              >
                {LABEL_CATEGORIE[c]}
              </button>
            ))}
          </div>
        </FormField>
        <div className="grid grid-cols-2 gap-4">
          <FormField label="Montant (FCFA)">
            <input
              type="number"
              min={0}
              className={inputClass}
              placeholder="45000"
              value={montant}
              onChange={(e) => setMontant(e.target.value)}
            />
          </FormField>
          <FormField label="Date">
            <input type="date" className={inputClass} value={date} onChange={(e) => setDate(e.target.value)} />
          </FormField>
        </div>
        <div className="flex justify-end gap-2 pt-2">
          <Button variant="ghost" onClick={onClose}>Annuler</Button>
          <Button onClick={submit}>{estModification ? 'Enregistrer les modifications' : 'Enregistrer'}</Button>
        </div>
      </div>
    </Modal>
  )
}
