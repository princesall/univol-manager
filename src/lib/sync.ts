import { db } from './db'
import { apiConfig } from '@/config/api'
import { apiRequest, ApiError, ApiOfflineError } from './api'

/**
 * Synchronisation UniVol : client de bureau (Dexie) <-> votre backend Fastify.
 *
 * REMPLACE l'ancienne synchronisation Supabase : le projet Supabase ne
 * résout plus en DNS (vérifié le 10/10/2026), il n'existe plus.
 *
 * Le serveur est désormais la source centrale ; Dexie reste le stockage
 * local et le mode hors ligne reste pleinement fonctionnel : si le
 * serveur est injoignable, `synchronize()` retourne simplement une erreur
 * et l'utilisateur continue de travailler.
 *
 * ## Stratégie d'envoi
 *   1. Enregistrement supprimé localement -> `DELETE /<chemin>/:id`
 *   2. Sinon -> `PUT /<chemin>/:id` ; si le serveur répond 404 (absent),
 *      alors `POST /<chemin>` avec l'identifiant dans le corps.
 *
 * Pourquoi PUT d'abord : la route PUT renvoie 404 quand l'enregistrement
 * n'existe pas encore, ce qui donne une création idempotente sans jamais
 * écraser aveuglément une donnée distante plus récente.
 *
 * ## Stratégie de récupération
 *   - Tables marquées `incremental: true` : `GET /<chemin>?depuis=<curseur>`
 *     et le curseur est avancé au **maximum de `modifie_le` reçu** — jamais
 *     à l'heure du poste (qui peut être fausse).
 *   - Autres tables : lecture complète à chaque cycle (leurs routes
 *     n'acceptent pas encore `?depuis=`). Fusion idempotente, donc sans
 *     risque, mais coûteuse en bande passante.
 *
 * ## Propagation des suppressions
 *   - Tables incrémentales : elles demandent `?inclureSupprimes=1` et
 *     reçoivent les « pierres tombales », qui suppriment l'enregistrement
 *     localement.
 *   - Autres tables : leurs routes renvoient la liste complète, donc un
 *     enregistrement marqué `synchronise` absent de la réponse a été
 *     supprimé ailleurs.
 *
 * ## Point de vigilance
 *   - Autres tables : la lecture est complète à chaque cycle (leurs routes
 *     n'acceptent pas encore `?depuis=`). Fusion idempotente, donc sans
 *     risque fonctionnel, mais coûteuse en bande passante si le volume
 *     grossit beaucoup. C'est le prochain gain facile à obtenir côté serveur.
 */

const CLE_CURSEUR = 'univol_sync_'

/**
 * Mémorise l'adresse du serveur déjà contacté avec succès.
 *
 * Sert à distinguer le PREMIER contact avec un serveur des suivants. Sur un
 * poste qui n'a jamais parlé à ce serveur, les enregistrements marqués
 * `synchronise` le sont du temps d'un autre serveur (Supabase) : ils
 * n'existent pas ici. Sans cette distinction, la détection de suppressions
 * les prendrait pour « supprimés ailleurs » et les effacerait. C'est
 * exactement ce qui se produirait sur vos autres postes.
 */
const CLE_SERVEUR_CONNU = 'univol_serveur_connu'

const LIMITE_PAGE = 2000

export interface SyncResult {
  success: boolean
  uploaded: number
  downloaded: number
  errors: string[]
  /** Répartition des erreurs par table, pour un diagnostic immédiat. */
  resume?: string
  /** Causes distinctes, sans identifiant d'enregistrement (lisible par l'utilisateur). */
  causes?: string
  /** Enregistrements refusés, sous forme exploitable par l'écran des conflits. */
  conflits?: Conflit[]
}

/**
 * Enregistrement local refusé par le serveur. Sert à afficher à l'utilisateur
 * ce qui bloque, avec assez de contexte pour qu'il reconnaisse une double
 * saisie éventuelle.
 */
export interface Conflit {
  /** Nom de la table Dexie concernée. */
  table: string
  /** Identifiant local. */
  id: string
  /** Libellé lisible par l'utilisateur (référence ou nom). */
  libelle: string
  /** « Création », « Modification », « Suppression »… */
  operation: string
  /** Message renvoyé par le serveur. */
  cause: string
  /** Champ en conflit, quand il est identifiable. */
  champ?: 'reference' | 'nom'
}

