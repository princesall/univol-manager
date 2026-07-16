import Dexie, { type Table } from 'dexie'
import type {
  LotIncubation,
  JournalEntry,
  BandeVolaille,
  EnregistrementMortalite,
  Vente,
  Depense,
  Achat,
  Fournisseur,
  Client,
  StockItem,
  StockMouvement,
  SoinSante,
  LotBetail,
  MortaliteBetail,
  SoinSanteBetail,
} from '@/types'

/**
 * Base de données locale (IndexedDB via Dexie).
 *
 * Principe offline-first :
 * - Toute écriture se fait d'abord ici, immédiatement, sans dépendre du réseau.
 * - Chaque enregistrement porte un `syncStatus` ('local' | 'en_attente' | 'synchronise').
 * - Un service de synchronisation (à brancher sur Supabase, voir lib/sync.ts)
 *   parcourt périodiquement les enregistrements non synchronisés et les pousse
 *   vers la base cloud, puis met à jour syncStatus.
 * - En cas de conflit (même enregistrement modifié sur deux postes hors-ligne),
 *   la règle par défaut est "dernière modification gagne" en comparant `modifieLe`,
 *   avec conservation d'une copie de l'ancienne version dans le journal — à valider
 *   avec le client avant la mise en production (cf. cahier des charges, section 8.1).
 */
export class UnivolDB extends Dexie {
  lotsIncubation!: Table<LotIncubation, string>
  journal!: Table<JournalEntry, string>
  bandesVolaille!: Table<BandeVolaille, string>
  mortalites!: Table<EnregistrementMortalite, string>
  ventes!: Table<Vente, string>
  depenses!: Table<Depense, string>
  achats!: Table<Achat, string>
  fournisseurs!: Table<Fournisseur, string>
  clients!: Table<Client, string>
  stockItems!: Table<StockItem, string>
  stockMouvements!: Table<StockMouvement, string>
  soinsSante!: Table<SoinSante, string>
  lotsBetail!: Table<LotBetail, string>
  mortalitesBetail!: Table<MortaliteBetail, string>
  soinsSanteBetail!: Table<SoinSanteBetail, string>

