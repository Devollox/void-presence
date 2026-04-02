import { exec } from 'child_process'
import rpc from 'discord-rpc'
import { sendLog, sendStatus } from '../../main/logging'
import {
	ActivityType,
	DiscordClient,
	ImageCycle,
	NowMode,
	PartyCycleEntry,
	RichPresencePayload,
	RpcPayload,
	TimeCycleEntry,
	TimestampConfig,
} from '../../types/types'
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

let persistSessionStart = 0
let persistOffsetSecBase = 0

export function resetPersistTimestampValue() {
	persistSessionStart = 0
	persistOffsetSecBase = 0
}

const processName = 'Discord.exe'

let client: DiscordClient | null = null
let cycleTimer: NodeJS.Timeout | null = null
let restartTimer: NodeJS.Timeout | null = null
let restartInterval: NodeJS.Timeout | null = null
let activityIntervalMs = 30000
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

export function setActivityInterval(sec: number) {
	if (intervalLocked) return
	if (!Number.isFinite(sec) || sec < 5) {
		activityIntervalMs = 5000
	} else {
		activityIntervalMs = sec * 1000
	}
	if (cycleTimer) {
		clearInterval(cycleTimer)
		clearTimeout(cycleTimer)
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
	client = new rpc.Client({ transport: 'ipc' }) as unknown as DiscordClient
	return client
}

export function stopDiscordRich() {
	isStopped = true
	currentSessionId++
	intervalLocked = false
	imageIndex = 0
	if (cycleTimer) {
		clearInterval(cycleTimer)
		clearTimeout(cycleTimer)
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
	isConnecting = false
	hasEverBeenReady = false
	hasLoggedConnectingOnce = false
}

function checkDiscordRunning(
	cb: (err: { message: string }, isRunning: boolean) => void,
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
			sendLog('Connecting RPC with clientId ' + clientId, 'info')
			hasLoggedConnectingOnce = true
		}

		let timestampConfig: TimestampConfig = await readTimestampConfig()
		let mode = timestampConfig.mode
		let nowMode: NowMode = timestampConfig.nowMode
		let timeCycles = Array.isArray(timestampConfig.timeCycles)
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

				timestampConfig = newTs
				mode = newTs.mode
				nowMode = newTs.nowMode
				timeCycles = Array.isArray(newTs.timeCycles) ? newTs.timeCycles : []
				activityType = newType.type
			} catch (e) {
				if (sendLog) {
					sendLog(
						'Config refresh error: ' + (e?.message || JSON.stringify(e)),
						'error',
					)
				}
			}
		}

		async function pushActivity() {
			if (isStopped || sessionId !== currentSessionId) return

			await refreshConfigsIfChanged()
			if (!baseCycles.length) return

			const imageCyclesConfig = await readImageCyclesConfig()
			const imgCycle = getNextImageCycle(imageCyclesConfig)
			cycles = buildCycles(imgCycle)

			if (!cycles.length) return

			if (cycleIndex >= cycles.length) {
				cycleIndex = 0
			}

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
			let nextDelayMs: number | null = null

			if (mode === 'now' && nowMode === 'cycles') {
				cycleForNow = getNextTimeCycle()
				nextDelayMs = getDelayForCycles(
					cycleForNow as unknown as { label: string; seconds: string },
				)
			}

			const timestamps = getTimestampsForActivity(
				mode,
				nowMode,
				cycleForNow as unknown as { label: string; seconds: string },
			)

			const activity: RichPresencePayload = {
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
				.catch((e: { message: string }) => {
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

		localClient.on('ready', () => {
			if (isStopped || sessionId !== currentSessionId) return
			isConnecting = false
			hasEverBeenReady = true
			hasLoggedConnectingOnce = false
			intervalLocked = true
			lastReadyAt = Date.now()
			isSearchingDiscord = false
			if (sendLog) sendLog('RPC ready', 'success')
			sendStatus('ACTIVE')

			if (cycleTimer) {
				clearInterval(cycleTimer)
				clearTimeout(cycleTimer)
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
			if (isStopped || sessionId !== currentSessionId) return
			isConnecting = false

			sendStatus('DISCONNECTED')
			if (hasEverBeenReady && sendLog) {
				sendLog('RPC disconnected', 'warn')
			}

			if (cycleTimer) {
				clearInterval(cycleTimer)
				clearTimeout(cycleTimer)
				cycleTimer = null
			}

			if (restartTimer) {
				clearTimeout(restartTimer)
			}
			restartTimer = setTimeout(findAndRestartProcess, 5000)
		})

		localClient.on('error', (e: { message: string }) => {
			if (isStopped || sessionId !== currentSessionId) return
			isConnecting = false

			sendStatus('DISCONNECTED')
			if (hasEverBeenReady && sendLog) {
				sendLog('RPC error: ' + (e?.message || String(e)), 'error')
			}

			if (cycleTimer) {
				clearInterval(cycleTimer)
				clearTimeout(cycleTimer)
				cycleTimer = null
			}

			if (restartTimer) {
				clearTimeout(restartTimer)
			}
			restartTimer = setTimeout(findAndRestartProcess, 5000)
		})

		suppressFirstLoginError = !hasEverBeenReady

		localClient.login({ clientId }).catch((e: { message: string }) => {
			if (isStopped || sessionId !== currentSessionId) return
			isConnecting = false

			const msg = e?.message || ''
			const isCouldNotConnect = msg.includes('Could not connect')
			const justAfterSearch =
				isSearchingDiscord && Date.now() - lastReadyAt > 2000
			const shouldSuppress =
				suppressFirstLoginError || (isCouldNotConnect && justAfterSearch)

			if (!shouldSuppress && sendLog) {
				sendLog('RPC login error: ' + (msg || JSON.stringify(e)), 'error')
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
