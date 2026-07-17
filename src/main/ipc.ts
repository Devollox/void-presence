import { spawn } from 'child_process'
import { app, BrowserWindow, ipcMain, shell } from 'electron'
import path from 'path'
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
import startCustomStatusWorker, { stopCustomStatusWorker } from '../discord/modules/status'
import { defaultPlugin } from '../plugins/builtin/default-plugin'
import { hardwarePlugin } from '../plugins/builtin/hardware-plugin'
import { smtcPlugin } from '../plugins/builtin/smtc-plugin'
import {
	getActivePluginId,
	getPluginInfoList,
	hotLoadPlugin,
	markPluginInstallDone,
	markPluginInstalling,
	notifyConfigChanged,
	registerPlugin,
	setPluginEnabled,
	setPluginPriority,
	startAll as startAllPlugins,
	startPluginsWatcher,
} from '../plugins/plugin-manager'
import {
	ActivityType,
	BarStyle,
	NowMode,
	PartyConfig,
	RpcPayload,
	StatusCycleEntry,
} from '../types/types'
import { UploadConfigPayload, uploadConfigToCloud, uploadStatusConfigToCloud } from './cloud'
import {
	getLanguage,
	normalizeStatuses,
	readExternalPluginsState,
	readSettings,
	readStatusCyclesConfig,
	readTimestampConfig,
	setActivityIntervalConfig,
	setActivityType,
	setBarStyle,
	setDiscordTokenConfig,
	setLanguage,
	setRpcEnabled,
	setStatusCyclesConfig,
	setStatusEnabledBrowser,
	setStatusIntervalConfig,
	writeExternalPluginsState,
	writeSettings,
	writeStatusCyclesConfig,
} from './config'
import { sendLog, sendStatus, sendStatusCustom, sendStatusCustomPayload } from './logging'
import { t } from './translations'
import { downloadFile, getInstallDir, isPortable } from './updates'

let autoHideOnStart = false
let stopCurrentRpc: (() => void) | null = null
let rpcStarted = false

registerPlugin(defaultPlugin)
registerPlugin(smtcPlugin)
registerPlugin(hardwarePlugin)

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

export function getLastHardwareStats(): null {
	return null
}

