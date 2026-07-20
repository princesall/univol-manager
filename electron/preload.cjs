const { contextBridge, ipcRenderer } = require('electron')

/**
 * API exposée au renderer pour les mises à jour desktop (electron-updater).
 * Disponible uniquement dans le contexte Electron via window.univolDesktop.
 */
contextBridge.exposeInMainWorld('univolDesktop', {
  platform: process.platform,
  isElectron: true,

  /** Demande manuelle de vérification des mises à jour. */
  checkForUpdates: () => ipcRenderer.invoke('updater:check'),

  /** Installe la mise à jour téléchargée et redémarre l'app. */
  installUpdate: () => ipcRenderer.invoke('updater:install'),

  /**
   * Écoute les événements d'update du main process.
   * @param {(payload: { status: string, [key: string]: unknown }) => void} callback
   * @returns {() => void} fonction de désabonnement
   */
  onUpdateStatus: (callback) => {
    const handler = (_event, payload) => callback(payload)
    ipcRenderer.on('updater:status', handler)
    return () => ipcRenderer.removeListener('updater:status', handler)
  },
})
