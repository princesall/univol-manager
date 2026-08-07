/**
 * Verrou d'accès à l'application.
 * Passer APP_LOCKED à false et republier une mise à jour pour redonner l'accès.
 */
export const APP_LOCKED = false

export const LOCK_MESSAGE = {
  titre: 'Accès temporairement suspendu',
  corps:
    "L'accès à UniVol Manager est momentanément suspendu suite à un impayé sur cette licence. Merci de régulariser votre facture pour réactiver l'application.",
}
