import { db } from './db'
import { getSupabaseClient } from './supabase'

/**
 * Mapping IndexedDB (camelCase Dexie) → tables Supabase (snake_case).
 * Toutes les tables métier offline-first sont listées ici.
 */
const TABLE_MAPPING: Record<string, string> = {
  lotsIncubation: 'lots_incubation',
  journal: 'journal',
  bandesVolaille: 'bandes_volaille',
  mortalites: 'mortalites',
  ventes: 'ventes',
  depenses: 'depenses',
  achats: 'achats',
  fournisseurs: 'fournisseurs',
  clients: 'clients',
  stockItems: 'stock_items',
  stockMouvements: 'stock_mouvements',
  soinsSante: 'soins_sante',
  lotsBetail: 'lots_betail',
  mortalitesBetail: 'mortalites_betail',
  soinsSanteBetail: 'soins_sante_betail',
}

/**
 * Whitelist des champs autorisés à l'upload (camelCase app).
 * Évite d'envoyer des propriétés inconnues à PostgREST.
 */
const TABLE_FIELDS: Record<string, readonly string[]> = {
  lotsIncubation: [
    'id', 'reference', 'quantiteCommandee', 'dateMiseEnCouveuse', 'dateEclosionPrevue',
    'quantiteOeufs', 'fournisseurId', 'fournisseurNom', 'couveuse', 'statut',
    'dateMirage1', 'quantiteApresMirage1', 'dateMirage2', 'quantiteApresMirage2',
    'poussinsEclos', 'oeufsInfeconds', 'mortaliteEmbryonnaire', 'dateEclosionReelle',
    'notes', 'creePar', 'creeLe', 'modifieLe', 'supprimeLe',
  ],
  bandesVolaille: [
    'id', 'reference', 'lotIncubationId', 'lotIncubationRef', 'dateDebut',
    'effectifInitial', 'effectifActuel', 'statut', 'notes',
    'creePar', 'creeLe', 'modifieLe', 'supprimeLe',
  ],
  mortalites: [
    'id', 'bandeId', 'date', 'quantite', 'cause', 'creePar', 'modifieLe', 'supprimeLe',
  ],
  ventes: [
    'id', 'reference', 'clientNom', 'clientTelephone', 'bandeId', 'bandeRef',
    'lotBetailId', 'lotBetailRef', 'type', 'quantite', 'prixUnitaire', 'montantTotal',
    'montantPaye', 'statutPaiement', 'dateVente', 'notes',
    'creePar', 'creeLe', 'modifieLe', 'supprimeLe',
  ],
  depenses: [
    'id', 'reference', 'categorie', 'description', 'montant', 'date', 'notes',
    'creePar', 'creeLe', 'modifieLe', 'supprimeLe',
  ],
  achats: [
    'id', 'reference', 'fournisseurNom', 'categorie', 'description', 'quantite',
    'prixUnitaire', 'montant', 'montantPaye', 'statutPaiement', 'date', 'notes',
    'creePar', 'creeLe', 'modifieLe', 'supprimeLe',
  ],
  fournisseurs: [
    'id', 'nom', 'telephone', 'email', 'adresse', 'notes',
    'creeLe', 'modifieLe', 'supprimeLe',
  ],
  clients: [
    'id', 'nom', 'telephone', 'email', 'adresse', 'notes',
    'creeLe', 'modifieLe', 'supprimeLe',
  ],
  stockItems: [
    'id', 'nom', 'categorie', 'quantite', 'unite', 'prixUnitaire', 'seuilAlerte',
    'notes', 'creeLe', 'modifieLe', 'supprimeLe',
  ],
  stockMouvements: [
    'id', 'stockItemId', 'stockItemNom', 'type', 'source', 'quantite', 'motif',
    'date', 'notes', 'creePar', 'modifieLe', 'supprimeLe',
  ],
  soinsSante: [
    'id', 'bandeId', 'bandeRef', 'type', 'nom', 'date', 'rappelPrevu', 'notes',
    'creePar', 'modifieLe', 'supprimeLe',
  ],
  lotsBetail: [
    'id', 'reference', 'categorie', 'effectifInitial', 'effectifActuel',
    'dateAcquisition', 'sourceAcquisition', 'statut', 'notes',
    'creePar', 'creeLe', 'modifieLe', 'supprimeLe',
  ],
  mortalitesBetail: [
    'id', 'lotBetailId', 'date', 'quantite', 'cause', 'creePar', 'modifieLe', 'supprimeLe',
  ],
  soinsSanteBetail: [
    'id', 'lotBetailId', 'lotBetailRef', 'type', 'nom', 'date', 'rappelPrevu', 'notes',
    'creePar', 'modifieLe', 'supprimeLe',
  ],
  journal: [
    'id', 'horodatage', 'utilisateurNom', 'action', 'cible', 'modifieLe', 'supprimeLe',
  ],
}

