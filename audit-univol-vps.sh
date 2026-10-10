#!/usr/bin/env bash
# =====================================================================
# UniVol Manager - AUDIT LECTURE SEULE du backend (/home/univoladmin/univol-api)
# ---------------------------------------------------------------------
# Ce script NE MODIFIE RIEN :
#   - aucune ecriture sur le disque du VPS (aucun fichier temporaire)
#   - aucune requete SQL d'ecriture (INSERT/UPDATE/DELETE/DDL interdits)
#   - aucun redemarrage, aucune installation, aucune modification de config
#   - aucune valeur de .env n'est affichee (seuls les NOMS de variables)
#   - aucun contenu de table metier n'est affiche (metadonnees uniquement)
#
# Usage :  bash -s < audit-univol-vps.sh      (copier/coller, sans creer de fichier)
#   ou   :  bash audit-univol-vps.sh          (si vous le collez dans un fichier temporaire)
#
# Options par variables d'environnement (toutes optionnelles) :
#   AUDIT_PG_URL   : URI de connexion PostgreSQL a utiliser si la connexion
#                    par defaut echoue (ex: postgres://user@host/db).
#                    Ne sera jamais affichee. Si vous l'utilisez, sachez que
#                    libpq peut afficher hote/utilisateur/base dans un message
#                    d'erreur (jamais le mot de passe).
#   AUDIT_COLUMNS=0: n'affiche pas le detail colonne par colonne (sortie plus courte)
# =====================================================================

set -u
APP="/home/univoladmin/univol-api"
SHOW_COLUMNS="${AUDIT_COLUMNS:-1}"

OK_N=0; KO_N=0; NA_N=0
ok()  { OK_N=$((OK_N+1)); printf '  [OK]   %s\n' "$1"; }
ko()  { KO_N=$((KO_N+1)); printf '  [ECHEC] %s\n' "$1"; }
na()  { NA_N=$((NA_N+1)); printf '  [N/A]  %s\n' "$1"; }
sec() { printf '\n===== %s =====\n' "$1"; }
have(){ command -v "$1" >/dev/null 2>&1; }
hc()  { printf '\n-- %s\n' "$1"; }

# Masquage best-effort des secrets dans les journaux (NON infaillible).
mask() {
  sed -E \
    -e 's/eyJ[A-Za-z0-9_-]{8,}/<JWT>/g' \
    -e 's#(postgres(ql)?://)[^@[:space:]]+@#\1<CREDS>@#g' \
    -e 's/([Bb]earer)[[:space:]]+[A-Za-z0-9._-]+/\1 <REDACTED>/g' \
    -e 's/([Pp][Aa][Ss][Ss][Ww][Oo][Rr][Dd]|[Tt][Oo][Kk][Ee][Nn]|[Ss][Ee][Cc][Rr][Ee][Tt]|[Aa][Pp][Ii]_?[Kk][Ee][Yy])([[:space:]]*[:=][[:space:]]*)[^[:space:]]+/\1\2<REDACTED>/g'
}

printf '=================================================================\n'
printf ' AUDIT LECTURE SEULE - UniVol Manager backend\n'
printf ' Date (locale) : %s\n' "$(date -Is 2>/dev/null || date)"
printf ' Hote          : %s\n' "$(hostname 2>/dev/null || echo inconnu)"
printf ' Utilisateur   : %s\n' "$(id -un 2>/dev/null || echo inconnu)"
printf '=================================================================\n'

# ---------------------------------------------------------------------
sec "PARTIE A - ETAT DU BACKEND"
# ---------------------------------------------------------------------
hc "A.1 Environnement d'execution"
if have node; then ok "node : $(node -v 2>/dev/null)"; else na "node absent du PATH"; fi
if have npm;  then ok "npm  : $(npm -v 2>/dev/null)";  else na "npm absent du PATH"; fi

