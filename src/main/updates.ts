import { app, BrowserWindow, dialog } from 'electron'
import { autoUpdater } from 'electron-updater'
import { updateElectronApp, UpdateSourceType } from 'update-electron-app'
import { sendLog } from './logging'

let mainWindow: BrowserWindow | null = null

export function setMainWindow(win: BrowserWindow) {
	mainWindow = win
}

function logInfo(msg: string) {
	sendLog(msg)
}

function logWarn(msg: string) {
	sendLog(msg, 'warn')
}

function logError(msg: string) {
	sendLog(msg, 'error')
}

function setupAutoUpdaterEvents() {
	autoUpdater.on('checking-for-update', () => {
		logInfo('Checking for update...')
	})

	autoUpdater.on('update-available', info => {
		logInfo(`Update available: ${info.version}`)
	})

	autoUpdater.on('update-not-available', () => {
		logInfo('No update available (up to date)')
	})

	autoUpdater.on('error', err => {
		logError(`Auto-updater error: ${String(err)}`)
	})

	autoUpdater.on('download-progress', progress => {
		const speedKb = Math.round(progress.bytesPerSecond / 1024)
		const msg =
			`Downloading update: ${progress.percent.toFixed(1)}% ` +
			`(${progress.transferred}/${progress.total}), ` +
			`speed ${speedKb} kB/s`
		logInfo(msg)
	})

	autoUpdater.on('update-downloaded', async info => {
		logInfo(`Update downloaded: ${info.version}`)

		const result = await dialog.showMessageBox({
			type: 'info',
			buttons: ['Restart now', 'Later'],
			defaultId: 0,
			cancelId: 1,
			title: 'Void Presence update',
			message: `New version ${info.version} downloaded`,
			detail: 'Restart now to install the update.',
		})

		if (result.response === 0) {
			autoUpdater.quitAndInstall()
		} else {
			logInfo('User chose to install update later')
		}
	})
}

export function initAutoUpdate() {
	setupAutoUpdaterEvents()

	logInfo('initAutoUpdate: before updateElectronApp')

	updateElectronApp({
		updateSource: {
			type: UpdateSourceType.ElectronPublicUpdateService,
			repo: 'Devollox/void-presence',
		},
		updateInterval: '1 hour',
		logger: {
			info: logInfo,
			warn: logWarn,
			error: logError,
			log: logInfo,
		},
	})

	logInfo('initAutoUpdate: after updateElectronApp')
	logInfo(`Void Presence v${app.getVersion()} – auto-update initialized`)
}
