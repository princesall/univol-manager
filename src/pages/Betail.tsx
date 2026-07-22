import { useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { differenceInCalendarDays, format } from 'date-fns'
import { fr } from 'date-fns/locale'
import { Plus, Beef, Calendar, Skull, Syringe, Trash2, PackageCheck, Pencil } from 'lucide-react'
import { db, genId, genReference, logActivity, ensureClientExists, vendreDepuisLotBetail, filterActive } from '@/lib/db'
import { markForDelete } from '@/lib/sync'
import type { CategorieBetail, LotBetail, SourceAcquisitionBetail, TypeSoin, Vente, SoinSanteBetail } from '@/types'
import { useAuth } from '@/store/auth'
import { Button } from '@/components/ui/Button'
import { Card, Badge, StatCard, EmptyState } from '@/components/ui/Primitives'
import { Modal, FormField, inputClass } from '@/components/ui/Modal'
import { SearchInput } from '@/components/ui/SearchInput'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { NameAutocomplete } from '@/components/ui/NameAutocomplete'
import { FactureModal, PostVenteModal } from '@/components/invoice/FactureModal'

const LABEL_CATEGORIE: Record<CategorieBetail, string> = {
  chevre: 'Chèvres',
  mouton: 'Moutons',
  boeuf: 'Bœufs',
  autre: 'Autre',
}

const LABEL_SOURCE: Record<SourceAcquisitionBetail, string> = { achat: 'Achat', naissance: 'Naissance' }

export function Betail() {
  const { user } = useAuth()
  const lots = useLiveQuery(() => db.lotsBetail.orderBy('dateAcquisition').reverse().toArray().then(filterActive), [])
  const [recherche, setRecherche] = useState('')
  const [modal, setModal] = useState<{ mode: 'creer' } | { mode: 'modifier'; lot: LotBetail } | null>(null)
  const [lotMortalite, setLotMortalite] = useState<LotBetail | null>(null)
  const [lotSante, setLotSante] = useState<LotBetail | null>(null)
  const [lotEcouler, setLotEcouler] = useState<LotBetail | null>(null)
  const [lotASupprimer, setLotASupprimer] = useState<LotBetail | null>(null)
  const [venteJusteCreee, setVenteJusteCreee] = useState<Vente | null>(null)
  const [factureAAfficher, setFactureAAfficher] = useState<Vente | null>(null)

  const peutModifier = user?.role === 'admin' || user?.role === 'technique'
  const tous = lots ?? []
  const q = recherche.trim().toLowerCase()
  const filtres = q ? tous.filter((l) => l.reference.toLowerCase().includes(q) || LABEL_CATEGORIE[l.categorie].toLowerCase().includes(q)) : tous
  const enElevage = filtres.filter((l) => l.statut === 'en_elevage')
  const ecoules = filtres.filter((l) => l.statut === 'ecoulee')

  const totalParCategorie = (cat: CategorieBetail) =>
    tous.filter((l) => l.statut === 'en_elevage' && l.categorie === cat).reduce((s, l) => s + l.effectifActuel, 0)

  async function confirmerSuppression() {
    if (!lotASupprimer) return
    await markForDelete('lotsBetail', lotASupprimer.id)
    await logActivity(user?.nom ?? '', 'Suppression du lot de bétail', lotASupprimer.reference)
    setLotASupprimer(null)
  }

  return (
    <div className="space-y-7">
      <div className="flex flex-col items-start gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="font-display text-2xl font-semibold text-ink-950">Bétail</h1>
          <p className="mt-1 text-sm text-ink-700/60">
            Gestion des chèvres, moutons et bœufs — effectifs, mortalité, santé et ventes.
          </p>
        </div>
        {peutModifier && (
          <Button onClick={() => setModal({ mode: 'creer' })}>
            <Plus size={16} /> Nouveau lot
          </Button>
        )}
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label="Chèvres" value={totalParCategorie('chevre').toLocaleString('fr-FR')} sub="En élevage" icon={<Beef size={18} />} accent="moss" />
        <StatCard label="Moutons" value={totalParCategorie('mouton').toLocaleString('fr-FR')} sub="En élevage" icon={<Beef size={18} />} accent="yolk" />
        <StatCard label="Bœufs" value={totalParCategorie('boeuf').toLocaleString('fr-FR')} sub="En élevage" icon={<Beef size={18} />} accent="clay" />
        <StatCard label="Lots actifs" value={String(enElevage.length)} sub={`${ecoules.length} lot(s) écoulé(s)`} icon={<PackageCheck size={18} />} />
      </div>

      {tous.length === 0 ? (
        <EmptyState
          title="Aucun lot de bétail enregistré"
          description="Ajoute tes chèvres, moutons ou bœufs pour suivre leurs effectifs, leur santé et leurs ventes."
          action={
            peutModifier && (
              <Button size="sm" onClick={() => setModal({ mode: 'creer' })}>
                <Plus size={14} /> Créer un lot
              </Button>
            )
          }
        />
      ) : (
        <>
          <SearchInput value={recherche} onChange={setRecherche} placeholder="Rechercher par référence ou catégorie…" />

          <section>
            <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-ink-700/60">
              En élevage ({enElevage.length})
            </p>
            {enElevage.length === 0 ? (
              <p className="py-6 text-center text-sm text-ink-700/50">
                {recherche ? `Aucun résultat pour « ${recherche} ».` : 'Aucun lot en élevage.'}
              </p>
            ) : (
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
                {enElevage.map((l) => (
                  <LotBetailCard
                    key={l.id}
                    lot={l}
                    peutModifier={peutModifier}
                    onMortalite={() => setLotMortalite(l)}
                    onSante={() => setLotSante(l)}
                    onEcouler={() => setLotEcouler(l)}
                    onModifier={() => setModal({ mode: 'modifier', lot: l })}
                    onSupprimer={() => setLotASupprimer(l)}
                  />
                ))}
              </div>
            )}
          </section>

          <section>
            <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-ink-700/60">
              Lots écoulés ({ecoules.length})
            </p>
            <Card className="overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full min-w-[640px] text-sm">
                  <thead>
                    <tr className="border-b border-ink-900/8 bg-ink-900/[0.02] text-left text-xs font-medium uppercase tracking-wide text-ink-700/60">
                      <th className="px-5 py-3">Référence</th>
                      <th className="px-5 py-3">Catégorie</th>
                      <th className="px-5 py-3">Effectif initial</th>
                      <th className="px-5 py-3">Acquisition</th>
                      {peutModifier && <th className="px-5 py-3" />}
                    </tr>
                  </thead>
                  <tbody>
                    {ecoules.length === 0 && (
                      <tr>
                        <td colSpan={5} className="px-5 py-8 text-center text-sm text-ink-700/50">
                          Aucun lot écoulé pour le moment.
                        </td>
                      </tr>
                    )}
                    {ecoules.map((l) => (
                      <tr key={l.id} className="border-b border-ink-900/6 last:border-0 hover:bg-ink-900/[0.015]">
                        <td className="px-5 py-3.5 font-mono-data text-xs font-medium text-ink-900">{l.reference}</td>
                        <td className="px-5 py-3.5"><Badge tone="neutral">{LABEL_CATEGORIE[l.categorie]}</Badge></td>
                        <td className="px-5 py-3.5 text-ink-700">{l.effectifInitial.toLocaleString('fr-FR')}</td>
                        <td className="px-5 py-3.5 text-ink-700">{format(new Date(l.dateAcquisition), 'd MMM yyyy', { locale: fr })}</td>
                        {peutModifier && (
                          <td className="px-5 py-3.5 text-right">
                            <div className="flex justify-end gap-1">
                              <Button size="sm" variant="ghost" onClick={() => setModal({ mode: 'modifier', lot: l })} title="Modifier">
                                <Pencil size={13} />
                              </Button>
                              <Button size="sm" variant="ghost" onClick={() => setLotASupprimer(l)} title="Supprimer">
                                <Trash2 size={13} className="text-signal-red" />
                              </Button>
                            </div>
                          </td>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          </section>
        </>
      )}

      <LotBetailFormModal
        open={!!modal}
        lotExistant={modal?.mode === 'modifier' ? modal.lot : null}
        onClose={() => setModal(null)}
        utilisateurNom={user?.nom ?? ''}
      />
      <MortaliteBetailModal lot={lotMortalite} onClose={() => setLotMortalite(null)} utilisateurNom={user?.nom ?? ''} />
      <SanteBetailModal lot={lotSante} onClose={() => setLotSante(null)} utilisateurNom={user?.nom ?? ''} />
      <EcoulerLotBetailModal
        lot={lotEcouler}
        onClose={() => setLotEcouler(null)}
        utilisateurNom={user?.nom ?? ''}
        onCreated={(v) => setVenteJusteCreee(v)}
      />
      <PostVenteModal
        vente={venteJusteCreee}
        onVoirFacture={() => {
          setFactureAAfficher(venteJusteCreee)
          setVenteJusteCreee(null)
        }}
        onClose={() => setVenteJusteCreee(null)}
      />
      <FactureModal vente={factureAAfficher} onClose={() => setFactureAAfficher(null)} />
      <ConfirmDialog
        open={!!lotASupprimer}
        title="Supprimer ce lot ?"
        description={`Le lot ${lotASupprimer?.reference} sera définitivement supprimé. L'historique des ventes liées reste conservé mais ne sera plus rattaché à ce lot.`}
        onConfirm={confirmerSuppression}
        onCancel={() => setLotASupprimer(null)}
      />
    </div>
  )
}

function LotBetailCard({
  lot,
  peutModifier,
  onMortalite,
  onSante,
  onEcouler,
  onModifier,
  onSupprimer,
}: {
  lot: LotBetail
  peutModifier: boolean
  onMortalite: () => void
  onSante: () => void
  onEcouler: () => void
  onModifier: () => void
  onSupprimer: () => void
}) {
  const ageJours = differenceInCalendarDays(new Date(), new Date(lot.dateAcquisition))
  const mortalitesLot = useLiveQuery(() => db.mortalitesBetail.where('lotBetailId').equals(lot.id).toArray().then(filterActive), [lot.id])
  const soins = useLiveQuery(() => db.soinsSanteBetail.where('lotBetailId').equals(lot.id).count(), [lot.id])
  const pertes = (mortalitesLot ?? []).reduce((s, m) => s + m.quantite, 0)
  const tauxPerte = lot.effectifInitial > 0 ? Math.round((pertes / lot.effectifInitial) * 100) : 0

  return (
    <Card className="p-5">
      <div className="flex items-start gap-4">
        <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-clay-500/10 text-clay-600">
          <Beef size={22} />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <p className="font-mono-data text-xs font-medium text-ink-700/70">{lot.reference}</p>
              <div className="mt-0.5 flex items-center gap-1.5">
                <p className="font-display text-base font-semibold text-ink-950">{lot.effectifActuel.toLocaleString('fr-FR')} têtes</p>
                <Badge tone="neutral">{LABEL_CATEGORIE[lot.categorie]}</Badge>
              </div>
            </div>
            {peutModifier && (
              <div className="flex gap-1">
                <button
                  type="button"
                  onClick={onModifier}
                  className="shrink-0 rounded-md p-1 text-ink-700/40 hover:bg-ink-900/5 hover:text-ink-700"
                  title="Modifier"
                >
                  <Pencil size={15} />
                </button>
                <button
                  type="button"
                  onClick={onSupprimer}
                  className="shrink-0 rounded-md p-1 text-signal-red/40 hover:bg-signal-red/8 hover:text-signal-red"
                  title="Supprimer"
                >
                  <Trash2 size={15} />
                </button>
              </div>
            )}
          </div>
          <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-ink-700/70">
            <span className="flex items-center gap-1">
              <Calendar size={12} /> {ageJours} j · {LABEL_SOURCE[lot.sourceAcquisition]}
            </span>
            {!!soins && soins > 0 && (
              <span className="flex items-center gap-1 text-moss-600">
                <Syringe size={12} /> {soins} soin(s)
              </span>
            )}
          </div>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap items-center justify-between gap-2 border-t border-ink-900/6 pt-3.5">
        <Badge tone={tauxPerte >= 10 ? 'danger' : tauxPerte >= 5 ? 'warning' : 'success'}>
          <Skull size={11} /> {tauxPerte}% de pertes
        </Badge>
        {peutModifier && (
          <div className="flex flex-wrap gap-1.5">
            <Button size="sm" variant="ghost" onClick={onSante}>
              <Syringe size={12} /> Santé
            </Button>
            <Button size="sm" variant="ghost" onClick={onMortalite}>Mortalité</Button>
            <Button size="sm" variant="secondary" onClick={onEcouler}>Écouler</Button>
          </div>
        )}
      </div>
    </Card>
  )
}

function LotBetailFormModal({
  open,
  lotExistant,
  onClose,
  utilisateurNom,
}: {
  open: boolean
  lotExistant: LotBetail | null
  onClose: () => void
  utilisateurNom: string
}) {
  const [categorie, setCategorie] = useState<CategorieBetail>('chevre')
  const [effectif, setEffectif] = useState('')
  const [source, setSource] = useState<SourceAcquisitionBetail>('achat')
  const [date, setDate] = useState(format(new Date(), 'yyyy-MM-dd'))
  const [notes, setNotes] = useState('')
  const [cle, setCle] = useState<string | null>(null)
  const [envoi, setEnvoi] = useState(false)

  const estModification = !!lotExistant

  if (open && lotExistant && cle !== lotExistant.id) {
    setCle(lotExistant.id)
    setCategorie(lotExistant.categorie)
    setEffectif(String(lotExistant.effectifInitial))
    setSource(lotExistant.sourceAcquisition)
    setDate(format(new Date(lotExistant.dateAcquisition), 'yyyy-MM-dd'))
    setNotes(lotExistant.notes ?? '')
  }
  if (open && !lotExistant && cle !== 'nouveau') {
    setCle('nouveau')
    setCategorie('chevre')
    setEffectif('')
    setSource('achat')
    setDate(format(new Date(), 'yyyy-MM-dd'))
    setNotes('')
  }

  async function submit() {
    if (!effectif || envoi) return
    setEnvoi(true)
    const maintenant = new Date().toISOString()
    const effectifNum = Number(effectif)

    if (estModification && lotExistant) {
      const delta = effectifNum - lotExistant.effectifInitial
      const effectifActuel = Math.max(0, lotExistant.effectifActuel + delta)
      await db.lotsBetail.update(lotExistant.id, {
        categorie,
        effectifInitial: effectifNum,
        effectifActuel,
        dateAcquisition: new Date(date).toISOString(),
        sourceAcquisition: source,
        notes: notes || undefined,
        modifieLe: maintenant,
        syncStatus: 'en_attente',
      })
      await logActivity(utilisateurNom, 'Modification du lot de bétail', lotExistant.reference)
      setEnvoi(false)
      onClose()
      return
    }

    await db.lotsBetail.add({
      id: genId('bet'),
      reference: genReference('BET'),
      categorie,
      effectifInitial: effectifNum,
      effectifActuel: effectifNum,
      dateAcquisition: new Date(date).toISOString(),
      sourceAcquisition: source,
      statut: 'en_elevage',
      notes: notes || undefined,
      creePar: utilisateurNom,
      creeLe: maintenant,
      modifieLe: maintenant,
      syncStatus: 'en_attente',
    })
    await logActivity(utilisateurNom, 'Création du lot de bétail', LABEL_CATEGORIE[categorie])
    setEffectif('')
    setNotes('')
    setEnvoi(false)
    onClose()
  }

  return (
    <Modal open={open} onClose={onClose} title={estModification ? `Modifier le lot — ${lotExistant?.reference}` : 'Nouveau lot de bétail'}>
      <div className="space-y-4">
        <FormField label="Catégorie">
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            {(Object.keys(LABEL_CATEGORIE) as CategorieBetail[]).map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => setCategorie(c)}
                className={`rounded-lg border px-2 py-2 text-xs font-medium transition-colors ${
                  categorie === c ? 'border-yolk-500 bg-yolk-500/10 text-yolk-700' : 'border-ink-900/12 text-ink-700 hover:bg-ink-900/[0.02]'
                }`}
              >
                {LABEL_CATEGORIE[c]}
              </button>
            ))}
          </div>
        </FormField>
        <div className="grid grid-cols-2 gap-4">
          <FormField label="Effectif initial">
            <input type="number" min={1} className={inputClass} placeholder="10" value={effectif} onChange={(e) => setEffectif(e.target.value)} />
          </FormField>
          <FormField label="Date d'acquisition">
            <input type="date" className={inputClass} value={date} onChange={(e) => setDate(e.target.value)} />
          </FormField>
        </div>
        {estModification && lotExistant && (
          <p className="rounded-lg bg-ink-900/[0.03] px-3.5 py-2.5 text-xs text-ink-700">
            Effectif actuel : {lotExistant.effectifActuel.toLocaleString('fr-FR')} têtes. Si vous changez l’effectif initial,
            l’effectif actuel sera ajusté automatiquement.
          </p>
        )}
        <FormField label="Origine">
          <div className="grid grid-cols-2 gap-2">
            {(['achat', 'naissance'] as const).map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => setSource(s)}
                className={`rounded-lg border px-3 py-2 text-xs font-medium transition-colors ${
                  source === s ? 'border-yolk-500 bg-yolk-500/10 text-yolk-700' : 'border-ink-900/12 text-ink-700 hover:bg-ink-900/[0.02]'
                }`}
              >
                {LABEL_SOURCE[s]}
              </button>
            ))}
          </div>
        </FormField>
        <FormField label="Notes (optionnel)">
          <input className={inputClass} placeholder="Race, fournisseur, remarques…" value={notes} onChange={(e) => setNotes(e.target.value)} />
        </FormField>
        <div className="flex justify-end gap-2 pt-2">
          <Button variant="ghost" onClick={onClose}>Annuler</Button>
          <Button onClick={submit} disabled={envoi}>
            {envoi ? (estModification ? 'Enregistrement…' : 'Création…') : estModification ? 'Enregistrer' : 'Créer le lot'}
          </Button>
        </div>
      </div>
    </Modal>
  )
}

