import { spawn } from 'child_process'
import { app, BrowserWindow } from 'electron'
import { promises as fs, watch } from 'fs'
import path from 'path'
import { readExternalPluginsState, readFiltersState, readSettings } from '../main/config'
import { sendLog } from '../main/logging'
import { t } from '../main/translations'
import type { PresencePayload } from '../types/types'
import type { PluginContext, PluginInfo, VoidPlugin } from './plugin-types'

const registry: VoidPlugin[] = []
const enabledState = new Map<string, boolean>()
const pluginDirMap = new Map<string, string | null>()
const installingPlugins = new Set<string>()

export function markPluginInstalling(id: string): void {
	installingPlugins.add(id)
}

export function markPluginInstallDone(id: string): void {
	installingPlugins.delete(id)
}

function getWin() {
	return BrowserWindow.getAllWindows()[0] ?? null
}

function switchToLogs() {
	const win = getWin()
	if (win && !win.isDestroyed()) {
		win.webContents.send('ACTIVATE_VIEW_FROM_PROTOCOL', { view: 'logs' })
	}
}

function sendToast(message: string) {
	const win = getWin()
	if (win && !win.isDestroyed()) {
		win.webContents.send('plugin:toast', { message })
	}
}

function sendPluginsUpdate() {
	const win = getWin()
	if (win && !win.isDestroyed()) {
		win.webContents.send('plugin:list-updated', getPluginInfoList())
	}
}

async function npmInstall(pluginDir: string): Promise<void> {
	return new Promise((resolve, reject) => {
		sendLog(t('pluginMgrInstallingDeps', { dir: pluginDir }), 'info')
		switchToLogs()

		const cmd =
			process.platform === 'win32'
				? `npm.cmd install --prefer-offline`
				: `npm install --prefer-offline`

		const child = spawn(cmd, [], {
			cwd: pluginDir,
			stdio: ['ignore', 'pipe', 'pipe'],
			shell: true,
		})

		child.stdout?.on('data', (data: Buffer) => {
			const line = data.toString().trim()
			if (line) sendLog(`${line}`, 'info')
		})

		child.stderr?.on('data', (data: Buffer) => {
			const line = data.toString().trim()
			if (line) sendLog(`${line}`, 'warn')
		})

		child.on('close', code => {
			if (code === 0) {
				sendLog(t('pluginMgrDepsInstalled'), 'success')
				resolve()
			} else {
				reject(new Error(t('pluginMgrInstallFailed', { code: String(code) })))
			}
		})

		child.on('error', reject)
	})
}

async function hasNativeModules(dir: string): Promise<boolean> {
	try {
		const entries = await fs.readdir(dir, { withFileTypes: true })
		for (const entry of entries) {
			if (entry.isFile() && entry.name.endsWith('.node')) return true
			if (entry.isDirectory()) {
				const nested = await hasNativeModules(path.join(dir, entry.name))
				if (nested) return true
			}
		}
	} catch {}
	return false
}

