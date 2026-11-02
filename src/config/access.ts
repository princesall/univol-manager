/**
 * Message de verrouillage par défaut.
 *
 * Le verrou réel est désormais piloté par la licence serveur
 * (`src/lib/licence.ts` et `LicenceGuard`). Ce message ne sert que de repli
 * lorsque le serveur ne fournit pas de motif plus précis.
 */
export const LOCK_MESSAGE = {
  titre: 'Accès temporairement suspendu',
  corps:
    "L'accès à UniVol Manager est momentanément suspendu suite à un impayé sur cette licence. Merci de régulariser votre facture pour réactiver l'application.",
}
