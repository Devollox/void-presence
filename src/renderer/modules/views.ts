import { LogEntry, RichPresencePayload, ViewName } from './types'

const logsViewList = document.getElementById(
	'logs-view-list'
) as HTMLElement | null
const logsCounter = document.getElementById(
	'logs-counter'
) as HTMLElement | null
const maxLogs = 120
const navMain = document.getElementById('nav-main') as HTMLElement | null
const navLogs = document.getElementById('nav-logs') as HTMLElement | null
const navConfig = document.getElementById('nav-config') as HTMLElement | null
const views = document.querySelectorAll<HTMLElement>('.view')

export function setActiveView(viewName: ViewName): void {
	views.forEach(v => {
		const name = v.getAttribute('data-view')
		v.setAttribute('data-active', name === viewName ? 'true' : 'false')
	})
	if (navMain) {
		navMain.setAttribute('data-active', viewName === 'main' ? 'true' : 'false')
	}
	if (navLogs) {
		navLogs.setAttribute('data-active', viewName === 'logs' ? 'true' : 'false')
	}
	if (navConfig) {
		navConfig.setAttribute(
			'data-active',
			viewName === 'config' ? 'true' : 'false'
		)
	}
}

if (navMain) {
	navMain.addEventListener('click', () => setActiveView('main'))
}
if (navLogs) {
	navLogs.addEventListener('click', () => setActiveView('logs'))
}
if (navConfig) {
	navConfig.addEventListener('click', () => setActiveView('config'))
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

	const dot = document.createElement('div')
	dot.className = 'log-level-dot'
	if (isError) {
		dot.classList.add('dot-error')
	} else if (isSuccess) {
		dot.classList.add('dot-success')
	} else if (isWarn) {
  	dot.classList.add('dot-warn')
	}

	const meta = document.createElement('div')
	meta.className = 'log-item-meta'
	meta.textContent = time + ' · ' + level.toUpperCase()

	const msg = document.createElement('div')
	msg.className = 'log-item-message'
	rawText.split('\n').forEach(line => {
		const lineEl = document.createElement('div')
		lineEl.textContent = line
		msg.appendChild(lineEl)
	})

	item.appendChild(dot)
	item.appendChild(meta)
	item.appendChild(msg)
	logsViewList.insertBefore(item, logsViewList.firstChild)

	while (logsViewList.children.length > maxLogs) {
		logsViewList.removeChild(logsViewList.lastChild as ChildNode)
	}

	if (logsCounter) {
		const count = logsViewList.children.length
		logsCounter.textContent = count + ' entries'
	}

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

export function updateInfo(payload: RichPresencePayload | null): void {
	const title = document.getElementById('activity-title') as HTMLElement | null
	const sub = document.getElementById('activity-sub') as HTMLElement | null
	const infoButtons = document.getElementById(
		'info-buttons'
	) as HTMLElement | null
	const infoObject = document.getElementById(
		'info-object'
	) as HTMLElement | null
	const infoDetails = document.getElementById(
		'info-details'
	) as HTMLElement | null
	const infoStatus = document.getElementById(
		'info-status'
	) as HTMLElement | null
	const metaObject = document.getElementById(
		'meta-object'
	) as HTMLElement | null
	const metaButtons = document.getElementById(
		'meta-buttons'
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
		metaObject.textContent = 'OBJECT: —'
		metaButtons.textContent = 'BUTTONS: —'
		return
	}

	title.textContent = payload.details || 'Rich Presence'
	sub.textContent = payload.state || ''

	const buttonsText =
		payload.buttons && payload.buttons.length
			? payload.buttons.map(b => b.label).join(' -  ')
			: 'None'

	infoButtons.textContent = buttonsText
	infoObject.textContent = payload.details || '–'
	infoDetails.textContent = payload.state || '–'
	infoStatus.textContent = 'Active'
	metaObject.textContent = `OBJECT: ${payload.details || '—'}`
	metaButtons.textContent = `BUTTONS: ${buttonsText}`
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
}
