import { exec } from 'child_process'
import { CustomStatusItem, StatusStateResult } from 'src/types/types'
import {
	readDiscordTokenConfig,
	readFiltersState,
	readSettings,
	readStatusCyclesConfig,
	readTimerConfig,
} from '../../main/config'
import { sendLog, sendStatusCustom, sendStatusCustomPayload } from '../../main/logging'
import { t } from '../../main/translations'

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
let enabledBrowser = false

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

function checkDiscordRunning(cb: (err: { message: string } | null, isRunning: boolean) => void) {
	exec('tasklist', (err, stdout) => {
		if (err) return cb(err, false)
		const found = stdout.toLowerCase().includes(processName.toLowerCase())
		cb(null, found)
	})
}

async function readCustomStatusState(): Promise<StatusStateResult> {
	try {
		const settings = (await readSettings()) as any
		await readFiltersState()

		const enabled: boolean = !!settings?.statusEnabled
		const browserEnabled: boolean = !!settings?.statusEnabledBrowser

		const statusCycles = await readStatusCyclesConfig()
		const statusesFromFile = normalizeStatuses(statusCycles?.cycles)
		const statusesFromSettings = normalizeStatuses(settings?.customStatuses)
		const statuses = statusesFromFile.length > 0 ? statusesFromFile : statusesFromSettings

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
			typeof sec === 'number' && Number.isFinite(sec) && sec >= 5 ? sec * 1000 : 60000

		return {
			enabled: enabled || browserEnabled,
			enabledBrowser: browserEnabled,
		}
	} catch (e: any) {
		if (sendLog) sendLog(t('customStatus.readError', { error: e?.message || String(e) }), 'error')
		currentStatuses = DEFAULT_STATUSES
		activityIntervalMs = 5000
		return { enabled: false, enabledBrowser: false }
	}
}

async function applyCustomStatus(
	item: CustomStatusItem,
	token: string | null
): Promise<{ ok: boolean; retryAfter?: number }> {
	if (!token || !token.trim()) {
		if (sendLog) sendLog(t('customStatus.noDiscordToken'), 'warn')
		return { ok: false }
	}

	const signature = `${item.text}::${item.emoji || ''}`
	if (signature === lastSignature) return { ok: true }
	lastSignature = signature

	let lastError: any = null

	for (let attempt = 1; attempt <= 2; attempt++) {
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
				if (sendLog) sendLog(t('customStatus.rateLimit', { retry: String(retryAfter) }), 'warn')
				return { ok: false, retryAfter: retryAfter + 1 }
			} else {
				const errData = await response.json()
				lastError = errData
				if (attempt === 1) {
					continue
				}
				if (sendLog)
					sendLog(
						t('customStatus.apiError', {
							status: String(response.status),
							error: JSON.stringify(errData),
						}),
						'error'
					)
				return { ok: false }
			}
		} catch (e: any) {
			lastError = e
			if (attempt === 1) {
				continue
			}
			if (sendLog)
				sendLog(t('customStatus.applyError', { error: e?.message || String(e) }), 'error')
			return { ok: false }
		}
	}

	if (sendLog)
		sendLog(
			t('customStatus.applyError', {
				error: lastError?.message || JSON.stringify(lastError) || 'unknown error',
			}),
			'error'
		)
	return { ok: false }
}

