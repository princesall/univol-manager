import { db } from './db'
import { getSupabaseClient } from './supabase'
import type { StatutSync } from '@/types'

// Mapping des noms de tables IndexedDB vers Supabase
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

// Colonne d'ordre pour le tri dans Supabase (toutes les tables n'ont pas cree_le)
const TABLE_ORDER_COLUMN: Record<string, string> = {
  lotsIncubation: 'cree_le',
  journal: 'horodatage',
  bandesVolaille: 'cree_le',
  mortalites: 'date',
  ventes: 'cree_le',
  depenses: 'cree_le',
  achats: 'cree_le',
  fournisseurs: 'cree_le',
  clients: 'cree_le',
  stockItems: 'cree_le',
  stockMouvements: 'date',
  soinsSante: 'date',
  lotsBetail: 'cree_le',
  mortalitesBetail: 'date',
  soinsSanteBetail: 'date',
}

// Convertir les noms de propriétés camelCase en snake_case pour Supabase
function camelToSnake(obj: any): any {
  if (obj === null || typeof obj !== 'object') return obj
  
  if (Array.isArray(obj)) {
    return obj.map(camelToSnake)
  }
  
  const result: any = {}
  for (const key in obj) {
    const snakeKey = key.replace(/([A-Z])/g, '_$1').toLowerCase()
    result[snakeKey] = camelToSnake(obj[key])
  }
  return result
}

// Convertir les noms de propriétés snake_case en camelCase pour IndexedDB
function snakeToCamel(obj: any): any {
  if (obj === null || typeof obj !== 'object') return obj
  
  if (Array.isArray(obj)) {
    return obj.map(snakeToCamel)
  }
  
  const result: any = {}
  for (const key in obj) {
    const camelKey = key.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase())
    result[camelKey] = snakeToCamel(obj[key])
  }
  return result
}

// Obtenir la dernière heure de synchronisation pour une table
function getLastSyncTime(tableName: string): string | null {
  const key = `sync_time_${tableName}`
  const stored = localStorage.getItem(key)
  return stored ? new Date(stored).toISOString() : null
}

// Sauvegarder la dernière heure de synchronisation
function setLastSyncTime(tableName: string, time: string): void {
  const key = `sync_time_${tableName}`
  localStorage.setItem(key, new Date(time).toISOString())
}

export interface SyncResult {
  success: boolean
  uploaded: number
  downloaded: number
  errors: string[]
}

