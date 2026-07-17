import { useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { differenceInCalendarDays, format } from 'date-fns'
import { fr } from 'date-fns/locale'
import { Plus, Egg, Calendar, Layers, CheckCircle2, Search, Eye, Trash2 } from 'lucide-react'
import { db, genId, logActivity } from '@/lib/db'
import type { LotIncubation, Vente } from '@/types'
import { useAuth } from '@/store/auth'
import { Button } from '@/components/ui/Button'
import { Card, Badge, EmptyState } from '@/components/ui/Primitives'
import { Modal, FormField, inputClass } from '@/components/ui/Modal'

const DUREE_INCUBATION_JOURS = 21

/**
 * Modal de confirmation de suppression d'un lot d'incubation
 */
function ConfirmationSuppressionModal({
  lot,
  onClose,
  utilisateurNom,
}: {
  lot: LotIncubation | null
  onClose: () => void
  utilisateurNom: string
}) {
  const [envoi, setEnvoi] = useState(false)

  if (!lot) return null

  async function confirmerSuppression() {
    if (envoi || !lot) return
    setEnvoi(true)

    try {
      // Supprimer le lot d'incubation
      await db.lotsIncubation.delete(lot!.id)

      // Vérifier s'il y a une bande liée et la supprimer aussi
      const bande = await db.bandesVolaille.where('lotIncubationId').equals(lot!.id).first()
      if (bande) {
        await db.bandesVolaille.delete(bande.id)
        await logActivity(utilisateurNom, 'Suppression de la bande liée', bande.reference)
      }

      // Logger la suppression
      await logActivity(utilisateurNom, 'Suppression du lot', lot!.reference)

      setEnvoi(false)
      onClose()
    } catch (error) {
      console.error('Erreur lors de la suppression:', error)
      setEnvoi(false)
    }
  }

  return (
    <Modal open={!!lot} onClose={onClose} title="Confirmer la suppression" width="max-w-md">
      <div className="space-y-4">
        <div className="rounded-lg bg-signal-red/8 p-4">
          <p className="text-sm font-medium text-signal-red">Attention : cette action est irréversible</p>
          <p className="mt-2 text-sm text-ink-700">
            Vous êtes sur le point de supprimer le lot <span className="font-mono-data font-medium">{lot.reference}</span>.
            {lot.statut === 'eclos' && (
              <span className="mt-2 block text-xs text-ink-700/70">
                La bande de poussins liée sera également supprimée.
              </span>
            )}
          </p>
        </div>
        <div className="flex justify-end gap-2 pt-2">
          <Button variant="ghost" onClick={onClose}>Annuler</Button>
          <Button onClick={confirmerSuppression} disabled={envoi} variant="danger">
            {envoi ? 'Suppression…' : 'Supprimer'}
          </Button>
        </div>
      </div>
    </Modal>
  )
}

export function Couvoir() {
  const { user } = useAuth()
  const lots = useLiveQuery(() => db.lotsIncubation.orderBy('dateMiseEnCouveuse').reverse().toArray(), [])
  const [openNouveau, setOpenNouveau] = useState(false)
  const [lotEclosion, setLotEclosion] = useState<LotIncubation | null>(null)
  const [lotMirage, setLotMirage] = useState<{ lot: LotIncubation; etape: 1 | 2 } | null>(null)
  const [lotDetail, setLotDetail] = useState<LotIncubation | null>(null)
  const [lotASupprimer, setLotASupprimer] = useState<LotIncubation | null>(null)

  const peutModifier = user?.role === 'admin' || user?.role === 'technique'
  const enCours = lots?.filter((l) => l.statut === 'en_cours') ?? []
  const clos = lots?.filter((l) => l.statut === 'eclos') ?? []

  return (
    <div className="space-y-7">
      <div className="flex flex-col items-start gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="font-display text-2xl font-semibold text-ink-950">Couvoir</h1>
          <p className="mt-1 text-sm text-ink-700/60">
            Suivi complet : commande, mise en couveuse, mirages, éclosion.
          </p>
        </div>
        {peutModifier && (
          <Button onClick={() => setOpenNouveau(true)}>
            <Plus size={16} /> Nouveau lot
          </Button>
        )}
      </div>

      <section>
        <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-ink-700/60">
          En incubation ({enCours.length})
        </p>
        {enCours.length === 0 ? (
          <EmptyState
            title="Aucun lot en incubation"
            description="Les lots que vous mettez en couveuse apparaîtront ici avec leur progression jusqu'à l'éclosion."
            action={
              peutModifier && (
                <Button size="sm" onClick={() => setOpenNouveau(true)}>
                  <Plus size={14} /> Créer un lot
                </Button>
              )
            }
          />
        ) : (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
            {enCours.map((lot) => (
              <LotEnCoursCard
                key={lot.id}
                lot={lot}
                peutModifier={peutModifier}
                onEnregistrerEclosion={() => setLotEclosion(lot)}
                onMirage={(etape) => setLotMirage({ lot, etape })}
                onDetail={() => setLotDetail(lot)}
                onSupprimer={() => setLotASupprimer(lot)}
              />
            ))}
          </div>
        )}
      </section>

      <section>
        <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-ink-700/60">
          Historique des éclosions ({clos.length})
        </p>
        <Card className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] text-sm">
              <thead>
                <tr className="border-b border-ink-900/8 bg-ink-900/[0.02] text-left text-xs font-medium uppercase tracking-wide text-ink-700/60">
                  <th className="px-5 py-3">Lot</th>
                  <th className="px-5 py-3">Couveuse</th>
                  <th className="px-5 py-3">Œufs</th>
                  <th className="px-5 py-3">Poussins éclos</th>
                  <th className="px-5 py-3">Taux d'éclosion</th>
                  <th className="px-5 py-3">Date d'éclosion</th>
                  <th className="px-5 py-3" />
                </tr>
              </thead>
              <tbody>
                {clos.length === 0 && (
                  <tr>
                    <td colSpan={7} className="px-5 py-10 text-center text-sm text-ink-700/50">
                      Aucune éclosion enregistrée pour le moment.
                    </td>
                  </tr>
                )}
                {clos.map((lot) => {
                  const taux = lot.poussinsEclos ? Math.round((lot.poussinsEclos / lot.quantiteOeufs) * 100) : 0
                  return (
                    <tr key={lot.id} className="border-b border-ink-900/6 last:border-0 hover:bg-ink-900/[0.015]">
                      <td className="px-5 py-3.5 font-mono-data text-xs font-medium text-ink-900">{lot.reference}</td>
                      <td className="px-5 py-3.5 text-ink-700">{lot.couveuse}</td>
                      <td className="px-5 py-3.5 text-ink-700">{(lot.quantiteOeufs ?? 0).toLocaleString('fr-FR')}</td>
                      <td className="px-5 py-3.5 font-medium text-ink-900">{(lot.poussinsEclos ?? 0).toLocaleString('fr-FR')}</td>
                      <td className="px-5 py-3.5">
                        <Badge tone={taux >= 90 ? 'success' : taux >= 80 ? 'warning' : 'danger'}>{taux}%</Badge>
                      </td>
                      <td className="px-5 py-3.5 text-ink-700">
                        {lot.dateEclosionReelle && format(new Date(lot.dateEclosionReelle), 'd MMM yyyy', { locale: fr })}
                      </td>
                      <td className="px-5 py-3.5 text-right">
                        <div className="flex justify-end gap-1">
                          <Button size="sm" variant="ghost" onClick={() => setLotDetail(lot)}>
                            <Eye size={13} /> Détail
                          </Button>
                          {peutModifier && (
                            <Button size="sm" variant="ghost" onClick={() => setLotASupprimer(lot)}>
                              <Trash2 size={13} />
                            </Button>
                          )}
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </Card>
      </section>

      <NouveauLotModal open={openNouveau} onClose={() => setOpenNouveau(false)} utilisateurNom={user?.nom ?? ''} />
      <EnregistrerEclosionModal lot={lotEclosion} onClose={() => setLotEclosion(null)} utilisateurNom={user?.nom ?? ''} />
      <MirageModal
        lot={lotMirage?.lot ?? null}
        etape={lotMirage?.etape ?? 1}
        onClose={() => setLotMirage(null)}
        utilisateurNom={user?.nom ?? ''}
      />
      <LotDetailModal lot={lotDetail} onClose={() => setLotDetail(null)} />
      <ConfirmationSuppressionModal
        lot={lotASupprimer}
        onClose={() => setLotASupprimer(null)}
        utilisateurNom={user?.nom ?? ''}
      />
    </div>
  )
}

function LotEnCoursCard({
  lot,
  peutModifier,
  onEnregistrerEclosion,
  onMirage,
  onDetail,
  onSupprimer,
}: {
  lot: LotIncubation
  peutModifier: boolean
  onEnregistrerEclosion: () => void
  onMirage: (etape: 1 | 2) => void
  onDetail: () => void
  onSupprimer: () => void
}) {
  const joursEcoules = differenceInCalendarDays(new Date(), new Date(lot.dateMiseEnCouveuse))
  const pct = Math.min(100, Math.max(0, Math.round((joursEcoules / DUREE_INCUBATION_JOURS) * 100)))
  const joursRestants = DUREE_INCUBATION_JOURS - joursEcoules
  const pret = joursRestants <= 0

  return (
    <Card className="p-5">
      <div className="flex items-start gap-4">
        <div className="egg-ring h-16 w-16 shrink-0" style={{ ['--pct' as any]: pct }}>
          <div className="egg-ring-inner">
            <span className="font-display text-sm font-semibold text-ink-900">{pct}%</span>
          </div>
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <p className="font-mono-data text-xs font-medium text-ink-700/70">{lot.reference}</p>
              <p className="mt-0.5 truncate font-display text-base font-semibold text-ink-950">{lot.couveuse}</p>
            </div>
            <div className="flex gap-1">
              <button onClick={onDetail} className="shrink-0 rounded-md p-1 text-ink-700/40 hover:bg-ink-900/5 hover:text-ink-700">
                <Eye size={15} />
              </button>
              {peutModifier && (
                <button onClick={onSupprimer} className="shrink-0 rounded-md p-1 text-signal-red/40 hover:bg-signal-red/8 hover:text-signal-red">
                  <Trash2 size={15} />
                </button>
              )}
            </div>
          </div>
          <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-ink-700/70">
            <span className="flex items-center gap-1">
              <Layers size={12} /> {(lot.quantiteOeufs ?? 0).toLocaleString('fr-FR')} œufs
            </span>
            <span className="flex items-center gap-1">
              <Calendar size={12} /> {format(new Date(lot.dateMiseEnCouveuse), 'd MMM', { locale: fr })}
            </span>
          </div>
        </div>
      </div>

      {(lot.quantiteApresMirage1 !== undefined || lot.quantiteApresMirage2 !== undefined) && (
        <div className="mt-3 flex gap-3 border-t border-ink-900/6 pt-3 text-xs text-ink-700/70">
          {lot.quantiteApresMirage1 !== undefined && (
            <span>1er mirage : <span className="font-medium text-ink-900">{(lot.quantiteApresMirage1 ?? 0).toLocaleString('fr-FR')}</span></span>
          )}
          {lot.quantiteApresMirage2 !== undefined && (
            <span>2e mirage : <span className="font-medium text-ink-900">{(lot.quantiteApresMirage2 ?? 0).toLocaleString('fr-FR')}</span></span>
          )}
        </div>
      )}

      <div className="mt-4 flex flex-wrap items-center justify-between gap-2 border-t border-ink-900/6 pt-3.5">
        {pret ? (
          <Badge tone="warning">
            <Egg size={11} /> Prêt à éclore
          </Badge>
        ) : (
          <p className="text-xs text-ink-700/60">
            Éclosion dans <span className="font-medium text-ink-900">{joursRestants} j</span>
          </p>
        )}
        {peutModifier && (
          <div className="flex flex-wrap gap-1.5">
            {lot.quantiteApresMirage1 === undefined && (
              <Button size="sm" variant="ghost" onClick={() => onMirage(1)}>
                <Search size={12} /> 1er mirage
              </Button>
            )}
            {lot.quantiteApresMirage1 !== undefined && lot.quantiteApresMirage2 === undefined && (
              <Button size="sm" variant="ghost" onClick={() => onMirage(2)}>
                <Search size={12} /> 2e mirage
              </Button>
            )}
            {pret && (
              <Button size="sm" variant="secondary" onClick={onEnregistrerEclosion}>
                <CheckCircle2 size={13} /> Éclosion
              </Button>
            )}
          </div>
        )}
      </div>
    </Card>
  )
}

function NouveauLotModal({
  open,
  onClose,
  utilisateurNom,
}: {
  open: boolean
  onClose: () => void
  utilisateurNom: string
}) {
  const [reference, setReference] = useState('')
  const [quantiteCommandee, setQuantiteCommandee] = useState('')
  const [quantite, setQuantite] = useState('')
  const [couveuse, setCouveuse] = useState('')
  const [fournisseur, setFournisseur] = useState('')
  const [date, setDate] = useState(format(new Date(), 'yyyy-MM-dd'))
  const [envoi, setEnvoi] = useState(false)

  async function submit() {
    if (!reference || !quantite || !couveuse || envoi) return
    setEnvoi(true)
    const dateMiseEnCouveuse = new Date(date)
    const dateEclosionPrevue = new Date(dateMiseEnCouveuse)
    dateEclosionPrevue.setDate(dateEclosionPrevue.getDate() + DUREE_INCUBATION_JOURS)

    const nouveauLot: LotIncubation = {
      id: genId('lot'),
      reference,
      quantiteCommandee: quantiteCommandee ? Number(quantiteCommandee) : undefined,
      dateMiseEnCouveuse: dateMiseEnCouveuse.toISOString(),
      dateEclosionPrevue: dateEclosionPrevue.toISOString(),
      quantiteOeufs: Number(quantite),
      couveuse,
      fournisseurNom: fournisseur || undefined,
      statut: 'en_cours',
      creePar: utilisateurNom,
      creeLe: new Date().toISOString(),
      modifieLe: new Date().toISOString(),
      syncStatus: 'en_attente',
    }
    await db.lotsIncubation.add(nouveauLot)
    await logActivity(utilisateurNom, 'Création du lot', reference)
    setReference('')
    setQuantiteCommandee('')
    setQuantite('')
    setCouveuse('')
    setFournisseur('')
    setEnvoi(false)
    onClose()
  }

  return (
    <Modal open={open} onClose={onClose} title="Nouveau lot d'incubation">
      <div className="space-y-4">
        <FormField label="Référence du lot">
          <input
            className={inputClass}
            placeholder="LOT-2026-016"
            value={reference}
            onChange={(e) => setReference(e.target.value)}
          />
        </FormField>
        <div className="grid grid-cols-2 gap-4">
          <FormField label="Œufs commandés (optionnel)">
            <input
              type="number"
              min={0}
              className={inputClass}
              placeholder="Si différent de la quantité mise en couveuse"
              value={quantiteCommandee}
              onChange={(e) => setQuantiteCommandee(e.target.value)}
            />
          </FormField>
          <FormField label="Œufs mis en couveuse">
            <input
              type="number"
              min={0}
              className={inputClass}
              placeholder="5000"
              value={quantite}
              onChange={(e) => setQuantite(e.target.value)}
            />
          </FormField>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <FormField label="Couveuse">
            <input
              className={inputClass}
              placeholder="Couveuse A — 5000"
              value={couveuse}
              onChange={(e) => setCouveuse(e.target.value)}
            />
          </FormField>
          <FormField label="Date de mise en couveuse">
            <input type="date" className={inputClass} value={date} onChange={(e) => setDate(e.target.value)} />
          </FormField>
        </div>
        <FormField label="Fournisseur des œufs (optionnel)">
          <input
            className={inputClass}
            placeholder="Ferme Diarra"
            value={fournisseur}
            onChange={(e) => setFournisseur(e.target.value)}
          />
        </FormField>
        <p className="text-xs text-ink-700/50">
          La date d'éclosion prévue sera calculée automatiquement (+{DUREE_INCUBATION_JOURS} jours). Les mirages
          se renseignent ensuite depuis la fiche du lot pendant l'incubation.
        </p>
        <div className="flex justify-end gap-2 pt-2">
          <Button variant="ghost" onClick={onClose}>Annuler</Button>
          <Button onClick={submit} disabled={envoi}>{envoi ? 'Création…' : 'Créer le lot'}</Button>
        </div>
      </div>
    </Modal>
  )
}

function MirageModal({
  lot,
  etape,
  onClose,
  utilisateurNom,
}: {
  lot: LotIncubation | null
  etape: 1 | 2
  onClose: () => void
  utilisateurNom: string
}) {
  const [quantite, setQuantite] = useState('')
  const [erreur, setErreur] = useState('')
  const [envoi, setEnvoi] = useState(false)

  if (!lot) return null

  const baseComparaison = etape === 1 ? lot.quantiteOeufs : lot.quantiteApresMirage1 ?? lot.quantiteOeufs
  const retires = quantite ? baseComparaison - Number(quantite) : null

  async function submit() {
    if (!lot || !quantite || envoi) return
    const q = Number(quantite)
    if (q < 0) {
      setErreur('Entrez un nombre positif.')
      return
    }
    if (q > baseComparaison) {
      setErreur(`Impossible : un mirage ne peut que réduire le nombre d'œufs viables, pas l'augmenter (il y en avait ${(baseComparaison ?? 0).toLocaleString('fr-FR')} avant ce mirage).`)
      return
    }
    setEnvoi(true)
    const maintenant = new Date().toISOString()
    if (etape === 1) {
      await db.lotsIncubation.update(lot.id, {
        dateMirage1: maintenant,
        quantiteApresMirage1: q,
        modifieLe: maintenant,
        syncStatus: 'en_attente',
      })
    } else {
      await db.lotsIncubation.update(lot.id, {
        dateMirage2: maintenant,
        quantiteApresMirage2: q,
        modifieLe: maintenant,
        syncStatus: 'en_attente',
      })
    }
    await logActivity(utilisateurNom, `Enregistrement du ${etape === 1 ? '1er' : '2e'} mirage`, lot.reference)
    setQuantite('')
    setErreur('')
    setEnvoi(false)
    onClose()
  }

  return (
    <Modal open={!!lot} onClose={onClose} title={`${etape === 1 ? '1er' : '2e'} mirage — ${lot.reference}`} width="max-w-sm">
      <div className="space-y-4">
        <p className="rounded-lg bg-ink-900/[0.03] px-3.5 py-2.5 text-xs text-ink-700">
          {etape === 1
            ? `Quantité avant ce mirage : ${(lot.quantiteOeufs ?? 0).toLocaleString('fr-FR')} œufs mis en couveuse.`
            : `Quantité après le 1er mirage : ${((lot.quantiteApresMirage1 ?? lot.quantiteOeufs) ?? 0).toLocaleString('fr-FR')} œufs.`}
        </p>
        <FormField label="Œufs encore viables après ce mirage">
          <input
            type="number"
            min={0}
            max={baseComparaison}
            className={inputClass}
            placeholder="Ex. 4750"
            value={quantite}
            onChange={(e) => {
              setQuantite(e.target.value)
              setErreur('')
            }}
          />
        </FormField>
        {erreur && <p className="rounded-lg bg-signal-red/8 px-3.5 py-2.5 text-xs font-medium text-signal-red">{erreur}</p>}
        {retires !== null && !erreur && (
          <div className="flex items-center justify-between rounded-lg bg-clay-500/8 px-3.5 py-2.5">
            <span className="text-xs font-medium text-clay-600">Œufs retirés à ce mirage</span>
            <span className="font-display text-lg font-semibold text-clay-600">{(retires ?? 0).toLocaleString('fr-FR')}</span>
          </div>
        )}
        <div className="flex justify-end gap-2 pt-2">
          <Button variant="ghost" onClick={onClose}>Annuler</Button>
          <Button onClick={submit} disabled={envoi}>{envoi ? 'Enregistrement…' : 'Enregistrer'}</Button>
        </div>
      </div>
    </Modal>
  )
}

function EnregistrerEclosionModal({
  lot,
  onClose,
  utilisateurNom,
}: {
  lot: LotIncubation | null
  onClose: () => void
  utilisateurNom: string
}) {
  const [poussins, setPoussins] = useState('')
  const [infeconds, setInfeconds] = useState('')
  const [mortalite, setMortalite] = useState('')
  const [erreur, setErreur] = useState('')
  const [envoi, setEnvoi] = useState(false)

  if (!lot) return null

  const oeufsViables = lot.quantiteApresMirage2 ?? lot.quantiteApresMirage1 ?? lot.quantiteOeufs
  const taux = poussins ? Math.round((Number(poussins) / lot.quantiteOeufs) * 100) : null

  async function submit() {
    if (!lot || !poussins || envoi) return
    const nbPoussins = Number(poussins)
    if (nbPoussins <= 0) {
      setErreur('Entrez un nombre de poussins supérieur à 0.')
      return
    }
    if (nbPoussins > oeufsViables) {
      setErreur(`Impossible : il n'y avait que ${(oeufsViables ?? 0).toLocaleString('fr-FR')} œufs encore viables avant l'éclosion. Vérifiez le chiffre saisi.`)
      return
    }
    setEnvoi(true)
    const maintenant = new Date().toISOString()
    await db.lotsIncubation.update(lot.id, {
      statut: 'eclos',
      poussinsEclos: nbPoussins,
      oeufsInfeconds: Number(infeconds || 0),
      mortaliteEmbryonnaire: Number(mortalite || 0),
      dateEclosionReelle: maintenant,
      modifieLe: maintenant,
      syncStatus: 'en_attente',
    })
    await logActivity(utilisateurNom, "Enregistrement de l'éclosion", lot.reference)

    // La bande de poussins est créée automatiquement au poulailler,
    // pour éviter une double saisie entre le Couvoir et le Poulailler.
    // La référence est dérivée de manière robuste (ne suppose pas que
    // "LOT" apparaît forcément dans la référence saisie par l'utilisateur).
    const bandeRef = lot.reference.startsWith('LOT')
      ? lot.reference.replace('LOT', 'BND')
      : `BND-${lot.reference}`
    await db.bandesVolaille.add({
      id: genId('bnd'),
      reference: bandeRef,
      lotIncubationId: lot.id,
      lotIncubationRef: lot.reference,
      dateDebut: maintenant,
      effectifInitial: nbPoussins,
      effectifActuel: nbPoussins,
      statut: 'en_elevage',
      creePar: utilisateurNom,
      creeLe: maintenant,
      modifieLe: maintenant,
      syncStatus: 'en_attente',
    })
    await logActivity(utilisateurNom, 'Création automatique de la bande', bandeRef)

    setPoussins('')
    setInfeconds('')
    setMortalite('')
    setErreur('')
    setEnvoi(false)
    onClose()
  }

  return (
    <Modal open={!!lot} onClose={onClose} title={`Éclosion — ${lot.reference}`}>
      <div className="space-y-4">
        <p className="rounded-lg bg-ink-900/[0.03] px-3.5 py-2.5 text-xs text-ink-700">
          {(oeufsViables ?? 0).toLocaleString('fr-FR')} œufs encore viables avant éclosion.
        </p>
        <FormField label="Poussins éclos">
          <input
            type="number"
            min={1}
            max={oeufsViables}
            className={inputClass}
            placeholder="4680"
            value={poussins}
            onChange={(e) => {
              setPoussins(e.target.value)
              setErreur('')
            }}
          />
        </FormField>
        {erreur && <p className="rounded-lg bg-signal-red/8 px-3.5 py-2.5 text-xs font-medium text-signal-red">{erreur}</p>}
        <div className="grid grid-cols-2 gap-4">
          <FormField label="Œufs non fécondés">
            <input
              type="number"
              min={0}
              className={inputClass}
              placeholder="210"
              value={infeconds}
              onChange={(e) => setInfeconds(e.target.value)}
            />
          </FormField>
          <FormField label="Mortalité embryonnaire">
            <input
              type="number"
              min={0}
              className={inputClass}
              placeholder="110"
              value={mortalite}
              onChange={(e) => setMortalite(e.target.value)}
            />
          </FormField>
        </div>
        {taux !== null && (
          <div className="flex items-center justify-between rounded-lg bg-yolk-500/10 px-3.5 py-2.5">
            <span className="text-xs font-medium text-yolk-700">Taux d'éclosion calculé</span>
            <span className="font-display text-lg font-semibold text-yolk-700">{taux}%</span>
          </div>
        )}
        <div className="flex justify-end gap-2 pt-2">
          <Button variant="ghost" onClick={onClose}>Annuler</Button>
          <Button onClick={submit} disabled={envoi}>{envoi ? 'Enregistrement…' : "Valider l'éclosion"}</Button>
        </div>
      </div>
    </Modal>
  )
}

/**
 * Fiche complète du lot : reprend les 7 indicateurs demandés — commande,
 * mise en couveuse, 2 mirages, éclosion, puis morts et vendus calculés
 * automatiquement depuis la bande liée au Poulailler et les Ventes,
 * pour éviter toute double saisie.
 */
function LotDetailModal({ lot, onClose }: { lot: LotIncubation | null; onClose: () => void }) {
  const bande = useLiveQuery(
    () => (lot ? db.bandesVolaille.where('lotIncubationId').equals(lot.id).first() : undefined),
    [lot?.id]
  )
  const ventesBande = useLiveQuery(
    () => (bande ? db.ventes.where('bandeId').equals(bande.id).toArray() : Promise.resolve<Vente[]>([])),
    [bande?.id]
  )

  if (!lot) return null

  // Avec les ventes partielles depuis une bande, l'effectif actuel diminue
  // à la fois par mortalité ET par vente — il faut donc soustraire les
  // ventes pour isoler la seule mortalité réelle.
  const vendus = ventesBande ? ventesBande.reduce((s, v) => s + v.quantite, 0) : 0
  const morts = bande ? Math.max(0, bande.effectifInitial - bande.effectifActuel - vendus) : null

  const etapes = [
    { label: 'Œufs commandés', valeur: (lot.quantiteCommandee ?? lot.quantiteOeufs) ?? 0, note: lot.quantiteCommandee ? undefined : '= œufs mis en couveuse (non renseigné séparément)' },
    { label: 'Œufs mis en couveuse', valeur: lot.quantiteOeufs ?? 0, note: undefined as string | undefined },
    { label: 'Après 1er mirage', valeur: lot.quantiteApresMirage1 ?? 0, note: lot.dateMirage1 ? format(new Date(lot.dateMirage1), 'd MMM yyyy', { locale: fr }) : 'Non encore réalisé' },
    { label: 'Après 2e mirage', valeur: lot.quantiteApresMirage2 ?? 0, note: lot.dateMirage2 ? format(new Date(lot.dateMirage2), 'd MMM yyyy', { locale: fr }) : 'Non encore réalisé' },
    { label: 'Œufs éclos', valeur: lot.poussinsEclos ?? 0, note: lot.poussinsEclos ? `Taux : ${Math.round((lot.poussinsEclos / lot.quantiteOeufs) * 100)}%` : 'Pas encore éclos' },
    { label: 'Poussins morts (Poulailler)', valeur: morts ?? 0, note: bande ? `Sur la bande ${bande.reference}` : "Pas encore de bande (éclosion non enregistrée)" },
    { label: 'Poussins vendus', valeur: vendus ?? 0, note: bande ? `${ventesBande?.length ?? 0} vente(s) liée(s)` : undefined },
  ]

  return (
    <Modal open={!!lot} onClose={onClose} title={`Fiche du lot — ${lot.reference}`} width="max-w-lg">
      <div className="space-y-1">
        {etapes.map((e, i) => (
          <div key={e.label} className="flex items-center justify-between border-b border-ink-900/6 py-3 last:border-0">
            <div className="flex items-center gap-3">
              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-ink-900/[0.05] font-mono-data text-[11px] font-medium text-ink-700">
                {i + 1}
              </span>
              <div>
                <p className="text-sm font-medium text-ink-900">{e.label}</p>
                {e.note && <p className="text-[11px] text-ink-700/50">{e.note}</p>}
              </div>
            </div>
            <p className="font-display text-base font-semibold text-ink-950">
              {e.valeur !== undefined && e.valeur !== null ? e.valeur.toLocaleString('fr-FR') : '—'}
            </p>
          </div>
        ))}
      </div>
      <div className="mt-4 flex justify-end">
        <Button variant="ghost" onClick={onClose}>Fermer</Button>
      </div>
    </Modal>
  )
}
