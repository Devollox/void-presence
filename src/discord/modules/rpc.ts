import { exec } from 'child_process'
import rpc from 'discord-rpc'
import {
	readActivityTypeConfig,
	readButtonsConfig,
	readClientConfig,
	readCyclesConfig,
	readFiltersState,
	readImageCyclesConfig,
	readPartyConfig,
	readTimestampConfig,
	setTimestampConfig,
} from '../../main/config'
import { getLastNowPlaying } from '../../main/ipc'
import { sendLog, sendStatus } from '../../main/logging'
import {
	ActivityType,
	DiscordClient,
	ImageCycle,
	NowMode,
	NowPlayingInfo,
	PartyCycleEntry,
	RichPresencePayload,
	RpcPayload,
	TimeCycleEntry,
	TimestampConfig,
} from '../../types/types'

let persistSessionStart = 0
let persistOffsetSecBase = 0

export function resetPersistTimestampValue() {
	persistSessionStart = 0
	persistOffsetSecBase = 0
}

const processName = 'Discord.exe'

let client: DiscordClient | null = null
let restartTimer: NodeJS.Timeout | null = null
let restartInterval: NodeJS.Timeout | null = null
let activityIntervalMs = 30000

let currentTitle: string | null = null
let lastSmTcStatus: string | null = null
let lastJsonSignature = ''
let lastSmTcPosition: number | null = null

const coverCache = new Map<string, string | null>()
const coverRetries = new Map<string, number>()
let coverRequestsInWindow = 0
let coverWindowStart = 0
const COVER_WINDOW_MS = 60000
const COVER_MAX_PER_WINDOW = 4
const COVER_MAX_RETRIES_PER_TRACK = 3

let isStopped = false
let currentSessionId = 0
let isConnecting = false
let hasEverBeenReady = false
let hasLoggedConnectingOnce = false
let suppressFirstLoginError = true
let intervalLocked = false
let imageIndex = 0
let isSearchingDiscord = false
let lastReadyAt = 0
let lastStoppedAt: number | null = null

function msToDiscordTs(ms: number | null | undefined): number | undefined {
	if (!Number.isFinite(ms as number)) return undefined
	const sec = Math.floor((ms as number) / 1000)
	if (sec < 1) return undefined
	return sec
}

function cleanupMemory() {
	if (coverCache.size > 100) {
		const keys = Array.from(coverCache.keys())
		keys.slice(0, coverCache.size - 100).forEach(k => {
			coverCache.delete(k)
			coverRetries.delete(k)
		})
	}

	coverRequestsInWindow = 0
	if (Date.now() - coverWindowStart > COVER_WINDOW_MS * 2) {
		coverWindowStart = Date.now()
	}

	if (client && hasEverBeenReady) {
		try {
			client.clearActivity()
		} catch {}
	}

	if ((global as any).gc) {
		try {
			;(global as any).gc()
		} catch {}
	}
}

function makeCacheKey(title: string, artist: string) {
	return `${title.toLowerCase().trim()}::${artist.toLowerCase().trim()}`
}

async function resolveCoverUrlFromITunes(
	title: string,
	artist: string,
): Promise<string | null> {
	const queryParts: string[] = []
	if (artist.trim()) queryParts.push(artist.trim())
	if (title.trim()) queryParts.push(title.trim())
	if (!queryParts.length) return null
	const term = encodeURIComponent(queryParts.join(' '))
	const url = `https://itunes.apple.com/search?term=${term}&entity=song&limit=1`

	const controller = new AbortController()
	const timeoutId = setTimeout(() => controller.abort(), 10000)

	try {
		const res = await fetch(url, { signal: controller.signal } as any)
		clearTimeout(timeoutId)
		if (!res.ok) return null
		const json = await res.json()
		res.body?.cancel?.()
		if (!json || !Array.isArray(json.results) || json.results.length === 0) {
			return null
		}
		const result = json.results[0]
		const artwork: string | undefined =
			result.artworkUrl100 || result.artworkUrl60 || result.artworkUrl30
		return artwork || null
	} catch {
		clearTimeout(timeoutId)
		return null
	}
}