hc "A.2 Repertoire applicatif"
if [ -d "$APP" ]; then
  ok "repertoire present : $APP"
  printf '  Proprietaire : %s\n' "$(stat -c '%U:%G %a' "$APP" 2>/dev/null || echo inconnu)"
  printf '  Contenu racine :\n'
  ls -1A "$APP" 2>/dev/null | head -40 | sed 's/^/    /'
else
  ko "repertoire ABSENT : $APP"
fi

hc "A.3 package.json (versions DECLAREES uniquement)"
if [ -f "$APP/package.json" ]; then
  ok "package.json present"
  if have node; then
    node -e '
      const p=require(process.argv[1]);
      console.log("    name    : "+(p.name||"-"));
      console.log("    version : "+(p.version||"-"));
      console.log("    main    : "+(p.main||"-"));
      console.log("    type    : "+(p.type||"-"));
      console.log("    scripts :");
      for(const [k,v] of Object.entries(p.scripts||{})) console.log("      "+k+" = "+String(v).slice(0,120));
      const dep=(o,l)=>{const ks=Object.keys(o||{}).sort(); if(!ks.length)return;
        console.log("    "+l+" ("+ks.length+") :");
        for(const k of ks) console.log("      "+k+" "+o[k]);};
      dep(p.dependencies,"dependencies");
      dep(p.devDependencies,"devDependencies");
    ' "$APP/package.json" 2>/dev/null || ko "lecture package.json impossible via node"
  else
    na "node absent : contenu package.json non extrait"
  fi
else
  ko "package.json ABSENT"
fi

hc "A.4 Verrou de dependances / node_modules"
for f in package-lock.json pnpm-lock.yaml yarn.lock; do
  [ -f "$APP/$f" ] && ok "present : $f" || na "absent : $f"
done
[ -d "$APP/node_modules" ] && ok "node_modules present (versions INSTALLEES)" || na "node_modules absent"

hc "A.5 Versions INSTALLEES (reelles)"
if [ -f "$APP/package.json" ] && have node; then
  node -e '
    const fs=require("fs"),path=require("path");
    const p=JSON.parse(fs.readFileSync(process.argv[1],"utf8"));
    const all={...(p.dependencies||{}),...(p.devDependencies||{})};
    const keys=Object.keys(all).sort().slice(0,25);
    let n=0;
    for(const k of keys){
      try{
        const j=JSON.parse(fs.readFileSync(path.join(process.argv[2],"node_modules",k,"package.json"),"utf8"));
        console.log("      "+k+" : declare "+all[k]+" / installe "+j.version); n++;
      }catch(e){ console.log("      "+k+" : declare "+all[k]+" / NON INSTALLE"); }
    }
    if(!keys.length) console.log("      (aucune dependance)");
    console.log("    (limite a 25 paquets ; "+(Object.keys(all).length)+" au total)");
  ' "$APP/package.json" "$APP" 2>/dev/null
else
  na "impossible d'extraire les versions installees"
fi

hc "A.6 Arborescence des sources (profondeur 3, noms seuls)"
if [ -d "$APP/src" ]; then
  ok "dossier src present"
  find "$APP/src" -maxdepth 3 \( -name node_modules -o -name dist \) -prune -o -type f -print 2>/dev/null \
    | sed "s#^$APP/##" | sort | head -120
  printf '    --- total fichiers sous src : %s\n' "$(find "$APP/src" -type f 2>/dev/null | wc -l)"
else
  ko "dossier src ABSENT"
fi

hc "A.7 Fichiers de configuration (presence + noms de variables, SANS valeurs)"
for f in .env .env.example .env.production tsconfig.json .gitignore Dockerfile docker-compose.yml ecosystem.config.js; do
  [ -f "$APP/$f" ] && printf '    present : %s\n' "$f"
done
if [ -f "$APP/.env" ]; then
  printf '    .env : NOMS de variables uniquement ->\n'
  grep -oE '^[[:space:]]*(export[[:space:]]+)?[A-Za-z_][A-Za-z0-9_]*' "$APP/.env" 2>/dev/null \
    | sed -E 's/^[[:space:]]*(export[[:space:]]+)?//' | sort -u | sed 's/^/      /'
