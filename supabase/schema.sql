-- Script SQL pour créer les tables Supabase pour UniVol Manager
-- Aligné sur les types TypeScript de l'application (src/types/index.ts)
-- Exécutez ce script dans le SQL Editor de votre projet Supabase

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Table des lots d'incubation
CREATE TABLE IF NOT EXISTS lots_incubation (
  id TEXT PRIMARY KEY,
  reference TEXT NOT NULL UNIQUE,
  quantite_commandee INTEGER,
  date_mise_en_couveuse TIMESTAMP WITH TIME ZONE NOT NULL,
  date_eclosion_prevue TIMESTAMP WITH TIME ZONE NOT NULL,
  quantite_oeufs INTEGER NOT NULL,
  fournisseur_id TEXT,
  fournisseur_nom TEXT,
  couveuse TEXT NOT NULL,
  statut TEXT NOT NULL CHECK (statut IN ('en_cours', 'eclos', 'annule')),
  date_mirage1 TIMESTAMP WITH TIME ZONE,
  quantite_apres_mirage1 INTEGER,
  date_mirage2 TIMESTAMP WITH TIME ZONE,
  quantite_apres_mirage2 INTEGER,
  poussins_eclos INTEGER,
  oeufs_infeconds INTEGER,
  mortalite_embryonnaire INTEGER,
  date_eclosion_reelle TIMESTAMP WITH TIME ZONE,
  notes TEXT,
  cree_par TEXT NOT NULL,
  cree_le TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  modifie_le TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  supprime_le TIMESTAMP WITH TIME ZONE,
  sync_status TEXT DEFAULT 'synchronise' CHECK (sync_status IN ('local', 'en_attente', 'synchronise'))
);

-- Table des bandes de volaille
CREATE TABLE IF NOT EXISTS bandes_volaille (
  id TEXT PRIMARY KEY,
  reference TEXT NOT NULL UNIQUE,
  lot_incubation_id TEXT,
  lot_incubation_ref TEXT,
  date_debut TIMESTAMP WITH TIME ZONE NOT NULL,
  effectif_initial INTEGER NOT NULL,
  effectif_actuel INTEGER NOT NULL,
  statut TEXT NOT NULL CHECK (statut IN ('en_elevage', 'ecoulee')),
  notes TEXT,
  cree_par TEXT NOT NULL,
  cree_le TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  modifie_le TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  supprime_le TIMESTAMP WITH TIME ZONE,
  sync_status TEXT DEFAULT 'synchronise' CHECK (sync_status IN ('local', 'en_attente', 'synchronise'))
);

-- Table des enregistrements de mortalité
CREATE TABLE IF NOT EXISTS mortalites (
  id TEXT PRIMARY KEY,
  bande_id TEXT NOT NULL,
  date TIMESTAMP WITH TIME ZONE NOT NULL,
  quantite INTEGER NOT NULL,
  cause TEXT,
  cree_par TEXT NOT NULL,
  modifie_le TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  supprime_le TIMESTAMP WITH TIME ZONE,
  sync_status TEXT DEFAULT 'synchronise' CHECK (sync_status IN ('local', 'en_attente', 'synchronise')),
  FOREIGN KEY (bande_id) REFERENCES bandes_volaille(id) ON DELETE CASCADE
);

-- Table des ventes
CREATE TABLE IF NOT EXISTS ventes (
  id TEXT PRIMARY KEY,
  reference TEXT NOT NULL UNIQUE,
  client_nom TEXT NOT NULL,
  client_telephone TEXT,
  bande_id TEXT,
  bande_ref TEXT,
  lot_betail_id TEXT,
  lot_betail_ref TEXT,
  type TEXT NOT NULL CHECK (type IN ('poussin', 'poulet', 'chevre', 'mouton', 'boeuf', 'autre')),
  quantite INTEGER NOT NULL,
  prix_unitaire INTEGER NOT NULL,
  montant_total INTEGER NOT NULL,
  montant_paye INTEGER DEFAULT 0,
  statut_paiement TEXT DEFAULT 'attente' CHECK (statut_paiement IN ('paye', 'partiel', 'attente')),
  date_vente TIMESTAMP WITH TIME ZONE NOT NULL,
  notes TEXT,
  cree_par TEXT NOT NULL,
  cree_le TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  modifie_le TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  supprime_le TIMESTAMP WITH TIME ZONE,
  sync_status TEXT DEFAULT 'synchronise' CHECK (sync_status IN ('local', 'en_attente', 'synchronise'))
);

