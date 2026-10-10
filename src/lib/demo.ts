import { db } from './db'
import { markForDelete } from './sync'

/**
 * Détection et suppression des données de DÉMONSTRATION.
 *
 * L'application a été livrée, dans une version antérieure, avec un jeu de
 * données de démonstration (src/lib/seed.ts) qui s'insérait au premier
 * démarrage. Ce fichier est aujourd'hui désactivé (ligne 6 : `return`),
 * mais les enregistrements insérés à l'époque sont toujours présents.
 *
 * Ces enregistrements bloquent la synchronisation : plusieurs d'entre eux
 * partagent la même référence, ce que votre serveur refuse — à juste titre.
 *
 * Détection volontairement STRICTE : on ne devine pas, on ne se base pas sur
 * des dates approximatives. Deux critères seulement :
 *   1. La valeur figure littéralement dans src/lib/seed.ts.
 *   2. La référence suit un ancien format de démonstration, impossible à
 *      produire par le générateur actuel (qui écrit PREFIX-AAMMJJ-XXXX).
 */

/** Références présentes littéralement dans src/lib/seed.ts. */
const REFERENCES_DEMO = new Set([
  'LOT-2026-010',
  'LOT-2026-011',
  'LOT-2026-014',
  'LOT-2026-015',
  'BND-2026-010',
  'BND-2026-011',
  'VTE-100471',
  'VTE-100479',
  'VTE-100482',
  'DEP-100205',
  'DEP-100210',
  'DEP-100219',
  'DEP-100221',
  'ACH-100298',
  'ACH-100301',
  'BET-260501-E5F6',
  'BET-260601-A1B2',
  'BET-260615-C3D4',
])

/**
 * Anciens formats de démonstration, absents du seed actuel mais produits par
 * des versions précédentes (c'est le cas de BND-2026-014, vu en conflit).
 * Le générateur actuel écrit `LOT-260615-4F2A` : il produit toujours
 * 6 chiffres puis un tiret puis un suffixe alphanumérique. Aucun de ces
 * motifs ne peut donc provenir d'une saisie réelle.
 */
const MOTIFS_REFERENCE_DEMO: readonly RegExp[] = [
  /^(LOT|BND|VTE|DEP|ACH|BET)-20\d{2}-\d{3}$/,
  /^(VTE|DEP|ACH|BET)-1\d{5}$/,
]

/** Noms de clients, fournisseurs, articles et soins présents dans seed.ts. */
const NOMS_DEMO = new Set([
  'Aliment croissance',
  'Aliment démarrage',
  'Ampoules chauffantes',
  'Aviculture Sanogo',
  'Boubacar Sidibé',
  'Ferme Coulibaly & Fils',
  'Ferme Diarra',
  'Mariam Keïta',
  'Vaccin fièvre aphteuse',
  'Vaccin Newcastle',
  'Vitamines — stress post-transport',
])

export interface LigneDemo {
  table: string
  id: string
  libelle: string
  motif: string
}

/** Relations parent/enfant du schéma, pour repérer les données orphelines. */
const DEPENDANCES: readonly { enfant: string; champ: string }[] = [
  { enfant: 'mortalites', champ: 'bandeId' },
  { enfant: 'soinsSante', champ: 'bandeId' },
  { enfant: 'mortalitesBetail', champ: 'lotBetailId' },
  { enfant: 'soinsSanteBetail', champ: 'lotBetailId' },
  { enfant: 'stockMouvements', champ: 'stockItemId' },
]

function motifDemo(enregistrement: Record<string, unknown>): string | null {
  const reference =
    typeof enregistrement.reference === 'string' ? enregistrement.reference.trim() : null

  if (reference) {
    if (REFERENCES_DEMO.has(reference)) {
      return 'référence livrée avec la démonstration'
    }

    for (const motif of MOTIFS_REFERENCE_DEMO) {
      if (motif.test(reference)) return 'ancien format de démonstration'
    }
  }

  for (const champ of ['nom', 'fournisseurNom', 'clientNom'] as const) {
    const valeur = enregistrement[champ]
    if (typeof valeur === 'string' && NOMS_DEMO.has(valeur.trim())) {
      return `« ${valeur.trim()} » figure dans la démonstration`
    }
  }

  return null
}

/** Parcourt toutes les tables et retourne les enregistrements de démonstration. */
export async function detecterDonneesDemo(): Promise<LigneDemo[]> {
  const trouvees: LigneDemo[] = []

  for (const table of db.tables) {
    let lignes: Record<string, unknown>[]

    try {
      lignes = (await table.toArray()) as Record<string, unknown>[]
    } catch {
      continue
    }

    for (const ligne of lignes) {
      if (ligne.supprimeLe) continue

      const motif = motifDemo(ligne)
      if (!motif) continue

      trouvees.push({
        table: table.name,
        id: String(ligne.id),
        libelle: String(ligne.reference ?? ligne.nom ?? ligne.id),
        motif,
      })
    }
  }

  return trouvees
}

/**
 * Enregistrements qui ne font PAS partie de la démonstration mais qui
 * dépendent d'un enregistrement de démonstration (un soin réel rattaché à
 * une bande de démonstration, par exemple). Les signaler évite de laisser
 * des données orphelines sans le dire.
 */
export async function trouverDependancesReelles(
  lignes: readonly LigneDemo[],
): Promise<{ description: string; exemple: string }[]> {
  const idsDemo = new Set(lignes.map((ligne) => ligne.id))
  const resultats: { description: string; exemple: string }[] = []

  for (const dependance of DEPENDANCES) {
    let enfants: Record<string, unknown>[]

    try {
      enfants = (await db.table(dependance.enfant).toArray()) as Record<string, unknown>[]
    } catch {
      continue
    }

    const orphelins = enfants.filter(
      (enfant) =>
        !enfant.supprimeLe &&
        !idsDemo.has(String(enfant.id)) &&
        idsDemo.has(String(enfant[dependance.champ])),
    )

    if (orphelins.length > 0) {
      const premier = orphelins[0]
      resultats.push({
        description: `${dependance.enfant} rattaché(s) à un élément de démonstration`,
        exemple: String(premier.nom ?? premier.reference ?? premier.id),
      })
    }
  }

  return resultats
}

/**
 * Marque les enregistrements comme supprimés. La suppression est ensuite
 * transmise au serveur par la synchronisation habituelle, ce qui nettoie les
 * deux côtés avec le même mécanisme.
 */
export async function supprimerDonneesDemo(lignes: readonly LigneDemo[]): Promise<number> {
  let supprimes = 0

  for (const ligne of lignes) {
    await markForDelete(ligne.table, ligne.id)
    supprimes++
  }

  return supprimes
}
