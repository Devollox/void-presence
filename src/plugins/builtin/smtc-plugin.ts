import { app } from 'electron'
import path from 'path'
import { Worker } from 'worker_threads'
import { readFiltersState, readImageCyclesConfig, readSettings } from '../../main/config'
import { sendLog } from '../../main/logging'
import type { ActivityType, ImageCycle, NowPlayingData, PresencePayload } from '../../types/types'
import type { PluginContext, PluginControl, VoidPlugin } from '../plugin-types'

let _worker: Worker | null = null
let _lastNowPlaying: NowPlayingData | null = null
let _ctx: PluginContext | null = null
let _updateCb: (() => void) | null = null

const _coverCache = new Map<string, string | null>()
const _coverRetries = new Map<string, number>()
let _coverRequestsInWindow = 0
let _coverWindowStart = 0
const COVER_WINDOW_MS = 60000
const COVER_MAX_PER_WINDOW = 4
const COVER_MAX_RETRIES = 3

let _cachedPayload: PresencePayload | null = null
let _lastSignature = ''
let _lastStatus = ''
let _isPausedLike = false

function coverCacheKey(title: string, artist: string) {
	return `${title.toLowerCase().trim()}::${artist.toLowerCase().trim()}`
}

async function resolveCover(title: string, artist: string): Promise<string | null> {
	const key = coverCacheKey(title, artist)
	if (_coverCache.has(key)) return _coverCache.get(key) ?? null
	const now = Date.now()
	if (now - _coverWindowStart > COVER_WINDOW_MS) {
		_coverWindowStart = now
		_coverRequestsInWindow = 0
	}
	if (_coverRequestsInWindow >= COVER_MAX_PER_WINDOW) return null
	const tries = _coverRetries.get(key) ?? 0
	if (tries >= COVER_MAX_RETRIES) return null
	_coverRetries.set(key, tries + 1)
	_coverRequestsInWindow++
	try {
		const term = encodeURIComponent([artist.trim(), title.trim()].filter(Boolean).join(' '))
		const url = `https://itunes.apple.com/search?term=${term}&entity=song&limit=1`
		const ctrl = new AbortController()
		const tid = setTimeout(() => ctrl.abort(), 10000)
		try {
			const res = await fetch(url, { signal: ctrl.signal } as any)
			if (!res.ok) {
				_coverCache.set(key, null)
				return null
			}
			const json = await res.json()
			const artwork =
				json?.results?.[0]?.artworkUrl100 ??
				json?.results?.[0]?.artworkUrl60 ??
				json?.results?.[0]?.artworkUrl30 ??
				null
			_coverCache.set(key, artwork)
			if (_coverCache.size > 1000) _coverCache.delete(_coverCache.keys().next().value!)
			return artwork
		} finally {
			clearTimeout(tid)
		}
	} catch {
		_coverCache.set(key, null)
		return null
	}
}

function resolveWorkerPath(): string {
	return app.isPackaged
		? path.join(process.resourcesPath, 'app', 'src', 'discord', 'workers', 'smtc-worker.js')
		: path.join(process.cwd(), 'src', 'discord', 'workers', 'smtc-worker.js')
}

function toDiscordTs(ms: number | null | undefined): number | undefined {
	if (!Number.isFinite(ms as number)) return undefined
	const sec = Math.floor((ms as number) / 1000)
	if (sec < 1) return undefined
	return sec
}

function makeSignature(np: NowPlayingData): string {
	return JSON.stringify({
		title: (np.title ?? '').trim(),
		artist: (np.artist ?? '').trim(),
		status: np.playbackStatus ?? '',
		position: typeof np.position === 'number' ? Math.floor(np.position / 10) * 10 : null,
		duration: typeof np.duration === 'number' ? np.duration : null,
		music: np.isThumbMusic === true ? 1 : 0,
		video: np.isThumbVideo === true ? 1 : 0,
	})
}