-- Table des dépenses
CREATE TABLE IF NOT EXISTS depenses (
  id TEXT PRIMARY KEY,
  reference TEXT NOT NULL UNIQUE,
  categorie TEXT NOT NULL CHECK (categorie IN ('alimentation', 'electricite', 'transport', 'salaires', 'entretien', 'autre')),
  description TEXT,
  montant INTEGER NOT NULL,
  date TIMESTAMP WITH TIME ZONE NOT NULL,
  notes TEXT,
  cree_par TEXT NOT NULL,
  cree_le TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  modifie_le TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  supprime_le TIMESTAMP WITH TIME ZONE,
  sync_status TEXT DEFAULT 'synchronise' CHECK (sync_status IN ('local', 'en_attente', 'synchronise'))
);

-- Table des achats (aligné app : categorie + montant)
CREATE TABLE IF NOT EXISTS achats (
  id TEXT PRIMARY KEY,
  reference TEXT NOT NULL UNIQUE,
  fournisseur_nom TEXT NOT NULL,
  categorie TEXT NOT NULL CHECK (categorie IN ('oeufs', 'aliment', 'materiel', 'autre')),
  description TEXT,
  quantite INTEGER,
  prix_unitaire INTEGER,
  montant INTEGER NOT NULL,
  montant_paye INTEGER DEFAULT 0,
  statut_paiement TEXT DEFAULT 'attente' CHECK (statut_paiement IN ('paye', 'partiel', 'attente')),
  date TIMESTAMP WITH TIME ZONE NOT NULL,
  notes TEXT,
  cree_par TEXT NOT NULL,
  cree_le TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  modifie_le TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  supprime_le TIMESTAMP WITH TIME ZONE,
  sync_status TEXT DEFAULT 'synchronise' CHECK (sync_status IN ('local', 'en_attente', 'synchronise'))
);

-- Table des fournisseurs
CREATE TABLE IF NOT EXISTS fournisseurs (
  id TEXT PRIMARY KEY,
  nom TEXT NOT NULL UNIQUE,
  telephone TEXT,
  email TEXT,
  adresse TEXT,
  notes TEXT,
  cree_le TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  modifie_le TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  supprime_le TIMESTAMP WITH TIME ZONE,
  sync_status TEXT DEFAULT 'synchronise' CHECK (sync_status IN ('local', 'en_attente', 'synchronise'))
);

-- Table des clients
CREATE TABLE IF NOT EXISTS clients (
  id TEXT PRIMARY KEY,
  nom TEXT NOT NULL UNIQUE,
  telephone TEXT,
  email TEXT,
  adresse TEXT,
  notes TEXT,
  cree_le TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  modifie_le TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  supprime_le TIMESTAMP WITH TIME ZONE,
  sync_status TEXT DEFAULT 'synchronise' CHECK (sync_status IN ('local', 'en_attente', 'synchronise'))
);

-- Table des articles de stock
CREATE TABLE IF NOT EXISTS stock_items (
  id TEXT PRIMARY KEY,
  nom TEXT NOT NULL UNIQUE,
  categorie TEXT NOT NULL CHECK (categorie IN ('aliment', 'materiel', 'medicament', 'autre')),
  quantite INTEGER NOT NULL DEFAULT 0,
  unite TEXT DEFAULT 'unité',
  prix_unitaire INTEGER,
  seuil_alerte INTEGER DEFAULT 100,
  notes TEXT,
  cree_le TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  modifie_le TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  supprime_le TIMESTAMP WITH TIME ZONE,
  sync_status TEXT DEFAULT 'synchronise' CHECK (sync_status IN ('local', 'en_attente', 'synchronise'))
);

