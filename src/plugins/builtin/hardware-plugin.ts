import { app } from 'electron'
import path from 'path'
import { Worker } from 'worker_threads'
import {
	readActivityTypeConfig,
	readButtonsConfig,
	readImageCyclesConfig,
	readSettings,
	readTimerConfig,
} from '../../main/config'
import { sendLog } from '../../main/logging'
import type { ActivityType, ImageCycle, PresencePayload } from '../../types/types'
import type { PluginContext, PluginControl, VoidPlugin } from '../plugin-types'

type BarStyle = 'unicode' | 'cmd' | 'block' | 'soft' | 'retro' | 'cyber'

const BAR_STYLES: Record<BarStyle, { full: string; empty: string }> = {
	unicode: { full: '▰', empty: '▱' },
	cmd: { full: '#', empty: '-' },
	block: { full: '█', empty: '░' },
	soft: { full: '█', empty: '▒' },
	retro: { full: '●', empty: '○' },
	cyber: { full: '█', empty: '▁' },
}

async function bar(p: any): Promise<string> {
	const settings = await readSettings()
	const style = (settings.barStyle as BarStyle) || 'unicode'
	const cfg = BAR_STYLES[style] || BAR_STYLES.unicode
	const n = Number(p)
	const core = !Number.isFinite(n)
		? cfg.empty.repeat(10)
		: (() => {
				const x = Math.max(0, Math.min(100, Math.round(n)))
				const filled = Math.max(0, Math.min(10, Math.floor((x / 100) * 10)))
				return `${cfg.full.repeat(filled)}${cfg.empty.repeat(10 - filled)}`
			})()
	return style === 'unicode' ? core : `[${core}]`
}

let _imageIndex = 0
let _buttonIndex = 0
let _worker: Worker | null = null
let _lastStats: any | null = null
let _lineIndex = 0
let _currentPayload: PresencePayload | null = null
let _rotateTimer: NodeJS.Timeout | null = null
let _updateCb: (() => void) | null = null
let _workerReady = false
function resolveWorkerPath(): string {
	return app.isPackaged
		? path.join(process.resourcesPath, 'app', 'src', 'discord', 'workers', 'hardware-worker.js')
		: path.join(process.cwd(), 'src', 'discord', 'workers', 'hardware-worker.js')
}

function cleanDeviceName(name: any): string | null {
	if (typeof name !== 'string') return null
	return name.trim() || null
}

function buildEntries(
	stats: any
): Array<{ label: string; temp: string | null; load: number | null }> {
	const entries: Array<{ label: string; temp: string | null; load: number | null }> = []
	if (!stats || typeof stats !== 'object') return entries

	if (stats.cpu && (stats.cpu.name || stats.cpu.load != null)) {
		entries.push({
			label: cleanDeviceName(stats.cpu.name) || 'CPU',
			temp:
				Number.isFinite(Number(stats.cpu.temp)) && Number(stats.cpu.temp) !== 0
					? `${Math.round(Number(stats.cpu.temp))}°C`
					: null,
			load: Number.isFinite(Number(stats.cpu.load)) ? Number(stats.cpu.load) : null,
		})
	}

	const gpus = Array.isArray(stats.gpu) ? stats.gpu : []
	gpus.forEach((gpu: any, idx: number) => {
		entries.push({
			label: cleanDeviceName(gpu?.name || gpu?.model) || `GPU ${idx + 1}`,
			temp:
				Number.isFinite(Number(gpu?.temp)) && Number(gpu?.temp) > 0
					? `${Math.round(Number(gpu.temp))}°C`
					: null,
			load: Number.isFinite(Number(gpu?.load)) ? Number(gpu.load) : null,
		})
	})

	const total = Number(stats.memory?.total)
	const used = Number(stats.memory?.used)
	const percent = Number(stats.memory?.percent)
	if (Number.isFinite(total) && Number.isFinite(used)) {
		entries.push({
			label: 'RAM',
			temp: `${(used / 1024 / 1024 / 1024).toFixed(1)}/${(total / 1024 / 1024 / 1024).toFixed(1)} GB`,
			load: Number.isFinite(percent) ? percent : Math.round((used / total) * 100),
		})
	}

	return entries
}

function getNextImageCycle(cycles: ImageCycle[]): ImageCycle {
	if (!cycles.length)
		return { largeImage: null, largeText: null, smallImage: null, smallText: null }
	const img = cycles[_imageIndex % cycles.length]
	_imageIndex = (_imageIndex + 1) % cycles.length
	return img
}

function getNextButtons(buttonPairs: any[]): { label: string; url: string }[] {
	if (!Array.isArray(buttonPairs) || !buttonPairs.length) return []
	const pair = buttonPairs[_buttonIndex % buttonPairs.length]
	_buttonIndex = (_buttonIndex + 1) % buttonPairs.length
	const res: { label: string; url: string }[] = []
	if (pair?.label1 && pair?.url1) res.push({ label: pair.label1, url: pair.url1 })
	if (pair?.label2 && pair?.url2) res.push({ label: pair.label2, url: pair.url2 })
	return res
}

const san = (v: string | null | undefined): string | undefined =>
	v && v.trim() !== '' ? v : undefined

