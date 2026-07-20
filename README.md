# UniVol Manager

Application de gestion de couvoir et de poulailler pour **UniVol Mali**.
Un seul code, **trois façons d'y accéder** : navigateur web, app installée
sur téléphone (PWA), et app desktop (`.exe`) — toutes connectées aux mêmes
données une fois Supabase branché (voir section dédiée plus bas).

## Les trois façons d'utiliser l'app

### 1. Navigateur web (PC ou téléphone)
```bash
npm install
npm run dev
```
Ouvre `http://localhost:5173`. Une fois déployée en ligne (Vercel, Netlify…),
n'importe qui avec le lien peut l'ouvrir depuis un navigateur, PC ou
téléphone, sans rien installer.

### 2. Installée sur téléphone ou bureau (PWA)
Une fois l'app déployée en ligne et ouverte dans le navigateur :
- **Sur téléphone (Android/Chrome)** : menu du navigateur → "Ajouter à
  l'écran d'accueil". Une icône UniVol apparaît comme une vraie app.
- **Sur téléphone (iPhone/Safari)** : bouton Partager → "Sur l'écran
  d'accueil".
- **Sur PC (Chrome/Edge)** : une icône d'installation apparaît dans la
  barre d'adresse.

C'est la même app, pas une version différente — elle fonctionne aussi hors
ligne grâce à l'architecture offline-first déjà en place.

### 3. App desktop installable (.exe)
```bash
npm run electron:build
```
Génère un installateur dans le dossier `release/` (`.exe` sous Windows,
`.dmg` sous Mac, `.AppImage` sous Linux — se construit pour la plateforme
sur laquelle la commande est lancée). C'est ce fichier qu'on donne au
patron et aux collaborateurs pour une installation classique sur leur PC.

#### Mises à jour automatiques (electron-updater)
L'app desktop vérifie les **GitHub Releases** du dépôt
`princesall/univol-manager` au démarrage (et toutes les 4 h). Si une
version plus récente est publiée, elle est téléchargée en arrière-plan
et un bandeau propose de redémarrer pour l'installer.

**Prérequis** : le dépôt doit être **public** (déjà le cas) pour que les
clients téléchargent les updates sans token.

##### Option A — Publication locale (Windows)
1. Bumper la version dans `package.json` (ex. `0.1.0` → `0.1.1`)
2. Créer un **Personal Access Token** GitHub (classic) avec le scope `repo`,
   ou un fine-grained token avec permission **Contents: Read and write**
   sur ce dépôt
3. Exporter le token puis publier :
```powershell
# PowerShell — ne jamais committer ce token
$env:GH_TOKEN = "ghp_xxxxxxxx"
# Optionnel : injecter Supabase / PIN au build
# $env:VITE_SUPABASE_URL = "..."
# $env:VITE_SUPABASE_ANON_KEY = "..."
npm run electron:publish
```
Cela build l'installateur **et** crée/met à jour la GitHub Release
(`latest.yml` + `UniVol-Manager-Setup-x.y.z.exe` + `.blockmap`).

##### Option B — Publication via GitHub Actions (recommandé)
1. Bumper la version dans `package.json`
2. Commit + push sur `main`
3. Créer et pousser un tag qui correspond à la version :
```bash
git tag v0.1.1
git push origin v0.1.1
```
Le workflow `.github/workflows/release-electron.yml` build sur un runner
Windows et publie la Release automatiquement (utilise `GITHUB_TOKEN`).

Si l'app desktop doit être livrée avec Supabase déjà configuré, ajoutez
les secrets de dépôt : `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`,
et éventuellement `VITE_PIN_ADMIN`, `VITE_PIN_COMMERCIAL`,
`VITE_PIN_TECHNIQUE`, `VITE_PIN_OBSERVATEUR`.

Les PC déjà installés se mettront à jour au prochain lancement (ou dans
les 4 h suivantes).

Pour tester la version Electron en développement (nécessite `npm run dev`
lancé dans un autre terminal) :
```bash
npm run electron:dev
```