/** Colonne utilisée pour le tri et le filtre incrémental côté Supabase */
const TABLE_ORDER_COLUMN: Record<string, string> = {
  lotsIncubation: 'modifie_le',
  journal: 'modifie_le',
  bandesVolaille: 'modifie_le',
  mortalites: 'modifie_le',
  ventes: 'modifie_le',
  depenses: 'modifie_le',
  achats: 'modifie_le',
  fournisseurs: 'modifie_le',
  clients: 'modifie_le',
  stockItems: 'modifie_le',
  stockMouvements: 'modifie_le',
  soinsSante: 'modifie_le',
  lotsBetail: 'modifie_le',
  mortalitesBetail: 'modifie_le',
  soinsSanteBetail: 'modifie_le',
}

function camelToSnakeKey(key: string): string {
  return key.replace(/([A-Z])/g, '_$1').toLowerCase()
}

function snakeToCamelKey(key: string): string {
  return key.replace(/_([a-z])/g, (_, letter: string) => letter.toUpperCase())
}

function camelToSnake(obj: unknown): unknown {
  if (obj === null || typeof obj !== 'object') return obj
  if (Array.isArray(obj)) return obj.map(camelToSnake)
  const result: Record<string, unknown> = {}
  for (const [key, value] of Object.entries(obj as Record<string, unknown>)) {
    result[camelToSnakeKey(key)] = camelToSnake(value)
  }
  return result
}

function snakeToCamel(obj: unknown): unknown {
  if (obj === null || typeof obj !== 'object') return obj
  if (Array.isArray(obj)) return obj.map(snakeToCamel)
  const result: Record<string, unknown> = {}
  for (const [key, value] of Object.entries(obj as Record<string, unknown>)) {
    result[snakeToCamelKey(key)] = snakeToCamel(value)
  }
  return result
}

/** Prépare un enregistrement local pour upsert Supabase (whitelist + snake_case). */
function toSupabasePayload(localTable: string, record: Record<string, unknown>): Record<string, unknown> {
  const allowed = TABLE_FIELDS[localTable] ?? Object.keys(record)
  const filtered: Record<string, unknown> = {}
  for (const field of allowed) {
    if (record[field] !== undefined) {
      filtered[field] = record[field]
    }
  }
  const snake = camelToSnake(filtered) as Record<string, unknown>
  snake.sync_status = 'synchronise'
  // Garantir modifie_le pour le filtre incrémental
  if (!snake.modifie_le) {
    snake.modifie_le = new Date().toISOString()
  }
  return snake
}

function getLastSyncTime(tableName: string): string | null {
  const stored = localStorage.getItem(`sync_time_${tableName}`)
  return stored ? new Date(stored).toISOString() : null
}

function setLastSyncTime(tableName: string, time: string): void {
  localStorage.setItem(`sync_time_${tableName}`, new Date(time).toISOString())
}

/** Force un re-téléchargement complet à la prochaine sync (utile après migration). */
export function resetSyncTimestamps(): void {
  for (const supabaseTable of Object.values(TABLE_MAPPING)) {
    localStorage.removeItem(`sync_time_${supabaseTable}`)
  }
}

export interface SyncResult {
  success: boolean
  uploaded: number
  downloaded: number
  errors: string[]
}

function isRemoteNewer(remote: Record<string, unknown>, local: Record<string, unknown>): boolean {
  const remoteMod = remote.modifieLe as string | undefined
  const localMod = local.modifieLe as string | undefined
  if (!remoteMod) return false
  if (!localMod) return true
  return new Date(remoteMod).getTime() > new Date(localMod).getTime()
}

/**
 * Synchronisation bidirectionnelle :
 * 1) Upload des enregistrements locaux `en_attente` (y compris soft-deletes)
 * 2) Download incrémental depuis Supabase
 *
 * L'ordre upload-first évite de réimporter un enregistrement déjà supprimé localement.
 */