  constructor() {
    super('univol-manager-db')
    this.version(1).stores({
      lotsIncubation: 'id, reference, statut, dateMiseEnCouveuse, syncStatus',
      journal: 'id, horodatage, utilisateurNom',
    })
    this.version(2).stores({
      lotsIncubation: 'id, reference, statut, dateMiseEnCouveuse, syncStatus',
      journal: 'id, horodatage, utilisateurNom',
      bandesVolaille: 'id, reference, statut, dateDebut, lotIncubationId, syncStatus',
      mortalites: 'id, bandeId, date, syncStatus',
    })
    this.version(3).stores({
      lotsIncubation: 'id, reference, statut, dateMiseEnCouveuse, syncStatus',
      journal: 'id, horodatage, utilisateurNom',
      bandesVolaille: 'id, reference, statut, dateDebut, lotIncubationId, syncStatus',
      mortalites: 'id, bandeId, date, syncStatus',
      ventes: 'id, reference, statutPaiement, dateVente, bandeId, syncStatus',
    })
    this.version(4).stores({
      lotsIncubation: 'id, reference, statut, dateMiseEnCouveuse, syncStatus',
      journal: 'id, horodatage, utilisateurNom',
      bandesVolaille: 'id, reference, statut, dateDebut, lotIncubationId, syncStatus',
      mortalites: 'id, bandeId, date, syncStatus',
      ventes: 'id, reference, statutPaiement, dateVente, bandeId, syncStatus',
      depenses: 'id, reference, categorie, date, syncStatus',
    })
    this.version(5).stores({
      lotsIncubation: 'id, reference, statut, dateMiseEnCouveuse, syncStatus',
      journal: 'id, horodatage, utilisateurNom',
      bandesVolaille: 'id, reference, statut, dateDebut, lotIncubationId, syncStatus',
      mortalites: 'id, bandeId, date, syncStatus',
      ventes: 'id, reference, statutPaiement, dateVente, bandeId, syncStatus',
      depenses: 'id, reference, categorie, date, syncStatus',
      achats: 'id, reference, statutPaiement, date, fournisseurNom, syncStatus',
      fournisseurs: 'id, nom, syncStatus',
      clients: 'id, nom, syncStatus',
      stockItems: 'id, nom, categorie, syncStatus',
    })
    this.version(6).stores({
      lotsIncubation: 'id, reference, statut, dateMiseEnCouveuse, syncStatus',
      journal: 'id, horodatage, utilisateurNom',
      bandesVolaille: 'id, reference, statut, dateDebut, lotIncubationId, syncStatus',
      mortalites: 'id, bandeId, date, syncStatus',
      ventes: 'id, reference, statutPaiement, dateVente, bandeId, syncStatus',
      depenses: 'id, reference, categorie, date, syncStatus',
      achats: 'id, reference, statutPaiement, date, fournisseurNom, syncStatus',
      fournisseurs: 'id, nom, syncStatus',
      clients: 'id, nom, syncStatus',
      stockItems: 'id, nom, categorie, syncStatus',
      stockMouvements: 'id, stockItemId, type, source, date, syncStatus',
    })
    this.version(7).stores({
      lotsIncubation: 'id, reference, statut, dateMiseEnCouveuse, syncStatus',
      journal: 'id, horodatage, utilisateurNom',
      bandesVolaille: 'id, reference, statut, dateDebut, lotIncubationId, syncStatus',
      mortalites: 'id, bandeId, date, syncStatus',
      ventes: 'id, reference, statutPaiement, dateVente, bandeId, syncStatus',
      depenses: 'id, reference, categorie, date, syncStatus',
      achats: 'id, reference, statutPaiement, date, fournisseurNom, syncStatus',
      fournisseurs: 'id, nom, syncStatus',
      clients: 'id, nom, syncStatus',
      stockItems: 'id, nom, categorie, syncStatus',
      stockMouvements: 'id, stockItemId, type, source, date, syncStatus',
      soinsSante: 'id, bandeId, type, date, syncStatus',
    })
    this.version(8).stores({
      lotsIncubation: 'id, reference, statut, dateMiseEnCouveuse, syncStatus',
      journal: 'id, horodatage, utilisateurNom',
      bandesVolaille: 'id, reference, statut, dateDebut, lotIncubationId, syncStatus',
      mortalites: 'id, bandeId, date, syncStatus',
      ventes: 'id, reference, statutPaiement, dateVente, bandeId, lotBetailId, syncStatus',
      depenses: 'id, reference, categorie, date, syncStatus',
      achats: 'id, reference, statutPaiement, date, fournisseurNom, syncStatus',
      fournisseurs: 'id, nom, syncStatus',
      clients: 'id, nom, syncStatus',
      stockItems: 'id, nom, categorie, syncStatus',
      stockMouvements: 'id, stockItemId, type, source, date, syncStatus',
      soinsSante: 'id, bandeId, type, date, syncStatus',
      lotsBetail: 'id, reference, categorie, statut, syncStatus',
      mortalitesBetail: 'id, lotBetailId, date, syncStatus',
      soinsSanteBetail: 'id, lotBetailId, type, date, syncStatus',
    })
    this.version(9).stores({
      lotsIncubation: 'id, reference, statut, dateMiseEnCouveuse, syncStatus',
      journal: 'id, horodatage, utilisateurNom',
      bandesVolaille: 'id, reference, statut, dateDebut, lotIncubationId, syncStatus',
      mortalites: 'id, bandeId, date, syncStatus',
      ventes: 'id, reference, statutPaiement, dateVente, bandeId, lotBetailId, syncStatus',
      depenses: 'id, reference, categorie, date, syncStatus',
      achats: 'id, reference, statutPaiement, date, fournisseurNom, syncStatus',
      fournisseurs: 'id, nom, syncStatus',
      clients: 'id, nom, syncStatus',
      stockItems: 'id, nom, categorie, syncStatus',
      stockMouvements: 'id, stockItemId, type, source, date, syncStatus',
      soinsSante: 'id, bandeId, type, date, syncStatus',
      // Ajout de l'index manquant sur dateAcquisition, utilisé par
      // orderBy() dans le module Bétail — son absence provoquait une
      // erreur bloquante ("KeyPath ... is not indexed") à l'ouverture
      // de la page.
      lotsBetail: 'id, reference, categorie, statut, dateAcquisition, syncStatus',
      mortalitesBetail: 'id, lotBetailId, date, syncStatus',
      soinsSanteBetail: 'id, lotBetailId, type, date, syncStatus',
    })
  }
}