async function electronRebuild(pluginDir: string): Promise<void> {
	const markerPath = path.join(pluginDir, '.rebuilt')
	const markerExists = await fs
		.access(markerPath)
		.then(() => true)
		.catch(() => false)
	if (markerExists) return

	const nmPath = path.join(pluginDir, 'node_modules')
	const needsRebuild = await hasNativeModules(nmPath)
	if (!needsRebuild) return

	const appRoot = path.join(__dirname, '..', '..')

	return new Promise((resolve, reject) => {
		sendLog(t('pluginMgrRebuildStart', { dir: pluginDir }), 'info')
		switchToLogs()

		const electronVersion = process.versions.electron
		const arch = process.arch
		const isWin = process.platform === 'win32'

		const rebuildCmd = isWin
			? `npx.cmd @electron/rebuild --version ${electronVersion} --arch ${arch} --module-dir "${pluginDir}"`
			: `npx @electron/rebuild --version ${electronVersion} --arch ${arch} --module-dir "${pluginDir}"`

		const child = spawn(rebuildCmd, [], {
			cwd: appRoot,
			stdio: ['ignore', 'pipe', 'pipe'],
			shell: true,
			env: {
				...process.env,
				npm_config_runtime: 'electron',
				npm_config_target: electronVersion,
				npm_config_arch: arch,
				npm_config_disturl: 'https://electronjs.org/headers',
			},
		})

		child.stdout?.on('data', (data: Buffer) => {
			const line = data.toString().trim()
			if (line) sendLog(`[rebuild] ${line}`, 'info')
		})

		child.stderr?.on('data', (data: Buffer) => {
			const line = data.toString().trim()
			if (line) sendLog(`[rebuild] ${line}`, 'warn')
		})

		child.on('close', async code => {
			if (code === 0) {
				sendLog(t('pluginMgrRebuildDone'), 'success')
				await fs.writeFile(markerPath, String(Date.now())).catch(() => {})
				resolve()
			} else {
				reject(new Error(t('pluginMgrRebuildFailed', { code: String(code) })))
			}
		})

		child.on('error', reject)
	})
}

function makeContext(
	pluginDir: string | null = null,
	pluginId: string | null = null
): PluginContext {
	const userData = app.getPath('userData')
	const pluginDataDir = pluginId ? path.join(userData, 'plugins-data', pluginId) : null

	return {
		readSettings,
		readFiltersState,
		sendLog,
		userDataPath: userData,
		pluginDir,

		async readConfig(name: string) {
			if (name === 'discord-token-config') return

			if (pluginDataDir) {
				try {
					const filePath = path.join(pluginDataDir, `${name}.json`)
					const raw = await fs.readFile(filePath, 'utf-8')
					return JSON.parse(raw) as Record<string, unknown>
				} catch {}
			}

			try {
				const filePath = path.join(userData, `${name}.json`)
				const raw = await fs.readFile(filePath, 'utf-8')
				return JSON.parse(raw) as Record<string, unknown>
			} catch {
				return null
			}
		},

		async writeConfig(name: string, data: Record<string, unknown>) {
			if (name === 'discord-token-config') return

			const dir = pluginDataDir ?? path.join(userData, 'plugins-data', '_shared')
			await fs.mkdir(dir, { recursive: true })
			const filePath = path.join(dir, `${name}.json`)
			await fs.writeFile(filePath, JSON.stringify(data, null, 2), 'utf-8')
		},
	}
}

export function registerPlugin(plugin: VoidPlugin, pluginDir: string | null = null): void {
	if (registry.find(p => p.id === plugin.id)) {
		sendLog(t('pluginMgrAlreadyRegistered', { id: plugin.id }), 'warn')
		return
	}
	registry.push(plugin)
	pluginDirMap.set(plugin.id, pluginDir)
	enabledState.set(plugin.id, plugin.locked === true ? true : false)
}

export function setPluginEnabled(id: string, enabled: boolean): void {
	const plugin = registry.find(p => p.id === id)
	if (!plugin) return
	if (plugin.locked) return

	const wasEnabled = enabledState.get(id) ?? false
	if (wasEnabled === enabled) return

	enabledState.set(id, enabled)
	const ctx = makeContext(pluginDirMap.get(id) ?? null, id)

	if (enabled) {
		Promise.resolve(plugin.start(ctx)).catch(e => {
			sendLog(t('pluginMgrStartError', { id, error: e?.message ?? e }), 'error')
		})
		attachUpdateCb(plugin)
	} else {
		Promise.resolve(plugin.stop()).catch(e => {
			sendLog(t('pluginMgrStopError', { id, error: e?.message ?? e }), 'error')
		})
	}
}

export function setPluginPriority(id: string, priority: number): void {
	const plugin = registry.find(p => p.id === id)
	if (!plugin) return
	plugin.priority = priority
	sendPluginsUpdate()
}