function MortaliteBetailModal({
  lot,
  onClose,
  utilisateurNom,
}: {
  lot: LotBetail | null
  onClose: () => void
  utilisateurNom: string
}) {
  const [quantite, setQuantite] = useState('')
  const [cause, setCause] = useState('')
  const [erreur, setErreur] = useState('')
  const [envoi, setEnvoi] = useState(false)

  if (!lot) return null

  async function submit() {
    if (!lot || !quantite || envoi) return
    const q = Number(quantite)
    if (q <= 0) {
      setErreur('Entrez un nombre supérieur à 0.')
      return
    }
    if (q > lot.effectifActuel) {
      setErreur(`Impossible : il n'y a que ${lot.effectifActuel.toLocaleString('fr-FR')} têtes dans ce lot.`)
      return
    }
    setEnvoi(true)
    await db.mortalitesBetail.add({
      id: genId('morb'),
      lotBetailId: lot.id,
      date: new Date().toISOString(),
      quantite: q,
      cause: cause || undefined,
      creePar: utilisateurNom,
      modifieLe: new Date().toISOString(),
      syncStatus: 'en_attente',
    })
    await db.lotsBetail.update(lot.id, {
      effectifActuel: lot.effectifActuel - q,
      modifieLe: new Date().toISOString(),
      syncStatus: 'en_attente',
    })
    await logActivity(utilisateurNom, 'Enregistrement de mortalité (bétail)', lot.reference)
    setQuantite('')
    setCause('')
    setErreur('')
    setEnvoi(false)
    onClose()
  }

  return (
    <Modal open={!!lot} onClose={onClose} title={`Mortalité — ${lot.reference}`} width="max-w-sm">
      <div className="space-y-4">
        <p className="rounded-lg bg-ink-900/[0.03] px-3.5 py-2.5 text-xs text-ink-700">
          Effectif actuel : {lot.effectifActuel.toLocaleString('fr-FR')} têtes
        </p>
        <FormField label="Nombre de pertes">
          <input
            type="number"
            min={1}
            max={lot.effectifActuel}
            className={inputClass}
            placeholder="1"
            value={quantite}
            onChange={(e) => {
              setQuantite(e.target.value)
              setErreur('')
            }}
          />
        </FormField>
        {erreur && <p className="rounded-lg bg-signal-red/8 px-3.5 py-2.5 text-xs font-medium text-signal-red">{erreur}</p>}
        <FormField label="Cause (optionnel)">
          <input className={inputClass} placeholder="Maladie, accident…" value={cause} onChange={(e) => setCause(e.target.value)} />
        </FormField>
        <div className="flex justify-end gap-2 pt-2">
          <Button variant="ghost" onClick={onClose}>Annuler</Button>
          <Button variant="danger" onClick={submit} disabled={envoi}>{envoi ? 'Enregistrement…' : 'Enregistrer'}</Button>
        </div>
      </div>
    </Modal>
  )
}

