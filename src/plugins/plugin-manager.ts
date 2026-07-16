import { spawn } from 'child_process'
import { app, BrowserWindow } from 'electron'
import { promises as fs, watch } from 'fs'
import path from 'path'
import { readFiltersState, readSettings } from '../main/config'
import { sendLog } from '../main/logging'
import type { PresencePayload } from '../types/types'
import type { PluginContext, PluginInfo, VoidPlugin } from './plugin-types'

const registry: VoidPlugin[] = []
const enabledState = new Map<string, boolean>()

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
		sendLog(`Installing dependencies in "${pluginDir}"...`, 'info')
		switchToLogs()

		const npm = process.platform === 'win32' ? 'npm.cmd' : 'npm'
		const child = spawn(npm, ['install', '--prefer-offline'], {
			cwd: pluginDir,
			stdio: ['ignore', 'pipe', 'pipe'],
			shell: false,
		})

		child.stdout?.on('data', (data: Buffer) => {
			const line = data.toString().trim()
			if (line) sendLog(`[npm] ${line}`, 'info')
		})

		child.stderr?.on('data', (data: Buffer) => {
			const line = data.toString().trim()
			if (line) sendLog(`[npm] ${line}`, 'warn')
		})

		child.on('close', code => {
			if (code === 0) {
				sendLog(`Dependencies installed successfully.`, 'success')
				resolve()
			} else {
				reject(new Error(`npm install exited with code ${code}`))
			}
		})

		child.on('error', reject)
	})
}

function makeContext(): PluginContext {
	return {
		readSettings,
		readFiltersState,
		sendLog,
		userDataPath: app.getPath('userData'),
		async readConfig(name: string) {
			try {
				const filePath = path.join(app.getPath('userData'), `${name}.json`)
				const raw = await fs.readFile(filePath, 'utf-8')
				return JSON.parse(raw) as Record<string, unknown>
			} catch {
				return null
			}
		},
	}
}

export function registerPlugin(plugin: VoidPlugin): void {
	if (registry.find(p => p.id === plugin.id)) {
		sendLog(`Plugin "${plugin.id}" already registered, skipping.`, 'warn')
		return
	}
	registry.push(plugin)
	enabledState.set(plugin.id, plugin.locked === true ? true : false)
}

export function setPluginEnabled(id: string, enabled: boolean): void {
	const plugin = registry.find(p => p.id === id)
	if (!plugin) return
	if (plugin.locked) return

	const wasEnabled = enabledState.get(id) ?? false
	if (wasEnabled === enabled) return

	enabledState.set(id, enabled)
	const ctx = makeContext()

	if (enabled) {
		Promise.resolve(plugin.start(ctx)).catch(e => {
			sendLog(`Plugin "${id}" start error: ${e?.message ?? e}`, 'error')
		})
		attachUpdateCb(plugin)
	} else {
		Promise.resolve(plugin.stop()).catch(e => {
			sendLog(`Plugin "${id}" stop error: ${e?.message ?? e}`, 'error')
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

export async function startAll(): Promise<void> {
	await loadExternalPlugins()

	const ctx = makeContext()
	const settings = await readSettings()

	for (const plugin of registry) {
		let shouldEnable: boolean
		if (plugin.locked) {
			shouldEnable = true
		} else if (plugin.id === 'smtc') {
			shouldEnable = !!(settings.musicFilter || settings.videoFilter)
		} else if (plugin.id === 'hardware') {
			shouldEnable = !!settings.hardwareMonitorEnabled
		} else {
			shouldEnable = enabledState.get(plugin.id) ?? false
		}

		enabledState.set(plugin.id, shouldEnable)

		if (shouldEnable) {
			try {
				await plugin.start(ctx)
				attachUpdateCb(plugin)
			} catch (e: any) {
				sendLog(`Plugin "${plugin.id}" start error: ${e?.message ?? e}`, 'error')
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
				sendLog(`Plugin "${plugin.id}" stop error: ${e?.message ?? e}`, 'error')
			}
		}
	}
}

let _globalUpdateCb: (() => void) | null = null

export function subscribeToUpdates(cb: () => void): void {
	_globalUpdateCb = cb
	for (const plugin of registry) {
		if (enabledState.get(plugin.id)) {
			plugin.onUpdate(cb)
		}
	}
}

function attachUpdateCb(plugin: VoidPlugin): void {
	if (_globalUpdateCb) {
		plugin.onUpdate(_globalUpdateCb)
	}
}

export function getActivePayload(): PresencePayload | null {
	const active = registry
		.filter(p => enabledState.get(p.id) === true)
		.sort((a, b) => b.priority - a.priority)

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
		sendLog(`Could not read plugins dir: ${e?.message ?? e}`, 'warn')
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
			await fs.access(pluginPath)

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
						sendLog(`Failed to install deps for "${entry.name}": ${e?.message ?? e}`, 'error')
						continue
					}
				}
			}

			const mod = require(pluginPath)
			const plugin: VoidPlugin = mod.default ?? mod

			if (!plugin || typeof plugin.id !== 'string' || typeof plugin.getPayload !== 'function') {
				sendLog(`Invalid plugin at "${pluginPath}", skipping.`, 'warn')
				continue
			}

			if (registry.find(p => p.builtin && p.id === plugin.id)) {
				sendLog(`External plugin "${plugin.id}" conflicts with builtin, skipping.`, 'warn')
				continue
			}

			plugin.builtin = false
			registerPlugin(plugin)
			sendLog(`Loaded external plugin "${plugin.id}" from "${pluginPath}"`, 'info')
		} catch (e: any) {
			sendLog(`Failed to load "${pluginPath}": ${e?.message ?? e}`, 'error')
		}
	}
}