interface Ressource {
  /** Chemin de l'API, préfixe `/api` inclus. */
  chemin: string
  /** Champs autorisés à l'envoi (camelCase côté client). */
  champs: readonly string[]
  /** false = jamais poussé (voir limites connues ci-dessus). */
  pousser: boolean
  /**
   * true = entrées immuables (journal d'activité) : envoi direct par POST,
   * sans tenter de PUT au préalable. La route PUT exige une permission de
   * modification que la matrice du serveur n'accorde pas pour le journal,
   * et une entrée de journal ne se modifie jamais de toute façon.
   */
  appendOnly?: boolean
  /** true = la route accepte `?depuis=` et `?offset=`. */
  incremental: boolean
}

/** Table Dexie -> ressource API. */
const RESSOURCES: Record<string, Ressource> = {
  lotsIncubation: {
    chemin: '/api/couvoir',
    champs: [
      'id', 'reference', 'quantiteCommandee', 'dateMiseEnCouveuse', 'dateEclosionPrevue',
      'quantiteOeufs', 'fournisseurId', 'fournisseurNom', 'couveuse', 'statut',
      'dateMirage1', 'quantiteApresMirage1', 'dateMirage2', 'quantiteApresMirage2',
      'poussinsEclos', 'oeufsInfeconds', 'mortaliteEmbryonnaire', 'dateEclosionReelle',
      'notes', 'creePar', 'creeLe', 'modifieLe',
    ],
    pousser: true,
    incremental: false,
  },
  journal: {
    chemin: '/api/journal',
    champs: ['id', 'horodatage', 'utilisateurNom', 'action', 'cible', 'details', 'module', 'modifieLe'],
    pousser: true,
    appendOnly: true,
    incremental: true,
  },
  bandesVolaille: {
    chemin: '/api/bandes-volaille',
    champs: [
      'id', 'reference', 'lotIncubationId', 'lotIncubationRef', 'dateDebut',
      'effectifInitial', 'effectifActuel', 'statut', 'notes', 'creePar', 'creeLe', 'modifieLe',
    ],
    pousser: true,
    incremental: true,
  },
  mortalites: {
    chemin: '/api/mortalites',
    champs: ['id', 'bandeId', 'date', 'quantite', 'cause', 'creePar', 'modifieLe'],
    pousser: true,
    incremental: true,
  },
  ventes: {
    chemin: '/api/ventes',
    champs: [
      'id', 'reference', 'clientNom', 'clientTelephone', 'bandeId', 'bandeRef',
      'lotBetailId', 'lotBetailRef', 'type', 'quantite', 'prixUnitaire', 'montantTotal',
      'montantPaye', 'statutPaiement', 'dateVente', 'notes', 'creePar', 'creeLe', 'modifieLe',
    ],
    pousser: true,
    incremental: false,
  },
  depenses: {
    chemin: '/api/depenses',
    champs: ['id', 'reference', 'categorie', 'description', 'montant', 'date', 'notes', 'creePar', 'creeLe', 'modifieLe'],
    pousser: true,
    incremental: false,
  },
  achats: {
    chemin: '/api/achats',
    champs: [
      'id', 'reference', 'fournisseurNom', 'categorie', 'description', 'quantite',
      'prixUnitaire', 'montant', 'montantPaye', 'statutPaiement', 'date', 'notes',
      'creePar', 'creeLe', 'modifieLe',
    ],
    pousser: true,
    incremental: false,
  },
  fournisseurs: {
    chemin: '/api/fournisseurs',
    champs: ['id', 'nom', 'telephone', 'email', 'adresse', 'notes', 'creeLe', 'modifieLe'],
    pousser: true,
    incremental: false,
  },
  clients: {
    chemin: '/api/clients',
    champs: ['id', 'nom', 'telephone', 'email', 'adresse', 'notes', 'creeLe', 'modifieLe'],
    pousser: true,
    incremental: false,
  },
  stockItems: {
    chemin: '/api/stocks',
    champs: ['id', 'nom', 'categorie', 'quantite', 'unite', 'prixUnitaire', 'seuilAlerte', 'notes', 'creeLe', 'modifieLe'],
    pousser: true,
    incremental: false,
  },
  stockMouvements: {
    // Route dédiée : `POST /api/stocks/:id/mouvements` modifie AUSSI la
    // quantité en stock, ce qui produirait un double comptage. Ici le
    // mouvement est écrit tel quel, sans toucher au stock.
    chemin: '/api/mouvements-stock',
    champs: [
      'id', 'stockItemId', 'stockItemNom', 'type', 'quantite',
      'source', 'motif', 'date', 'creePar', 'modifieLe',
    ],
    pousser: true,
    incremental: true,
  },
  soinsSante: {
    chemin: '/api/soins-sante',
    champs: ['id', 'bandeId', 'bandeRef', 'type', 'nom', 'date', 'rappelPrevu', 'notes', 'creePar', 'modifieLe'],
    pousser: true,
    incremental: true,
  },
  lotsBetail: {
    chemin: '/api/lots-betail',
    champs: [
      'id', 'reference', 'categorie', 'effectifInitial', 'effectifActuel',
      'dateAcquisition', 'sourceAcquisition', 'statut', 'notes', 'creePar', 'creeLe', 'modifieLe',
    ],
    pousser: true,
    incremental: true,
  },
  mortalitesBetail: {
    chemin: '/api/mortalites-betail',
    champs: ['id', 'lotBetailId', 'date', 'quantite', 'cause', 'creePar', 'modifieLe'],
    pousser: true,
    incremental: true,
  },
  soinsSanteBetail: {
    chemin: '/api/soins-sante-betail',
    champs: ['id', 'lotBetailId', 'lotBetailRef', 'type', 'nom', 'date', 'rappelPrevu', 'notes', 'creePar', 'modifieLe'],
    pousser: true,
    incremental: true,
  },
}

