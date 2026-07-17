import { useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { format, isSameMonth } from 'date-fns'
import { fr } from 'date-fns/locale'
import { Plus, Wallet, Clock3, TrendingUp, FileText, Pencil, Trash2, CircleDollarSign } from 'lucide-react'
import { db, genId, genReference, logActivity, ensureClientExists, vendreDepuisBande, annulerVenteBande, vendreDepuisLotBetail, annulerVenteLotBetail } from '@/lib/db'
import { markForDelete } from '@/lib/sync'
import { useAuth } from '@/store/auth'
import { Button } from '@/components/ui/Button'
import { Card, Badge, StatCard, EmptyState } from '@/components/ui/Primitives'
import { Modal, FormField, inputClass } from '@/components/ui/Modal'
import { NameAutocomplete } from '@/components/ui/NameAutocomplete'
import { SearchInput } from '@/components/ui/SearchInput'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { FactureModal, PostVenteModal } from '@/components/invoice/FactureModal'
import type { StatutPaiement, TypeVente, Vente, BandeVolaille } from '@/types'

const LABEL_STATUT: Record<StatutPaiement, string> = {
  paye: 'Payé',
  partiel: 'Partiel',
  attente: 'En attente',
}
const TONE_STATUT: Record<StatutPaiement, 'success' | 'warning' | 'danger'> = {
  paye: 'success',
  partiel: 'warning',
  attente: 'danger',
}
const LABEL_TYPE: Record<TypeVente, string> = {
  poussin: 'Poussins',
  poulet: 'Poulets',
  chevre: 'Chèvres',
  mouton: 'Moutons',
  boeuf: 'Bœufs',
  autre: 'Autre',
}

export function Ventes() {
  const { user } = useAuth()
  const ventes = useLiveQuery(() => db.ventes.orderBy('dateVente').reverse().toArray(), [])
  const [recherche, setRecherche] = useState('')
  const [modal, setModal] = useState<{ mode: 'creer' } | { mode: 'modifier'; vente: Vente } | null>(null)
  const [venteJusteCreee, setVenteJusteCreee] = useState<Vente | null>(null)
  const [factureAAfficher, setFactureAAfficher] = useState<Vente | null>(null)
  const [venteASupprimer, setVenteASupprimer] = useState<Vente | null>(null)
  const [ventePaiement, setVentePaiement] = useState<Vente | null>(null)

  const peutModifier = user?.role === 'admin' || user?.role === 'commercial'
  const toutes = ventes ?? []
  const q = recherche.trim().toLowerCase()
  const list = q
    ? toutes.filter((v) => v.reference.toLowerCase().includes(q) || v.clientNom.toLowerCase().includes(q))
    : toutes

  const ceMois = toutes.filter((v) => isSameMonth(new Date(v.dateVente), new Date()))
  const caMois = ceMois.reduce((s, v) => s + v.montantTotal, 0)
  const enAttente = toutes.reduce((s, v) => s + (v.montantTotal - v.montantPaye), 0)

  async function confirmerSuppression() {
    if (!venteASupprimer) return
    await markForDelete('ventes', venteASupprimer.id)
    // Si cette vente était liée à une bande du Poulailler ou à un lot de
    // Bétail, on restitue la quantité vendue à son effectif (et on la
    // rouvre si besoin) — sinon les sujets "disparaissent" du système.
    if (venteASupprimer.bandeId) {
      await annulerVenteBande(venteASupprimer.bandeId, venteASupprimer.quantite)
      await logActivity(user?.nom ?? '', 'Restitution à la bande après suppression', venteASupprimer.bandeRef ?? '')
    }
    if (venteASupprimer.lotBetailId) {
      await annulerVenteLotBetail(venteASupprimer.lotBetailId, venteASupprimer.quantite)
      await logActivity(user?.nom ?? '', 'Restitution au lot de bétail après suppression', venteASupprimer.lotBetailRef ?? '')
    }
    await logActivity(user?.nom ?? '', 'Suppression de vente', venteASupprimer.reference)
    setVenteASupprimer(null)
  }

  return (
    <div className="space-y-7">
      <div className="flex flex-col items-start gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="font-display text-2xl font-semibold text-ink-950">Ventes</h1>
          <p className="mt-1 text-sm text-ink-700/60">
            Historique des ventes de poussins et poulets, statut de paiement.
          </p>
        </div>
        {peutModifier && (
          <Button onClick={() => setModal({ mode: 'creer' })}>
            <Plus size={16} /> Nouvelle vente
          </Button>
        )}
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard
          label="Chiffre d'affaires du mois"
          value={`${(caMois ?? 0).toLocaleString('fr-FR')} FCFA`}
          sub={`${ceMois.length} vente(s) ce mois-ci`}
          icon={<TrendingUp size={18} />}
          accent="moss"
        />
        <StatCard
          label="Montant en attente"
          value={`${(enAttente ?? 0).toLocaleString('fr-FR')} FCFA`}
          sub="Toutes ventes non soldées"
          icon={<Clock3 size={18} />}
          accent="clay"
        />
        <StatCard
          label="Total des ventes"
          value={String(toutes.length)}
          sub="Depuis le début"
          icon={<Wallet size={18} />}
          accent="yolk"
        />
      </div>

      {toutes.length === 0 ? (
        <EmptyState
          title="Aucune vente enregistrée"
          description="Les ventes issues du Poulailler (quand une bande est écoulée) apparaîtront ici automatiquement, ou créez-en une manuellement."
          action={
            peutModifier && (
              <Button size="sm" onClick={() => setModal({ mode: 'creer' })}>
                <Plus size={14} /> Nouvelle vente
              </Button>
            )
          }
        />
      ) : (
        <>
          <SearchInput value={recherche} onChange={setRecherche} placeholder="Rechercher par référence ou client…" />
          <Card className="overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[720px] text-sm">
                <thead>
                  <tr className="border-b border-ink-900/8 bg-ink-900/[0.02] text-left text-xs font-medium uppercase tracking-wide text-ink-700/60">
                    <th className="px-5 py-3">Référence</th>
                    <th className="px-5 py-3">Client</th>
                    <th className="px-5 py-3">Type</th>
                    <th className="px-5 py-3">Quantité</th>
                    <th className="px-5 py-3">Montant</th>
                    <th className="px-5 py-3">Paiement</th>
                    <th className="px-5 py-3">Date</th>
                    <th className="px-5 py-3" />
                  </tr>
                </thead>
                <tbody>
                  {list.length === 0 && (
                    <tr>
                      <td colSpan={8} className="px-5 py-8 text-center text-sm text-ink-700/50">
                        Aucun résultat pour « {recherche} ».
                      </td>
                    </tr>
                  )}
                  {list.map((v) => (
                    <tr key={v.id} className="border-b border-ink-900/6 last:border-0 hover:bg-ink-900/[0.015]">
                      <td className="px-5 py-3.5 font-mono-data text-xs font-medium text-ink-900">{v.reference}</td>
                      <td className="px-5 py-3.5 text-ink-900">{v.clientNom}</td>
                      <td className="px-5 py-3.5 text-ink-700">{LABEL_TYPE[v.type]}</td>
                      <td className="px-5 py-3.5 text-ink-700">{(v.quantite ?? 0).toLocaleString('fr-FR')}</td>
                      <td className="px-5 py-3.5 font-medium text-ink-900">
                        {(v.montantTotal ?? 0).toLocaleString('fr-FR')} FCFA
                      </td>
                      <td className="px-5 py-3.5">
                        <Badge tone={TONE_STATUT[v.statutPaiement]}>{LABEL_STATUT[v.statutPaiement]}</Badge>
                      </td>
                      <td className="px-5 py-3.5 text-ink-700">
                        {format(new Date(v.dateVente), 'd MMM yyyy', { locale: fr })}
                      </td>
                      <td className="px-5 py-3.5">
                        <div className="flex justify-end gap-1">
                          <Button size="sm" variant="ghost" onClick={() => setFactureAAfficher(v)} title="Facture">
                            <FileText size={13} />
                          </Button>
                          {peutModifier && v.statutPaiement !== 'paye' && (
                            <Button size="sm" variant="ghost" onClick={() => setVentePaiement(v)} title="Enregistrer un paiement">
                              <CircleDollarSign size={13} className="text-moss-600" />
                            </Button>
                          )}
                          {peutModifier && (
                            <>
                              <Button size="sm" variant="ghost" onClick={() => setModal({ mode: 'modifier', vente: v })} title="Modifier">
                                <Pencil size={13} />
                              </Button>
                              <Button size="sm" variant="ghost" onClick={() => setVenteASupprimer(v)} title="Supprimer">
                                <Trash2 size={13} className="text-signal-red" />
                              </Button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </>
      )}

      <VenteFormModal
        open={!!modal}
        venteExistante={modal?.mode === 'modifier' ? modal.vente : null}
        onClose={() => setModal(null)}
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
      <PaiementModal vente={ventePaiement} onClose={() => setVentePaiement(null)} utilisateurNom={user?.nom ?? ''} />
      <ConfirmDialog
        open={!!venteASupprimer}
        title="Supprimer cette vente ?"
        description={`La vente ${venteASupprimer?.reference} pour ${venteASupprimer?.clientNom} sera définitivement supprimée. Cette action est irréversible.${venteASupprimer?.bandeId ? ' La bande liée sera automatiquement rouverte en élevage.' : ''}`}
        onConfirm={confirmerSuppression}
        onCancel={() => setVenteASupprimer(null)}
      />
    </div>
  )
}

function VenteFormModal({
  open,
  venteExistante,
  onClose,
  utilisateurNom,
  onCreated,
}: {
  open: boolean
  venteExistante: Vente | null
  onClose: () => void
  utilisateurNom: string
  onCreated: (vente: Vente) => void
}) {
  const clients = useLiveQuery(() => db.clients.toArray(), [])
  const nomsClients = (clients ?? []).map((c) => c.nom)
  const bandesDisponibles = useLiveQuery(
    () => db.bandesVolaille.where('statut').equals('en_elevage').toArray(),
    []
  )
  const lotsBetailDisponibles = useLiveQuery(
    () => db.lotsBetail.where('statut').equals('en_elevage').toArray(),
    []
  )
  const [clientNom, setClientNom] = useState('')
  const [type, setType] = useState<TypeVente>('poulet')
  const [bandeId, setBandeId] = useState<string>('')
  const [lotBetailId, setLotBetailId] = useState<string>('')
  const [quantite, setQuantite] = useState('')
  const [prixUnitaire, setPrixUnitaire] = useState('')
  const [statutPaiement, setStatutPaiement] = useState<StatutPaiement>('paye')
  const [montantPayeSaisi, setMontantPayeSaisi] = useState('')
  const [erreurQuantite, setErreurQuantite] = useState('')
  const [cle, setCle] = useState<string | null>(null)
  const [envoi, setEnvoi] = useState(false)

  const estModification = !!venteExistante
  const bandeSelectionnee = (bandesDisponibles ?? []).find((b) => b.id === bandeId)
  const lotBetailSelectionne = (lotsBetailDisponibles ?? []).find((l) => l.id === lotBetailId)
  const categorieBetail = type === 'chevre' || type === 'mouton' || type === 'boeuf'

  if (open && venteExistante && cle !== venteExistante.id) {
    setCle(venteExistante.id)
    setClientNom(venteExistante.clientNom)
    setType(venteExistante.type)
    setBandeId(venteExistante.bandeId ?? '')
    setLotBetailId(venteExistante.lotBetailId ?? '')
    setQuantite(String(venteExistante.quantite))
    setPrixUnitaire(String(venteExistante.prixUnitaire))
    setStatutPaiement(venteExistante.statutPaiement)
    setMontantPayeSaisi(venteExistante.statutPaiement === 'partiel' ? String(venteExistante.montantPaye) : '')
  }
  if (open && !venteExistante && cle !== 'nouveau') {
    setCle('nouveau')
    setClientNom('')
    setType('poulet')
    setBandeId('')
    setLotBetailId('')
    setQuantite('')
    setPrixUnitaire('')
    setStatutPaiement('paye')
    setMontantPayeSaisi('')
  }

  const montantTotal = quantite && prixUnitaire ? Number(quantite) * Number(prixUnitaire) : 0

  // Le statut réellement enregistré est déterminé par le montant, pas
  // seulement par le bouton cliqué : si l'utilisateur choisit "Partiel"
  // mais tape un montant qui couvre le total, la vente doit être "Payé".
  function calculerPaiement(): { statutFinal: StatutPaiement; montantPayeFinal: number } {
    if (statutPaiement === 'attente') return { statutFinal: 'attente', montantPayeFinal: 0 }
    if (statutPaiement === 'paye') return { statutFinal: 'paye', montantPayeFinal: montantTotal }
    const saisi = Math.min(montantTotal, Math.max(0, Number(montantPayeSaisi) || 0))
    if (montantTotal > 0 && saisi >= montantTotal) return { statutFinal: 'paye', montantPayeFinal: montantTotal }
    if (saisi <= 0) return { statutFinal: 'attente', montantPayeFinal: 0 }
    return { statutFinal: 'partiel', montantPayeFinal: saisi }
  }

  async function submit() {
    if (!clientNom || !quantite || !prixUnitaire || envoi) return
    if (statutPaiement === 'partiel' && !montantPayeSaisi) return
    setErreurQuantite('')
    setEnvoi(true)
    const nouvelleQuantite = Number(quantite)

    if (estModification && venteExistante) {
      // Si la vente est liée à une bande ou à un lot de bétail, on ajuste
      // l'effectif par la différence (delta) entre l'ancienne et la
      // nouvelle quantité.
      try {
        if (venteExistante.bandeId) {
          const delta = nouvelleQuantite - venteExistante.quantite
          if (delta > 0) await vendreDepuisBande(venteExistante.bandeId, delta)
          else if (delta < 0) await annulerVenteBande(venteExistante.bandeId, -delta)
        } else if (venteExistante.lotBetailId) {
          const delta = nouvelleQuantite - venteExistante.quantite
          if (delta > 0) await vendreDepuisLotBetail(venteExistante.lotBetailId, delta)
          else if (delta < 0) await annulerVenteLotBetail(venteExistante.lotBetailId, -delta)
        }
      } catch (e) {
        setErreurQuantite(e instanceof Error ? e.message : 'Quantité invalide.')
        setEnvoi(false)
        return
      }
      const nomFinal = await ensureClientExists(clientNom)
      const maintenant = new Date().toISOString()
      const { statutFinal, montantPayeFinal } = calculerPaiement()
      await db.ventes.update(venteExistante.id, {
        clientNom: nomFinal,
        type,
        quantite: nouvelleQuantite,
        prixUnitaire: Number(prixUnitaire),
        montantTotal,
        montantPaye: montantPayeFinal,
        statutPaiement: statutFinal,
        modifieLe: maintenant,
        syncStatus: 'en_attente',
      })
      await logActivity(utilisateurNom, 'Modification de vente', venteExistante.reference)
      setEnvoi(false)
      onClose()
      return
    }

    // Nouvelle vente : si une bande ou un lot de bétail d'origine est
    // choisi, on déduit l'effectif correspondant (vente totale ou
    // partielle).
    if (bandeId) {
      const bande = (bandesDisponibles ?? []).find((b) => b.id === bandeId)
      if (!bande || nouvelleQuantite > bande.effectifActuel) {
        setErreurQuantite(
          `Impossible : il n'y a que ${(bande?.effectifActuel ?? 0).toLocaleString('fr-FR')} sujets disponibles dans cette bande.`
        )
        setEnvoi(false)
        return
      }
    }
    if (lotBetailId) {
      const lot = (lotsBetailDisponibles ?? []).find((l) => l.id === lotBetailId)
      if (!lot || nouvelleQuantite > lot.effectifActuel) {
        setErreurQuantite(
          `Impossible : il n'y a que ${(lot?.effectifActuel ?? 0).toLocaleString('fr-FR')} têtes disponibles dans ce lot.`
        )
        setEnvoi(false)
        return
      }
    }

    const nomFinal = await ensureClientExists(clientNom)
    const maintenant = new Date().toISOString()
    const { statutFinal, montantPayeFinal } = calculerPaiement()
    const bandeChoisie = (bandesDisponibles ?? []).find((b) => b.id === bandeId)
    const lotBetailChoisi = (lotsBetailDisponibles ?? []).find((l) => l.id === lotBetailId)

    const nouvelleVente: Vente = {
      id: genId('vte'),
      reference: genReference('VTE'),
      clientNom: nomFinal,
      bandeId: bandeChoisie?.id,
      bandeRef: bandeChoisie?.reference,
      lotBetailId: lotBetailChoisi?.id,
      lotBetailRef: lotBetailChoisi?.reference,
      type,
      quantite: nouvelleQuantite,
      prixUnitaire: Number(prixUnitaire),
      montantTotal,
      montantPaye: montantPayeFinal,
      statutPaiement: statutFinal,
      dateVente: maintenant,
      creePar: utilisateurNom,
      creeLe: maintenant,
      modifieLe: maintenant,
      syncStatus: 'en_attente',
    }
    await db.ventes.add(nouvelleVente)
    if (bandeChoisie) await vendreDepuisBande(bandeChoisie.id, nouvelleQuantite)
    if (lotBetailChoisi) await vendreDepuisLotBetail(lotBetailChoisi.id, nouvelleQuantite)
    await logActivity(utilisateurNom, 'Création de vente', nomFinal)
    setEnvoi(false)
    onClose()
    onCreated(nouvelleVente)
  }

  return (
    <Modal open={open} onClose={onClose} title={estModification ? `Modifier — ${venteExistante?.reference}` : 'Nouvelle vente'}>
      <div className="space-y-4">
        <FormField label="Client">
          <NameAutocomplete
            value={clientNom}
            onChange={setClientNom}
            suggestions={nomsClients}
            placeholder="Nom du client"
            existeLabel="Client existant"
            nouveauLabel="Nouveau client — sera ajouté automatiquement"
          />
        </FormField>
        <FormField label="Type de produit">
          <div className="grid grid-cols-3 gap-2 sm:grid-cols-6">
            {(['poussin', 'poulet', 'chevre', 'mouton', 'boeuf', 'autre'] as const).map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => {
                  setType(t)
                  setBandeId('')
                  setLotBetailId('')
                  setErreurQuantite('')
                }}
                className={`rounded-lg border px-3 py-2 text-xs font-medium transition-colors ${
                  type === t
                    ? 'border-yolk-500 bg-yolk-500/10 text-yolk-700'
                    : 'border-ink-900/12 text-ink-700 hover:bg-ink-900/[0.02]'
                }`}
              >
                {LABEL_TYPE[t]}
              </button>
            ))}
          </div>
        </FormField>

        {!estModification && (type === 'poussin' || type === 'poulet') && (
          <FormField label="Bande d'origine (optionnel)">
            <select
              className={inputClass}
              value={bandeId}
              onChange={(e) => {
                setBandeId(e.target.value)
                setErreurQuantite('')
              }}
            >
              <option value="">Aucune — vente non liée à une bande</option>
              {(bandesDisponibles ?? []).map((b) => (
                <option key={b.id} value={b.id}>
                  {b.reference} — {(b.effectifActuel ?? 0).toLocaleString('fr-FR')} disponibles
                </option>
              ))}
            </select>
            <p className="mt-1.5 text-[11px] text-ink-700/50">
              {bandeSelectionnee
                ? "L'effectif de cette bande sera automatiquement diminué de la quantité vendue."
                : 'Choisis une bande pour déduire automatiquement son effectif — sinon la vente reste indépendante du Poulailler.'}
            </p>
          </FormField>
        )}
        {!estModification && categorieBetail && (
          <FormField label="Lot d'origine (optionnel)">
            <select
              className={inputClass}
              value={lotBetailId}
              onChange={(e) => {
                setLotBetailId(e.target.value)
                setErreurQuantite('')
              }}
            >
              <option value="">Aucun — vente non liée à un lot</option>
              {(lotsBetailDisponibles ?? []).filter((l) => l.categorie === type).map((l) => (
                <option key={l.id} value={l.id}>
                  {l.reference} — {(l.effectifActuel ?? 0).toLocaleString('fr-FR')} disponibles
                </option>
              ))}
            </select>
            <p className="mt-1.5 text-[11px] text-ink-700/50">
              {lotBetailSelectionne
                ? "L'effectif de ce lot sera automatiquement diminué de la quantité vendue."
                : 'Choisis un lot pour déduire automatiquement son effectif — sinon la vente reste indépendante du Bétail.'}
            </p>
          </FormField>
        )}
        {estModification && venteExistante?.bandeRef && (
          <p className="rounded-lg bg-ink-900/[0.03] px-3.5 py-2.5 text-xs text-ink-700">
            Liée à la bande <span className="font-medium">{venteExistante.bandeRef}</span> — son effectif sera
            ajusté automatiquement si tu changes la quantité.
          </p>
        )}
        {estModification && venteExistante?.lotBetailRef && (
          <p className="rounded-lg bg-ink-900/[0.03] px-3.5 py-2.5 text-xs text-ink-700">
            Liée au lot <span className="font-medium">{venteExistante.lotBetailRef}</span> — son effectif sera
            ajusté automatiquement si tu changes la quantité.
          </p>
        )}

        <div className="grid grid-cols-2 gap-4">
          <FormField label="Quantité">
            <input
              type="number"
              min={0}
              max={bandeSelectionnee?.effectifActuel ?? lotBetailSelectionne?.effectifActuel}
              className={inputClass}
              placeholder="200"
              value={quantite}
              onChange={(e) => {
                setQuantite(e.target.value)
                setErreurQuantite('')
              }}
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
        </div>
        {montantTotal > 0 && (
          <div className="flex items-center justify-between rounded-lg bg-yolk-500/10 px-3.5 py-2.5">
            <span className="text-xs font-medium text-yolk-700">Montant total</span>
            <span className="font-display text-lg font-semibold text-yolk-700">
              {(montantTotal ?? 0).toLocaleString('fr-FR')} FCFA
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
                {LABEL_STATUT[s]}
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
              placeholder="Ex. 50000"
              value={montantPayeSaisi}
              onChange={(e) => setMontantPayeSaisi(e.target.value)}
            />
            {montantTotal > 0 && (
              <p className="mt-1.5 text-[11px] text-ink-700/50">
                {Number(montantPayeSaisi) >= montantTotal && montantPayeSaisi
                  ? 'Ce montant couvre le total — la vente sera enregistrée comme "Payé".'
                  : `Reste à payer : ${(Math.max(0, montantTotal - (Number(montantPayeSaisi) || 0)) ?? 0).toLocaleString('fr-FR')} FCFA`}
              </p>
            )}
          </FormField>
        )}
        {erreurQuantite && (
          <p className="rounded-lg bg-signal-red/8 px-3.5 py-2.5 text-xs font-medium text-signal-red">{erreurQuantite}</p>
        )}
        <div className="flex justify-end gap-2 pt-2">
          <Button variant="ghost" onClick={onClose}>Annuler</Button>
          <Button onClick={submit} disabled={envoi}>
            {envoi ? 'Enregistrement…' : estModification ? 'Enregistrer les modifications' : 'Enregistrer la vente'}
          </Button>
        </div>
      </div>
    </Modal>
  )
}

/**
 * Permet d'enregistrer un paiement reçu après coup (le client revient payer
 * tout ou partie du solde restant), sans avoir à rouvrir tout le formulaire
 * de la vente. Le statut de paiement se recalcule automatiquement.
 */
function PaiementModal({
  vente,
  onClose,
  utilisateurNom,
}: {
  vente: Vente | null
  onClose: () => void
  utilisateurNom: string
}) {
  const [montant, setMontant] = useState('')

  if (!vente) return null

  const resteActuel = vente.montantTotal - vente.montantPaye
  const montantSaisi = Math.min(resteActuel, Math.max(0, Number(montant) || 0))
  const nouveauPaye = vente.montantPaye + montantSaisi
  const nouveauReste = vente.montantTotal - nouveauPaye

  async function submit() {
    if (!vente || !montant) return
    const nouveauStatut: StatutPaiement = nouveauReste <= 0 ? 'paye' : nouveauPaye > 0 ? 'partiel' : 'attente'
    await db.ventes.update(vente.id, {
      montantPaye: nouveauPaye,
      statutPaiement: nouveauStatut,
      modifieLe: new Date().toISOString(),
      syncStatus: 'en_attente',
    })
    await logActivity(utilisateurNom, 'Paiement reçu', `${vente.reference} — ${(montantSaisi ?? 0).toLocaleString('fr-FR')} FCFA`)
    setMontant('')
    onClose()
  }

  return (
    <Modal open={!!vente} onClose={onClose} title={`Enregistrer un paiement — ${vente.reference}`} width="max-w-sm">
      <div className="space-y-4">
        <div className="space-y-1.5 rounded-lg bg-ink-900/[0.03] px-3.5 py-3 text-xs text-ink-700">
          <div className="flex justify-between"><span>Montant total</span><span className="font-medium text-ink-900">{(vente.montantTotal ?? 0).toLocaleString('fr-FR')} FCFA</span></div>
          <div className="flex justify-between"><span>Déjà versé</span><span className="font-medium text-ink-900">{(vente.montantPaye ?? 0).toLocaleString('fr-FR')} FCFA</span></div>
          <div className="flex justify-between border-t border-ink-900/10 pt-1.5"><span className="font-medium text-clay-600">Reste à payer</span><span className="font-semibold text-clay-600">{(resteActuel ?? 0).toLocaleString('fr-FR')} FCFA</span></div>
        </div>
        <FormField label="Montant reçu maintenant (FCFA)">
          <input
            type="number"
            min={0}
            className={inputClass}
            placeholder={`Jusqu'à ${(resteActuel ?? 0).toLocaleString('fr-FR')}`}
            value={montant}
            onChange={(e) => setMontant(e.target.value)}
          />
        </FormField>
        {montant && (
          <div className="flex items-center justify-between rounded-lg bg-moss-500/8 px-3.5 py-2.5">
            <span className="text-xs font-medium text-moss-600">
              {nouveauReste <= 0 ? 'Vente entièrement soldée' : 'Nouveau reste à payer'}
            </span>
            <span className="font-display text-lg font-semibold text-moss-600">
              {nouveauReste <= 0 ? '0 FCFA' : `${(nouveauReste ?? 0).toLocaleString('fr-FR')} FCFA`}
            </span>
          </div>
        )}
        <div className="flex justify-end gap-2 pt-2">
          <Button variant="ghost" onClick={onClose}>Annuler</Button>
          <Button onClick={submit}>Enregistrer le paiement</Button>
        </div>
      </div>
    </Modal>
  )
}
