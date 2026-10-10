// Configuration de l'API UniVol (backend Fastify hébergé sur le VPS).
//
// L'URL est injectée au moment du build par Vite : elle doit donc être
// définie dans `.env` (poste de développement) ET dans les secrets GitHub
// utilisés par `.github/workflows/release-electron.yml` (installateurs).
//
// Forme attendue : l'ORIGINE seule, sans `/api` et sans slash final.
//   VITE_API_URL=https://13.140.187.105
//
// Pourquoi l'origine seule : la route de diagnostic `GET /health` est
// servie à la racine, tandis que les routes métier sont préfixées par
// `/api`. `src/lib/api.ts` assemble donc les chemins complets.
export const apiConfig = {
  baseUrl: (import.meta.env.VITE_API_URL || '').replace(/\/+$/, ''),
  /** Délai maximal d'une requête avant abandon (millisecondes). */
  timeoutMs: 15_000,
}

export function checkApiConfig(): boolean {
  if (!apiConfig.baseUrl) {
    console.warn(
      "Configuration API manquante. Définissez VITE_API_URL dans votre fichier .env " +
        '(ex. https://13.140.187.105). L\'application fonctionnera en mode hors ligne local.',
    )
    return false
  }
  return true
}
