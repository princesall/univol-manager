import { db } from './db'

/**
 * Sauvegarde et restauration des données locales (Dexie / IndexedDB).
 *
 * CONTEXTE CRITIQUE — 10 octobre 2026
 * Le projet Supabase utilisé par l'application ne résout plus en DNS
 * (`ERR_NAME_NOT_RESOLVED`), vérifié depuis deux réseaux indépendants.
 * La synchronisation échoue donc à chaque cycle, et les données Dexie de
 * chaque poste sont la SEULE copie existante des données métier.
 *
 * Cette fonction doit être exécutée sur CHAQUE installation avant toute
 * autre opération, et le fichier produit doit être mis à l'abri (clé USB,
 * disque externe, cloud) — pas seulement laissé dans « Téléchargements ».
 */

export const VERSION_SAUVEGARDE = 1

export interface SauvegardeLocale {
  version: number
  application: string
  exporteLe: string
  origine: string
  compteurs: Record<string, number>
  total: number
  /** Curseurs de synchronisation stockés par l'application (localStorage). */
  curseursSync: Record<string, string | null>
  tables: Record<string, unknown[]>
}

export interface ResultatExport {
  fichier: string
  total: number
  compteurs: Record<string, number>
}

function lireCurseursSync(): Record<string, string | null> {
  const curseurs: Record<string, string | null> = {}
  for (let i = 0; i < localStorage.length; i++) {
    const cle = localStorage.key(i)
    if (cle && cle.startsWith('sync_time_')) {
      curseurs[cle] = localStorage.getItem(cle)
    }
  }
  return curseurs
}

/** Rassemble toutes les tables Dexie en un objet sérialisable. */
export async function construireSauvegarde(): Promise<SauvegardeLocale> {
  const tables: Record<string, unknown[]> = {}
  const compteurs: Record<string, number> = {}

  for (const table of db.tables) {
    const lignes = await table.toArray()
    tables[table.name] = lignes
    compteurs[table.name] = lignes.length
  }

  const total = Object.values(compteurs).reduce((somme, n) => somme + n, 0)

  return {
    version: VERSION_SAUVEGARDE,
    application: 'univol-manager',
    exporteLe: new Date().toISOString(),
    origine: typeof window !== 'undefined' ? window.location.href : 'inconnu',
    compteurs,
    total,
    curseursSync: lireCurseursSync(),
    tables,
  }
}

/**
 * Exporte toutes les données locales dans un fichier JSON téléchargé.
 * Les compteurs par table sont affichés dans la console pour vérification.
 */
export async function exporterDonneesLocales(): Promise<ResultatExport> {
  const sauvegarde = await construireSauvegarde()

  console.table(
    Object.entries(sauvegarde.compteurs).map(([table, enregistrements]) => ({
      table,
      enregistrements,
    })),
  )
  console.log(
    `TOTAL : ${sauvegarde.total} enregistrements — exporté le ${sauvegarde.exporteLe}`,
  )

  const nomFichier = `univol-sauvegarde-${new Date().toISOString().slice(0, 10)}.json`
  const blob = new Blob([JSON.stringify(sauvegarde, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const lien = document.createElement('a')
  lien.href = url
  lien.download = nomFichier
  document.body.appendChild(lien)
  lien.click()
  document.body.removeChild(lien)
  setTimeout(() => URL.revokeObjectURL(url), 10_000)

  return { fichier: nomFichier, total: sauvegarde.total, compteurs: sauvegarde.compteurs }
}

/** Réécrit les enregistrements d'une sauvegarde dans Dexie (upsert par identifiant). */
export async function restaurerSauvegarde(fichier: File): Promise<ResultatExport> {
  const sauvegarde = JSON.parse(await fichier.text()) as SauvegardeLocale

  if (!sauvegarde?.tables || typeof sauvegarde.tables !== 'object') {
    throw new Error('Fichier de sauvegarde invalide : aucune table trouvée.')
  }

  const compteurs: Record<string, number> = {}

  for (const [nomTable, lignes] of Object.entries(sauvegarde.tables)) {
    if (!Array.isArray(lignes)) continue

    let table
    try {
      table = db.table(nomTable)
    } catch {
      console.warn(`Table inconnue ignorée : ${nomTable}`)
      continue
    }

    await table.bulkPut(lignes as never[])
    compteurs[nomTable] = lignes.length
  }

  return {
    fichier: fichier.name,
    total: Object.values(compteurs).reduce((somme, n) => somme + n, 0),
    compteurs,
  }
}

/** Ouvre un sélecteur de fichier, confirme, puis restaure la sauvegarde choisie. */
export async function choisirEtRestaurer(): Promise<ResultatExport | null> {
  const input = document.createElement('input')
  input.type = 'file'
  input.accept = 'application/json,.json'

  const fichier = await new Promise<File | null>((resolve) => {
    input.onchange = () => resolve(input.files?.[0] ?? null)
    input.click()
  })

  if (!fichier) return null
  if (!window.confirm(
    `Restaurer « ${fichier.name} » ?\n\n` +
      'Les enregistrements portant le même identifiant seront écrasés par le contenu de la sauvegarde.',
  )) {
    return null
  }

  return restaurerSauvegarde(fichier)
}

declare global {
  interface Window {
    /** Export immédiat des données locales : `await univolExport()` */
    univolExport?: () => Promise<ResultatExport>
    /** Restauration depuis un fichier : `await univolImport()` */
    univolImport?: () => Promise<ResultatExport | null>
  }
}

// Exposé sur `window` pour permettre la sauvegarde immédiate depuis la
// console, sans attendre l'ajout d'un bouton dans l'interface.
if (typeof window !== 'undefined') {
  window.univolExport = exporterDonneesLocales
  window.univolImport = choisirEtRestaurer
}