export async function synchronize(): Promise<SyncResult> {
  const supabase = getSupabaseClient()
  if (!supabase) {
    return {
      success: false,
      uploaded: 0,
      downloaded: 0,
      errors: ['Client Supabase non configuré. Vérifiez VITE_SUPABASE_URL et VITE_SUPABASE_ANON_KEY.'],
    }
  }

  const result: SyncResult = {
    success: true,
    uploaded: 0,
    downloaded: 0,
    errors: [],
  }

  try {
    // ------------------------------------------------------------------
    // 1. UPLOAD : local → Supabase
    // ------------------------------------------------------------------
    for (const [localTable, supabaseTable] of Object.entries(TABLE_MAPPING)) {
      try {
        const table = (db as any)[localTable]
        if (!table) continue

        const pending = await table.where('syncStatus').equals('en_attente').toArray()

        for (const record of pending as Array<Record<string, unknown> & { id: string; supprimeLe?: string }>) {
          try {
            if (record.supprimeLe) {
              // Soft-delete côté serveur si l'enregistrement existe déjà
              const { data: remoteRow } = await supabase
                .from(supabaseTable)
                .select('id')
                .eq('id', record.id)
                .maybeSingle()

              if (remoteRow) {
                const { error: softError } = await supabase
                  .from(supabaseTable)
                  .update({
                    supprime_le: record.supprimeLe,
                    sync_status: 'synchronise',
                    modifie_le: new Date().toISOString(),
                  })
                  .eq('id', record.id)

                if (softError) {
                  const { error: delError } = await supabase
                    .from(supabaseTable)
                    .delete()
                    .eq('id', record.id)

                  if (delError) {
                    result.errors.push(`Suppression ${localTable} (${record.id}): ${softError.message}`)
                    continue
                  }
                }
              }

              await table.delete(record.id)
              result.uploaded++
            } else {
              const payload = toSupabasePayload(localTable, record)
              // Ne jamais pousser un enregistrement déjà soft-supprimé
              payload.supprime_le = null

              const { error } = await supabase
                .from(supabaseTable)
                .upsert(payload, { onConflict: 'id' })

              if (error) {
                result.errors.push(`Upload ${localTable} (${record.id}): ${error.message}`)
              } else {
                await table.update(record.id, { syncStatus: 'synchronise' })
                result.uploaded++
              }
            }
          } catch (rowError) {
            result.errors.push(
              `Upload ${localTable} (${record.id}): ${rowError instanceof Error ? rowError.message : String(rowError)}`
            )
          }
        }
      } catch (error) {
        result.errors.push(
          `Upload table ${localTable}: ${error instanceof Error ? error.message : String(error)}`
        )
      }
    }

    // ------------------------------------------------------------------
    // 2. DOWNLOAD : Supabase → local
    // ------------------------------------------------------------------
    for (const [localTable, supabaseTable] of Object.entries(TABLE_MAPPING)) {
      try {
        const orderColumn = TABLE_ORDER_COLUMN[localTable] || 'modifie_le'
        const lastSyncTime = getLastSyncTime(supabaseTable)

        let query = supabase
          .from(supabaseTable)
          .select('*')
          .is('supprime_le', null)

        if (lastSyncTime) {
          query = query.gt(orderColumn, lastSyncTime)
        }

        const { data, error } = await query.order(orderColumn, { ascending: false })

        if (error) {
          // Fallback sans filtre incrémental (première install / colonne absente)
          if (lastSyncTime) {
            const fallback = await supabase
              .from(supabaseTable)
              .select('*')
              .is('supprime_le', null)
              .order(orderColumn, { ascending: false })

            if (fallback.error) {
              // Dernier recours : tout télécharger sans filtre soft-delete
              const raw = await supabase.from(supabaseTable).select('*')
              if (raw.error) {
                result.errors.push(`Téléchargement ${supabaseTable}: ${error.message}`)
                continue
              }
              await mergeDownloaded(localTable, raw.data ?? [], result)
              setLastSyncTime(supabaseTable, new Date().toISOString())
              continue
            }
            await mergeDownloaded(localTable, fallback.data ?? [], result)
            setLastSyncTime(supabaseTable, new Date().toISOString())
            continue
          }

          result.errors.push(`Téléchargement ${supabaseTable}: ${error.message}`)
          continue
        }

        await mergeDownloaded(localTable, data ?? [], result)
        setLastSyncTime(supabaseTable, new Date().toISOString())
      } catch (error) {
        result.errors.push(
          `Téléchargement ${localTable}: ${error instanceof Error ? error.message : String(error)}`
        )
      }
    }

    // Propager aussi les soft-deletes distants (enregistrements marqués supprime_le récemment)
    await pullRemoteDeletes(result)

    if (result.errors.length > 0) {
      result.success = false
    }

    return result
  } catch (error) {
    return {
      success: false,
      uploaded: result.uploaded,
      downloaded: result.downloaded,
      errors: [
        `Erreur générale de synchronisation: ${error instanceof Error ? error.message : String(error)}`,
      ],
    }
  }
}

