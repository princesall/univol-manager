import { useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { differenceInCalendarDays, format } from 'date-fns'
import { fr } from 'date-fns/locale'
import { Bird, Skull, Calendar, Link2, PackageCheck, Syringe, Plus, Trash2 } from 'lucide-react'
import { db, genId, genReference, logActivity, ensureClientExists, vendreDepuisBande } from '@/lib/db'
import type { BandeVolaille, Vente, SoinSante, TypeSoin } from '@/types'
import { useAuth } from '@/store/auth'
import { Button } from '@/components/ui/Button'
import { Card, Badge, EmptyState } from '@/components/ui/Primitives'
import { Modal, FormField, inputClass } from '@/components/ui/Modal'
import { NameAutocomplete } from '@/components/ui/NameAutocomplete'
import { SearchInput } from '@/components/ui/SearchInput'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { FactureModal, PostVenteModal } from '@/components/invoice/FactureModal'

export function Poulailler() {
  const { user } = useAuth()
  const bandes = useLiveQuery(() => db.bandesVolaille.orderBy('dateDebut').reverse().toArray(), [])
  const ventesToutes = useLiveQuery(() => db.ventes.toArray(), [])
  const [bandeMortalite, setBandeMortalite] = useState<BandeVolaille | null>(null)
  const [bandeEcouler, setBandeEcouler] = useState<BandeVolaille | null>(null)
  const [bandeSante, setBandeSante] = useState<BandeVolaille | null>(null)
  const [bandeASupprimer, setBandeASupprimer] = useState<BandeVolaille | null>(null)
  const [venteJusteCreee, setVenteJusteCreee] = useState<Vente | null>(null)
  const [factureAAfficher, setFactureAAfficher] = useState<Vente | null>(null)
  const [recherche, setRecherche] = useState('')

  const toutesLesBandes = bandes ?? []

  function venduPour(bandeId: string): number {
    return (ventesToutes ?? []).filter((v) => v.bandeId === bandeId).reduce((s, v) => s + v.quantite, 0)
  }
  const q = recherche.trim().toLowerCase()
  const filtrees = q
    ? toutesLesBandes.filter((b) => b.reference.toLowerCase().includes(q) || b.lotIncubationRef?.toLowerCase().includes(q))
    : toutesLesBandes

  const enElevage = filtrees.filter((b) => b.statut === 'en_elevage')
  const ecoulees = filtrees.filter((b) => b.statut === 'ecoulee')
  const peutModifier = user?.role === 'admin' || user?.role === 'technique'

  const effectifTotal = toutesLesBandes.filter((b) => b.statut === 'en_elevage').reduce((s, b) => s + b.effectifActuel, 0)

  async function confirmerSuppressionBande() {
    if (!bandeASupprimer) return
    await db.bandesVolaille.delete(bandeASupprimer.id)
    await logActivity(user?.nom ?? '', 'Suppression de la bande', bandeASupprimer.reference)
    setBandeASupprimer(null)
  }

  return (
    <div className="space-y-7">
      <div className="flex flex-col items-start gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="font-display text-2xl font-semibold text-ink-950">Poulailler</h1>
          <p className="mt-1 text-sm text-ink-700/60">
            Suivi des bandes de poussins et poulets, de l'éclosion à la vente.
          </p>
        </div>
        <Badge tone="info">
          <PackageCheck size={12} /> {effectifTotal.toLocaleString('fr-FR')} sujets en élevage
        </Badge>
      </div>

      <SearchInput value={recherche} onChange={setRecherche} placeholder="Rechercher une bande ou un lot d'origine…" />

      <section>
        <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-ink-700/60">
          Bandes en élevage ({enElevage.length})
        </p>
        {enElevage.length === 0 ? (
          <EmptyState
            title={recherche ? 'Aucun résultat' : 'Aucune bande en élevage'}
            description={
              recherche
                ? `Aucune bande ne correspond à « ${recherche} ».`
                : "Les bandes sont créées automatiquement lorsqu'une éclosion est enregistrée dans le module Couvoir."
            }
          />
        ) : (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
            {enElevage.map((b) => (
              <BandeCard
                key={b.id}
                bande={b}
                peutModifier={peutModifier}
                onMortalite={() => setBandeMortalite(b)}
                onEcouler={() => setBandeEcouler(b)}
                onSante={() => setBandeSante(b)}
              />
            ))}
          </div>
        )}
      </section>

      <section>
        <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-ink-700/60">
          Bandes écoulées ({ecoulees.length})
        </p>
        <Card className="overflow-hidden">
          <div className="overflow-x-auto">
<table className="w-full min-w-[640px] text-sm">
            <thead>
              <tr className="border-b border-ink-900/8 bg-ink-900/[0.02] text-left text-xs font-medium uppercase tracking-wide text-ink-700/60">
                <th className="px-5 py-3">Bande</th>
                <th className="px-5 py-3">Lot d'origine</th>
                <th className="px-5 py-3">Effectif initial</th>
                <th className="px-5 py-3">Vendu</th>
                <th className="px-5 py-3">Pertes (mortalité)</th>
                <th className="px-5 py-3">Valorisation</th>
                {peutModifier && <th className="px-5 py-3" />}
              </tr>
            </thead>
            <tbody>
              {ecoulees.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-5 py-10 text-center text-sm text-ink-700/50">
                    {recherche ? `Aucun résultat pour « ${recherche} ».` : 'Aucune bande écoulée pour le moment.'}
                  </td>
                </tr>
              )}
              {ecoulees.map((b) => {
                const vendu = venduPour(b.id)
                const pertes = Math.max(0, b.effectifInitial - vendu)
                const valorisation = Math.round((vendu / b.effectifInitial) * 100)
                return (
                  <tr key={b.id} className="border-b border-ink-900/6 last:border-0 hover:bg-ink-900/[0.015]">
                    <td className="px-5 py-3.5 font-mono-data text-xs font-medium text-ink-900">{b.reference}</td>
                    <td className="px-5 py-3.5 text-ink-700">{b.lotIncubationRef ?? '—'}</td>
                    <td className="px-5 py-3.5 text-ink-700">{b.effectifInitial.toLocaleString('fr-FR')}</td>
                    <td className="px-5 py-3.5 font-medium text-ink-900">{vendu.toLocaleString('fr-FR')}</td>
                    <td className="px-5 py-3.5 text-ink-700">{pertes.toLocaleString('fr-FR')}</td>
                    <td className="px-5 py-3.5">
                      <Badge tone={valorisation >= 95 ? 'success' : valorisation >= 85 ? 'warning' : 'danger'}>{valorisation}%</Badge>
                    </td>
                    {peutModifier && (
                      <td className="px-5 py-3.5 text-right">
                        <Button size="sm" variant="ghost" onClick={() => setBandeASupprimer(b)} title="Supprimer">
                          <Trash2 size={13} className="text-signal-red" />
                        </Button>
                      </td>
                    )}
                  </tr>
                )
              })}
            </tbody>
          </table>
</div>
        </Card>
      </section>

      <MortaliteModal bande={bandeMortalite} onClose={() => setBandeMortalite(null)} utilisateurNom={user?.nom ?? ''} />
      <EcoulerModal
        bande={bandeEcouler}
        onClose={() => setBandeEcouler(null)}
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
      <SanteModal bande={bandeSante} onClose={() => setBandeSante(null)} utilisateurNom={user?.nom ?? ''} />
      <ConfirmDialog
        open={!!bandeASupprimer}
        title="Supprimer cette bande ?"
        description={`La bande ${bandeASupprimer?.reference} sera définitivement supprimée. L'historique des ventes liées reste conservé mais ne sera plus rattaché à cette bande.`}
        onConfirm={confirmerSuppressionBande}
        onCancel={() => setBandeASupprimer(null)}
      />
    </div>
  )
}

