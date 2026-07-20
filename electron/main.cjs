const { app, BrowserWindow, ipcMain } = require('electron')
const path = require('node:path')

// Dev non packagé → Vite local. Surcharge possible via ELECTRON_START_URL.
// (évite la syntaxe UNIX `VAR=value cmd` qui ne marche pas sous PowerShell)
const DEV_URL =
  process.env.ELECTRON_START_URL ||
  (!app.isPackaged ? 'http://localhost:5173' : null)

/** @type {BrowserWindow | null} */
let mainWindow = null

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1360,
    height: 860,
    minWidth: 960,
    minHeight: 640,
    title: 'UniVol Manager',
    icon: path.join(__dirname, '..', 'public', 'icon-512.png'),
    backgroundColor: '#FBF9F4',
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
    autoHideMenuBar: true,
  })

  if (DEV_URL) {
    mainWindow.loadURL(DEV_URL)
  } else {
    // Build de production : charge les fichiers statiques générés par Vite.
    // L'app utilise HashRouter (voir src/App.tsx) pour que la navigation
    // fonctionne correctement en chargement local file://.
    mainWindow.loadFile(path.join(__dirname, '..', 'dist', 'index.html'))
  }

  mainWindow.on('closed', () => {
    mainWindow = null
  })
}

/**
 * Envoie un statut de mise à jour au renderer (si la fenêtre existe).
 * @param {{ status: string, [key: string]: unknown }} payload
 */
function sendUpdateStatus(payload) {
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send('updater:status', payload)
  }
}

/**
 * Configure electron-updater uniquement en production (app packagée).
 * En dev, les updates ne s'appliquent pas et polluent les logs.
 */
function setupAutoUpdater() {
  if (!app.isPackaged) {
    return
  }

  // Chargement lazy : évite d'exiger electron-updater en dev si non installé.
  let autoUpdater
  try {
    ;({ autoUpdater } = require('electron-updater'))
  } catch (err) {
    console.error('[updater] electron-updater introuvable:', err)
    return
  }

  // Logs utiles pour diagnostiquer un échec de publish / téléchargement.
  autoUpdater.logger = console
  autoUpdater.autoDownload = true
  autoUpdater.autoInstallOnAppQuit = true
  // Pas de pre-releases ni de downgrade silencieux.
  autoUpdater.allowPrerelease = false
  autoUpdater.allowDowngrade = false

  // Provider GitHub (public) — cohérent avec package.json → build.publish
  // et avec le fichier resources/app-update.yml embarqué au packaging.
  try {
    autoUpdater.setFeedURL({
      provider: 'github',
      owner: 'princesall',
      repo: 'univol-manager',
    })
  } catch (err) {
    console.warn('[updater] setFeedURL ignoré (config embarquée utilisée):', err)
  }

  autoUpdater.on('checking-for-update', () => {
    sendUpdateStatus({ status: 'checking', currentVersion: app.getVersion() })
  })

  autoUpdater.on('update-available', (info) => {
    sendUpdateStatus({
      status: 'available',
      version: info.version,
      releaseDate: info.releaseDate,
    })
  })

  autoUpdater.on('update-not-available', (info) => {
    sendUpdateStatus({
      status: 'not-available',
      version: info.version,
    })
  })

  autoUpdater.on('download-progress', (progress) => {
    sendUpdateStatus({
      status: 'downloading',
      percent: progress.percent,
      transferred: progress.transferred,
      total: progress.total,
      bytesPerSecond: progress.bytesPerSecond,
    })
  })

  autoUpdater.on('update-downloaded', (info) => {
    sendUpdateStatus({
      status: 'downloaded',
      version: info.version,
      releaseDate: info.releaseDate,
    })
  })

  autoUpdater.on('error', (err) => {
    sendUpdateStatus({
      status: 'error',
      message: err?.message ?? String(err),
    })
  })

  ipcMain.handle('updater:check', async () => {
    try {
      const result = await autoUpdater.checkForUpdates()
      return {
        ok: true,
        version: result?.updateInfo?.version ?? null,
      }
    } catch (err) {
      return {
        ok: false,
        message: err instanceof Error ? err.message : String(err),
      }
    }
  })

  ipcMain.handle('updater:install', () => {
    // true = force close, true = isSilent (pas de prompt OS)
    autoUpdater.quitAndInstall(false, true)
    return { ok: true }
  })

  // Première vérif peu après le démarrage (laisse la fenêtre s'afficher).
  setTimeout(() => {
    autoUpdater.checkForUpdates().catch((err) => {
      console.error('[updater] checkForUpdates échoué:', err)
    })
  }, 4000)

  // Revérifie toutes les 4 heures tant que l'app tourne.
  setInterval(
    () => {
      autoUpdater.checkForUpdates().catch(() => {})
    },
    4 * 60 * 60 * 1000,
  )
}

app.whenReady().then(() => {
  createWindow()
  setupAutoUpdater()

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})
