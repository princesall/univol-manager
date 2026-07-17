import { useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { format } from 'date-fns'
import { fr } from 'date-fns/locale'
import { Plus, Truck, Phone, MapPin, Pencil, Trash2, ChevronRight } from 'lucide-react'
import { db, genId, logActivity } from '@/lib/db'
import { markForDelete } from '@/lib/sync'
import { useAuth } from '@/store/auth'
import { Button } from '@/components/ui/Button'
import { Card, Badge, EmptyState } from '@/components/ui/Primitives'
import { Modal, FormField, inputClass } from '@/components/ui/Modal'
import { SearchInput } from '@/components/ui/SearchInput'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import type { Achat, Fournisseur } from '@/types'

export function Fournisseurs() {
  const { user } = useAuth()
  const fournisseurs = useLiveQuery(() => db.fournisseurs.orderBy('nom').toArray(), [])
  const achats = useLiveQuery(() => db.achats.toArray(), [])
  const [recherche, setRecherche] = useState('')
  const [modal, setModal] = useState<{ mode: 'creer' } | { mode: 'modifier'; fournisseur: Fournisseur } | null>(null)
  const [fournisseurASupprimer, setFournisseurASupprimer] = useState<Fournisseur | null>(null)
  const [fournisseurHistorique, setFournisseurHistorique] = useState<Fournisseur | null>(null)

  const peutModifier = user?.role === 'admin' || user?.role === 'commercial'
  const tous = fournisseurs ?? []
  const q = recherche.trim().toLowerCase()
  const list = q ? tous.filter((f) => f.nom.toLowerCase().includes(q) || f.telephone?.toLowerCase().includes(q)) : tous

  function statsFor(nom: string) {
    const historique = (achats ?? []).filter((a) => a.fournisseurNom.toLowerCase() === nom.toLowerCase())
    const totalAchete = historique.reduce((s, a) => s + a.montant, 0)
    const dette = historique.reduce((s, a) => s + (a.montant - a.montantPaye), 0)
    return { nbAchats: historique.length, totalAchete, dette }
  }

  async function confirmerSuppression() {
    if (!fournisseurASupprimer) return
    await markForDelete('fournisseurs', fournisseurASupprimer.id)
    await logActivity(user?.nom ?? '', 'Suppression du fournisseur', fournisseurASupprimer.nom)
    setFournisseurASupprimer(null)
  }

  return (
    <div className="space-y-7">
      <div className="flex flex-col items-start gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="font-display text-2xl font-semibold text-ink-950">Fournisseurs</h1>
          <p className="mt-1 text-sm text-ink-700/60">
            Fiches fournisseurs, historique d'achats et dettes.
          </p>
        </div>
        {peutModifier && (
          <Button onClick={() => setModal({ mode: 'creer' })}>
            <Plus size={16} /> Nouveau fournisseur
          </Button>
        )}
      </div>

      {tous.length === 0 ? (
        <EmptyState
          title="Aucun fournisseur enregistré"
          description="Ajoutez vos fournisseurs d'œufs, d'aliments et de matériel pour suivre vos relations commerciales."
          action={
            peutModifier && (
              <Button size="sm" onClick={() => setModal({ mode: 'creer' })}>
                <Plus size={14} /> Ajouter un fournisseur
              </Button>
            )
          }
        />
      ) : (
        <>
          <SearchInput value={recherche} onChange={setRecherche} placeholder="Rechercher un fournisseur…" />
          {list.length === 0 ? (
            <p className="py-8 text-center text-sm text-ink-700/50">Aucun résultat pour « {recherche} ».</p>
          ) : (
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
              {list.map((f) => {
                const stats = statsFor(f.nom)
                return (
                  <Card
                    key={f.id}
                    className="cursor-pointer p-5 transition-shadow hover:shadow-md"
                    onClick={() => setFournisseurHistorique(f)}
                  >
                    <div className="flex items-start gap-3">
                      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-clay-500/10 text-clay-600">
                        <Truck size={18} />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-display text-base font-semibold text-ink-950">{f.nom}</p>
                        {f.telephone && (
                          <p className="mt-0.5 flex items-center gap-1 text-xs text-ink-700/70">
                            <Phone size={11} /> {f.telephone}
                          </p>
                        )}
                        {f.adresse && (
                          <p className="mt-0.5 flex items-center gap-1 text-xs text-ink-700/70">
                            <MapPin size={11} /> {f.adresse}
                          </p>
                        )}
                      </div>
                      {peutModifier ? (
                        <div className="flex shrink-0 gap-1" onClick={(e) => e.stopPropagation()}>
                          <button onClick={() => setModal({ mode: 'modifier', fournisseur: f })} className="rounded-md p-1.5 text-ink-700/40 hover:bg-ink-900/5 hover:text-ink-700">
                            <Pencil size={13} />
                          </button>
                          <button onClick={() => setFournisseurASupprimer(f)} className="rounded-md p-1.5 text-ink-700/40 hover:bg-signal-red/10 hover:text-signal-red">
                            <Trash2 size={13} />
                          </button>
                        </div>
                      ) : (
                        <ChevronRight size={16} className="mt-1 shrink-0 text-ink-700/30" />
                      )}
                    </div>
                    <div className="mt-4 flex items-center justify-between border-t border-ink-900/6 pt-3.5 text-xs">
                      <span className="flex items-center gap-1 text-ink-700/70">
                        {stats.nbAchats} achat(s) · {stats.totalAchete.toLocaleString('fr-FR')} FCFA
                        <ChevronRight size={12} className="text-ink-700/40" />
                      </span>
                      {stats.dette > 0 ? (
                        <Badge tone="danger">{stats.dette.toLocaleString('fr-FR')} FCFA dus</Badge>
                      ) : (
                        <Badge tone="success">À jour</Badge>
                      )}
                    </div>
                  </Card>
                )
              })}
            </div>
          )}
        </>
      )}

      <FournisseurFormModal
        open={!!modal}
        fournisseurExistant={modal?.mode === 'modifier' ? modal.fournisseur : null}
        onClose={() => setModal(null)}
        utilisateurNom={user?.nom ?? ''}
      />
      <ConfirmDialog
        open={!!fournisseurASupprimer}
        title="Supprimer ce fournisseur ?"
        description={`La fiche de ${fournisseurASupprimer?.nom} sera supprimée. L'historique de ses achats reste conservé mais ne sera plus rattaché à une fiche fournisseur.`}
        onConfirm={confirmerSuppression}
        onCancel={() => setFournisseurASupprimer(null)}
      />
      <HistoriqueFournisseurModal fournisseur={fournisseurHistorique} onClose={() => setFournisseurHistorique(null)} />
    </div>
  )
}

function FournisseurFormModal({
  open,
  fournisseurExistant,
  onClose,
  utilisateurNom,
}: {
  open: boolean
  fournisseurExistant: Fournisseur | null
  onClose: () => void
  utilisateurNom: string
}) {
  const [nom, setNom] = useState('')
  const [telephone, setTelephone] = useState('')
  const [adresse, setAdresse] = useState('')
  const [cle, setCle] = useState<string | null>(null)

  const estModification = !!fournisseurExistant

  if (open && fournisseurExistant && cle !== fournisseurExistant.id) {
    setCle(fournisseurExistant.id)
    setNom(fournisseurExistant.nom)
    setTelephone(fournisseurExistant.telephone ?? '')
    setAdresse(fournisseurExistant.adresse ?? '')
  }
  if (open && !fournisseurExistant && cle !== 'nouveau') {
    setCle('nouveau')
    setNom('')
    setTelephone('')
    setAdresse('')
  }

  async function submit() {
    if (!nom) return

    if (estModification && fournisseurExistant) {
      await db.fournisseurs.update(fournisseurExistant.id, {
        nom,
        telephone: telephone || undefined,
        adresse: adresse || undefined,
        syncStatus: 'en_attente',
      })
      await logActivity(utilisateurNom, 'Modification du fournisseur', nom)
      onClose()
      return
    }

    await db.fournisseurs.add({
      id: genId('frn'),
      nom,
      telephone: telephone || undefined,
      adresse: adresse || undefined,
      creeLe: new Date().toISOString(),
      syncStatus: 'en_attente',
    })
    await logActivity(utilisateurNom, 'Ajout du fournisseur', nom)
    onClose()
  }

  return (
    <Modal open={open} onClose={onClose} title={estModification ? 'Modifier le fournisseur' : 'Nouveau fournisseur'} width="max-w-md">
      <div className="space-y-4">
        <FormField label="Nom">
          <input className={inputClass} placeholder="Ferme Diarra" value={nom} onChange={(e) => setNom(e.target.value)} />
        </FormField>
        <FormField label="Téléphone (optionnel)">
          <input className={inputClass} placeholder="+223 70 00 00 00" value={telephone} onChange={(e) => setTelephone(e.target.value)} />
        </FormField>
        <FormField label="Adresse (optionnel)">
          <input className={inputClass} placeholder="Kati, Mali" value={adresse} onChange={(e) => setAdresse(e.target.value)} />
        </FormField>
        <div className="flex justify-end gap-2 pt-2">
          <Button variant="ghost" onClick={onClose}>Annuler</Button>
          <Button onClick={submit}>{estModification ? 'Enregistrer' : 'Ajouter'}</Button>
        </div>
      </div>
    </Modal>
  )
}

const LABEL_CATEGORIE_ACHAT: Record<string, string> = { oeufs: 'Œufs fécondés', aliment: 'Aliments', materiel: 'Matériel', autre: 'Autre' }
const LABEL_STATUT: Record<string, string> = { paye: 'Payé', partiel: 'Partiel', attente: 'En attente' }
const TONE_STATUT: Record<string, 'success' | 'warning' | 'danger'> = { paye: 'success', partiel: 'warning', attente: 'danger' }

function HistoriqueFournisseurModal({
  fournisseur,
  onClose,
}: {
  fournisseur: Fournisseur | null
  onClose: () => void
}) {
  const achats = useLiveQuery(
    () => (fournisseur ? db.achats.orderBy('date').reverse().toArray() : Promise.resolve<Achat[]>([])),
    [fournisseur?.id]
  )

  if (!fournisseur) return null

  const historique = (achats ?? []).filter((a) => a.fournisseurNom.toLowerCase() === fournisseur.nom.toLowerCase())
  const total = historique.reduce((s, a) => s + a.montant, 0)
  const dette = historique.reduce((s, a) => s + (a.montant - a.montantPaye), 0)

  return (
    <Modal open={!!fournisseur} onClose={onClose} title={`Historique — ${fournisseur.nom}`} width="max-w-2xl">
      <div className="space-y-4">
        <div className="grid grid-cols-3 gap-3 rounded-lg bg-ink-900/[0.03] px-4 py-3 text-center">
          <div>
            <p className="font-display text-lg font-semibold text-ink-950">{historique.length}</p>
            <p className="text-[11px] text-ink-700/60">Achat(s)</p>
          </div>
          <div>
            <p className="font-display text-lg font-semibold text-ink-950">{total.toLocaleString('fr-FR')}</p>
            <p className="text-[11px] text-ink-700/60">Total (FCFA)</p>
          </div>
          <div>
            <p className={`font-display text-lg font-semibold ${dette > 0 ? 'text-signal-red' : 'text-moss-600'}`}>
              {dette.toLocaleString('fr-FR')}
            </p>
            <p className="text-[11px] text-ink-700/60">Dette (FCFA)</p>
          </div>
        </div>

        {historique.length === 0 ? (
          <p className="py-8 text-center text-sm text-ink-700/50">Aucun achat enregistré auprès de ce fournisseur pour le moment.</p>
        ) : (
          <div className="max-h-96 space-y-2 overflow-y-auto">
            {historique.map((a) => (
              <div key={a.id} className="flex items-center justify-between gap-3 rounded-lg border border-ink-900/6 px-3.5 py-2.5">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className="font-mono-data text-xs font-medium text-ink-900">{a.reference}</p>
                    <Badge tone="neutral">{LABEL_CATEGORIE_ACHAT[a.categorie]}</Badge>
                    <Badge tone={TONE_STATUT[a.statutPaiement]}>{LABEL_STATUT[a.statutPaiement]}</Badge>
                  </div>
                  <p className="mt-1 text-xs text-ink-700/60">
                    {a.description} · {format(new Date(a.date), 'd MMM yyyy', { locale: fr })}
                  </p>
                </div>
                <p className="shrink-0 font-display text-sm font-semibold text-ink-950">{a.montant.toLocaleString('fr-FR')} FCFA</p>
              </div>
            ))}
          </div>
        )}

        <div className="flex justify-end pt-1">
          <Button variant="ghost" onClick={onClose}>Fermer</Button>
        </div>
      </div>
    </Modal>
  )
}