else
  na "pas de fichier .env (variables peut-etre fournies par systemd)"
fi
if [ -d "$APP/src" ] && have grep; then
  printf '    variables process.env. referencees dans src (noms seuls) ->\n'
  grep -rhoE 'process\.env\.[A-Za-z0-9_]+' "$APP/src" 2>/dev/null | sed 's/process\.env\.//' | sort -u | sed 's/^/      /' | head -40
fi

hc "A.8 Depots Git et dernier commit"
if [ -d "$APP/.git" ]; then
  ok "depot Git present"
  git -C "$APP" log -1 --date=iso --format='    dernier commit : %h | %ad | %s' 2>/dev/null | cut -c1-200
  printf '    branche : %s\n' "$(git -C "$APP" rev-parse --abbrev-ref HEAD 2>/dev/null)"
  printf '    fichiers modifies non commites : %s\n' "$(git -C "$APP" status --porcelain 2>/dev/null | wc -l)"
else
  na "pas de depot Git"
fi

hc "A.9 Tests automatises et procedure de build/start"
TESTS=$(find "$APP" -path "$APP/node_modules" -prune -o -type f \
        \( -name '*.test.ts' -o -name '*.spec.ts' -o -name '*.test.js' \) -print 2>/dev/null | head -20)
if [ -n "$TESTS" ]; then ok "fichiers de test trouves ($(printf '%s\n' "$TESTS" | wc -l))"; printf '%s\n' "$TESTS" | sed "s#^$APP/##" | sed 's/^/      /'
else na "aucun fichier de test detecte"; fi
if [ -d "$APP/test" ] || [ -d "$APP/tests" ] || [ -d "$APP/__tests__" ]; then ok "dossier de tests present"; fi
[ -d "$APP/dist" ] && ok "dossier dist/ present (build effectue)" || na "dossier dist/ absent (pas encore compile ?)"
[ -f "$APP/tsconfig.json" ] && ok "tsconfig.json present (procedure TypeScript)" || na "tsconfig.json absent"

# ---------------------------------------------------------------------
sec "PARTIE B - INVENTAIRE DES ROUTES HTTP (statique, depuis les sources)"
# ---------------------------------------------------------------------
if [ ! -d "$APP/src" ]; then
  ko "src absent : inventaire impossible"
