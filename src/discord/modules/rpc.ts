import { exec } from 'child_process'
import rpc from 'discord-rpc'
import {
	readButtonsConfig,
	readClientConfig,
	readCyclesConfig,
	readPartyConfig,
	readTimerConfig,
	readTimestampConfig,
	setTimestampConfig,
} from '../../main/config'
import { sendLog, sendStatus } from '../../main/logging'
import { t } from '../../main/translations'
import { getActivePayload, subscribeToUpdates } from '../../plugins/plugin-manager'
import {
	ActivityType,
	DiscordClient,
	NowMode,
	PartyCycleEntry,
	PresencePayload,
	RichPresencePayload,
	RpcPayload,
	TimeCycleEntry,
	TimestampConfig,
} from '../../types/types'

let persistSessionStart = 0
let persistOffsetSecBase = 0
let currentTimestampConfig: TimestampConfig | null = null

export function resetPersistTimestampValue() {
	persistSessionStart = 0
	persistOffsetSecBase = 0
}

const processName = 'Discord.exe'

let client: DiscordClient | null = null
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
let isSearchingDiscord = false
let lastReadyAt = 0

const san = (v: string | null | undefined): string | undefined =>
	v && v.trim() !== '' ? v : undefined

function msToDiscordTs(ms: number | null | undefined): number | undefined {
	if (!Number.isFinite(ms as number)) return undefined
	const sec = Math.floor((ms as number) / 1000)
	return sec > 0 ? sec : undefined
}

export function setActivityInterval(sec: number) {
	if (intervalLocked) return
	activityIntervalMs = !Number.isFinite(sec) || sec < 5 ? 5000 : sec * 1000
}

function createClient() {
	if (client) {
		try {
			client.destroy()
		} catch {}
		client = null
	}
	client = new (rpc.Client as any)({ transport: 'ipc' }) as DiscordClient
	return client
}

async function savePersistOffsetIfNeeded() {
	if (!currentTimestampConfig || currentTimestampConfig.mode !== 'persist') return
	try {
		const elapsedMs = Date.now() - persistSessionStart
		currentTimestampConfig.persistOffsetSec = Math.floor(
			(persistOffsetSecBase * 1000 + elapsedMs) / 1000
		)
		await setTimestampConfig(currentTimestampConfig)
	} catch (e: any) {
		sendLog?.(t('persistOffsetSaveError', { error: e?.message || String(e) }), 'warn')
	}
}

function checkDiscordRunning(cb: (err: { message: string } | null, isRunning: boolean) => void) {
	exec('tasklist', (err, stdout) => {
		if (err) return cb(err as any, false)
		cb(null, stdout.toLowerCase().includes(processName.toLowerCase()))
	})
}

export function stopDiscordRich() {
	isStopped = true
	currentSessionId++
	intervalLocked = false
	void savePersistOffsetIfNeeded()
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
			client.destroy()
		} catch {}
		client = null
	}
	isConnecting = false
	hasEverBeenReady = false
	hasLoggedConnectingOnce = false
}