// ---------------------------------------------------------------------
// Conversions camelCase (client) <-> snake_case (PostgreSQL)
// ---------------------------------------------------------------------

function camelToSnakeKey(cle: string): string {
  return cle.replace(/([A-Z])/g, '_$1').toLowerCase()
}

function snakeToCamel(objet: unknown): unknown {
  if (objet === null || typeof objet !== 'object') return objet
  if (Array.isArray(objet)) return objet.map(snakeToCamel)

  const resultat: Record<string, unknown> = {}
  for (const [cle, valeur] of Object.entries(objet as Record<string, unknown>)) {
    resultat[cle.replace(/_([a-z])/g, (_, lettre: string) => lettre.toUpperCase())] = snakeToCamel(valeur)
  }
  return resultat
}

/**
 * Prépare un enregistrement local pour l'envoi : uniquement les champs de
 * la liste blanche, en snake_case.
 *
 * `supprime_le` n'est JAMAIS envoyé : l'ancien code le forçait à `null` à
 * chaque envoi, ce qui ressuscitait les enregistrements supprimés sur un
 * autre poste.
 */
function versServeur(ressource: Ressource, enregistrement: Record<string, unknown>): Record<string, unknown> {
  const corps: Record<string, unknown> = {}

  for (const champ of ressource.champs) {
    const valeur = enregistrement[champ]
    if (valeur !== undefined && valeur !== null) {
      corps[camelToSnakeKey(champ)] = valeur
    }
  }

  return corps
}

// ---------------------------------------------------------------------
// Curseurs de synchronisation (localStorage)
// ---------------------------------------------------------------------

function lireCurseur(table: string): string | null {
  return localStorage.getItem(`${CLE_CURSEUR}${table}`)
}

function ecrireCurseur(table: string, valeur: string): void {
  localStorage.setItem(`${CLE_CURSEUR}${table}`, valeur)
}

/** Force un re-téléchargement complet au prochain cycle. */
export function resetSyncTimestamps(): void {
  const aSupprimer: string[] = []
  for (let i = 0; i < localStorage.length; i++) {
    const cle = localStorage.key(i)
    if (cle?.startsWith(CLE_CURSEUR)) aSupprimer.push(cle)
  }
  aSupprimer.forEach((cle) => localStorage.removeItem(cle))
}

