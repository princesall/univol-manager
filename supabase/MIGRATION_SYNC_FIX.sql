-- =====================================================================
-- MIGRATION CRITIQUE - Alignement schéma Supabase ↔ UniVol Manager (app)
-- Date: 2026-07-17
--
-- À EXÉCUTER dans le SQL Editor de Supabase (Dashboard → SQL → New query)
-- AVANT de redéployer / retester la synchronisation.
--
-- Cette migration adapte les colonnes et contraintes au code TypeScript
-- réel de l'application (IndexedDB / Dexie).
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1) ACHATS : categorie + montant (au lieu de type + montant_total)
-- ---------------------------------------------------------------------
DO $$
BEGIN
  -- Renommer type → categorie si nécessaire
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'achats' AND column_name = 'type'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'achats' AND column_name = 'categorie'
  ) THEN
    ALTER TABLE achats RENAME COLUMN type TO categorie;
  END IF;

  -- Renommer montant_total → montant si nécessaire
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'achats' AND column_name = 'montant_total'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'achats' AND column_name = 'montant'
  ) THEN
    ALTER TABLE achats RENAME COLUMN montant_total TO montant;
  END IF;
END $$;

-- Rendre prix_unitaire optionnel (l'app n'envoie pas toujours ce champ)
ALTER TABLE IF EXISTS achats ALTER COLUMN prix_unitaire DROP NOT NULL;
ALTER TABLE IF EXISTS achats ALTER COLUMN quantite DROP NOT NULL;

-- Assouplir / recréer le CHECK categorie
ALTER TABLE IF EXISTS achats DROP CONSTRAINT IF EXISTS achats_type_check;
ALTER TABLE IF EXISTS achats DROP CONSTRAINT IF EXISTS achats_categorie_check;
ALTER TABLE IF EXISTS achats
  ADD CONSTRAINT achats_categorie_check
  CHECK (categorie IS NULL OR categorie IN ('oeufs', 'aliment', 'materiel', 'autre'));

-- Normaliser d'anciennes valeurs
UPDATE achats SET categorie = 'aliment' WHERE categorie IN ('aliments', 'medicaments');

-- ---------------------------------------------------------------------
-- 2) DEPENSES : catégories alignées sur l'app
-- ---------------------------------------------------------------------
ALTER TABLE IF EXISTS depenses DROP CONSTRAINT IF EXISTS depenses_categorie_check;
ALTER TABLE IF EXISTS depenses
  ADD CONSTRAINT depenses_categorie_check
  CHECK (categorie IN (
    'alimentation', 'electricite', 'transport', 'salaires', 'entretien', 'autre',
    -- anciennes valeurs encore tolérées
    'veterinaire', 'maintenance'
  ));

UPDATE depenses SET categorie = 'entretien' WHERE categorie IN ('veterinaire', 'maintenance');

ALTER TABLE IF EXISTS depenses DROP CONSTRAINT IF EXISTS depenses_categorie_check;
ALTER TABLE IF EXISTS depenses
  ADD CONSTRAINT depenses_categorie_check
  CHECK (categorie IN ('alimentation', 'electricite', 'transport', 'salaires', 'entretien', 'autre'));

-- description obligatoire côté app (peut être vide en SQL)
ALTER TABLE IF EXISTS depenses ALTER COLUMN description DROP NOT NULL;

-- ---------------------------------------------------------------------
-- 3) LOTS_BETAIL : source_acquisition + statut en_elevage/ecoulee
-- ---------------------------------------------------------------------
ALTER TABLE IF EXISTS lots_betail
  ADD COLUMN IF NOT EXISTS source_acquisition TEXT;

UPDATE lots_betail
SET source_acquisition = COALESCE(source_acquisition, 'achat')
WHERE source_acquisition IS NULL;

UPDATE lots_betail SET statut = 'ecoulee' WHERE statut IN ('vendu', 'decede');

ALTER TABLE IF EXISTS lots_betail DROP CONSTRAINT IF EXISTS lots_betail_statut_check;
ALTER TABLE IF EXISTS lots_betail
  ADD CONSTRAINT lots_betail_statut_check
  CHECK (statut IN ('en_elevage', 'ecoulee'));

ALTER TABLE IF EXISTS lots_betail DROP CONSTRAINT IF EXISTS lots_betail_source_acquisition_check;
ALTER TABLE IF EXISTS lots_betail
  ADD CONSTRAINT lots_betail_source_acquisition_check
  CHECK (source_acquisition IS NULL OR source_acquisition IN ('achat', 'naissance'));

