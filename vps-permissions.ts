import type { FastifyRequest } from 'fastify';

export type UserRole =
  | 'admin'
  | 'commercial'
  | 'technique'
  | 'observateur';

export type PermissionAction =
  | 'read'
  | 'create'
  | 'update'
  | 'delete'
  | 'export';

// =====================================================================
// MODÈLE DES RÔLES
//
// Principe : « ce que tu peux voir, tu peux le gérer ».
//
// C'est le modèle de l'application de bureau, où le rôle détermine les
// modules accessibles. Un commercial qui a accès aux clients peut donc
// créer, modifier ET supprimer un client.
//
// POURQUOI CE PRINCIPE
//   Une version précédente accordait `create` et `update` aux rôles
//   concernés mais réservait `delete` à l'administrateur. Conséquence : un
//   commercial qui corrigeait une vente saisie par erreur ne pouvait
//   JAMAIS la supprimer, ni sur son poste ni sur le serveur. Le poste
//   réessayait indéfiniment et la donnée restait sur le serveur.
//
// POURQUOI UNE LISTE UNIQUE
//   Les trois actions d'écriture sont désormais dérivées d'une seule
//   liste par module. Elles ne peuvent donc plus diverger : c'est ce qui
//   avait créé le défaut.
//
// SEUL L'OBSERVATEUR EST EN LECTURE SEULE, ce qui est sa raison d'être.
// =====================================================================

/** Rôles qui lisent ET gèrent (créent, modifient, suppriment) un module. */
const GERANTS: Record<string, readonly UserRole[]> = {
  couvoir: ['admin', 'technique'],
  poulailler: ['admin', 'technique'],
  betail: ['admin', 'technique'],
  achats: ['admin', 'commercial'],
  depenses: ['admin', 'commercial'],
  ventes: ['admin', 'commercial'],
  stocks: ['admin', 'commercial', 'technique'],
  clients: ['admin', 'commercial'],
  fournisseurs: ['admin', 'commercial'],
};

const TOUS_LES_ROLES: readonly UserRole[] = [
  'admin',
  'commercial',
  'technique',
  'observateur',
];

const PERMISSIONS: Record<
  string,
  Partial<Record<PermissionAction, readonly UserRole[]>>
> = {};

// Chaque module « gérable » reçoit les mêmes rôles pour les trois actions
// d'écriture : impossible que create et delete divergent à nouveau.
for (const [module, roles] of Object.entries(GERANTS)) {
  PERMISSIONS[module] = {
    read: roles,
    create: roles,
    update: roles,
    delete: roles,
  };
}

// Modules en lecture seule ------------------------------------------------

PERMISSIONS.dashboard = {
  read: TOUS_LES_ROLES,
};

PERMISSIONS.rapports = {
  read: ['admin', 'observateur'],
  export: ['admin', 'observateur'],
};

// Le journal d'activité est un registre d'AUDIT.
//
//   - L'application y écrit quel que soit le rôle de l'utilisateur connecté
//     (43 appels dans le code tracent chaque action) : `create` est donc
//     ouvert à tous les rôles.
//   - Personne ne le consulte sauf l'administrateur : `read` reste réservé.
//   - Rien dans l'application ne modifie ni ne supprime une entrée de
//     journal (vérifié dans le code) : ces deux actions sont donc réservées
//     à l'administrateur, pour qu'un registre d'audit reste fiable.
PERMISSIONS.journal = {
  read: ['admin'],
  create: TOUS_LES_ROLES,
  update: ['admin'],
  delete: ['admin'],
};

export { PERMISSIONS };

export function requirePermission(
  module: string,
  action: PermissionAction,
) {
  return async (request: FastifyRequest): Promise<void> => {
    await request.jwtVerify();

    const role = request.user.role as UserRole;

    const allowedRoles = PERMISSIONS[module]?.[action] ?? [];

    if (!allowedRoles.includes(role)) {
      const error = new Error(
        `Permission refusée : ${module}.${action}`,
      );

      (
        error as Error & {
          statusCode?: number;
        }
      ).statusCode = 403;

      throw error;
    }
  };
}
