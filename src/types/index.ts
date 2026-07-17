export type Role = 'admin' | 'commercial' | 'technique' | 'observateur'

export interface AppUser {
  id: string
  nom: string
  email: string
  role: Role
  actif: boolean
}

export type StatutSync = 'local' | 'en_attente' | 'synchronise'

export type StatutLotIncubation = 'en_cours' | 'eclos' | 'annule'

export interface LotIncubation {
  id: string
  reference: string // ex: LOT-2026-014
  quantiteCommandee?: number // œufs commandés au fournisseur
  dateMiseEnCouveuse: string // ISO date
  dateEclosionPrevue: string // ISO date, +21 jours en général
  quantiteOeufs: number // œufs réellement mis en couveuse
  fournisseurId?: string
  fournisseurNom?: string
  couveuse: string // ex: "Couveuse A - 5000"
  statut: StatutLotIncubation
  // Mirages (contrôle à la lumière pour retirer les œufs non viables)
  dateMirage1?: string
  quantiteApresMirage1?: number
  dateMirage2?: string
  quantiteApresMirage2?: number
  // Résultats, remplis à l'éclosion
  poussinsEclos?: number
  oeufsInfeconds?: number
  mortaliteEmbryonnaire?: number
  dateEclosionReelle?: string
  notes?: string
  creePar: string
  creeLe: string
  modifieLe: string
  supprimeLe?: string
  syncStatus: StatutSync
}

export type StatutBande = 'en_elevage' | 'ecoulee'

export interface BandeVolaille {
  id: string
  reference: string // ex: BND-2026-011
  lotIncubationId?: string
  lotIncubationRef?: string
  dateDebut: string // date d'éclosion / entrée en poulailler
  effectifInitial: number
  effectifActuel: number
  statut: StatutBande
  notes?: string
  creePar: string
  creeLe: string
  modifieLe: string
  supprimeLe?: string
  syncStatus: StatutSync
}

export interface EnregistrementMortalite {
  id: string
  bandeId: string
  date: string
  quantite: number
  cause?: string
  creePar: string
  modifieLe?: string
  supprimeLe?: string
  syncStatus: StatutSync
}

export type StatutPaiement = 'paye' | 'partiel' | 'attente'
export type TypeVente = 'poussin' | 'poulet' | 'chevre' | 'mouton' | 'boeuf' | 'autre'

export interface Vente {
  id: string
  reference: string // ex: VTE-2026-032
  clientNom: string
  clientTelephone?: string
  bandeId?: string
  bandeRef?: string
  lotBetailId?: string
  lotBetailRef?: string
  type: TypeVente
  quantite: number
  prixUnitaire: number // en FCFA
  montantTotal: number
  montantPaye: number
  statutPaiement: StatutPaiement
  dateVente: string
  notes?: string
  creePar: string
  creeLe: string
  modifieLe: string
  supprimeLe?: string
  syncStatus: StatutSync
}

export type CategorieDepense =
  | 'alimentation'
  | 'electricite'
  | 'transport'
  | 'salaires'
  | 'entretien'
  | 'autre'

export interface Depense {
  id: string
  reference: string
  categorie: CategorieDepense
  montant: number // FCFA
  date: string
  description: string
  creePar: string
  creeLe: string
  modifieLe: string
  supprimeLe?: string
  syncStatus: StatutSync
}

export type CategorieAchat = 'oeufs' | 'aliment' | 'materiel' | 'autre'

export interface Achat {
  id: string
  reference: string
  fournisseurNom: string
  categorie: CategorieAchat
  description: string
  quantite?: number
  montant: number // FCFA
  montantPaye: number
  statutPaiement: StatutPaiement
  date: string
  creePar: string
  creeLe: string
  modifieLe: string
  supprimeLe?: string
  syncStatus: StatutSync
}

export interface Fournisseur {
  id: string
  nom: string
  telephone?: string
  email?: string
  adresse?: string
  notes?: string
  creeLe: string
  modifieLe?: string
  supprimeLe?: string
  syncStatus: StatutSync
}

export interface Client {
  id: string
  nom: string
  telephone?: string
  email?: string
  adresse?: string
  notes?: string
  creeLe: string
  modifieLe?: string
  supprimeLe?: string
  syncStatus: StatutSync
}

export type CategorieStock = 'aliment' | 'materiel' | 'autre'

export interface StockItem {
  id: string
  nom: string
  categorie: CategorieStock
  quantite: number
  unite: string // ex: "sacs", "kg", "unités"
  seuilAlerte: number
  creeLe?: string
  modifieLe: string
  supprimeLe?: string
  syncStatus: StatutSync
}

export type TypeMouvementStock = 'entree' | 'sortie'
export type SourceMouvementStock = 'achat' | 'consommation' | 'ajustement'

export interface StockMouvement {
  id: string
  stockItemId: string
  stockItemNom: string
  type: TypeMouvementStock
  quantite: number
  source: SourceMouvementStock
  motif?: string
  date: string
  creePar: string
  modifieLe?: string
  supprimeLe?: string
  syncStatus: StatutSync
}

export type TypeSoin = 'vaccination' | 'traitement' | 'controle'

export interface SoinSante {
  id: string
  bandeId: string
  bandeRef: string
  type: TypeSoin
  nom: string // ex: "Vaccin Newcastle", "Vitamines", "Contrôle vétérinaire"
  date: string
  rappelPrevu?: string // date du prochain rappel si applicable
  notes?: string
  creePar: string
  modifieLe?: string
  supprimeLe?: string
  syncStatus: StatutSync
}

export type CategorieBetail = 'chevre' | 'mouton' | 'boeuf' | 'autre'
export type SourceAcquisitionBetail = 'achat' | 'naissance'

export interface LotBetail {
  id: string
  reference: string // ex: BET-2026-003
  categorie: CategorieBetail
  effectifInitial: number
  effectifActuel: number
  dateAcquisition: string
  sourceAcquisition: SourceAcquisitionBetail
  statut: 'en_elevage' | 'ecoulee'
  notes?: string
  creePar: string
  creeLe: string
  modifieLe: string
  supprimeLe?: string
  syncStatus: StatutSync
}

export interface MortaliteBetail {
  id: string
  lotBetailId: string
  date: string
  quantite: number
  cause?: string
  creePar: string
  modifieLe?: string
  supprimeLe?: string
  syncStatus: StatutSync
}

export interface SoinSanteBetail {
  id: string
  lotBetailId: string
  lotBetailRef: string
  type: TypeSoin
  nom: string
  date: string
  rappelPrevu?: string
  notes?: string
  creePar: string
  modifieLe?: string
  supprimeLe?: string
  syncStatus: StatutSync
}

export interface StatDashboard {
  tauxEclosionMoyen: number
  tauxMortaliteMoyen: number
  lotsEnCours: number
  poussinsDisponibles: number
  chiffreAffairesMois: number
  depensesMois: number
  alertes: Alerte[]
}

export interface Alerte {
  id: string
  type: 'stock_bas' | 'eclosion_proche' | 'paiement_attente'
  message: string
  severite: 'info' | 'attention' | 'critique'
}

export interface JournalEntry {
  id: string
  utilisateurNom: string
  action: string
  cible: string
  horodatage: string
  modifieLe?: string
  supprimeLe?: string
  syncStatus: StatutSync
}
