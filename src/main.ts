import { app } from 'electron'
import { decodeEnv } from './main/cloud'
import { getAutoHide, initIpc } from './main/ipc'
import { sendLog } from './main/logging'
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

	if (!autoHideOnStart) {
		createMainWindow(autoHideOnStart, () => isQuitting)
	}

	createTray(
		() => createMainWindow(getAutoHide(), () => isQuitting),
		() => {
			isQuitting = true
		}
	)

	sendLog(`Void Presence v${app.getVersion()}`)
	checkForUpdates()
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