let _fsWatcher: ReturnType<typeof watch> | null = null

export function startPluginsWatcher(): void {
	const pluginsDir = path.join(app.getPath('userData'), 'plugins')
	const debounceMap = new Map<string, NodeJS.Timeout>()

	_fsWatcher = watch(pluginsDir, { persistent: false }, (eventType, filename) => {
		if (!filename || !filename.endsWith('.js')) return
		if (eventType !== 'rename') return

		const prev = debounceMap.get(filename)
		if (prev) clearTimeout(prev)

		debounceMap.set(
			filename,
			setTimeout(async () => {
				debounceMap.delete(filename)
				const pluginPath = path.join(pluginsDir, filename)
				const pluginId = filename.replace('.js', '')

				let fileExists = false
				try {
					await fs.access(pluginPath)
					fileExists = true
				} catch {}

				if (!fileExists) {
					const idx = registry.findIndex(p => !p.builtin && p.id === pluginId)
					if (idx !== -1) {
						const p = registry[idx]
						try {
							await p.stop()
						} catch {}
						registry.splice(idx, 1)
						enabledState.delete(pluginId)
					}
					sendLog('Unloaded plugin: ' + pluginId, 'info')
					sendToast('Plugin "' + pluginId + '" removed')
					sendPluginsUpdate()
					return
				}

				const existingIdx = registry.findIndex(p => !p.builtin && p.id === pluginId)
				if (existingIdx !== -1) {
					const old = registry[existingIdx]
					try {
						await old.stop()
					} catch {}
					registry.splice(existingIdx, 1)
					enabledState.delete(pluginId)
				}

				try {
					delete (require.cache as any)[require.resolve(pluginPath)]
					const mod = require(pluginPath)
					const plugin: VoidPlugin = mod.default ?? mod

					if (!plugin || typeof plugin.id !== 'string' || typeof plugin.getPayload !== 'function') {
						sendLog('Invalid plugin: ' + filename, 'warn')
						return
					}

					if (registry.find(p => p.builtin && p.id === plugin.id)) {
						sendLog('Plugin ' + plugin.id + ' conflicts with builtin', 'warn')
						return
					}

					plugin.builtin = false
					registerPlugin(plugin)
					sendLog('Hot-loaded plugin: ' + plugin.id, 'success')
					sendToast('Plugin "' + (plugin.nameKey || plugin.id) + '" loaded!')
					sendPluginsUpdate()
				} catch (e: any) {
					sendLog('Failed to hot-load ' + filename + ': ' + (e?.message ?? e), 'error')
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
