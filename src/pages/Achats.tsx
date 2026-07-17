import { useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { format, isSameMonth } from 'date-fns'
import { fr } from 'date-fns/locale'
import { Plus, ShoppingCart, Clock3, TrendingUp, Pencil, Trash2, CircleDollarSign } from 'lucide-react'
import { db, genId, genReference, logActivity, ensureFournisseurExists, enregistrerEntreeStock } from '@/lib/db'
import { markForDelete } from '@/lib/sync'
import { useAuth } from '@/store/auth'
import { Button } from '@/components/ui/Button'
import { Card, Badge, StatCard, EmptyState } from '@/components/ui/Primitives'
import { Modal, FormField, inputClass } from '@/components/ui/Modal'
import { NameAutocomplete } from '@/components/ui/NameAutocomplete'
import { SearchInput } from '@/components/ui/SearchInput'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import type { Achat, CategorieAchat, StatutPaiement } from '@/types'

const LABEL_CATEGORIE: Record<CategorieAchat, string> = {
  oeufs: 'Œufs fécondés',
  aliment: 'Aliments',
  materiel: 'Matériel',
  autre: 'Autre',
}
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

export function Achats() {
  const { user } = useAuth()
  const achats = useLiveQuery(() => db.achats.orderBy('date').reverse().toArray(), [])
  const [recherche, setRecherche] = useState('')
  const [modal, setModal] = useState<{ mode: 'creer' } | { mode: 'modifier'; achat: Achat } | null>(null)
  const [achatASupprimer, setAchatASupprimer] = useState<Achat | null>(null)
  const [achatPaiement, setAchatPaiement] = useState<Achat | null>(null)

  const peutModifier = user?.role === 'admin' || user?.role === 'commercial'
  const toutes = achats ?? []
  const q = recherche.trim().toLowerCase()
  const list = q
    ? toutes.filter((a) => a.reference.toLowerCase().includes(q) || a.fournisseurNom.toLowerCase().includes(q) || a.description.toLowerCase().includes(q))
    : toutes

  const ceMois = toutes.filter((a) => isSameMonth(new Date(a.date), new Date()))
  const totalMois = ceMois.reduce((s, a) => s + a.montant, 0)
  const enAttente = toutes.reduce((s, a) => s + (a.montant - a.montantPaye), 0)

  async function confirmerSuppression() {
    if (!achatASupprimer) return
    await markForDelete('achats', achatASupprimer.id)
    await logActivity(user?.nom ?? '', "Suppression d'achat", achatASupprimer.reference)
    setAchatASupprimer(null)
  }

  return (
    <div className="space-y-7">
      <div className="flex flex-col items-start gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="font-display text-2xl font-semibold text-ink-950">Achats</h1>
          <p className="mt-1 text-sm text-ink-700/60">
            Enregistrement des achats d'œufs, d'aliments et de matériel.
          </p>
        </div>
        {peutModifier && (
          <Button onClick={() => setModal({ mode: 'creer' })}>
            <Plus size={16} /> Nouvel achat
          </Button>
        )}
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard
          label="Achats du mois"
          value={`${totalMois.toLocaleString('fr-FR')} FCFA`}
          sub={`${ceMois.length} achat(s) ce mois-ci`}
          icon={<TrendingUp size={18} />}
          accent="clay"
        />
        <StatCard
          label="Dû aux fournisseurs"
          value={`${enAttente.toLocaleString('fr-FR')} FCFA`}
          sub="Toutes dettes non soldées"
          icon={<Clock3 size={18} />}
          accent="yolk"
        />
        <StatCard label="Total des achats" value={String(toutes.length)} sub="Depuis le début" icon={<ShoppingCart size={18} />} />
      </div>

      {toutes.length === 0 ? (
        <EmptyState
          title="Aucun achat enregistré"
          description="Enregistrez vos achats d'œufs fécondés, d'aliments et de matériel pour suivre vos coûts."
          action={
            peutModifier && (
              <Button size="sm" onClick={() => setModal({ mode: 'creer' })}>
                <Plus size={14} /> Nouvel achat
              </Button>
            )
          }
        />
      ) : (
        <>
          <SearchInput value={recherche} onChange={setRecherche} placeholder="Rechercher par référence, fournisseur, description…" />
          <Card className="overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[760px] text-sm">
                <thead>
                  <tr className="border-b border-ink-900/8 bg-ink-900/[0.02] text-left text-xs font-medium uppercase tracking-wide text-ink-700/60">
                    <th className="px-5 py-3">Référence</th>
                    <th className="px-5 py-3">Fournisseur</th>
                    <th className="px-5 py-3">Catégorie</th>
                    <th className="px-5 py-3">Description</th>
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
                  {list.map((a) => (
                    <tr key={a.id} className="border-b border-ink-900/6 last:border-0 hover:bg-ink-900/[0.015]">
                      <td className="px-5 py-3.5 font-mono-data text-xs font-medium text-ink-900">{a.reference}</td>
                      <td className="px-5 py-3.5 text-ink-900">{a.fournisseurNom}</td>
                      <td className="px-5 py-3.5"><Badge tone="neutral">{LABEL_CATEGORIE[a.categorie]}</Badge></td>
                      <td className="px-5 py-3.5 text-ink-700">{a.description}</td>
                      <td className="px-5 py-3.5 font-medium text-ink-900">{a.montant.toLocaleString('fr-FR')} FCFA</td>
                      <td className="px-5 py-3.5"><Badge tone={TONE_STATUT[a.statutPaiement]}>{LABEL_STATUT[a.statutPaiement]}</Badge></td>
                      <td className="px-5 py-3.5 text-ink-700">{format(new Date(a.date), 'd MMM yyyy', { locale: fr })}</td>
                      <td className="px-5 py-3.5">
                        {peutModifier && (
                          <div className="flex justify-end gap-1">
                            {a.statutPaiement !== 'paye' && (
                              <Button size="sm" variant="ghost" onClick={() => setAchatPaiement(a)} title="Enregistrer un paiement">
                                <CircleDollarSign size={13} className="text-moss-600" />
                              </Button>
                            )}
                            <Button size="sm" variant="ghost" onClick={() => setModal({ mode: 'modifier', achat: a })} title="Modifier">
                              <Pencil size={13} />
                            </Button>
                            <Button size="sm" variant="ghost" onClick={() => setAchatASupprimer(a)} title="Supprimer">
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
          </Card>
        </>
      )}

      <AchatFormModal
        open={!!modal}
        achatExistant={modal?.mode === 'modifier' ? modal.achat : null}
        onClose={() => setModal(null)}
        utilisateurNom={user?.nom ?? ''}
      />
      <ConfirmDialog
        open={!!achatASupprimer}
        title="Supprimer cet achat ?"
        description={`L'achat ${achatASupprimer?.reference} auprès de ${achatASupprimer?.fournisseurNom} sera définitivement supprimé. Le stock déjà mis à jour par cet achat ne sera pas modifié automatiquement.`}
        onConfirm={confirmerSuppression}
        onCancel={() => setAchatASupprimer(null)}
      />
      <PaiementAchatModal achat={achatPaiement} onClose={() => setAchatPaiement(null)} utilisateurNom={user?.nom ?? ''} />
    </div>
  )
}

function AchatFormModal({
  open,
  achatExistant,
  onClose,
  utilisateurNom,
}: {
  open: boolean
  achatExistant: Achat | null
  onClose: () => void
  utilisateurNom: string
}) {
  const fournisseurs = useLiveQuery(() => db.fournisseurs.toArray(), [])
  const nomsFournisseurs = (fournisseurs ?? []).map((f) => f.nom)
  const stockItems = useLiveQuery(() => db.stockItems.toArray(), [])
  const nomsArticles = (stockItems ?? []).map((s) => s.nom)
  const [fournisseurNom, setFournisseurNom] = useState('')
  const [categorie, setCategorie] = useState<CategorieAchat>('oeufs')
  const [description, setDescription] = useState('')
  const [montant, setMontant] = useState('')
  const [statutPaiement, setStatutPaiement] = useState<StatutPaiement>('paye')
  const [montantPayeSaisi, setMontantPayeSaisi] = useState('')
  const [date, setDate] = useState(format(new Date(), 'yyyy-MM-dd'))
  const [article, setArticle] = useState('')
  const [quantiteArticle, setQuantiteArticle] = useState('')
  const [unite, setUnite] = useState('sacs')
  const [cle, setCle] = useState<string | null>(null)
  const [envoi, setEnvoi] = useState(false)

  const estModification = !!achatExistant
  const lieAuStock = categorie === 'aliment' || categorie === 'materiel'

  if (open && achatExistant && cle !== achatExistant.id) {
    setCle(achatExistant.id)
    setFournisseurNom(achatExistant.fournisseurNom)
    setCategorie(achatExistant.categorie)
    setDescription(achatExistant.description)
    setMontant(String(achatExistant.montant))
    setStatutPaiement(achatExistant.statutPaiement)
    setMontantPayeSaisi(achatExistant.statutPaiement === 'partiel' ? String(achatExistant.montantPaye) : '')
    setDate(format(new Date(achatExistant.date), 'yyyy-MM-dd'))
  }
  if (open && !achatExistant && cle !== 'nouveau') {
    setCle('nouveau')
    setFournisseurNom('')
    setCategorie('oeufs')
    setDescription('')
    setMontant('')
    setStatutPaiement('paye')
    setMontantPayeSaisi('')
    setDate(format(new Date(), 'yyyy-MM-dd'))
    setArticle('')
    setQuantiteArticle('')
  }

  // Le statut réellement enregistré dépend du montant saisi, pas
  // seulement du bouton cliqué (même correction que côté Ventes).
  function calculerPaiement(montantNum: number): { statutFinal: StatutPaiement; montantPayeFinal: number } {
    if (statutPaiement === 'attente') return { statutFinal: 'attente', montantPayeFinal: 0 }
    if (statutPaiement === 'paye') return { statutFinal: 'paye', montantPayeFinal: montantNum }
    const saisi = Math.min(montantNum, Math.max(0, Number(montantPayeSaisi) || 0))
    if (montantNum > 0 && saisi >= montantNum) return { statutFinal: 'paye', montantPayeFinal: montantNum }
    if (saisi <= 0) return { statutFinal: 'attente', montantPayeFinal: 0 }
    return { statutFinal: 'partiel', montantPayeFinal: saisi }
  }

  async function submit() {
    if (!fournisseurNom || !description || !montant || envoi) return
    if (statutPaiement === 'partiel' && !montantPayeSaisi) return
    setEnvoi(true)
    const nomFinal = await ensureFournisseurExists(fournisseurNom)
    const maintenant = new Date().toISOString()
    const montantNum = Number(montant)
    const { statutFinal, montantPayeFinal } = calculerPaiement(montantNum)

    if (estModification && achatExistant) {
      await db.achats.update(achatExistant.id, {
        fournisseurNom: nomFinal,
        categorie,
        description,
        montant: montantNum,
        montantPaye: montantPayeFinal,
        statutPaiement: statutFinal,
        date: new Date(date).toISOString(),
        modifieLe: maintenant,
        syncStatus: 'en_attente',
      })
      await logActivity(utilisateurNom, "Modification d'achat", achatExistant.reference)
      setEnvoi(false)
      onClose()
      return
    }

    await db.achats.add({
      id: genId('ach'),
      reference: genReference('ACH'),
      fournisseurNom: nomFinal,
      categorie,
      description,
      quantite: quantiteArticle ? Number(quantiteArticle) : undefined,
      montant: montantNum,
      montantPaye: montantPayeFinal,
      statutPaiement: statutFinal,
      date: new Date(date).toISOString(),
      creePar: utilisateurNom,
      creeLe: maintenant,
      modifieLe: maintenant,
      syncStatus: 'en_attente',
    })

    if (lieAuStock && article && quantiteArticle) {
      await enregistrerEntreeStock({
        nomArticle: article,
        categorie,
        quantite: Number(quantiteArticle),
        unite,
        source: 'achat',
        utilisateurNom,
        motif: `Achat ${nomFinal}`,
      })
    }

    await logActivity(utilisateurNom, "Enregistrement d'achat", nomFinal)
    setEnvoi(false)
    onClose()
  }

  return (
    <Modal open={open} onClose={onClose} title={estModification ? `Modifier — ${achatExistant?.reference}` : 'Nouvel achat'}>
      <div className="space-y-4">
        <FormField label="Fournisseur">
          <NameAutocomplete
            value={fournisseurNom}
            onChange={setFournisseurNom}
            suggestions={nomsFournisseurs}
            placeholder="Ferme Diarra"
            existeLabel="Fournisseur existant"
            nouveauLabel="Nouveau fournisseur — sera ajouté automatiquement"
          />
        </FormField>
        <FormField label="Catégorie">
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            {(Object.keys(LABEL_CATEGORIE) as CategorieAchat[]).map((c) => (
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
        <FormField label="Description">
          <input className={inputClass} placeholder="5000 œufs fécondés" value={description} onChange={(e) => setDescription(e.target.value)} />
        </FormField>

        {lieAuStock && !estModification && (
          <div className="space-y-4 rounded-lg border border-yolk-500/25 bg-yolk-500/5 p-3.5">
            <p className="text-[11px] font-medium text-yolk-700">
              Cet achat alimentera automatiquement le stock correspondant.
            </p>
            <FormField label="Article en stock">
              <NameAutocomplete
                value={article}
                onChange={setArticle}
                suggestions={nomsArticles}
                placeholder="Aliment démarrage"
                existeLabel="Article existant — la quantité s'ajoutera"
                nouveauLabel="Nouvel article — sera créé automatiquement"
              />
            </FormField>
            <div className="grid grid-cols-2 gap-4">
              <FormField label="Quantité achetée">
                <input
                  type="number"
                  min={0}
                  className={inputClass}
                  placeholder="20"
                  value={quantiteArticle}
                  onChange={(e) => setQuantiteArticle(e.target.value)}
                />
              </FormField>
              <FormField label="Unité">
                <input className={inputClass} placeholder="sacs" value={unite} onChange={(e) => setUnite(e.target.value)} />
              </FormField>
            </div>
          </div>
        )}
        {estModification && (
          <p className="text-[11px] text-ink-700/50">
            Le stock déjà crédité par cet achat n'est pas recalculé automatiquement lors d'une modification.
          </p>
        )}

        <div className="grid grid-cols-2 gap-4">
          <FormField label="Montant (FCFA)">
            <input type="number" min={0} className={inputClass} placeholder="750000" value={montant} onChange={(e) => setMontant(e.target.value)} />
          </FormField>
          <FormField label="Date">
            <input type="date" className={inputClass} value={date} onChange={(e) => setDate(e.target.value)} />
          </FormField>
        </div>
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
              placeholder="Ex. 200000"
              value={montantPayeSaisi}
              onChange={(e) => setMontantPayeSaisi(e.target.value)}
            />
            {montant && (
              <p className="mt-1.5 text-[11px] text-ink-700/50">
                {Number(montantPayeSaisi) >= Number(montant) && montantPayeSaisi
                  ? 'Ce montant couvre le total — l\u2019achat sera enregistré comme "Payé".'
                  : `Reste dû : ${Math.max(0, Number(montant) - (Number(montantPayeSaisi) || 0)).toLocaleString('fr-FR')} FCFA`}
              </p>
            )}
          </FormField>
        )}
        <div className="flex justify-end gap-2 pt-2">
          <Button variant="ghost" onClick={onClose}>Annuler</Button>
          <Button onClick={submit} disabled={envoi}>
            {envoi ? 'Enregistrement…' : estModification ? 'Enregistrer les modifications' : 'Enregistrer'}
          </Button>
        </div>
      </div>
    </Modal>
  )
}

/**
 * Enregistre un paiement fait à un fournisseur après coup (règlement d'une
 * dette), sans rouvrir tout le formulaire de l'achat.
 */
function PaiementAchatModal({
  achat,
  onClose,
  utilisateurNom,
}: {
  achat: Achat | null
  onClose: () => void
  utilisateurNom: string
}) {
  const [montant, setMontant] = useState('')

  if (!achat) return null

  const resteActuel = achat.montant - achat.montantPaye
  const montantSaisi = Math.min(resteActuel, Math.max(0, Number(montant) || 0))
  const nouveauPaye = achat.montantPaye + montantSaisi
  const nouveauReste = achat.montant - nouveauPaye

  async function submit() {
    if (!achat || !montant) return
    const nouveauStatut: StatutPaiement = nouveauReste <= 0 ? 'paye' : nouveauPaye > 0 ? 'partiel' : 'attente'
    await db.achats.update(achat.id, {
      montantPaye: nouveauPaye,
      statutPaiement: nouveauStatut,
      modifieLe: new Date().toISOString(),
      syncStatus: 'en_attente',
    })
    await logActivity(utilisateurNom, 'Paiement fournisseur effectué', `${achat.reference} — ${montantSaisi.toLocaleString('fr-FR')} FCFA`)
    setMontant('')
    onClose()
  }

  return (
    <Modal open={!!achat} onClose={onClose} title={`Enregistrer un paiement — ${achat.reference}`} width="max-w-sm">
      <div className="space-y-4">
        <div className="space-y-1.5 rounded-lg bg-ink-900/[0.03] px-3.5 py-3 text-xs text-ink-700">
          <div className="flex justify-between"><span>Montant total</span><span className="font-medium text-ink-900">{achat.montant.toLocaleString('fr-FR')} FCFA</span></div>
          <div className="flex justify-between"><span>Déjà versé</span><span className="font-medium text-ink-900">{achat.montantPaye.toLocaleString('fr-FR')} FCFA</span></div>
          <div className="flex justify-between border-t border-ink-900/10 pt-1.5"><span className="font-medium text-clay-600">Reste dû</span><span className="font-semibold text-clay-600">{resteActuel.toLocaleString('fr-FR')} FCFA</span></div>
        </div>
        <FormField label="Montant versé maintenant (FCFA)">
          <input
            type="number"
            min={0}
            className={inputClass}
            placeholder={`Jusqu'à ${resteActuel.toLocaleString('fr-FR')}`}
            value={montant}
            onChange={(e) => setMontant(e.target.value)}
          />
        </FormField>
        {montant && (
          <div className="flex items-center justify-between rounded-lg bg-moss-500/8 px-3.5 py-2.5">
            <span className="text-xs font-medium text-moss-600">
              {nouveauReste <= 0 ? 'Dette entièrement soldée' : 'Nouveau reste dû'}
            </span>
            <span className="font-display text-lg font-semibold text-moss-600">
              {nouveauReste <= 0 ? '0 FCFA' : `${nouveauReste.toLocaleString('fr-FR')} FCFA`}
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