export function isPluginEnabled(id: string): boolean {
	return enabledState.get(id) ?? false
}

export function notifyConfigChanged(key: string): void {
	for (const plugin of registry) {
		if (enabledState.get(plugin.id) && plugin.onConfigChanged) {
			try {
				plugin.onConfigChanged(key)
			} catch {}
		}
	}
}

export async function startAll(): Promise<void> {
	await loadExternalPlugins()

	const settings = await readSettings()
	const externalState = await readExternalPluginsState()

	for (const plugin of registry) {
		let shouldEnable: boolean
		if (plugin.locked) {
			shouldEnable = true
		} else if (plugin.id === 'smtc') {
			shouldEnable = !!(settings.musicFilter || settings.videoFilter)
		} else if (plugin.id === 'hardware') {
			shouldEnable = !!settings.hardwareMonitorEnabled
		} else if (!plugin.builtin) {
			shouldEnable = externalState[plugin.id] === true
		} else {
			shouldEnable = enabledState.get(plugin.id) ?? false
		}

		enabledState.set(plugin.id, shouldEnable)

		if (shouldEnable) {
			try {
				await plugin.start(makeContext(pluginDirMap.get(plugin.id) ?? null, plugin.id))
				attachUpdateCb(plugin)
			} catch (e: any) {
				sendLog(t('pluginMgrStartError', { id: plugin.id, error: e?.message ?? e }), 'error')
			}
		}
	}
}

export async function stopAll(): Promise<void> {
	for (const plugin of registry) {
		if (enabledState.get(plugin.id)) {
			try {
				await plugin.stop()
			} catch (e: any) {
				sendLog(t('pluginMgrStopError', { id: plugin.id, error: e?.message ?? e }), 'error')
			}
		}
	}
}

let _globalUpdateCb: (() => void) | null = null
let _globalDebounceTimer: NodeJS.Timeout | null = null
let _throttledCb: (() => void) | null = null

function getThrottledCb(): () => void {
	if (!_throttledCb) {
		_throttledCb = () => {
			if (!_globalUpdateCb) return
			if (_globalDebounceTimer) clearTimeout(_globalDebounceTimer)
			_globalDebounceTimer = setTimeout(() => {
				_globalDebounceTimer = null
				_globalUpdateCb?.()
			}, 50)
		}
	}
	return _throttledCb
}

export function subscribeToUpdates(cb: () => void): void {
	_globalUpdateCb = cb
	const throttled = getThrottledCb()
	for (const plugin of registry) {
		if (enabledState.get(plugin.id)) {
			plugin.onUpdate(throttled)
		}
	}
}

function attachUpdateCb(plugin: VoidPlugin): void {
	if (_globalUpdateCb) {
		plugin.onUpdate(getThrottledCb())
	}
}

export function getActivePayload(): PresencePayload | null {
	const active = registry
		.filter(p => enabledState.get(p.id) === true)
		.sort((a, b) => b.priority - a.priority)

	for (const plugin of active) {
		if (plugin.exclusive) {
			const payload = plugin.getPayload()
			if (payload !== null) return payload
		}
	}

	for (const plugin of active) {
		const payload = plugin.getPayload()
		if (payload !== null) return payload
	}
	return null
}

export function getActivePluginId(): string | null {
	const active = registry
		.filter(p => enabledState.get(p.id) === true)
		.sort((a, b) => b.priority - a.priority)

	for (const plugin of active) {
		if (plugin.exclusive && plugin.getPayload() !== null) return plugin.id
	}

	for (const plugin of active) {
		if (plugin.getPayload() !== null) return plugin.id
	}
	return null
}