**Important — routing** : l'app utilise `HashRouter` (URLs du type
`#/couvoir`) plutôt que le routing classique, exprès pour que la navigation
fonctionne à l'identique dans les trois contextes (site web, PWA, fichiers
locaux chargés par Electron) sans configuration serveur particulière.

## Comptes utilisateurs

L'application utilise une authentification par code PIN par rôle.
Les codes sont configurés via les variables d'environnement `VITE_PIN_*`
(fichier `.env` local ou secrets de déploiement) — **ils ne sont jamais
documentés ni commités dans ce dépôt**.

| Rôle | Accès |
|---|---|
| 👑 Administrateur | Tous les modules |
| 💼 Gestionnaire Commercial | Achats, Dépenses, Ventes, Stocks, Clients, Fournisseurs |
| 🐣 Gestionnaire Technique | Couvoir, Poulailler, Bétail, Stocks |
| 👀 Observateur | Tableau de bord, Rapports (lecture seule) |

Demandez les codes PIN à l'administrateur de l'entreprise pour vous connecter.

## Modules — 11 modules métier (les 10 du cahier des charges + Bétail)

- **Tableau de bord** : indicateurs clés en temps réel, graphique, alertes.
- **Couvoir** : suivi complet du cycle — œufs commandés, mise en couveuse,
  1er et 2e mirage, éclosion. Calcul automatique de la date d'éclosion
  prévue (+21 jours). Une fiche "Détail" par lot récapitule les 7
  indicateurs (commandés → mis en couveuse → mirages → éclos → morts →
  vendus), les deux derniers étant calculés automatiquement depuis le
  Poulailler et les Ventes pour éviter toute double saisie.
- **Poulailler** : une bande est créée **automatiquement** à chaque
  éclosion enregistrée. Suivi d'âge, effectif, mortalité (avec cause),
  taux de pertes. **Suivi santé & vaccination** par bande (vaccinations,
  traitements, contrôles vétérinaires, rappels prévus), réservé à
  l'Administrateur et au Gestionnaire Technique.
- **Bétail** (nouveau) : gestion des chèvres, moutons et bœufs sur le même
  principe que le Poulailler — lots par catégorie (achat ou naissance),
  effectifs suivis en temps réel, mortalité, santé/vaccination, recherche,
  modification/suppression. Compteurs par catégorie sur le tableau de
  bord du module. Réservé à l'Administrateur et au Gestionnaire Technique.
- **Ventes** : "Écouler une bande" au Poulailler ouvre un vrai formulaire
  de vente qui génère aussi une **facture A4 imprimable** (logo, coordonnées
  de l'entreprise, détail, statut de paiement, zones de signature
  client/responsable). Une fenêtre de confirmation propose de voir/imprimer
  la facture juste après l'enregistrement. **Vente partielle depuis une
  bande ou un lot de bétail** : le formulaire "Nouvelle vente" permet de
  choisir une bande du Poulailler ou un lot du Bétail comme origine et de
  n'en vendre qu'une partie (ex. 50 sur 500) — l'effectif diminue
  automatiquement, et le lot se clôture tout seul quand il ne reste plus
  personne. Modifier ou supprimer une vente liée ajuste l'effectif en
  conséquence (delta à la modification, restitution complète à la
  suppression).
- **Dépenses** : charges par catégorie, répartition en camembert.
- **Achats** : achats d'œufs, d'aliments, de matériel. Un achat d'aliment
  ou de matériel alimente **automatiquement** le stock correspondant
  (entrée de mouvement de stock).
- **Stocks** : effectif de volaille disponible (dérivé du Poulailler en
  temps réel) + stock d'aliments/matériel avec mouvements d'entrée/sortie
  tracés dans un historique. Le bouton "Consommation" fait la soustraction
  automatiquement à partir de la quantité utilisée.
