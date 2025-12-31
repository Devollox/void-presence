import { app } from 'electron'
import { setupAutoUpdater } from './main/autoupdater'
import { decodeEnv } from './main/cloud'
import { getAutoHide, initIpc } from './main/ipc'
import { loadSettings } from './main/settings'
import { createTray } from './main/tray'
import { checkForUpdates } from './main/updates'
import { createMainWindow } from './main/window'

let isQuitting = false

decodeEnv()
initIpc()

app.on('before-quit', () => {
	isQuitting = true
})

app.whenReady().then(() => {
	const initialSettings = loadSettings()
	const autoHideOnStart = !!initialSettings.autoHideOnStart

	let win: Electron.BrowserWindow | null = null

	if (!autoHideOnStart) {
		win = createMainWindow(autoHideOnStart, () => isQuitting)
	}

	createTray(
		() => createMainWindow(getAutoHide(), () => isQuitting),
		() => {
			isQuitting = true
		}
	)

	const runVersionCheck = () => {
		checkForUpdates()
	}

	if (win) {
		win.webContents.once('did-finish-load', () => {
			runVersionCheck()
		})
	} else {
		runVersionCheck()
	}

	if (app.isPackaged) {
		setupAutoUpdater()
	}
})

app.on('activate', () => {
	if (!getAutoHide()) {
		createMainWindow(getAutoHide(), () => isQuitting)
	}
})

app.on('window-all-closed', () => {
	if (process.platform !== 'darwin') {
		app.quit()
	}
})
