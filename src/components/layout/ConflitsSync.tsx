import { useEffect, useState } from 'react'
import { AlertTriangle } from 'lucide-react'
import { Modal } from '@/components/ui/Modal'
import { db } from '@/lib/db'
import { getDerniersConflits, type Conflit } from '@/lib/sync'

/**
 * Écran de diagnostic des enregistrements refusés par le serveur.
 *
 * Il ne modifie RIEN : il se contente de rapprocher chaque enregistrement
 * refusé des autres enregistrements locaux portant la même référence ou le
 * même nom, pour que l'utilisateur reconnaisse — ou non — une double saisie.
 *
 * Sans ce rapprochement, « VTE-260705-4F2A en conflit » ne dit rien. Avec
 * lui, l'utilisateur voit les deux lignes, leurs dates et leurs montants, et
 * peut trancher.
 */

export const ETIQUETTES_TABLES: Record<string, string> = {
  lotsIncubation: "Lots d'incubation",
  journal: "Journal d'activité",
  bandesVolaille: 'Bandes de volaille',
  mortalites: 'Mortalités (volaille)',
  ventes: 'Ventes',
  depenses: 'Dépenses',
  achats: 'Achats',
  fournisseurs: 'Fournisseurs',
  clients: 'Clients',
  stockItems: 'Articles de stock',
  stockMouvements: 'Mouvements de stock',
  soinsSante: 'Soins (volaille)',
  lotsBetail: 'Lots de bétail',
  mortalitesBetail: 'Mortalités (bétail)',
  soinsSanteBetail: 'Soins (bétail)',
}

interface Detail {
  conflit: Conflit
  jumeaux: Record<string, unknown>[]
}

/** Résumé lisible d'un enregistrement, quelles que soient ses colonnes. */
function decrire(enregistrement: Record<string, unknown>): string {
  const parties: string[] = []

  const dateBrute =
    enregistrement.dateVente ??
    enregistrement.date ??
    enregistrement.dateDebut ??
    enregistrement.dateMiseEnCouveuse ??
    enregistrement.dateAcquisition ??
    enregistrement.horodatage

  if (typeof dateBrute === 'string') {
    const date = new Date(dateBrute)
    if (!Number.isNaN(date.getTime())) parties.push(date.toLocaleDateString('fr-FR'))
  }

  const montant = enregistrement.montantTotal ?? enregistrement.montant
  if (typeof montant === 'number') parties.push(`${montant.toLocaleString('fr-FR')} FCFA`)

  const quantite =
    enregistrement.quantite ?? enregistrement.effectifInitial ?? enregistrement.quantiteOeufs
  if (typeof quantite === 'number') parties.push(`${quantite.toLocaleString('fr-FR')} unités`)

  const tiers = enregistrement.clientNom ?? enregistrement.fournisseurNom
  if (typeof tiers === 'string' && tiers.trim()) parties.push(tiers.trim())

  const texte = enregistrement.description ?? enregistrement.notes ?? enregistrement.cause
  if (typeof texte === 'string' && texte.trim()) parties.push(texte.trim().slice(0, 60))

  parties.push(`n° ${String(enregistrement.id).slice(-4)}`)

  return parties.join('  •  ')
}

export function ConflitsSync({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [details, setDetails] = useState<Detail[]>([])
  const [chargement, setChargement] = useState(false)

  useEffect(() => {
    if (!open) return

    let annule = false
    setChargement(true)

    async function charger() {
      const conflits = getDerniersConflits()
      const resultat: Detail[] = []

      for (const conflit of conflits) {
        let jumeaux: Record<string, unknown>[] = []

        if (conflit.champ) {
          try {
            const table = db.table(conflit.table)
            const tous = (await table.toArray()) as Record<string, unknown>[]
            jumeaux = tous.filter((ligne) => ligne[conflit.champ as string] === conflit.libelle)
          } catch {
            jumeaux = []
          }
        }

        resultat.push({ conflit, jumeaux })
      }

      if (!annule) {
        setDetails(resultat)
        setChargement(false)
      }
    }

    void charger()

    return () => {
      annule = true
    }
  }, [open])

  // Regroupement par table, pour une lecture qui suit vos écrans habituels.
  const parTable = new Map<string, Detail[]>()
  for (const detail of details) {
    const liste = parTable.get(detail.conflit.table) ?? []
    liste.push(detail)
    parTable.set(detail.conflit.table, liste)
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Enregistrements refusés par le serveur"
      width="max-w-3xl"
    >
      <div className="space-y-5">
        <div className="flex gap-3 rounded-lg bg-yolk-500/10 p-3.5 text-xs leading-relaxed text-ink-800">
          <AlertTriangle size={16} className="mt-0.5 shrink-0 text-yolk-700" />
          <div>
            <p className="font-semibold">
              {details.length} enregistrement(s) n'ont pas pu être envoyés.
            </p>
            <p className="mt-1">
              Votre serveur en contient déjà un portant la même référence ou le même nom.{' '}
              <strong>Rien n'a été supprimé</strong>, ni sur ce poste, ni sur le serveur. Si vous
              reconnaissez une double saisie ci-dessous, supprimez le doublon dans l'application :
              il disparaîtra de cette liste au prochain envoi.
            </p>
          </div>
        </div>

        {chargement && <p className="text-sm text-ink-700/60">Analyse en cours…</p>}

        {!chargement && details.length === 0 && (
          <p className="text-sm text-ink-700/60">Aucun conflit enregistré.</p>
        )}

        {[...parTable.entries()].map(([table, liste]) => (
          <div key={table}>
            <p className="mb-2 font-display text-sm font-semibold text-ink-900">
              {ETIQUETTES_TABLES[table] ?? table} — {liste.length}
            </p>

            <div className="space-y-2">
              {liste.map((detail) => (
                <div
                  key={detail.conflit.id}
                  className="rounded-lg border border-ink-900/10 p-3"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="font-mono text-xs font-semibold text-ink-900">
                      {detail.conflit.libelle}
                    </p>
                    <span className="shrink-0 rounded-full bg-red-500/10 px-2 py-0.5 text-[10px] font-medium text-red-700">
                      {detail.conflit.cause}
                    </span>
                  </div>

                  {detail.jumeaux.length > 1 ? (
                    <div className="mt-2 space-y-1">
                      <p className="text-[11px] font-medium text-ink-700">
                        {detail.jumeaux.length} enregistrements portent cette valeur dans votre
                        base — comparez-les :
                      </p>
                      {detail.jumeaux.map((jumeau) => (
                        <p
                          key={String(jumeau.id)}
                          className="pl-3 text-[11px] leading-relaxed text-ink-700/80"
                        >
                          • {decrire(jumeau)}
                        </p>
                      ))}
                    </div>
                  ) : (
                    <p className="mt-2 text-[11px] text-ink-700/70">
                      Aucun jumeau local pour cette valeur : le conflit provient du serveur
                      (enregistrement supprimé sur un autre poste, ou créé différemment).
                    </p>
                  )}
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </Modal>
  )
}