export function getPluginInfoList(): PluginInfo[] {
	return registry.map(p => ({
		id: p.id,
		nameKey: p.nameKey,
		version: p.version,
		builtin: p.builtin,
		priority: p.priority,
		locked: p.locked === true,
		enabled: enabledState.get(p.id) ?? false,
		exclusive: p.exclusive === true,
		controls: p.controls,
	}))
}

async function loadExternalPlugins(): Promise<void> {
	const userData = app.getPath('userData')
	const pluginsDir = path.join(userData, 'plugins')

	await fs.mkdir(pluginsDir, { recursive: true }).catch(() => {})

	let entries: import('fs').Dirent[]
	try {
		entries = await fs.readdir(pluginsDir, { withFileTypes: true })
	} catch (e: any) {
		sendLog(t('pluginMgrCannotReadDir', { error: e?.message ?? e }), 'warn')
		return
	}

	for (const entry of entries) {
		if (!entry.isFile() && !entry.isDirectory()) continue

		let pluginPath: string
		let pluginDir: string | null = null

		if (entry.isDirectory()) {
			pluginDir = path.join(pluginsDir, entry.name)
			pluginPath = path.join(pluginDir, 'index.js')
		} else if (entry.name.endsWith('.js')) {
			pluginPath = path.join(pluginsDir, entry.name)
		} else {
			continue
		}

		try {
			if (pluginDir) {
				const pkgPath = path.join(pluginDir, 'package.json')
				const nmPath = path.join(pluginDir, 'node_modules')
				const hasPkg = await fs
					.access(pkgPath)
					.then(() => true)
					.catch(() => false)
				const hasNm = await fs
					.access(nmPath)
					.then(() => true)
					.catch(() => false)

				if (hasPkg && !hasNm) {
					try {
						await npmInstall(pluginDir)
					} catch (e: any) {
						sendLog(
							t('pluginMgrInstallDepsFailed', { name: entry.name, error: e?.message ?? e }),
							'error'
						)
						continue
					}
				}

				if (hasPkg) {
					try {
						await electronRebuild(pluginDir)
					} catch (e: any) {
						sendLog(t('pluginMgrRebuildWarn', { name: entry.name, error: e?.message ?? e }), 'warn')
					}
				}
			}

			await fs.access(pluginPath)

			const mod = require(pluginPath)
			const plugin: VoidPlugin = mod.default ?? mod

			if (!plugin || typeof plugin.id !== 'string' || typeof plugin.getPayload !== 'function') {
				sendLog(t('pluginMgrInvalidPlugin', { path: pluginPath }), 'warn')
				continue
			}

			if (registry.find(p => p.builtin && p.id === plugin.id)) {
				sendLog(t('pluginMgrConflictsBuiltin', { id: plugin.id }), 'warn')
				continue
			}

			plugin.builtin = false
			registerPlugin(plugin, pluginDir)
			sendLog(t('pluginMgrLoaded', { id: plugin.id, path: pluginPath }), 'info')
		} catch (e: any) {
			sendLog(t('pluginMgrLoadFailed', { path: pluginPath, error: e?.message ?? e }), 'error')
		}
	}
}

let _fsWatcher: ReturnType<typeof watch> | null = null

async function unloadPlugin(pluginId: string): Promise<void> {
	const idx = registry.findIndex(p => !p.builtin && p.id === pluginId)
	if (idx !== -1) {
		const p = registry[idx]
		try {
			await p.stop()
		} catch (e: any) {
			sendLog(t('pluginMgrRemoveFileFailed', { id: pluginId, error: e?.message ?? e }), 'error')
		}
		registry.splice(idx, 1)
		enabledState.delete(pluginId)
		pluginDirMap.delete(pluginId)
	}
}

