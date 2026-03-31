import { app, BrowserWindow, ipcMain } from 'electron'
import path from 'path'
import { Worker } from 'worker_threads'
import {
	resetPersistTimestampValueAdvanced,
	resetPersistTimestampValueBasic,
	setActivityIntervalAdvanced,
	setActivityIntervalBasic,
	setButtonsConfig,
	setClientId,
	setCycles,
	setImageCyclesConfig,
	setPartyConfig,
	setTimestampConfig,
	startDiscordRichAdvanced,
	startDiscordRichBasic,
	stopDiscordRichAdvanced,
	stopDiscordRichBasic,
} from '../discord'
import { readTimestampConfig, setActivityType } from '../discord/modules/config'
import { PartyConfig } from '../discord/modules/types'
import { fetchAuthor, UploadConfigPayload, uploadConfigToCloud } from './cloud'
import { sendLog, sendStatus } from './logging'
import { loadSettings, saveSettings } from './settings'

let autoHideOnStart = false
let smtcWorker: Worker | null = null
let lastNowPlaying: any = null

type RpcMode = 'basic' | 'advanced'

let currentRpcMode: RpcMode = 'basic'
let stopCurrentRpc: (() => void) | null = null

function startDiscordRich(sendPayload: (payload: any) => void) {
	if (stopCurrentRpc) {
		stopCurrentRpc()
		stopCurrentRpc = null
	}

	if (currentRpcMode === 'basic') {
		stopCurrentRpc = stopDiscordRichBasic
		startDiscordRichBasic(sendPayload)
	} else if (currentRpcMode === 'advanced') {
		stopCurrentRpc = stopDiscordRichAdvanced
		startDiscordRichAdvanced(sendPayload)
	}
}

function stopDiscordRich() {
	if (stopCurrentRpc) {
		stopCurrentRpc()
		stopCurrentRpc = null
	}
}

function setActivityInterval(sec: number) {
	if (currentRpcMode === 'basic') {
		setActivityIntervalBasic(sec)
	} else if (currentRpcMode === 'advanced') {
		setActivityIntervalAdvanced(sec)
	}
}

function resetPersistTimestampValue() {
	if (currentRpcMode === 'basic') {
		resetPersistTimestampValueBasic()
	} else if (currentRpcMode === 'advanced') {
		resetPersistTimestampValueAdvanced()
	}
}

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

function startSmtcWorker() {
	const workerPath = app.isPackaged
		? path.join(
				process.resourcesPath,
				'app',
				'src',
				'discord',
				'smtc-worker.js',
			)
		: path.join(process.cwd(), 'src', 'discord', 'smtc-worker.js')

	smtcWorker = new Worker(workerPath, {
		env: {
			...process.env,
		},
	})

	smtcWorker.on('message', (msg: any) => {
		if (msg && msg.type === 'nowPlaying') {
			lastNowPlaying = msg.data
		}
	})
}

export function getLastNowPlaying() {
	return lastNowPlaying
}