// ---------------------------------------------------------------------
// Premier contact avec ce serveur
// ---------------------------------------------------------------------

function serveurDejaConnu(): boolean {
  try {
    return localStorage.getItem(CLE_SERVEUR_CONNU) === apiConfig.baseUrl
  } catch {
    return false
  }
}

function memoriserServeur(): void {
  try {
    localStorage.setItem(CLE_SERVEUR_CONNU, apiConfig.baseUrl)
  } catch {
    // Sans stockage persistant, on repassera par la préparation au prochain
    // démarrage : c'est sans danger, seulement un peu plus long.
  }
}

/**
 * Marque TOUT le contenu local comme à envoyer.
 *
 * Sur un poste qui n'a jamais parlé à ce serveur, les enregistrements marqués
 * `synchronise` le sont du temps de l'ancien back-end : ils ne sont PAS sur ce
 * serveur-ci. Sans cette étape, ils ne seraient jamais envoyés, et la
 * détection de suppressions les effacerait même.
 *
 * `modifieLe` n'est volontairement PAS touché : ce n'est pas une
 * modification de la donnée, seulement un changement d'état de
 * synchronisation.
 */
async function preparerPremierContact(): Promise<number> {
  let marques = 0

  for (const table of db.tables) {
    let lignes: Record<string, unknown>[]

    try {
      lignes = (await table.toArray()) as Record<string, unknown>[]
    } catch {
      continue
    }

    for (const ligne of lignes) {
      if (ligne.syncStatus === 'en_attente') continue
      await table.update(String(ligne.id), { syncStatus: 'en_attente' })
      marques++
    }
  }

  return marques
}

function tableDe(nom: string) {
  try {
    return db.table(nom)
  } catch {
    return null
  }
}

// ---------------------------------------------------------------------
// Envoi
// ---------------------------------------------------------------------

async function pousserEnregistrement(
  nomTable: string,
  ressource: Ressource,
  enregistrement: Record<string, unknown>,
  resultat: SyncResult,
): Promise<void> {
  const table = tableDe(nomTable)
  const id = enregistrement.id as string | undefined
  if (!table || !id) return

  const url = `${ressource.chemin}/${encodeURIComponent(id)}`
  // Sert à savoir QUEL appel a échoué : une création refusée (doublon
  // probable) et une modification refusée n'ont pas la même cause.
  let operation = 'Envoi'

  try {
    // --- Suppression locale : on la propage, puis on purge le cache ---
    if (enregistrement.supprimeLe) {
      operation = 'Suppression'
      try {
        await apiRequest(url, { method: 'DELETE' })
      } catch (erreur) {
        // 404 = déjà absent côté serveur : c'est un succès du point de vue local.
        if (!(erreur instanceof ApiError && erreur.status === 404)) throw erreur
      }
      await table.delete(id)
      resultat.uploaded++
      return
    }

    const corps = versServeur(ressource, enregistrement)

    // --- Modification de l'existant ---
    // Ignorée pour les ressources en ajout seul (journal) : leurs entrées ne
    // se modifient jamais, et la route PUT du journal exige une permission
    // que la matrice du serveur n'accorde pas.
    if (!ressource.appendOnly) {
      operation = 'Modification'
      try {
        await apiRequest(url, { method: 'PUT', body: JSON.stringify(corps) })
        await table.update(id, { syncStatus: 'synchronise' })
        resultat.uploaded++
        return
      } catch (erreur) {
        // 404 = pas encore sur le serveur -> création juste après.
        if (!(erreur instanceof ApiError && erreur.status === 404)) throw erreur
      }
    }

    // --- Création ---
    operation = 'Création'
    await apiRequest(ressource.chemin, {
      method: 'POST',
      body: JSON.stringify({ ...corps, id }),
    })
    await table.update(id, { syncStatus: 'synchronise' })
    resultat.uploaded++
  } catch (erreur) {
    if (erreur instanceof ApiOfflineError) throw erreur

    const message =
      erreur instanceof ApiError
        ? `${erreur.status} — ${erreur.message}`
        : erreur instanceof Error
          ? erreur.message
          : String(erreur)

    // Libellé lisible : la référence ou le nom permet de retrouver
    // l'enregistrement dans l'application, l'identifiant interne non.
    const libelle = (enregistrement.reference ?? enregistrement.nom ?? id) as string

    resultat.errors.push(`${operation} ${nomTable} (${libelle}) : ${message}`)

    // Conserve le conflit sous forme exploitable par l'écran des conflits.
    if (!resultat.conflits) resultat.conflits = []

    resultat.conflits.push({
      table: nomTable,
      id,
      libelle,
      operation,
      cause: message,
      champ:
        enregistrement.reference !== undefined
          ? 'reference'
          : enregistrement.nom !== undefined
            ? 'nom'
            : undefined,
    })
  }
}