export default function startDiscordRich(sendPayload: (payload: RpcPayload) => void) {
	isStopped = false
	const sessionId = ++currentSessionId
	hasLoggedConnectingOnce = false

	async function startSession() {
		if (isStopped || sessionId !== currentSessionId) return
		if (isConnecting) return
		isConnecting = true

		const { clientId } = await readClientConfig()
		const { updateIntervalSec } = await readTimerConfig()
		const cyclesConfig = await readCyclesConfig()

		if (updateIntervalSec != null) setActivityInterval(updateIntervalSec)

		if (!clientId || !cyclesConfig.entries.length) {
			isConnecting = false
			sendStatus('RPC_NO_CLIENT_ID')
			if (sendLog) sendLog(t('rpcNoClientId'), 'warn')
			return
		}

		sendStatus('RPC_CONNECTING')
		if (!hasLoggedConnectingOnce && sendLog) {
			sendLog(t('rpcConnecting', { clientId }), 'info')
			hasLoggedConnectingOnce = true
		}

		let timestampConfig: TimestampConfig = await readTimestampConfig()
		currentTimestampConfig = timestampConfig
		let mode = timestampConfig.mode
		let nowMode: NowMode = timestampConfig.nowMode
		let timeCycles: TimeCycleEntry[] = timestampConfig.timeCycles ?? []

		if (mode === 'persist') {
			persistOffsetSecBase = timestampConfig.persistOffsetSec ?? 0
			persistSessionStart = Date.now()
		} else {
			persistOffsetSecBase = 0
			persistSessionStart = 0
		}

		const plainTimestampsMs = { start: Date.now() }
		let timeCycleIndex = 0

		function getNextTimeCycle(): TimeCycleEntry | null {
			if (!timeCycles.length) return null
			const c = timeCycles[timeCycleIndex % timeCycles.length]
			timeCycleIndex = (timeCycleIndex + 1) % timeCycles.length
			return c
		}

		function getGlobalTimestamps(cycleForNow: TimeCycleEntry | null): {
			start: number
			end?: number
		} {
			if (mode === 'range') {
				const min = timestampConfig.rangeMin ?? 0
				const max = timestampConfig.rangeMax ?? 0
				const low = Math.max(0, Math.min(min, max))
				const high = Math.max(low, Math.max(min, max))
				const delta = high > low ? low * 1000 + Math.random() * (high - low) * 1000 : low * 1000
				return { start: Date.now() - delta }
			}
			if (mode === 'persist') {
				const elapsed = Date.now() - persistSessionStart
				return { start: Date.now() - (persistOffsetSecBase * 1000 + elapsed) }
			}
			if (mode === 'now') {
				if (nowMode === 'progress') {
					const s = Date.now()
					return { start: s, end: s + activityIntervalMs }
				}
				if (nowMode === 'cycles' && cycleForNow) {
					const label = Number(cycleForNow.label)
					const secs = Number(cycleForNow.seconds)
					if (Number.isFinite(label) && Number.isFinite(secs)) {
						const startMs = Date.now() - label * 1000
						return secs > 0 ? { start: startMs, end: startMs + secs * 1000 } : { start: startMs }
					}
				}
			}
			return plainTimestampsMs
		}

		async function updatePersistOffset() {
			if (timestampConfig.mode !== 'persist') return
			const elapsed = Date.now() - persistSessionStart
			timestampConfig.persistOffsetSec = Math.floor((persistOffsetSecBase * 1000 + elapsed) / 1000)
			currentTimestampConfig = timestampConfig
			try {
				await setTimestampConfig(timestampConfig)
			} catch (e: any) {
				sendLog?.(t('persistOffsetUpdateError', { error: e?.message || String(e) }), 'warn')
			}
		}

		let buttonPairs = (await readButtonsConfig()).pairs
		let partyConfig = await readPartyConfig()
		let buttonIndex = 0
		let partyIndex = 0

		function getNextButtons(): { label: string; url: string }[] {
			if (!buttonPairs.length) return []
			const pair = buttonPairs[buttonIndex % buttonPairs.length]
			buttonIndex = (buttonIndex + 1) % buttonPairs.length
			const res: { label: string; url: string }[] = []
			if (pair.label1 && pair.url1) res.push({ label: pair.label1, url: pair.url1 })
			if (pair.label2 && pair.url2) res.push({ label: pair.label2, url: pair.url2 })
			return res
		}

		function getNextParty(): PartyCycleEntry | null {
			if (!partyConfig?.entries?.length) return null
			const e = partyConfig.entries[partyIndex % partyConfig.entries.length]
			partyIndex = (partyIndex + 1) % partyConfig.entries.length
			return e
		}

		async function refreshGlobalConfigs() {
			try {
				const [btn, party, ts] = await Promise.all([
					readButtonsConfig(),
					readPartyConfig(),
					readTimestampConfig(),
				])
				buttonPairs = btn.pairs
				partyConfig = party
				timestampConfig = ts
				currentTimestampConfig = ts
				mode = ts.mode
				nowMode = ts.nowMode
				timeCycles = ts.timeCycles ?? []
			} catch {}
		}

		const localClient = createClient()

		async function pushActivity() {
			if (isStopped || sessionId !== currentSessionId) return
			await refreshGlobalConfigs()

			const plugin: PresencePayload | null = getActivePayload()

			const details = san(plugin?.details)
			const state = san(plugin?.state)
			const activityType: ActivityType = plugin?.activityType ?? 'playing'

			let cycleForNow: TimeCycleEntry | null = null
			if (mode === 'now' && nowMode === 'cycles') cycleForNow = getNextTimeCycle()

			let tsMs: { start?: number; end?: number } | undefined
			if (plugin?.timestamps?.start) {
				tsMs = plugin.timestamps
			} else {
				const raw = getGlobalTimestamps(cycleForNow)
				tsMs = {
					start: msToDiscordTs(raw.start),
					end: msToDiscordTs(raw.end),
				}
			}
			const finalTimestamps: { start?: number; end?: number } | undefined = tsMs?.start
				? tsMs
				: undefined

			const pa = plugin?.assets
			const hasAssets = pa?.large_image || pa?.large_text || pa?.small_image || pa?.small_text
			const assets = hasAssets
				? {
						large_image: san(pa?.large_image),
						large_text: san(pa?.large_text),
						small_image: san(pa?.small_image),
						small_text: san(pa?.small_text),
					}
				: undefined

			const buttons: { label: string; url: string }[] =
				plugin?.buttons !== undefined ? (plugin.buttons ?? []) : getNextButtons()

			const partyEntry =
				plugin?.party !== undefined
					? plugin.party
					: (() => {
							const e = getNextParty()
							if (!e) return undefined
							const cur = Number(e.sizeCurrent)
							const max = Number(e.sizeMax)
							return Number.isFinite(cur) && Number.isFinite(max) && cur > 0 && max >= cur
								? { size: [cur, max] as [number, number] }
								: undefined
						})()

			const activity: RichPresencePayload = {
				details,
				state,
				...(assets ? { assets } : {}),
				...(finalTimestamps ? { timestamps: finalTimestamps } : {}),
				type:
					activityType === 'watching'
						? 3
						: activityType === 'listening'
							? 2
							: activityType === 'competing'
								? 5
								: 0,
			}
			if (partyEntry) activity.party = partyEntry
			if (buttons.length > 0) activity.buttons = buttons

			await (localClient as any)
				.request('SET_ACTIVITY', { pid: process.pid, activity })
				.catch((e: any) => {
					sendLog?.(t('rpcActivityError', { error: e?.message || String(e) }), 'error')
				})

			await updatePersistOffset()
			sendStatus('RPC_ACTIVE')
			sendPayload({ details: details || '', state: state || '', coordinates: '', buttons })
		}

		let pushPending = false
		let debounceTimer: NodeJS.Timeout | null = null

		async function onPluginUpdate() {
			if (isStopped || sessionId !== currentSessionId) return
			if (debounceTimer) clearTimeout(debounceTimer)
			debounceTimer = setTimeout(async () => {
				debounceTimer = null
				if (pushPending) return
				pushPending = true
				try {
					await pushActivity()
				} finally {
					pushPending = false
				}
			}, 150)
		}

		localClient.on('ready', async () => {
			if (isStopped || sessionId !== currentSessionId) return
			isConnecting = false
			hasEverBeenReady = true
			hasLoggedConnectingOnce = false
			intervalLocked = true
			lastReadyAt = Date.now()
			isSearchingDiscord = false
			buttonIndex = 0
			partyIndex = 0
			timeCycleIndex = 0

			if (sendLog) sendLog(t('rpcReady'), 'success')
			sendStatus('RPC_ACTIVE')

			subscribeToUpdates(() => {
				void onPluginUpdate()
			})
			setTimeout(() => {
				void onPluginUpdate()
			}, 200)
		})

		localClient.on('disconnected', () => {
			if (isStopped || sessionId !== currentSessionId) return
			isConnecting = false
			sendStatus('RPC_DISCONNECTED')
			if (hasEverBeenReady && sendLog) sendLog(t('rpcDisconnected'), 'warn')
			if (restartTimer) clearTimeout(restartTimer)
			restartTimer = setTimeout(findAndRestartProcess, 5000)
		})

		localClient.on('error', (e: any) => {
			if (isStopped || sessionId !== currentSessionId) return
			isConnecting = false
			sendStatus('RPC_DISCONNECTED')
			if (hasEverBeenReady && sendLog)
				sendLog(t('rpcLoginError', { error: e?.message || String(e) }), 'error')
			if (restartTimer) clearTimeout(restartTimer)
			restartTimer = setTimeout(findAndRestartProcess, 5000)
		})

		suppressFirstLoginError = !hasEverBeenReady
		localClient.login({ clientId }).catch((e: any) => {
			if (isStopped || sessionId !== currentSessionId) return
			isConnecting = false
			const msg = e?.message || ''
			const shouldSuppress =
				suppressFirstLoginError ||
				(msg.includes('Could not connect') && isSearchingDiscord && Date.now() - lastReadyAt > 2000)
			if (!shouldSuppress && sendLog)
				sendLog(t('rpcLoginError', { error: msg || String(e) }), 'error')
			if (restartTimer) clearTimeout(restartTimer)
			restartTimer = setTimeout(findAndRestartProcess, 5000)
		})
	}

	function findAndRestartProcess() {
		if (isStopped || sessionId !== currentSessionId) return
		isSearchingDiscord = true
		checkDiscordRunning((err, isRunning) => {
			if (isStopped || sessionId !== currentSessionId) return
			if (err || !isRunning) {
				sendStatus('RPC_SEARCHING_DISCORD')
				if (restartTimer) clearTimeout(restartTimer)
				restartTimer = setTimeout(findAndRestartProcess, 5000)
			} else {
				if (restartTimer) clearTimeout(restartTimer)
				if (restartInterval) clearInterval(restartInterval)
				restartInterval = null
				void startSession()
			}
		})
	}

	findAndRestartProcess()
}