else
  hc "B.1 Defininitions de routes (app|fastify|server|router|api|scope).<methode>("
  grep -rnE "\b(app|fastify|server|instance|router|r|api|scope)[[:space:]]*\.[[:space:]]*(get|post|put|patch|delete|head|options|all|route)[[:space:]]*\(" \
    "$APP/src" --include='*.ts' 2>/dev/null | sed "s#^$APP/##" | cut -c1-180 | sort | head -200
  printf '    --- total : %s\n' "$(grep -rcE "\b(app|fastify|server|instance|router|r|api|scope)[[:space:]]*\.[[:space:]]*(get|post|put|patch|delete|head|options|all|route)[[:space:]]*\(" "$APP/src" --include='*.ts' 2>/dev/null | awk -F: '{s+=$2} END{print s+0}')"

  hc "B.2 Routes au format objet (method: / url: / path:)"
  grep -rnE "(method|url|path):[[:space:]]*['\"]" "$APP/src" --include='*.ts' 2>/dev/null \
    | sed "s#^$APP/##" | cut -c1-160 | sort | head -80

  hc "B.3 Prefixes et enregistrements de plugins"
  grep -rnE "(prefix|register|fastify\.register|\.register\()[[:space:]]*" "$APP/src" --include='*.ts' 2>/dev/null \
    | sed "s#^$APP/##" | cut -c1-160 | sort | head -60

  hc "B.4 Hooks globaux et middlewares"
  grep -rnE "(addHook|onRequest|preHandler|preValidation|onSend|onError|setErrorHandler|setNotFoundHandler)" \
    "$APP/src" --include='*.ts' 2>/dev/null | sed "s#^$APP/##" | cut -c1-160 | sort | head -60

  hc "B.5 Fichiers de routes / plugins / services"
  find "$APP/src" -type f -name '*.ts' 2>/dev/null | sed "s#^$APP/##" | sort | head -80

  hc "B.6 Mots-cles sync / pagination / soft-delete"
  grep -rniE "(/sync|synchronis|sync_metadata|tombstone|pagination|page|limit|offset|cursor|delta|supprime_le|deleted_at|logic)" \
    "$APP/src" --include='*.ts' 2>/dev/null | sed "s#^$APP/##" | cut -c1-160 | sort | head -100
fi

# ---------------------------------------------------------------------
sec "PARTIE C - AUTHENTIFICATION, JETONS ET AUTORISATIONS (statique)"
# ---------------------------------------------------------------------
if [ ! -d "$APP/src" ]; then
  ko "src absent : analyse impossible"
else
  hc "C.1 Hachage de mots de passe / PIN"
  grep -rniE "(argon2|bcrypt|scrypt|pbkdf2|createHash|timingSafeEqual|crypto\.randomBytes)" "$APP/src" --include='*.ts' 2>/dev/null \
    | sed "s#^$APP/##" | cut -c1-160 | sort | head -40
  hc "C.2 JWT : signature, verification, expiration, algorithme"
  grep -rniE "(jsonwebtoken|@fastify/jwt|fastify-jwt|jwt\.sign|jwt\.verify|jwt\.decode|algorithms|expiresIn|secretOrKey|JWT_SECRET|sign\()" "$APP/src" --include='*.ts' 2>/dev/null \
    | sed "s#^$APP/##" | cut -c1-160 | sort | head -60
  hc "C.3 Limitation de debit / anti force brute"
  grep -rniE "(rate[-_]?limit|attempt|tentative|lockout|locks?[[:space:]]*[:=]|maxAttempts|brute)" "$APP/src" --include='*.ts' 2>/dev/null \
    | sed "s#^$APP/##" | cut -c1-160 | sort | head -40
  hc "C.4 CORS, en-tetes de securite, validation d'entrees"
  grep -rniE "(@fastify/cors|@fastify/helmet|cors|helmet|schema|zod|typebox|joi|ajv)" "$APP/src" --include='*.ts' 2>/dev/null \
    | sed "s#^$APP/##" | cut -c1-160 | sort | head -60
  hc "C.5 Verification de role / permission"
  grep -rniE "(role|permission|autorisation|authorize|requireRole|isAdmin|actif|403|401)" "$APP/src" --include='*.ts' 2>/dev/null \
    | sed "s#^$APP/##" | cut -c1-160 | sort | head -60
fi

# ---------------------------------------------------------------------
sec "PARTIE D - SCHEMA POSTGRESQL REEL (metadonnees uniquement)"
# ---------------------------------------------------------------------
PG_CMD=()
PG_OK=0
PG_LABEL="aucune"

if ! have psql; then
  na "client psql non disponible : section D impossible"
else
  # Tentative 1 : connexion locale par defaut
  if psql -X -q -t -A -v ON_ERROR_STOP=1 -c 'SELECT 1' -d univol >/dev/null 2>&1; then
    PG_CMD=(psql -d univol); PG_OK=1; PG_LABEL="psql -d univol (auth locale)"
  # Tentative 2 : via sudo non interactif (aucune invite, aucun mot de passe demande)
  elif have sudo && sudo -n true >/dev/null 2>&1 && \
       sudo -n -u postgres psql -X -q -t -A -v ON_ERROR_STOP=1 -c 'SELECT 1' -d univol >/dev/null 2>&1; then
    PG_CMD=(sudo -n -u postgres psql -d univol); PG_OK=1; PG_LABEL="sudo -n -u postgres psql -d univol"
  # Tentative 3 : URI explicite fournie par l'utilisateur
  elif [ -n "${AUDIT_PG_URL:-}" ] && psql -X -q -t -A -v ON_ERROR_STOP=1 -c 'SELECT 1' "$AUDIT_PG_URL" >/dev/null 2>&1; then
    PG_CMD=(psql "$AUDIT_PG_URL"); PG_OK=1; PG_LABEL="AUDIT_PG_URL (fournie manuellement)"
  # Tentative 4 : URI lue dans .env SANS jamais l'afficher
  elif [ -f "$APP/.env" ]; then
    DBURL=$(grep -m1 -E '^[[:space:]]*(export[[:space:]]+)?(DATABASE_URL|POSTGRES_URL|PG_URL|DB_URL)=' "$APP/.env" 2>/dev/null \
            | sed -E 's/^[^=]*=//' | tr -d '"'"'" | tr -d '\r')
    if [ -n "${DBURL:-}" ] && psql -X -q -t -A -v ON_ERROR_STOP=1 -c 'SELECT 1' "$DBURL" >/dev/null 2>&1; then
      PG_CMD=(psql "$DBURL"); PG_OK=1; PG_LABEL="URI issue de .env (non affichee)"
    fi
  fi
fi

if [ "$PG_OK" -eq 1 ]; then
  ok "connexion PostgreSQL etablie ($PG_LABEL)"
else
  ko "connexion PostgreSQL IMPOSSIBLE : toutes les requetes SQL sont annulees (aucune requete executee)"
fi

if [ "$PG_OK" -eq 1 ]; then
  q() { "${PG_CMD[@]}" -X -q -t -A -F ' | ' -v ON_ERROR_STOP=1 -c "$1" 2>&1; }

  hc "D.1 Contexte de connexion (droits du compte d'audit)"
  q "SELECT 'utilisateur='||current_user||' | base='||current_database()||' | superuser='||COALESCE((SELECT rolsuper::text FROM pg_roles WHERE rolname=current_user),'?');"
  q "SELECT 'version_serveur='||current_setting('server_version');"

  hc "D.2 Schemas presents"
  q "SELECT string_agg(nspname,', ' ORDER BY nspname) FROM pg_namespace WHERE nspname NOT LIKE 'pg_%' AND nspname<>'information_schema';"

  hc "D.3 Tables du schema public (lignes ESTIMEES via statistiques, non exactes)"
  q "SELECT c.relname||' | reltuples='||c.reltuples::bigint||' | n_live_tup='||COALESCE(s.n_live_tup::text,'-')||' | taille='||pg_size_pretty(pg_total_relation_size(c.oid))
     FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
     LEFT JOIN pg_stat_user_tables s ON s.relid=c.oid
     WHERE n.nspname='public' AND c.relkind IN ('r','p') ORDER BY c.relname;"
  printf '    (reltuples=-1 signifie table jamais analysee : estimation non disponible)\n'

  hc "D.4 Tables ATTENDUES : presentes / absentes"
  q "SELECT a.n||' -> '||CASE WHEN c.relname IS NULL THEN 'ABSENTE' ELSE 'PRESENTE' END
     FROM unnest(ARRAY['lots_incubation','journal','bandes_volaille','mortalites','ventes','depenses','achats','fournisseurs','clients','stock_items','stock_mouvements','soins_sante','lots_betail','mortalites_betail','soins_sante_betail','roles_configuration','sync_metadata','utilisateurs','users','devices']) AS a(n)
     LEFT JOIN (SELECT c.relname FROM pg_class c JOIN pg_namespace nn ON nn.oid=c.relnamespace WHERE nn.nspname='public' AND c.relkind IN ('r','p')) c ON c.relname=a.n
     ORDER BY 1;"

  hc "D.5 Colonnes (nom, type, nullabilite, defaut, longueur)"
  if [ "$SHOW_COLUMNS" = "1" ]; then
    q "SELECT table_name||' | '||column_name||' | '||data_type||COALESCE('('||character_maximum_length||')','')||' | null='||is_nullable||' | defaut='||COALESCE(column_default,'-')
       FROM information_schema.columns WHERE table_schema='public' ORDER BY table_name, ordinal_position;"
  else
    q "SELECT table_name||' | nb_colonnes='||count(*) FROM information_schema.columns WHERE table_schema='public' GROUP BY table_name ORDER BY table_name;"
  fi

  hc "D.6 Cles primaires, cles etrangeres, UNIQUE, CHECK"
  q "SELECT conrelid::regclass::text||' | '||conname||' | '||CASE contype WHEN 'p' THEN 'PRIMARY KEY' WHEN 'f' THEN 'FOREIGN KEY' WHEN 'u' THEN 'UNIQUE' WHEN 'c' THEN 'CHECK' WHEN 'x' THEN 'EXCLUDE' ELSE contype::text END||' | '||pg_get_constraintdef(oid)
     FROM pg_constraint WHERE connamespace='public'::regnamespace ORDER BY conrelid::regclass::text, contype;"

  hc "D.7 Index"
  q "SELECT tablename||' | '||indexname||' | '||indexdef FROM pg_indexes WHERE schemaname='public' ORDER BY tablename, indexname;"

  hc "D.8 Colonnes liees a la synchronisation / suppression logique"
  q "SELECT table_name||' | '||column_name||' | '||data_type||' | null='||is_nullable
     FROM information_schema.columns
     WHERE table_schema='public'
       AND (column_name ~* 'supprime|deleted|modifie|updated|created|cree|version|device|sync|uuid|hash|checksum|pere')
     ORDER BY table_name, column_name;"

  hc "D.9 Table sync_metadata : structure et volume (aucune donnee metier affichee)"
  if q "SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='sync_metadata';" | grep -q 1; then
    q "SELECT 'colonnes='||string_agg(column_name,',' ORDER BY ordinal_position) FROM information_schema.columns WHERE table_schema='public' AND table_name='sync_metadata';"
    q "SELECT 'nb_lignes_estime='||COALESCE((SELECT n_live_tup::text FROM pg_stat_user_tables WHERE relname='sync_metadata'),'?');"
  else
    printf '    table sync_metadata absente\n'
  fi

  hc "D.10 roles_configuration : structure et volume (aucune donnee metier affichee)"
  if q "SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='roles_configuration';" | grep -q 1; then
    q "SELECT 'colonnes='||string_agg(column_name,',' ORDER BY ordinal_position) FROM information_schema.columns WHERE table_schema='public' AND table_name='roles_configuration';"
    q "SELECT 'nb_lignes_estime='||COALESCE((SELECT n_live_tup::text FROM pg_stat_user_tables WHERE relname='roles_configuration'),'?');"
  else
    printf '    table roles_configuration absente\n'
  fi

  hc "D.11 Tables visibles mais NON lisibles par le compte d'audit"
  q "SELECT c.relname||' | privileges='||array_to_string(c.relacl,' ') FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='public' AND c.relkind='r' AND NOT has_table_privilege(c.oid,'SELECT');"
else
  na "section D.5 a D.11 non executee (connexion PostgreSQL indisponible)"
fi

# ---------------------------------------------------------------------
sec "PARTIE G - DEPLOIEMENT, SERVICE, RESEAU, REVERSE PROXY"
# ---------------------------------------------------------------------
hc "G.1 Services systemd lies a l'API (aucune modification, aucun redemarrage)"
if have systemctl; then
  UNITS=$(systemctl list-units --type=service --all --no-pager --no-legend 2>/dev/null | awk '{print $1}' | grep -iE 'univol|univol-api|api' | head -10)
  if [ -n "$UNITS" ]; then
    for u in $UNITS; do
      printf '    unite : %s | active=%s | etat=%s | demarrage=%s\n' "$u" \
        "$(systemctl is-active "$u" 2>/dev/null)" "$(systemctl show -p SubState --value "$u" 2>/dev/null)" "$(systemctl is-enabled "$u" 2>/dev/null)"
      FP=$(systemctl show -p FragmentPath --value "$u" 2>/dev/null)
      printf '      unit file : %s\n' "${FP:--}"
      if [ -n "${FP:-}" ] && [ -r "$FP" ]; then
        printf '      directives utiles (valeurs Environment masquees) :\n'
        grep -E '^(ExecStart|WorkingDirectory|User|Group|Restart|Environment|EnvironmentFile|After|WantedBy)' "$FP" 2>/dev/null \
          | sed -E 's/^(Environment(File)?=).*/\1<MASQUE>/' | cut -c1-160 | sed 's/^/        /'
      fi
    done
  else
    na "aucune unite systemd ne correspond a 'univol|api'"
  fi
else
  na "systemctl non disponible"
fi

hc "G.2 Ports en ecoute (80, 443, 3000 et autres ports applicatifs)"
if have ss; then
  ss -ltn 2>/dev/null | awk 'NR==1 || $4 ~ /:(80|443|3000|3001|8080)$/' | sed 's/^/    /'
  printf '    --- processus associes (peut necessiter root) :\n'
  ss -ltnp 2>/dev/null | awk '$4 ~ /:(80|443|3000|3001|8080)$/' | cut -c1-180 | sed 's/^/      /' || na "details processus indisponibles (droits insuffisants)"
elif have netstat; then
  netstat -ltn 2>/dev/null | awk 'NR<3 || $4 ~ /:(80|443|3000)$/' | sed 's/^/    /'
else
  na "ni ss ni netstat disponibles"
fi

hc "G.3 Processus Node.js"
if have ps; then
  ps -eo pid,user,etime,args 2>/dev/null | grep -E '[n]ode' | cut -c1-180 | head -10 | sed 's/^/    /'
  [ -z "$(ps -eo args 2>/dev/null | grep -E '[n]ode')" ] && na "aucun processus node detecte"
else
  na "ps non disponible"
fi

hc "G.4 Reverse proxy Nginx (configuration declarative ; valeurs sensibles filtrees)"
NGX_OK=0
if have nginx; then
  ok "binaire nginx present"
  if nginx -T >/dev/null 2>&1; then
    NGX_OK=1
    nginx -T 2>/dev/null | grep -nE '^\s*(server_name|listen|proxy_pass|ssl_certificate|ssl_certificate_key|location|root|return)' \
      | cut -c1-170 | head -80 | sed 's/^/    /'
  else
    na "nginx -T a echoue (droits ou configuration) : fichiers de conf non listes"
  fi
else
  na "binaire nginx absent du PATH"
fi
if [ -d /etc/nginx ]; then
  printf '    fichiers de configuration presents :\n'
  ls -1 /etc/nginx/sites-enabled/ 2>/dev/null | sed 's/^/      sites-enabled\//'
  ls -1 /etc/nginx/conf.d/ 2>/dev/null | sed 's/^/      conf.d\//'
fi

hc "G.5 Certificats TLS (presence et dates, AUCUNE cle privee affichee)"
if [ -d /etc/letsencrypt/live ]; then
  for d in /etc/letsencrypt/live/*/; do
    [ -d "$d" ] || continue
    printf '    domaine : %s\n' "$(basename "$d")"
    ls -1 "$d" 2>/dev/null | sed 's/^/      /'
    if have openssl && [ -r "$d/cert.pem" ]; then
      openssl x509 -in "$d/cert.pem" -noout -subject -dates 2>/dev/null | sed 's/^/      /'
    fi
  done
else
  na "/etc/letsencrypt/live absent (certificat peut-etre gere ailleurs)"
fi

hc "G.6 Pare-feu (lecture seule ; sudo non interactif uniquement)"
if have ufw && sudo -n ufw status >/dev/null 2>&1; then
  sudo -n ufw status 2>/dev/null | head -20 | sed 's/^/    /'
  ok "etat ufw lu (lecture seule)"
else
  na "ufw non lisible sans mot de passe (non demande par ce script)"
fi
if have iptables && sudo -n iptables -S >/dev/null 2>&1; then
  printf '    iptables (regles INPUT/DROP/ACCEPT, resume) :\n'
  sudo -n iptables -S 2>/dev/null | grep -cE '^-A' | sed 's/^/      nb_regles=/'
else
  na "iptables non lisible sans mot de passe"
fi

hc "G.7 Routes de sante (GET local, non destructif)"
if have curl; then
  H1=$(curl -s -m 5 -o /dev/null -w '%{http_code}' http://127.0.0.1:3000/health 2>/dev/null)
  H2=$(curl -sk -m 5 -o /dev/null -w '%{http_code}' https://127.0.0.1/health 2>/dev/null)
  printf '    http://127.0.0.1:3000/health  -> HTTP %s\n' "${H1:-000}"
  printf '    https://127.0.0.1/health      -> HTTP %s\n' "${H2:-000}"
  printf '    (HTTP 000 = aucun service n a repondu sur ce port/protocole)\n'
else
  na "curl absent : test des routes de sante impossible"
fi

hc "G.8 Journaux recents (extrait court, masquage best-effort NON infaillible)"
if have journalctl && [ -n "${UNITS:-}" ]; then
  U=$(printf '%s\n' $UNITS | head -1)
  printf '    unite : %s (20 dernieres lignes)\n' "$U"
  journalctl -u "$U" -n 20 --no-pager -o cat 2>/dev/null | mask | cut -c1-190 | sed 's/^/      /'
  printf '    erreurs recentes (compteur) : '
  journalctl -u "$U" -p err --since '7 days ago' --no-pager 2>/dev/null | grep -c . | sed 's/^/lignes=/'
else
  na "journalctl indisponible ou aucune unite identifiee"
fi

# ---------------------------------------------------------------------
sec "PARTIE H - CONTRAT D'API (source des routes et du plugin d'auth)"
# ---------------------------------------------------------------------
# Necessaire pour ecrire le client TypeScript de l'application de bureau.
# ATTENTION : cette section affiche du CODE SOURCE. Relisez avant de partager.
if [ -d "$APP/src/routes" ]; then
  for f in "$APP/src/routes"/*.ts; do
    [ -f "$f" ] || continue
    hc "H.1 route : $(basename "$f")"
    head -200 "$f" 2>/dev/null | cut -c1-200
  done
else
  na "dossier src/routes absent"
fi

if [ -d "$APP/src/plugins" ]; then
  for f in "$APP/src/plugins"/*.ts; do
    [ -f "$f" ] || continue
    hc "H.2 plugin : $(basename "$f")"
    head -200 "$f" 2>/dev/null | cut -c1-200
  done
else
  na "dossier src/plugins absent"
fi

hc "H.3 fichiers d'amorcage et de configuration"
for f in src/server.ts src/index.ts src/app.ts src/config/database.ts src/config/env.ts; do
  if [ -f "$APP/$f" ]; then
    printf '    --- %s ---\n' "$f"
    head -80 "$APP/$f" 2>/dev/null | cut -c1-200
  fi
done

hc "H.4 scripts npm de build / start"
if [ -f "$APP/package.json" ] && have node; then
  node -e 'const p=require(process.argv[1]);console.log(JSON.stringify(p.scripts||{},null,2))' "$APP/package.json" 2>/dev/null
else
  na "package.json ou node indisponible"
fi

hc "H.5 fichiers SQL / migrations presents"
find "$APP" -path "$APP/node_modules" -prune -o -type f \( -name '*.sql' -o -name '*migration*' -o -name '*schema*' \) -print 2>/dev/null \
  | sed "s#^$APP/##" | head -40

# ---------------------------------------------------------------------
sec "RESUME DE L'AUDIT"
# ---------------------------------------------------------------------
printf ' Verifications reussies  : %s\n' "$OK_N"
printf ' Verifications en echec  : %s\n' "$KO_N"
printf ' Verifications possibles : %s\n' "$NA_N"
printf '\n Rappel : ce script est en LECTURE SEULE.\n'
printf ' - Aucune ecriture fichier, aucune requete SQL d ecriture, aucun redemarrage.\n'
printf ' - Les compteurs de lignes sont des ESTIMATIONS statistiques, pas des comptes exacts.\n'
printf ' - Le masquage des journaux est best-effort : relisez avant de partager.\n'
printf ' - Les valeurs de .env et les secrets ne sont jamais affiches.\n'
printf '=================================================================\n'
