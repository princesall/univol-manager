// Configuration de l'API UniVol (backend Fastify hébergé sur le VPS).
//
// Forme attendue : l'ORIGINE seule, sans `/api` et sans slash final.
//
// Pourquoi l'origine seule : la route de diagnostic `GET /health` est servie
// à la racine, tandis que les routes métier sont préfixées par `/api`.
// `src/lib/api.ts` assemble donc les chemins complets.
//
// POURQUOI UNE ADRESSE PAR DÉFAUT
//   L'application est déployée de trois façons : installateur Electron,
//   site web, et poste de développement. Dans les trois cas, l'adresse du
//   serveur est la même. La définir ici évite qu'un déploiement oublie la
//   variable d'environnement et se retrouve silencieusement en mode
//   « hors ligne uniquement » — ce qui est déjà arrivé une fois.
//
//   `VITE_API_URL` reste PRIORITAIRE : renseignez-la pour pointer vers un
//   autre serveur (recette, développement local).
//
// L'ADRESSE N'EST PAS UN SECRET : elle apparaît de toute façon dans le
// trafic réseau de l'application.
const ADRESSE_PAR_DEFAUT = 'https://13.140.187.105'

function normaliser(url: string): string {
  const propre = url.trim().replace(/\/+$/, '')

  if (!propre) return ''

  // Autorise « 13.140.187.105 » en plus de « https://13.140.187.105 ».
  return /^https?:\/\//i.test(propre) ? propre : `https://${propre}`
}

export const apiConfig = {
  baseUrl: normaliser(import.meta.env.VITE_API_URL || ADRESSE_PAR_DEFAUT),
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
