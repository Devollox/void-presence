import { t } from 'i18next'
import { LogEntry, RichPresencePayload } from '../../../types/types'

const logsViewList = document.getElementById('logs-view-list') as HTMLElement | null
const logsCounter = document.getElementById('logs-counter') as HTMLElement | null
const maxLogs = 120

let activityStartMs: number | null = null
let uptimeTimer: number | null = null
let lastErrorItem: HTMLElement | null = null

function getStatusTextMap(): Record<string, { title: string; second: string; value: string }> {
	return {
		IDLE: {
			title: t('idle'),
			second: t('waitingToStart'),
			value: '-',
		},
		CONNECTING: {
			title: t('idle'),
			second: t('updatingDiscordStatus'),
			value: '-',
		},
		RESTARTING: {
			title: t('idle'),
			second: t('customStatusRestarting'),
			value: '-',
		},
		SEARCHING: {
			title: t('idle'),
			second: t('lookingForDiscordProcess'),
			value: '-',
		},
		DISABLED: {
			title: t('idle'),
			second: t('waitingToStart'),
			value: '-',
		},
	}
}

export function clearLogsView(): void {
	if (logsViewList) {
		logsViewList.innerHTML = ''
	}
	if (logsCounter) {
		logsCounter.textContent = '0' + t('entries')
	}

	const navLogs = document.getElementById('nav-logs') as HTMLElement | null
	if (navLogs) {
		navLogs.classList.remove(
			'sidebar-nav-item-error',
			'sidebar-nav-item-success',
			'sidebar-nav-item-warn'
		)
	}
}

export function downloadLogsFromView(): void {
	if (!logsViewList) return

	const lines: string[] = []

	logsViewList.querySelectorAll('.log-item').forEach(item => {
		const meta = item.querySelector('.log-item-meta') as HTMLElement | null
		const msg = item.querySelector('.log-item-message') as HTMLElement | null

		const metaText = meta?.textContent?.trim() || ''
		const msgLines: string[] = []

		if (msg) {
			msg.querySelectorAll('div').forEach(lineEl => {
				const text = lineEl.textContent || ''
				if (text.trim().length > 0) {
					msgLines.push(text)
				}
			})
		}

		const msgText = msgLines.join(' | ')
		const full = metaText ? `${metaText} :: ${msgText}` : msgText
		if (full.trim().length > 0) {
			lines.push(full)
		}
	})

	if (!lines.length) {
		return
	}

	const blob = new Blob([lines.join('\n')], {
		type: 'text/plain;charset=utf-8',
	})

	const url = URL.createObjectURL(blob)
	const a = document.createElement('a')
	a.href = url
	a.download = 'void-presence-logs.txt'
	a.click()
	URL.revokeObjectURL(url)
}

function updateExistingLogItem(
	item: HTMLElement | null,
	rawText: string,
	level: string,
	time: string
): boolean {
	if (!item) return false

	const msgEl = item.querySelector('.log-item-message') as HTMLElement | null
	const metaEl = item.querySelector('.log-item-meta') as HTMLElement | null

	if (!msgEl || !metaEl) return false

	msgEl.textContent = ''
	rawText.split('\n').forEach(line => {
		const lineEl = document.createElement('div')
		lineEl.textContent = line
		msgEl.appendChild(lineEl)
	})

	const isErrorText = /error/i.test(rawText) || /fails because/i.test(rawText)
	const isError = level === 'error' || isErrorText
	const isSuccess = level === 'success'
	const isWarn = level === 'warn'

	const levelText = isError
		? t('logLevelError')
		: isSuccess
			? t('logLevelSuccess')
			: isWarn
				? t('logLevelWarn')
				: t('logLevelInfo')
	metaEl.textContent = `${levelText} · ${time}`
	return true
}

