import { app } from 'electron'
import { decodeEnv } from './main/cloud'
import { readSettings } from './main/config'
import { getAutoHide, initIpc } from './main/ipc'
import { createTray } from './main/tray'
import { checkForUpdates } from './main/updates'
import { createMainWindow } from './main/window'

let isQuitting = false
let mainWindow: Electron.BrowserWindow | null = null

const gotTheLock = app.requestSingleInstanceLock()
if (!gotTheLock) {
	app.quit()
	process.exit(0)
}

app.on('second-instance', () => {
	if (mainWindow && !mainWindow.isDestroyed()) {
		if (mainWindow.isMinimized()) mainWindow.restore()
		mainWindow.show()
		mainWindow.focus()
	}
})

decodeEnv()

app.on('before-quit', () => {
	isQuitting = true
})

app.whenReady().then(async () => {
	const initialSettings = await readSettings()
	const autoHideOnStart = !!initialSettings.autoHideOnStart

	mainWindow = createMainWindow(autoHideOnStart, () => isQuitting)

	initIpc()

	createTray(
		() => {
			if (mainWindow && !mainWindow.isDestroyed()) {
				mainWindow.show()
				mainWindow.focus()
			}
			return mainWindow
		},
		() => {
			isQuitting = true
		},
	)

	if (mainWindow) {
		mainWindow.webContents.once('did-finish-load', () => {
			checkForUpdates({ log: true })
		})
	} else {
		checkForUpdates({ log: true })
	}
})

app.on('activate', () => {
	if (!getAutoHide() && !mainWindow) {
		mainWindow = createMainWindow(getAutoHide(), () => isQuitting)
	}
})

app.on('window-all-closed', () => {
	if (process.platform !== 'darwin') {
		app.quit()
	}
})
