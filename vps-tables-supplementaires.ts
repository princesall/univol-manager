import type { FastifyInstance } from 'fastify';
import { db } from '../config/database.js';
import { requirePermission } from '../middlewares/permissions.js';

/**
 * Routes CRUD pour les 8 tables métier qui n'avaient pas encore d'endpoint :
 *   bandes_volaille, mortalites, soins_sante,
 *   lots_betail, mortalites_betail, soins_sante_betail,
 *   journal, stock_mouvements
 *
 * Les colonnes ci-dessous sont relevées sur le schéma RÉEL de la base
 * `univol` (pg_dump -s du 10/10/2026) — et non sur le schéma Supabase
 * d'origine, qui diverge.
 *
 * Choix structurants :
 *  - Suppression LOGIQUE (supprime_le) partout, jamais physique : les clés
 *    étrangères sont en ON DELETE CASCADE, donc un DELETE ferait disparaître
 *    silencieusement les mortalités et soins rattachés.
 *  - Pagination : ?limit= (max 2000) & ?offset=
 *  - Filtre incrémental : ?depuis=<horodatage ISO> sur modifie_le, utilisé
 *    par la synchronisation du client de bureau.
 *  - Pierres tombales : ?inclureSupprimes=1 renvoie aussi les enregistrements
 *    supprimés, ce qui permet à un poste d'apprendre qu'un autre poste a
 *    supprimé quelque chose. Par défaut elles sont exclues.
 *
 * Sécurité : les noms de table et de colonne proviennent de la constante
 * TABLES ci-dessous, jamais de la requête HTTP. Toutes les VALEURS sont
 * passées en paramètres liés ($1, $2, …).
 */

interface ConfigTable {
  /** Segment d'URL : /api/<chemin> */
  chemin: string;
  /** Nom réel de la table PostgreSQL */
  table: string;
  /** Clé de module utilisée par src/middlewares/permissions.ts */
  module: string;
  /** Colonnes acceptées en écriture (id et modifie_le sont gérés à part) */
  colonnes: readonly string[];
  /** Colonnes obligatoires à la création */
  obligatoires: readonly string[];
  /** Clause ORDER BY par défaut */
  tri: string;
  /** Préfixe utilisé si l'identifiant n'est pas fourni */
  prefixeId: string;
  /**
   * true = journal d'activité : lecture réservée aux rôles autorisés,
   * mais écriture ouverte à tout utilisateur authentifié (chaque
   * utilisateur doit pouvoir tracer ses propres actions).
   */
  journal?: boolean;
}

const TABLES: readonly ConfigTable[] = [
  {
    chemin: 'bandes-volaille',
    table: 'bandes_volaille',
    module: 'poulailler',
    colonnes: [
      'reference',
      'lot_incubation_id',
      'lot_incubation_ref',
      'date_debut',
      'effectif_initial',
      'effectif_actuel',
      'statut',
      'notes',
      'cree_par',
      'modifie_le',
    ],
    obligatoires: ['reference', 'date_debut', 'effectif_initial', 'effectif_actuel', 'statut', 'cree_par'],
    tri: 'date_debut DESC',
    prefixeId: 'bande',
  },
  {
    chemin: 'mortalites',
    table: 'mortalites',
    module: 'poulailler',
    colonnes: ['bande_id', 'date', 'quantite', 'cause', 'cree_par', 'modifie_le'],
    obligatoires: ['bande_id', 'date', 'quantite', 'cree_par'],
    tri: 'date DESC',
    prefixeId: 'mort',
  },
  {
    chemin: 'soins-sante',
    table: 'soins_sante',
    module: 'poulailler',
    colonnes: ['bande_id', 'bande_ref', 'type', 'nom', 'date', 'rappel_prevu', 'notes', 'cree_par', 'modifie_le'],
    obligatoires: ['bande_id', 'type', 'nom', 'date', 'cree_par'],
    tri: 'date DESC',
    prefixeId: 'soin',
  },
  {
    chemin: 'lots-betail',
    table: 'lots_betail',
    module: 'betail',
    colonnes: [
      'reference',
      'categorie',
      'statut',
      'date_acquisition',
      'effectif_initial',
      'effectif_actuel',
      'source_acquisition',
      'prix_achat_total',
      'fournisseur_nom',
      'notes',
      'cree_par',
      'modifie_le',
    ],
    obligatoires: ['reference', 'categorie', 'statut', 'date_acquisition', 'effectif_initial', 'effectif_actuel', 'cree_par'],
    tri: 'date_acquisition DESC',
    prefixeId: 'bet',
  },
  {
    chemin: 'mortalites-betail',
    table: 'mortalites_betail',
    module: 'betail',
    colonnes: ['lot_betail_id', 'date', 'quantite', 'cause', 'cree_par', 'modifie_le'],
    obligatoires: ['lot_betail_id', 'date', 'quantite', 'cree_par'],
    tri: 'date DESC',
    prefixeId: 'mortbet',
  },
  {
    chemin: 'soins-sante-betail',
    table: 'soins_sante_betail',
    module: 'betail',
    colonnes: ['lot_betail_id', 'lot_betail_ref', 'type', 'nom', 'date', 'rappel_prevu', 'notes', 'cree_par', 'modifie_le'],
    obligatoires: ['lot_betail_id', 'type', 'nom', 'date', 'cree_par'],
    tri: 'date DESC',
    prefixeId: 'soinbet',
  },
  {
    chemin: 'journal',
    table: 'journal',
    module: 'journal',
    colonnes: ['horodatage', 'utilisateur_nom', 'action', 'details', 'module', 'cible', 'modifie_le'],
    obligatoires: ['utilisateur_nom', 'action'],
    tri: 'horodatage DESC',
    prefixeId: 'log',
    journal: true,
  },
  {
    // Chemin volontairement distinct de /api/stocks/:id/mouvements : cette
    // dernière route modifie AUSSI la quantité en stock, ce qui produirait
    // un double comptage si la synchronisation l'utilisait. Ici on écrit le
    // mouvement tel quel, sans toucher au stock.
    chemin: 'mouvements-stock',
    table: 'stock_mouvements',
    module: 'stocks',
    colonnes: [
      'stock_item_id',
      'stock_item_nom',
      'type',
      'source',
      'quantite',
      'date',
      'motif',
      'notes',
      'cree_par',
      'modifie_le',
    ],
    obligatoires: ['stock_item_id', 'type', 'source', 'quantite', 'date'],
    tri: 'date DESC',
    prefixeId: 'mvt',
  },
];

