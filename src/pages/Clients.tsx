import { useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { format } from 'date-fns'
import { fr } from 'date-fns/locale'
import { Plus, Users, Phone, MapPin, Pencil, Trash2, ChevronRight, FileText } from 'lucide-react'
import { db, genId, logActivity } from '@/lib/db'
import { useAuth } from '@/store/auth'
import { Button } from '@/components/ui/Button'
import { Card, Badge, EmptyState } from '@/components/ui/Primitives'
import { Modal, FormField, inputClass } from '@/components/ui/Modal'
import { SearchInput } from '@/components/ui/SearchInput'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { FactureModal } from '@/components/invoice/FactureModal'
import type { Client, Vente } from '@/types'

export function Clients() {
  const { user } = useAuth()
  const clients = useLiveQuery(() => db.clients.orderBy('nom').toArray(), [])
  const ventes = useLiveQuery(() => db.ventes.toArray(), [])
  const [recherche, setRecherche] = useState('')
  const [modal, setModal] = useState<{ mode: 'creer' } | { mode: 'modifier'; client: Client } | null>(null)
  const [clientASupprimer, setClientASupprimer] = useState<Client | null>(null)
  const [clientHistorique, setClientHistorique] = useState<Client | null>(null)
  const [factureAAfficher, setFactureAAfficher] = useState<Vente | null>(null)

  const peutModifier = user?.role === 'admin' || user?.role === 'commercial'
  const tous = clients ?? []
  const q = recherche.trim().toLowerCase()
  const list = q ? tous.filter((c) => c.nom.toLowerCase().includes(q) || c.telephone?.toLowerCase().includes(q)) : tous

  function statsFor(nom: string) {
    const historique = (ventes ?? []).filter((v) => v.clientNom.toLowerCase() === nom.toLowerCase())
    const totalAchete = historique.reduce((s, v) => s + v.montantTotal, 0)
    const solde = historique.reduce((s, v) => s + (v.montantTotal - v.montantPaye), 0)
    return { nbVentes: historique.length, totalAchete, solde }
  }

  async function confirmerSuppression() {
    if (!clientASupprimer) return
    await db.clients.delete(clientASupprimer.id)
    await logActivity(user?.nom ?? '', 'Suppression du client', clientASupprimer.nom)
    setClientASupprimer(null)
  }

  return (
    <div className="space-y-7">
      <div className="flex flex-col items-start gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="font-display text-2xl font-semibold text-ink-950">Clients</h1>
          <p className="mt-1 text-sm text-ink-700/60">
            Fiches clients, historique d'achats et soldes.
          </p>
        </div>
        {peutModifier && (
          <Button onClick={() => setModal({ mode: 'creer' })}>
            <Plus size={16} /> Nouveau client
          </Button>
        )}
      </div>

      {tous.length === 0 ? (
        <EmptyState
          title="Aucun client enregistré"
          description="Ajoutez vos clients réguliers (éleveurs, particuliers) pour suivre leur historique d'achats et leurs soldes."
          action={
            peutModifier && (
              <Button size="sm" onClick={() => setModal({ mode: 'creer' })}>
                <Plus size={14} /> Ajouter un client
              </Button>
            )
          }
        />
      ) : (
        <>
          <SearchInput value={recherche} onChange={setRecherche} placeholder="Rechercher un client…" />
          {list.length === 0 ? (
            <p className="py-8 text-center text-sm text-ink-700/50">Aucun résultat pour « {recherche} ».</p>
          ) : (
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
              {list.map((c) => {
                const stats = statsFor(c.nom)
                return (
                  <Card
                    key={c.id}
                    className="cursor-pointer p-5 transition-shadow hover:shadow-md"
                    onClick={() => setClientHistorique(c)}
                  >
                    <div className="flex items-start gap-3">
                      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-moss-500/10 text-moss-600">
                        <Users size={18} />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-display text-base font-semibold text-ink-950">{c.nom}</p>
                        {c.telephone && (
                          <p className="mt-0.5 flex items-center gap-1 text-xs text-ink-700/70">
                            <Phone size={11} /> {c.telephone}
                          </p>
                        )}
                        {c.adresse && (
                          <p className="mt-0.5 flex items-center gap-1 text-xs text-ink-700/70">
                            <MapPin size={11} /> {c.adresse}
                          </p>
                        )}
                      </div>
                      {peutModifier ? (
                        <div className="flex shrink-0 gap-1" onClick={(e) => e.stopPropagation()}>
                          <button onClick={() => setModal({ mode: 'modifier', client: c })} className="rounded-md p-1.5 text-ink-700/40 hover:bg-ink-900/5 hover:text-ink-700">
                            <Pencil size={13} />
                          </button>
                          <button onClick={() => setClientASupprimer(c)} className="rounded-md p-1.5 text-ink-700/40 hover:bg-signal-red/10 hover:text-signal-red">
                            <Trash2 size={13} />
                          </button>
                        </div>
                      ) : (
                        <ChevronRight size={16} className="mt-1 shrink-0 text-ink-700/30" />
                      )}
                    </div>
                    <div className="mt-4 flex items-center justify-between border-t border-ink-900/6 pt-3.5 text-xs">
                      <span className="flex items-center gap-1 text-ink-700/70">
                        {stats.nbVentes} achat(s) · {stats.totalAchete.toLocaleString('fr-FR')} FCFA
                        <ChevronRight size={12} className="text-ink-700/40" />
                      </span>
                      {stats.solde > 0 ? (
                        <Badge tone="danger">{stats.solde.toLocaleString('fr-FR')} FCFA dus</Badge>
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

      <ClientFormModal
        open={!!modal}
        clientExistant={modal?.mode === 'modifier' ? modal.client : null}
        onClose={() => setModal(null)}
        utilisateurNom={user?.nom ?? ''}
      />
      <ConfirmDialog
        open={!!clientASupprimer}
        title="Supprimer ce client ?"
        description={`La fiche de ${clientASupprimer?.nom} sera supprimée. L'historique de ses ventes reste conservé mais ne sera plus rattaché à une fiche client.`}
        onConfirm={confirmerSuppression}
        onCancel={() => setClientASupprimer(null)}
      />
      <HistoriqueClientModal
        client={clientHistorique}
        onClose={() => setClientHistorique(null)}
        onVoirFacture={(v) => setFactureAAfficher(v)}
      />
      <FactureModal vente={factureAAfficher} onClose={() => setFactureAAfficher(null)} />
    </div>
  )
}

function ClientFormModal({
  open,
  clientExistant,
  onClose,
  utilisateurNom,
}: {
  open: boolean
  clientExistant: Client | null
  onClose: () => void
  utilisateurNom: string
}) {
  const [nom, setNom] = useState('')
  const [telephone, setTelephone] = useState('')
  const [adresse, setAdresse] = useState('')
  const [cle, setCle] = useState<string | null>(null)

  const estModification = !!clientExistant

  if (open && clientExistant && cle !== clientExistant.id) {
    setCle(clientExistant.id)
    setNom(clientExistant.nom)
    setTelephone(clientExistant.telephone ?? '')
    setAdresse(clientExistant.adresse ?? '')
  }
  if (open && !clientExistant && cle !== 'nouveau') {
    setCle('nouveau')
    setNom('')
    setTelephone('')
    setAdresse('')
  }

  async function submit() {
    if (!nom) return

    if (estModification && clientExistant) {
      await db.clients.update(clientExistant.id, {
        nom,
        telephone: telephone || undefined,
        adresse: adresse || undefined,
        syncStatus: 'en_attente',
      })
      await logActivity(utilisateurNom, 'Modification du client', nom)
      onClose()
      return
    }

    await db.clients.add({
      id: genId('cli'),
      nom,
      telephone: telephone || undefined,
      adresse: adresse || undefined,
      creeLe: new Date().toISOString(),
      syncStatus: 'en_attente',
    })
    await logActivity(utilisateurNom, 'Ajout du client', nom)
    onClose()
  }

  return (
    <Modal open={open} onClose={onClose} title={estModification ? 'Modifier le client' : 'Nouveau client'} width="max-w-md">
      <div className="space-y-4">
        <FormField label="Nom">
          <input className={inputClass} placeholder="Boubacar Sidibé" value={nom} onChange={(e) => setNom(e.target.value)} />
        </FormField>
        <FormField label="Téléphone (optionnel)">
          <input className={inputClass} placeholder="+223 70 00 00 00" value={telephone} onChange={(e) => setTelephone(e.target.value)} />
        </FormField>
        <FormField label="Adresse (optionnel)">
          <input className={inputClass} placeholder="Bamako, Mali" value={adresse} onChange={(e) => setAdresse(e.target.value)} />
        </FormField>
        <div className="flex justify-end gap-2 pt-2">
          <Button variant="ghost" onClick={onClose}>Annuler</Button>
          <Button onClick={submit}>{estModification ? 'Enregistrer' : 'Ajouter'}</Button>
        </div>
      </div>
    </Modal>
  )
}

const LABEL_STATUT: Record<string, string> = { paye: 'Payé', partiel: 'Partiel', attente: 'En attente' }
const TONE_STATUT: Record<string, 'success' | 'warning' | 'danger'> = { paye: 'success', partiel: 'warning', attente: 'danger' }

function HistoriqueClientModal({
  client,
  onClose,
  onVoirFacture,
}: {
  client: Client | null
  onClose: () => void
  onVoirFacture: (vente: Vente) => void
}) {
  const ventes = useLiveQuery(
    () => (client ? db.ventes.orderBy('dateVente').reverse().toArray() : Promise.resolve<Vente[]>([])),
    [client?.id]
  )

  if (!client) return null

  const historique = (ventes ?? []).filter((v) => v.clientNom.toLowerCase() === client.nom.toLowerCase())
  const total = historique.reduce((s, v) => s + v.montantTotal, 0)
  const solde = historique.reduce((s, v) => s + (v.montantTotal - v.montantPaye), 0)

  return (
    <Modal open={!!client} onClose={onClose} title={`Historique — ${client.nom}`} width="max-w-2xl">
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
            <p className={`font-display text-lg font-semibold ${solde > 0 ? 'text-signal-red' : 'text-moss-600'}`}>
              {solde.toLocaleString('fr-FR')}
            </p>
            <p className="text-[11px] text-ink-700/60">Solde dû (FCFA)</p>
          </div>
        </div>

        {historique.length === 0 ? (
          <p className="py-8 text-center text-sm text-ink-700/50">Aucun achat enregistré pour ce client pour le moment.</p>
        ) : (
          <div className="max-h-96 space-y-2 overflow-y-auto">
            {historique.map((v) => (
              <div key={v.id} className="flex items-center justify-between gap-3 rounded-lg border border-ink-900/6 px-3.5 py-2.5">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className="font-mono-data text-xs font-medium text-ink-900">{v.reference}</p>
                    <Badge tone={TONE_STATUT[v.statutPaiement]}>{LABEL_STATUT[v.statutPaiement]}</Badge>
                  </div>
                  <p className="mt-1 text-xs text-ink-700/60">
                    {v.quantite.toLocaleString('fr-FR')} × {v.prixUnitaire.toLocaleString('fr-FR')} FCFA ·{' '}
                    {format(new Date(v.dateVente), 'd MMM yyyy', { locale: fr })}
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-3">
                  <p className="font-display text-sm font-semibold text-ink-950">{v.montantTotal.toLocaleString('fr-FR')} FCFA</p>
                  <button onClick={() => onVoirFacture(v)} className="rounded-md p-1.5 text-ink-700/40 hover:bg-ink-900/5 hover:text-ink-700" title="Voir la facture">
                    <FileText size={14} />
                  </button>
                </div>
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