- **Clients** / **Fournisseurs** : fiches avec historique et soldes
  calculés automatiquement. Créés **automatiquement** dès qu'un nom est
  saisi dans une vente/un achat (avec autocomplétion et détection de
  doublon), pas besoin de les créer manuellement au préalable. **Cliquer
  sur une fiche ouvre le détail complet de l'historique** (chaque
  transaction individuelle, pas seulement le total agrégé), avec accès
  direct à la facture pour les clients.
- **Rapports & statistiques** : graphique Ventes, Dépenses et Achats (6
  derniers mois), rapport de production complet. **Export en vrai document
  Word (.docx) professionnel** — pas un tableau brut : logo de l'entreprise,
  nom et coordonnées en en-tête, titre de section, un paragraphe de synthèse
  écrit, un bloc résumé chiffré (total ventes, achats, dépenses, résultat
  net), puis le détail complet en tableau avec en-têtes stylées et lignes
  alternées pour la lisibilité. Pensé comme un vrai rapport à imprimer ou
  archiver, pas comme un fichier de données à retravailler.
- **Journal d'activités** : trace toutes les actions avec utilisateur et
  horodatage.

**Recherche et gestion** : Ventes, Achats, Dépenses, Clients, Fournisseurs,
Stocks et Poulailler ont une barre de recherche filtrant en temps réel, et
supportent la **modification et la suppression** (avec confirmation) des
enregistrements — plus besoin de vivre avec une erreur de saisie
définitive.

**Gestion des paiements partiels** : en Ventes et Achats, choisir "Partiel"
demande maintenant explicitement le montant déjà versé (ce n'était pas le
cas avant — un vrai trou corrigé). Un bouton dédié "Enregistrer un
paiement" apparaît sur toute vente/achat non soldé, permettant d'ajouter un
règlement reçu plus tard (le client revient payer le reste) sans rouvrir
tout le formulaire — le statut (Payé/Partiel/En attente) se recalcule
automatiquement selon le nouveau solde.

**Responsive** : menu tiroir sur mobile/tablette, tableaux à défilement
horizontal, mise en page adaptative — testé mobile (~375px), tablette et
desktop.

## Architecture technique

- React + TypeScript + Vite, PWA (`vite-plugin-pwa`), coque Electron pour
  le desktop.
- Base de données locale **offline-first** (IndexedDB via Dexie —
  `src/lib/db.ts`). Chaque enregistrement porte un statut de synchronisation
  (`local` / `en_attente` / `synchronise`), prêt à être poussé vers Supabase.
- Authentification par rôle avec permissions filtrant navigation et pages
  (`src/store/auth.ts` — à remplacer par Supabase Auth).
- Design system dédié : palette verte forêt / jaune œuf / argile,
  typographie Fraunces + Inter + IBM Plex Mono, anneau de progression en
  forme d'œuf comme élément signature. Logo réel UNIVOL-Mali intégré
  (sidebar, connexion, factures).

## Avant utilisation réelle

Personnalise les vraies coordonnées de UniVol Mali dans
`src/config/entreprise.ts` (téléphone, email, adresse précise) — les
valeurs actuelles sont des placeholders utilisés sur la facture **et sur
les rapports Word**.

**À tester en priorité** : l'export Word (`src/lib/wordReport.ts`,
bibliothèque `docx`) n'a pas pu être testé dans un vrai navigateur dans
cet environnement de développement — seule la compilation a été vérifiée.
Teste le bouton "Exporter en Word" (Rapports) en conditions réelles avant
de t'y fier pour un usage client, notamment l'affichage correct du logo
dans le fichier généré. Le module Word est volumineux (~370 Ko) : il est
chargé uniquement au moment du clic sur "Exporter", pas au démarrage de
l'app, pour ne pas ralentir le chargement initial ni gonfler le cache
hors-ligne (PWA) — cette technique s'appelle le "code splitting".

## Audit de fiabilité (juillet 2026)

Un audit complet du code a été mené après la découverte d'un bug réel sur
la gestion des paiements partiels. Voici ce qui a été trouvé et corrigé —
en toute transparence, pour un usage en entreprise :

