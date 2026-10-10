-- =====================================================================
-- UniVol Manager — levée des contraintes d'unicité
-- =====================================================================
--
-- POURQUOI
--   Votre base locale contient des enregistrements qui partagent la même
--   référence ou le même nom (données de démonstration insérées par une
--   ancienne version de l'application, et saisies réelles en double).
--   Ces contraintes faisaient échouer leur envoi vers le serveur.
--
--   Vous avez choisi de CONSERVER toutes ces données : on retire donc les
--   contraintes, plutôt que de renommer ou de supprimer quoi que ce soit.
--
-- EFFET
--   Aucune donnée n'est supprimée. Aucune donnée n'est modifiée.
--   Seule la garantie « deux enregistrements ne peuvent pas porter la même
--   référence » est retirée. Tous vos enregistrements pourront monter.
--
-- RÉVERSIBLE
--   Ces contraintes peuvent être recréées plus tard, si vous nettoyez les
--   doublons un jour. Rien n'est définitif.
--
-- CONTRÔLE INTÉGRÉ
--   La requête finale liste les contraintes d'unicité restantes. Il ne doit
--   rester QUE celle de roles_configuration (un code PIN par rôle, à
--   conserver absolument).
--
-- EXÉCUTION
--   sudo -u postgres psql -d univol -f /tmp/univol-drop-unique.sql
-- =====================================================================

-- Noms : clients, fournisseurs, articles de stock
ALTER TABLE public.clients       DROP CONSTRAINT IF EXISTS clients_nom_key;
ALTER TABLE public.fournisseurs  DROP CONSTRAINT IF EXISTS fournisseurs_nom_key;
ALTER TABLE public.stock_items   DROP CONSTRAINT IF EXISTS stock_items_nom_key;

-- Références : lots d'incubation, bandes, bétail, achats, ventes, dépenses
ALTER TABLE public.lots_incubation DROP CONSTRAINT IF EXISTS lots_incubation_reference_key;
ALTER TABLE public.bandes_volaille DROP CONSTRAINT IF EXISTS bandes_volaille_reference_key;
ALTER TABLE public.lots_betail     DROP CONSTRAINT IF EXISTS lots_betail_reference_key;
ALTER TABLE public.achats          DROP CONSTRAINT IF EXISTS achats_reference_key;
ALTER TABLE public.ventes          DROP CONSTRAINT IF EXISTS ventes_reference_key;
ALTER TABLE public.depenses        DROP CONSTRAINT IF EXISTS depenses_reference_key;

-- =====================================================================
-- CONTRÔLE : une seule ligne doit subsister — roles_configuration
-- =====================================================================
SELECT conrelid::regclass AS table_name, conname AS contrainte_restante
FROM pg_constraint
WHERE contype = 'u'
  AND connamespace = 'public'::regnamespace
ORDER BY 1;