export function appendLog(entry: LogEntry | string): void {
	if (!logsViewList) return

	const now = new Date()
	const time =
		String(now.getHours()).padStart(2, '0') +
		':' +
		String(now.getMinutes()).padStart(2, '0') +
		':' +
		String(now.getSeconds()).padStart(2, '0')

	const obj = typeof entry === 'string' ? ({} as LogEntry) : entry
	const level = (obj.level || obj.type || 'info').toLowerCase()
	const rawText =
		obj.message ||
		obj.text ||
		obj.error ||
		(typeof entry === 'string' ? entry : JSON.stringify(entry))

	const isDownloadProgress = rawText.startsWith(`${t('updateDownloadingLog')}`)
	const isCustomStatusError =
		rawText.includes(`${t('customStatus.rateLimitLog')}`) ||
		rawText.includes(`${t('customStatus.apiErrorLog')}`) ||
		rawText.includes(`${t('customStatus.applyErrorLog')}`)

	if (isDownloadProgress) {
		const first = logsViewList.firstChild as HTMLElement | null
		if (updateExistingLogItem(first, rawText, level, time)) {
			return
		}
	}

	if (isCustomStatusError) {
		if (updateExistingLogItem(lastErrorItem, rawText, level, time)) {
			return
		}
		lastErrorItem = null
	}

	const isErrorText = /error/i.test(rawText) || /fails because/i.test(rawText)
	const isError = level === 'error' || isErrorText
	const isSuccess = level === 'success'
	const isWarn = level === 'warn'

	const item = document.createElement('div')
	item.className = 'log-item'
	if (isError) {
		item.classList.add('log-error')
	} else if (isSuccess) {
		item.classList.add('log-success')
	} else if (isWarn) {
		item.classList.add('log-warn')
	}

	const dot = document.createElement('span')
	dot.className = 'log-level-dot'
	if (isError) {
		dot.classList.add('dot-error')
	} else if (isSuccess) {
		dot.classList.add('dot-success')
	} else if (isWarn) {
		dot.classList.add('dot-warn')
	}

	const body = document.createElement('div')

	const msg = document.createElement('div')
	msg.className = 'log-item-message'
	rawText.split('\n').forEach(line => {
		const lineEl = document.createElement('div')
		lineEl.textContent = line
		msg.appendChild(lineEl)
	})

	const meta = document.createElement('div')
	meta.className = 'log-item-meta'
	const levelText = isError
		? t('logLevelError')
		: isSuccess
			? t('logLevelSuccess')
			: isWarn
				? t('logLevelWarn')
				: t('logLevelInfo')
	meta.textContent = `${levelText} · ${time}`

	body.appendChild(msg)
	body.appendChild(meta)

	item.appendChild(dot)
	item.appendChild(body)

	if (isCustomStatusError) {
		lastErrorItem = item
	}

	logsViewList.insertBefore(item, logsViewList.firstChild)

	while (logsViewList.children.length > maxLogs) {
		logsViewList.removeChild(logsViewList.lastChild as ChildNode)
	}

	if (logsCounter) {
		const count = logsViewList.children.length
		logsCounter.textContent = count + t('entries')
	}

	const navLogs = document.getElementById('nav-logs') as HTMLElement | null
	if (navLogs) {
		const first = logsViewList.firstChild as HTMLElement | null
		const firstIsError = first && first.classList.contains('log-error')
		const firstIsSuccess = first && first.classList.contains('log-success')
		const firstIsWarn = first && first.classList.contains('log-warn')

		navLogs.classList.remove(
			'sidebar-nav-item-error',
			'sidebar-nav-item-success',
			'sidebar-nav-item-warn'
		)

		let highlightClass: string | null = null

		if (firstIsError) {
			highlightClass = 'sidebar-nav-item-error'
		} else if (firstIsSuccess) {
			highlightClass = 'sidebar-nav-item-success'
		} else if (firstIsWarn) {
			highlightClass = 'sidebar-nav-item-warn'
		}

		if (highlightClass) {
			navLogs.classList.add(highlightClass)
			setTimeout(() => {
				navLogs.classList.remove(highlightClass as string)
			}, 5000)
		}
	}
}

if (window.electronAPI?.onLogMessage) {
	window.electronAPI.onLogMessage(entry => {
		appendLog(entry)
	})
}

if (window.electronAPI?.onLogsDownload) {
	window.electronAPI?.onLogsDownload?.(() => {
		downloadLogsFromView()
	})
}

if (window.electronAPI?.onLogsClear) {
	window.electronAPI?.onLogsClear?.(() => {
		clearLogsView()
	})
}