export const db = new UnivolDB()

export function genId(prefix: string) {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`
}

/**
 * Génère une référence humaine unique (ex: VTE-260705-4F2A) pour les
 * factures/reçus. IMPORTANT : ne jamais utiliser `Date.now().slice(-6)` pour
 * ça — les millisecondes se répètent toutes les ~16 minutes, ce qui peut
 * produire deux factures avec exactement la même référence à des jours
 * différents. Ce générateur combine la date et un suffixe aléatoire pour
 * éliminer ce risque.
 */
export function genReference(prefix: string): string {
  const d = new Date()
  const yy = String(d.getFullYear()).slice(-2)
  const mm = String(d.getMonth() + 1).padStart(2, '0')
  const dd = String(d.getDate()).padStart(2, '0')
  const suffixe = Math.random().toString(36).slice(2, 6).toUpperCase()
  return `${prefix}-${yy}${mm}${dd}-${suffixe}`
}

export async function logActivity(utilisateurNom: string, action: string, cible: string) {
  await db.journal.add({
    id: genId('log'),
    utilisateurNom,
    action,
    cible,
    horodatage: new Date().toISOString(),
  })
}

/**
 * Enregistre une ENTRÉE de stock (typiquement suite à un achat). Si l'article
 * n'existe pas encore (par nom, insensible à la casse), il est créé
 * automatiquement — même logique anti-doublon que pour les clients.
 */
export async function enregistrerEntreeStock(params: {
  nomArticle: string
  categorie: StockItem['categorie']
  quantite: number
  unite: string
  source: 'achat' | 'ajustement'
  utilisateurNom: string
  motif?: string
}) {
  const nom = params.nomArticle.trim()
  if (!nom || params.quantite <= 0) return

  let item = await db.stockItems.filter((i) => i.nom.trim().toLowerCase() === nom.toLowerCase()).first()
  const maintenant = new Date().toISOString()

  if (!item) {
    const id = genId('stk')
    item = {
      id,
      nom,
      categorie: params.categorie,
      quantite: 0,
      unite: params.unite,
      seuilAlerte: 0,
      modifieLe: maintenant,
      syncStatus: 'en_attente',
    }
    await db.stockItems.add(item)
  }

  await db.stockItems.update(item.id, {
    quantite: item.quantite + params.quantite,
    modifieLe: maintenant,
    syncStatus: 'en_attente',
  })

  await db.stockMouvements.add({
    id: genId('mvt'),
    stockItemId: item.id,
    stockItemNom: item.nom,
    type: 'entree',
    quantite: params.quantite,
    source: params.source,
    motif: params.motif,
    date: maintenant,
    creePar: params.utilisateurNom,
    syncStatus: 'en_attente',
  })
}

/**
 * Enregistre une SORTIE de stock (consommation). L'utilisateur indique la
 * quantité utilisée — pas le nouveau total — le système fait la soustraction
 * lui-même, ce qui évite les erreurs de calcul manuel.
 */
export async function enregistrerSortieStock(params: {
  stockItemId: string
  quantite: number
  motif?: string
  utilisateurNom: string
}) {
  const item = await db.stockItems.get(params.stockItemId)
  if (!item || params.quantite <= 0) return
  const maintenant = new Date().toISOString()

  await db.stockItems.update(item.id, {
    quantite: Math.max(0, item.quantite - params.quantite),
    modifieLe: maintenant,
    syncStatus: 'en_attente',
  })

  await db.stockMouvements.add({
    id: genId('mvt'),
    stockItemId: item.id,
    stockItemNom: item.nom,
    type: 'sortie',
    quantite: params.quantite,
    source: 'consommation',
    motif: params.motif,
    date: maintenant,
    creePar: params.utilisateurNom,
    syncStatus: 'en_attente',
  })
}

/**
 * Déduit une quantité vendue de l'effectif d'une bande (vente totale ou
 * partielle). Si l'effectif tombe à 0, la bande est automatiquement
 * marquée "écoulée". Lève une erreur si la quantité dépasse l'effectif
 * disponible — à valider par l'appelant avant d'insérer la vente.
 */
export async function vendreDepuisBande(bandeId: string, quantite: number) {
  const bande = await db.bandesVolaille.get(bandeId)
  if (!bande) throw new Error('Bande introuvable')
  if (quantite > bande.effectifActuel) {
    throw new Error(`Quantité demandée (${quantite}) supérieure à l'effectif disponible (${bande.effectifActuel}).`)
  }
  const nouvelEffectif = bande.effectifActuel - quantite
  await db.bandesVolaille.update(bandeId, {
    effectifActuel: nouvelEffectif,
    statut: nouvelEffectif <= 0 ? 'ecoulee' : 'en_elevage',
    modifieLe: new Date().toISOString(),
    syncStatus: 'en_attente',
  })
}