const LABEL_TYPE_SOIN: Record<TypeSoin, string> = {
  vaccination: 'Vaccination',
  traitement: 'Traitement',
  controle: 'Contrôle vétérinaire',
}

function SanteBetailModal({
  lot,
  onClose,
  utilisateurNom,
}: {
  lot: LotBetail | null
  onClose: () => void
  utilisateurNom: string
}) {
  const soins = useLiveQuery(
    () =>
      lot
        ? db.soinsSanteBetail.where('lotBetailId').equals(lot.id).reverse().sortBy('date').then(filterActive)
        : Promise.resolve<SoinSanteBetail[]>([]),
    [lot?.id]
  )
  const [type, setType] = useState<TypeSoin>('vaccination')
  const [nom, setNom] = useState('')
  const [date, setDate] = useState(format(new Date(), 'yyyy-MM-dd'))
  const [rappel, setRappel] = useState('')
  const [notes, setNotes] = useState('')
  const [soinASupprimer, setSoinASupprimer] = useState<SoinSanteBetailAvecId | null>(null)

  if (!lot) return null

  async function submit() {
    if (!lot || !nom) return
    await db.soinsSanteBetail.add({
      id: genId('soinb'),
      lotBetailId: lot.id,
      lotBetailRef: lot.reference,
      type,
      nom,
      date: new Date(date).toISOString(),
      rappelPrevu: rappel ? new Date(rappel).toISOString() : undefined,
      notes: notes || undefined,
      creePar: utilisateurNom,
      modifieLe: new Date().toISOString(),
      syncStatus: 'en_attente',
    })
    await logActivity(utilisateurNom, `Enregistrement — ${LABEL_TYPE_SOIN[type]} (bétail)`, lot.reference)
    setNom('')
    setRappel('')
    setNotes('')
  }

  async function confirmerSuppressionSoin() {
    if (!soinASupprimer) return
    await markForDelete('soinsSanteBetail', soinASupprimer.id)
    await logActivity(utilisateurNom, 'Suppression d\u2019un soin (bétail)', soinASupprimer.nom)
    setSoinASupprimer(null)
  }

  return (
    <Modal open={!!lot} onClose={onClose} title={`Santé & vaccination — ${lot.reference}`} width="max-w-lg">
      <div className="space-y-5">
        <div className="space-y-3 rounded-lg border border-ink-900/8 bg-ink-900/[0.02] p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-ink-700/60">Nouvel enregistrement</p>
          <FormField label="Type">
            <div className="grid grid-cols-3 gap-2">
              {(['vaccination', 'traitement', 'controle'] as const).map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setType(t)}
                  className={`rounded-lg border px-2 py-2 text-xs font-medium transition-colors ${
                    type === t ? 'border-yolk-500 bg-yolk-500/10 text-yolk-700' : 'border-ink-900/12 text-ink-700 hover:bg-ink-900/[0.02]'
                  }`}
                >
                  {LABEL_TYPE_SOIN[t]}
                </button>
              ))}
            </div>
          </FormField>
          <FormField label="Nom du produit / intervention">
            <input className={inputClass} placeholder="Vaccin, vermifuge, visite vétérinaire…" value={nom} onChange={(e) => setNom(e.target.value)} />
          </FormField>
          <div className="grid grid-cols-2 gap-4">
            <FormField label="Date">
              <input type="date" className={inputClass} value={date} onChange={(e) => setDate(e.target.value)} />
            </FormField>
            <FormField label="Rappel prévu (optionnel)">
              <input type="date" className={inputClass} value={rappel} onChange={(e) => setRappel(e.target.value)} />
            </FormField>
          </div>
          <FormField label="Notes (optionnel)">
            <input className={inputClass} placeholder="Dosage, observations…" value={notes} onChange={(e) => setNotes(e.target.value)} />
          </FormField>
          <div className="flex justify-end">
            <Button size="sm" onClick={submit}>
              <Plus size={13} /> Ajouter
            </Button>
          </div>
        </div>

        <div>
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-ink-700/60">
            Historique ({soins?.length ?? 0})
          </p>
          {!soins || soins.length === 0 ? (
            <p className="py-6 text-center text-sm text-ink-700/50">Aucun soin enregistré pour ce lot.</p>
          ) : (
            <div className="max-h-64 space-y-2 overflow-y-auto">
              {soins.map((s) => (
                <div key={s.id} className="flex items-start justify-between gap-3 rounded-lg border border-ink-900/6 px-3.5 py-2.5">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <Badge tone={s.type === 'vaccination' ? 'success' : s.type === 'traitement' ? 'warning' : 'info'}>
                        {LABEL_TYPE_SOIN[s.type]}
                      </Badge>
                      <p className="truncate text-sm font-medium text-ink-900">{s.nom}</p>
                    </div>
                    <p className="mt-1 text-xs text-ink-700/60">
                      {format(new Date(s.date), 'd MMM yyyy', { locale: fr })}
                      {s.rappelPrevu && ` · Rappel prévu le ${format(new Date(s.rappelPrevu), 'd MMM yyyy', { locale: fr })}`}
                    </p>
                    {s.notes && <p className="mt-0.5 text-xs text-ink-700/50">{s.notes}</p>}
                  </div>
                  <button onClick={() => setSoinASupprimer(s)} className="shrink-0 rounded-md p-1.5 text-ink-700/40 hover:bg-signal-red/10 hover:text-signal-red">
                    <Trash2 size={13} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="flex justify-end pt-1">
          <Button variant="ghost" onClick={onClose}>Fermer</Button>
        </div>
      </div>

      <ConfirmDialog
        open={!!soinASupprimer}
        title="Supprimer cet enregistrement ?"
        description={`« ${soinASupprimer?.nom} » sera définitivement supprimé de l'historique santé de ce lot.`}
        onConfirm={confirmerSuppressionSoin}
        onCancel={() => setSoinASupprimer(null)}
      />
    </Modal>
  )
}

type SoinSanteBetailAvecId = { id: string; nom: string }

function EcoulerLotBetailModal({
  lot,
  onClose,
  utilisateurNom,
  onCreated,
}: {
  lot: LotBetail | null
  onClose: () => void
  utilisateurNom: string
  onCreated: (vente: Vente) => void
}) {
  const clients = useLiveQuery(() => db.clients.toArray().then(filterActive), [])
  const nomsClients = (clients ?? []).map((c) => c.nom)
  const [clientNom, setClientNom] = useState('')
  const [prixUnitaire, setPrixUnitaire] = useState('')
  const [statutPaiement, setStatutPaiement] = useState<'paye' | 'partiel' | 'attente'>('paye')
  const [montantPaye, setMontantPaye] = useState('')
  const [envoi, setEnvoi] = useState(false)

  if (!lot) return null

  const quantite = lot.effectifActuel
  const montantTotal = prixUnitaire ? quantite * Number(prixUnitaire) : 0

  async function submit() {
    if (!lot || !clientNom || !prixUnitaire || envoi) return
    setEnvoi(true)
    const nomFinal = await ensureClientExists(clientNom)
    const maintenant = new Date().toISOString()

    let statutFinal: 'paye' | 'partiel' | 'attente' = statutPaiement
    let paye: number
    if (statutPaiement === 'attente') paye = 0
    else if (statutPaiement === 'paye') paye = montantTotal
    else {
      paye = Math.min(montantTotal, Math.max(0, Number(montantPaye) || 0))
      if (montantTotal > 0 && paye >= montantTotal) {
        statutFinal = 'paye'
        paye = montantTotal
      } else if (paye <= 0) {
        statutFinal = 'attente'
        paye = 0
      }
    }

    const typeVente = lot.categorie
    const nouvelleVente: Vente = {
      id: genId('vte'),
      reference: genReference('VTE'),
      clientNom: nomFinal,
      lotBetailId: lot.id,
      lotBetailRef: lot.reference,
      type: typeVente,
      quantite,
      prixUnitaire: Number(prixUnitaire),
      montantTotal,
      montantPaye: paye,
      statutPaiement: statutFinal,
      dateVente: maintenant,
      creePar: utilisateurNom,
      creeLe: maintenant,
      modifieLe: maintenant,
      syncStatus: 'en_attente',
    }
    await db.ventes.add(nouvelleVente)
    await vendreDepuisLotBetail(lot.id, quantite)
    await logActivity(utilisateurNom, 'Vente et clôture du lot de bétail', lot.reference)
    setClientNom('')
    setPrixUnitaire('')
    setMontantPaye('')
    setStatutPaiement('paye')
    setEnvoi(false)
    onClose()
    onCreated(nouvelleVente)
  }

  return (
    <Modal open={!!lot} onClose={onClose} title={`Écouler le lot — ${lot.reference}`}>
      <div className="space-y-4">
        <p className="rounded-lg bg-ink-900/[0.03] px-3.5 py-2.5 text-xs text-ink-700">
          {quantite.toLocaleString('fr-FR')} têtes ({LABEL_CATEGORIE[lot.categorie]}) seront vendues en une seule
          transaction et le lot sera clôturé.
        </p>
        <FormField label="Client">
          <NameAutocomplete
            value={clientNom}
            onChange={setClientNom}
            suggestions={nomsClients}
            placeholder="Nom du client ou de l'acheteur"
            existeLabel="Client existant"
            nouveauLabel="Nouveau client — sera ajouté automatiquement"
          />
        </FormField>
        <FormField label="Prix unitaire (FCFA)">
          <input type="number" min={0} className={inputClass} placeholder="45000" value={prixUnitaire} onChange={(e) => setPrixUnitaire(e.target.value)} />
        </FormField>
        {montantTotal > 0 && (
          <div className="flex items-center justify-between rounded-lg bg-yolk-500/10 px-3.5 py-2.5">
            <span className="text-xs font-medium text-yolk-700">Montant total</span>
            <span className="font-display text-lg font-semibold text-yolk-700">{montantTotal.toLocaleString('fr-FR')} FCFA</span>
          </div>
        )}
        <FormField label="Statut du paiement">
          <div className="grid grid-cols-3 gap-2">
            {(['paye', 'partiel', 'attente'] as const).map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => setStatutPaiement(s)}
                className={`rounded-lg border px-3 py-2 text-xs font-medium transition-colors ${
                  statutPaiement === s ? 'border-yolk-500 bg-yolk-500/10 text-yolk-700' : 'border-ink-900/12 text-ink-700 hover:bg-ink-900/[0.02]'
                }`}
              >
                {s === 'paye' ? 'Payé' : s === 'partiel' ? 'Partiel' : 'En attente'}
              </button>
            ))}
          </div>
        </FormField>
        {statutPaiement === 'partiel' && (
          <FormField label="Montant déjà versé (FCFA)">
            <input type="number" min={0} className={inputClass} placeholder="50000" value={montantPaye} onChange={(e) => setMontantPaye(e.target.value)} />
          </FormField>
        )}
        <div className="flex justify-end gap-2 pt-2">
          <Button variant="ghost" onClick={onClose}>Annuler</Button>
          <Button onClick={submit} disabled={envoi}>{envoi ? 'Enregistrement…' : 'Confirmer la vente'}</Button>
        </div>
      </div>
    </Modal>
  )
}
