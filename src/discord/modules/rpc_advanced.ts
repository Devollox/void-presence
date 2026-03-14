import { exec } from 'child_process'
import rpc from 'discord-rpc'
import { promises as fs } from 'fs'
import * as path from 'path'
import { sendLog, sendStatus } from '../../main/logging'
import {
	readActivityTypeConfig,
	readButtonsConfig,
	readClientConfig,
	readCyclesConfig,
	readImageCyclesConfig,
	readPartyConfig,
	readTimestampConfig,
	setTimestampConfig,
} from './config'
import {
	ActivityType,
	ImageCycle,
	NowMode,
	PartyCycleEntry,
	RpcPayload,
	TimeCycleEntry,
	TimestampConfig,
} from './types'

type NowPlayingInfo = {
	title: string
	artist: string
	source: string
	startedAt: number | null
	endsAt: number | null
} | null

const userDataDir =
	process.env.SMTC_USER_DATA ||
	path.join(process.env.APPDATA || '', 'Void Presence')

const nowPlayingPath = path.join(userDataDir, 'now-playing.json')

async function fetchNowPlayingFromFile(): Promise<NowPlayingInfo> {
	try {
		const raw = await fs.readFile(nowPlayingPath, 'utf-8')
		const parsed = JSON.parse(raw)
		if (!parsed || typeof parsed !== 'object') return null
		return {
			title: parsed.title || '',
			artist: parsed.artist || '',
			source: parsed.source || 'Chrome',
			startedAt: typeof parsed.startedAt === 'number' ? parsed.startedAt : null,
			endsAt: typeof parsed.endsAt === 'number' ? parsed.endsAt : null,
		}
	} catch {
		return null
	}
}

let persistSessionStart = 0
let persistOffsetSecBase = 0

export function resetPersistTimestampValue() {
	persistSessionStart = 0
	persistOffsetSecBase = 0
}

const processName = 'Discord.exe'

let client: any = null
let restartTimer: NodeJS.Timeout | null = null
let restartInterval: NodeJS.Timeout | null = null
let activityIntervalMs = 30000

let lastJsonSignature = ''
const MIN_UPDATE_DELAY_MS = 5000

let currentTitle: string | null = null
let lastEndedAt: number | null = null

const coverCache = new Map<string, string | null>()

function makeCacheKey(title: string, artist: string) {
	return `${title.toLowerCase().trim()}::${artist.toLowerCase().trim()}`
}

async function resolveCoverUrlFromITunes(
	title: string,
	artist: string,
): Promise<string | null> {
	const queryParts = []
	if (artist.trim()) queryParts.push(artist.trim())
	if (title.trim()) queryParts.push(title.trim())
	if (!queryParts.length) {
		return null
	}
	const term = encodeURIComponent(queryParts.join(' '))
	const url = `https://itunes.apple.com/search?term=${term}&entity=song&limit=1`
	try {
		const res = await fetch(url)
		if (!res.ok) {
			return null
		}
		const json: any = await res.json()
		if (!json || !Array.isArray(json.results) || json.results.length === 0) {
			return null
		}
		const result = json.results[0]
		const artwork: string | undefined =
			result.artworkUrl100 || result.artworkUrl60 || result.artworkUrl30
		if (!artwork) {
			return null
		}
		return artwork
	} catch {
		return null
	}
}

async function resolveCoverUrlFromTheAudioDb(
	title: string,
	artist: string,
): Promise<string | null> {
	if (!title.trim() || !artist.trim()) return null
	const url = `https://theaudiodb.com/api/v1/json/1/searchtrack.php?s=${encodeURIComponent(
		artist,
	)}&t=${encodeURIComponent(title)}`
	try {
		const res = await fetch(url)
		if (!res.ok) return null
		const json: any = await res.json()
		const tracks: any[] = json?.track
		if (!Array.isArray(tracks) || !tracks.length) return null
		const track = tracks[0]
		const art: string | undefined =
			track.strTrackThumb || track.strAlbumThumb || track.strMusicVidScreen
		return art || null
	} catch {
		return null
	}
}

async function resolveCoverUrlFromCoverArtArchiveByRelease(
	mbid: string,
): Promise<string | null> {
	const url = `https://coverartarchive.org/release/${encodeURIComponent(mbid)}`
	try {
		const res = await fetch(url)
		if (!res.ok) return null
		const json: any = await res.json()
		const images: any[] = json?.images
		if (!Array.isArray(images) || !images.length) return null
		const front = images.find((img: any) => img.front) || images[0]
		const href: string | undefined = front.image
		return href || null
	} catch {
		return null
	}
}