function BandeCard({
  bande,
  peutModifier,
  onMortalite,
  onEcouler,
  onSante,
}: {
  bande: BandeVolaille
  peutModifier: boolean
  onMortalite: () => void
  onEcouler: () => void
  onSante: () => void
}) {
  const ageJours = differenceInCalendarDays(new Date(), new Date(bande.dateDebut))
  const mortalitesBande = useLiveQuery(() => db.mortalites.where('bandeId').equals(bande.id).toArray(), [bande.id])
  const perte = (mortalitesBande ?? []).reduce((s, m) => s + m.quantite, 0)
  const tauxPerte = Math.round((perte / bande.effectifInitial) * 100)
  const soins = useLiveQuery(() => db.soinsSante.where('bandeId').equals(bande.id).count(), [bande.id])

  return (
    <Card className="p-5">
      <div className="flex items-start gap-4">
        <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-moss-500/10 text-moss-600">
          <Bird size={22} />
        </div>
        <div className="min-w-0 flex-1">
          <p className="font-mono-data text-xs font-medium text-ink-700/70">{bande.reference}</p>
          <p className="mt-0.5 font-display text-base font-semibold text-ink-950">
            {bande.effectifActuel.toLocaleString('fr-FR')} sujets
          </p>
          <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-ink-700/70">
            <span className="flex items-center gap-1">
              <Calendar size={12} /> {ageJours} j d'âge
            </span>
            {bande.lotIncubationRef && (
              <span className="flex items-center gap-1">
                <Link2 size={12} /> {bande.lotIncubationRef}
              </span>
            )}
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

function MortaliteModal({
  bande,
  onClose,
  utilisateurNom,
}: {
  bande: BandeVolaille | null
  onClose: () => void
  utilisateurNom: string
}) {
  const [quantite, setQuantite] = useState('')
  const [cause, setCause] = useState('')
  const [erreur, setErreur] = useState('')
  const [envoi, setEnvoi] = useState(false)

  if (!bande) return null

  async function submit() {
    if (!bande || !quantite || envoi) return
    const q = Number(quantite)
    if (q <= 0) {
      setErreur('Entrez un nombre supérieur à 0.')
      return
    }
    if (q > bande.effectifActuel) {
      setErreur(`Impossible : il n'y a que ${bande.effectifActuel.toLocaleString('fr-FR')} sujets dans cette bande. Vérifiez le chiffre saisi.`)
      return
    }
    setEnvoi(true)
    await db.mortalites.add({
      id: genId('mor'),
      bandeId: bande.id,
      date: new Date().toISOString(),
      quantite: q,
      cause: cause || undefined,
      creePar: utilisateurNom,
      syncStatus: 'en_attente',
    })
    await db.bandesVolaille.update(bande.id, {
      effectifActuel: bande.effectifActuel - q,
      modifieLe: new Date().toISOString(),
      syncStatus: 'en_attente',
    })
    await logActivity(utilisateurNom, 'Enregistrement de mortalité', bande.reference)
    setQuantite('')
    setCause('')
    setErreur('')
    setEnvoi(false)
    onClose()
  }

  return (
    <Modal open={!!bande} onClose={onClose} title={`Mortalité — ${bande.reference}`}>
      <div className="space-y-4">
        <p className="rounded-lg bg-ink-900/[0.03] px-3.5 py-2.5 text-xs text-ink-700">
          Effectif actuel : {bande.effectifActuel.toLocaleString('fr-FR')} sujets
        </p>
        <FormField label="Nombre de pertes">
          <input
            type="number"
            min={1}
            max={bande.effectifActuel}
            className={inputClass}
            placeholder="8"
            value={quantite}
            onChange={(e) => {
              setQuantite(e.target.value)
              setErreur('')
            }}
          />
        </FormField>
        {erreur && <p className="rounded-lg bg-signal-red/8 px-3.5 py-2.5 text-xs font-medium text-signal-red">{erreur}</p>}
        <FormField label="Cause (optionnel)">
          <input
            className={inputClass}
            placeholder="Chaleur, maladie, écrasement…"
            value={cause}
            onChange={(e) => setCause(e.target.value)}
          />
        </FormField>
        <div className="flex justify-end gap-2 pt-2">
          <Button variant="ghost" onClick={onClose}>Annuler</Button>
          <Button variant="danger" onClick={submit} disabled={envoi}>{envoi ? 'Enregistrement…' : 'Enregistrer'}</Button>
        </div>
      </div>
    </Modal>
  )
}

function EcoulerModal({
  bande,
  onClose,
  utilisateurNom,
  onCreated,
}: {
  bande: BandeVolaille | null
  onClose: () => void
  utilisateurNom: string
  onCreated: (vente: Vente) => void
}) {
  const clients = useLiveQuery(() => db.clients.toArray(), [])
  const nomsClients = (clients ?? []).map((c) => c.nom)
  const [clientNom, setClientNom] = useState('')
  const [prixUnitaire, setPrixUnitaire] = useState('')
  const [statutPaiement, setStatutPaiement] = useState<'paye' | 'partiel' | 'attente'>('paye')
  const [montantPaye, setMontantPaye] = useState('')
  const [envoi, setEnvoi] = useState(false)

  if (!bande) return null

  const quantite = bande.effectifActuel
  const montantTotal = prixUnitaire ? quantite * Number(prixUnitaire) : 0

  async function submit() {
    if (!bande || !clientNom || !prixUnitaire || envoi) return
    setEnvoi(true)
    const nomFinal = await ensureClientExists(clientNom)
    const maintenant = new Date().toISOString()
    // Le statut réel dépend du montant saisi, pas seulement du bouton
    // cliqué (même correction que côté Ventes et Achats).
    let statutFinal: 'paye' | 'partiel' | 'attente' = statutPaiement
    let paye: number
    if (statutPaiement === 'attente') {
      paye = 0
    } else if (statutPaiement === 'paye') {
      paye = montantTotal
    } else {
      paye = Math.min(montantTotal, Math.max(0, Number(montantPaye) || 0))
      if (montantTotal > 0 && paye >= montantTotal) {
        statutFinal = 'paye'
        paye = montantTotal
      } else if (paye <= 0) {
        statutFinal = 'attente'
        paye = 0
      }
    }

    const nouvelleVente: Vente = {
      id: genId('vte'),
      reference: genReference('VTE'),
      clientNom: nomFinal,
      bandeId: bande.id,
      bandeRef: bande.reference,
      type: 'poulet',
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
    await vendreDepuisBande(bande.id, quantite)
    await logActivity(utilisateurNom, 'Vente et clôture de la bande', bande.reference)
    setClientNom('')
    setPrixUnitaire('')
    setMontantPaye('')
    setStatutPaiement('paye')
    setEnvoi(false)
    onClose()
    onCreated(nouvelleVente)
  }

  return (
    <Modal open={!!bande} onClose={onClose} title={`Écouler la bande — ${bande.reference}`}>
      <div className="space-y-4">
        <p className="rounded-lg bg-ink-900/[0.03] px-3.5 py-2.5 text-xs text-ink-700">
          {quantite.toLocaleString('fr-FR')} sujets seront vendus en une seule transaction et la bande sera
          clôturée. Cette vente apparaîtra dans le module Ventes.
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
          <input
            type="number"
            min={0}
            className={inputClass}
            placeholder="1500"
            value={prixUnitaire}
            onChange={(e) => setPrixUnitaire(e.target.value)}
          />
        </FormField>
        {montantTotal > 0 && (
          <div className="flex items-center justify-between rounded-lg bg-yolk-500/10 px-3.5 py-2.5">
            <span className="text-xs font-medium text-yolk-700">Montant total</span>
            <span className="font-display text-lg font-semibold text-yolk-700">
              {montantTotal.toLocaleString('fr-FR')} FCFA
            </span>
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
                  statutPaiement === s
                    ? 'border-yolk-500 bg-yolk-500/10 text-yolk-700'
                    : 'border-ink-900/12 text-ink-700 hover:bg-ink-900/[0.02]'
                }`}
              >
                {s === 'paye' ? 'Payé' : s === 'partiel' ? 'Partiel' : 'En attente'}
              </button>
            ))}
          </div>
        </FormField>
        {statutPaiement === 'partiel' && (
          <FormField label="Montant déjà versé (FCFA)">
            <input
              type="number"
              min={0}
              className={inputClass}
              placeholder="50000"
              value={montantPaye}
              onChange={(e) => setMontantPaye(e.target.value)}
            />
            {montantTotal > 0 && (
              <p className="mt-1.5 text-[11px] text-ink-700/50">
                {Number(montantPaye) >= montantTotal && montantPaye
                  ? 'Ce montant couvre le total — la vente sera enregistrée comme "Payé".'
                  : `Reste à payer : ${Math.max(0, montantTotal - (Number(montantPaye) || 0)).toLocaleString('fr-FR')} FCFA`}
              </p>
            )}
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

const LABEL_TYPE_SOIN: Record<TypeSoin, string> = {
  vaccination: 'Vaccination',
  traitement: 'Traitement',
  controle: 'Contrôle vétérinaire',
}

/**
 * Suivi santé/vaccination d'une bande — visible et modifiable par
 * l'Administrateur et le Gestionnaire Technique (accès déjà limité au
 * niveau du module Poulailler dans store/auth.ts).
 */
function SanteModal({
  bande,
  onClose,
  utilisateurNom,
}: {
  bande: BandeVolaille | null
  onClose: () => void
  utilisateurNom: string
}) {
  const soins = useLiveQuery(
    () => (bande ? db.soinsSante.where('bandeId').equals(bande.id).reverse().sortBy('date') : Promise.resolve<SoinSante[]>([])),
    [bande?.id]
  )
  const [type, setType] = useState<TypeSoin>('vaccination')
  const [nom, setNom] = useState('')
  const [date, setDate] = useState(format(new Date(), 'yyyy-MM-dd'))
  const [rappel, setRappel] = useState('')
  const [notes, setNotes] = useState('')
  const [soinASupprimer, setSoinASupprimer] = useState<SoinSante | null>(null)

  if (!bande) return null

  async function submit() {
    if (!bande || !nom) return
    await db.soinsSante.add({
      id: genId('soin'),
      bandeId: bande.id,
      bandeRef: bande.reference,
      type,
      nom,
      date: new Date(date).toISOString(),
      rappelPrevu: rappel ? new Date(rappel).toISOString() : undefined,
      notes: notes || undefined,
      creePar: utilisateurNom,
      syncStatus: 'en_attente',
    })
    await logActivity(utilisateurNom, `Enregistrement — ${LABEL_TYPE_SOIN[type]}`, bande.reference)
    setNom('')
    setRappel('')
    setNotes('')
  }

  async function confirmerSuppressionSoin() {
    if (!soinASupprimer) return
    await db.soinsSante.delete(soinASupprimer.id)
    await logActivity(utilisateurNom, 'Suppression d\u2019un soin', soinASupprimer.nom)
    setSoinASupprimer(null)
  }

  return (
    <Modal open={!!bande} onClose={onClose} title={`Santé & vaccination — ${bande.reference}`} width="max-w-lg">
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
            <input
              className={inputClass}
              placeholder="Vaccin Newcastle, Vitamines, Visite vétérinaire…"
              value={nom}
              onChange={(e) => setNom(e.target.value)}
            />
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
            <p className="py-6 text-center text-sm text-ink-700/50">Aucun soin enregistré pour cette bande.</p>
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
        description={`« ${soinASupprimer?.nom} » sera définitivement supprimé de l'historique santé de cette bande.`}
        onConfirm={confirmerSuppressionSoin}
        onCancel={() => setSoinASupprimer(null)}
      />
    </Modal>
  )
}
