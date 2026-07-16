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
    // 1. Télécharger les données depuis Supabase
    for (const [localTable, supabaseTable] of Object.entries(TABLE_MAPPING)) {
      try {
        const { data, error } = await supabase
          .from(supabaseTable)
          .select('*')
          .order('cree_le', { ascending: false })

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
                if (new Date(record.modifieLe) > new Date(existing.modifieLe)) {
                  await table.update(record.id, { ...record, syncStatus: 'synchronise' })
                  result.downloaded++
                }
              } else {
                // Insérer si n'existe pas
                await table.add({ ...record, syncStatus: 'synchronise' })
                result.downloaded++
              }
            }
          }
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

// Marquer un enregistrement comme à synchroniser
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
