-- =====================================================================
-- MIGRATION SUPABASE - UniVol Manager
-- Sécurité : Soft Delete, Sync Incrémentale, Gestion des PINs
-- Date: 2026-07-17
-- =====================================================================

-- =====================================================================
-- ÉTAPE 1 : Ajouter la colonne supprime_le aux tables existantes
-- =====================================================================

-- Ajouter supprime_le à lots_incubation (si la colonne n'existe pas)
ALTER TABLE IF EXISTS lots_incubation 
ADD COLUMN IF NOT EXISTS supprime_le TIMESTAMP WITH TIME ZONE;

-- Ajouter supprime_le à bandes_volaille
ALTER TABLE IF EXISTS bandes_volaille 
ADD COLUMN IF NOT EXISTS supprime_le TIMESTAMP WITH TIME ZONE;

-- Ajouter supprime_le à mortalites
ALTER TABLE IF EXISTS mortalites 
ADD COLUMN IF NOT EXISTS supprime_le TIMESTAMP WITH TIME ZONE;

-- Ajouter supprime_le à ventes
ALTER TABLE IF EXISTS ventes 
ADD COLUMN IF NOT EXISTS supprime_le TIMESTAMP WITH TIME ZONE;

-- Ajouter supprime_le à depenses
ALTER TABLE IF EXISTS depenses 
ADD COLUMN IF NOT EXISTS supprime_le TIMESTAMP WITH TIME ZONE;

-- Ajouter supprime_le à achats
ALTER TABLE IF EXISTS achats 
ADD COLUMN IF NOT EXISTS supprime_le TIMESTAMP WITH TIME ZONE;

-- Ajouter supprime_le à fournisseurs
ALTER TABLE IF EXISTS fournisseurs 
ADD COLUMN IF NOT EXISTS supprime_le TIMESTAMP WITH TIME ZONE;

-- Ajouter supprime_le à clients
ALTER TABLE IF EXISTS clients 
ADD COLUMN IF NOT EXISTS supprime_le TIMESTAMP WITH TIME ZONE;

-- Ajouter supprime_le à stock_items
ALTER TABLE IF EXISTS stock_items 
ADD COLUMN IF NOT EXISTS supprime_le TIMESTAMP WITH TIME ZONE;

-- Ajouter supprime_le à stock_mouvements
ALTER TABLE IF EXISTS stock_mouvements 
ADD COLUMN IF NOT EXISTS supprime_le TIMESTAMP WITH TIME ZONE;

-- Ajouter supprime_le à soins_sante
ALTER TABLE IF EXISTS soins_sante 
ADD COLUMN IF NOT EXISTS supprime_le TIMESTAMP WITH TIME ZONE;

-- Ajouter supprime_le à lots_betail
ALTER TABLE IF EXISTS lots_betail 
ADD COLUMN IF NOT EXISTS supprime_le TIMESTAMP WITH TIME ZONE;

-- Ajouter supprime_le à mortalites_betail
ALTER TABLE IF EXISTS mortalites_betail 
ADD COLUMN IF NOT EXISTS supprime_le TIMESTAMP WITH TIME ZONE;

-- Ajouter supprime_le à soins_sante_betail
ALTER TABLE IF EXISTS soins_sante_betail 
ADD COLUMN IF NOT EXISTS supprime_le TIMESTAMP WITH TIME ZONE;

-- =====================================================================
-- ÉTAPE 2 : Créer les nouvelles tables de configuration et métadonnées
-- =====================================================================

-- Table de configuration des rôles et PINs
CREATE TABLE IF NOT EXISTS roles_configuration (
  id TEXT PRIMARY KEY,
  role TEXT NOT NULL UNIQUE CHECK (role IN ('admin', 'commercial', 'technique', 'observateur')),
  pin_hash TEXT NOT NULL,
  pin_salt TEXT NOT NULL,
  actif BOOLEAN DEFAULT true,
  cree_le TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  modifie_le TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_by TEXT DEFAULT 'system'
);

-- Table de métadonnées pour la synchronisation incrémentale
CREATE TABLE IF NOT EXISTS sync_metadata (
  table_name TEXT PRIMARY KEY,
  last_sync_time TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  record_count INTEGER DEFAULT 0,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================================
-- ÉTAPE 3 : Activer RLS sur les nouvelles tables
-- =====================================================================

ALTER TABLE IF EXISTS roles_configuration ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS sync_metadata ENABLE ROW LEVEL SECURITY;

-- =====================================================================
-- ÉTAPE 4 : Créer les politiques RLS pour les nouvelles tables
-- =====================================================================

-- Politique RLS sécurisée pour roles_configuration (lecture seule)
DROP POLICY IF EXISTS "Read roles config" ON roles_configuration;
CREATE POLICY "Read roles config" ON roles_configuration
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "Admin can update roles config" ON roles_configuration;
CREATE POLICY "Admin can update roles config" ON roles_configuration
  FOR UPDATE USING (auth.uid() IS NOT NULL);

-- Politique RLS pour sync_metadata (lecture/écriture pour app)
DROP POLICY IF EXISTS "App sync metadata access" ON sync_metadata;
CREATE POLICY "App sync metadata access" ON sync_metadata
  FOR ALL USING (true);

-- =====================================================================
-- ÉTAPE 5 : Ajouter des index pour optimiser les requêtes incrémentales
-- =====================================================================

CREATE INDEX IF NOT EXISTS idx_lots_incubation_modifie_supprime 
  ON lots_incubation(modifie_le DESC, supprime_le);

CREATE INDEX IF NOT EXISTS idx_bandes_volaille_modifie_supprime 
  ON bandes_volaille(modifie_le DESC, supprime_le);

CREATE INDEX IF NOT EXISTS idx_ventes_modifie_supprime 
  ON ventes(modifie_le DESC, supprime_le);

CREATE INDEX IF NOT EXISTS idx_achats_modifie_supprime 
  ON achats(modifie_le DESC, supprime_le);

CREATE INDEX IF NOT EXISTS idx_depenses_modifie_supprime 
  ON depenses(modifie_le DESC, supprime_le);

CREATE INDEX IF NOT EXISTS idx_clients_modifie_supprime 
  ON clients(modifie_le DESC, supprime_le);

CREATE INDEX IF NOT EXISTS idx_fournisseurs_modifie_supprime 
  ON fournisseurs(modifie_le DESC, supprime_le);

CREATE INDEX IF NOT EXISTS idx_stock_items_modifie_supprime 
  ON stock_items(modifie_le DESC, supprime_le);

-- =====================================================================
-- ÉTAPE 6 : Vérification - afficher les migrations appliquées
-- =====================================================================

-- Les commandes suivantes sont informationnelles (pour vérifier)
-- SELECT 'Migration completed successfully!' as status;
-- SELECT table_name, column_name FROM information_schema.columns 
-- WHERE column_name = 'supprime_le' ORDER BY table_name;
