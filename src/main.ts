import { app } from 'electron'
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

	const win = createMainWindow(autoHideOnStart, () => isQuitting)

	createTray(
		() => {
			const win = createMainWindow(getAutoHide(), () => isQuitting)

			win.webContents.once('did-finish-load', () => {
				checkForUpdates()
			})

			return win
		},
		() => {
			isQuitting = true
		}
	)

	if (win) {
		win.webContents.once('did-finish-load', () => {
			checkForUpdates()
		})
	} else {
		checkForUpdates()
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