export function stopCustomStatusWorker(): void {
	isStopped = true
	currentSessionId++
	isConnecting = false
	hasEverBeenReady = false
	hasLoggedReadyOnce = false
	currentIndex = 0
	lastSignature = ''
	enabledBrowser = false

	if (loopTimer) {
		clearTimeout(loopTimer)
		loopTimer = null
	}

	if (sendStatusCustom) {
		sendStatusCustom('CUSTOM_STATUS_DISABLED')
		sendStatusCustomPayload('IDLE')
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
	enabledBrowser = false

	function scheduleNext(ms: number) {
		if (isStopped || sessionId !== currentSessionId) return
		loopTimer = setTimeout(() => {
			void tick()
		}, ms)
	}

	function findAndRestartProcess(): void {
		if (isStopped || sessionId !== currentSessionId) return
		isSearchingDiscord = true

		if (sendStatusCustom) {
			sendStatusCustom('CUSTOM_STATUS_SEARCHING_DISCORD')
			sendStatusCustomPayload('SEARCHING')
		}

		checkDiscordRunning((err, isRunning) => {
			if (isStopped || sessionId !== currentSessionId) return

			if (err) {
				if (sendLog)
					sendLog(
						t('customStatus.processCheckError', {
							error: err.message || String(err),
						}),
						'warn'
					)
				setTimeout(findAndRestartProcess, 5000)
				return
			}

			isSearchingDiscord = false

			if (sendStatusCustom) {
				sendStatusCustom('CUSTOM_STATUS_CONNECTING')
				sendStatusCustomPayload('CONNECTING')
			}

			void tick()
		})
	}

	async function tick(): Promise<void> {
		if (isStopped || sessionId !== currentSessionId) return

		if (enabledBrowser) {
			void tickInner()
			return
		}

		checkDiscordRunning((err, isRunning) => {
			if (isStopped || sessionId !== currentSessionId) return

			if (err || !isRunning) {
				if (sendStatusCustom) {
					sendStatusCustom('CUSTOM_STATUS_SEARCHING_DISCORD')
					sendStatusCustomPayload('SEARCHING')
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
					sendStatusCustomPayload('IDLE')
				}

				currentIndex = 0
				lastSignature = ''
				hasEverBeenReady = false
				hasLoggedReadyOnce = false
				enabledBrowser = false

				stopCustomStatusWorker()
				return
			}

			if (!currentStatuses.length) {
				currentStatuses = DEFAULT_STATUSES
			}

			if (!token || !token.trim()) {
				if (sendStatusCustom) {
					sendStatusCustom('CUSTOM_STATUS_DISABLED')
					sendStatusCustomPayload('IDLE')
					if (sendLog) sendLog(t('customStatus.noDiscordToken'), 'warn')
				}

				currentIndex = 0
				lastSignature = ''
				hasEverBeenReady = false
				hasLoggedReadyOnce = false
				enabledBrowser = false

				stopCustomStatusWorker()
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
					sendLog(t('customStatus.ready'), 'success')
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
				const waitMs = result.retryAfter ? result.retryAfter * 1000 + 500 : activityIntervalMs

				if (!hasEverBeenReady) {
					if (sendStatusCustom) {
						sendStatusCustom('CUSTOM_STATUS_CONNECTING')
						sendStatusCustomPayload('CONNECTING')
					}
				}

				if (isStopped || sessionId !== currentSessionId) return
				scheduleNext(waitMs)
			}
		} catch (e: any) {
			if (sendLog) sendLog(t('customStatus.loopError', { error: e?.message || String(e) }), 'error')
			if (sendStatusCustom) {
				sendStatusCustom('CUSTOM_STATUS_DISABLED')
				sendStatusCustomPayload('IDLE')
			}

			if (isStopped || sessionId !== currentSessionId) return
			scheduleNext(activityIntervalMs)
		}
	}

	if (isConnecting) return
	isConnecting = true

	if (sendStatusCustom) {
		sendStatusCustom('CUSTOM_STATUS_CONNECTING')
		sendStatusCustomPayload('CONNECTING')
	}

	readCustomStatusState()
		.then(state => {
			isConnecting = false

			if (!state.enabled) {
				if (sendStatusCustom) {
					sendStatusCustom('CUSTOM_STATUS_DISABLED')
					sendStatusCustomPayload('IDLE')
				}
				return
			}

			if (sendStatusCustom) {
				sendStatusCustom('CUSTOM_STATUS_CONNECTING')
				sendStatusCustomPayload('CONNECTING')
			}

			enabledBrowser = state.enabledBrowser
			if (state.enabledBrowser) {
				void tick()
			} else {
				findAndRestartProcess()
			}
		})
		.catch(e => {
			isConnecting = false
			enabledBrowser = false
			if (sendLog) sendLog(t('customStatus.initError', { error: e?.message || String(e) }), 'error')
			if (sendStatusCustom) {
				sendStatusCustom('CUSTOM_STATUS_DISABLED')
				sendStatusCustomPayload('IDLE')
			}
		})
}
