import { exec } from 'child_process'
import rpc from 'discord-rpc'
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
	TimestampConfig,
} from './types'

let persistSessionStart = 0
let persistOffsetSecBase = 0

export function resetPersistTimestampValue() {
	persistSessionStart = 0
	persistOffsetSecBase = 0
}

const processName = 'Discord.exe'

let client: any = null
let cycleTimer: NodeJS.Timeout | null = null
let restartTimer: NodeJS.Timeout | null = null
let restartInterval: NodeJS.Timeout | null = null
let activityIntervalMs = 30000

export function setActivityInterval(sec: number) {
	if (!Number.isFinite(sec) || sec < 5) {
		activityIntervalMs = 5000
	} else {
		activityIntervalMs = sec * 1000
	}
	if (cycleTimer) {
		clearInterval(cycleTimer)
		clearTimeout(cycleTimer as any)
		cycleTimer = null
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
	if (cycleTimer) {
		clearInterval(cycleTimer)
		clearTimeout(cycleTimer as any)
		cycleTimer = null
	}
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
		const timeCycles = Array.isArray(timestampConfig.timeCycles)
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

		function getNextTimeCycle() {
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

		function getTimestampsForCycles(
			cycle: { label: string; seconds: string } | null,
		) {
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

		function getDelayForCycles(
			cycle: { label: string; seconds: string } | null,
		) {
			if (!cycle) return activityIntervalMs
			const secondsSec = Number(cycle.seconds)
			if (!Number.isFinite(secondsSec) || secondsSec < 0)
				return activityIntervalMs
			return secondsSec * 1000
		}

		function getTimestampsForActivity(
			modeLocal: typeof mode,
			nowModeLocal: NowMode,
			cycleForNow: { label: string; seconds: string } | null,
		) {
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

			const buttons = getNextButtons()
			const partyEntry = getNextParty()

			const safeState =
				typeof current.state === 'string' && current.state.trim().length >= 2
					? current.state
					: undefined

			const party =
				partyEntry &&
				Number.isFinite(partyEntry.sizeCurrent) &&
				Number.isFinite(partyEntry.sizeMax) &&
				partyEntry.sizeCurrent! > 0 &&
				partyEntry.sizeMax! >= partyEntry.sizeCurrent!
					? { size: [partyEntry.sizeCurrent!, partyEntry.sizeMax!] }
					: undefined

			let cycleForNow: any | null = null
			let nextDelayMs: number | null = null

			if (mode === 'now' && nowMode === 'cycles') {
				cycleForNow = getNextTimeCycle()
				nextDelayMs = getDelayForCycles(cycleForNow)
			}

			const timestamps = getTimestampsForActivity(mode, nowMode, cycleForNow)

			const activity: any = {
				details: current.details,
				state: safeState,
				assets: {
					large_image: current.largeImage || undefined,
					large_text: current.largeText || undefined,
					small_image: current.smallImage || undefined,
					small_text: current.smallText || undefined,
				},
				timestamps,
				type:
					activityType === 'watching'
						? 3
						: activityType === 'listening'
							? 2
							: activityType === 'competing'
								? 5
								: 0,
			}

			if (party) {
				activity.party = party
			}

			if (buttons.length > 0) {
				activity.buttons = buttons
			}

			localClient
				.request('SET_ACTIVITY', {
					pid: process.pid,
					activity,
				})
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
				details: current.details,
				state: current.state,
				coordinates: '',
				buttons,
			})

			if (mode === 'now' && nowMode === 'cycles') {
				const delay = nextDelayMs != null ? nextDelayMs : activityIntervalMs
				if (cycleTimer) {
					clearTimeout(cycleTimer)
					cycleTimer = null
				}
				cycleTimer = setTimeout(() => {
					void pushActivity()
				}, delay)
			} else if (mode === 'now' && nowMode === 'progress') {
				const nextMs = activityIntervalMs
				if (cycleTimer) {
					clearTimeout(cycleTimer)
					cycleTimer = null
				}
				cycleTimer = setTimeout(() => {
					void pushActivity()
				}, nextMs)
			}
		}

		sendStatus('CONNECTING RPC')
		if (sendLog) sendLog('Connecting RPC with clientId ' + clientId, 'info')

		localClient.on('ready', () => {
			if (sendLog) sendLog('RPC ready', 'success')

			if (cycleTimer) {
				clearInterval(cycleTimer)
				clearTimeout(cycleTimer as any)
				cycleTimer = null
			}

			if (mode === 'now' && nowMode === 'plain') {
				void pushActivity()
				cycleTimer = setInterval(() => {
					void pushActivity()
				}, activityIntervalMs)
			} else if (
				mode === 'now' &&
				(nowMode === 'progress' || nowMode === 'cycles')
			) {
				void pushActivity()
			} else {
				void pushActivity()
				cycleTimer = setInterval(() => {
					void pushActivity()
				}, activityIntervalMs)
			}
		})

		localClient.on('disconnected', () => {
			if (sendLog) sendLog('RPC disconnected', 'warn')
			sendStatus('DISCONNECTED')

			if (cycleTimer) {
				clearInterval(cycleTimer)
				clearTimeout(cycleTimer as any)
				cycleTimer = null
			}

			if (restartTimer) {
				clearTimeout(restartTimer)
			}
			restartTimer = setTimeout(findAndRestartProcess, 5000)
		})

		localClient.on('error', (e: any) => {
			if (sendLog) sendLog('RPC error: ' + (e?.message || String(e)), 'error')
			sendStatus('DISCONNECTED')

			if (cycleTimer) {
				clearInterval(cycleTimer)
				clearTimeout(cycleTimer as any)
				cycleTimer = null
			}

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