export async function hotLoadPlugin(
	pluginPath: string,
	pluginId: string,
	pluginDir: string | null
): Promise<void> {
	if (pluginDir) {
		const pkgPath = path.join(pluginDir, 'package.json')
		const nmPath = path.join(pluginDir, 'node_modules')
		const hasPkg = await fs
			.access(pkgPath)
			.then(() => true)
			.catch(() => false)
		const hasNm = await fs
			.access(nmPath)
			.then(() => true)
			.catch(() => false)

		if (hasPkg && !hasNm) {
			await npmInstall(pluginDir)
		}
		if (hasPkg) {
			await electronRebuild(pluginDir).catch((e: any) => {
				sendLog(t('pluginMgrRebuildWarnHot', { id: pluginId, error: e?.message ?? e }), 'warn')
			})
		}
	}

	delete (require.cache as any)[require.resolve(pluginPath)]

	const mod = require(pluginPath)
	const plugin: VoidPlugin = mod.default ?? mod

	if (!plugin || typeof plugin.id !== 'string' || typeof plugin.getPayload !== 'function') {
		sendLog(t('pluginMgrInvalidPluginHot', { id: pluginId }), 'warn')
		return
	}
	if (registry.find(p => p.builtin && p.id === plugin.id)) {
		sendLog(t('pluginMgrConflictsBuiltinHot', { id: plugin.id }), 'warn')
		return
	}

	plugin.builtin = false
	registerPlugin(plugin, pluginDir)
	sendLog(t('pluginMgrHotLoaded', { id: plugin.id }), 'success')
	sendToast(t('pluginMgrHotLoadedToast', { name: plugin.nameKey || plugin.id }))
	sendPluginsUpdate()
}

export function startPluginsWatcher(): void {
	const pluginsDir = path.join(app.getPath('userData'), 'plugins')
	const debounceMap = new Map<string, NodeJS.Timeout>()

	_fsWatcher = watch(pluginsDir, { persistent: false }, (eventType, filename) => {
		if (!filename) return
		if (eventType !== 'rename') return

		const prev = debounceMap.get(filename)
		if (prev) clearTimeout(prev)

		debounceMap.set(
			filename,
			setTimeout(async () => {
				debounceMap.delete(filename)

				if (installingPlugins.has(filename) || installingPlugins.has(filename.replace(/\.js$/, '')))
					return

				if (filename.endsWith('.js')) {
					const pluginPath = path.join(pluginsDir, filename)
					const pluginId = filename.replace('.js', '')

					const fileExists = await fs
						.access(pluginPath)
						.then(() => true)
						.catch(() => false)

					if (!fileExists) {
						await unloadPlugin(pluginId)
						sendLog(t('pluginMgrUnloaded', { id: pluginId }), 'info')
						sendToast(t('pluginMgrRemovedToast', { id: pluginId }))
						sendPluginsUpdate()
						return
					}

					await unloadPlugin(pluginId)
					try {
						await hotLoadPlugin(pluginPath, pluginId, null)
					} catch (e: any) {
						sendLog(
							t('pluginMgrHotLoadFailed', { name: filename, error: e?.message ?? e }),
							'error'
						)
					}
					return
				}

				const pluginDir = path.join(pluginsDir, filename)
				const pluginPath = path.join(pluginDir, 'index.js')
				const pluginId = filename

				const dirExists = await fs
					.stat(pluginDir)
					.then(s => s.isDirectory())
					.catch(() => false)

				if (!dirExists) {
					await unloadPlugin(pluginId)
					sendLog(t('pluginMgrUnloaded', { id: pluginId }), 'info')
					sendToast(t('pluginMgrRemovedToast', { id: pluginId }))
					sendPluginsUpdate()
					return
				}

				await unloadPlugin(pluginId)
				try {
					await hotLoadPlugin(pluginPath, pluginId, pluginDir)
				} catch (e: any) {
					sendLog(
						t('pluginMgrHotLoadFolderFailed', { name: filename, error: e?.message ?? e }),
						'error'
					)
				}
			}, 500)
		)
	})
}

export function stopPluginsWatcher(): void {
	if (_fsWatcher) {
		_fsWatcher.close()
		_fsWatcher = null
	}
}