export function initIpc() {
	const s = loadSettings()
	autoHideOnStart = !!s.autoHideOnStart
	currentRpcMode = s.rpcMode === 'basic' ? s.rpcMode : 'advanced'

	if (currentRpcMode === 'advanced' && !smtcWorker) {
		startSmtcWorker()
	}

	ipcMain.handle('get-now-playing', async () => {
		return lastNowPlaying
	})

	ipcMain.handle('restart-discord-rich', async () => {
		const win = BrowserWindow.getAllWindows()[0]
		if (!win || win.isDestroyed()) return false

		setTimeout(() => {
			sendStatus('RESTARTING')
		}, 100)

		try {
			stopDiscordRich()

			startDiscordRich(payload => {
				if (win.isDestroyed()) return
				win.webContents.send('rpc-update', payload)
			})

			return true
		} catch (error) {
			console.error('Restart failed:', error)
			sendStatus('ERROR')
			return false
		}
	})

	ipcMain.handle('rpc:get-mode', async () => {
		return currentRpcMode
	})

	ipcMain.handle('rpc:set-mode', async (_event, mode: RpcMode) => {
		if (mode !== 'basic' && mode !== 'advanced') {
			return currentRpcMode
		}
		if (mode === currentRpcMode) return currentRpcMode

		const oldMode = currentRpcMode
		currentRpcMode = mode

		const current = loadSettings()
		saveSettings({ ...current, rpcMode: currentRpcMode })

		const win = BrowserWindow.getAllWindows()[0]
		if (!win || win.isDestroyed()) return currentRpcMode

		setTimeout(() => {
			sendStatus('RESTARTING')
			sendLog(`RPC mode changed: ${oldMode} → ${currentRpcMode}`, 'info')
		}, 100)

		stopDiscordRich()
		startDiscordRich(payload => {
			if (win.isDestroyed()) return
			win.webContents.send('rpc-update', payload)
		})

		if (oldMode === 'advanced' && mode !== 'advanced') {
			smtcWorker?.terminate()
			smtcWorker = null
		} else if (mode === 'advanced' && !smtcWorker) {
			startSmtcWorker()
		}

		return currentRpcMode
	})

	ipcMain.handle('stop-discord-rich', async () => {
		stopDiscordRich()
		sendStatus('DISABLED')
	})

	ipcMain.handle('set-client-id', async (_event, clientId: string) => {
		await setClientId(clientId)
		return true
	})

	ipcMain.handle('reset-persist-timestamp', async () => {
		const win = BrowserWindow.getAllWindows()[0]
		if (!win || win.isDestroyed()) return false

		setTimeout(() => {
			sendStatus('RESTARTING')
		}, 100)

		stopDiscordRich()
		startDiscordRich(payload => {
			if (win.isDestroyed()) return
			win.webContents.send('rpc-update', payload)
		})

		resetPersistTimestampValue()
		const cfg = await readTimestampConfig()
		cfg.persistOffsetSec = 0
		await setTimestampConfig(cfg)
		return true
	})

	ipcMain.handle('set-activity-type', async (_event, type: string) => {
		await setActivityType(type as any)
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
			}[],
		) => {
			await setImageCyclesConfig(cycles)
			return true
		},
	)

	ipcMain.handle('set-party-config', async (_event, cfg: PartyConfig) => {
		await setPartyConfig(cfg)
	})

	ipcMain.handle(
		'set-buttons',
		async (
			_event,
			pairs: {
				label1: string
				url1: string
				label2: string
				url2: string
			}[],
		) => {
			await setButtonsConfig(pairs)
			return true
		},
	)

	ipcMain.handle(
		'set-cycles',
		async (_event, entries: { details: string; state: string }[]) => {
			await setCycles(entries)
			return true
		},
	)

	ipcMain.handle('set-activity-interval', async (_event, sec: number) => {
		await setActivityInterval(sec)
		return true
	})

	ipcMain.handle(
		'cloud:uploadConfig',
		async (_event, payload: UploadConfigPayload) => {
			const user = await fetchAuthor(payload.authorId)
			if (!user || !user.name) {
				throw new Error('Author not found')
			}
			const authorName = user.name
			return uploadConfigToCloud({ ...payload, authorName })
		},
	)

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
		const s2 = loadSettings()
		autoHideOnStart = !!s2.autoHideOnStart
		return autoHideOnStart
	})

	ipcMain.handle('set-timestamp-config', async (_event, cfg) => {
		await setTimestampConfig(cfg)
		return true
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

	const win = BrowserWindow.getAllWindows()[0]
	if (win && !win.isDestroyed()) {
		setTimeout(() => {
			sendStatus('RESTARTING')
		}, 100)
		startDiscordRich(payload => {
			if (win.isDestroyed()) return
			win.webContents.send('rpc-update', payload)
		})
	}
}