-- Table des mouvements de stock
CREATE TABLE IF NOT EXISTS stock_mouvements (
  id TEXT PRIMARY KEY,
  stock_item_id TEXT NOT NULL,
  stock_item_nom TEXT,
  type TEXT NOT NULL CHECK (type IN ('entree', 'sortie')),
  source TEXT NOT NULL,
  quantite INTEGER NOT NULL,
  motif TEXT,
  date TIMESTAMP WITH TIME ZONE NOT NULL,
  notes TEXT,
  cree_par TEXT,
  modifie_le TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  supprime_le TIMESTAMP WITH TIME ZONE,
  sync_status TEXT DEFAULT 'synchronise' CHECK (sync_status IN ('local', 'en_attente', 'synchronise')),
  FOREIGN KEY (stock_item_id) REFERENCES stock_items(id) ON DELETE CASCADE
);

-- Table des soins de santé (volaille)
CREATE TABLE IF NOT EXISTS soins_sante (
  id TEXT PRIMARY KEY,
  bande_id TEXT NOT NULL,
  bande_ref TEXT,
  type TEXT NOT NULL CHECK (type IN ('vaccination', 'traitement', 'controle')),
  nom TEXT NOT NULL,
  date TIMESTAMP WITH TIME ZONE NOT NULL,
  rappel_prevu TIMESTAMP WITH TIME ZONE,
  notes TEXT,
  cree_par TEXT NOT NULL,
  modifie_le TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  supprime_le TIMESTAMP WITH TIME ZONE,
  sync_status TEXT DEFAULT 'synchronise' CHECK (sync_status IN ('local', 'en_attente', 'synchronise')),
  FOREIGN KEY (bande_id) REFERENCES bandes_volaille(id) ON DELETE CASCADE
);

-- Table des lots de bétail
CREATE TABLE IF NOT EXISTS lots_betail (
  id TEXT PRIMARY KEY,
  reference TEXT NOT NULL UNIQUE,
  categorie TEXT NOT NULL CHECK (categorie IN ('chevre', 'mouton', 'boeuf', 'autre')),
  statut TEXT NOT NULL CHECK (statut IN ('en_elevage', 'ecoulee')),
  date_acquisition TIMESTAMP WITH TIME ZONE NOT NULL,
  effectif_initial INTEGER NOT NULL,
  effectif_actuel INTEGER NOT NULL,
  source_acquisition TEXT CHECK (source_acquisition IS NULL OR source_acquisition IN ('achat', 'naissance')),
  prix_achat_total INTEGER,
  fournisseur_nom TEXT,
  notes TEXT,
  cree_par TEXT NOT NULL,
  cree_le TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  modifie_le TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  supprime_le TIMESTAMP WITH TIME ZONE,
  sync_status TEXT DEFAULT 'synchronise' CHECK (sync_status IN ('local', 'en_attente', 'synchronise'))
);

-- Table des mortalités de bétail
CREATE TABLE IF NOT EXISTS mortalites_betail (
  id TEXT PRIMARY KEY,
  lot_betail_id TEXT NOT NULL,
  date TIMESTAMP WITH TIME ZONE NOT NULL,
  quantite INTEGER NOT NULL,
  cause TEXT,
  cree_par TEXT NOT NULL,
  modifie_le TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  supprime_le TIMESTAMP WITH TIME ZONE,
  sync_status TEXT DEFAULT 'synchronise' CHECK (sync_status IN ('local', 'en_attente', 'synchronise')),
  FOREIGN KEY (lot_betail_id) REFERENCES lots_betail(id) ON DELETE CASCADE
);