-- ---------------------------------------------------------------------
-- 4) JOURNAL : cible + sync + soft-delete + modifie_le
-- ---------------------------------------------------------------------
ALTER TABLE IF EXISTS journal ADD COLUMN IF NOT EXISTS cible TEXT;
ALTER TABLE IF EXISTS journal ADD COLUMN IF NOT EXISTS sync_status TEXT DEFAULT 'synchronise';
ALTER TABLE IF EXISTS journal ADD COLUMN IF NOT EXISTS modifie_le TIMESTAMP WITH TIME ZONE DEFAULT NOW();
ALTER TABLE IF EXISTS journal ADD COLUMN IF NOT EXISTS supprime_le TIMESTAMP WITH TIME ZONE;

-- Migrer details → cible si besoin
UPDATE journal SET cible = details WHERE (cible IS NULL OR cible = '') AND details IS NOT NULL;

-- ---------------------------------------------------------------------
-- 5) Colonnes manquantes pour sync incrémentale + soft-delete
-- ---------------------------------------------------------------------
ALTER TABLE IF EXISTS mortalites
  ADD COLUMN IF NOT EXISTS modifie_le TIMESTAMP WITH TIME ZONE DEFAULT NOW();
ALTER TABLE IF EXISTS stock_mouvements
  ADD COLUMN IF NOT EXISTS modifie_le TIMESTAMP WITH TIME ZONE DEFAULT NOW();
ALTER TABLE IF EXISTS soins_sante
  ADD COLUMN IF NOT EXISTS modifie_le TIMESTAMP WITH TIME ZONE DEFAULT NOW();
ALTER TABLE IF EXISTS mortalites_betail
  ADD COLUMN IF NOT EXISTS modifie_le TIMESTAMP WITH TIME ZONE DEFAULT NOW();
ALTER TABLE IF EXISTS soins_sante_betail
  ADD COLUMN IF NOT EXISTS modifie_le TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- stock_mouvements : champs utilisés par l'app
ALTER TABLE IF EXISTS stock_mouvements ADD COLUMN IF NOT EXISTS stock_item_nom TEXT;
ALTER TABLE IF EXISTS stock_mouvements ADD COLUMN IF NOT EXISTS motif TEXT;
ALTER TABLE IF EXISTS stock_mouvements ADD COLUMN IF NOT EXISTS cree_par TEXT;
ALTER TABLE IF EXISTS stock_mouvements ADD COLUMN IF NOT EXISTS supprime_le TIMESTAMP WITH TIME ZONE;
ALTER TABLE IF EXISTS stock_mouvements ADD COLUMN IF NOT EXISTS sync_status TEXT DEFAULT 'synchronise';

-- soins : refs + types app
ALTER TABLE IF EXISTS soins_sante ADD COLUMN IF NOT EXISTS bande_ref TEXT;
ALTER TABLE IF EXISTS soins_sante ADD COLUMN IF NOT EXISTS supprime_le TIMESTAMP WITH TIME ZONE;
ALTER TABLE IF EXISTS soins_sante_betail ADD COLUMN IF NOT EXISTS lot_betail_ref TEXT;
ALTER TABLE IF EXISTS soins_sante_betail ADD COLUMN IF NOT EXISTS supprime_le TIMESTAMP WITH TIME ZONE;

ALTER TABLE IF EXISTS soins_sante DROP CONSTRAINT IF EXISTS soins_sante_type_check;
ALTER TABLE IF EXISTS soins_sante
  ADD CONSTRAINT soins_sante_type_check
  CHECK (type IN ('vaccination', 'traitement', 'controle', 'vermifugation', 'autre'));

UPDATE soins_sante SET type = 'controle' WHERE type IN ('vermifugation', 'autre');

ALTER TABLE IF EXISTS soins_sante DROP CONSTRAINT IF EXISTS soins_sante_type_check;
ALTER TABLE IF EXISTS soins_sante
  ADD CONSTRAINT soins_sante_type_check
  CHECK (type IN ('vaccination', 'traitement', 'controle'));

ALTER TABLE IF EXISTS soins_sante_betail DROP CONSTRAINT IF EXISTS soins_sante_betail_type_check;
ALTER TABLE IF EXISTS soins_sante_betail
  ADD CONSTRAINT soins_sante_betail_type_check
  CHECK (type IN ('vaccination', 'traitement', 'controle', 'vermifugation', 'autre'));