export async function synchronize(): Promise<SyncResult> {
  const supabase = getSupabaseClient()
  if (!supabase) {
    return {
      success: false,
      uploaded: 0,
      downloaded: 0,
      errors: ['Client Supabase non configuré'],
    }
  }

  const result: SyncResult = {
    success: true,
    uploaded: 0,
    downloaded: 0,
    errors: [],
  }

  try {
    // 1. Télécharger les données depuis Supabase (SYNC INCRÉMENTALE)
    for (const [localTable, supabaseTable] of Object.entries(TABLE_MAPPING)) {
      try {
        const orderColumn = TABLE_ORDER_COLUMN[localTable] || 'cree_le'
        const lastSyncTime = getLastSyncTime(supabaseTable)

        // Construire la requête avec filtre incrémental
        let query = supabase
          .from(supabaseTable)
          .select('*')
          .is('supprime_le', null) // ✅ CORRECTION #3: Ignorer les enregistrements soft-deleted
        
        // ✅ CORRECTION #4: Sync incrémentale - seulement depuis la dernière sync
        if (lastSyncTime) {
          query = query.gt('modifie_le', lastSyncTime)
        }

        const { data, error } = await query.order(orderColumn, { ascending: false })

        if (error) {
          result.errors.push(`Erreur téléchargement ${supabaseTable}: ${error.message}`)
          continue
        }

        if (data && data.length > 0) {
          const camelCaseData = snakeToCamel(data)
          
          // Mettre à jour IndexedDB avec les données de Supabase
          const table = (db as any)[localTable]
          if (table) {
            for (const record of camelCaseData) {
              const existing = await table.get(record.id)
              if (existing) {
                // Mettre à jour si la version cloud est plus récente
                if (record.modifieLe && existing.modifieLe && new Date(record.modifieLe) > new Date(existing.modifieLe)) {
                  await table.update(record.id, { ...record, syncStatus: 'synchronise' })
                  result.downloaded++
                }
              } else {
                // Insérer si n'existe pas (et n'est pas supprimé)
                if (!record.supprimeLe) {
                  await table.add({ ...record, syncStatus: 'synchronise' })
                  result.downloaded++
                }
              }
            }
          }

          // Mettre à jour lastSyncTime
          setLastSyncTime(supabaseTable, new Date().toISOString())
        }
      } catch (error) {
        result.errors.push(`Erreur traitement ${localTable}: ${error instanceof Error ? error.message : String(error)}`)
      }
    }

    // 2. Télécharger les données locales non synchronisées vers Supabase
    for (const [localTable, supabaseTable] of Object.entries(TABLE_MAPPING)) {
      try {
        const table = (db as any)[localTable]
        if (!table) continue

        const localRecords = await table.where('syncStatus').equals('en_attente').toArray()
        
        for (const record of localRecords) {
          const snakeCaseRecord = camelToSnake(record)
          
          // ✅ CORRECTION #3: Si supprimeLe n'est pas null, faire un vrai DELETE sur Supabase
          if (record.supprimeLe) {
            // Soft delete côté serveur
            const { error: deleteError } = await supabase
              .from(supabaseTable)
              .delete()
              .eq('id', record.id)

            if (deleteError) {
              result.errors.push(`Erreur suppression ${localTable} (${record.id}): ${deleteError.message}`)
            } else {
              // Supprimer aussi du cache local
              await table.delete(record.id)
              result.uploaded++
            }
          } else {
            // Upsert normal pour créer/modifier
            const { error } = await supabase
              .from(supabaseTable)
              .upsert(snakeCaseRecord, { onConflict: 'id' })

            if (error) {
              result.errors.push(`Erreur upload ${localTable} (${record.id}): ${error.message}`)
            } else {
              // Marquer comme synchronisé
              await table.update(record.id, { syncStatus: 'synchronise' })
              result.uploaded++
            }
          }
        }
      } catch (error) {
        result.errors.push(`Erreur upload ${localTable}: ${error instanceof Error ? error.message : String(error)}`)
      }
    }

    if (result.errors.length > 0) {
      result.success = false
    }

    return result
  } catch (error) {
    return {
      success: false,
      uploaded: result.uploaded,
      downloaded: result.downloaded,
      errors: [`Erreur générale de synchronisation: ${error instanceof Error ? error.message : String(error)}`],
    }
  }
}

// Marquer un enregistrement comme à synchroniser (soft delete)
export async function markForSync(table: string, id: string): Promise<void> {
  try {
    const dbTable = (db as any)[table]
    if (dbTable) {
      await dbTable.update(id, { syncStatus: 'en_attente' })
    }
  } catch (error) {
    console.error(`Erreur marquage sync ${table}:${id}:`, error)
  }
}

// ✅ NOUVEAU: Marquer un enregistrement comme supprimé (soft delete)
// Stratégie: Marquer le record avec supprime_le et syncStatus='en_attente'
// La prochaine synchronisation détectera ce record et fera un DELETE sur Supabase
// 
// NOTE: L'enregistrement reste VISIBLE localement jusqu'au prochain sync/refresh
// C'est un compromis UX/architecture - en production, adapter toutes les queries 
// pour filtrer WHERE supprime_le IS NULL pour une meilleure UX immédiate
export async function markForDelete(table: string, id: string): Promise<void> {
  try {
    const dbTable = (db as any)[table]
    if (dbTable) {
      await dbTable.update(id, { 
        supprimeLe: new Date().toISOString(),
        syncStatus: 'en_attente'
      })
    }
  } catch (error) {
    console.error(`Erreur marquage suppression ${table}:${id}:`, error)
  }
}

// Synchronisation automatique périodique
let syncInterval: NodeJS.Timeout | null = null

export function startAutoSync(intervalMs: number = 60000) {
  if (syncInterval) {
    clearInterval(syncInterval)
  }
  
  syncInterval = setInterval(async () => {
    console.log('Synchronisation automatique en cours...')
    const result = await synchronize()
    console.log('Résultat synchronisation:', result)
  }, intervalMs)
}

export function stopAutoSync() {
  if (syncInterval) {
    clearInterval(syncInterval)
    syncInterval = null
  }
}

// Synchronisation manuelle avec retour de résultat
export async function manualSync(): Promise<SyncResult> {
  return await synchronize()
}
