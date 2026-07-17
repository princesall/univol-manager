import { useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { format } from 'date-fns'
import { fr } from 'date-fns/locale'
import { Plus, Boxes, PackageCheck, AlertTriangle, Bird, ArrowDownCircle, ArrowUpCircle, Minus, Trash2 } from 'lucide-react'
import { db, genId, logActivity, enregistrerSortieStock } from '@/lib/db'
import { markForDelete } from '@/lib/sync'
import { useAuth } from '@/store/auth'
import { Button } from '@/components/ui/Button'
import { Card, Badge, StatCard, EmptyState } from '@/components/ui/Primitives'
import { SearchInput } from '@/components/ui/SearchInput'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { Modal, FormField, inputClass } from '@/components/ui/Modal'
import type { CategorieStock, StockItem } from '@/types'

const LABEL_CATEGORIE: Record<CategorieStock, string> = {
  aliment: 'Aliments',
  materiel: 'Matériel',
  autre: 'Autre',
}

const LABEL_SOURCE: Record<string, string> = {
  achat: 'Achat',
  consommation: 'Consommation',
  ajustement: 'Correction d\u2019inventaire',
}

export function Stocks() {
  const { user } = useAuth()
  const items = useLiveQuery(() => db.stockItems.orderBy('nom').toArray(), [])
  const bandes = useLiveQuery(() => db.bandesVolaille.where('statut').equals('en_elevage').toArray(), [])
  const mouvements = useLiveQuery(() => db.stockMouvements.orderBy('date').reverse().limit(15).toArray(), [])
  const [openNouveau, setOpenNouveau] = useState(false)
  const [consommer, setConsommer] = useState<{ id: string; nom: string; quantite: number; unite: string } | null>(null)
  const [ajustement, setAjustement] = useState<{ id: string; nom: string; quantite: number } | null>(null)
  const [itemASupprimer, setItemASupprimer] = useState<StockItem | null>(null)

  const peutModifier = user?.role === 'admin' || user?.role === 'commercial' || user?.role === 'technique'
  const [recherche, setRecherche] = useState('')
  const tousLesItems = items ?? []
  const q = recherche.trim().toLowerCase()
  const list = q ? tousLesItems.filter((i) => i.nom.toLowerCase().includes(q)) : tousLesItems
  const enAlerte = tousLesItems.filter((i) => i.quantite <= i.seuilAlerte)
  const effectifVolaille = (bandes ?? []).reduce((s, b) => s + b.effectifActuel, 0)

  async function confirmerSuppressionItem() {
    if (!itemASupprimer) return
    await markForDelete('stockItems', itemASupprimer.id)
    await logActivity(user?.nom ?? '', 'Suppression d\u2019article', itemASupprimer.nom)
    setItemASupprimer(null)
  }

  return (
    <div className="space-y-7">
      <div className="flex flex-col items-start gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="font-display text-2xl font-semibold text-ink-950">Stocks</h1>
          <p className="mt-1 text-sm text-ink-700/60">
            Volaille disponible à la vente et stocks d'aliments / matériel.
          </p>
        </div>
        {peutModifier && (
          <Button onClick={() => setOpenNouveau(true)}>
            <Plus size={16} /> Nouvel article
          </Button>
        )}
      </div>

      <div className="rounded-lg border border-ink-900/8 bg-ink-900/[0.02] px-4 py-3 text-xs text-ink-700">
        <span className="font-medium text-ink-900">Comment le stock évolue :</span> un achat d'aliment/matériel
        l'augmente automatiquement (entrée). Une consommation que tu enregistres ici le diminue (sortie). Chaque
        mouvement est tracé dans l'historique ci-dessous.
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard
          label="Volaille disponible"
          value={(effectifVolaille ?? 0).toLocaleString('fr-FR')}
          sub={`${(bandes ?? []).length} bande(s) en élevage`}
          icon={<Bird size={18} />}
          accent="moss"
        />
        <StatCard label="Articles suivis" value={String(tousLesItems.length)} sub="Aliments et matériel" icon={<Boxes size={18} />} />
        <StatCard
          label="Alertes stock bas"
          value={String(enAlerte.length)}
          sub={enAlerte.length > 0 ? enAlerte.map((i) => i.nom).join(', ') : 'Aucune alerte'}
          icon={<AlertTriangle size={18} />}
          accent={enAlerte.length > 0 ? 'clay' : 'default'}
        />
      </div>

      {tousLesItems.length === 0 ? (
        <EmptyState
          title="Aucun article en stock"
          description="Ajoutez vos aliments et votre matériel pour suivre les niveaux et recevoir des alertes de seuil bas."
          action={
            peutModifier && (
              <Button size="sm" onClick={() => setOpenNouveau(true)}>
                <Plus size={14} /> Ajouter un article
              </Button>
            )
          }
        />
      ) : (
        <>
          <SearchInput value={recherche} onChange={setRecherche} placeholder="Rechercher un article…" />
          <Card className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] text-sm">
              <thead>
                <tr className="border-b border-ink-900/8 bg-ink-900/[0.02] text-left text-xs font-medium uppercase tracking-wide text-ink-700/60">
                  <th className="px-5 py-3">Article</th>
                  <th className="px-5 py-3">Catégorie</th>
                  <th className="px-5 py-3">Quantité</th>
                  <th className="px-5 py-3">Seuil d'alerte</th>
                  <th className="px-5 py-3">Statut</th>
                  {peutModifier && <th className="px-5 py-3" />}
                </tr>
              </thead>
              <tbody>
                {list.length === 0 && (
                  <tr>
                    <td colSpan={peutModifier ? 6 : 5} className="px-5 py-8 text-center text-sm text-ink-700/50">
                      Aucun résultat pour « {recherche} ».
                    </td>
                  </tr>
                )}
                {list.map((i) => {
                  const bas = i.quantite <= i.seuilAlerte
                  return (
                    <tr key={i.id} className="border-b border-ink-900/6 last:border-0 hover:bg-ink-900/[0.015]">
                      <td className="px-5 py-3.5 font-medium text-ink-900">{i.nom}</td>
                      <td className="px-5 py-3.5"><Badge tone="neutral">{LABEL_CATEGORIE[i.categorie]}</Badge></td>
                      <td className="px-5 py-3.5 text-ink-700">{i.quantite.toLocaleString('fr-FR')} {i.unite}</td>
                      <td className="px-5 py-3.5 text-ink-700/70">{i.seuilAlerte.toLocaleString('fr-FR')} {i.unite}</td>
                      <td className="px-5 py-3.5">
                        {bas ? <Badge tone="danger"><AlertTriangle size={11} /> Stock bas</Badge> : <Badge tone="success"><PackageCheck size={11} /> Suffisant</Badge>}
                      </td>
                      {peutModifier && (
                        <td className="px-5 py-3.5">
                          <div className="flex justify-end gap-1.5">
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => setConsommer({ id: i.id, nom: i.nom, quantite: i.quantite, unite: i.unite })}
                            >
                              <Minus size={12} /> Consommation
                            </Button>
                            <Button size="sm" variant="ghost" onClick={() => setAjustement({ id: i.id, nom: i.nom, quantite: i.quantite })}>
                              Corriger
                            </Button>
                            <Button size="sm" variant="ghost" onClick={() => setItemASupprimer(i)} title="Supprimer">
                              <Trash2 size={13} className="text-signal-red" />
                            </Button>
                          </div>
                        </td>
                      )}
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </Card>
        </>
      )}

      <Card className="overflow-hidden">
        <div className="border-b border-ink-900/8 bg-ink-900/[0.02] px-5 py-3.5">
          <p className="font-display text-sm font-semibold text-ink-950">Historique des mouvements</p>
        </div>
        {!mouvements || mouvements.length === 0 ? (
          <p className="px-5 py-8 text-center text-sm text-ink-700/50">Aucun mouvement enregistré pour le moment.</p>
        ) : (
          <div className="divide-y divide-ink-900/6">
            {mouvements.map((m) => (
              <div key={m.id} className="flex items-center gap-3 px-5 py-3">
                <div className={`rounded-full p-1.5 ${m.type === 'entree' ? 'bg-moss-500/12 text-moss-600' : 'bg-clay-500/12 text-clay-600'}`}>
                  {m.type === 'entree' ? <ArrowUpCircle size={14} /> : <ArrowDownCircle size={14} />}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm text-ink-900">
                    <span className="font-medium">{m.stockItemNom}</span>{' '}
                    {m.type === 'entree' ? '+' : '−'}{m.quantite.toLocaleString('fr-FR')}
                    {' · '}
                    <span className="text-ink-700/60">{LABEL_SOURCE[m.source]}</span>
                    {m.motif && <span className="text-ink-700/50"> — {m.motif}</span>}
                  </p>
                  <p className="text-xs text-ink-700/50">
                    {m.creePar} · {format(new Date(m.date), "d MMM yyyy 'à' HH:mm", { locale: fr })}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      <NouvelArticleModal open={openNouveau} onClose={() => setOpenNouveau(false)} utilisateurNom={user?.nom ?? ''} />
      <ConsommationModal item={consommer} onClose={() => setConsommer(null)} utilisateurNom={user?.nom ?? ''} />
      <AjusterModal item={ajustement} onClose={() => setAjustement(null)} utilisateurNom={user?.nom ?? ''} />
      <ConfirmDialog
        open={!!itemASupprimer}
        title="Supprimer cet article ?"
        description={`« ${itemASupprimer?.nom} » sera définitivement supprimé du stock, ainsi que son historique de mouvements.`}
        onConfirm={confirmerSuppressionItem}
        onCancel={() => setItemASupprimer(null)}
      />
    </div>
  )
}

function NouvelArticleModal({
  open,
  onClose,
  utilisateurNom,
}: {
  open: boolean
  onClose: () => void
  utilisateurNom: string
}) {
  const [nom, setNom] = useState('')
  const [categorie, setCategorie] = useState<CategorieStock>('aliment')
  const [quantite, setQuantite] = useState('')
  const [unite, setUnite] = useState('sacs')
  const [seuilAlerte, setSeuilAlerte] = useState('')

  async function submit() {
    if (!nom || !quantite) return
    await db.stockItems.add({
      id: genId('stk'),
      nom,
      categorie,
      quantite: Number(quantite),
      unite,
      seuilAlerte: Number(seuilAlerte || 0),
      modifieLe: new Date().toISOString(),
      syncStatus: 'en_attente',
    })
    await logActivity(utilisateurNom, "Ajout d'article en stock", nom)
    setNom('')
    setQuantite('')
    setSeuilAlerte('')
    onClose()
  }

  return (
    <Modal open={open} onClose={onClose} title="Nouvel article">
      <div className="space-y-4">
        <FormField label="Nom de l'article">
          <input className={inputClass} placeholder="Aliment démarrage" value={nom} onChange={(e) => setNom(e.target.value)} />
        </FormField>
        <FormField label="Catégorie">
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            {(Object.keys(LABEL_CATEGORIE) as CategorieStock[]).map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => setCategorie(c)}
                className={`rounded-lg border px-3 py-2 text-xs font-medium transition-colors ${
                  categorie === c ? 'border-yolk-500 bg-yolk-500/10 text-yolk-700' : 'border-ink-900/12 text-ink-700 hover:bg-ink-900/[0.02]'
                }`}
              >
                {LABEL_CATEGORIE[c]}
              </button>
            ))}
          </div>
        </FormField>
        <div className="grid grid-cols-3 gap-4">
          <FormField label="Quantité">
            <input type="number" min={0} className={inputClass} placeholder="40" value={quantite} onChange={(e) => setQuantite(e.target.value)} />
          </FormField>
          <FormField label="Unité">
            <input className={inputClass} placeholder="sacs" value={unite} onChange={(e) => setUnite(e.target.value)} />
          </FormField>
          <FormField label="Seuil d'alerte">
            <input type="number" min={0} className={inputClass} placeholder="10" value={seuilAlerte} onChange={(e) => setSeuilAlerte(e.target.value)} />
          </FormField>
        </div>
        <div className="flex justify-end gap-2 pt-2">
          <Button variant="ghost" onClick={onClose}>Annuler</Button>
          <Button onClick={submit}>Ajouter</Button>
        </div>
      </div>
    </Modal>
  )
}

function ConsommationModal({
  item,
  onClose,
  utilisateurNom,
}: {
  item: { id: string; nom: string; quantite: number; unite: string } | null
  onClose: () => void
  utilisateurNom: string
}) {
  const [quantite, setQuantite] = useState('')
  const [motif, setMotif] = useState('')
  const [erreur, setErreur] = useState('')
  const [envoi, setEnvoi] = useState(false)

  if (!item) return null

  const restant = quantite ? Math.max(0, item.quantite - Number(quantite)) : item.quantite

  async function submit() {
    if (!item || !quantite || envoi) return
    const q = Number(quantite)
    if (q <= 0) {
      setErreur('Entrez une quantité supérieure à 0.')
      return
    }
    if (q > item.quantite) {
      setErreur(`Impossible : il ne reste que ${item.quantite.toLocaleString('fr-FR')} ${item.unite} en stock. Vérifiez le chiffre saisi.`)
      return
    }
    setEnvoi(true)
    await enregistrerSortieStock({
      stockItemId: item.id,
      quantite: q,
      motif: motif || undefined,
      utilisateurNom,
    })
    await logActivity(utilisateurNom, 'Consommation de stock', item.nom)
    setQuantite('')
    setMotif('')
    setErreur('')
    setEnvoi(false)
    onClose()
  }

  return (
    <Modal open={!!item} onClose={onClose} title={`Consommation — ${item.nom}`} width="max-w-sm">
      <div className="space-y-4">
        <p className="rounded-lg bg-ink-900/[0.03] px-3.5 py-2.5 text-xs text-ink-700">
          Quantité actuelle : {item.quantite.toLocaleString('fr-FR')} {item.unite}
        </p>
        <FormField label={`Quantité utilisée (${item.unite})`}>
          <input
            type="number"
            min={1}
            max={item.quantite}
            className={inputClass}
            placeholder="Ex. 3"
            value={quantite}
            onChange={(e) => {
              setQuantite(e.target.value)
              setErreur('')
            }}
          />
        </FormField>
        {erreur && <p className="rounded-lg bg-signal-red/8 px-3.5 py-2.5 text-xs font-medium text-signal-red">{erreur}</p>}
        <FormField label="Motif (optionnel)">
          <input className={inputClass} placeholder="Alimentation bande BND-2026-015" value={motif} onChange={(e) => setMotif(e.target.value)} />
        </FormField>
        {quantite && !erreur && (
          <div className="flex items-center justify-between rounded-lg bg-clay-500/8 px-3.5 py-2.5">
            <span className="text-xs font-medium text-clay-600">Stock restant après cette sortie</span>
            <span className="font-display text-lg font-semibold text-clay-600">{restant.toLocaleString('fr-FR')} {item.unite}</span>
          </div>
        )}
        <div className="flex justify-end gap-2 pt-2">
          <Button variant="ghost" onClick={onClose}>Annuler</Button>
          <Button variant="danger" onClick={submit} disabled={envoi}>{envoi ? 'Enregistrement…' : 'Enregistrer la sortie'}</Button>
        </div>
      </div>
    </Modal>
  )
}

function AjusterModal({
  item,
  onClose,
  utilisateurNom,
}: {
  item: { id: string; nom: string; quantite: number } | null
  onClose: () => void
  utilisateurNom: string
}) {
  const [quantite, setQuantite] = useState('')

  if (!item) return null

  async function submit() {
    if (!item || quantite === '') return
    await db.stockItems.update(item.id, {
      quantite: Number(quantite),
      modifieLe: new Date().toISOString(),
      syncStatus: 'en_attente',
    })
    await db.stockMouvements.add({
      id: genId('mvt'),
      stockItemId: item.id,
      stockItemNom: item.nom,
      type: Number(quantite) >= item.quantite ? 'entree' : 'sortie',
      quantite: Math.abs(Number(quantite) - item.quantite),
      source: 'ajustement',
      motif: 'Correction après comptage physique',
      date: new Date().toISOString(),
      creePar: utilisateurNom,
      syncStatus: 'en_attente',
    })
    await logActivity(utilisateurNom, "Correction d'inventaire", item.nom)
    setQuantite('')
    onClose()
  }

  return (
    <Modal open={!!item} onClose={onClose} title={`Corriger l'inventaire — ${item.nom}`} width="max-w-sm">
      <div className="space-y-4">
        <p className="rounded-lg bg-ink-900/[0.03] px-3.5 py-2.5 text-xs text-ink-700">
          À utiliser uniquement après un comptage physique révélant un écart (perte, erreur de saisie…).
          Quantité actuelle : {item.quantite.toLocaleString('fr-FR')}
        </p>
        <FormField label="Quantité réelle constatée">
          <input type="number" min={0} className={inputClass} placeholder="Ex. 35" value={quantite} onChange={(e) => setQuantite(e.target.value)} />
        </FormField>
        <div className="flex justify-end gap-2 pt-2">
          <Button variant="ghost" onClick={onClose}>Annuler</Button>
          <Button onClick={submit}>Corriger</Button>
        </div>
      </div>
    </Modal>
  )
}