async function buildPayload(): Promise<PresencePayload | null> {
	const np = _lastNowPlaying
	if (!np) return null

	const status = np.playbackStatus
	const isPlayingLike = status === 'Playing' || status === 'Opened' || status === 'Changing'
	const isPaused = status === 'Paused'
	const isStopped = status === 'Stopped' || status === 'Closed'

	if (isStopped || isPaused) return null

	const title = (np.title ?? '').trim()
	if (!title) return null

	const artist = (np.artist ?? '').trim()
	const filters = await readFiltersState()
	const imagesCfg = await readImageCyclesConfig()
	const imageCycle: ImageCycle = imagesCfg.cycles?.length
		? imagesCfg.cycles[0]
		: { largeImage: null, largeText: null, smallImage: null, smallText: null }

	let activityType: ActivityType = 'playing'
	if (filters.activityFilter) {
		const isMusic = np.isThumbMusic === true && np.isThumbVideo !== true
		const isVideo = np.isThumbVideo === true && np.isThumbMusic !== true
		if (isMusic) activityType = 'listening'
		else if (isVideo) activityType = 'watching'
	}

	let timestamps: PresencePayload['timestamps'] | undefined
	if (isPlayingLike) {
		const pos = typeof np.position === 'number' ? Math.floor(np.position / 10) * 10 : null
		const dur = typeof np.duration === 'number' ? np.duration : null
		if (pos !== null && dur !== null && dur > 0) {
			const now = Date.now()
			const startMs = now - pos * 1000
			const endMs = startMs + dur * 1000
			timestamps = { start: toDiscordTs(startMs), end: toDiscordTs(endMs) }
		} else {
			timestamps = { start: toDiscordTs(Date.now()) }
		}
	}

	let largeImage = imageCycle.largeImage ?? undefined
	let largeText = imageCycle.largeText ?? undefined

	if (filters.coverFetchEnabled && isPlayingLike) {
		const cover = await resolveCover(title, artist)
		if (cover) {
			largeImage = cover
			largeText = undefined
		}
	}

	return {
		source: 'smtc',
		details: title,
		state: artist || undefined,
		activityType,
		timestamps,
		assets: {
			large_image: largeImage,
			large_text: largeText,
			small_image: imageCycle.smallImage ?? undefined,
			small_text: imageCycle.smallText ?? undefined,
		},
		priority: 100,
	}
}

async function shouldNotify(np: NowPlayingData): Promise<boolean> {
	const sig = makeSignature(np)
	return sig !== _lastSignature
}

async function rebuildAndNotify(np: NowPlayingData): Promise<void> {
	const status = np.playbackStatus ?? ''
	const isPaused = status === 'Paused'
	const isStopped = status === 'Stopped' || status === 'Closed'
	const sig = makeSignature(np)

	if (isPaused) {
		const hadPayload = _cachedPayload !== null || _isPausedLike
		_isPausedLike = true
		_cachedPayload = null
		_lastSignature = sig
		_lastStatus = status
		if (hadPayload) _updateCb?.()
		return
	}

	if (isStopped) {
		const hadPayload = _cachedPayload !== null || _isPausedLike
		_isPausedLike = false
		_cachedPayload = null
		_lastSignature = sig
		_lastStatus = status
		if (hadPayload) _updateCb?.()
		return
	}

	_isPausedLike = false
	_lastNowPlaying = np

	if (!(await shouldNotify(np))) return

	const newPayload = await buildPayload()
	_lastSignature = sig
	_lastStatus = status
	_cachedPayload = newPayload
	_updateCb?.()
}