/**
 * Opération inverse : restitue une quantité à l'effectif d'une bande
 * (annulation/suppression d'une vente liée). Rouvre automatiquement la
 * bande si elle avait été clôturée.
 */
export async function annulerVenteBande(bandeId: string, quantite: number) {
  const bande = await db.bandesVolaille.get(bandeId)
  if (!bande) return
  await db.bandesVolaille.update(bandeId, {
    effectifActuel: bande.effectifActuel + quantite,
    statut: 'en_elevage',
    modifieLe: new Date().toISOString(),
    syncStatus: 'en_attente',
  })
}

/**
 * Équivalents de vendreDepuisBande / annulerVenteBande pour le bétail
 * (chèvres, moutons, bœufs) — même logique de vente totale ou partielle.
 */
export async function vendreDepuisLotBetail(lotId: string, quantite: number) {
  const lot = await db.lotsBetail.get(lotId)
  if (!lot) throw new Error('Lot introuvable')
  if (quantite > lot.effectifActuel) {
    throw new Error(`Quantité demandée (${quantite}) supérieure à l'effectif disponible (${lot.effectifActuel}).`)
  }
  const nouvelEffectif = lot.effectifActuel - quantite
  await db.lotsBetail.update(lotId, {
    effectifActuel: nouvelEffectif,
    statut: nouvelEffectif <= 0 ? 'ecoulee' : 'en_elevage',
    modifieLe: new Date().toISOString(),
    syncStatus: 'en_attente',
  })
}

export async function annulerVenteLotBetail(lotId: string, quantite: number) {
  const lot = await db.lotsBetail.get(lotId)
  if (!lot) return
  await db.lotsBetail.update(lotId, {
    effectifActuel: lot.effectifActuel + quantite,
    statut: 'en_elevage',
    modifieLe: new Date().toISOString(),
    syncStatus: 'en_attente',
  })
}

/**
 * Vérifie si un client portant ce nom existe déjà (comparaison insensible à la
 * casse et aux espaces). Si non, le crée automatiquement. Retourne le nom
 * "officiel" à utiliser (celui du client existant si trouvé, pour éviter les
 * doublons du type "Boubacar Sidibé" / "boubacar sidibe ").
 */
export async function ensureClientExists(nomSaisi: string): Promise<string> {
  const nom = nomSaisi.trim()
  if (!nom) return nom
  const existant = await db.clients.filter((c) => c.nom.trim().toLowerCase() === nom.toLowerCase()).first()
  if (existant) return existant.nom
  await db.clients.add({
    id: genId('cli'),
    nom,
    creeLe: new Date().toISOString(),
    syncStatus: 'en_attente',
  })
  return nom
}

/**
 * Équivalent de ensureClientExists pour les fournisseurs.
 */
export async function ensureFournisseurExists(nomSaisi: string): Promise<string> {
  const nom = nomSaisi.trim()
  if (!nom) return nom
  const existant = await db.fournisseurs.filter((f) => f.nom.trim().toLowerCase() === nom.toLowerCase()).first()
  if (existant) return existant.nom
  await db.fournisseurs.add({
    id: genId('frn'),
    nom,
    creeLe: new Date().toISOString(),
    syncStatus: 'en_attente',
  })
  return nom
}
