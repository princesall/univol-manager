/**
 * Résout un fichier du dossier `public/` de façon compatible
 * web, PWA et Electron (protocole file://).
 *
 * Vite `base: './'` → BASE_URL vaut "./", donc "/logo.jpg" devient
 * "./logo.jpg" et se charge correctement depuis dist/index.html.
 */
export function assetUrl(path: string): string {
  const clean = path.replace(/^\//, '')
  return `${import.meta.env.BASE_URL}${clean}`
}