async function refreshPayload(): Promise<void> {
	const stats = _lastStats
	if (!stats) {
		_currentPayload = null
		return
	}

	const entries = buildEntries(stats)
	if (!entries.length) {
		_currentPayload = null
		return
	}

	const [imagesCfg, typeCfg, buttonsCfg] = await Promise.all([
		readImageCyclesConfig(),
		readActivityTypeConfig(),
		readButtonsConfig(),
	])

	const entry = entries[_lineIndex % entries.length]
	const barStr = await bar(entry.load)
	const state = [entry.label, entry.temp, entry.load != null ? `${entry.load}%` : null]
		.filter(Boolean)
		.join(' | ')

	const img = getNextImageCycle(imagesCfg.cycles)
	const activityType: ActivityType = typeCfg.type
	const buttons = getNextButtons(buttonsCfg.pairs)

	const largeImage = san(img.largeImage)
	const largeText = san(img.largeText)
	const smallImage = san(img.smallImage)
	const smallText = san(img.smallText)
	const hasAssets = largeImage || largeText || smallImage || smallText

	_currentPayload = {
		source: 'hardware',
		details: barStr,
		state,
		activityType,
		...(hasAssets
			? {
					assets: {
						large_image: largeImage,
						large_text: largeText,
						small_image: smallImage,
						small_text: smallText,
					},
				}
			: {}),
		...(buttons.length ? { buttons } : {}),
		priority: 50,
	}
}

async function advanceLine(): Promise<void> {
	if (!_lastStats) return
	const entries = buildEntries(_lastStats)
	if (!entries.length) return
	_lineIndex = (_lineIndex + 1) % entries.length
	await refreshPayload()
}

function startRotateTimer(): void {
	if (_rotateTimer) return

	async function tick() {
		if (!_rotateTimer) return
		if (_lastStats) {
			const entries = buildEntries(_lastStats)
			if (entries.length) {
				_lineIndex = (_lineIndex + 1) % entries.length
				await refreshPayload()
			}
		}
		_updateCb?.()

		const { updateIntervalSec } = await readTimerConfig()
		const intervalMs = (updateIntervalSec && updateIntervalSec >= 5 ? updateIntervalSec : 30) * 1000
		_rotateTimer = setTimeout(tick, intervalMs)
	}

	_rotateTimer = setTimeout(tick, 0)
}

function stopRotateTimer(): void {
	if (_rotateTimer) {
		clearTimeout(_rotateTimer)
		_rotateTimer = null
	}
}

function startWorker(): void {
	if (_worker) return

	const workerPath = resolveWorkerPath()
	_worker = new Worker(workerPath, { env: { ...process.env } })

	_worker.on('message', (msg: any) => {
		if (!msg || typeof msg !== 'object') return
		if (msg.type === 'hardwareStats') {
			_lastStats = msg.data
			const firstResponse = !_workerReady
			_workerReady = true
			void refreshPayload().then(() => {
				if (firstResponse) _updateCb?.()
			})
		}
	})

	_worker.on('error', (err: Error) => {
		sendLog(`[hardware-plugin] Worker error: ${err.message}`, 'error')
	})

	_worker.on('exit', () => {
		_worker = null
	})

	startRotateTimer()
}

function stopWorker(): void {
	stopRotateTimer()
	if (_worker) {
		_worker.terminate()
		_worker = null
	}
	_lastStats = null
	_currentPayload = null
	_lineIndex = 0
	_buttonIndex = 0
	_workerReady = false
}

export const hardwareControls: PluginControl[] = [
	{
		type: 'toggle',
		id: 'hardware-filter-toggle',
		labelKey: 'activity.hardwareFilter',
		hintKey: 'activity.hardwareDetection',
		storageKey: 'hardwareMonitorEnabled',
		ipcMethod: 'setHardwareMonitor',
		defaultValue: false,
	},
	{
		type: 'select',
		id: 'hardware-bar-style',
		labelKey: 'barStyle.label',
		storageKey: 'barStyle',
		ipcMethod: 'setBarStyleConfig',
		defaultValue: 'unicode',
		options: [
			{ value: 'unicode', labelKey: 'barStyle.unicode' },
			{ value: 'cmd',     labelKey: 'barStyle.cmd'     },
			{ value: 'block',   labelKey: 'barStyle.block'   },
			{ value: 'soft',    labelKey: 'barStyle.soft'    },
			{ value: 'retro',   labelKey: 'barStyle.retro'   },
			{ value: 'cyber',   labelKey: 'barStyle.cyber'   },
		],
	},
]

export const hardwarePlugin: VoidPlugin = {
	id: 'hardware',
	nameKey: 'plugins.hardware.name',
	version: '1.0.0',
	builtin: true,
	priority: 50,
	locked: false,
	waitForWorker: true,

	controls: hardwareControls,

	async start(_ctx: PluginContext) {
		_lineIndex = 0
		_buttonIndex = 0
		const settings = await readSettings()
		if (settings.hardwareMonitorEnabled) startWorker()
	},

	stop() {
		stopWorker()
	},

	onUpdate(cb: () => void) {
		_updateCb = cb
	},

	getPayload() {
		return _currentPayload
	},
}

export async function refreshHardwareWorker(): Promise<void> {
	const s = await readSettings()
	if (s.hardwareMonitorEnabled && !_worker) {
		startWorker()
	} else if (!s.hardwareMonitorEnabled && _worker) {
		stopWorker()
	}
}

export function getLastHardwareStatsPlugin(): any {
	return _lastStats
}
