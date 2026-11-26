import { t } from 'i18next'
import { LogEntry, RichPresencePayload } from '../../../types/types'

const logsViewList = document.getElementById('logs-view-list') as HTMLElement | null
const logsCounter = document.getElementById('logs-counter') as HTMLElement | null

const maxLogs = 120

type LogBadgeType = 'error' | 'success' | 'warn' | null
type ConnectionState = 'idle' | 'online' | 'syncing' | 'offline'

let activityStartMs: number | null = null
let uptimeTimer: number | null = null
let lastErrorItem: HTMLElement | null = null
let lastDownloadItem: HTMLElement | null = null
let currentConnectionState: ConnectionState = 'offline'

function getStatusTextMap(): Record<string, { title: string; second: string; value: string }> {
	return {
		IDLE: {
			title: t('idle'),
			second: t('waitingToStart'),
			value: '–',
		},
		CONNECTING: {
			title: t('idle'),
			second: t('updatingDiscordStatus'),
			value: '–',
		},
		RESTARTING: {
			title: t('idle'),
			second: t('customStatusRestarting'),
			value: '–',
		},
		SEARCHING: {
			title: t('idle'),
			second: t('lookingForDiscordProcess'),
			value: '–',
		},
		DISABLED: {
			title: t('idle'),
			second: t('waitingToStart'),
			value: '–',
		},
	}
}

function containsTranslatedText(rawText: string, key: string): boolean {
	const translated = t(key)

	return translated !== key && translated.trim().length > 0 && rawText.includes(translated)
}

function isCustomStatusErrorMessage(rawText: string): boolean {
	return [
		'customStatus.rateLimitLog',
		'customStatus.apiErrorLog',
		'customStatus.applyErrorLog',
	].some(key => containsTranslatedText(rawText, key))
}

function getLogBadgeType(rawText: string, level: string): LogBadgeType {
	const normalizedLevel = level.trim().toLowerCase()

	if (normalizedLevel === 'error') {
		return 'error'
	}

	if (normalizedLevel === 'success') {
		return 'success'
	}

	if (normalizedLevel === 'warn' || normalizedLevel === 'warning') {
		return 'warn'
	}

	if (
		isCustomStatusErrorMessage(rawText) ||
		containsTranslatedText(rawText, 'lostConnectionToDiscord') ||
		/\berror\b/i.test(rawText) ||
		/fails because/i.test(rawText) ||
		/\blost connection\b/i.test(rawText)
	) {
		return 'error'
	}

	return null
}

function getLogLevelText(type: LogBadgeType): string {
	switch (type) {
		case 'error':
			return t('logLevelError')
		case 'success':
			return t('logLevelSuccess')
		case 'warn':
			return t('logLevelWarn')
		default:
			return t('logLevelInfo')
	}
}

function getLogsBadgeTargets(): HTMLElement[] {
	return Array.from(
		document.querySelectorAll<HTMLElement>(
			'.desktop-tab[data-page="logs"], .sidebar-item[data-page="logs"]'
		)
	)
}

function ensureLogsBadge(element: HTMLElement): void {
	let wrap = element.querySelector<HTMLElement>('.sidebar-item-dot-wrap')

	if (!wrap) {
		wrap = document.createElement('span')
		wrap.className = 'sidebar-item-dot-wrap'
		wrap.setAttribute('aria-hidden', 'true')
	}

	if (wrap.parentElement !== element) {
		element.appendChild(wrap)
	}

	if (!wrap.querySelector('.sidebar-item-dot')) {
		const dot = document.createElement('span')
		dot.className = 'sidebar-item-dot'
		wrap.appendChild(dot)
	}
}

function initializeLogsBadges(): void {
	getLogsBadgeTargets().forEach(element => {
		ensureLogsBadge(element)

		element.classList.remove(
			'sidebar-nav-item-error',
			'sidebar-nav-item-success',
			'sidebar-nav-item-warn'
		)

		if (currentConnectionState === 'online' || currentConnectionState === 'idle') {
			delete element.dataset.badge
			return
		}

		element.dataset.badge = currentConnectionState === 'syncing' ? 'warn' : 'error'
	})
}

function updateLogsCounter(): void {
	if (logsCounter && logsViewList) {
		logsCounter.textContent = logsViewList.children.length + t('entries')
	}
}

function renderLogMessage(element: HTMLElement, rawText: string): void {
	element.textContent = ''

	rawText.split('\n').forEach(line => {
		const lineElement = document.createElement('div')
		lineElement.textContent = line
		element.appendChild(lineElement)
	})
}

function applyLogType(item: HTMLElement, type: LogBadgeType): void {
	item.classList.remove('log-error', 'log-success', 'log-warn')

	if (type) {
		item.classList.add(`log-${type}`)
	}

	const dot = item.querySelector<HTMLElement>('.log-level-dot')

	if (dot) {
		dot.classList.remove('dot-error', 'dot-success', 'dot-warn')

		if (type) {
			dot.classList.add(`dot-${type}`)
		}
	}
}

