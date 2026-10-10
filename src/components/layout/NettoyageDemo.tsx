import { useEffect, useState } from 'react'
import { AlertTriangle, Sparkles, Trash2 } from 'lucide-react'
import { Modal } from '@/components/ui/Modal'
import { ETIQUETTES_TABLES } from '@/components/layout/ConflitsSync'
import {
  detecterDonneesDemo,
  supprimerDonneesDemo,
  trouverDependancesReelles,
  type LigneDemo,
} from '@/lib/demo'

/**
 * Nettoyage des données de démonstration.
 *
 * Écran en deux temps : d'abord l'ANALYSE (aucune modification), puis la
 * suppression après confirmation explicite. Les enregistrements sont marqués
 * supprimés localement ; la synchronisation habituelle propage la suppression
 * au serveur, ce qui nettoie les deux côtés avec le même mécanisme éprouvé.
 */
export function NettoyageDemo({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [lignes, setLignes] = useState<LigneDemo[]>([])
  const [dependances, setDependances] = useState<{ description: string; exemple: string }[]>([])
  const [chargement, setChargement] = useState(false)
  const [suppressionEnCours, setSuppressionEnCours] = useState(false)
  const [message, setMessage] = useState<string | null>(null)

  async function analyser() {
    setChargement(true)
    setMessage(null)

    const trouvees = await detecterDonneesDemo()
    setLignes(trouvees)
    setDependances(await trouverDependancesReelles(trouvees))

    setChargement(false)
  }

  useEffect(() => {
    if (open) void analyser()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])

  async function handleSupprimer() {
    const confirme = window.confirm(
      `Supprimer ${lignes.length} enregistrement(s) de démonstration ?\n\n` +
        'Ils disparaîtront immédiatement de vos listes. La suppression sera transmise ' +
        'à votre serveur lors de la prochaine synchronisation, pour nettoyer les deux côtés.\n\n' +
        'Vos vraies données ne sont pas touchées.',
    )
    if (!confirme) return

    setSuppressionEnCours(true)
    const nombre = await supprimerDonneesDemo(lignes)
    setSuppressionEnCours(false)
    setMessage(
      `${nombre} enregistrement(s) marqués comme supprimés. Cliquez maintenant sur ` +
        '« Envoyer vers le serveur » dans le menu de gauche pour propager le nettoyage.',
    )

    await analyser()
  }

  const parTable = new Map<string, LigneDemo[]>()
  for (const ligne of lignes) {
    const liste = parTable.get(ligne.table) ?? []
    liste.push(ligne)
    parTable.set(ligne.table, liste)
  }

  return (
    <Modal open={open} onClose={onClose} title="Données de démonstration" width="max-w-3xl">
      <div className="space-y-5">
        <div className="flex gap-3 rounded-lg bg-sky-500/10 p-3.5 text-xs leading-relaxed text-ink-800">
          <Sparkles size={16} className="mt-0.5 shrink-0 text-sky-700" />
          <div>
            <p className="font-semibold">D'où viennent ces enregistrements ?</p>
            <p className="mt-1">
              L'application a été livrée avec un jeu de <strong>données de démonstration</strong>{' '}
              (clients « Ferme Diarra », « Aviculture Sanogo », lots « LOT-2026-014 »…) qui
              s'inséraient au premier démarrage. Ces données sont aujourd'hui{' '}
              <strong>désactivées dans le code</strong>, mais celles insérées à l'époque sont
              toujours dans votre base — et sur votre serveur pour celles qui ont pu y monter.
            </p>
          </div>
        </div>

        {chargement && <p className="text-sm text-ink-700/60">Analyse de votre base…</p>}

        {!chargement && lignes.length === 0 && (
          <p className="text-sm text-ink-700/60">
            Aucune donnée de démonstration trouvée. Votre base ne contient que vos propres
            enregistrements.
          </p>
        )}

        {!chargement && lignes.length > 0 && (
          <>
            <div className="flex items-center justify-between gap-3 rounded-lg border border-ink-900/10 px-3.5 py-3">
              <p className="text-sm font-semibold text-ink-900">
                {lignes.length} enregistrement(s) de démonstration détecté(s)
              </p>
              <button
                onClick={handleSupprimer}
                disabled={suppressionEnCours}
                className="flex shrink-0 items-center gap-2 rounded-lg bg-red-600 px-3.5 py-2 text-xs font-semibold text-white transition-colors hover:bg-red-700 disabled:opacity-50"
              >
                <Trash2 size={14} />
                {suppressionEnCours ? 'Suppression…' : 'Supprimer ces données'}
              </button>
            </div>

            {dependances.length > 0 && (
              <div className="flex gap-3 rounded-lg bg-yolk-500/10 p-3.5 text-xs leading-relaxed text-ink-800">
                <AlertTriangle size={16} className="mt-0.5 shrink-0 text-yolk-700" />
                <div>
                  <p className="font-semibold">Attention, des données réelles en dépendent :</p>
                  <ul className="mt-1 list-inside list-disc">
                    {dependances.map((dependance) => (
                      <li key={dependance.description}>
                        {dependance.description} (par exemple : {dependance.exemple})
                      </li>
                    ))}
                  </ul>
                  <p className="mt-1">
                    Supprimez plutôt ces éléments-là avant, ou signalez-le moi : les laisser
                    pointer vers un élément supprimé créerait des données orphelines.
                  </p>
                </div>
              </div>
            )}

            {[...parTable.entries()].map(([table, liste]) => (
              <div key={table}>
                <p className="mb-2 font-display text-sm font-semibold text-ink-900">
                  {ETIQUETTES_TABLES[table] ?? table} — {liste.length}
                </p>
                <div className="space-y-1">
                  {liste.map((ligne) => (
                    <div
                      key={ligne.id}
                      className="flex flex-wrap items-baseline justify-between gap-2 rounded-md bg-ink-900/[0.02] px-3 py-2"
                    >
                      <span className="font-mono text-xs font-medium text-ink-900">
                        {ligne.libelle}
                      </span>
                      <span className="text-[10px] text-ink-700/60">{ligne.motif}</span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </>
        )}

        {message && (
          <p className="rounded-lg bg-moss-500/12 px-3.5 py-3 text-xs leading-relaxed text-moss-600">
            {message}
          </p>
        )}
      </div>
    </Modal>
  )
}
