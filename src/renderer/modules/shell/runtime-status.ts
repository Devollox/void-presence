import { LogEntry, RichPresencePayload } from '../../../types/types'

const logsViewList = document.getElementById(
	'logs-view-list',
) as HTMLElement | null
const logsCounter = document.getElementById(
	'logs-counter',
) as HTMLElement | null
const maxLogs = 120

let activityStartMs: number | null = null
let uptimeTimer: number | null = null

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

	const isDownloadProgress = rawText.startsWith('Downloading update…')

	if (isDownloadProgress) {
		const first = logsViewList.firstChild as HTMLElement | null
		if (first) {
			const msgEl = first.querySelector(
				'.log-item-message',
			) as HTMLElement | null
			const metaEl = first.querySelector('.log-item-meta') as HTMLElement | null

			if (msgEl && metaEl) {
				msgEl.textContent = ''
				rawText.split('\n').forEach(line => {
					const lineEl = document.createElement('div')
					lineEl.textContent = line
					msgEl.appendChild(lineEl)
				})

				metaEl.textContent = `${level.toUpperCase()} · ${time}`
				return
			}
		}
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
	meta.textContent = `${level.toUpperCase()} · ${time}`

	body.appendChild(msg)
	body.appendChild(meta)

	item.appendChild(dot)
	item.appendChild(body)

	logsViewList.insertBefore(item, logsViewList.firstChild)

	while (logsViewList.children.length > maxLogs) {
		logsViewList.removeChild(logsViewList.lastChild as ChildNode)
	}

	if (logsCounter) {
		const count = logsViewList.children.length
		logsCounter.textContent = count + ' entries'
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
			'sidebar-nav-item-warn',
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

function mapStatusToText(status: string): { chip: string; sub: string } {
	switch (status) {
		case 'DISABLED':
			return { chip: 'IDLE', sub: 'Waiting to start' }
		case 'SEARCHING DISCORD':
			return {
				chip: 'SEARCHING DISCORD PROCESS',
				sub: 'Looking for Discord process',
			}
		case 'CONNECTING RPC':
			return { chip: 'CONNECTING', sub: 'Attaching Rich Presence' }
		case 'ACTIVE':
			return { chip: 'ACTIVE', sub: 'Presence is broadcasting' }
		case 'RESTARTING':
			return { chip: 'RESTARTING', sub: 'Restarting Rich Presence' }
		case 'DISCONNECTED':
			return { chip: 'DISCONNECTED', sub: 'Lost connection to Discord' }
		case 'NO_CLIENT_ID':
			return { chip: 'NO CLIENT', sub: 'Set ID, cycles, update' }
		default:
			return { chip: 'UNKNOWN', sub: status || '' }
	}
}

function mapStatusCustomToText(status: string): { chip: string; sub: string } {
	switch (status) {
		case 'CUSTOM_STATUS_DISABLED':
			return { chip: 'DISABLED', sub: 'Custom status worker is off' }
		case 'CUSTOM_STATUS_CONNECTING':
			return { chip: 'CONNECTING', sub: 'Updating Discord status' }
		case 'CUSTOM_STATUS_READY':
			return { chip: 'ACTIVE', sub: 'Custom status is rotating' }
		default:
			return { chip: 'UNKNOWN', sub: status || '' }
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
	const infoUptime = document.getElementById(
		'info-uptime',
	) as HTMLElement | null
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
	const infoUptime = document.getElementById(
		'info-uptime',
	) as HTMLElement | null
	if (uptimeTimer) {
		window.clearInterval(uptimeTimer)
		uptimeTimer = null
	}
	if (infoUptime) infoUptime.textContent = '–'
}

export function updateInfo(payload: RichPresencePayload | null): void {
	const title = document.getElementById('activity-title') as HTMLElement | null
	const sub = document.getElementById('activity-sub') as HTMLElement | null
	const infoButtons = document.getElementById(
		'info-buttons',
	) as HTMLElement | null
	const infoObject = document.getElementById(
		'info-object',
	) as HTMLElement | null
	const infoDetails = document.getElementById(
		'info-details',
	) as HTMLElement | null
	const infoStatus = document.getElementById(
		'info-status',
	) as HTMLElement | null
	const metaObject = document.getElementById(
		'meta-object',
	) as HTMLElement | null
	const metaButtons = document.getElementById(
		'meta-buttons',
	) as HTMLElement | null
	const infoUptime = document.getElementById(
		'info-uptime',
	) as HTMLElement | null

	if (
		!title ||
		!sub ||
		!infoButtons ||
		!infoObject ||
		!infoDetails ||
		!infoStatus ||
		!metaObject ||
		!metaButtons
	) {
		return
	}

	if (!payload) {
		title.textContent = 'Idle'
		sub.textContent = 'Waiting for Discord'
		infoButtons.textContent = '–'
		infoObject.textContent = '–'
		infoDetails.textContent = '–'
		infoStatus.textContent = 'No active rich presence'
		metaObject.textContent = 'DETAILS: —'
		metaButtons.textContent = 'BUTTONS: —'
		if (infoUptime) infoUptime.textContent = '–'
		activityStartMs = null
		stopUptimeTimer()
		return
	}

	title.textContent = payload.details || 'Rich Presence'
	sub.textContent = payload.state || ''

	const buttonsText =
		payload.buttons && payload.buttons.length
			? payload.buttons.map(b => b.label).join(' -  ')
			: 'None'

	infoButtons.textContent = buttonsText
	infoObject.textContent = payload.details || '–'
	infoDetails.textContent = payload.state || '–'
	infoStatus.textContent = 'Active'
	metaObject.textContent = `DETAILS: ${payload.details || '—'}`
	metaButtons.textContent = `BUTTONS: ${buttonsText}`

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
		if (status === 'ACTIVE') {
			statusDot.style.background =
				'radial-gradient(circle, #4ade80 0, #22c55e 50%, #000000 100%)'
		} else if (status === 'DISCONNECTED') {
			statusDot.style.background =
				'radial-gradient(circle, #fb7185 0, #f97373 50%, #000000 100%)'
		} else if (status === 'RESTARTING' || status === 'CONNECTING RPC') {
			statusDot.style.background =
				'radial-gradient(circle, #facc15 0, #eab308 50%, #000000 100%)'
		} else if (status === 'NO_CLIENT_ID') {
			statusDot.style.background =
				'radial-gradient(circle, #f97316 0, #ea580c 50%, #000000 100%)'
		} else {
			statusDot.style.background =
				'radial-gradient(circle, #ffffff 0, #ffffff 50%, #000000 100%)'
		}
	}

	if (status !== 'ACTIVE') {
		activityStartMs = null
		stopUptimeTimer()
	}
}

export function updateStatusPageStatus(status: string): void {
	const chip = document.querySelector(
		'.status-chip-status span',
	) as HTMLElement | null
	const dot = document.querySelector('.status-dot-status') as HTMLElement | null
	const textEl = document.getElementById(
		'status-page-info-status',
	) as HTMLElement | null
	const mapped = mapStatusCustomToText(status)

	if (chip) chip.textContent = mapped.chip
	if (textEl) textEl.textContent = mapped.sub

	if (dot) {
		if (status === 'CUSTOM_STATUS_READY') {
			dot.style.background =
				'radial-gradient(circle, #4ade80 0, #22c55e 50%, #000000 100%)'
		} else if (status === 'CUSTOM_STATUS_DISABLED') {
			dot.style.background =
				'radial-gradient(circle, #ffffff 0, #ffffff 50%, #000000 100%)'
		} else if (status === 'CUSTOM_STATUS_RESTART') {
			dot.style.background =
				'radial-gradient(circle, #facc15 0, #eab308 50%, #000000 100%)'
		} else {
			dot.style.background =
				'radial-gradient(circle, #facc15 0, #eab308 50%, #000000 100%)'
		}
	}
}

export function updateStatusPageText(text: string | null): void {
	const el = document.getElementById(
		'status-page-info-text',
	) as HTMLElement | null
	const elTitleBlock = document.getElementById(
		'status-page-info-text-title-block',
	) as HTMLElement | null
	if (!el || !elTitleBlock) return

	elTitleBlock.textContent = text && text.length > 0 ? text : 'Status settings'
	el.textContent = text && text.length > 0 ? text : '–'
}

if (window.electronAPI?.onStatusStatus) {
	window.electronAPI.onStatusStatus(status => {
		updateStatusPageStatus(status)
	})
}

if (window.electronAPI?.onStatusPayload) {
	window.electronAPI.onStatusPayload(text => {
		updateStatusPageText(text)
	})
}