export function clearLogsView(): void {
	if (logsViewList) {
		logsViewList.innerHTML = ''
	}

	if (logsCounter) {
		logsCounter.textContent = '0' + t('entries')
	}

	lastErrorItem = null
	lastDownloadItem = null
}

export function downloadLogsFromView(): void {
	if (!logsViewList) return

	const lines: string[] = []

	logsViewList.querySelectorAll('.log-item').forEach(item => {
		const meta = item.querySelector<HTMLElement>('.log-item-meta')
		const msg = item.querySelector<HTMLElement>('.log-item-message')
		const metaText = meta?.textContent?.trim() || ''
		const msgLines: string[] = []

		if (msg) {
			msg.querySelectorAll('div').forEach(lineElement => {
				const text = lineElement.textContent || ''

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

	if (!lines.length) return

	const blob = new Blob([lines.join('\n')], {
		type: 'text/plain;charset=utf-8',
	})

	const url = URL.createObjectURL(blob)
	const anchor = document.createElement('a')

	anchor.href = url
	anchor.download = 'void-presence-logs.txt'

	document.body.appendChild(anchor)
	anchor.click()
	anchor.remove()

	window.setTimeout(() => {
		URL.revokeObjectURL(url)
	}, 1000)
}

function updateExistingLogItem(
	item: HTMLElement | null,
	rawText: string,
	level: string,
	time: string
): boolean {
	if (!item || !logsViewList?.contains(item)) {
		return false
	}

	const msgElement = item.querySelector<HTMLElement>('.log-item-message')
	const metaElement = item.querySelector<HTMLElement>('.log-item-meta')

	if (!msgElement || !metaElement) {
		return false
	}

	const type = getLogBadgeType(rawText, level)

	renderLogMessage(msgElement, rawText)
	applyLogType(item, type)

	metaElement.textContent = `${getLogLevelText(type)} · ${time}`

	return true
}

export function appendLog(entry: LogEntry | string): void {
	if (!logsViewList) return

	const now = new Date()
	const time = [now.getHours(), now.getMinutes(), now.getSeconds()]
		.map(value => String(value).padStart(2, '0'))
		.join(':')

	const obj = typeof entry === 'string' ? ({} as LogEntry) : entry
	const level = (obj.level || obj.type || 'info').toLowerCase()
	const rawText =
		obj.message ||
		obj.text ||
		obj.error ||
		(typeof entry === 'string' ? entry : JSON.stringify(entry))

	const downloadText = t('updateDownloadingLog')
	const isDownloadProgress =
		downloadText !== 'updateDownloadingLog' &&
		downloadText.trim().length > 0 &&
		rawText.startsWith(downloadText)

	const isCustomStatusError = isCustomStatusErrorMessage(rawText)

	if (isDownloadProgress) {
		if (updateExistingLogItem(lastDownloadItem, rawText, level, time)) {
			return
		}

		lastDownloadItem = null
	} else {
		lastDownloadItem = null
	}

	if (isCustomStatusError) {
		if (updateExistingLogItem(lastErrorItem, rawText, level, time)) {
			return
		}

		lastErrorItem = null
	}

	const type = getLogBadgeType(rawText, level)
	const item = document.createElement('div')
	const dot = document.createElement('span')
	const body = document.createElement('div')
	const msg = document.createElement('div')
	const meta = document.createElement('div')

	item.className = 'log-item'
	dot.className = 'log-level-dot'
	msg.className = 'log-item-message'
	meta.className = 'log-item-meta'

	renderLogMessage(msg, rawText)

	meta.textContent = `${getLogLevelText(type)} · ${time}`

	body.appendChild(msg)
	body.appendChild(meta)

	item.appendChild(dot)
	item.appendChild(body)

	applyLogType(item, type)

	if (isCustomStatusError) {
		lastErrorItem = item
	}

	if (isDownloadProgress) {
		lastDownloadItem = item
	}

	logsViewList.insertBefore(item, logsViewList.firstChild)

	while (logsViewList.children.length > maxLogs) {
		const lastItem = logsViewList.lastElementChild

		if (!lastItem) break

		if (lastItem === lastErrorItem) {
			lastErrorItem = null
		}

		if (lastItem === lastDownloadItem) {
			lastDownloadItem = null
		}

		lastItem.remove()
	}

	updateLogsCounter()
}

if (window.electronAPI?.onLogMessage) {
	window.electronAPI.onLogMessage(entry => {
		appendLog(entry)
	})
}

if (window.electronAPI?.onLogsDownload) {
	window.electronAPI.onLogsDownload(() => {
		downloadLogsFromView()
	})
}

if (window.electronAPI?.onLogsClear) {
	window.electronAPI.onLogsClear(() => {
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

function mapStatusCustomToText(status: string): {
	chip: string
	sub: string
} {
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

export function updateTopStatusIndicator(status: string): void {
	const indicator = document.getElementById('connection-status') as HTMLElement | null

	const { chip, sub } = mapStatusToText(status)
	const tooltipText = sub || chip

	switch (status) {
		case 'RPC_ACTIVE':
			currentConnectionState = 'online'
			break
		case 'RPC_CONNECTING':
		case 'RPC_SEARCHING_DISCORD':
		case 'RPC_RESTARTING':
			currentConnectionState = 'syncing'
			break
		case 'RPC_DISCONNECTED':
		case 'RPC_NO_CLIENT_ID':
			currentConnectionState = 'offline'
			break
		default:
			currentConnectionState = 'idle'
			break
	}

	if (indicator) {
		indicator.dataset.status = currentConnectionState
		indicator.dataset.tooltip = tooltipText
		indicator.setAttribute('aria-label', tooltipText)
	}

	initializeLogsBadges()
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

function startUptimeTimer(): void {
	const infoUptime = document.getElementById('info-uptime') as HTMLElement | null

	if (!infoUptime) return

	if (uptimeTimer !== null) {
		window.clearInterval(uptimeTimer)
		uptimeTimer = null
	}

	const updateUptime = (): void => {
		if (activityStartMs === null) {
			infoUptime.textContent = '–'
			return
		}

		infoUptime.textContent = formatDuration(Date.now() - activityStartMs)
	}

	updateUptime()
	uptimeTimer = window.setInterval(updateUptime, 1000)
}

function stopUptimeTimer(): void {
	const infoUptime = document.getElementById('info-uptime') as HTMLElement | null

	if (uptimeTimer !== null) {
		window.clearInterval(uptimeTimer)
		uptimeTimer = null
	}

	if (infoUptime) {
		infoUptime.textContent = '–'
	}
}

export function updateInfo(payload: RichPresencePayload | null): void {
	const title = document.getElementById('activity-title') as HTMLElement | null
	const sub = document.getElementById('activity-sub') as HTMLElement | null
	const infoButtons = document.getElementById('info-buttons') as HTMLElement | null
	const infoObject = document.getElementById('info-object') as HTMLElement | null
	const infoDetails = document.getElementById('info-details') as HTMLElement | null
	const infoStatus = document.getElementById('info-status') as HTMLElement | null

	if (!infoButtons || !infoObject || !infoDetails || !infoStatus) {
		return
	}

	if (!payload) {
		if (title) title.textContent = t('idle')
		if (sub) sub.textContent = t('waitingForDiscord')
		infoButtons.textContent = '–'
		infoObject.textContent = '–'
		infoDetails.textContent = '–'
		infoStatus.textContent = t('waitingToStart')

		activityStartMs = null
		stopUptimeTimer()

		return
	}

	if (title) title.textContent = payload.details || t('richPresence')
	if (sub) sub.textContent = payload.state || ''

	const buttonsText =
		payload.buttons && payload.buttons.length
			? payload.buttons.map(button => button.label).join(' - ')
			: t('none')

	infoButtons.textContent = buttonsText
	infoObject.textContent = payload.details || '–'
	infoDetails.textContent = payload.state || '–'
	infoStatus.textContent = t('active')

	if (activityStartMs === null) {
		activityStartMs = Date.now()
	}

	startUptimeTimer()
}

export function updateStatus(status: string): void {
	const chip = document.querySelector<HTMLElement>('.status-chip span')
	const subLabel = document.getElementById('activity-sub') as HTMLElement | null

	const mapped = mapStatusToText(status)

	if (chip) {
		chip.textContent = mapped.chip
	}

	if (subLabel) {
		subLabel.textContent = mapped.sub
	}

	updateTopStatusIndicator(status)

	if (status !== 'RPC_ACTIVE') {
		activityStartMs = null
		stopUptimeTimer()
	}
}

export function updateStatusStatus(status: string): void {
	const chip = document.querySelector<HTMLElement>('.status-chip-status span')
	const dot = document.querySelector<HTMLElement>('.status-dot-status')
	const textElement = document.getElementById('status-page-info-status') as HTMLElement | null

	const mapped = mapStatusCustomToText(status)

	if (chip) {
		chip.textContent = mapped.chip
	}

	if (textElement) {
		textElement.textContent = mapped.sub
	}

	if (dot) {
		if (status === 'CUSTOM_STATUS_READY') {
			dot.style.background = 'radial-gradient(circle, #4ade80 0, #22c55e 50%, #000000 100%)'
		} else if (status === 'CUSTOM_STATUS_RESTART') {
			dot.style.background = 'radial-gradient(circle, #facc15 0, #eab308 50%, #000000 100%)'
		} else {
			dot.style.background = 'radial-gradient(circle, #ffffff 0, #ffffff 50%, #000000 100%)'
		}
	}
}

export function updateStatusText(text: string | null): void {
	if (!text) return

	const element = document.getElementById('status-page-info-text') as HTMLElement | null

	const titleBlock = document.getElementById(
		'status-page-info-text-title-block'
	) as HTMLElement | null

	const secondBlock = document.getElementById(
		'status-page-info-text-second-block'
	) as HTMLElement | null

	if (!element || !titleBlock || !secondBlock) return

	const mapped = getStatusTextMap()[text]

	if (mapped) {
		titleBlock.textContent = mapped.title
		secondBlock.textContent = mapped.second
		element.textContent = mapped.value
		return
	}

	titleBlock.textContent = t('statusSettings')
	secondBlock.textContent = text
	element.textContent = text
}

updateTopStatusIndicator('RPC_DISABLED')
