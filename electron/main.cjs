const { app, BrowserWindow } = require('electron')
const path = require('node:path')

const DEV_URL = process.env.ELECTRON_START_URL

function createWindow() {
  const win = new BrowserWindow({
    width: 1360,
    height: 860,
    minWidth: 960,
    minHeight: 640,
    title: 'UniVol Manager',
    icon: path.join(__dirname, '..', 'public', 'icon-512.png'),
    backgroundColor: '#FBF9F4',
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
    },
    autoHideMenuBar: true,
  })

  if (DEV_URL) {
    win.loadURL(DEV_URL)
  } else {
    // Build de production : charge les fichiers statiques générés par Vite.
    // L'app utilise HashRouter (voir src/App.tsx) pour que la navigation
    // fonctionne correctement en chargement local file://.
    win.loadFile(path.join(__dirname, '..', 'dist', 'index.html'))
  }
}

app.whenReady().then(() => {
  createWindow()

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})