async function resolveCoverUrlFromCoverArtArchiveByGroup(
	mbid: string,
): Promise<string | null> {
	const url = `https://coverartarchive.org/release-group/${encodeURIComponent(
		mbid,
	)}`
	try {
		const res = await fetch(url)
		if (!res.ok) return null
		const json: any = await res.json()
		const images: any[] = json?.images
		if (!Array.isArray(images) || !images.length) return null
		const front = images.find((img: any) => img.front) || images[0]
		const href: string | undefined = front.image
		return href || null
	} catch {
		return null
	}
}

async function resolveCoverUrlFromMusicBrainz(
	title: string,
	artist: string,
): Promise<string | null> {
	if (!title.trim() || !artist.trim()) return null
	const query = encodeURIComponent(
		`recording:"${title}" AND artist:"${artist}"`,
	)
	const url = `https://musicbrainz.org/ws/2/recording/?query=${query}&fmt=json&limit=1`
	try {
		const res = await fetch(url, {
			headers: {
				'User-Agent': 'VoidPresence/1.0 (https://example.com)',
			},
		})
		if (!res.ok) return null
		const json: any = await res.json()
		const recs: any[] = json?.recordings
		if (!Array.isArray(recs) || !recs.length) return null
		const rec = recs[0]
		const release =
			Array.isArray(rec.releases) && rec.releases.length
				? rec.releases[0]
				: null
		const releaseMbid: string | undefined = release?.id
		const groupMbid: string | undefined = release?.['release-group']?.id
		let cover: string | null = null
		if (releaseMbid) {
			cover = await resolveCoverUrlFromCoverArtArchiveByRelease(releaseMbid)
		}
		if (!cover && groupMbid) {
			cover = await resolveCoverUrlFromCoverArtArchiveByGroup(groupMbid)
		}
		return cover
	} catch {
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

	let url: string | null = null

	url = await resolveCoverUrlFromITunes(title, artist)
	if (!url) {
		url = await resolveCoverUrlFromTheAudioDb(title, artist)
	}
	if (!url) {
		url = await resolveCoverUrlFromMusicBrainz(title, artist)
	}

	coverCache.set(key, url || null)
	return url
}

export function setActivityInterval(sec: number) {
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
	client = new rpc.Client({ transport: 'ipc' })
	return client
}

export function stopDiscordRich() {
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
}

function checkDiscordRunning(cb: (err: any, isRunning: boolean) => void) {
	exec('tasklist', (err, stdout) => {
		if (err) return cb(err, false)
		const found = stdout.toLowerCase().includes(processName.toLowerCase())
		cb(null, found)
	})
}

export default function startDiscordRich(
	sendPayload: (payload: RpcPayload) => void,
) {
	async function startSession() {
		const { clientId } = await readClientConfig()
		const buttonsConfig = await readButtonsConfig()
		const cyclesConfig = await readCyclesConfig()
		const imageCyclesConfig = await readImageCyclesConfig()
		const partyConfig = await readPartyConfig()

		if (!clientId || !cyclesConfig.entries.length) {
			sendStatus('NO_CLIENT_ID')
			if (sendLog) sendLog('No client ID or no cycles configured', 'warn')
			return
		}

		const timestampConfig: TimestampConfig = await readTimestampConfig()
		const mode = timestampConfig.mode
		const nowMode: NowMode = timestampConfig.nowMode
		const timeCycles: TimeCycleEntry[] = Array.isArray(
			timestampConfig.timeCycles,
		)
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
		const activityType: ActivityType = activityTypeCfg.type

		const plainTimestamps = { start: Date.now() }

		let timeCycleIndex = 0

		function getNextTimeCycle(): TimeCycleEntry | null {
			if (!timeCycles.length) return null
			const cycle = timeCycles[timeCycleIndex % timeCycles.length]
			timeCycleIndex = (timeCycleIndex + 1) % timeCycles.length
			return cycle
		}

		function getTimestampsForPlain() {
			return plainTimestamps
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

		const baseImageCycles: ImageCycle[] =
			imageCyclesConfig.cycles.length > 0
				? imageCyclesConfig.cycles
				: [
						{
							largeImage: null,
							largeText: null,
							smallImage: null,
							smallText: null,
						},
					]

		const localClient = createClient()

		const baseCycles = cyclesConfig.entries
		const buttonPairs = Array.isArray(buttonsConfig.pairs)
			? buttonsConfig.pairs
			: []

		const cycles = baseCycles.map((c, idx) => {
			const img = baseImageCycles[idx % baseImageCycles.length]
			return {
				details: c.details,
				state: c.state,
				largeImage: img.largeImage,
				largeText: img.largeText,
				smallImage: img.smallImage,
				smallText: img.smallText,
			}
		})

		let cycleIndex = 0
		let partyIndex = 0
		let buttonIndex = 0

		let hasNowPlaying = false
		let lastSmTcPosition: number | null = null
		let lastSmTcStatus: string | null = null
		let pausedPlainTimestamps: { start: number } | null = null

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

		async function pushActivity() {
			const current = cycles[cycleIndex]
			cycleIndex = (cycleIndex + 1) % cycles.length

			const nowPlaying = await fetchNowPlayingFromFile()

			const smtcTitle = nowPlaying?.title?.trim() || ''
			const smtcArtist = nowPlaying?.artist?.trim() || ''

			let smtcStatus: string | null = null
			let smtcPos: number | null = null
			let smtcDur: number | null = null

			try {
				const raw = await fs.readFile(nowPlayingPath, 'utf-8')
				const parsed: any = JSON.parse(raw)
				smtcStatus =
					parsed && typeof parsed.playbackStatus === 'string'
						? parsed.playbackStatus
						: null
				smtcPos =
					parsed && typeof parsed.position === 'number' ? parsed.position : null
				smtcDur =
					parsed && typeof parsed.duration === 'number' ? parsed.duration : null
			} catch {}

			const isPausedOrStopped =
				smtcStatus === 'Paused' ||
				smtcStatus === 'Stopped' ||
				smtcStatus === 'Closed'

			const isPlayingLike =
				smtcStatus === 'Playing' ||
				smtcStatus === 'Opened' ||
				smtcStatus === 'Changing'

			let details: string | undefined
			let state: string | undefined

			if (isPlayingLike && smtcTitle) {
				hasNowPlaying = true
				details = smtcTitle
				state = smtcArtist || undefined
			} else if (isPausedOrStopped) {
				details = current.details || 'Waiting for playback'
				state = current.state || 'Idle'
			} else if (!hasNowPlaying) {
				details = current.details || 'Waiting for playback'
				state = current.state || 'Idle'
			} else {
				details = undefined
				state = undefined
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
				partyEntry.sizeCurrent! > 0 &&
				partyEntry.sizeMax! >= partyEntry.sizeCurrent!
					? { size: [partyEntry.sizeCurrent!, partyEntry.sizeMax!] }
					: undefined

			let cycleForNow: TimeCycleEntry | null = null

			if (mode === 'now' && nowMode === 'cycles') {
				cycleForNow = getNextTimeCycle()
			}

			let timestamps: { start: number; end?: number } =
				getTimestampsForActivity(mode, nowMode, cycleForNow)

			let overrideDelayMs: number | null = null

			if (isPlayingLike && smtcPos != null && smtcDur != null && smtcDur > 0) {
				pausedPlainTimestamps = null
				const now = Date.now()
				const start = now - smtcPos * 1000
				const end = start + smtcDur * 1000
				timestamps = { start, end }
				const remaining = end - now
				if (remaining > 0 && Number.isFinite(remaining)) {
					overrideDelayMs = remaining
				}
			} else if (
				nowMode === 'progress' &&
				(isPlayingLike || isPausedOrStopped)
			) {
				timestamps = getTimestampsForProgress()
			} else if (isPausedOrStopped) {
				if (!pausedPlainTimestamps) {
					pausedPlainTimestamps = getTimestampsForActivity(
						mode,
						nowMode,
						cycleForNow,
					)
				}
				timestamps = pausedPlainTimestamps
			}

			lastSmTcPosition = smtcPos
			lastSmTcStatus = smtcStatus || null

			if (overrideDelayMs == null || overrideDelayMs < MIN_UPDATE_DELAY_MS) {
				overrideDelayMs = MIN_UPDATE_DELAY_MS
			}

			const finalTimestamps: { start?: number; end?: number } | undefined =
				timestamps

			const coverUrl =
				smtcTitle && smtcArtist
					? await resolveCoverUrl(smtcTitle, smtcArtist)
					: null

			let largeImage: string | undefined =
				coverUrl || current.largeImage || undefined

			const activity: any = {
				details,
				state: safeState,
				assets: {
					large_image: largeImage,
					large_text: current.largeText || undefined,
					small_image: current.smallImage || undefined,
					small_text: current.smallText || undefined,
				},
				timestamps: finalTimestamps,
				type:
					activityType === 'watching'
						? 3
						: activityType === 'listening'
							? 2
							: activityType === 'competing'
								? 5
								: 0,
			}

			if (party) activity.party = party
			if (buttons.length > 0) activity.buttons = buttons

			await localClient
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
			try {
				const data = await fs.readFile(nowPlayingPath, 'utf-8')
				let parsed: any = null
				try {
					parsed = JSON.parse(data)
				} catch {}

				const title =
					parsed && typeof parsed.title === 'string' ? parsed.title : ''
				const status =
					parsed && typeof parsed.playbackStatus === 'string'
						? parsed.playbackStatus
						: ''
				const position =
					parsed && typeof parsed.position === 'number' ? parsed.position : null

				const signature = JSON.stringify({ title, status, position })

				const isPlayingLike =
					status === 'Playing' || status === 'Opened' || status === 'Changing'

				const isPausedOrStopped =
					status === 'Paused' || status === 'Stopped' || status === 'Closed'

				if (isPlayingLike) {
					if (signature !== lastJsonSignature) {
						lastJsonSignature = signature
						await pushActivity()
					}
					setTimeout(pollJsonLoop, MIN_UPDATE_DELAY_MS)
					return
				}

				if (isPausedOrStopped) {
					if (signature !== lastJsonSignature) {
						lastJsonSignature = signature
					}
					await pushActivity()
					setTimeout(pollJsonLoop, activityIntervalMs)
					return
				}

				if (signature !== lastJsonSignature) {
					lastJsonSignature = signature
					await pushActivity()
				}

				let delay = MIN_UPDATE_DELAY_MS
				if (mode === 'now' && nowMode === 'cycles') {
					const cycle = getNextTimeCycle()
					const cycleDelay = getDelayForCycles(cycle)
					if (Number.isFinite(cycleDelay) && cycleDelay > MIN_UPDATE_DELAY_MS) {
						delay = cycleDelay
					}
				}

				setTimeout(pollJsonLoop, delay)
			} catch {
				setTimeout(pollJsonLoop, MIN_UPDATE_DELAY_MS)
			}
		}

		sendStatus('CONNECTING RPC')
		if (sendLog) sendLog('Connecting RPC with clientId ' + clientId, 'info')

		localClient.on('ready', async () => {
			if (sendLog) sendLog('RPC ready', 'success')

			try {
				const data = await fs.readFile(nowPlayingPath, 'utf-8')
				let parsed: any = null
				try {
					parsed = JSON.parse(data)
				} catch {}
				const title =
					parsed && typeof parsed.title === 'string' ? parsed.title : ''
				const status =
					parsed && typeof parsed.playbackStatus === 'string'
						? parsed.playbackStatus
						: ''
				lastJsonSignature = JSON.stringify({ title, status })
			} catch {
				lastJsonSignature = ''
			}

			await pushActivity()
			void pollJsonLoop()
		})

		localClient.on('disconnected', () => {
			if (sendLog) sendLog('RPC disconnected', 'warn')
			sendStatus('DISCONNECTED')

			if (restartTimer) {
				clearTimeout(restartTimer)
			}
			restartTimer = setTimeout(findAndRestartProcess, 5000)
		})

		localClient.on('error', (e: any) => {
			if (sendLog) sendLog('RPC error: ' + (e?.message || String(e)), 'error')
			sendStatus('DISCONNECTED')

			if (restartTimer) {
				clearTimeout(restartTimer)
			}
			restartTimer = setTimeout(findAndRestartProcess, 5000)
		})

		localClient.login({ clientId }).catch((e: any) => {
			if (sendLog) {
				sendLog('RPC login error: ' + (e?.message || String(e)), 'error')
			}
			sendStatus('DISCONNECTED')
			if (restartTimer) {
				clearTimeout(restartTimer)
			}
			restartTimer = setTimeout(findAndRestartProcess, 5000)
		})
	}

	function findAndRestartProcess() {
		checkDiscordRunning((err, isRunning) => {
			if (err) {
				if (sendLog) {
					sendLog('tasklist error: ' + (err?.message || String(err)), 'error')
				}
				sendStatus('DISCONNECTED')
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
				restartTimer = setTimeout(startSession, 25000)
				if (restartInterval) {
					clearInterval(restartInterval)
				}
			}
		})
	}

	findAndRestartProcess()
}
