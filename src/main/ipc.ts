import { spawn } from 'child_process'
import { app, BrowserWindow, ipcMain, shell } from 'electron'
import path from 'path'
import { Worker } from 'worker_threads'
import {
	resetPersistTimestampValueAdvanced,
	setActivityIntervalAdvanced,
	setButtonsConfig,
	setClientId,
	setCycles,
	setImageCyclesConfig,
	setPartyConfig,
	setTimestampConfig,
	startDiscordRichAdvanced,
	stopDiscordRichAdvanced,
} from '../discord'
import {
	ActivityType,
	NowMode,
	NowPlayingData,
	PartyConfig,
	RpcPayload,
} from '../types/types'
import { fetchAuthor, UploadConfigPayload, uploadConfigToCloud } from './cloud'
import {
	readFiltersState,
	readSettings,
	readTimestampConfig,
	setActivityIntervalConfig,
	setActivityType,
	writeSettings,
} from './config'
import { sendLog, sendStatus } from './logging'
import { downloadFile, isPortable } from './updates'

let autoHideOnStart = false
let smtcWorker: Worker | null = null
let lastNowPlaying: NowPlayingData | null = null
let stopCurrentRpc: (() => void) | null = null

function startDiscordRich(sendPayload: (payload: RpcPayload) => void) {
	if (stopCurrentRpc) {
		stopCurrentRpc()
		stopCurrentRpc = null
	}

	stopCurrentRpc = stopDiscordRichAdvanced
	startDiscordRichAdvanced(sendPayload)
}

function stopDiscordRich() {
	if (stopCurrentRpc) {
		stopCurrentRpc()
		stopCurrentRpc = null
	}
}

function setActivityInterval(sec: number) {
	setActivityIntervalAdvanced(sec)
}

function resetPersistTimestampValue() {
	resetPersistTimestampValueAdvanced()
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
				'workers',
				'smtc-worker.js',
			)
		: path.join(process.cwd(), 'src', 'discord', 'workers', 'smtc-worker.js')

	if (!smtcWorker) {
		smtcWorker = new Worker(workerPath, { env: { ...process.env } })
	}

	smtcWorker.removeAllListeners('message')

	smtcWorker.on('message', async msg => {
		if (!msg || typeof msg !== 'object') return

		if (msg.type === 'smtcError') {
			return
		}

		if (msg.type !== 'nowPlaying') return

		const { musicFilter, videoFilter } = await readFiltersState()

		const haveAnyFilter = !!musicFilter || !!videoFilter
		if (!haveAnyFilter) {
			lastNowPlaying = null
			return
		}

		const isMusic =
			msg.data?.isThumbMusic === true && msg.data?.isThumbVideo !== true
		const isVideo =
			msg.data?.isThumbVideo === true && msg.data?.isThumbMusic !== true

		if (musicFilter && !videoFilter && !isMusic) {
			lastNowPlaying = null
			return
		}

		if (!musicFilter && videoFilter && !isVideo) {
			lastNowPlaying = null
			return
		}

		lastNowPlaying = msg.data
	})

	smtcWorker.on('error', err => {
		console.error('SMTC worker error:', err)
	})

	smtcWorker.on('exit', code => {
		console.error('SMTC worker exited with code', code)
		smtcWorker = null
	})
}

export function getLastNowPlaying() {
	return lastNowPlaying
}

async function refreshSmtcWorkerIfNeeded() {
	const s = await readSettings()
	const shouldUseSmtc = s.musicFilter || s.videoFilter

	if (shouldUseSmtc && !smtcWorker) {
		startSmtcWorker()
	}

	if (!shouldUseSmtc && smtcWorker) {
		smtcWorker.terminate()
		smtcWorker = null
		lastNowPlaying = null
	}
}

