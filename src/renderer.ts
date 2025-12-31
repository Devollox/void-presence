export {}

type ViewName = 'main' | 'logs' | 'config'

interface LogEntry {
	level?: string
	type?: string
	message?: string
	text?: string
	error?: string
}

interface RichPresenceButton {
	label: string
	url: string
}

interface RichPresencePayload {
	details?: string
	state?: string
	buttons?: RichPresenceButton[]
}

interface ButtonPair {
	label1: string
	url1: string
	label2?: string
	url2?: string
}

interface CycleEntry {
	details: string
	state: string
}

interface ImageCycleEntry {
	largeImage: string
	largeText: string
	smallImage: string
	smallText: string
}

interface FullState {
	clientId?: string
	updateIntervalSec?: number | string
	buttonPairs?: ButtonPair[]
	cycles?: CycleEntry[]
	imageCycles?: ImageCycleEntry[]
}

interface StoredConfig {
	name: string
	state: FullState
	createdAt?: string
}

interface VoidPresenceCtx {
	buttonPairs: ButtonPair[]
	cycles: CycleEntry[]
	imageCycles: ImageCycleEntry[]
	renderButtonPairs: () => void
	renderCycles: () => void
	renderImageCycles: () => void
}

interface ElectronAPI {
	onLogMessage?: (handler: (entry: LogEntry) => void) => void
	onRpcUpdate?: (handler: (payload: RichPresencePayload) => void) => void
	onRpcStatus?: (handler: (status: string) => void) => void
	setClientId?: (id: string) => Promise<void>
	setButtons?: (pairs: ButtonPair[]) => Promise<void>
	setButtonPairs?: (pairs: ButtonPair[]) => Promise<void>
	setCycles?: (cycles: CycleEntry[]) => Promise<void>
	setImageCycles?: (cycles: ImageCycleEntry[]) => Promise<void>
	setActivityInterval?: (sec: number) => Promise<void>
	restartDiscordRich?: () => Promise<void>
	stopDiscordRich?: () => Promise<void>
	setAutoLaunch?: (on: boolean) => Promise<void> | void
	setAutoHide?: (on: boolean) => Promise<void> | void
	windowClose?: () => void
	windowMinimize?: () => void
	uploadConfig?: (config: {
		title: string
		author: string
		configData: FullState
	}) => Promise<unknown>
}

declare global {
	interface Window {
		electronAPI?: ElectronAPI
		__voidPresenceCtx?: VoidPresenceCtx
		addConfigFromState?: (name: string, state: FullState) => void
	}
}

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