async function resolveCoverUrl(
	title: string,
	artist: string,
): Promise<string | null> {
	const key = makeCacheKey(title, artist)

	if (coverCache.has(key)) {
		return coverCache.get(key) || null
	}

	const now = Date.now()
	if (now - coverWindowStart > COVER_WINDOW_MS) {
		coverWindowStart = now
		coverRequestsInWindow = 0
	}
	if (coverRequestsInWindow >= COVER_MAX_PER_WINDOW) {
		return null
	}

	const tries = coverRetries.get(key) ?? 0
	if (tries >= COVER_MAX_RETRIES_PER_TRACK) {
		return null
	}
	coverRetries.set(key, tries + 1)

	coverRequestsInWindow++
	const url = await resolveCoverUrlFromITunes(title, artist)
	coverCache.set(key, url || null)

	if (coverCache.size > 1000) {
		const first = coverCache.keys().next().value
		coverCache.delete(first)
	}

	return url
}

export function setActivityInterval(sec: number) {
	if (intervalLocked) return
	if (!Number.isFinite(sec) || sec < 5) {
		activityIntervalMs = 5000
	} else {
		activityIntervalMs = sec * 1000
	}
}

function createClient() {
	if (client) {
		try {
			client.clearActivity()
		} catch {}
		try {
			client.destroy()
		} catch {}
		client = null
	}
	client = new (rpc.Client as any)({ transport: 'ipc' }) as DiscordClient
	return client
}

export function stopDiscordRich() {
	isStopped = true
	currentSessionId++
	intervalLocked = false
	imageIndex = 0
	if (restartTimer) {
		clearTimeout(restartTimer)
		restartTimer = null
	}
	if (restartInterval) {
		clearInterval(restartInterval)
		restartInterval = null
	}
	if (client) {
		try {
			client.clearActivity()
		} catch {}
		try {
			client.destroy()
		} catch {}
		client = null
	}
	isConnecting = false
	hasEverBeenReady = false
	hasLoggedConnectingOnce = false
}

function checkDiscordRunning(
	cb: (err: { message: string } | null, isRunning: boolean) => void,
) {
	exec('tasklist', (err, stdout) => {
		if (err) return cb(err, false)
		const found = stdout.toLowerCase().includes(processName.toLowerCase())
		cb(null, found)
	})
}

function getNextImageCycle(imageCyclesConfig: {
	cycles: ImageCycle[]
}): ImageCycle {
	if (!imageCyclesConfig.cycles.length) {
		return {
			largeImage: null,
			largeText: null,
			smallImage: null,
			smallText: null,
		}
	}
	const img =
		imageCyclesConfig.cycles[imageIndex % imageCyclesConfig.cycles.length]
	imageIndex = (imageIndex + 1) % imageCyclesConfig.cycles.length
	return img
}

async function readNowPlayingSafe(): Promise<NowPlayingInfo> {
	try {
		const raw = getLastNowPlaying()
		if (!raw || typeof raw !== 'object') return null
		const title = (raw.title || '').trim()
		if (!title && !raw.playbackStatus) {
			return null
		}
		const { musicFilter, videoFilter } = await readFiltersState()
		const isMusic = raw.isThumbMusic === true && raw.isThumbVideo !== true
		const isVideo = raw.isThumbVideo === true && raw.isThumbMusic !== true
		let filteredOut = false
		if (!musicFilter && !videoFilter) {
			filteredOut = true
		} else if (musicFilter && !videoFilter && !isMusic) {
			filteredOut = true
		} else if (!musicFilter && videoFilter && !isVideo) {
			filteredOut = true
		}
		if (filteredOut) {
			return {
				sourceAppId: 'Filtered',
				lastUpdatedTime: Date.now(),
				title: '',
				artist: '',
				albumTitle: '',
				albumArtist: '',
				genres: [],
				playbackStatus: 'Stopped',
				playbackType: null,
				position: null,
				duration: null,
				startedAt: null,
				endsAt: null,
			}
		}
		return {
			sourceAppId: raw.sourceAppId || 'Player',
			lastUpdatedTime:
				typeof raw.lastUpdatedTime === 'number' ? raw.lastUpdatedTime : null,
			title: raw.title || '',
			artist: raw.artist || '',
			albumTitle: raw.albumTitle || '',
			albumArtist: raw.albumArtist || '',
			genres: Array.isArray(raw.genres) ? raw.genres : [],
			playbackStatus:
				typeof raw.playbackStatus === 'string' ? raw.playbackStatus : null,
			playbackType:
				typeof raw.playbackType === 'string' ? raw.playbackType : null,
			position: typeof raw.position === 'number' ? raw.position : null,
			duration: typeof raw.duration === 'number' ? raw.duration : null,
			startedAt: typeof raw.startedAt === 'number' ? raw.startedAt : null,
			endsAt: typeof raw.endsAt === 'number' ? raw.endsAt : null,
			isThumbMusic:
				typeof raw.isThumbMusic === 'boolean' ? raw.isThumbMusic : null,
			isThumbVideo:
				typeof raw.isThumbVideo === 'boolean' ? raw.isThumbVideo : null,
		}
	} catch {
		return null
	}
}