/**
 * Regroupe les erreurs par table : « clients : 140 » saute aux yeux, alors
 * qu'une liste de 140 lignes identiques noie l'information.
 */
function resumeErreurs(errors: readonly string[]): string {
  if (errors.length === 0) return ''

  const parTable = new Map<string, number>()

  for (const message of errors) {
    const trouve = message.match(/^(?:Envoi|Création|Modification|Suppression|Réception)\s+([A-Za-zÀ-ÿ]+)/)
    const cle = trouve ? trouve[1] : 'autres'
    parTable.set(cle, (parTable.get(cle) ?? 0) + 1)
  }

  return [...parTable.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([table, nombre]) => `${table} : ${nombre}`)
    .join(' | ')
}

/**
 * Causes distinctes des échecs, sans identifiant d'enregistrement.
 * « 400 — Le champ « statut » est obligatoire. (3) » est exploitable ;
 * une liste de 25 identifiants ne l'est pas.
 */
function resumeCauses(errors: readonly string[]): string {
  if (errors.length === 0) return ''

  const parCause = new Map<string, number>()

  for (const erreur of errors) {
    const separateur = erreur.indexOf(' : ')
    const cause = separateur >= 0 ? erreur.slice(separateur + 3) : erreur
    parCause.set(cause, (parCause.get(cause) ?? 0) + 1)
  }

  return [...parCause.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 4)
    .map(([cause, nombre]) => `${cause} (${nombre})`)
    .join('  •  ')
}

async function pousserTable(nomTable: string, ressource: Ressource, resultat: SyncResult, toutEnvoyer: boolean): Promise<void> {
  const table = tableDe(nomTable)
  if (!table || !ressource.pousser) return

  const aEnvoyer = toutEnvoyer
    ? ((await table.toArray()) as Array<Record<string, unknown>>)
    : ((await table.where('syncStatus').equals('en_attente').toArray()) as Array<Record<string, unknown>>)

  for (const enregistrement of aEnvoyer) {
    await pousserEnregistrement(nomTable, ressource, enregistrement, resultat)
  }
}

// ---------------------------------------------------------------------
// Récupération
// ---------------------------------------------------------------------