export async function initIpc() {
	const s = await readSettings()
	autoHideOnStart = !!s.autoHideOnStart

	const shouldUseSmtc = s.musicFilter || s.videoFilter
	if (shouldUseSmtc && !smtcWorker) {
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

		resetPersistTimestampValue()
		const cfg = await readTimestampConfig()
		cfg.persistOffsetSec = 0
		await setTimestampConfig(cfg)

		setTimeout(() => {
			startDiscordRich(payload => {
				if (win.isDestroyed()) return
				win.webContents.send('rpc-update', payload)
			})
		}, 2000)

		return true
	})

	ipcMain.handle('set-activity-type', async (_event, type: string) => {
		await setActivityType(type as ActivityType)
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
		await setActivityIntervalConfig(sec)
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
		const current = await readSettings()
		await writeSettings({ ...current, autoHideOnStart })
		return true
	})

	ipcMain.handle('get-auto-hide', async () => {
		const s2 = await readSettings()
		autoHideOnStart = !!s2.autoHideOnStart
		return autoHideOnStart
	})

	ipcMain.handle('set-timestamp-config', async (_event, cfg) => {
		const current = await readTimestampConfig()

		await setTimestampConfig({
			...current,
			...cfg,
			persistOffsetSec:
				typeof cfg.persistOffsetSec === 'number' &&
				Number.isFinite(cfg.persistOffsetSec)
					? cfg.persistOffsetSec
					: current.persistOffsetSec,
		})

		return true
	})

	ipcMain.handle('window-close', () => {
		const win = BrowserWindow.getAllWindows()[0]
		if (win && !win.isDestroyed()) {
			win.close()
		}
	})

	ipcMain.handle('window-toggle-maximize', () => {
		const win = BrowserWindow.getAllWindows()[0]
		if (!win || win.isDestroyed()) return
		if (win.isMaximized()) {
			win.unmaximize()
		} else {
			win.maximize()
		}
	})

	ipcMain.handle('window-minimize', () => {
		const win = BrowserWindow.getAllWindows()[0]
		if (win && !win.isDestroyed()) {
			win.minimize()
		}
	})

	ipcMain.handle('live-set-client-id', async (_event, clientId: string) => {
		await setClientId(clientId)
		return true
	})

	ipcMain.handle(
		'live-set-buttons',
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
		'live-set-cycles',
		async (_event, entries: { details: string; state: string }[]) => {
			await setCycles(entries)
			return true
		},
	)

	ipcMain.handle(
		'live-set-images',
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

	ipcMain.handle(
		'live-set-party',
		async (
			_event,
			party: {
				sizeCurrent: string
				sizeMax: string
			}[],
		) => {
			const cfg: PartyConfig = {
				entries: party.map(p => ({
					sizeCurrent: p.sizeCurrent === '' ? null : Number(p.sizeCurrent),
					sizeMax: p.sizeMax === '' ? null : Number(p.sizeMax),
				})),
			}
			await setPartyConfig(cfg)
			return true
		},
	)

	ipcMain.handle(
		'live-set-time-cycles',
		async (
			_event,
			cycles: {
				label: string
				seconds: string
			}[],
		) => {
			const current = await readTimestampConfig()
			const mapped = cycles.map(c => ({
				label: c.label,
				seconds: Number(c.seconds) || 0,
			}))
			await setTimestampConfig({
				...current,
				timeCycles: mapped,
			})
			return true
		},
	)

	ipcMain.handle('live-set-interval', async (_event, sec: number) => {
		await setActivityInterval(sec)
		await setActivityIntervalConfig(sec)
		return true
	})

	ipcMain.handle(
		'live-set-timestamp',
		async (
			_event,
			cfg: {
				mode: string
				rangeMin: string
				rangeMax: string
				nowMode: string
			},
		) => {
			const current = await readTimestampConfig()
			const oldMode = current.mode

			const mode =
				cfg.mode === 'range' || cfg.mode === 'persist' ? cfg.mode : 'now'
			const rangeMin = cfg.rangeMin.trim() === '' ? null : Number(cfg.rangeMin)
			const rangeMax = cfg.rangeMax.trim() === '' ? null : Number(cfg.rangeMax)
			const nowMode: NowMode =
				cfg.nowMode === 'progress' || cfg.nowMode === 'cycles'
					? (cfg.nowMode as NowMode)
					: 'plain'

			await setTimestampConfig({
				...current,
				mode,
				rangeMin,
				rangeMax,
				nowMode,
			})

			const switchedPersistOn = oldMode !== 'persist' && mode === 'persist'
			const switchedPersistOff = oldMode === 'persist' && mode !== 'persist'

			if (switchedPersistOn || switchedPersistOff) {
				const win = BrowserWindow.getAllWindows()[0]
				if (!win || win.isDestroyed()) return true
			}

			return true
		},
	)

	ipcMain.handle('open-discord-author-id', async () => {
		try {
			await shell.openExternal('https://voidpresence.site/profile')
		} catch (error) {
			console.error('Failed to open browser:', error)
		}
	})

	ipcMain.handle('open-discord-client-id', async () => {
		try {
			await shell.openExternal('https://discord.com/developers/applications')
		} catch (error) {
			console.error('Failed to open browser:', error)
		}
	})

	ipcMain.handle(
		'settings:set-music-filter',
		async (_event, enabled: boolean) => {
			const current = await readSettings()
			await writeSettings({ ...current, musicFilter: !!enabled })

			refreshSmtcWorkerIfNeeded()
			return true
		},
	)

	ipcMain.handle(
		'settings:set-video-filter',
		async (_event, enabled: boolean) => {
			const current = await readSettings()
			await writeSettings({ ...current, videoFilter: !!enabled })

			refreshSmtcWorkerIfNeeded()
			return true
		},
	)

	ipcMain.handle(
		'settings:set-automatic-activity',
		async (_event, enabled: boolean) => {
			const current = await readSettings()
			await writeSettings({ ...current, activityFilter: !!enabled })
			return true
		},
	)

	ipcMain.handle(
		'settings:set-cover-fetch',
		async (_event, enabled: boolean) => {
			const current = await readSettings()
			await writeSettings({ ...current, coverFetchEnabled: !!enabled })
			return true
		},
	)

	ipcMain.on('install-update', async (_event, info) => {
		try {
			const portable = isPortable()
			const version = info.latestTag.replace(/^v/i, '')

			sendLog(`Install update requested: ${info.latestTag}`)

			if (!info.downloadUrl) {
				sendLog('Update install failed: no download URL')
				return
			}

			const { filePath } = await downloadFile(info.downloadUrl, version)

			if (portable) {
				const installDir = path.dirname(process.execPath)
				const exeName = path.basename(process.execPath)
				const newExePath = path.join(installDir, exeName)

				sendLog(
					`Launching portable installer silently to ${installDir}: ${path.basename(
						filePath,
					)}`,
				)

				const child = spawn(filePath, ['/S', `/D=${installDir}`])

				child.on('close', code => {
					sendLog(`Installer exited with code ${code ?? 'null'}`)

					try {
						const restarted = spawn(newExePath, [], {
							detached: true,
							stdio: 'ignore',
						})
						restarted.unref()
						sendLog('Restarted Void Presence after portable update')
					} catch (e: any) {
						sendLog(
							`Failed to restart after update: ${e?.message || String(e)}`,
							'error',
						)
					}

					app.quit()
				})
			} else {
				sendLog(`Launching installer: ${path.basename(filePath)}`)

				const child = spawn(filePath, [], {
					detached: true,
					stdio: 'ignore',
				})

				child.unref()
				app.quit()
			}
		} catch (e: any) {
			sendLog(`Update install failed: ${e?.message || String(e)}`, 'error')
			console.error('install-update error:', e)
		}
	})

	ipcMain.handle('use-ready-client-id', async () => {
		const readyId = '1492470601686847598'

		await setClientId(readyId)

		const win = BrowserWindow.getAllWindows()[0]
		if (!win || win.isDestroyed()) return true

		setTimeout(() => {
			sendStatus('RESTARTING')
		}, 100)

		stopDiscordRich()

		setTimeout(() => {
			startDiscordRich(payload => {
				if (win.isDestroyed()) return
				win.webContents.send('rpc-update', payload)
			})
		}, 2000)

		sendLog(`Used ready Client ID: ${readyId}`)
		return true
	})

	ipcMain.handle('use-recent-client-id', async (_event, clientId: string) => {
		await setClientId(clientId)

		const win = BrowserWindow.getAllWindows()[0]
		if (!win || win.isDestroyed()) return true

		setTimeout(() => {
			sendStatus('RESTARTING')
		}, 100)

		stopDiscordRich()

		setTimeout(() => {
			startDiscordRich(payload => {
				if (win.isDestroyed()) return
				win.webContents.send('rpc-update', payload)
			})
		}, 2000)

		sendLog(`Used recent Client ID: ${clientId}`)
		return true
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