export default function startDiscordRich(
	sendPayload: (payload: RpcPayload) => void,
) {
	isStopped = false
	const sessionId = ++currentSessionId
	hasLoggedConnectingOnce = false
	imageIndex = 0

	async function startSession() {
		if (isStopped || sessionId !== currentSessionId) return
		if (isConnecting) return
		isConnecting = true

		const { clientId, updateIntervalSec } = await readClientConfig()
		const buttonsConfig = await readButtonsConfig()
		const cyclesConfig = await readCyclesConfig()
		const imageCyclesConfig = await readImageCyclesConfig()
		const partyConfigInitial = await readPartyConfig()

		if (updateIntervalSec != null) {
			setActivityInterval(updateIntervalSec)
		}

		if (!clientId || !cyclesConfig.entries.length) {
			isConnecting = false
			sendStatus('NO_CLIENT_ID')
			if (sendLog) sendLog('No client ID or no cycles configured', 'warn')
			return
		}

		sendStatus('CONNECTING RPC')
		if (!hasLoggedConnectingOnce && sendLog) {
			sendLog('Connecting RPC Client ID: ' + clientId, 'info')
			hasLoggedConnectingOnce = true
		}

		let timestampConfig: TimestampConfig = await readTimestampConfig()
		let mode = timestampConfig.mode
		let nowMode: NowMode = timestampConfig.nowMode
		let timeCycles: TimeCycleEntry[] = Array.isArray(timestampConfig.timeCycles)
			? timestampConfig.timeCycles
			: []

		if (timestampConfig.mode === 'persist') {
			persistOffsetSecBase = timestampConfig.persistOffsetSec ?? 0
			persistSessionStart = Date.now()
		} else {
			persistOffsetSecBase = 0
			persistSessionStart = 0
		}

		const activityTypeCfg = await readActivityTypeConfig()
		let activityType: ActivityType = activityTypeCfg.type
		const filters = await readFiltersState()
		let activityFilterEnabled = filters.activityFilter === true

		const plainTimestampsMs = { start: Date.now() }

		let timeCycleIndex = 0

		function getNextTimeCycle(): TimeCycleEntry | null {
			if (!timeCycles.length) return null
			const cycle = timeCycles[timeCycleIndex % timeCycles.length]
			timeCycleIndex = (timeCycleIndex + 1) % timeCycles.length
			return cycle
		}

		function getTimestampsForPlain() {
			return plainTimestampsMs
		}

		function getTimestampsForProgress() {
			const start = Date.now()
			const base = Number.isFinite(activityIntervalMs)
				? activityIntervalMs
				: 30000
			const end = start + base
			return { start, end }
		}

		function getTimestampsForCycles(cycle: TimeCycleEntry | null): {
			start: number
			end?: number
		} {
			if (!cycle) {
				const start = Date.now()
				return { start }
			}
			const labelSec = Number(cycle.label)
			const secondsSec = Number(cycle.seconds)
			if (
				!Number.isFinite(labelSec) ||
				!Number.isFinite(secondsSec) ||
				secondsSec < 0
			) {
				const start = Date.now()
				return { start }
			}
			const now = Date.now()
			const startMs = now - labelSec * 1000
			if (secondsSec === 0) {
				return { start: startMs }
			}
			const endMs = startMs + secondsSec * 1000
			return { start: startMs, end: endMs }
		}

		function getDelayForCycles(cycle: TimeCycleEntry | null) {
			if (!cycle) return activityIntervalMs
			const secondsSec = Number(cycle.seconds)
			if (!Number.isFinite(secondsSec) || secondsSec < 0)
				return activityIntervalMs
			return secondsSec * 1000
		}

		function getTimestampsForActivity(
			modeLocal: typeof mode,
			nowModeLocal: NowMode,
			cycleForNow: TimeCycleEntry | null,
		): { start: number; end?: number } {
			if (modeLocal === 'now') {
				if (nowModeLocal === 'plain') {
					return getTimestampsForPlain()
				}
				if (nowModeLocal === 'progress') {
					return getTimestampsForProgress()
				}
				if (nowModeLocal === 'cycles') {
					return getTimestampsForCycles(cycleForNow)
				}
				return getTimestampsForPlain()
			}
			if (modeLocal === 'range') {
				const min = timestampConfig.rangeMin ?? 0
				const max = timestampConfig.rangeMax ?? 0
				const low = Math.max(0, Math.min(min, max))
				const high = Math.max(low, Math.max(min, max))
				const delta =
					high > low
						? low * 1000 + Math.random() * (high - low) * 1000
						: low * 1000
				const start = Date.now() - delta
				return { start }
			}
			if (modeLocal === 'persist') {
				const elapsedMs = Date.now() - persistSessionStart
				const totalOffsetMs = persistOffsetSecBase * 1000 + elapsedMs
				const start = Date.now() - totalOffsetMs
				return { start }
			}
			return getTimestampsForPlain()
		}

		async function updatePersistOffsetIfNeeded() {
			if (timestampConfig.mode !== 'persist') return
			const elapsedMs = Date.now() - persistSessionStart
			const totalOffsetSec = (persistOffsetSecBase * 1000 + elapsedMs) / 1000
			timestampConfig.persistOffsetSec = Math.floor(totalOffsetSec)
			await setTimestampConfig(timestampConfig)
		}

		const localClient = createClient()

		let baseCycles = cyclesConfig.entries
		let buttonPairs = Array.isArray(buttonsConfig.pairs)
			? buttonsConfig.pairs
			: []
		let partyConfig = partyConfigInitial || null

		function buildCycles(imgCycle: ImageCycle) {
			if (!baseCycles.length) return []
			return baseCycles.map((c: { details: string; state: string }) => ({
				details: c.details,
				state: c.state,
				largeImage: imgCycle.largeImage,
				largeText: imgCycle.largeText,
				smallImage: imgCycle.smallImage,
				smallText: imgCycle.smallText,
			}))
		}

		let cycles: any[] = []
		let cycleIndex = 0
		let partyIndex = 0
		let buttonIndex = 0

		let hasNowPlaying = false
		let pausedPlainTimestampsMs: { start: number } | null = null

		function getNextParty(): PartyCycleEntry | null {
			if (!partyConfig || !Array.isArray(partyConfig.entries)) return null
			if (!partyConfig.entries.length) return null
			const entry = partyConfig.entries[partyIndex % partyConfig.entries.length]
			partyIndex = (partyIndex + 1) % partyConfig.entries.length
			return entry
		}

		function getNextButtons(): { label: string; url: string }[] {
			if (!buttonPairs.length) return []
			const pair = buttonPairs[buttonIndex % buttonPairs.length]
			buttonIndex = (buttonIndex + 1) % buttonPairs.length
			const res: { label: string; url: string }[] = []
			if (pair.label1 && pair.url1) {
				res.push({ label: pair.label1, url: pair.url1 })
			}
			if (pair.label2 && pair.url2) {
				res.push({ label: pair.label2, url: pair.url2 })
			}
			return res
		}

		async function refreshConfigsIfChanged() {
			try {
				const [newButtons, newCycles, newImages, newParty, newTs, newType] =
					await Promise.all([
						readButtonsConfig(),
						readCyclesConfig(),
						readImageCyclesConfig(),
						readPartyConfig(),
						readTimestampConfig(),
						readActivityTypeConfig(),
					])
				if (newCycles.entries.length) {
					baseCycles = newCycles.entries
				}
				if (Array.isArray(newButtons.pairs)) {
					buttonPairs = newButtons.pairs
					if (buttonIndex >= buttonPairs.length) buttonIndex = 0
				}
				if (newParty) {
					partyConfig = newParty
					if (partyIndex >= partyConfig.entries.length) partyIndex = 0
				}
				const newFilters = await readFiltersState()
				timestampConfig = newTs
				mode = newTs.mode
				nowMode = newTs.nowMode
				timeCycles = Array.isArray(newTs.timeCycles) ? newTs.timeCycles : []
				activityType = newType.type
				activityFilterEnabled = newFilters.activityFilter === true
			} catch (e: any) {
				if (sendLog) {
					sendLog(
						'Config refresh error: ' + (e?.message || String(e) || ''),
						'error',
					)
				}
			}
		}

		async function pushActivity(nowPlaying: NowPlayingInfo) {
			if (isStopped || sessionId !== currentSessionId) return

			await refreshConfigsIfChanged()
			if (!baseCycles.length) return

			const imageCyclesConfigCurrent = await readImageCyclesConfig()
			const imgCycle = getNextImageCycle(imageCyclesConfigCurrent)
			cycles = buildCycles(imgCycle)
			if (!cycles.length) return

			if (cycleIndex >= cycles.length) {
				cycleIndex = 0
			}

			const current = cycles[cycleIndex]
			cycleIndex = (cycleIndex + 1) % cycles.length

			let smtcTitle = nowPlaying?.title?.trim() || ''
			let smtcArtist = nowPlaying?.artist?.trim() || ''
			const smtcStatus = nowPlaying?.playbackStatus || null
			const smtcPosRaw = nowPlaying?.position ?? null
			const smtcDur = nowPlaying?.duration ?? null

			const smtcPos =
				typeof smtcPosRaw === 'number' ? Math.floor(smtcPosRaw / 10) * 10 : null

			const isPausedOrStopped =
				smtcStatus === 'Paused' ||
				smtcStatus === 'Stopped' ||
				smtcStatus === 'Closed'

			const isPlayingLike =
				smtcStatus === 'Playing' ||
				smtcStatus === 'Opened' ||
				smtcStatus === 'Changing'

			const hasValidTrack = !!smtcTitle

			let details: string | undefined
			let state: string | undefined
			let effectiveActivityType: ActivityType = activityType

			if (isPlayingLike && hasValidTrack) {
				hasNowPlaying = true
				details = smtcTitle
				state = smtcArtist || undefined
				if (activityFilterEnabled && hasValidTrack) {
					const isMusic =
						nowPlaying?.isThumbMusic === true &&
						nowPlaying?.isThumbVideo !== true
					const isVideo =
						nowPlaying?.isThumbVideo === true &&
						nowPlaying?.isThumbMusic !== true
					if (isMusic) {
						effectiveActivityType = 'listening'
					} else if (isVideo) {
						effectiveActivityType = 'watching'
					} else {
						effectiveActivityType = activityType
					}
				}
			} else {
				details = current.details || ''
				state = current.state || ''
			}

			if (smtcTitle && smtcTitle !== currentTitle) {
				currentTitle = smtcTitle
			} else if (!smtcTitle) {
				currentTitle = null
			}

			const buttons = getNextButtons()
			const partyEntry = getNextParty()

			const safeState =
				typeof state === 'string' && state.trim().length >= 2
					? state
					: undefined

			const party =
				partyEntry &&
				Number.isFinite(partyEntry.sizeCurrent) &&
				Number.isFinite(partyEntry.sizeMax) &&
				Number(partyEntry.sizeCurrent!) > 0 &&
				partyEntry.sizeMax! >= partyEntry.sizeCurrent!
					? {
							size: [
								Number(partyEntry.sizeCurrent!),
								Number(partyEntry.sizeMax!),
							] as [number, number],
						}
					: undefined

			let cycleForNow: TimeCycleEntry | null = null

			if (mode === 'now' && nowMode === 'cycles') {
				cycleForNow = getNextTimeCycle()
			}

			let timestampsMs: { start: number; end?: number } =
				getTimestampsForActivity(mode, nowMode, cycleForNow)

			let overrideDelayMs: number | null = null

			if (isPlayingLike && smtcPos != null && smtcDur != null && smtcDur > 0) {
				pausedPlainTimestampsMs = null
				const now = Date.now()
				const startMs = now - smtcPos * 1000
				const endMs = startMs + smtcDur * 1000
				timestampsMs = { start: startMs, end: endMs }
				const remaining = endMs - now
				if (remaining > 0 && Number.isFinite(remaining)) {
					overrideDelayMs = remaining
				}
			} else if (
				nowMode === 'progress' &&
				(isPlayingLike || isPausedOrStopped)
			) {
				timestampsMs = getTimestampsForProgress()
			} else if (isPausedOrStopped) {
				if (!pausedPlainTimestampsMs) {
					pausedPlainTimestampsMs = getTimestampsForActivity(
						mode,
						nowMode,
						cycleForNow,
					)
				}
				timestampsMs = pausedPlainTimestampsMs
			}

			lastSmTcPosition = smtcPos
			lastSmTcStatus = smtcStatus || null

			if (!isPlayingLike && isPausedOrStopped) {
				hasNowPlaying = false
			}

			if (overrideDelayMs == null || overrideDelayMs < activityIntervalMs) {
				overrideDelayMs = activityIntervalMs
			}

			const finalTimestamps: { start?: number; end?: number } | undefined =
				(() => {
					const startSec = msToDiscordTs(timestampsMs.start)
					const endSec = msToDiscordTs(timestampsMs.end)
					if (!startSec && !endSec) return undefined
					const obj: { start?: number; end?: number } = {}
					if (startSec) obj.start = startSec
					if (endSec && (!startSec || endSec > startSec)) obj.end = endSec
					return obj
				})()

			let largeImage: string | undefined = current.largeImage || undefined
			let largeText: string | undefined = current.largeText || undefined
			const filtersCurrent = await readFiltersState()
			const coverFetchEnabled = filtersCurrent.coverFetchEnabled === true

			if (hasValidTrack && coverFetchEnabled && isPlayingLike) {
				const coverUrl = await resolveCoverUrl(smtcTitle, smtcArtist)
				if (coverUrl) {
					largeImage = coverUrl
				}
				largeText = undefined
			}

			const activity: RichPresencePayload = {
				details,
				state: safeState,
				assets: {
					large_image: largeImage,
					large_text: largeText,
					small_image: current.smallImage || undefined,
					small_text: current.smallText || undefined,
				},
				timestamps: finalTimestamps,
				type:
					effectiveActivityType === 'watching'
						? 3
						: effectiveActivityType === 'listening'
							? 2
							: effectiveActivityType === 'competing'
								? 5
								: 0,
			}

			if (party) activity.party = party
			if (buttons.length > 0) activity.buttons = buttons

			await (localClient as any)
				.request('SET_ACTIVITY', { pid: process.pid, activity })
				.catch((e: any) => {
					if (sendLog) {
						sendLog(
							'SET_ACTIVITY error: ' + (e?.message || JSON.stringify(e) || ''),
							'error',
						)
					}
				})

			await updatePersistOffsetIfNeeded()

			sendStatus('ACTIVE')
			sendPayload({
				details: details || '',
				state: safeState || '',
				coordinates: '',
				buttons,
			})
		}

		async function pollJsonLoop() {
			if (isStopped || sessionId !== currentSessionId) return

			try {
				const nowPlaying = await readNowPlayingSafe()
				const title = nowPlaying?.title || ''
				const status = nowPlaying?.playbackStatus || ''
				const posRaw =
					typeof nowPlaying?.position === 'number' ? nowPlaying.position : null
				const position =
					typeof posRaw === 'number' ? Math.floor(posRaw / 10) * 10 : null

				const signature = JSON.stringify({ title, status, position })

				const isPlayingLike =
					status === 'Playing' || status === 'Opened' || status === 'Changing'

				const isPausedOrStopped = !isPlayingLike

				const now = Date.now()
				const GRACE_MS = 4000

				if (now % 3600000 < activityIntervalMs) {
					cleanupMemory()
				}

				if (isPlayingLike) {
					lastStoppedAt = null
					if (signature !== lastJsonSignature) {
						lastJsonSignature = signature
						await pushActivity(nowPlaying)
					}
					setTimeout(pollJsonLoop, activityIntervalMs)
					return
				}

				if (isPausedOrStopped) {
					if (lastStoppedAt == null) {
						lastStoppedAt = now
					}

					if (now - lastStoppedAt < GRACE_MS) {
						setTimeout(pollJsonLoop, activityIntervalMs)
						return
					}

					lastJsonSignature = signature
					await pushActivity(nowPlaying)
					setTimeout(pollJsonLoop, activityIntervalMs)
					return
				}
			} catch (e) {}

			setTimeout(pollJsonLoop, activityIntervalMs)
		}

		localClient.on('ready', async () => {
			if (isStopped || sessionId !== currentSessionId) return
			isConnecting = false
			hasEverBeenReady = true
			hasLoggedConnectingOnce = false
			intervalLocked = true
			lastReadyAt = Date.now()
			isSearchingDiscord = false
			imageIndex = 0
			cycleIndex = 0
			buttonIndex = 0
			partyIndex = 0
			timeCycleIndex = 0

			try {
				const np = await readNowPlayingSafe()
				const title = np?.title || ''
				const status = np?.playbackStatus || ''
				const posRaw = typeof np?.position === 'number' ? np.position : null
				const position =
					typeof posRaw === 'number' ? Math.floor(posRaw / 10) * 10 : null

				currentTitle = title || null
				lastSmTcStatus = status || null
				lastSmTcPosition =
					typeof position === 'number' ? position : lastSmTcPosition

				if (np && (np.playbackStatus || np.title)) {
				} else {
					lastJsonSignature = ''
				}
			} catch {
				lastJsonSignature = ''
			}

			if (sendLog) sendLog('RPC ready', 'success')
			sendStatus('ACTIVE')

			await pushActivity(null)
			void pollJsonLoop()
		})

		localClient.on('disconnected', () => {
			if (isStopped || sessionId !== currentSessionId) return
			isConnecting = false
			sendStatus('DISCONNECTED')
			if (hasEverBeenReady && sendLog) {
				sendLog('RPC disconnected', 'warn')
			}
			if (restartTimer) {
				clearTimeout(restartTimer)
			}
			restartTimer = setTimeout(findAndRestartProcess, 5000)
		})

		localClient.on('error', (e: any) => {
			if (isStopped || sessionId !== currentSessionId) return
			isConnecting = false
			sendStatus('DISCONNECTED')
			if (hasEverBeenReady && sendLog) {
				sendLog('RPC error: ' + (e?.message || String(e)), 'error')
			}
			if (restartTimer) {
				clearTimeout(restartTimer)
			}
			restartTimer = setTimeout(findAndRestartProcess, 5000)
		})

		suppressFirstLoginError = !hasEverBeenReady

		localClient.login({ clientId }).catch((e: any) => {
			if (isStopped || sessionId !== currentSessionId) return
			isConnecting = false
			const msg = e?.message || ''
			const isCouldNotConnect = msg.includes('Could not connect')
			const justAfterSearch =
				isSearchingDiscord && Date.now() - lastReadyAt > 2000
			const shouldSuppress =
				suppressFirstLoginError || (isCouldNotConnect && justAfterSearch)
			if (!shouldSuppress && sendLog) {
				sendLog('RPC login error: ' + (msg || String(e)), 'error')
			}
			if (restartTimer) {
				clearTimeout(restartTimer)
			}
			restartTimer = setTimeout(findAndRestartProcess, 5000)
		})
	}

	function findAndRestartProcess() {
		if (isStopped || sessionId !== currentSessionId) return
		isSearchingDiscord = true
		checkDiscordRunning((err, isRunning) => {
			if (isStopped || sessionId !== currentSessionId) return
			if (err) {
				if (restartTimer) {
					clearTimeout(restartTimer)
				}
				restartTimer = setTimeout(findAndRestartProcess, 5000)
				return
			}
			if (!isRunning) {
				sendStatus('SEARCHING DISCORD')
				if (restartTimer) {
					clearTimeout(restartTimer)
				}
				restartTimer = setTimeout(findAndRestartProcess, 5000)
			} else {
				if (restartTimer) {
					clearTimeout(restartTimer)
				}
				if (restartInterval) {
					clearInterval(restartInterval)
				}
				restartInterval = null
				void startSession()
			}
		})
	}

	findAndRestartProcess()
}