async function tirerTable(
  nomTable: string,
  ressource: Ressource,
  resultat: SyncResult,
  ignorerSuppressions: boolean,
): Promise<void> {
  const table = tableDe(nomTable)
  if (!table) return

  const parametres = new URLSearchParams()
  parametres.set('limit', String(LIMITE_PAGE))

  const curseur = ressource.incremental ? lireCurseur(nomTable) : null
  if (curseur) parametres.set('depuis', curseur)

  // Les tables incrémentales savent renvoyer aussi les enregistrements
  // supprimés (les « pierres tombales ») : sans elles, une suppression faite
  // sur un autre poste ne serait jamais connue ici.
  if (ressource.incremental) parametres.set('inclureSupprimes', '1')

  const reponse = await apiRequest<Array<Record<string, unknown>>>(
    `${ressource.chemin}?${parametres.toString()}`,
  )

  const lignes = Array.isArray(reponse) ? reponse : []
  if (lignes.length === 0) {
    // Aucun changement : ne surtout pas avancer le curseur, et surtout ne
    // pas en déduire des suppressions (voir le balayage plus bas).
    return
  }

  const convertis = snakeToCamel(lignes) as Array<Record<string, unknown> & { id?: string }>

  // Le curseur est le maximum de `modifie_le` REÇU, jamais l'heure du poste.
  let modifieMax: string | null = null
  for (const ligne of lignes) {
    const modifie = ligne.modifie_le
    if (typeof modifie === 'string' && (modifieMax === null || modifie > modifieMax)) {
      modifieMax = modifie
    }
  }

  const idsDistants = new Set<string>()

  for (const distant of convertis) {
    const id = distant.id
    if (!id) continue

    idsDistants.add(id)

    const existant = (await table.get(id)) as Record<string, unknown> | undefined

    // --- Pierre tombale : supprimé sur un autre poste ---
    if (distant.supprimeLe) {
      // Une modification locale en attente reste prioritaire : elle sera
      // renvoyée au serveur, qui ressuscitera l'enregistrement.
      if (existant && existant.syncStatus !== 'en_attente') {
        await table.delete(id)
        resultat.downloaded++
      }
      continue
    }

    if (existant) {
      if (existant.syncStatus === 'en_attente') continue // modification locale en attente : elle gagne

      const modifieDistant = distant.modifieLe as string | undefined
      const modifieLocal = existant.modifieLe as string | undefined
      const distantPlusRecent =
        modifieDistant !== undefined &&
        (modifieLocal === undefined || new Date(modifieDistant).getTime() > new Date(modifieLocal).getTime())

      if (distantPlusRecent || existant.syncStatus === 'synchronise') {
        await table.put({ ...distant, syncStatus: 'synchronise' })
        resultat.downloaded++
      }
    } else {
      await table.add({ ...distant, syncStatus: 'synchronise' })
      resultat.downloaded++
    }
  }

  // --- Suppressions, pour les tables dont la route n'a pas de pierres tombales ---
  // Ces routes renvoient la liste complète. Un enregistrement marqué
  // `synchronise` (donc présent sur le serveur) qui n'apparaît plus a été
  // supprimé depuis un autre poste.
  //
  // Trois garde-fous, dans l'ordre :
  //   1. la réponse n'était pas vide (une liste vide est ambiguë) ;
  //   2. la réponse n'était pas tronquée (pagination non atteinte) ;
  //   3. les candidats restent minoritaires — une disparition massive est
  //      bien plus probablement un incident qu'un nettoyage volontaire.
  // Sans ces garde-fous, une réponse anormale pourrait faire disparaître des
  // données réelles : le risque n'en vaut pas la peine.
  //
  // Au PREMIER contact avec ce serveur, le balayage est désactivé : les
  // enregistrements marqués `synchronise` viennent d'un autre back-end et ne
  // sont donc pas sur ce serveur-ci. Les effacer serait une perte de données.
  if (
    !ignorerSuppressions &&
    !ressource.incremental &&
    lignes.length > 0 &&
    lignes.length < LIMITE_PAGE
  ) {
    const locales = (await table.toArray()) as Record<string, unknown>[]

    const synchronises = locales.filter(
      (locale) => !locale.supprimeLe && locale.syncStatus === 'synchronise',
    )

    const candidats = synchronises.filter((locale) => !idsDistants.has(String(locale.id)))

    if (candidats.length > 0 && candidats.length > Math.max(5, synchronises.length * 0.25)) {
      resultat.errors.push(
        `Réception ${nomTable} : ${candidats.length} enregistrements absents du serveur. ` +
          'Suppression automatique suspendue par précaution — vérifiez votre serveur.',
      )
    } else {
      for (const candidat of candidats) {
        await table.delete(String(candidat.id))
        resultat.downloaded++
      }
    }
  }

  // Le curseur n'est avancé que si la page n'était pas pleine : une page
  // pleine signifie qu'il reste probablement des lignes côté serveur.
  if (ressource.incremental && modifieMax && lignes.length < LIMITE_PAGE) {
    ecrireCurseur(nomTable, modifieMax)
  }
}

// ---------------------------------------------------------------------
// Conflits : enregistrements refusés par le serveur
// ---------------------------------------------------------------------

const CLE_CONFLITS = 'univol_conflits'

type EcouteurConflits = (conflits: Conflit[]) => void

const ecouteursConflits = new Set<EcouteurConflits>()

/** Conservé entre deux sessions : l'utilisateur retrouve la liste au retour. */
let derniersConflits: Conflit[] = (() => {
  try {
    const brut = localStorage.getItem(CLE_CONFLITS)
    return brut ? (JSON.parse(brut) as Conflit[]) : []
  } catch {
    return []
  }
})()