-- Table des soins de santé (bétail)
CREATE TABLE IF NOT EXISTS soins_sante_betail (
  id TEXT PRIMARY KEY,
  lot_betail_id TEXT NOT NULL,
  lot_betail_ref TEXT,
  type TEXT NOT NULL CHECK (type IN ('vaccination', 'traitement', 'controle')),
  nom TEXT NOT NULL,
  date TIMESTAMP WITH TIME ZONE NOT NULL,
  rappel_prevu TIMESTAMP WITH TIME ZONE,
  notes TEXT,
  cree_par TEXT NOT NULL,
  modifie_le TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  supprime_le TIMESTAMP WITH TIME ZONE,
  sync_status TEXT DEFAULT 'synchronise' CHECK (sync_status IN ('local', 'en_attente', 'synchronise')),
  FOREIGN KEY (lot_betail_id) REFERENCES lots_betail(id) ON DELETE CASCADE
);

-- Table du journal d'activités
CREATE TABLE IF NOT EXISTS journal (
  id TEXT PRIMARY KEY,
  horodatage TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  utilisateur_nom TEXT NOT NULL,
  action TEXT NOT NULL,
  cible TEXT,
  details TEXT,
  module TEXT,
  modifie_le TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  supprime_le TIMESTAMP WITH TIME ZONE,
  sync_status TEXT DEFAULT 'synchronise' CHECK (sync_status IN ('local', 'en_attente', 'synchronise'))
);