**Corrigés (impact réel sur les données ou les chiffres) :**
1. **Résultat net erroné** — le calcul (Dashboard + Rapports) ignorait
   complètement les Achats (œufs, aliments, matériel), souvent le plus
   gros poste de coût. La rentabilité affichée était largement surestimée.
   Corrigé : Résultat net = Ventes − Dépenses − Achats, partout.
2. **Collision de références possible** — les références de vente/achat/
   dépense (`VTE-`, `ACH-`, `DEP-`) étaient dérivées des millisecondes de
   l'horloge, qui se répètent toutes les ~16 minutes. Deux transactions à
   des jours différents pouvaient recevoir exactement la même référence.
   Remplacé par un générateur combinant date + suffixe aléatoire.
3. **Mortalité et consommation de stock sans limite** — entrer un nombre
   supérieur à l'effectif ou au stock disponible écrasait silencieusement
   la valeur à 0, sans avertissement (une erreur de frappe passait
   inaperçue). Ajout d'une validation bloquante avec message clair.
4. **Éclosion et mirages sans validation** — on pouvait enregistrer plus
   de poussins éclos que d'œufs viables, ou un mirage qui "augmente" le
   nombre d'œufs (impossible en réalité). Ajout de bornes de validation.
5. **Double-clic = doublon possible** — sur les actions critiques
   (nouveau lot, éclosion, mirage, mortalité, écouler une bande, nouvelle
   vente, nouvel achat, consommation de stock), un double-clic rapide
   pouvait créer deux enregistrements avant que l'interface ne se
   mette à jour. Les boutons se désactivent maintenant pendant l'envoi.
6. **Supprimer une vente liée à une bande orpheline** — supprimer une vente
   issue d'un "Écouler une bande" laissait la bande fermée pour toujours,
   sans aucune trace de vente. Elle se rouvre maintenant automatiquement.
7. **Référence de bande fragile** — la création automatique de la bande au
   Poulailler dépendait d'un remplacement de texte ("LOT" → "BND") qui
   échouait silencieusement si la référence du lot ne suivait pas le
   format attendu. Rendu robuste avec un repli explicite.
8. **Champs numériques acceptant les valeurs négatives** — aucun champ
   montant/quantité n'empêchait la saisie d'un nombre négatif. Ajout de
   `min="0"` sur l'ensemble des champs concernés.
9. **Statut "Partiel" qui restait figé même si le montant tapé couvrait
   tout** — si on choisissait "Partiel" mais qu'on tapait le montant total
   exact (ou plus), la vente/l'achat restait quand même marqué "Partiel"
   au lieu de "Payé". Le statut réellement enregistré est maintenant
   toujours recalculé à partir du montant saisi (Ventes, Achats, et
   "Écouler une bande"), avec un message qui prévient l'utilisateur en
   direct quand ça arrive.
10. **Ventes partielles depuis une bande, et confusion vente/mortalité** —
    en connectant Ventes et Poulailler pour permettre de vendre une partie
    d'une bande, l'effectif d'une bande diminue désormais aussi bien par
    mortalité que par vente. Les indicateurs qui supposaient que toute
    baisse d'effectif était une perte ("taux de survie" au Poulailler,
    "poussins morts" sur la fiche du lot au Couvoir) ont été corrigés pour
    isoler la vraie mortalité des ventes réelles.
