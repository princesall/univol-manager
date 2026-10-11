import type { Role } from '@/types'

/**
 * Modèle de rôles UniVol.
 *
 * Ce fichier est volontairement SANS DÉPENDANCE (il n'importe que le type
 * `Role`). Il est utilisé à la fois par l'interface (menu, pages visibles)
 * et par la couche de synchronisation, qui doit filtrer les tables selon le
 * rôle de l'utilisateur connecté.
 *
 * Le mettre ici évite un import circulaire entre le magasin d'authentification
 * et la synchronisation.
 */

export const ROLE_LABELS: Record<Role, string> = {
  admin: 'Administrateur',
  commercial: 'Gestionnaire Commercial',
  technique: 'Gestionnaire Technique',
  observateur: 'Observateur',
}

/**
 * Modules accessibles à chaque rôle.
 *
 * Cette liste fait AUTORITÉ pour la lecture ET pour l'écriture : côté
 * serveur, les permissions `read`, `create`, `update` et `delete` d'un
 * module accordent exactement les mêmes rôles. La synchronisation s'appuie
 * donc dessus pour savoir quoi envoyer et quoi recevoir.
 */
export const ROLE_MODULE_ACCESS: Record<Role, readonly string[]> = {
  admin: [
    'dashboard',
    'couvoir',
    'poulailler',
    'betail',
    'achats',
    'depenses',
    'ventes',
    'stocks',
    'clients',
    'fournisseurs',
    'rapports',
    'journal',
  ],
  commercial: ['dashboard', 'achats', 'depenses', 'ventes', 'stocks', 'clients', 'fournisseurs'],
  technique: ['dashboard', 'couvoir', 'poulailler', 'betail', 'stocks'],
  observateur: ['dashboard', 'rapports'],
}

/**
 * Module serveur associé à chaque table synchronisée.
 *
 * POURQUOI C'EST INDISPENSABLE
 *   La synchronisation envoyait et recevait TOUTES les tables quel que soit
 *   le rôle. Un technicien tentait donc de synchroniser les clients ou les
 *   ventes, auxquels son rôle n'a pas accès : le serveur répondait 403, et
 *   son poste accumulait des erreurs sans fin.
 */
export const MODULE_PAR_TABLE: Record<string, string> = {
  lotsIncubation: 'couvoir',
  bandesVolaille: 'poulailler',
  mortalites: 'poulailler',
  soinsSante: 'poulailler',
  lotsBetail: 'betail',
  mortalitesBetail: 'betail',
  soinsSanteBetail: 'betail',
  achats: 'achats',
  depenses: 'depenses',
  ventes: 'ventes',
  clients: 'clients',
  fournisseurs: 'fournisseurs',
  stockItems: 'stocks',
  stockMouvements: 'stocks',
  journal: 'journal',
}

/** Rôles connus, pour valider une valeur lue depuis le stockage. */
export const ROLES_CONNUES: readonly Role[] = ['admin', 'commercial', 'technique', 'observateur']

export function estRoleConnu(valeur: unknown): valeur is Role {
  return typeof valeur === 'string' && (ROLES_CONNUES as readonly string[]).includes(valeur)
}

export type { Role }