/** Derniers conflits connus. */
export function getDerniersConflits(): Conflit[] {
  return derniersConflits
}

/** S'abonne aux conflits ; l'écouteur est appelé immédiatement avec l'état courant. */
export function surConflits(ecouteur: EcouteurConflits): () => void {
  ecouteursConflits.add(ecouteur)
  ecouteur(derniersConflits)

  return () => {
    ecouteursConflits.delete(ecouteur)
  }
}

function publierConflits(conflits: Conflit[]): void {
  derniersConflits = conflits

  try {
    localStorage.setItem(CLE_CONFLITS, JSON.stringify(conflits.slice(0, 300)))
  } catch {
    // Quota dépassé : la liste en mémoire reste valable pour la session.
  }

  for (const ecouteur of ecouteursConflits) ecouteur(conflits)
}

// ---------------------------------------------------------------------
// Cycle complet
// ---------------------------------------------------------------------

let cycleEnCours: Promise<SyncResult> | null = null

/**
 * Un cycle complet : envoi des modifications locales, puis récupération
 * des modifications distantes.
 *
 * @param options.toutEnvoyer force l'envoi de TOUS les enregistrements
 *        locaux, même ceux déjà marqués `synchronise`. Utilisé une seule
 *        fois, pour la reprise initiale des données vers le VPS.
 */
export async function synchronize(options: { toutEnvoyer?: boolean } = {}): Promise<SyncResult> {
  if (!apiConfig.baseUrl) {
    return {
      success: false,
      uploaded: 0,
      downloaded: 0,
      errors: ["VITE_API_URL n'est pas configuré."],
    }
  }

  // Un cycle est déjà en cours (intervalle automatique toutes les 60 s) :
  //  - un simple clic attend et récupère le résultat du cycle en cours ;
  //  - une reprise complète attend la fin, puis relance un cycle complet,
  //    pour ne jamais refuser l'action demandée par l'utilisateur.
  if (cycleEnCours) {
    if (options.toutEnvoyer !== true) return cycleEnCours
    await cycleEnCours.catch(() => undefined)
  }

  // Premier contact avec ce serveur : tout le contenu local doit monter, et
  // aucune suppression ne doit être déduite de la comparaison avec le serveur.
  const premierContact = !serveurDejaConnu()
  if (premierContact) {
    const marques = await preparerPremierContact()
    console.info(
      `Premier contact avec ${apiConfig.baseUrl} : ${marques} enregistrement(s) ` +
        'local(aux) marqués pour envoi.',
    )
  }

  const cycle = executerCycle(options.toutEnvoyer === true, premierContact).finally(() => {
    cycleEnCours = null
  })

  cycleEnCours = cycle

  return cycle
}

/** Corps d'un cycle, sans la gestion de concurrence. */
async function executerCycle(toutEnvoyer: boolean, premierContact: boolean): Promise<SyncResult> {
  const resultat: SyncResult = { success: true, uploaded: 0, downloaded: 0, errors: [] }

  try {
    // 1. Envoi (les parents avant les enfants : les clés étrangères du
    //    serveur sont en ON DELETE CASCADE et exigent l'existence du parent).
    const ordre = [
      'clients',
      'fournisseurs',
      'stockItems',
      'lotsIncubation',
      'lotsBetail',
      'bandesVolaille',
      'mortalites',
      'soinsSante',
      'mortalitesBetail',
      'soinsSanteBetail',
      'achats',
      'ventes',
      'depenses',
      'journal',
      'stockMouvements',
    ]

    for (const nomTable of ordre) {
      const ressource = RESSOURCES[nomTable]
      if (!ressource) continue

      try {
        await pousserTable(nomTable, ressource, resultat, toutEnvoyer)
      } catch (erreur) {
        if (erreur instanceof ApiOfflineError) throw erreur
        resultat.errors.push(
          `Envoi table ${nomTable} : ${erreur instanceof Error ? erreur.message : String(erreur)}`,
        )
      }
    }

    // 2. Récupération
    for (const [nomTable, ressource] of Object.entries(RESSOURCES)) {
      try {
        await tirerTable(nomTable, ressource, resultat, premierContact)
      } catch (erreur) {
        if (erreur instanceof ApiOfflineError) throw erreur
        resultat.errors.push(
          `Réception ${nomTable} : ${erreur instanceof Error ? erreur.message : String(erreur)}`,
        )
      }
    }
  } catch (erreur) {
    resultat.success = false
    resultat.errors.push(
      erreur instanceof ApiOfflineError
        ? 'Serveur injoignable — travail hors ligne préservé.'
        : `Erreur de synchronisation : ${erreur instanceof Error ? erreur.message : String(erreur)}`,
    )
    return resultat
  }

  if (resultat.errors.length > 0) resultat.success = false
  resultat.resume = resumeErreurs(resultat.errors)
  resultat.causes = resumeCauses(resultat.errors)

  publierConflits(resultat.conflits ?? [])

  // Le serveur a répondu : les prochains cycles ne sont plus un premier
  // contact, et la détection de suppressions peut reprendre normalement.
  memoriserServeur()

  return resultat
}