async function mergeDownloaded(
  localTable: string,
  rows: unknown[],
  result: SyncResult
): Promise<void> {
  if (!rows.length) return

  const table = (db as any)[localTable]
  if (!table) return

  const camelCaseData = snakeToCamel(rows) as Array<Record<string, unknown> & { id: string; supprimeLe?: string }>

  for (const record of camelCaseData) {
    if (!record?.id) continue
    if (record.supprimeLe) {
      // Ne pas importer les soft-deleted
      const existing = await table.get(record.id)
      if (existing) await table.delete(record.id)
      continue
    }

    const existing = (await table.get(record.id)) as Record<string, unknown> | undefined
    if (existing) {
      // Ne pas écraser des modifications locales non synchronisées plus récentes
      if (existing.syncStatus === 'en_attente' && !isRemoteNewer(record, existing)) {
        continue
      }
      if (isRemoteNewer(record, existing) || existing.syncStatus === 'synchronise') {
        await table.put({ ...record, syncStatus: 'synchronise' })
        result.downloaded++
      }
    } else {
      await table.add({ ...record, syncStatus: 'synchronise' })
      result.downloaded++
    }
  }
}

/**
 * Récupère les suppressions distantes (soft-delete) pour les retirer du cache local.
 */
async function pullRemoteDeletes(result: SyncResult): Promise<void> {
  const supabase = getSupabaseClient()
  if (!supabase) return

  for (const [localTable, supabaseTable] of Object.entries(TABLE_MAPPING)) {
    try {
      const lastSyncTime = getLastSyncTime(supabaseTable)
      let query = supabase
        .from(supabaseTable)
        .select('id, supprime_le')
        .not('supprime_le', 'is', null)

      if (lastSyncTime) {
        query = query.gt('supprime_le', lastSyncTime)
      }

      const { data, error } = await query
      if (error || !data?.length) continue

      const table = (db as any)[localTable]
      if (!table) continue

      for (const row of data) {
        const existing = await table.get(row.id)
        if (existing && existing.syncStatus !== 'en_attente') {
          await table.delete(row.id)
          result.downloaded++
        }
      }
    } catch {
      // Non bloquant
    }
  }
}

/** Marquer un enregistrement comme à synchroniser */
export async function markForSync(table: string, id: string): Promise<void> {
  try {
    const dbTable = (db as any)[table]
    if (dbTable) {
      await dbTable.update(id, {
        syncStatus: 'en_attente',
        modifieLe: new Date().toISOString(),
      })
    }
  } catch (error) {
    console.error(`Erreur marquage sync ${table}:${id}:`, error)
  }
}

/**
 * Soft-delete local : marque `supprimeLe` + `en_attente`.
 * L'UI doit filtrer via `isNotDeleted` (helper db).
 * Au prochain sync, l'enregistrement est soft-supprimé sur Supabase puis retiré du cache local.
 */
export async function markForDelete(table: string, id: string): Promise<void> {
  try {
    const dbTable = (db as any)[table]
    if (!dbTable) return

    const existing = await dbTable.get(id)
    if (!existing) return

    await dbTable.update(id, {
      supprimeLe: new Date().toISOString(),
      modifieLe: new Date().toISOString(),
      syncStatus: 'en_attente',
    })
  } catch (error) {
    console.error(`Erreur marquage suppression ${table}:${id}:`, error)
  }
}

let syncInterval: ReturnType<typeof setInterval> | null = null

export function startAutoSync(intervalMs: number = 60000) {
  if (syncInterval) {
    clearInterval(syncInterval)
  }

  // Première sync immédiate
  void synchronize().then((r) => {
    if (r.errors.length) console.warn('Sync initiale:', r)
    else console.log('Sync initiale OK:', r)
  })

  syncInterval = setInterval(async () => {
    console.log('Synchronisation automatique…')
    const result = await synchronize()
    if (result.errors.length) {
      console.warn('Résultat synchronisation (erreurs):', result)
    } else {
      console.log('Résultat synchronisation:', result)
    }
  }, intervalMs)
}

export function stopAutoSync() {
  if (syncInterval) {
    clearInterval(syncInterval)
    syncInterval = null
  }
}

export async function manualSync(): Promise<SyncResult> {
  return synchronize()
}

export function getMappedTables(): { local: string; remote: string }[] {
  return Object.entries(TABLE_MAPPING).map(([local, remote]) => ({ local, remote }))
}