export async function tablesSupplementairesRoutes(app: FastifyInstance) {
  for (const config of TABLES) {
    const chemin = `/api/${config.chemin}`;

    // -----------------------------------------------------------------
    // LISTE (pagination + filtre incrémental)
    // -----------------------------------------------------------------
    app.get(
      chemin,
      { preHandler: requirePermission(config.module, 'read') },
      async (request, reply) => {
        const { limit, offset, depuis, inclureSupprimes } = request.query as {
          limit?: string;
          offset?: string;
          depuis?: string;
          inclureSupprimes?: string;
        };

        const limite = Math.min(Math.max(Number(limit) || 500, 1), 2000);
        const decalage = Math.max(Number(offset) || 0, 0);

        const parametres: unknown[] = [];
        const conditions: string[] = [];

        // Les « pierres tombales » (supprime_le renseigné) sont exclues par
        // défaut. La synchronisation les demande avec ?inclureSupprimes=1 :
        // sans elles, une suppression faite sur un poste ne serait jamais
        // répercutée sur les autres.
        if (inclureSupprimes !== '1') {
          conditions.push('supprime_le IS NULL');
        }

        if (depuis) {
          parametres.push(depuis);
          conditions.push(`modifie_le > $${parametres.length}`);
        }

        let sql = `SELECT * FROM ${config.table}`;

        if (conditions.length > 0) {
          sql += ` WHERE ${conditions.join(' AND ')}`;
        }

        parametres.push(limite);
        sql += ` ORDER BY ${config.tri} LIMIT $${parametres.length}`;

        parametres.push(decalage);
        sql += ` OFFSET $${parametres.length}`;

        try {
          const resultat = await db.query(sql, parametres);

          return reply.send({
            success: true,
            count: resultat.rowCount,
            total: resultat.rowCount,
            data: resultat.rows,
          });
        } catch (error) {
          app.log.error(error);

          return reply.status(500).send({
            success: false,
            message: `Erreur lors de la récupération de ${config.table}.`,
          });
        }
      },
    );

    // -----------------------------------------------------------------
    // DETAIL
    // -----------------------------------------------------------------
    app.get<{ Params: { id: string } }>(
      `${chemin}/:id`,
      { preHandler: requirePermission(config.module, 'read') },
      async (request, reply) => {
        try {
          const resultat = await db.query(
            `SELECT * FROM ${config.table} WHERE id = $1 AND supprime_le IS NULL`,
            [request.params.id],
          );

          if (resultat.rowCount === 0) {
            return reply.status(404).send({
              success: false,
              message: 'Enregistrement introuvable.',
            });
          }

          return reply.send({ success: true, data: resultat.rows[0] });
        } catch (error) {
          app.log.error(error);

          return reply.status(500).send({
            success: false,
            message: `Erreur lors de la lecture de ${config.table}.`,
          });
        }
      },
    );

    // -----------------------------------------------------------------
    // CREATION (idempotente sur l'identifiant)
    // -----------------------------------------------------------------
    app.post(
      chemin,
      { preHandler: config.journal ? app.authenticate : requirePermission(config.module, 'create') },
      async (request, reply) => {
        const corps = (request.body ?? {}) as Record<string, unknown>;

        for (const champ of config.obligatoires) {
          const valeur = corps[champ];

          if (valeur === undefined || valeur === null || valeur === '') {
            return reply.status(400).send({
              success: false,
              message: `Le champ « ${champ} » est obligatoire.`,
            });
          }
        }

        const valeurs: Record<string, unknown> = {};

        for (const colonne of config.colonnes) {
          if (corps[colonne] !== undefined) {
            valeurs[colonne] = corps[colonne];
          }
        }

        // Horodatage de modification : celui fourni par le poste s'il existe
        // (la synchronisation doit préserver l'ordre réel des modifications),
        // sinon l'heure du serveur.
        if (valeurs.modifie_le === undefined) {
          valeurs.modifie_le = new Date().toISOString();
        }

        const id =
          typeof corps.id === 'string' && corps.id.trim()
            ? corps.id.trim()
            : `${config.prefixeId}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

        const colonnes = ['id', ...Object.keys(valeurs)];
        const marqueurs = colonnes.map((_, index) => `$${index + 1}`);

        // ON CONFLICT (id) rend l'appel idempotent : une nouvelle tentative
        // de synchronisation ne peut pas créer de doublon.
        const sql = `
          INSERT INTO ${config.table} (${colonnes.join(', ')})
          VALUES (${marqueurs.join(', ')})
          ON CONFLICT (id) DO UPDATE SET
            ${Object.keys(valeurs)
              .map((colonne) => `${colonne} = EXCLUDED.${colonne}`)
              .join(', ')}
          RETURNING *
        `;

        try {
          const resultat = await db.query(sql, [id, ...Object.values(valeurs)]);

          return reply.status(201).send({
            success: true,
            message: 'Enregistré avec succès.',
            data: resultat.rows[0],
          });
        } catch (error: any) {
          if (error?.code === '23505') {
            return reply.status(409).send({
              success: false,
              message: 'Un enregistrement avec cette référence existe déjà.',
            });
          }

          if (error?.code === '23503') {
            return reply.status(400).send({
              success: false,
              message: "L'enregistrement parent référencé est introuvable.",
            });
          }

          app.log.error(error);

          return reply.status(500).send({
            success: false,
            message: `Erreur lors de l'enregistrement dans ${config.table}.`,
          });
        }
      },
    );

    // -----------------------------------------------------------------
    // MODIFICATION
    // -----------------------------------------------------------------
    app.put<{ Params: { id: string } }>(
      `${chemin}/:id`,
      { preHandler: requirePermission(config.module, 'update') },
      async (request, reply) => {
        const corps = (request.body ?? {}) as Record<string, unknown>;

        // modifie_le est traité à part pour éviter une double affectation.
        const champs = config.colonnes.filter(
          (colonne) => colonne !== 'modifie_le' && corps[colonne] !== undefined,
        );

        if (champs.length === 0) {
          return reply.status(400).send({
            success: false,
            message: 'Aucun champ à modifier.',
          });
        }

        const affectations = champs.map((colonne, index) => `${colonne} = $${index + 1}`).join(', ');
        const sql = `
          UPDATE ${config.table}
          SET ${affectations},
              modifie_le = COALESCE($${champs.length + 1}, NOW())
          WHERE id = $${champs.length + 2}
            AND supprime_le IS NULL
          RETURNING *
        `;

        const parametres = [
          ...champs.map((colonne) => corps[colonne]),
          (corps.modifie_le as string) ?? null,
          request.params.id,
        ];

        try {
          const resultat = await db.query(sql, parametres);

          if (resultat.rowCount === 0) {
            return reply.status(404).send({
              success: false,
              message: 'Enregistrement introuvable.',
            });
          }

          return reply.send({
            success: true,
            message: 'Modifié avec succès.',
            data: resultat.rows[0],
          });
        } catch (error: any) {
          if (error?.code === '23505') {
            return reply.status(409).send({
              success: false,
              message: 'Cette référence est déjà utilisée.',
            });
          }

          app.log.error(error);

          return reply.status(500).send({
            success: false,
            message: `Erreur lors de la modification de ${config.table}.`,
          });
        }
      },
    );

    // -----------------------------------------------------------------
    // SUPPRESSION LOGIQUE
    // -----------------------------------------------------------------
    app.delete<{ Params: { id: string } }>(
      `${chemin}/:id`,
      { preHandler: requirePermission(config.module, 'delete') },
      async (request, reply) => {
        try {
          const resultat = await db.query(
            `
            UPDATE ${config.table}
            SET supprime_le = NOW(),
                modifie_le = NOW()
            WHERE id = $1
              AND supprime_le IS NULL
            RETURNING id
            `,
            [request.params.id],
          );

          if (resultat.rowCount === 0) {
            return reply.status(404).send({
              success: false,
              message: 'Enregistrement introuvable.',
            });
          }

          return reply.send({
            success: true,
            message: 'Supprimé avec succès.',
          });
        } catch (error) {
          app.log.error(error);

          return reply.status(500).send({
            success: false,
            message: `Erreur lors de la suppression dans ${config.table}.`,
          });
        }
      },
    );
  }
}