11. **Page blanche à l'ouverture du module Bétail (index manquant)** — la
    vraie cause : `db.lotsBetail.orderBy('dateAcquisition')` était utilisé
    dans le code sans que ce champ soit déclaré comme indexé dans le
    schéma Dexie, ce qui provoquait une erreur bloquante ("KeyPath ...
    is not indexed") au chargement de la page. Corrigé en ajoutant
    l'index manquant (nouvelle version de schéma). Tous les autres champs
    utilisés avec `orderBy()`/`where()` dans l'ensemble de l'app ont été
    revérifiés un par un pour s'assurer qu'aucun autre index ne manque.
    Un filet de sécurité global (`ErrorBoundary`) a aussi été ajouté :
    toute erreur inattendue affiche désormais un message clair avec le
    détail technique et un bouton de rechargement, plutôt qu'une page
    blanche silencieuse — c'est d'ailleurs ce qui a permis de diagnostiquer
    ce bug précisément. Les mises à jour de l'app (PWA) s'appliquent aussi
    maintenant immédiatement (`skipWaiting` + `clientsClaim`), au cas où
    un futur souci serait bien lié au cache.

**Limites connues, non corrigées pour l'instant (documentées, pas cachées) :**
- Modifier un achat ne recalcule pas le stock déjà crédité par cet achat.
- Supprimer un achat ne retire pas la quantité correspondante du stock.
- Supprimer un client/fournisseur ne supprime pas l'historique de ses
  ventes/achats (juste la fiche contact).
- L'authentification utilise `sessionStorage` : fermer l'onglet déconnecte
  l'utilisateur (à corriger facilement si ce n'est pas le comportement
  souhaité, une fois Supabase Auth branché).
- Le mode hors-ligne local (par appareil) signifie qu'un problème de
  double-saisie *entre deux appareils différents* reste possible tant que
  Supabase n'est pas branché — les corrections ci-dessus protègent contre
  les erreurs *au sein d'un même appareil/session*.

## Limites connues

- **Pas de synchronisation multi-appareils pour l'instant** : chaque
  installation (navigateur, PWA, ou .exe) a ses propres données locales.
  C'est le point le plus important à résoudre — voir "Prochaines étapes".
- Les champs "client" (Ventes) et "fournisseur" (Achats) sont créés
  automatiquement par correspondance de nom plutôt que par un vrai lien
  relationnel (clientId/fournisseurId) — fonctionne bien mais mériterait
  une vraie relation en base lors du passage en production.
- Modifier un achat ne recalcule pas le stock déjà crédité par cet achat.
- Supprimer un client/fournisseur ne supprime pas l'historique de ses
  ventes/achats (juste la fiche contact).

## Prochaines étapes pour la mise en production

1. ✅ **Brancher Supabase** — LE prérequis pour que web, PWA et desktop
   partagent vraiment les mêmes données en temps réel. **Déjà implémenté**.
2. ✅ **Authentification réelle** via Supabase Auth — **Le système actuel utilise des mots de passe simples par rôle.**
3. **Gestion des utilisateurs** : écran permettant au patron de créer des
   comptes pour de nouveaux employés sans toucher au code.
4. **Règle de résolution des conflits de synchronisation** (dernière
   modification gagne, avec trace dans le journal — à valider avec UniVol
   Mali).
5. **Relations Client/Fournisseur réelles** (voir limites ci-dessus).
6. **Génération de reçus/factures en vrai PDF** (actuellement impression
   navigateur, qui fonctionne très bien mais n'est pas un fichier PDF
   généré directement).

## Configuration Supabase

L'application est maintenant prête pour utiliser Supabase pour la synchronisation des données entre plusieurs appareils.

### 1. Créer un projet Supabase