function startWorker(): void {
	if (_worker) return
	const workerPath = resolveWorkerPath()
	_worker = new Worker(workerPath, { env: { ...process.env } })
	_worker.on('message', async (msg: any) => {
		if (!msg || typeof msg !== 'object') return
		if (msg.type === 'smtcError') return
		if (msg.type !== 'nowPlaying') return

		const { musicFilter, videoFilter } = await readFiltersState()
		const haveAnyFilter = !!musicFilter || !!videoFilter

		if (!haveAnyFilter) {
			const hadPayload = _cachedPayload !== null || _isPausedLike
			_lastNowPlaying = null
			_cachedPayload = null
			_isPausedLike = false
			_lastSignature = ''
			_lastStatus = ''
			if (hadPayload) _updateCb?.()
			return
		}

		if (!msg.data) {
			const hadPayload = _cachedPayload !== null || _isPausedLike
			_lastNowPlaying = null
			_cachedPayload = null
			_isPausedLike = false
			_lastSignature = ''
			_lastStatus = ''
			if (hadPayload) _updateCb?.()
			return
		}

		const isMusic = msg.data?.isThumbMusic === true && msg.data?.isThumbVideo !== true
		const isVideo = msg.data?.isThumbVideo === true && msg.data?.isThumbMusic !== true

		if (musicFilter && !videoFilter && !isMusic) {
			const hadPayload = _cachedPayload !== null || _isPausedLike
			_lastNowPlaying = null
			_cachedPayload = null
			_isPausedLike = false
			_lastSignature = ''
			_lastStatus = ''
			if (hadPayload) _updateCb?.()
			return
		}

		if (!musicFilter && videoFilter && !isVideo) {
			const hadPayload = _cachedPayload !== null || _isPausedLike
			_lastNowPlaying = null
			_cachedPayload = null
			_isPausedLike = false
			_lastSignature = ''
			_lastStatus = ''
			if (hadPayload) _updateCb?.()
			return
		}

		_lastNowPlaying = msg.data
		await rebuildAndNotify(msg.data)
	})
	_worker.on('error', (err: Error) => {
		sendLog(`[smtc-plugin] Worker error: ${err.message}`, 'error')
	})
	_worker.on('exit', () => {
		_worker = null
	})
}

function stopWorker(): void {
	if (_worker) {
		_worker.terminate()
		_worker = null
	}
	const hadPayload = _cachedPayload !== null || _isPausedLike
	_lastNowPlaying = null
	_cachedPayload = null
	_lastSignature = ''
	_lastStatus = ''
	_isPausedLike = false
	if (hadPayload) _updateCb?.()
}

export const smtcControls: PluginControl[] = [
	{
		type: 'toggle',
		id: 'music-filter-toggle',
		labelKey: 'activity.musicFilter',
		hintKey: 'activity.smartMusicDetection',
		storageKey: 'musicFilter',
		ipcMethod: 'setMusicFilter',
		defaultValue: false,
	},
	{
		type: 'toggle',
		id: 'video-filter-toggle',
		labelKey: 'activity.videoFilter',
		hintKey: 'activity.smartVideoDetection',
		storageKey: 'videoFilter',
		ipcMethod: 'setVideoFilter',
		defaultValue: false,
	},
	{
		type: 'toggle',
		id: 'automatic-activity-toggle',
		labelKey: 'activity.automaticActivity',
		hintKey: 'activity.weSubstituteActivity',
		storageKey: 'activityFilter',
		ipcMethod: 'setAutomaticActivity',
		defaultValue: false,
	},
	{
		type: 'toggle',
		id: 'cover-fetch-toggle',
		labelKey: 'activity.fetchCovers',
		hintKey: 'activity.useAlbumArt',
		storageKey: 'coverFetchEnabled',
		ipcMethod: 'setCoverFetch',
		defaultValue: true,
	},
]

export const smtcPlugin: VoidPlugin = {
	id: 'smtc',
	nameKey: 'plugins.smtc.name',
	version: '1.0.0',
	builtin: true,
	priority: 100,
	locked: false,
	controls: smtcControls,
	async start(ctx: PluginContext) {
		if (process.platform !== 'win32') return
		_ctx = ctx
		const settings = await readSettings()
		if (settings.musicFilter || settings.videoFilter) startWorker()
	},
	stop() {
		stopWorker()
		_ctx = null
	},
	onUpdate(cb: () => void) {
		_updateCb = cb
	},
	getPayload() {
		if (_isPausedLike) return null
		return _cachedPayload
	},
}

export async function refreshSmtcWorker(): Promise<void> {
	if (process.platform !== 'win32') return
	const s = await readSettings()
	const shouldRun = !!(s.musicFilter || s.videoFilter)
	if (shouldRun && !_worker) startWorker()
	else if (!shouldRun && _worker) stopWorker()
}