function mapStatusToText(status: string): { chip: string; sub: string } {
	switch (status) {
		case 'RPC_DISABLED':
			return { chip: t('idle'), sub: t('waitingToStart') }
		case 'RPC_SEARCHING_DISCORD':
			return {
				chip: t('searchingDiscordProcess'),
				sub: t('lookingForDiscordProcess'),
			}
		case 'RPC_CONNECTING':
			return { chip: t('connecting'), sub: t('attachingRichPresence') }
		case 'RPC_ACTIVE':
			return { chip: t('active'), sub: t('presenceIsBroadcasting') }
		case 'RPC_RESTARTING':
			return { chip: t('restarting'), sub: t('customStatusRestarting') }
		case 'RPC_DISCONNECTED':
			return { chip: t('disconnected'), sub: t('lostConnectionToDiscord') }
		case 'RPC_NO_CLIENT_ID':
			return { chip: t('noClient'), sub: t('noClientId') }
		default:
			return { chip: t('unknown'), sub: status || '' }
	}
}

function mapStatusCustomToText(status: string): { chip: string; sub: string } {
	switch (status) {
		case 'CUSTOM_STATUS_DISABLED':
			return { chip: t('idle'), sub: t('waitingToStart') }
		case 'CUSTOM_STATUS_CONNECTING':
			return { chip: t('connecting'), sub: t('updatingDiscordStatus') }
		case 'CUSTOM_STATUS_RESTART':
			return { chip: t('restarting'), sub: t('customStatusRestarting') }
		case 'CUSTOM_STATUS_READY':
			return { chip: t('active'), sub: t('active') }
		case 'CUSTOM_STATUS_SEARCHING_DISCORD':
			return {
				chip: t('searchingDiscordProcess'),
				sub: t('lookingForDiscordProcess'),
			}
		default:
			return { chip: t('unknown'), sub: status || '' }
	}
}

function formatDuration(ms: number): string {
	const totalSeconds = Math.floor(ms / 1000)
	const hours = Math.floor(totalSeconds / 3600)
	const minutes = Math.floor((totalSeconds % 3600) / 60)
	const seconds = totalSeconds % 60

	const h = hours.toString().padStart(2, '0')
	const m = minutes.toString().padStart(2, '0')
	const s = seconds.toString().padStart(2, '0')

	return `${h}:${m}:${s}`
}

function startUptimeTimer() {
	const infoUptime = document.getElementById('info-uptime') as HTMLElement | null
	if (!infoUptime) return

	if (uptimeTimer) {
		window.clearInterval(uptimeTimer)
		uptimeTimer = null
	}

	uptimeTimer = window.setInterval(() => {
		if (!activityStartMs) {
			infoUptime.textContent = '–'
			return
		}
		const diffMs = Date.now() - activityStartMs
		infoUptime.textContent = formatDuration(diffMs)
	}, 1000)
}

function stopUptimeTimer() {
	const infoUptime = document.getElementById('info-uptime') as HTMLElement | null
	if (uptimeTimer) {
		window.clearInterval(uptimeTimer)
		uptimeTimer = null
	}
	if (infoUptime) infoUptime.textContent = '–'
}

export function updateInfo(payload: RichPresencePayload | null): void {
	const title = document.getElementById('activity-title') as HTMLElement | null
	const sub = document.getElementById('activity-sub') as HTMLElement | null
	const infoButtons = document.getElementById('info-buttons') as HTMLElement | null
	const infoObject = document.getElementById('info-object') as HTMLElement | null
	const infoDetails = document.getElementById('info-details') as HTMLElement | null
	const infoStatus = document.getElementById('info-status') as HTMLElement | null
	const infoUptime = document.getElementById('info-uptime') as HTMLElement | null

	if (!title || !sub || !infoButtons || !infoObject || !infoDetails || !infoStatus) {
		return
	}

	if (!payload) {
		title.textContent = t('idle')
		sub.textContent = t('waitingForDiscord')
		infoButtons.textContent = '–'
		infoObject.textContent = '–'
		infoDetails.textContent = '–'
		infoStatus.textContent = t('waitingToStart')
		if (infoUptime) infoUptime.textContent = '–'
		activityStartMs = null
		stopUptimeTimer()
		return
	}

	title.textContent = payload.details || t('richPresence')
	sub.textContent = payload.state || ''

	const buttonsText =
		payload.buttons && payload.buttons.length
			? payload.buttons.map(b => b.label).join(' - ')
			: t('none')

	infoButtons.textContent = buttonsText
	infoObject.textContent = payload.details || '–'
	infoDetails.textContent = payload.state || '–'
	infoStatus.textContent = t('active')

	if (!activityStartMs) {
		activityStartMs = Date.now()
	}
	startUptimeTimer()
}

