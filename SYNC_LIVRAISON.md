# Synchronisation UniVol Manager — Guide de livraison

## Ce qui a été corrigé

1. **Mapping complet** des 15 tables métier IndexedDB ↔ Supabase
2. **Schéma SQL aligné** sur le code TypeScript de l'app (achats, bétail, journal, soins…)
3. **Upload d'abord**, puis download (évite de réimporter les suppressions)
4. **Whitelist des champs** à l'upsert (plus d'erreurs de colonnes inconnues)
5. **Soft-delete** local + cloud (`supprime_le`)
6. **Filtrage UI** des enregistrements supprimés
7. **Arrêt propre** de l'auto-sync à la déconnexion / désactivation

---

## ÉTAPE OBLIGATOIRE : migration Supabase

Votre base existante doit être mise à jour **une seule fois**.

1. Ouvrez [https://supabase.com/dashboard](https://supabase.com/dashboard)
2. Projet UniVol → **SQL Editor** → **New query**
3. Collez **tout** le contenu du fichier :
   - `supabase/MIGRATION_SYNC_FIX.sql`
4. Cliquez **Run**
5. Vérifiez qu'il n'y a pas d'erreur rouge

### Vérification rapide (optionnel)

```sql
SELECT column_name FROM information_schema.columns
WHERE table_name = 'achats' AND column_name IN ('categorie', 'montant', 'type', 'montant_total');
-- Attendu : categorie, montant (plus type / montant_total)

SELECT column_name FROM information_schema.columns
WHERE table_name = 'journal' AND column_name IN ('cible', 'modifie_le', 'supprime_le', 'sync_status');
```

---

## Variables d'environnement (Vercel + local)

Sur **Vercel** → Project → Settings → Environment Variables :

| Variable | Valeur |
|---|---|
| `VITE_SUPABASE_URL` | `https://xxxx.supabase.co` |
| `VITE_SUPABASE_ANON_KEY` | clé `anon` `public` du projet |

Localement, fichier `.env` à la racine :

```env
VITE_SUPABASE_URL=https://xxxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJ...
```

Puis redéployer Vercel (**Deployments → Redeploy**) pour prendre les changements de code + env.

---

## Test de validation (5 minutes)

1. Ouvrir l'app (Vercel)
2. Se connecter (PIN admin)
3. Vérifier l'indicateur en haut : **Sync** (pas « Hors ligne »)
4. Créer un **client test** → attendre ~1 min ou cliquer l'indicateur Sync
5. Dans Supabase → **Table Editor** → `clients` → le client doit apparaître
6. Sur un 2ᵉ appareil / navigateur privé : se connecter → sync → le client doit apparaître
7. Supprimer le client → sync → il disparaît des deux côtés (soft-delete côté DB)

---

## Tables synchronisées

| Local (Dexie) | Supabase |
|---|---|
| lotsIncubation | lots_incubation |
| bandesVolaille | bandes_volaille |
| mortalites | mortalites |
| ventes | ventes |
| depenses | depenses |
| achats | achats |
| fournisseurs | fournisseurs |
| clients | clients |
| stockItems | stock_items |
| stockMouvements | stock_mouvements |
| soinsSante | soins_sante |
| lotsBetail | lots_betail |
| mortalitesBetail | mortalites_betail |
| soinsSanteBetail | soins_sante_betail |
| journal | journal |

Non synchronisées (config uniquement) : `roles_configuration`, `sync_metadata`.

---

## En cas d'erreur « Erreur sync »

1. Ouvrir la console navigateur (F12) → onglet Console
2. Lire le message d'erreur Supabase
3. Cause la plus fréquente : **migration SQL non exécutée**
4. Sinon : URL / clé anon incorrectes sur Vercel
5. Sinon : politiques RLS trop strictes (le schéma livré utilise des politiques ouvertes pour le déploiement client)

---

## Push GitHub

```bash
git add .
git commit -m "fix: alignement sync Supabase avec toutes les tables métier"
git push origin main
```

Vercel redéploiera automatiquement si le repo est connecté.