-- Configuration des rôles (optionnel, non synchronisé par l'app offline)
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

CREATE TABLE IF NOT EXISTS sync_metadata (
  table_name TEXT PRIMARY KEY,
  last_sync_time TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  record_count INTEGER DEFAULT 0,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index
CREATE INDEX IF NOT EXISTS idx_lots_incubation_statut ON lots_incubation(statut);
CREATE INDEX IF NOT EXISTS idx_lots_incubation_date_mise ON lots_incubation(date_mise_en_couveuse);
CREATE INDEX IF NOT EXISTS idx_bandes_volaille_statut ON bandes_volaille(statut);
CREATE INDEX IF NOT EXISTS idx_ventes_date_vente ON ventes(date_vente);
CREATE INDEX IF NOT EXISTS idx_ventes_statut_paiement ON ventes(statut_paiement);
CREATE INDEX IF NOT EXISTS idx_achats_date ON achats(date);
CREATE INDEX IF NOT EXISTS idx_depenses_date ON depenses(date);
CREATE INDEX IF NOT EXISTS idx_stock_items_categorie ON stock_items(categorie);
CREATE INDEX IF NOT EXISTS idx_stock_mouvements_item ON stock_mouvements(stock_item_id);
CREATE INDEX IF NOT EXISTS idx_journal_horodatage ON journal(horodatage);
CREATE INDEX IF NOT EXISTS idx_lots_incubation_modifie ON lots_incubation(modifie_le DESC);
CREATE INDEX IF NOT EXISTS idx_ventes_modifie ON ventes(modifie_le DESC);
CREATE INDEX IF NOT EXISTS idx_achats_modifie ON achats(modifie_le DESC);

-- RLS
ALTER TABLE lots_incubation ENABLE ROW LEVEL SECURITY;
ALTER TABLE bandes_volaille ENABLE ROW LEVEL SECURITY;
ALTER TABLE mortalites ENABLE ROW LEVEL SECURITY;
ALTER TABLE ventes ENABLE ROW LEVEL SECURITY;
ALTER TABLE depenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE achats ENABLE ROW LEVEL SECURITY;
ALTER TABLE fournisseurs ENABLE ROW LEVEL SECURITY;
ALTER TABLE clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE stock_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE stock_mouvements ENABLE ROW LEVEL SECURITY;
ALTER TABLE soins_sante ENABLE ROW LEVEL SECURITY;
ALTER TABLE lots_betail ENABLE ROW LEVEL SECURITY;
ALTER TABLE mortalites_betail ENABLE ROW LEVEL SECURITY;
ALTER TABLE soins_sante_betail ENABLE ROW LEVEL SECURITY;
ALTER TABLE journal ENABLE ROW LEVEL SECURITY;
ALTER TABLE roles_configuration ENABLE ROW LEVEL SECURITY;
ALTER TABLE sync_metadata ENABLE ROW LEVEL SECURITY;

-- Politiques dev/Electron (ouvertes) — resserrer avant production sensible
DROP POLICY IF EXISTS "Read roles config" ON roles_configuration;
CREATE POLICY "Read roles config" ON roles_configuration FOR SELECT USING (true);
DROP POLICY IF EXISTS "Admin can update roles config" ON roles_configuration;
CREATE POLICY "Admin can update roles config" ON roles_configuration FOR UPDATE USING (auth.uid() IS NOT NULL);
DROP POLICY IF EXISTS "App sync metadata access" ON sync_metadata;
CREATE POLICY "App sync metadata access" ON sync_metadata FOR ALL USING (true);

DROP POLICY IF EXISTS "Public access for lots_incubation" ON lots_incubation;
CREATE POLICY "Public access for lots_incubation" ON lots_incubation FOR ALL USING (true);
DROP POLICY IF EXISTS "Public read - prepare for auth" ON lots_incubation;
DROP POLICY IF EXISTS "Public insert - prepare for auth" ON lots_incubation;
DROP POLICY IF EXISTS "Public update - prepare for auth" ON lots_incubation;
DROP POLICY IF EXISTS "Public delete - prepare for auth" ON lots_incubation;

DROP POLICY IF EXISTS "Public access for bandes_volaille" ON bandes_volaille;
CREATE POLICY "Public access for bandes_volaille" ON bandes_volaille FOR ALL USING (true);
DROP POLICY IF EXISTS "Public access for mortalites" ON mortalites;
CREATE POLICY "Public access for mortalites" ON mortalites FOR ALL USING (true);
DROP POLICY IF EXISTS "Public access for ventes" ON ventes;
CREATE POLICY "Public access for ventes" ON ventes FOR ALL USING (true);
DROP POLICY IF EXISTS "Public access for depenses" ON depenses;
CREATE POLICY "Public access for depenses" ON depenses FOR ALL USING (true);
DROP POLICY IF EXISTS "Public access for achats" ON achats;
CREATE POLICY "Public access for achats" ON achats FOR ALL USING (true);
DROP POLICY IF EXISTS "Public access for fournisseurs" ON fournisseurs;
CREATE POLICY "Public access for fournisseurs" ON fournisseurs FOR ALL USING (true);
DROP POLICY IF EXISTS "Public access for clients" ON clients;
CREATE POLICY "Public access for clients" ON clients FOR ALL USING (true);
DROP POLICY IF EXISTS "Public access for stock_items" ON stock_items;
CREATE POLICY "Public access for stock_items" ON stock_items FOR ALL USING (true);
DROP POLICY IF EXISTS "Public access for stock_mouvements" ON stock_mouvements;
CREATE POLICY "Public access for stock_mouvements" ON stock_mouvements FOR ALL USING (true);
DROP POLICY IF EXISTS "Public access for soins_sante" ON soins_sante;
CREATE POLICY "Public access for soins_sante" ON soins_sante FOR ALL USING (true);
DROP POLICY IF EXISTS "Public access for lots_betail" ON lots_betail;
CREATE POLICY "Public access for lots_betail" ON lots_betail FOR ALL USING (true);
DROP POLICY IF EXISTS "Public access for mortalites_betail" ON mortalites_betail;
CREATE POLICY "Public access for mortalites_betail" ON mortalites_betail FOR ALL USING (true);
DROP POLICY IF EXISTS "Public access for soins_sante_betail" ON soins_sante_betail;
CREATE POLICY "Public access for soins_sante_betail" ON soins_sante_betail FOR ALL USING (true);
DROP POLICY IF EXISTS "Public access for journal" ON journal;
CREATE POLICY "Public access for journal" ON journal FOR ALL USING (true);