export async function initIpc() {
	const s = await readSettings()
	autoHideOnStart = !!s.autoHideOnStart

	if (s.statusEnabled) {
		sendStatusCustom('CUSTOM_STATUS_RESTART')
		sendStatusCustomPayload('RESTARTING')
		setTimeout(() => {
			startCustomStatusWorker()
		}, 2000)
	}

	void startAllPlugins().catch((e: any) => {
		sendLog(t('startAllPluginsError', { error: e?.message ?? String(e) }), 'error')
	})
	startPluginsWatcher()

	if (s.rpcEnabled) {
		rpcStarted = true
		const win = BrowserWindow.getAllWindows()[0]
		if (win && !win.isDestroyed()) {
			setTimeout(() => {
				sendStatus('RPC_RESTARTING')
			}, 100)
			startDiscordRich(payload => {
				if (win.isDestroyed()) return
				win.webContents.send('rpc-update', payload)
			})
		}
	}

	ipcMain.handle('plugins:list', () => {
		return getPluginInfoList()
	})

	ipcMain.handle('plugins:set-enabled', async (_event, id: string, enabled: boolean) => {
		if (id === 'hardware') {
			const current = await readSettings()
			await writeSettings({ ...current, hardwareMonitorEnabled: !!enabled })
		} else if (id === 'smtc') {
			const current = await readSettings()
			await writeSettings({ ...current, musicFilter: !!enabled, videoFilter: !!enabled })
		} else {
			const state = await readExternalPluginsState()
			state[id] = !!enabled
			await writeExternalPluginsState(state)
		}
		setPluginEnabled(id, enabled)
		return true
	})

	ipcMain.handle('plugins:get-active', () => {
		return getActivePluginId()
	})

	ipcMain.handle('plugins:set-priority', async (_event, pluginId: string, priority: number) => {
		setPluginPriority(pluginId, priority)
		return true
	})

	ipcMain.handle('plugins:remove', async (_event, pluginId: string) => {
		const { promises: fsp } = await import('fs')
		const pluginsRoot = path.join(app.getPath('userData'), 'plugins')

		const filePath = path.join(pluginsRoot, `${pluginId}.js`)
		const dirPath = path.join(pluginsRoot, pluginId)

		try {
			await fsp.unlink(filePath)
			return { ok: true }
		} catch (e: any) {
			if (e && (e.code === 'ENOENT' || e.code === 'EISDIR')) {
				try {
					await fsp.rm(dirPath, { recursive: true, force: true })
					return { ok: true }
				} catch (err: any) {
					sendLog(
						t('pluginRemoveFolderFailed', { id: pluginId, error: err?.message ?? String(err) }),
						'error'
					)
					return { ok: false, error: err?.message }
				}
			}

			sendLog(
				t('pluginRemoveFileFailed', { id: pluginId, error: e?.message ?? String(e) }),
				'error'
			)
			return { ok: false, error: e?.message }
		}
	})

	ipcMain.handle(
		'plugins:set-storage',
		async (_event, pluginId: string, key: string, value: string) => {
			const { promises: fsp } = await import('fs')
			const stateFile = path.join(app.getPath('userData'), `plugin-${pluginId}-state.json`)
			try {
				let data: Record<string, string> = {}
				try {
					data = JSON.parse(await fsp.readFile(stateFile, 'utf-8'))
				} catch {}
				data[key] = value
				await fsp.writeFile(stateFile, JSON.stringify(data, null, 2), 'utf-8')
			} catch {}
			return true
		}
	)

	ipcMain.handle('get-now-playing', async () => {
		return null
	})

	ipcMain.handle('restart-discord-rich', async () => {
		const s2 = await readSettings()
		if (!s2.rpcEnabled) return false

		const win = BrowserWindow.getAllWindows()[0]
		if (!win || win.isDestroyed()) return false

		setTimeout(() => {
			sendStatus('RPC_RESTARTING')
		}, 100)

		try {
			stopDiscordRich()

			startDiscordRich(payload => {
				if (win.isDestroyed()) return
				win.webContents.send('rpc-update', payload)
			})

			return true
		} catch (error) {
			sendLog(t('rpcRestartFailed', { error: String(error) }), 'error')
			sendStatus('RPC_ERROR')
			return false
		}
	})

	ipcMain.handle('stop-discord-rich', async () => {
		stopDiscordRich()
		sendStatus('RPC_DISABLED')
	})

	ipcMain.handle('set-client-id', async (_event, clientId: string) => {
		await setClientId(clientId)
		return true
	})

	ipcMain.handle('reset-persist-timestamp', async () => {
		const s3 = await readSettings()
		if (!s3.rpcEnabled) return true

		const win = BrowserWindow.getAllWindows()[0]
		if (!win || win.isDestroyed()) return false

		setTimeout(() => {
			sendStatus('RPC_RESTARTING')
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

	ipcMain.handle('set-image-cycles', async (_event, cycles: any) => {
		await setImageCyclesConfig(cycles)
		notifyConfigChanged('imageCycles')
		return true
	})

	ipcMain.handle('set-party-config', async (_event, cfg: PartyConfig) => {
		await setPartyConfig(cfg)
	})

	ipcMain.handle('set-buttons', async (_event, pairs: any) => {
		await setButtonsConfig(pairs)
		notifyConfigChanged('buttons')
		return true
	})

	ipcMain.handle('set-cycles', async (_event, entries: any) => {
		await setCycles(entries)
		notifyConfigChanged('cycles')
		return true
	})

	ipcMain.handle('set-activity-interval', async (_event, sec: number) => {
		await setActivityInterval(sec)
		await setActivityIntervalConfig(sec)
		return true
	})

	ipcMain.on('install-update', async (_event, info: any) => {
		try {
			const portable = isPortable()
			const version = info.latestTag.replace(/^v/i, '')

			sendLog(t('updateInstallRequested', { tag: info.latestTag }))

			if (!info.downloadUrl) {
				sendLog(t('updateInstallFailedNoUrl'))
				return
			}

			const { filePath } = await downloadFile(info.downloadUrl, version)

			if (portable) {
				const installDir = getInstallDir()
				const exeName = path.basename(app.getPath('exe'))
				const newExePath = path.join(installDir, exeName)

				sendLog(
					t('updateLaunchingPortableInstaller', {
						dir: installDir,
						fileName: path.basename(filePath),
					})
				)

				const args = ['/S', `/D=${installDir}`]

				const child = spawn(filePath, args)

				child.on('close', code => {
					sendLog(t('updateInstallerExited', { code: String(code ?? 'null') }))

					try {
						const restarted = spawn(newExePath, [], {
							detached: true,
							stdio: 'ignore',
						})
						restarted.unref()
						sendLog(t('updateRestartedAfterPortable'))
					} catch (e: any) {
						sendLog(t('updateFailedToRestart', { error: e?.message || String(e) }), 'error')
					}

					app.quit()
				})

				child.on('error', err => {
					sendLog(t('updateInstallerSpawnError', { error: String(err) }), 'error')
				})
			} else {
				sendLog(t('updateLaunchingInstaller', { fileName: path.basename(filePath) }))

				const child = spawn(filePath, [], {
					detached: true,
					stdio: 'ignore',
				})

				child.unref()
				app.quit()
			}
		} catch (e: any) {
			sendLog(t('updateInstallFailed', { error: e?.message || String(e) }), 'error')
			console.error('install-update error:', e)
		}
	})

	let lastPresenceUpload = 0
	let lastStatusUpload = 0

	ipcMain.handle('cloud:uploadConfig', async (_event, payload: UploadConfigPayload) => {
		const now = Date.now()
		if (now - lastPresenceUpload < 1000) {
			return {
				ok: false,
				error: 'TooManyRequests',
				message: t('cloudTooManyRequests'),
			}
		}
		lastPresenceUpload = now

		const configCloud = JSON.parse(JSON.stringify(payload.configData)) as any
		const allowedKeys = ['buttonPairs', 'cycles', 'imageCycles', 'party']
		const filteredConfigData = Object.fromEntries(
			allowedKeys.filter(key => key in configCloud).map(key => [key, configCloud[key]])
		)

		return uploadConfigToCloud({
			...payload,
			configData: filteredConfigData,
		})
	})

	ipcMain.handle('cloud:uploadStatusConfig', async (_event, payload: UploadConfigPayload) => {
		const now = Date.now()
		if (now - lastStatusUpload < 1000) {
			return {
				ok: false,
				error: 'TooManyRequests',
				message: t('cloudTooManyRequests'),
			}
		}
		lastStatusUpload = now

		const configCloud = JSON.parse(JSON.stringify(payload.configData)) as any
		const allowedKeys = ['statusCycles']
		const filteredConfigData = Object.fromEntries(
			allowedKeys.filter(key => key in configCloud).map(key => [key, configCloud[key]])
		)

		return uploadStatusConfigToCloud({
			...payload,
			configData: filteredConfigData,
		})
	})

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

	ipcMain.handle('set-timestamp-config', async (_event, cfg: any) => {
		const current = await readTimestampConfig()
		await setTimestampConfig({
			...current,
			...cfg,
			persistOffsetSec:
				typeof cfg.persistOffsetSec === 'number' && Number.isFinite(cfg.persistOffsetSec)
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

	ipcMain.handle('live-set-buttons', async (_event, pairs: any) => {
		await setButtonsConfig(pairs)
		return true
	})

	ipcMain.handle('live-set-cycles', async (_event, entries: any) => {
		await setCycles(entries)
		return true
	})

	ipcMain.handle('live-set-images', async (_event, cycles: any) => {
		await setImageCyclesConfig(cycles)
		return true
	})

	ipcMain.handle('live-set-party', async (_event, party: any) => {
		const cfg: PartyConfig = {
			entries: party.map((p: any) => ({
				sizeCurrent: p.sizeCurrent === '' ? null : Number(p.sizeCurrent),
				sizeMax: p.sizeMax === '' ? null : Number(p.sizeMax),
			})),
		}
		await setPartyConfig(cfg)
		return true
	})

	ipcMain.handle('live-set-time-cycles', async (_event, cycles: any) => {
		const current = await readTimestampConfig()
		const mapped = cycles.map((c: any) => ({
			label: c.label,
			seconds: Number(c.seconds) || 0,
		}))
		await setTimestampConfig({
			...current,
			timeCycles: mapped,
		})
		return true
	})

	ipcMain.handle('live-set-interval', async (_event, sec: number) => {
		await setActivityInterval(sec)
		await setActivityIntervalConfig(sec)
		return true
	})

	ipcMain.handle('live-set-discord-token', async (_event, token: string) => {
		await setDiscordTokenConfig(token)
		return true
	})

	ipcMain.handle('live-set-status-interval', async (_event, sec: number) => {
		await setStatusIntervalConfig(sec)
		return true
	})

	ipcMain.handle('live-set-status-cycles', async (_event, cycles: StatusCycleEntry[]) => {
		const normalized = normalizeStatuses(cycles)
		await setStatusCyclesConfig(normalized)
		return true
	})

	ipcMain.handle('settings:set-status-enabled', async (_event, enabled: boolean) => {
		const current = await readSettings()
		const next = { ...current, statusEnabled: !!enabled }
		await writeSettings(next)

		if (next.statusEnabled) {
			startCustomStatusWorker()
		} else {
			stopCustomStatusWorker()
		}

		return true
	})

	ipcMain.handle('live-set-timestamp', async (_event, cfg: any) => {
		const current = await readTimestampConfig()
		const oldMode = current.mode
		const mode = cfg.mode === 'range' || cfg.mode === 'persist' ? cfg.mode : 'now'
		const rangeMin = cfg.rangeMin.trim() === '' ? null : Number(cfg.rangeMin)
		const rangeMax = cfg.rangeMax.trim() === '' ? null : Number(cfg.rangeMax)
		const nowMode: NowMode =
			cfg.nowMode === 'progress' || cfg.nowMode === 'cycles' ? (cfg.nowMode as NowMode) : 'plain'

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
	})

	ipcMain.handle('open-discord-author-id', async () => {
		try {
			await shell.openExternal('https://voidpresence.site/profile')
		} catch (error) {
			sendLog(t('failedToOpenBrowser', { error: String(error) }), 'error')
		}
	})

	ipcMain.handle('open-discord-client-id', async () => {
		try {
			await shell.openExternal('https://discord.com/developers/applications')
		} catch (error) {
			sendLog(t('failedToOpenBrowser', { error: String(error) }), 'error')
		}
	})

	ipcMain.handle('open-discord-token-id', async () => {
		try {
			await shell.openExternal('https://www.youtube.com/watch?v=GUqSNoJ28aU')
		} catch (error) {
			sendLog(t('failedToOpenBrowser', { error: String(error) }), 'error')
		}
	})

	ipcMain.handle('open-discord-token-error-id', async () => {
		try {
			await shell.openExternal(
				'https://www.reddit.com/r/discordapp/comments/sc61n3/comment/hu4fw5x/'
			)
		} catch (error) {
			sendLog(t('failedToOpenBrowser', { error: String(error) }), 'error')
		}
	})

	ipcMain.handle('support:open-site', async () => {
		try {
			await shell.openExternal('https://voidpresence.site/docs')
			return true
		} catch (error) {
			sendLog(t('failedToOpenBrowser', { error: String(error) }), 'error')
			return false
		}
	})

	ipcMain.handle('support:open-discord', async () => {
		try {
			await shell.openExternal('https://discord.gg/xHJrCNA8y5')
			return true
		} catch (error) {
			sendLog(t('failedToOpenBrowser', { error: String(error) }), 'error')
			return false
		}
	})

	ipcMain.handle('shell:open-external', async (_event, url: string) => {
		try {
			const parsed = new URL(url)
			if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') return false
			await shell.openExternal(url)
			return true
		} catch (error) {
			sendLog(t('failedToOpenBrowser', { error: String(error) }), 'error')
			return false
		}
	})

	ipcMain.handle('logs:clear', async () => {
		const win = BrowserWindow.getAllWindows()[0]
		if (win && !win.isDestroyed()) {
			win.webContents.send('logs:clear')
		}
		return true
	})

	ipcMain.handle('logs:download', async () => {
		const win = BrowserWindow.getAllWindows()[0]
		if (win && !win.isDestroyed()) {
			win.webContents.send('logs:download')
		}
		return true
	})

	ipcMain.handle('settings:set-music-filter', async (_event, enabled: boolean) => {
		const current = await readSettings()
		const next = { ...current, musicFilter: !!enabled }
		await writeSettings(next)
		setPluginEnabled('smtc', !!(next.musicFilter || next.videoFilter))
		return true
	})

	ipcMain.handle('settings:set-video-filter', async (_event, enabled: boolean) => {
		const current = await readSettings()
		const next = { ...current, videoFilter: !!enabled }
		await writeSettings(next)
		setPluginEnabled('smtc', !!(next.musicFilter || next.videoFilter))
		return true
	})

	ipcMain.handle('settings:set-automatic-activity', async (_event, enabled: boolean) => {
		const current = await readSettings()
		await writeSettings({ ...current, activityFilter: !!enabled })
		return true
	})

	ipcMain.handle('settings:set-cover-fetch', async (_event, enabled: boolean) => {
		const current = await readSettings()
		await writeSettings({ ...current, coverFetchEnabled: !!enabled })
		return true
	})

	ipcMain.handle('settings:set-hardware-monitor', async (_event, enabled: boolean) => {
		const current = await readSettings()
		await writeSettings({ ...current, hardwareMonitorEnabled: !!enabled })
		setPluginEnabled('hardware', !!enabled)
		return true
	})

	ipcMain.handle('settings:set-status-enabled-browser', async (_event, enabled) => {
		await setStatusEnabledBrowser(enabled)
		stopCustomStatusWorker()

		sendStatusCustom('CUSTOM_STATUS_RESTART')
		sendStatusCustomPayload('RESTARTING')

		setTimeout(() => {
			startCustomStatusWorker()
		}, 2000)
	})

	ipcMain.handle('use-ready-client-id', async () => {
		const readyId = '1492470601686847598'

		await setClientId(readyId)

		const win = BrowserWindow.getAllWindows()[0]
		if (!win || win.isDestroyed()) return true

		setTimeout(() => {
			sendStatus('RPC_RESTARTING')
		}, 100)

		stopDiscordRich()

		setTimeout(() => {
			startDiscordRich(payload => {
				if (win.isDestroyed()) return
				win.webContents.send('rpc-update', payload)
			})
		}, 2000)

		sendLog(t('usedReadyClientId', { clientId: readyId }))
		return true
	})

	ipcMain.handle('use-recent-client-id', async (_event, clientId: string) => {
		const s4 = await readSettings()
		if (!s4.rpcEnabled) return true

		await setClientId(clientId)

		const win = BrowserWindow.getAllWindows()[0]
		if (!win || win.isDestroyed()) return true

		setTimeout(() => {
			sendStatus('RPC_RESTARTING')
		}, 100)

		stopDiscordRich()

		setTimeout(() => {
			startDiscordRich(payload => {
				if (win.isDestroyed()) return
				win.webContents.send('rpc-update', payload)
			})
		}, 2000)

		sendLog(t('usedRecentClientId', { clientId }))
		return true
	})

	ipcMain.handle('set-bar-style-config', async (_event, barStyle: BarStyle) => {
		await setBarStyle(barStyle)
	})

	ipcMain.handle('status:get-current', async () => {
		const statusCfg = await readStatusCyclesConfig()
		const fromFile = normalizeStatuses(statusCfg?.cycles)
		if (fromFile.length) return fromFile

		const settings = await readSettings()
		const fromSettings = normalizeStatuses(
			(settings as any)?.statusCycles || (settings as any)?.customStatuses
		)
		return fromSettings
	})

	ipcMain.handle('status:set-current', async (_event, cycles: StatusCycleEntry[]) => {
		const normalized = normalizeStatuses(cycles)
		await writeStatusCyclesConfig({ cycles: normalized })
		return true
	})

	ipcMain.handle('get-language', async () => {
		return await getLanguage()
	})

	ipcMain.handle('set-language', async (_event, lang: string) => {
		if (lang === 'ru' || lang === 'en' || lang === 'tr') {
			await setLanguage(lang)

			BrowserWindow.getAllWindows().forEach(win => {
				if (!win.isDestroyed()) {
					win.webContents.send('language-changed', lang)
				}
			})
			return lang
		}
		return await getLanguage()
	})

	ipcMain.handle('settings:set-rpc-enabled', async (_e, enabled: boolean) => {
		await setRpcEnabled(enabled)

		if (enabled) {
			const win = BrowserWindow.getAllWindows()[0]
			if (!win || win.isDestroyed()) return true

			setTimeout(() => {
				sendStatus('RPC_RESTARTING')
			}, 100)

			stopDiscordRich()

			setTimeout(() => {
				startDiscordRich(payload => {
					if (win.isDestroyed()) return
					win.webContents.send('rpc-update', payload)
				})
			}, 2000)
		} else {
			stopDiscordRich()
			sendStatus('RPC_DISABLED')

			rpcStarted = false
		}
	})

	ipcMain.handle('custom-status:restart', async () => {
		stopCustomStatusWorker()

		sendStatusCustom('CUSTOM_STATUS_RESTART')
		sendStatusCustomPayload('RESTARTING')

		setTimeout(() => {
			startCustomStatusWorker()
		}, 2000)

		return true
	})

	ipcMain.handle('plugins:install-from-url', async (_event, pluginUrl: string, isZip = false) => {
		try {
			const { promises: fsp } = await import('fs')
			const https = await import('https')
			const http = await import('http')

			const pluginsDir = path.join(app.getPath('userData'), 'plugins')
			await fsp.mkdir(pluginsDir, { recursive: true })

			const downloadToBuffer = (url: string): Promise<Buffer> =>
				new Promise((resolve, reject) => {
					const proto = url.startsWith('https') ? https : http
					const chunks: Buffer[] = []
					const req = proto.get(url, { headers: { 'User-Agent': 'void-presence' } }, (res: any) => {
						if (res.statusCode === 301 || res.statusCode === 302) {
							downloadToBuffer(res.headers.location).then(resolve).catch(reject)
							return
						}
						if (res.statusCode !== 200) {
							reject(new Error(`HTTP ${res.statusCode} for ${url}`))
							return
						}
						res.on('data', (c: Buffer) => chunks.push(c))
						res.on('end', () => resolve(Buffer.concat(chunks)))
					})
					req.on('error', reject)
				})

			const ghTreeMatch = pluginUrl.match(
				/^https:\/\/github\.com\/([^/]+)\/([^/]+)\/tree\/([^/]+)\/(.+)$/
			)

			if (isZip || ghTreeMatch) {
				let apiUrl: string
				let pluginId: string

				if (ghTreeMatch) {
					const [, owner, repo, branch, folderPath] = ghTreeMatch
					pluginId = folderPath.split('/').pop() || 'plugin'
					apiUrl = `https://api.github.com/repos/${owner}/${repo}/contents/${folderPath}?ref=${branch}`
				} else {
					const urlObj = new URL(pluginUrl)
					pluginId =
						urlObj.pathname
							.split('/')
							.pop()
							?.replace(/\.zip$/, '') || 'plugin'

					const m = pluginUrl.match(
						/raw\.githubusercontent\.com\/([^/]+)\/([^/]+)\/([^/]+)\/(.+?)\/[^/]+\.zip/
					)
					if (!m) throw new Error(`Cannot parse folder URL: ${pluginUrl}`)
					const [, owner, repo, branch, folderPath] = m
					apiUrl = `https://api.github.com/repos/${owner}/${repo}/contents/${folderPath}/${pluginId}?ref=${branch}`
				}

				const destDir = path.join(pluginsDir, pluginId)
				await fsp.mkdir(destDir, { recursive: true })

				markPluginInstalling(pluginId)
				sendLog(t('pluginInstallDownloadingFolder', { id: pluginId }), 'info')

				async function downloadDir(apiDirUrl: string, localDir: string): Promise<void> {
					const buf = await downloadToBuffer(apiDirUrl)
					const items = JSON.parse(buf.toString('utf-8'))
					if (!Array.isArray(items)) {
						throw new Error(`Unexpected API response from ${apiDirUrl}`)
					}

					await fsp.mkdir(localDir, { recursive: true })

					for (const item of items) {
						const localPath = path.join(localDir, item.name)
						if (item.type === 'dir') {
							await downloadDir(item.url, localPath)
						} else if (item.type === 'file' && item.download_url) {
							const fileBuf = await downloadToBuffer(item.download_url)
							await fsp.writeFile(localPath, fileBuf)
							sendLog(t('pluginInstallFileProgress', { path: item.path }), 'info')
						}
					}
				}

				try {
					await downloadDir(apiUrl, destDir)
					await fsp.unlink(path.join(destDir, '.rebuilt')).catch(() => {})

					sendLog(t('pluginInstallFolderDone', { dir: destDir }), 'success')

					try {
						await hotLoadPlugin(path.join(destDir, 'index.js'), pluginId, destDir)
					} catch (e: any) {
						sendLog(t('pluginInstallLoadFailed', { error: e?.message ?? String(e) }), 'warn')
					}
				} finally {
					markPluginInstallDone(pluginId)
				}

				return { ok: true, path: destDir, folder: true }
			}

			const urlObj = new URL(pluginUrl)
			const rawName = urlObj.pathname.split('/').pop() || 'plugin'
			const fileName = rawName.endsWith('.js') ? rawName : `${rawName}.js`
			const destPath = path.join(pluginsDir, fileName)

			sendLog(t('pluginMgrDownloadingFromUrl', { url: pluginUrl }), 'info')
			const buf = await downloadToBuffer(pluginUrl)
			await fsp.writeFile(destPath, buf)

			sendLog(t('pluginMgrSavedFile', { path: destPath }), 'success')

			const pluginId = fileName.replace(/\.js$/, '')
			try {
				await hotLoadPlugin(destPath, pluginId, null)
			} catch (e: any) {
				sendLog(
					t('pluginMgrHotLoadFailed', { name: pluginId, error: e?.message ?? String(e) }),
					'warn'
				)
			}

			return { ok: true, path: destPath, folder: false }
		} catch (e: any) {
			sendLog(t('pluginMgrInstallFailedGeneric', { error: e?.message ?? String(e) }), 'error')
			return { ok: false, error: e?.message ?? String(e) }
		}
	})

	ipcMain.handle('custom-status:stop', async () => {
		stopCustomStatusWorker()

		sendStatusCustom('CUSTOM_STATUS_DISABLED')
		sendStatusCustomPayload('IDLE')

		return true
	})

	const win = BrowserWindow.getAllWindows()[0]
	if (win && !win.isDestroyed()) {
		win.webContents.on('ipc-message', () => {})
	}
}
