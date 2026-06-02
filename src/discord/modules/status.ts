import { exec } from 'child_process'
import {
	readDiscordTokenConfig,
	readFiltersState,
	readSettings,
	readStatusCyclesConfig,
	readTimerConfig,
} from '../../main/config'
import {
	sendLog,
	sendStatusCustom,
	sendStatusCustomPayload,
} from '../../main/logging'

interface CustomStatusItem {
	text: string
	emoji: string | null
}

interface StatusStateResult {
	enabled: boolean
}

const DISCORD_API_URL = 'https://discord.com/api/v10/users/@me/settings'
const processName = 'Discord.exe'

let isStopped = true
let currentSessionId = 0
let isConnecting = false
let loopTimer: NodeJS.Timeout | null = null
let currentIndex = 0
let currentStatuses: CustomStatusItem[] = []
let activityIntervalMs = 60000
let lastSignature = ''
let hasEverBeenReady = false
let hasLoggedReadyOnce = false
let isSearchingDiscord = false

const DEFAULT_STATUSES: CustomStatusItem[] = [
	{ text: ':(', emoji: null },
	{ text: ':/', emoji: null },
	{ text: ':)', emoji: null },
]

function normalizeStatuses(list: any[] | undefined | null): CustomStatusItem[] {
	if (!Array.isArray(list)) return []
	return list
		.map(x => ({
			text: typeof x?.text === 'string' ? (x.text as string).trim() : '',
			emoji:
				typeof x?.emoji === 'string' && (x.emoji as string).trim() !== ''
					? (x.emoji as string).trim()
					: null,
		}))
		.filter((x): x is CustomStatusItem => x.text.length > 0)
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

async function isDiscordTokenValid(token: string): Promise<boolean> {
	try {
		const res = await fetch('https://discord.com/api/v10/users/@me', {
			method: 'GET',
			headers: {
				Authorization: token.trim(),
			},
		})
		return res.status === 200
	} catch {
		return false
	}
}

async function readCustomStatusState(): Promise<StatusStateResult> {
	try {
		const settings = (await readSettings()) as any
		await readFiltersState()

		const enabled: boolean = !!settings?.statusEnabled

		const statusCycles = await readStatusCyclesConfig()
		const statusesFromFile = normalizeStatuses(statusCycles?.cycles)
		const statusesFromSettings = normalizeStatuses(settings?.customStatuses)
		const statuses =
			statusesFromFile.length > 0 ? statusesFromFile : statusesFromSettings

		currentStatuses = statuses.length ? statuses : DEFAULT_STATUSES

		const timer = await readTimerConfig()
		let sec: number | null = null

		if (
			typeof timer.updateIntervalSecStatus === 'number' &&
			Number.isFinite(timer.updateIntervalSecStatus)
		) {
			sec = timer.updateIntervalSecStatus
		} else if (
			typeof settings?.customStatusIntervalSec === 'number' &&
			Number.isFinite(settings.customStatusIntervalSec)
		) {
			sec = settings.customStatusIntervalSec
		}

		activityIntervalMs =
			typeof sec === 'number' && Number.isFinite(sec) && sec >= 5
				? sec * 1000
				: 60000

		return { enabled }
	} catch (e: any) {
		if (sendLog)
			sendLog('Custom status read error: ' + (e?.message || String(e)), 'error')
		currentStatuses = DEFAULT_STATUSES
		activityIntervalMs = 5000
		return { enabled: false }
	}
}

async function applyCustomStatus(
	item: CustomStatusItem,
	token: string | null,
): Promise<{ ok: boolean; retryAfter?: number }> {
	if (!token || !token.trim()) {
		if (sendLog) sendLog('Custom status: no Discord token set', 'warn')
		return { ok: false }
	}

	const signature = `${item.text}::${item.emoji || ''}`
	if (signature === lastSignature) return { ok: true }
	lastSignature = signature

	try {
		const payload: {
			custom_status: {
				text: string
				emoji_name: string | null
				emoji_id: string | null
				expires_at: string | null
			}
		} = {
			custom_status: {
				text: item.text,
				emoji_name: item.emoji,
				emoji_id: null,
				expires_at: null,
			},
		}

		const response = await fetch(DISCORD_API_URL, {
			method: 'PATCH',
			headers: {
				Authorization: token.trim(),
				'Content-Type': 'application/json',
				'User-Agent':
					'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) discord/1.0.9006 Chrome/108.0.5359.215 Electron/22.3.26 Safari/537.36',
				Accept: '*/*',
				'Accept-Language': 'ru-RU,ru;q=0.9,en-US;q=0.8,en;q=0.7',
			},
			body: JSON.stringify(payload),
		})

		if (response.ok) {
			return { ok: true }
		} else if (response.status === 429) {
			const errData = await response.json()
			const retryAfter = errData?.retry_after ?? 10
			if (sendLog)
				sendLog(`Custom status rate limit. Retry after: ${retryAfter}s`, 'warn')
			return { ok: false, retryAfter }
		} else {
			const errData = await response.json()
			if (sendLog)
				sendLog(
					`Custom status API error (${response.status}): ` +
						JSON.stringify(errData),
					'error',
				)
			return { ok: false }
		}
	} catch (e: any) {
		if (sendLog)
			sendLog(
				'Custom status apply error: ' + (e?.message || String(e)),
				'error',
			)
		return { ok: false }
	}
}

export function stopCustomStatusWorker(): void {
	isStopped = true
	currentSessionId++
	isConnecting = false
	hasEverBeenReady = false
	hasLoggedReadyOnce = false
	currentIndex = 0
	lastSignature = ''

	if (loopTimer) {
		clearTimeout(loopTimer)
		loopTimer = null
	}

	if (sendStatusCustom) {
		sendStatusCustom('CUSTOM_STATUS_DISABLED')
		sendStatusCustomPayload(null)
	}
}

export function setCustomStatusInterval(sec: number): void {
	if (!Number.isFinite(sec) || sec < 5) activityIntervalMs = 5000
	else activityIntervalMs = sec * 1000
}

export default function startCustomStatusWorker(): void {
	if (!isStopped) return

	isStopped = false
	const sessionId = ++currentSessionId
	currentIndex = 0
	lastSignature = ''
	hasEverBeenReady = false
	hasLoggedReadyOnce = false
	isSearchingDiscord = false

	function scheduleNext(ms: number) {
		if (isStopped || sessionId !== currentSessionId) return
		loopTimer = setTimeout(tick, ms)
	}

	function findAndRestartProcess(): void {
		if (isStopped || sessionId !== currentSessionId) return
		isSearchingDiscord = true

		if (sendStatusCustom) {
			sendStatusCustom('CUSTOM_STATUS_SEARCHING_DISCORD')
			sendStatusCustomPayload('Idle')
		}

		checkDiscordRunning((err, isRunning) => {
			if (isStopped || sessionId !== currentSessionId) return

			if (err) {
				if (sendLog)
					sendLog(
						'Custom status: Discord process check error: ' +
							(err.message || String(err)),
						'warn',
					)
				setTimeout(findAndRestartProcess, 5000)
				return
			}

			isSearchingDiscord = false

			if (sendStatusCustom) {
				sendStatusCustom('CUSTOM_STATUS_CONNECTING')
				sendStatusCustomPayload(
					'Discord detected, initializing custom status...',
				)
			}

			tick()
		})
	}

	async function tick(): Promise<void> {
		if (isStopped || sessionId !== currentSessionId) return

		checkDiscordRunning((err, isRunning) => {
			if (isStopped || sessionId !== currentSessionId) return

			if (err || !isRunning) {
				if (sendStatusCustom) {
					sendStatusCustom('CUSTOM_STATUS_SEARCHING_DISCORD')
					sendStatusCustomPayload('Idle')
				}

				setTimeout(findAndRestartProcess, 5000)
				return
			}

			void tickInner()
		})
	}

	async function tickInner(): Promise<void> {
		if (isStopped || sessionId !== currentSessionId) return

		try {
			const state = await readCustomStatusState()
			const tokenCfg = await readDiscordTokenConfig()
			const token: string | null = tokenCfg?.discordToken || null

			if (!state.enabled) {
				if (sendStatusCustom && hasEverBeenReady) {
					sendStatusCustom('CUSTOM_STATUS_DISABLED')
					sendStatusCustomPayload(null)
				}

				currentIndex = 0
				lastSignature = ''
				hasEverBeenReady = false
				hasLoggedReadyOnce = false

				scheduleNext(activityIntervalMs)
				return
			}

			if (!currentStatuses.length) {
				currentStatuses = DEFAULT_STATUSES
			}

			if (!token || !token.trim()) {
				if (sendStatusCustom) {
					sendStatusCustom('CUSTOM_STATUS_DISABLED')
					if (sendLog) sendLog('Custom status: no Discord token set', 'warn')
					sendStatusCustomPayload('Discord token is not set')
				}

				currentIndex = 0
				lastSignature = ''
				hasEverBeenReady = false
				hasLoggedReadyOnce = false

				scheduleNext(activityIntervalMs)
				return
			}

			if (!(await isDiscordTokenValid(token))) {
				if (sendLog)
					sendLog(
						'Custom status: Discord token is invalid (logged out?), stopping.',
						'warn',
					)
				if (sendStatusCustom) {
					sendStatusCustom('CUSTOM_STATUS_DISABLED')
					sendStatusCustomPayload('Token invalid (logged out)')
				}

				currentIndex = 0
				lastSignature = ''
				hasEverBeenReady = false
				hasLoggedReadyOnce = false

				scheduleNext(activityIntervalMs)
				return
			}

			const item = currentStatuses[currentIndex % currentStatuses.length]
			currentIndex = (currentIndex + 1) % currentStatuses.length

			const result = await applyCustomStatus(item, token)

			if (result.ok) {
				if (!hasEverBeenReady) {
					hasEverBeenReady = true
					if (sendStatusCustom) sendStatusCustom('CUSTOM_STATUS_READY')
				}

				if (!hasLoggedReadyOnce && sendLog) {
					sendLog('Custom status ready', 'success')
					hasLoggedReadyOnce = true
				}

				if (sendStatusCustom) {
					sendStatusCustom('CUSTOM_STATUS_READY')
				}

				if (sendStatusCustomPayload) {
					sendStatusCustomPayload(item.text)
				}

				if (isStopped || sessionId !== currentSessionId) return
				scheduleNext(activityIntervalMs)
			} else {
				const waitMs = result.retryAfter
					? result.retryAfter * 1000
					: activityIntervalMs

				if (!hasEverBeenReady) {
					if (sendStatusCustom) {
						sendStatusCustom('CUSTOM_STATUS_CONNECTING')
					}
				}

				if (isStopped || sessionId !== currentSessionId) return
				scheduleNext(waitMs)
			}
		} catch (e: any) {
			if (sendLog)
				sendLog(
					'Custom status loop error: ' + (e?.message || String(e)),
					'error',
				)
			if (sendStatusCustom) {
				sendStatusCustom('CUSTOM_STATUS_ERROR')
			}

			if (isStopped || sessionId !== currentSessionId) return
			scheduleNext(activityIntervalMs)
		}
	}

	if (isConnecting) return
	isConnecting = true

	if (sendStatusCustom) {
		sendStatusCustom('CUSTOM_STATUS_CONNECTING')
		sendStatusCustomPayload('Connecting custom status...')
	}

	readCustomStatusState()
		.then(state => {
			isConnecting = false

			if (!state.enabled) {
				if (sendStatusCustom) {
					sendStatusCustom('CUSTOM_STATUS_DISABLED')
					sendStatusCustomPayload(null)
				}
				return
			}

			if (sendStatusCustom) {
				sendStatusCustom('CUSTOM_STATUS_CONNECTING')
			}

			findAndRestartProcess()
		})
		.catch(e => {
			isConnecting = false
			if (sendLog)
				sendLog(
					'custom status init error: ' + (e?.message || String(e)),
					'error',
				)
			if (sendStatusCustom) {
				sendStatusCustom('CUSTOM_STATUS_DISABLED')
				sendStatusCustomPayload('Init error, custom status disabled')
			}
		})
}