1. Allez sur [supabase.com](https://supabase.com) et créez un compte
2. Créez un nouveau projet (choisissez une région proche du Mali)
3. Attendez que le projet soit initialisé (quelques minutes)

### 2. Configurer les variables d'environnement

Créez un fichier `.env` à la racine du projet avec vos clés Supabase :

```env
VITE_SUPABASE_URL=votre_url_supabase
VITE_SUPABASE_ANON_KEY=votre_cle_anon_supabase
```

Vous pouvez trouver ces valeurs dans :
- **URL** : Settings → API → Project URL
- **Anon Key** : Settings → API → anon/public key

### 3. Exécuter le script SQL

Ouvrez le fichier `supabase/schema.sql` dans le SQL Editor de votre projet Supabase et exécutez-le pour créer toutes les tables nécessaires.

### 4. Activer la synchronisation

Une fois Supabase configuré :
- Connectez-vous à l'application avec votre mot de passe
- La synchronisation s'activera automatiquement si Supabase est détecté
- Cliquez sur l'indicateur de synchronisation dans la sidebar pour synchroniser manuellement
- Les données seront synchronisées automatiquement toutes les 60 secondes

### Fonctionnement de la synchronisation

- **Mode hors ligne** : L'application fonctionne entièrement hors ligne avec IndexedDB
- **Mode en ligne** : Les modifications locales sont marquées comme "en attente" et synchronisées avec Supabase
- **Conflits** : La règle "dernière modification gagne" est appliquée
- **Indicateur** : L'icône de synchronisation dans la sidebar affiche l'état (Hors ligne / Sync désactivée / Synchronisé / En cours)

## Déploiement sur Vercel

L'application peut être déployée sur Vercel pour un accès web en production.

### 1. Prérequis

- Un compte GitHub, GitLab ou Bitbucket
- Un compte Vercel (gratuit)
- Le code du projet poussé sur un dépôt Git

### 2. Méthode 1 : Déploiement via l'interface Vercel (recommandé)

1. Connectez-vous sur [vercel.com](https://vercel.com)
2. Cliquez sur "Add New Project"
3. Importez votre dépôt Git (GitHub, GitLab ou Bitbucket)
4. Configurez le projet :
   - **Framework Preset** : Vite
   - **Build Command** : `npm run build`
   - **Output Directory** : `dist`
   - **Install Command** : `npm install`
5. Ajoutez les variables d'environnement :
   - `VITE_SUPABASE_URL` : votre URL Supabase
   - `VITE_SUPABASE_ANON_KEY` : votre clé anon Supabase
6. Cliquez sur "Deploy"

### 3. Méthode 2 : Déploiement via Vercel CLI

```bash
# Installer Vercel CLI
npm install -g vercel

# Se connecter
vercel login

# Déployer
vercel
```

Suivez les instructions et ajoutez les variables d'environnement quand demandé.

### 4. Configuration automatique

Le fichier `vercel.json` est déjà configuré pour :
- Rediriger toutes les routes vers `index.html` (nécessaire pour HashRouter)
- Utiliser les commandes de build correctes
- Gérer le PWA correctement

### 5. Variables d'environnement sur Vercel

Après le déploiement, ajoutez les variables d'environnement dans Vercel :

1. Allez dans Settings → Environment Variables
2. Ajoutez :
   - `VITE_SUPABASE_URL` = `https://vvoyjsukzqknlxltjwei.supabase.co`
   - `VITE_SUPABASE_ANON_KEY` = `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZ2b3lqc3VrenFrbmx4bHRqd2VpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODQxOTUwMjUsImV4cCI6MjA5OTc3MTAyNX0.beW3kpoSmQXB9DxxrxsVz8EvEB6RRpQJir15jSKpzz8`
3. Redéployez le projet pour appliquer les changements

### 6. Domaine personnalisé (optionnel)

Vous pouvez configurer un domaine personnalisé dans Settings → Domains sur Vercel.

## Structure du projet

```
src/
  components/
    layout/     → AppShell (sidebar/topbar), ProtectedRoute, SyncIndicator
    ui/         → Button, Card, Badge, Modal, StatCard, EmptyState,
                  SearchInput, ConfirmDialog, NameAutocomplete
    invoice/    → Facture (A4), FactureModal, PostVenteModal
  pages/        → une page par module (10 modules + Login + Journal)
  store/        → auth.ts (zustand)
  lib/          → db.ts (Dexie/IndexedDB + logique métier), seed.ts
  types/        → types métier partagés
  config/       → entreprise.ts (coordonnées affichées sur les factures)
electron/
  main.cjs      → processus principal Electron (fenêtre desktop)
public/
  logo.jpg, icon-*.png → logo et icônes PWA
```