function setActiveView(viewName: ViewName): void {
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

function appendLog(entry: LogEntry | string): void {
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

	const item = document.createElement('div')
	item.className = 'log-item'
	if (isError) {
		item.classList.add('log-error')
	} else if (isSuccess) {
		item.classList.add('log-success')
	}

	const dot = document.createElement('div')
	dot.className = 'log-level-dot'
	if (isError) {
		dot.classList.add('dot-error')
	} else if (isSuccess) {
		dot.classList.add('dot-success')
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

		navLogs.classList.remove(
			'sidebar-nav-item-error',
			'sidebar-nav-item-success'
		)

		if (firstIsError) {
			navLogs.classList.add('sidebar-nav-item-error')
		} else if (firstIsSuccess) {
			navLogs.classList.add('sidebar-nav-item-success')
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

function updateInfo(payload: RichPresencePayload | null): void {
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
			? payload.buttons.map(b => b.label).join(' -  ')
			: 'None'

	infoButtons.textContent = buttonsText
	infoObject.textContent = payload.details || '–'
	infoDetails.textContent = payload.state || '–'
	infoStatus.textContent = 'Active'
	metaObject.textContent = `OBJECT: ${payload.details || '—'}`
	metaButtons.textContent = `BUTTONS: ${buttonsText}`
}

function updateStatus(status: string): void {
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

async function setupIntervalControl(): Promise<void> {
	const input = document.getElementById(
		'update-interval-input'
	) as HTMLInputElement | null
	if (!input) return
	const saved = parseInt(localStorage.getItem('updateIntervalSec') || '30', 10)
	if (!Number.isNaN(saved) && saved > 0) {
		input.value = String(saved)
		if (window.electronAPI?.setActivityInterval) {
			await window.electronAPI.setActivityInterval(saved)
		}
	}
}

function setupRestartButton(): void {
	const btn = document.getElementById(
		'restart-discord'
	) as HTMLButtonElement | null
	if (!btn) return
	btn.addEventListener('click', e => {
		e.preventDefault()
		if (window.electronAPI?.restartDiscordRich) {
			updateStatus('RESTARTING')
			window.electronAPI.restartDiscordRich()
		}
	})
}

function createButtonPairRow(
	pair: ButtonPair,
	index: number,
	onChange: (pair: ButtonPair) => void,
	onRemove: () => void
): HTMLDivElement {
	const row = document.createElement('div')
	row.className = 'pair-row'
	row.dataset.index = String(index)
	row.draggable = true

	const inputsWrap = document.createElement('div')
	inputsWrap.className = 'pair-inputs'

	const input1 = document.createElement('input')
	input1.placeholder = 'Label #1'
	input1.value = pair.label1 || ''

	const input2 = document.createElement('input')
	input2.placeholder = 'URL #1'
	input2.value = pair.url1 || ''

	const input3 = document.createElement('input')
	input3.placeholder = 'Label #2'
	input3.value = pair.label2 || ''

	const input4 = document.createElement('input')
	input4.placeholder = 'URL #2'
	input4.value = pair.url2 || ''

	const remove = document.createElement('button')
	remove.className = 'remove-btn'
	remove.type = 'button'
	remove.textContent = '×'

	function triggerChange(): void {
		onChange({
			label1: input1.value,
			url1: input2.value,
			label2: input3.value,
			url2: input4.value,
		})
	}

	input1.addEventListener('input', triggerChange)
	input2.addEventListener('input', triggerChange)
	input3.addEventListener('input', triggerChange)
	input4.addEventListener('input', triggerChange)

	remove.addEventListener('click', e => {
		e.preventDefault()
		onRemove()
	})

	row.appendChild(remove)
	inputsWrap.appendChild(input1)
	inputsWrap.appendChild(input2)
	inputsWrap.appendChild(input3)
	inputsWrap.appendChild(input4)
	row.appendChild(inputsWrap)

	return row
}

function createCycleRow(
	entry: CycleEntry,
	index: number,
	onChange: (entry: CycleEntry) => void,
	onRemove: () => void
): HTMLDivElement {
	const row = document.createElement('div')
	row.className = 'cycle-row'
	row.dataset.index = String(index)
	row.draggable = true

	const inputsWrap = document.createElement('div')
	inputsWrap.className = 'cycle-inputs'

	const input1 = document.createElement('input')
	input1.placeholder = 'Details'
	input1.value = entry.details || ''

	const input2 = document.createElement('input')
	input2.placeholder = 'State'
	input2.value = entry.state || ''

	const remove = document.createElement('button')
	remove.className = 'remove-btn'
	remove.type = 'button'
	remove.textContent = '×'

	function triggerChange(): void {
		onChange({
			details: input1.value,
			state: input2.value,
		})
	}

	input1.addEventListener('input', triggerChange)
	input2.addEventListener('input', triggerChange)

	remove.addEventListener('click', e => {
		e.preventDefault()
		onRemove()
	})

	row.appendChild(remove)
	inputsWrap.appendChild(input1)
	inputsWrap.appendChild(input2)
	row.appendChild(inputsWrap)

	return row
}

function createImageCycleRow(
	entry: ImageCycleEntry,
	index: number,
	onChange: (entry: ImageCycleEntry) => void,
	onRemove: () => void
): HTMLDivElement {
	const row = document.createElement('div')
	row.className = 'image-row'
	row.dataset.index = String(index)
	row.draggable = true

	const wrap = document.createElement('div')
	wrap.className = 'image-inputs'

	const largeKey = document.createElement('input')
	largeKey.placeholder = 'Large image key or URL'
	largeKey.value = entry.largeImage || ''

	const largeText = document.createElement('input')
	largeText.placeholder = 'Large hover text'
	largeText.value = entry.largeText || ''

	const smallKey = document.createElement('input')
	smallKey.placeholder = 'Small image key or URL'
	smallKey.value = entry.smallImage || ''

	const smallText = document.createElement('input')
	smallText.placeholder = 'Small hover text'
	smallText.value = entry.smallText || ''

	const remove = document.createElement('button')
	remove.className = 'remove-btn'
	remove.type = 'button'
	remove.textContent = '×'

	function triggerChange(): void {
		onChange({
			largeImage: largeKey.value,
			largeText: largeText.value,
			smallImage: smallKey.value,
			smallText: smallText.value,
		})
	}

	largeKey.addEventListener('input', triggerChange)
	largeText.addEventListener('input', triggerChange)
	smallKey.addEventListener('input', triggerChange)
	smallText.addEventListener('input', triggerChange)

	remove.addEventListener('click', e => {
		e.preventDefault()
		onRemove()
	})

	row.appendChild(remove)
	wrap.appendChild(largeKey)
	wrap.appendChild(largeText)
	wrap.appendChild(smallKey)
	wrap.appendChild(smallText)
	row.appendChild(wrap)

	return row
}

function loadCurrentState(): FullState {
	const clientId = localStorage.getItem('clientId') || ''
	const buttonPairs =
		(JSON.parse(localStorage.getItem('buttonPairs') || '[]') as ButtonPair[]) ||
		[]
	const cycles =
		(JSON.parse(localStorage.getItem('cycles') || '[]') as CycleEntry[]) || []
	const imageCycles =
		(JSON.parse(
			localStorage.getItem('imageCycles') || '[]'
		) as ImageCycleEntry[]) || []
	return { clientId, buttonPairs, cycles, imageCycles }
}

async function saveAllFromState(state: FullState): Promise<void> {
	const clientId = (state.clientId || '').trim()
	const buttonPairs = Array.isArray(state.buttonPairs) ? state.buttonPairs : []
	const cycles = Array.isArray(state.cycles) ? state.cycles : []
	const imageCycles = Array.isArray(state.imageCycles) ? state.imageCycles : []

	const cleanedPairs: ButtonPair[] = buttonPairs
		.map(p => {
			const label1 = (p.label1 || '').trim()
			const url1 = (p.url1 || '').trim()
			const label2 = (p.label2 || '').trim()
			const url2 = (p.url2 || '').trim()
			const has1 = !!(label1 && url1)
			const has2 = !!(label2 && url2)
			return {
				label1: has1 ? label1 : '',
				url1: has1 ? url1 : '',
				label2: has2 ? label2 : '',
				url2: has2 ? url2 : '',
			}
		})
		.filter(p => (p.label1 && p.url1) || (p.label2 && p.url2))
		.map(p => {
			const res: ButtonPair = { label1: p.label1, url1: p.url1 }
			if (p.label2 && p.url2) {
				res.label2 = p.label2
				res.url2 = p.url2
			}
			return res
		})

	const cleanedCycles: CycleEntry[] = cycles
		.map(c => ({
			details: (c.details || '').trim(),
			state: (c.state || '').trim(),
		}))
		.filter(c => c.details.length > 0 || c.state.length > 0)

	const cleanedImageCycles: ImageCycleEntry[] = imageCycles
		.map(c => ({
			largeImage: (c.largeImage || '').trim(),
			largeText: (c.largeText || '').trim(),
			smallImage: (c.smallImage || '').trim(),
			smallText: (c.smallText || '').trim(),
		}))
		.filter(
			c =>
				c.largeImage.length > 0 ||
				c.largeText.length > 0 ||
				c.smallImage.length > 0 ||
				c.smallText.length > 0
		)

	const intervalSecRaw = Number(state.updateIntervalSec)

	if (
		!clientId ||
		!cleanedCycles.length ||
		!Number.isFinite(intervalSecRaw) ||
		intervalSecRaw <= 0
	) {
		updateStatus('NO_CLIENT_ID')
		return
	}

	localStorage.setItem('clientId', clientId)
	localStorage.setItem('buttonPairs', JSON.stringify(cleanedPairs))
	localStorage.setItem('cycles', JSON.stringify(cleanedCycles))
	localStorage.setItem('imageCycles', JSON.stringify(cleanedImageCycles))
	localStorage.setItem('updateIntervalSec', String(intervalSecRaw))

	if (window.electronAPI?.setClientId) {
		await window.electronAPI.setClientId(clientId)
	}
	if (window.electronAPI?.setImageCycles) {
		await window.electronAPI.setImageCycles(cleanedImageCycles)
	}
	if (window.electronAPI?.setButtons) {
		await window.electronAPI.setButtons(cleanedPairs)
	}
	if (window.electronAPI?.setCycles) {
		await window.electronAPI.setCycles(cleanedCycles)
	}
	if (window.electronAPI?.setActivityInterval) {
		await window.electronAPI.setActivityInterval(intervalSecRaw)
	}
	if (window.electronAPI?.restartDiscordRich) {
		await window.electronAPI.restartDiscordRich()
	}
}

function applyStateToUIAndLists(state: FullState, ctx: VoidPresenceCtx): void {
	const clientInput = document.getElementById(
		'client-id-input'
	) as HTMLInputElement | null
	if (!clientInput) return
	clientInput.value = state.clientId || ''
	localStorage.setItem('clientId', state.clientId || '')
	localStorage.setItem('buttonPairs', JSON.stringify(state.buttonPairs || []))
	localStorage.setItem('cycles', JSON.stringify(state.cycles || []))
	localStorage.setItem('imageCycles', JSON.stringify(state.imageCycles || []))
	ctx.buttonPairs = Array.isArray(state.buttonPairs) ? state.buttonPairs : []
	ctx.cycles = Array.isArray(state.cycles) ? state.cycles : []
	ctx.imageCycles = Array.isArray(state.imageCycles) ? state.imageCycles : []
	ctx.renderButtonPairs()
	ctx.renderCycles()
	ctx.renderImageCycles()
}

function renderList(
	listEl: HTMLElement,
	items: any[],
	type: 'cycles' | 'images' | 'buttons'
): void {
	listEl.innerHTML = ''
	if (!items || !items.length) {
		const empty = document.createElement('div')
		empty.className = 'config-details-empty'
		empty.textContent =
			type === 'cycles'
				? 'No cycles saved'
				: type === 'images'
					? 'No image configuration'
					: 'No buttons configured'
		listEl.appendChild(empty)
		return
	}

	items.forEach((item, idx) => {
		const row = document.createElement('div')
		row.className = 'config-details-item'

		const main = document.createElement('div')
		main.className = 'config-details-item-main'

		const meta = document.createElement('div')
		meta.className = 'config-details-item-meta'

		if (type === 'cycles') {
			const label = document.createElement('div')
			label.className = 'config-details-item-label'
			label.textContent = item.details || 'No details'

			const sub = document.createElement('div')
			sub.className = 'config-details-item-sub'
			sub.textContent = item.state || 'No state'

			main.appendChild(label)
			main.appendChild(sub)

			const pill = document.createElement('div')
			pill.className = 'config-details-pill'
			pill.textContent = `#${idx + 1}`
			meta.appendChild(pill)
		} else if (type === 'images') {
			const label = document.createElement('div')
			label.className = 'config-details-item-label'
			label.textContent = item.largeText || item.largeImage || 'Large image'

			const largeUrlPill = document.createElement('div')
			largeUrlPill.className = 'config-details-pill'
			const largeLink = document.createElement('a')
			largeLink.href = item.largeImage || '#'
			largeLink.textContent = item.largeImage || 'no large url'
			largeLink.target = '_blank'
			largeUrlPill.appendChild(largeLink)

			main.appendChild(label)
			main.appendChild(largeUrlPill)

			const sub = document.createElement('div')
			sub.className = 'config-details-item-sub'
			sub.textContent = item.smallText || item.smallImage || 'Small image'

			const smallUrlPill = document.createElement('div')
			smallUrlPill.className = 'config-details-pill'
			const smallLink = document.createElement('a')
			smallLink.href = item.smallImage || '#'
			smallLink.textContent = item.smallImage || 'no'
			if (smallLink.textContent !== 'no') {
				smallLink.target = '_blank'
				smallUrlPill.appendChild(smallLink)
				meta.appendChild(sub)
				meta.appendChild(smallUrlPill)
			}
		} else if (type === 'buttons') {
			const mainLabel = document.createElement('div')
			mainLabel.className = 'config-details-item-label'
			mainLabel.textContent = item.label1 || 'Button 1'

			const mainUrlPill = document.createElement('div')
			mainUrlPill.className = 'config-details-pill'
			const mainLink = document.createElement('a')
			mainLink.href = item.url1 || '#'
			mainLink.textContent = item.url1 || 'no url 1'
			if (mainLink.textContent !== 'no url 1') {
				mainLink.target = '_blank'
				mainUrlPill.appendChild(mainLink)
				main.appendChild(mainLabel)
				main.appendChild(mainUrlPill)
			}

			const metaLabel = document.createElement('div')
			metaLabel.className = 'config-details-item-label'
			metaLabel.textContent = item.label2 || 'Button 2'

			const metaUrlPill = document.createElement('div')
			metaUrlPill.className = 'config-details-pill'
			const metaLink = document.createElement('a')
			metaLink.href = item.url2 || '#'
			metaLink.textContent = item.url2 || 'no url 2'
			if (metaLink.textContent !== 'no url 2') {
				metaLink.target = '_blank'
				metaUrlPill.appendChild(metaLink)
				main.appendChild(metaLabel)
				main.appendChild(metaUrlPill)
			}
		}

		row.appendChild(main)
		row.appendChild(meta)
		listEl.appendChild(row)
	})
}

function setupClientIdControls(): void {
	const clientInput = document.getElementById(
		'client-id-input'
	) as HTMLInputElement | null
	const saveBtn = document.getElementById(
		'client-id-save'
	) as HTMLButtonElement | null
	const buttonsList = document.getElementById(
		'buttons-list'
	) as HTMLElement | null
	const addButtonPair = document.getElementById(
		'add-button-pair'
	) as HTMLButtonElement | null
	const cyclesList = document.getElementById(
		'cycles-list'
	) as HTMLElement | null
	const addCycle = document.getElementById(
		'add-cycle'
	) as HTMLButtonElement | null
	const imagesList = document.getElementById(
		'images-list'
	) as HTMLElement | null
	const addImage = document.getElementById(
		'add-image'
	) as HTMLButtonElement | null

	if (
		!clientInput ||
		!saveBtn ||
		!buttonsList ||
		!addButtonPair ||
		!cyclesList ||
		!addCycle ||
		!imagesList ||
		!addImage
	) {
		return
	}

	saveBtn.type = 'button'
	clientInput.value = localStorage.getItem('clientId') || ''

	const ctx: VoidPresenceCtx = {
		buttonPairs: [],
		cycles: [],
		imageCycles: [],
		renderButtonPairs: () => {},
		renderCycles: () => {},
		renderImageCycles: () => {},
	}

	try {
		const rawPairs = localStorage.getItem('buttonPairs')
		if (rawPairs) ctx.buttonPairs = JSON.parse(rawPairs) as ButtonPair[]
	} catch {}

	try {
		const rawCycles = localStorage.getItem('cycles')
		if (rawCycles) ctx.cycles = JSON.parse(rawCycles) as CycleEntry[]
	} catch {}

	try {
		const rawImages = localStorage.getItem('imageCycles')
		if (rawImages) ctx.imageCycles = JSON.parse(rawImages) as ImageCycleEntry[]
	} catch {}

	if (!Array.isArray(ctx.buttonPairs)) ctx.buttonPairs = []
	if (!Array.isArray(ctx.cycles) || !ctx.cycles.length) {
		ctx.cycles = [
			{ details: 'Idling in the void', state: 'Just vibing' },
			{ details: 'Counting stars', state: 'Lost in space' },
			{ details: 'Listening to silence', state: 'Deep focus' },
		]
	}
	if (!Array.isArray(ctx.imageCycles)) ctx.imageCycles = []

	function attachDnD<T>(
		container: HTMLElement,
		items: T[],
		renderFn: () => void
	): void {
		let dragIndex: number | null = null

		container.addEventListener('dragstart', e => {
			const target = e.target as HTMLElement | null
			if (!target) return

			const isInput =
				target instanceof HTMLInputElement ||
				target instanceof HTMLTextAreaElement
			if (isInput || window.getSelection()?.toString()) {
				e.preventDefault()
				return
			}

			const row = target.closest<HTMLElement>('[data-index]')
			if (!row) return
			dragIndex = Number(row.dataset.index)
			row.classList.add('dragging')
		})

		container.addEventListener('dragend', e => {
			const target = e.target as HTMLElement | null
			const row = target?.closest<HTMLElement>('[data-index]')
			if (row) row.classList.remove('dragging')
			Array.from(container.children).forEach(ch => {
				;(ch as HTMLElement).classList.remove(
					'drop-target-top',
					'drop-target-bottom'
				)
			})
			dragIndex = null
		})

		container.addEventListener('dragover', e => {
			e.preventDefault()
			const target = e.target as HTMLElement | null
			const row = target?.closest<HTMLElement>('[data-index]')
			if (!row || dragIndex === null) return
			Array.from(container.children).forEach(ch => {
				;(ch as HTMLElement).classList.remove(
					'drop-target-top',
					'drop-target-bottom'
				)
			})
			const rect = row.getBoundingClientRect()
			const offset = e.clientY - rect.top
			if (offset < rect.height / 2) {
				row.classList.add('drop-target-top')
			} else {
				row.classList.add('drop-target-bottom')
			}
		})

		container.addEventListener('drop', e => {
			e.preventDefault()
			const target = e.target as HTMLElement | null
			const row = target?.closest<HTMLElement>('[data-index]')
			if (!row || dragIndex === null) return
			const targetIndex = Number(row.dataset.index)
			const rect = row.getBoundingClientRect()
			const offset = e.clientY - rect.top
			let insertIndex = targetIndex
			if (offset >= rect.height / 2) insertIndex = targetIndex + 1
			const [moved] = items.splice(dragIndex, 1)
			if (insertIndex > items.length) insertIndex = items.length
			items.splice(insertIndex, 0, moved)
			renderFn()
		})
	}

	ctx.renderButtonPairs = function renderButtonPairs(): void {
		if (!buttonsList) return
		buttonsList.innerHTML = ''
		ctx.buttonPairs.forEach((pair, idx) => {
			const row = createButtonPairRow(
				pair,
				idx,
				updated => {
					ctx.buttonPairs[idx] = updated
				},
				() => {
					ctx.buttonPairs.splice(idx, 1)
					ctx.renderButtonPairs()
				}
			)
			buttonsList.appendChild(row)
		})
	}

	ctx.renderCycles = function renderCycles(): void {
		if (!cyclesList) return
		cyclesList.innerHTML = ''
		ctx.cycles.forEach((entry, idx) => {
			const row = createCycleRow(
				entry,
				idx,
				updated => {
					ctx.cycles[idx] = updated
				},
				() => {
					ctx.cycles.splice(idx, 1)
					ctx.renderCycles()
				}
			)
			cyclesList.appendChild(row)
		})
	}

	ctx.renderImageCycles = function renderImageCycles(): void {
		if (!imagesList) return
		imagesList.innerHTML = ''
		ctx.imageCycles.forEach((entry, idx) => {
			const row = createImageCycleRow(
				entry,
				idx,
				updated => {
					ctx.imageCycles[idx] = updated
				},
				() => {
					ctx.imageCycles.splice(idx, 1)
					ctx.renderImageCycles()
				}
			)
			imagesList.appendChild(row)
		})
	}

	ctx.renderButtonPairs()
	ctx.renderCycles()
	ctx.renderImageCycles()

	if (buttonsList)
		attachDnD(buttonsList, ctx.buttonPairs, ctx.renderButtonPairs)
	if (cyclesList) attachDnD(cyclesList, ctx.cycles, ctx.renderCycles)
	if (imagesList) attachDnD(imagesList, ctx.imageCycles, ctx.renderImageCycles)

	addButtonPair.addEventListener('click', e => {
		e.preventDefault()
		ctx.buttonPairs.push({
			label1: '',
			url1: '',
			label2: '',
			url2: '',
		})
		ctx.renderButtonPairs()
	})

	addCycle.addEventListener('click', e => {
		e.preventDefault()
		ctx.cycles.push({
			details: '',
			state: '',
		})
		ctx.renderCycles()
	})

	addImage.addEventListener('click', e => {
		e.preventDefault()
		ctx.imageCycles.push({
			largeImage: '',
			largeText: '',
			smallImage: '',
			smallText: '',
		})
		ctx.renderImageCycles()
	})

	async function saveAll(): Promise<void> {
		const intervalInput = document.getElementById(
			'update-interval-input'
		) as HTMLInputElement | null
		const intervalSec = intervalInput
			? parseInt(intervalInput.value.trim(), 10)
			: NaN
		const state: FullState = {
			clientId: clientInput.value,
			buttonPairs: ctx.buttonPairs,
			cycles: ctx.cycles,
			imageCycles: ctx.imageCycles,
			updateIntervalSec: intervalSec,
		}
		await saveAllFromState(state)
	}

	saveBtn.addEventListener('click', e => {
		e.preventDefault()
		void saveAll()
	})

	window.__voidPresenceCtx = ctx
}

function setupAutoLaunchToggle(): void {
	const toggle = document.getElementById(
		'auto-launch-toggle'
	) as HTMLElement | null
	if (!toggle) return
	const saved = localStorage.getItem('autoLaunch') === 'true'
	toggle.dataset.on = saved ? 'true' : 'false'
	toggle.addEventListener('click', () => {
		const current = toggle.dataset.on === 'true'
		const next = !current
		toggle.dataset.on = next ? 'true' : 'false'
		localStorage.setItem('autoLaunch', String(next))
		if (window.electronAPI?.setAutoLaunch) {
			window.electronAPI.setAutoLaunch(next)
		}
	})
}

function setupAutoHideToggle(): void {
	const toggle = document.getElementById(
		'auto-hide-toggle'
	) as HTMLElement | null
	if (!toggle) return
	const saved = localStorage.getItem('autoHide') === 'true'
	toggle.dataset.on = saved ? 'true' : 'false'
	toggle.addEventListener('click', () => {
		const current = toggle.dataset.on === 'true'
		const next = !current
		toggle.dataset.on = next ? 'true' : 'false'
		localStorage.setItem('autoHide', String(next))
		if (window.electronAPI?.setAutoHide) {
			window.electronAPI.setAutoHide(next)
		}
	})
}

function setupStopButton(): void {
	const btn = document.getElementById(
		'stop-discord'
	) as HTMLButtonElement | null
	if (!btn) return
	btn.addEventListener('click', e => {
		e.preventDefault()
		if (window.electronAPI?.stopDiscordRich) {
			updateStatus('DISABLED')
			updateInfo(null)
			void window.electronAPI.stopDiscordRich()
		}
	})
}

function setupWindowControls(): void {
	const closeBtn = document.getElementById(
		'window-close'
	) as HTMLButtonElement | null
	const minimizeBtn = document.getElementById(
		'window-minimize'
	) as HTMLButtonElement | null
	if (closeBtn && window.electronAPI?.windowClose) {
		closeBtn.addEventListener('click', () => {
			window.electronAPI?.windowClose?.()
		})
	}
	if (minimizeBtn && window.electronAPI?.windowMinimize) {
		minimizeBtn.addEventListener('click', () => {
			window.electronAPI?.windowMinimize?.()
		})
	}
}

function setupConfigDetailsOverlay(): void {
	const overlay = document.getElementById(
		'config-details-overlay'
	) as HTMLElement | null
	const closeBtn = document.getElementById(
		'config-details-close'
	) as HTMLButtonElement | null
	if (!overlay || !closeBtn) return

	function close(): void {
		overlay.dataset.open = 'false'
	}

	closeBtn.addEventListener('click', e => {
		e.preventDefault()
		close()
	})

	overlay.addEventListener('click', e => {
		if (e.target === overlay) {
			close()
		}
	})
}

function openConfigDetails(cfg: StoredConfig): void {
	const overlay = document.getElementById(
		'config-details-overlay'
	) as HTMLElement | null
	const nameEl = document.getElementById(
		'config-details-name'
	) as HTMLElement | null
	const cyclesEl = document.getElementById(
		'config-details-cycles'
	) as HTMLElement | null
	const imagesEl = document.getElementById(
		'config-details-images'
	) as HTMLElement | null
	const buttonsEl = document.getElementById(
		'config-details-buttons'
	) as HTMLElement | null
	if (!overlay || !nameEl || !cyclesEl || !imagesEl || !buttonsEl) {
		return
	}
	const state = cfg.state || {}
	nameEl.textContent = cfg.name || 'Unnamed profile'
	renderList(cyclesEl, state.cycles || [], 'cycles')
	renderList(imagesEl, state.imageCycles || [], 'images')
	renderList(buttonsEl, state.buttonPairs || [], 'buttons')
	overlay.dataset.open = 'true'
}

function importConfigFromFile(file: File): void {
	const reader = new FileReader()
	reader.onload = ev => {
		try {
			const text = String(ev.target?.result || '')
			const parsed = JSON.parse(text) as FullState
			const state: FullState = {
				clientId: undefined,
				cycles: Array.isArray(parsed.cycles) ? parsed.cycles : [],
				imageCycles: Array.isArray(parsed.imageCycles)
					? parsed.imageCycles
					: [],
				buttonPairs: Array.isArray(parsed.buttonPairs)
					? parsed.buttonPairs
					: [],
			}
			const nameInput = document.getElementById(
				'config-name-input'
			) as HTMLInputElement | null
			const baseName =
				(nameInput && nameInput.value.trim()) ||
				file.name.replace(/\.[^.]+$/, '') ||
				'Imported profile'
			if (window.addConfigFromState) {
				window.addConfigFromState(baseName, state)
			}
		} catch (err) {
			console.error('Failed to import config', err)
		}
	}
	reader.readAsText(file)
}

function setupImportOverlay(): void {
	const importOverlay = document.getElementById(
		'import-overlay'
	) as HTMLElement | null
	const importCloseBtn = document.getElementById(
		'import-close-btn'
	) as HTMLButtonElement | null
	const importFileInput = document.getElementById(
		'import-file-input'
	) as HTMLInputElement | null
	if (!importOverlay || !importCloseBtn || !importFileInput) return

	function closeImport(): void {
		importOverlay.dataset.open = 'false'
		importFileInput.value = ''
	}

	importCloseBtn.addEventListener('click', e => {
		e.preventDefault()
		closeImport()
	})

	importOverlay.addEventListener('click', e => {
		if (e.target === importOverlay) closeImport()
	})

	importFileInput.addEventListener('change', () => {
		const file = importFileInput.files && importFileInput.files[0]
		if (!file) return
		importConfigFromFile(file)
		closeImport()
	})
}

function setupConfigPage(): void {
	const nameInput = document.getElementById(
		'config-name-input'
	) as HTMLInputElement | null
	const saveBtn = document.getElementById(
		'config-save-btn'
	) as HTMLButtonElement | null
	const list = document.getElementById('config-list') as HTMLElement | null
	const addBtn = document.getElementById(
		'config-add-btn'
	) as HTMLButtonElement | null
	const exportBtn = document.getElementById(
		'config-export-btn'
	) as HTMLButtonElement | null
	if (!nameInput || !saveBtn || !list || !addBtn || !exportBtn) return

	function getConfigs(): StoredConfig[] {
		try {
			const raw = localStorage.getItem('vpConfigs')
			return raw ? (JSON.parse(raw) as StoredConfig[]) : []
		} catch {
			return []
		}
	}

	function setConfigs(configs: StoredConfig[]): void {
		localStorage.setItem('vpConfigs', JSON.stringify(configs))
	}

	function downloadJson(data: unknown, filename: string): void {
		const json = JSON.stringify(data, null, 2)
		const blob = new Blob([json], { type: 'application/json' })
		const url = URL.createObjectURL(blob)
		const a = document.createElement('a')
		a.href = url
		a.download = filename
		document.body.appendChild(a)
		a.click()
		document.body.removeChild(a)
		URL.revokeObjectURL(url)
	}

	function renderConfigs(): void {
		const configs = getConfigs()
			.slice()
			.sort((a, b) => {
				const ad = a.createdAt ? new Date(a.createdAt).getTime() : 0
				const bd = b.createdAt ? new Date(b.createdAt).getTime() : 0
				return bd - ad
			})

		list.innerHTML = ''

		configs.forEach(cfg => {
			const state = cfg.state || {}
			const cycles: CycleEntry[] = Array.isArray(state.cycles)
				? state.cycles
				: []
			const firstCycle: CycleEntry | undefined = cycles[0]
			const details = firstCycle?.details || 'New cycle'
			const activityState = firstCycle?.state || 'In the void'

			const firstImage =
				(Array.isArray(state.imageCycles) && state.imageCycles[0]) || null
			const largeImage =
				firstImage && firstImage.largeImage
					? firstImage.largeImage
					: 'about:blank'

			const card = document.createElement('div')
			card.className = 'config-activity-card'

			const body = document.createElement('div')
			body.className = 'config-activity-body'

			const imgWrap = document.createElement('div')
			imgWrap.className = 'config-activity-image'
			const img = document.createElement('img')
			img.src = largeImage
			img.alt = 'app icon'
			imgWrap.appendChild(img)

			const detailsWrap = document.createElement('div')
			detailsWrap.className = 'config-activity-details'

			const title = document.createElement('div')
			title.className = 'config-activity-title'
			title.textContent = cfg.name || 'Unnamed profile'

			const line1 = document.createElement('div')
			line1.className = 'config-activity-line'
			line1.textContent = details

			const line2 = document.createElement('div')
			line2.className = 'config-activity-line'
			line2.textContent = activityState

			const footer = document.createElement('div')
			footer.className = 'config-activity-footer'

			detailsWrap.appendChild(title)
			detailsWrap.appendChild(line1)
			detailsWrap.appendChild(line2)
			detailsWrap.appendChild(footer)

			body.appendChild(imgWrap)
			body.appendChild(detailsWrap)

			const actions = document.createElement('div')
			actions.className = 'config-activity-actions'

			const loadBtn = document.createElement('button')
			loadBtn.className = 'config-activity-btn'
			loadBtn.textContent = 'load'

			const detailsBtn = document.createElement('button')
			detailsBtn.className = 'config-activity-btn'
			detailsBtn.textContent = 'details'

			const exportBtnCfg = document.createElement('button')
			exportBtnCfg.className = 'config-activity-btn'
			exportBtnCfg.textContent = 'export'

			const delBtn = document.createElement('button')
			delBtn.className = 'config-activity-btn danger'
			delBtn.textContent = '✕'

			loadBtn.addEventListener('click', async e => {
				e.preventDefault()
				const ctx = window.__voidPresenceCtx
				if (!ctx) return
				const st: FullState = {
					clientId: state.clientId || localStorage.getItem('clientId') || '',
					updateIntervalSec:
						state.updateIntervalSec ||
						localStorage.getItem('updateIntervalSec') ||
						'',
					buttonPairs: Array.isArray(state.buttonPairs)
						? state.buttonPairs
						: [],
					cycles: Array.isArray(state.cycles) ? state.cycles : [],
					imageCycles: Array.isArray(state.imageCycles)
						? state.imageCycles
						: [],
				}
				applyStateToUIAndLists(st, ctx)
				await saveAllFromState(st)
				nameInput.value = ''

				setActiveView('main')
			})

			detailsBtn.addEventListener('click', e => {
				e.preventDefault()
				openConfigDetails(cfg)
			})

			exportBtnCfg.addEventListener('click', e => {
				e.preventDefault()
				const data: FullState = {
					clientId: undefined,
					cycles: (state.cycles && state.cycles.slice()) || [],
					imageCycles: (state.imageCycles && state.imageCycles.slice()) || [],
					buttonPairs: (state.buttonPairs && state.buttonPairs.slice()) || [],
				}
				const name =
					cfg.name || `void-presence-${new Date().toISOString().slice(0, 10)}`
				downloadJson(data, `${name}.json`)
			})

			delBtn.addEventListener('click', e => {
				e.preventDefault()
				const filtered = getConfigs().filter(c => c.name !== cfg.name)
				setConfigs(filtered)
				renderConfigs()
			})

			actions.appendChild(loadBtn)
			actions.appendChild(detailsBtn)
			actions.appendChild(exportBtnCfg)
			actions.appendChild(delBtn)

			card.appendChild(body)
			card.appendChild(actions)

			list.appendChild(card)
		})
	}

	function addConfigFromState(name: string, state: FullState): void {
		const configs = getConfigs().filter(c => c.name !== name)
		configs.push({
			name,
			state,
			createdAt: new Date().toISOString(),
		})
		setConfigs(configs)
		renderConfigs()
	}

	window.addConfigFromState = addConfigFromState

	saveBtn.addEventListener('click', async e => {
		e.preventDefault()
		const name = nameInput.value.trim()
		if (!name) return
		const state = loadCurrentState()
		addConfigFromState(name, state)
		await saveAllFromState(state)
		nameInput.value = ''
	})

	addBtn.addEventListener('click', e => {
		e.preventDefault()
		const importOverlay = document.getElementById(
			'import-overlay'
		) as HTMLElement | null
		if (importOverlay) {
			importOverlay.dataset.open = 'true'
		}
	})

	exportBtn.addEventListener('click', e => {
		e.preventDefault()
		const state = loadCurrentState()
		const data: FullState = {
			clientId: undefined,
			cycles: state.cycles || [],
			imageCycles: state.imageCycles || [],
			buttonPairs: state.buttonPairs || [],
		}
		const name =
			nameInput.value.trim() ||
			`void-presence-${new Date().toISOString().slice(0, 10)}`
		downloadJson(data, `${name}.json`)
	})

	renderConfigs()
}

let dragDepth = 0
let hideOverlay: () => void

function setupGlobalDrop(): void {
	const overlay = document.getElementById(
		'global-drop-overlay'
	) as HTMLElement | null
	const app = document.querySelector('.app') as HTMLElement | null
	if (!overlay || !app) return
	dragDepth = 0

	function showOverlay(): void {
		overlay.dataset.active = 'true'
	}
	hideOverlay = function (): void {
		overlay.dataset.active = 'false'
	}

	function hasFileItem(items: DataTransferItemList): boolean {
		return Array.from(items).some(it => it.kind === 'file')
	}

	document.addEventListener('dragenter', e => {
		const items = e.dataTransfer?.items
		if (!items || !items.length) return
		if (!hasFileItem(items)) return
		dragDepth += 1
		showOverlay()
		e.preventDefault()
	})

	document.addEventListener('dragover', e => {
		const items = e.dataTransfer?.items
		if (!items || !items.length) return
		if (!hasFileItem(items)) return
		e.preventDefault()
		if (e.dataTransfer) e.dataTransfer.dropEffect = 'copy'
	})

	document.addEventListener('dragleave', e => {
		const related = e.relatedTarget as Node | null
		if (!related || !app.contains(related)) {
			dragDepth -= 1
			if (dragDepth <= 0) {
				dragDepth = 0
				hideOverlay()
			}
		}
	})

	document.addEventListener('drop', e => {
		const files = e.dataTransfer?.files
		dragDepth = 0
		hideOverlay()
		if (!files || !files.length) return
		e.preventDefault()
		const file = files[0]
		if (!file) return
		importConfigFromFile(file)
	})
}

function setupCloudUpload(): void {
	const uploadBtn = document.getElementById(
		'cloud-upload-btn'
	) as HTMLButtonElement | null
	if (!uploadBtn) return

	function saveAuthorToLocalStorage(): void {
		const authorInput = document.getElementById(
			'config-author-input'
		) as HTMLInputElement | null
		if (authorInput) localStorage.setItem('configAuthor', authorInput.value)
	}

	function loadInputsFromLocalStorage(): void {
		const nameInput = document.getElementById(
			'config-name-input'
		) as HTMLInputElement | null
		const authorInput = document.getElementById(
			'config-author-input'
		) as HTMLInputElement | null
		const savedAuthor = localStorage.getItem('configAuthor') || ''
		if (nameInput) nameInput.value = ''
		if (authorInput) authorInput.value = savedAuthor
	}

	const authorInput = document.getElementById(
		'config-author-input'
	) as HTMLInputElement | null

	if (authorInput) {
		authorInput.addEventListener('input', saveAuthorToLocalStorage)
	}

	uploadBtn.addEventListener('click', async e => {
		e.preventDefault()
		const nameInput = document.getElementById(
			'config-name-input'
		) as HTMLInputElement | null
		const authorInput = document.getElementById(
			'config-author-input'
		) as HTMLInputElement | null
		const ctx = window.__voidPresenceCtx

		if (!nameInput?.value.trim() || !authorInput?.value.trim() || !ctx) {
			appendLog({
				message: 'Enter config name, author and save first',
				level: 'error',
			})
			return
		}

		try {
			uploadBtn.disabled = true
			uploadBtn.innerHTML =
				'<div class="rpc-button-icon">☁️</div><span>Uploading...</span>'

			const state = loadCurrentState()

			const safeState = JSON.parse(
				JSON.stringify(state, (key, value) =>
					key === 'clientId' ? undefined : value
				)
			) as FullState

			const config = {
				title: nameInput.value.trim(),
				author: authorInput.value.trim(),
				configData: safeState,
			}

			if (!window.electronAPI?.uploadConfig) {
				throw new Error('Cloud upload is not available')
			}

			const result = await window.electronAPI.uploadConfig(config)
			void result

			appendLog({
				message: `Config "${config.title}" uploaded!`,
				level: 'success',
			})

			nameInput.value = ''
			localStorage.setItem('configAuthor', config.author)
		} catch (err: any) {
			appendLog({
				message: `Upload failed: ${err?.message ?? String(err)}`,
				level: 'error',
			})
		} finally {
			uploadBtn.disabled = false
			uploadBtn.innerHTML =
				'<div class="rpc-button-icon">☁️</div><span>Upload Current</span>'
		}
	})

	loadInputsFromLocalStorage()
}

window.addEventListener('DOMContentLoaded', () => {
	setupRestartButton()
	setupClientIdControls()
	setupAutoLaunchToggle()
	setupAutoHideToggle()
	setupWindowControls()
	setupConfigDetailsOverlay()
	setupConfigPage()
	setupStopButton()
	void setupIntervalControl()
	setupImportOverlay()
	setupGlobalDrop()
	setupCloudUpload()
	updateInfo(null)
	updateStatus('CONNECTING RPC')

	if (window.electronAPI?.onRpcUpdate) {
		window.electronAPI.onRpcUpdate(payload => {
			updateInfo(payload)
		})
	}

	if (window.electronAPI?.onRpcStatus) {
		window.electronAPI.onRpcStatus(status => {
			updateStatus(status)
		})
	}
})