export function updateStatus(status: string): void {
	const chip = document.querySelector('.status-chip span') as HTMLElement | null
	const statusDot = document.querySelector('.status-dot') as HTMLElement | null
	const subLabel = document.getElementById('activity-sub') as HTMLElement | null
	const mapped = mapStatusToText(status)

	if (chip) chip.textContent = mapped.chip
	if (subLabel) subLabel.textContent = mapped.sub

	if (statusDot) {
		if (status === 'RPC_ACTIVE') {
			statusDot.style.background = 'radial-gradient(circle, #4ade80 0, #22c55e 50%, #000000 100%)'
		} else if (status === 'RPC_DISCONNECTED') {
			statusDot.style.background = 'radial-gradient(circle, #fb7185 0, #f97373 50%, #000000 100%)'
		} else if (status === 'RPC_RESTARTING' || status === 'CONNECTING RPC') {
			statusDot.style.background = 'radial-gradient(circle, #facc15 0, #eab308 50%, #000000 100%)'
		} else if (status === 'RPC_NO_CLIENT_ID') {
			statusDot.style.background = 'radial-gradient(circle, #f97316 0, #ea580c 50%, #000000 100%)'
		} else {
			statusDot.style.background = 'radial-gradient(circle, #ffffff 0, #ffffff 50%, #000000 100%)'
		}
	}

	if (status !== 'RPC_ACTIVE') {
		activityStartMs = null
		stopUptimeTimer()
	}
}

export function updateStatusStatus(status: string): void {
	const chip = document.querySelector('.status-chip-status span') as HTMLElement | null
	const dot = document.querySelector('.status-dot-status') as HTMLElement | null
	const textEl = document.getElementById('status-page-info-status') as HTMLElement | null
	const mapped = mapStatusCustomToText(status)

	if (chip) chip.textContent = mapped.chip
	if (textEl) textEl.textContent = mapped.sub

	if (dot) {
		if (status === 'CUSTOM_STATUS_READY') {
			dot.style.background = 'radial-gradient(circle, #4ade80 0, #22c55e 50%, #000000 100%)'
		} else if (status === 'CUSTOM_STATUS_DISABLED') {
			dot.style.background = 'radial-gradient(circle, #ffffff 0, #ffffff 50%, #000000 100%)'
		} else if (status === 'CUSTOM_STATUS_RESTART') {
			dot.style.background = 'radial-gradient(circle, #facc15 0, #eab308 50%, #000000 100%)'
		} else if (status === 'CUSTOM_STATUS_SEARCHING_DISCORD') {
			dot.style.background = 'radial-gradient(circle, #ffffff 0, #ffffff 50%, #000000 100%)'
		} else {
			dot.style.background = 'radial-gradient(circle, #ffffff 0, #ffffff 50%, #000000 100%)'
		}
	}
}

export function updateStatusText(text: string | null): void {
	if (!text) return

	const el = document.getElementById('status-page-info-text') as HTMLElement | null
	const elTitleBlock = document.getElementById(
		'status-page-info-text-title-block'
	) as HTMLElement | null
	const elSecondBlock = document.getElementById(
		'status-page-info-text-second-block'
	) as HTMLElement | null

	if (!el || !elTitleBlock || !elSecondBlock) return

	const value = text && text.length > 0 ? text : 'IDLE'
	const mapped = getStatusTextMap()[text]

	if (mapped) {
		elTitleBlock.textContent = mapped.title
		elSecondBlock.textContent = mapped.second
		el.textContent = mapped.value
		return
	}

	elTitleBlock.textContent = t('statusSettings')
	elSecondBlock.textContent = value
	el.textContent = value
}
