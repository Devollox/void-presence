import { autoUpdater } from 'electron-updater'
import { sendLog } from './logging'

export function setupAutoUpdater() {
	autoUpdater.on('checking-for-update', () => {
		sendLog('AutoUpdate: checking for update...', 'info')
	})

	autoUpdater.on('update-available', (info: { version: any }) => {
		sendLog(`AutoUpdate: update available ${info.version}`, 'warn')
	})

	autoUpdater.on('update-not-available', () => {
		sendLog('AutoUpdate: no update available', 'info')
	})

	autoUpdater.on('error', (err: { message: any }) => {
		sendLog(`AutoUpdate error: ${err?.message || String(err)}`, 'error')
	})

	autoUpdater.on('update-downloaded', (info: { version: any }) => {
		sendLog(`AutoUpdate: update downloaded ${info.version}`, 'success')
	})
}
