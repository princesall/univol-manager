import { db, genId } from '@/lib/db'
import type { LotIncubation } from '@/types'
import { addDays, subDays } from 'date-fns'

export async function ensureSeeded() {
  // Désactivation des données de démo - l'application démarrera avec une base de données vide
  // Les données de démo peuvent être réactivées en décommentant le code ci-dessous si nécessaire
  return

  /* 
  const count = await db.lotsIncubation.count()
  if (count > 0) return

  const now = new Date()

  const lots: LotIncubation[] = [
    {
      id: genId('lot'),
      reference: 'LOT-2026-014',
      quantiteCommandee: 5100,
      dateMiseEnCouveuse: subDays(now, 18).toISOString(),
      dateEclosionPrevue: addDays(subDays(now, 18), 21).toISOString(),
      quantiteOeufs: 5000,
      fournisseurNom: 'Ferme Diarra',
      couveuse: 'Couveuse A — 5000',
      statut: 'en_cours',
      dateMirage1: subDays(now, 11).toISOString(),
      quantiteApresMirage1: 4830,
      dateMirage2: subDays(now, 4).toISOString(),
      quantiteApresMirage2: 4750,
      creePar: 'Aïcha Traoré',
      creeLe: subDays(now, 18).toISOString(),
      modifieLe: subDays(now, 2).toISOString(),
      syncStatus: 'synchronise',
    },
    {
      id: genId('lot'),
      reference: 'LOT-2026-015',
      dateMiseEnCouveuse: subDays(now, 6).toISOString(),
      dateEclosionPrevue: addDays(subDays(now, 6), 21).toISOString(),
      quantiteOeufs: 2000,
      fournisseurNom: 'Aviculture Sanogo',
      couveuse: 'Couveuse B — 2000',
      statut: 'en_cours',
      creePar: 'Aïcha Traoré',
      creeLe: subDays(now, 6).toISOString(),
      modifieLe: subDays(now, 1).toISOString(),
      syncStatus: 'synchronise',
    },
    {
      id: genId('lot'),
      reference: 'LOT-2026-011',
      dateMiseEnCouveuse: subDays(now, 25).toISOString(),
      dateEclosionPrevue: subDays(now, 4).toISOString(),
      quantiteOeufs: 5000,
      fournisseurNom: 'Ferme Diarra',
      couveuse: 'Couveuse A — 5000',
      statut: 'eclos',
      poussinsEclos: 4680,
      oeufsInfeconds: 210,
      mortaliteEmbryonnaire: 110,
      dateEclosionReelle: subDays(now, 4).toISOString(),
      creePar: 'Oumar Konaté',
      creeLe: subDays(now, 25).toISOString(),
      modifieLe: subDays(now, 4).toISOString(),
      syncStatus: 'synchronise',
    },
    {
      id: genId('lot'),
      reference: 'LOT-2026-010',
      dateMiseEnCouveuse: subDays(now, 32).toISOString(),
      dateEclosionPrevue: subDays(now, 11).toISOString(),
      quantiteOeufs: 3200,
      fournisseurNom: 'Coopérative Kayes',
      couveuse: 'Couveuse B — 2000',
      statut: 'eclos',
      poussinsEclos: 2890,
      oeufsInfeconds: 180,
      mortaliteEmbryonnaire: 130,
      dateEclosionReelle: subDays(now, 11).toISOString(),
      creePar: 'Oumar Konaté',
      creeLe: subDays(now, 32).toISOString(),
      modifieLe: subDays(now, 11).toISOString(),
      syncStatus: 'synchronise',
    },
  ]

  await db.lotsIncubation.bulkAdd(lots)

  const lotEclos1 = lots[2]
  const lotEclos2 = lots[3]

  const bnd011 = genId('bnd')
  const bnd010 = genId('bnd')

  await db.bandesVolaille.bulkAdd([
    {
      id: bnd011,
      reference: 'BND-2026-011',
      lotIncubationId: lotEclos1.id,
      lotIncubationRef: lotEclos1.reference,
      dateDebut: lotEclos1.dateEclosionReelle!,
      effectifInitial: lotEclos1.poussinsEclos!,
      effectifActuel: 4512,
      statut: 'en_elevage',
      creePar: 'Oumar Konaté',
      creeLe: lotEclos1.dateEclosionReelle!,
      modifieLe: subDays(now, 1).toISOString(),
      syncStatus: 'synchronise',
    },
    {
      id: bnd010,
      reference: 'BND-2026-010',
      lotIncubationId: lotEclos2.id,
      lotIncubationRef: lotEclos2.reference,
      dateDebut: lotEclos2.dateEclosionReelle!,
      effectifInitial: lotEclos2.poussinsEclos!,
      effectifActuel: 2750,
      statut: 'en_elevage',
      creePar: 'Oumar Konaté',
      creeLe: lotEclos2.dateEclosionReelle!,
      modifieLe: subDays(now, 3).toISOString(),
      syncStatus: 'synchronise',
    },
  ])

  await db.soinsSante.bulkAdd([
    {
      id: genId('soin'),
      bandeId: bnd011,
      bandeRef: 'BND-2026-011',
      type: 'vaccination',
      nom: 'Vaccin Newcastle',
      date: subDays(now, 3).toISOString(),
      rappelPrevu: addDays(now, 18).toISOString(),
      creePar: 'Oumar Konaté',
      syncStatus: 'synchronise',
    },
    {
      id: genId('soin'),
      bandeId: bnd010,
      bandeRef: 'BND-2026-010',
      type: 'traitement',
      nom: 'Vitamines — stress post-transport',
      date: subDays(now, 8).toISOString(),
      notes: 'Ajout dans l\u2019eau de boisson pendant 3 jours',
      creePar: 'Oumar Konaté',
      syncStatus: 'synchronise',
    },
  ])

  await db.journal.bulkAdd([
    {
      id: genId('log'),
      utilisateurNom: 'Aïcha Traoré',
      action: 'Création du lot',
      cible: 'LOT-2026-015',
      horodatage: subDays(now, 6).toISOString(),
    },
    {
      id: genId('log'),
      utilisateurNom: 'Oumar Konaté',
      action: "Enregistrement de l'éclosion",
      cible: 'LOT-2026-011',
      horodatage: subDays(now, 4).toISOString(),
    },
  ])

  await db.ventes.bulkAdd([
    {
      id: genId('vte'),
      reference: 'VTE-100482',
      clientNom: 'Boubacar Sidibé',
      type: 'poulet',
      quantite: 500,
      prixUnitaire: 1500,
      montantTotal: 750000,
      montantPaye: 750000,
      statutPaiement: 'paye',
      dateVente: subDays(now, 3).toISOString(),
      creePar: 'Aïcha Traoré',
      creeLe: subDays(now, 3).toISOString(),
      modifieLe: subDays(now, 3).toISOString(),
      syncStatus: 'synchronise',
    },
    {
      id: genId('vte'),
      reference: 'VTE-100479',
      clientNom: 'Ferme Coulibaly & Fils',
      type: 'poussin',
      quantite: 1200,
      prixUnitaire: 650,
      montantTotal: 780000,
      montantPaye: 400000,
      statutPaiement: 'partiel',
      dateVente: subDays(now, 9).toISOString(),
      creePar: 'Aïcha Traoré',
      creeLe: subDays(now, 9).toISOString(),
      modifieLe: subDays(now, 9).toISOString(),
      syncStatus: 'synchronise',
    },
    {
      id: genId('vte'),
      reference: 'VTE-100471',
      clientNom: 'Mariam Keïta',
      type: 'poulet',
      quantite: 150,
      prixUnitaire: 1450,
      montantTotal: 217500,
      montantPaye: 0,
      statutPaiement: 'attente',
      dateVente: subDays(now, 15).toISOString(),
      creePar: 'Aïcha Traoré',
      creeLe: subDays(now, 15).toISOString(),
      modifieLe: subDays(now, 15).toISOString(),
      syncStatus: 'synchronise',
    },
  ])

  await db.depenses.bulkAdd([
    {
      id: genId('dep'),
      reference: 'DEP-100221',
      categorie: 'alimentation',
      montant: 320000,
      date: subDays(now, 4).toISOString(),
      description: "Achat d'aliments pour poulailler",
      creePar: 'Aïcha Traoré',
      creeLe: subDays(now, 4).toISOString(),
      modifieLe: subDays(now, 4).toISOString(),
      syncStatus: 'synchronise',
    },
    {
      id: genId('dep'),
      reference: 'DEP-100219',
      categorie: 'electricite',
      montant: 85000,
      date: subDays(now, 7).toISOString(),
      description: "Facture d'électricité — couveuses",
      creePar: 'Aïcha Traoré',
      creeLe: subDays(now, 7).toISOString(),
      modifieLe: subDays(now, 7).toISOString(),
      syncStatus: 'synchronise',
    },
    {
      id: genId('dep'),
      reference: 'DEP-100210',
      categorie: 'salaires',
      montant: 450000,
      date: subDays(now, 12).toISOString(),
      description: 'Salaires du personnel — quinzaine',
      creePar: 'Aïcha Traoré',
      creeLe: subDays(now, 12).toISOString(),
      modifieLe: subDays(now, 12).toISOString(),
      syncStatus: 'synchronise',
    },
    {
      id: genId('dep'),
      reference: 'DEP-100205',
      categorie: 'transport',
      montant: 60000,
      date: subDays(now, 14).toISOString(),
      description: 'Transport des œufs — Kayes',
      creePar: 'Aïcha Traoré',
      creeLe: subDays(now, 14).toISOString(),
      modifieLe: subDays(now, 14).toISOString(),
      syncStatus: 'synchronise',
    },
  ])

  await db.fournisseurs.bulkAdd([
    {
      id: genId('frn'),
      nom: 'Ferme Diarra',
      telephone: '+223 76 12 34 56',
      adresse: 'Kati, Mali',
      creeLe: subDays(now, 40).toISOString(),
      syncStatus: 'synchronise',
    },
    {
      id: genId('frn'),
      nom: 'Aviculture Sanogo',
      telephone: '+223 65 22 11 09',
      adresse: 'Bamako, Mali',
      creeLe: subDays(now, 30).toISOString(),
      syncStatus: 'synchronise',
    },
  ])

  await db.clients.bulkAdd([
    {
      id: genId('cli'),
      nom: 'Boubacar Sidibé',
      telephone: '+223 70 44 55 66',
      adresse: 'Sikasso, Mali',
      creeLe: subDays(now, 20).toISOString(),
      syncStatus: 'synchronise',
    },
    {
      id: genId('cli'),
      nom: 'Ferme Coulibaly & Fils',
      telephone: '+223 78 33 22 11',
      adresse: 'Ségou, Mali',
      creeLe: subDays(now, 25).toISOString(),
      syncStatus: 'synchronise',
    },
    {
      id: genId('cli'),
      nom: 'Mariam Keïta',
      telephone: '+223 66 99 88 77',
      creeLe: subDays(now, 16).toISOString(),
      syncStatus: 'synchronise',
    },
  ])

  await db.achats.bulkAdd([
    {
      id: genId('ach'),
      reference: 'ACH-100301',
      fournisseurNom: 'Ferme Diarra',
      categorie: 'oeufs',
      description: '5000 œufs fécondés',
      montant: 875000,
      montantPaye: 875000,
      statutPaiement: 'paye',
      date: subDays(now, 18).toISOString(),
      creePar: 'Aïcha Traoré',
      creeLe: subDays(now, 18).toISOString(),
      modifieLe: subDays(now, 18).toISOString(),
      syncStatus: 'synchronise',
    },
    {
      id: genId('ach'),
      reference: 'ACH-100298',
      fournisseurNom: 'Aviculture Sanogo',
      categorie: 'oeufs',
      description: '2000 œufs fécondés',
      montant: 350000,
      montantPaye: 200000,
      statutPaiement: 'partiel',
      date: subDays(now, 6).toISOString(),
      creePar: 'Aïcha Traoré',
      creeLe: subDays(now, 6).toISOString(),
      modifieLe: subDays(now, 6).toISOString(),
      syncStatus: 'synchronise',
    },
  ])

  const stkAlimentDemarrage = genId('stk')
  const stkAlimentCroissance = genId('stk')
  const stkAmpoules = genId('stk')

  await db.stockItems.bulkAdd([
    {
      id: stkAlimentDemarrage,
      nom: 'Aliment démarrage',
      categorie: 'aliment',
      quantite: 8,
      unite: 'sacs',
      seuilAlerte: 10,
      modifieLe: subDays(now, 1).toISOString(),
      syncStatus: 'synchronise',
    },
    {
      id: stkAlimentCroissance,
      nom: 'Aliment croissance',
      categorie: 'aliment',
      quantite: 22,
      unite: 'sacs',
      seuilAlerte: 10,
      modifieLe: subDays(now, 2).toISOString(),
      syncStatus: 'synchronise',
    },
    {
      id: stkAmpoules,
      nom: 'Ampoules chauffantes',
      categorie: 'materiel',
      quantite: 6,
      unite: 'unités',
      seuilAlerte: 5,
      modifieLe: subDays(now, 10).toISOString(),
      syncStatus: 'synchronise',
    },
  ])

  await db.stockMouvements.bulkAdd([
    {
      id: genId('mvt'),
      stockItemId: stkAlimentDemarrage,
      stockItemNom: 'Aliment démarrage',
      type: 'entree',
      quantite: 15,
      source: 'achat',
      motif: 'Achat Ferme Diarra',
      date: subDays(now, 8).toISOString(),
      creePar: 'Aïcha Traoré',
      syncStatus: 'synchronise',
    },
    {
      id: genId('mvt'),
      stockItemId: stkAlimentDemarrage,
      stockItemNom: 'Aliment démarrage',
      type: 'sortie',
      quantite: 7,
      source: 'consommation',
      motif: 'Alimentation bande BND-2026-011',
      date: subDays(now, 1).toISOString(),
      creePar: 'Oumar Konaté',
      syncStatus: 'synchronise',
    },
    {
      id: genId('mvt'),
      stockItemId: stkAlimentCroissance,
      stockItemNom: 'Aliment croissance',
      type: 'entree',
      quantite: 30,
      source: 'achat',
      motif: 'Achat Aviculture Sanogo',
      date: subDays(now, 6).toISOString(),
      creePar: 'Aïcha Traoré',
      syncStatus: 'synchronise',
    },
    {
      id: genId('mvt'),
      stockItemId: stkAlimentCroissance,
      stockItemNom: 'Aliment croissance',
      type: 'sortie',
      quantite: 8,
      source: 'consommation',
      motif: 'Alimentation bande BND-2026-010',
      date: subDays(now, 2).toISOString(),
      creePar: 'Oumar Konaté',
      syncStatus: 'synchronise',
    },
  ])

  const betChevres = genId('bet')
  const betMoutons = genId('bet')
  const betBoeufs = genId('bet')

  await db.lotsBetail.bulkAdd([
    {
      id: betChevres,
      reference: 'BET-260601-A1B2',
      categorie: 'chevre',
      effectifInitial: 12,
      effectifActuel: 11,
      dateAcquisition: subDays(now, 45).toISOString(),
      sourceAcquisition: 'achat',
      statut: 'en_elevage',
      creePar: 'Oumar Konaté',
      creeLe: subDays(now, 45).toISOString(),
      modifieLe: subDays(now, 10).toISOString(),
      syncStatus: 'synchronise',
    },
    {
      id: betMoutons,
      reference: 'BET-260615-C3D4',
      categorie: 'mouton',
      effectifInitial: 8,
      effectifActuel: 8,
      dateAcquisition: subDays(now, 30).toISOString(),
      sourceAcquisition: 'achat',
      statut: 'en_elevage',
      creePar: 'Oumar Konaté',
      creeLe: subDays(now, 30).toISOString(),
      modifieLe: subDays(now, 30).toISOString(),
      syncStatus: 'synchronise',
    },
    {
      id: betBoeufs,
      reference: 'BET-260501-E5F6',
      categorie: 'boeuf',
      effectifInitial: 3,
      effectifActuel: 3,
      dateAcquisition: subDays(now, 70).toISOString(),
      sourceAcquisition: 'achat',
      statut: 'en_elevage',
      notes: 'Race locale, engraissement en cours',
      creePar: 'Oumar Konaté',
      creeLe: subDays(now, 70).toISOString(),
      modifieLe: subDays(now, 70).toISOString(),
      syncStatus: 'synchronise',
    },
  ])

  await db.mortalitesBetail.bulkAdd([
    {
      id: genId('morb'),
      lotBetailId: betChevres,
      date: subDays(now, 10).toISOString(),
      quantite: 1,
      cause: 'Maladie',
      creePar: 'Oumar Konaté',
      syncStatus: 'synchronise',
    },
  ])

  await db.soinsSanteBetail.bulkAdd([
    {
      id: genId('soinb'),
      lotBetailId: betBoeufs,
      lotBetailRef: 'BET-260501-E5F6',
      type: 'vaccination',
      nom: 'Vaccin fièvre aphteuse',
      date: subDays(now, 20).toISOString(),
      rappelPrevu: addDays(now, 160).toISOString(),
      creePar: 'Oumar Konaté',
      syncStatus: 'synchronise',
    },
  ])
  */
}