UPDATE soins_sante_betail SET type = 'controle' WHERE type IN ('vermifugation', 'autre');

ALTER TABLE IF EXISTS soins_sante_betail DROP CONSTRAINT IF EXISTS soins_sante_betail_type_check;
ALTER TABLE IF EXISTS soins_sante_betail
  ADD CONSTRAINT soins_sante_betail_type_check
  CHECK (type IN ('vaccination', 'traitement', 'controle'));

-- mortalites soft-delete déjà souvent présent ; garantir les colonnes
ALTER TABLE IF EXISTS mortalites ADD COLUMN IF NOT EXISTS supprime_le TIMESTAMP WITH TIME ZONE;
ALTER TABLE IF EXISTS mortalites_betail ADD COLUMN IF NOT EXISTS supprime_le TIMESTAMP WITH TIME ZONE;

-- lots_incubation : fournisseur_id optionnel (app)
ALTER TABLE IF EXISTS lots_incubation ADD COLUMN IF NOT EXISTS fournisseur_id TEXT;

-- stock_items : cree_le optionnel si manquant
ALTER TABLE IF EXISTS stock_items ADD COLUMN IF NOT EXISTS cree_le TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- clients / fournisseurs : email optionnel déjà OK
ALTER TABLE IF EXISTS clients ADD COLUMN IF NOT EXISTS email TEXT;
ALTER TABLE IF EXISTS fournisseurs ADD COLUMN IF NOT EXISTS email TEXT;

-- ---------------------------------------------------------------------
-- 6) Garantir supprime_le + sync_status partout (tables métier)
-- ---------------------------------------------------------------------
DO $$
DECLARE
  t TEXT;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'lots_incubation', 'bandes_volaille', 'mortalites', 'ventes', 'depenses',
    'achats', 'fournisseurs', 'clients', 'stock_items', 'stock_mouvements',
    'soins_sante', 'lots_betail', 'mortalites_betail', 'soins_sante_betail', 'journal'
  ]
  LOOP
    EXECUTE format('ALTER TABLE IF EXISTS %I ADD COLUMN IF NOT EXISTS supprime_le TIMESTAMP WITH TIME ZONE', t);
    EXECUTE format(
      'ALTER TABLE IF EXISTS %I ADD COLUMN IF NOT EXISTS sync_status TEXT DEFAULT %L',
      t, 'synchronise'
    );
    EXECUTE format(
      'ALTER TABLE IF EXISTS %I ADD COLUMN IF NOT EXISTS modifie_le TIMESTAMP WITH TIME ZONE DEFAULT NOW()',
      t
    );
  END LOOP;
END $$;

-- ---------------------------------------------------------------------
-- 7) Index pour sync incrémentale
-- ---------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_mortalites_modifie ON mortalites(modifie_le DESC);
CREATE INDEX IF NOT EXISTS idx_stock_mouvements_modifie ON stock_mouvements(modifie_le DESC);
CREATE INDEX IF NOT EXISTS idx_soins_sante_modifie ON soins_sante(modifie_le DESC);
CREATE INDEX IF NOT EXISTS idx_mortalites_betail_modifie ON mortalites_betail(modifie_le DESC);
CREATE INDEX IF NOT EXISTS idx_soins_sante_betail_modifie ON soins_sante_betail(modifie_le DESC);
CREATE INDEX IF NOT EXISTS idx_journal_modifie ON journal(modifie_le DESC);
CREATE INDEX IF NOT EXISTS idx_lots_betail_modifie ON lots_betail(modifie_le DESC);

-- ---------------------------------------------------------------------
-- 8) RLS journal (si absente) — politiques déjà ouvertes en dev
-- ---------------------------------------------------------------------
ALTER TABLE IF EXISTS journal ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'journal' AND policyname = 'Public access for journal'
  ) THEN
    CREATE POLICY "Public access for journal" ON journal FOR ALL USING (true);
  END IF;
END $$;

-- ---------------------------------------------------------------------
-- Vérification
-- ---------------------------------------------------------------------
-- SELECT table_name, column_name, data_type
-- FROM information_schema.columns
-- WHERE table_schema = 'public'
--   AND table_name IN (
--     'achats','depenses','lots_betail','journal','stock_mouvements','soins_sante'
--   )
-- ORDER BY table_name, ordinal_position;