/**
 * Reprise initiale : pousse TOUT le contenu local vers le VPS, en incluant
 * les enregistrements déjà marqués `synchronise` du temps de Supabase.
 * À exécuter une seule fois par poste, après vérification des sauvegardes.
 */
export async function migrationInitiale(): Promise<SyncResult> {
  return synchronize({ toutEnvoyer: true })
}

// ---------------------------------------------------------------------
// Marquage local (inchangé : utilisé par les pages et par db.ts)
// ---------------------------------------------------------------------

export async function markForSync(table: string, id: string): Promise<void> {
  try {
    const dbTable = tableDe(table)
    if (dbTable) {
      await dbTable.update(id, { syncStatus: 'en_attente', modifieLe: new Date().toISOString() })
    }
  } catch (erreur) {
    console.error(`Erreur marquage sync ${table}:${id}:`, erreur)
  }
}

export async function markForDelete(table: string, id: string): Promise<void> {
  try {
    const dbTable = tableDe(table)
    if (!dbTable) return

    const existant = await dbTable.get(id)
    if (!existant) return

    await dbTable.update(id, {
      supprimeLe: new Date().toISOString(),
      modifieLe: new Date().toISOString(),
      syncStatus: 'en_attente',
    })
  } catch (erreur) {
    console.error(`Erreur marquage suppression ${table}:${id}:`, erreur)
  }
}

// ---------------------------------------------------------------------
// Synchronisation automatique
// ---------------------------------------------------------------------

let minuteur: ReturnType<typeof setInterval> | null = null

export function startAutoSync(intervalMs = 60_000): void {
  if (minuteur) clearInterval(minuteur)

  void synchronize().then((r) => {
    if (r.errors.length) console.warn('Synchronisation initiale :', r)
    else console.log('Synchronisation initiale OK :', r)
  })

  minuteur = setInterval(() => {
    void synchronize().then((r) => {
      if (r.errors.length) console.warn('Synchronisation :', r)
      else console.log('Synchronisation OK :', r)
    })
  }, intervalMs)
}

export function stopAutoSync(): void {
  if (minuteur) {
    clearInterval(minuteur)
    minuteur = null
  }
}

export async function manualSync(): Promise<SyncResult> {
  return synchronize()
}

export function getMappedTables(): { local: string; remote: string }[] {
  return Object.entries(RESSOURCES).map(([local, ressource]) => ({ local, remote: ressource.chemin }))
}

// ---------------------------------------------------------------------
// Accès depuis la console (reprise initiale, diagnostic)
// ---------------------------------------------------------------------

declare global {
  interface Window {
    /** Reprise initiale : pousse tout le contenu local vers le VPS. */
    univolMigre?: () => Promise<SyncResult>
    /** Cycle de synchronisation complet. */
    univolSync?: () => Promise<SyncResult>
    /** Réinitialise les curseurs (re-téléchargement complet). */
    univolResetCurseurs?: () => void
  }
}

if (typeof window !== 'undefined') {
  window.univolMigre = migrationInitiale
  window.univolSync = manualSync
  window.univolResetCurseurs = resetSyncTimestamps
}
