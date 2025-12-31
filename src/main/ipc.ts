import { app, BrowserWindow, ipcMain } from 'electron'
import startDiscordRich, {
	setActivityInterval,
	setButtonsConfig,
	setClientId,
	setCycles,
	setImageCyclesConfig,
	stopDiscordRich,
} from '../discord'
import { UploadConfigPayload, uploadConfigToCloud } from './cloud'
import { sendStatus } from './logging'
import { loadSettings, saveSettings } from './settings'

let autoHideOnStart = false

export function getAutoHide() {
	return autoHideOnStart
}

function setAutoLaunch(enabled: boolean) {
	app.setLoginItemSettings({
		openAtLogin: enabled,
		path: app.getPath('exe'),
		args: [],
	})
}

export function initIpc() {
	ipcMain.handle('restart-discord-rich', async () => {
		const win = BrowserWindow.getAllWindows()[0]
		if (!win || win.isDestroyed()) return

		sendStatus('RESTARTING')
		stopDiscordRich()

		startDiscordRich(payload => {
			if (win.isDestroyed()) return
			win.webContents.send('rpc-update', payload)
		})
	})

	ipcMain.handle('stop-discord-rich', async () => {
		stopDiscordRich()
		sendStatus('DISABLED')
	})

	ipcMain.handle('set-client-id', async (_event, clientId: string) => {
		await setClientId(clientId)
		return true
	})

	ipcMain.handle(
		'set-image-cycles',
		async (
			_event,
			cycles: {
				largeImage: string
				largeText: string
				smallImage: string
				smallText: string
			}[]
		) => {
			await setImageCyclesConfig(cycles)
			return true
		}
	)

	ipcMain.handle(
		'set-buttons',
		async (
			_event,
			pairs: {
				label1: string
				url1: string
				label2: string
				url2: string
			}[]
		) => {
			await setButtonsConfig(pairs)
			return true
		}
	)

	ipcMain.handle(
		'set-cycles',
		async (_event, entries: { details: string; state: string }[]) => {
			await setCycles(entries)
			return true
		}
	)

	ipcMain.handle('set-activity-interval', async (_event, sec: number) => {
		await setActivityInterval(sec)
		return true
	})

	ipcMain.handle('set-auto-launch', async (_event, enabled: boolean) => {
		setAutoLaunch(enabled)
		return true
	})

	ipcMain.handle('set-auto-hide', async (_event, enabled: boolean) => {
		autoHideOnStart = !!enabled
		const current = loadSettings()
		saveSettings({ ...current, autoHideOnStart })
		return true
	})

	ipcMain.handle('get-auto-hide', async () => {
		const s = loadSettings()
		autoHideOnStart = !!s.autoHideOnStart
		return autoHideOnStart
	})

	ipcMain.handle('window-close', () => {
		const win = BrowserWindow.getAllWindows()[0]
		if (win && !win.isDestroyed()) {
			win.close()
		}
	})

	ipcMain.handle('window-minimize', () => {
		const win = BrowserWindow.getAllWindows()[0]
		if (win && !win.isDestroyed()) {
			win.minimize()
		}
	})

	ipcMain.handle(
		'upload-config',
		async (_event, config: UploadConfigPayload) => {
			return uploadConfigToCloud(config)
		}
	)
}
