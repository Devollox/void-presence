import {
	ActivityType,
	ButtonPair,
	CycleEntry,
	FullState,
	ImageCycleEntry,
	NowMode,
	PartyCycleEntry,
	StatusCycleEntry,
	TimeCycleEntry,
	TimestampMode,
	VoidPresenceCtx,
} from '../../../types/types'

type BarStyle = 'unicode' | 'cmd' | 'block' | 'soft' | 'retro' | 'cyber'

export async function setupIntervalControl(): Promise<void> {
	const input = document.getElementById(
		'update-interval-input',
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

export function loadCurrentState(): FullState {
	const clientId = localStorage.getItem('clientId') || ''

	let buttonPairs: ButtonPair[] = []
	try {
		buttonPairs = JSON.parse(
			localStorage.getItem('buttonPairs') || '[]',
		) as ButtonPair[]
	} catch {
		buttonPairs = []
	}

	let cycles: CycleEntry[] = []
	try {
		cycles = JSON.parse(localStorage.getItem('cycles') || '[]') as CycleEntry[]
	} catch {
		cycles = []
	}

	let imageCycles: ImageCycleEntry[] = []
	try {
		imageCycles = JSON.parse(
			localStorage.getItem('imageCycles') || '[]',
		) as ImageCycleEntry[]
	} catch {
		imageCycles = []
	}

	let party: PartyCycleEntry[] = []
	try {
		party = JSON.parse(
			localStorage.getItem('party') || '[]',
		) as PartyCycleEntry[]
	} catch {
		party = []
	}

	let timeCycles: TimeCycleEntry[] = []
	try {
		timeCycles = JSON.parse(
			localStorage.getItem('timeCycles') || '[]',
		) as TimeCycleEntry[]
	} catch {
		timeCycles = []
	}

	let statusCycles: StatusCycleEntry[] = []
	try {
		statusCycles = JSON.parse(
			localStorage.getItem('statusCycles') || '[]',
		) as StatusCycleEntry[]
	} catch {
		statusCycles = []
	}

	if (!Array.isArray(buttonPairs)) buttonPairs = []
	if (!Array.isArray(cycles)) cycles = []
	if (!Array.isArray(imageCycles)) imageCycles = []
	if (!Array.isArray(party)) party = []
	if (!Array.isArray(timeCycles)) timeCycles = []
	if (!Array.isArray(statusCycles)) statusCycles = []

	const timestampMode =
		(localStorage.getItem('timestampMode') as TimestampMode | null) || 'now'
	const timestampRangeMin = localStorage.getItem('timestampRangeMin') || ''
	const timestampRangeMax = localStorage.getItem('timestampRangeMax') || ''
	const activityType =
		(localStorage.getItem('activityType') as ActivityType | null) || 'playing'
	const nowMode = (localStorage.getItem('nowMode') as NowMode | null) || 'plain'
	const barStyle =
		(localStorage.getItem('barStyle') as BarStyle | null) || 'unicode'
	const discordToken = localStorage.getItem('discordToken') || ''

	const rawUpdate = localStorage.getItem('updateIntervalSec')
	const updateIntervalSec =
		rawUpdate && !Number.isNaN(Number(rawUpdate)) && Number(rawUpdate) > 0
			? rawUpdate
			: ''

	const rawStatusUpdate = localStorage.getItem('updateIntervalSecStatus')
	const updateIntervalSecStatus =
		rawStatusUpdate &&
		!Number.isNaN(Number(rawStatusUpdate)) &&
		Number(rawStatusUpdate) > 0
			? rawStatusUpdate
			: '30'

	return {
		clientId,
		updateIntervalSec,
		buttonPairs,
		cycles,
		imageCycles,
		party,
		timestampMode,
		timestampRangeMin,
		timestampRangeMax,
		activityType,
		nowMode,
		timeCycles,
		barStyle,
		discordToken,
		statusCycles,
		updateIntervalSecStatus,
	} as FullState
}

export async function applyAndPushState(state: FullState): Promise<void> {
	const clientId = (state.clientId || '').trim()
	const buttonPairs = Array.isArray(state.buttonPairs) ? state.buttonPairs : []
	const cycles = Array.isArray(state.cycles) ? state.cycles : []
	const imageCycles = Array.isArray(state.imageCycles) ? state.imageCycles : []
	const partyEntries = Array.isArray(state.party) ? state.party : []
	const timeCycles = Array.isArray(state.timeCycles) ? state.timeCycles : []
	const statusCycles = Array.isArray((state as any).statusCycles)
		? ((state as any).statusCycles as StatusCycleEntry[])
		: []
	const discordToken = (state as any).discordToken || ''

	const intervalSecRaw = Number(state.updateIntervalSec)

	let updateIntervalSecStatus = Number(
		(state as any).updateIntervalSecStatus || '',
	)
	if (
		!Number.isFinite(updateIntervalSecStatus) ||
		updateIntervalSecStatus <= 0
	) {
		updateIntervalSecStatus = 30
	}

	const timestampMode: TimestampMode =
		(state.timestampMode as TimestampMode) ||
		(localStorage.getItem('timestampMode') as TimestampMode | null) ||
		'now'

	const timestampRangeMinRaw =
		typeof state.timestampRangeMin === 'number'
			? state.timestampRangeMin
			: Number(state.timestampRangeMin)

	const timestampRangeMaxRaw =
		typeof state.timestampRangeMax === 'number'
			? state.timestampRangeMax
			: Number(state.timestampRangeMax)

	const activityType: ActivityType =
		(state.activityType as ActivityType) ||
		(localStorage.getItem('activityType') as ActivityType | null) ||
		'playing'

	const nowMode: NowMode =
		(state.nowMode as NowMode) ||
		(localStorage.getItem('nowMode') as NowMode | null) ||
		'plain'

	const barStyle: BarStyle =
		(state as any).barStyle ||
		(localStorage.getItem('barStyle') as BarStyle | null) ||
		'unicode'

	localStorage.setItem('clientId', clientId)
	localStorage.setItem('discordToken', discordToken)
	localStorage.setItem('buttonPairs', JSON.stringify(buttonPairs))
	localStorage.setItem('cycles', JSON.stringify(cycles))
	localStorage.setItem('imageCycles', JSON.stringify(imageCycles))
	localStorage.setItem('party', JSON.stringify(partyEntries))
	localStorage.setItem('timeCycles', JSON.stringify(timeCycles))
	localStorage.setItem('statusCycles', JSON.stringify(statusCycles))
	localStorage.setItem('timestampMode', timestampMode)
	localStorage.setItem('activityType', activityType)
	localStorage.setItem('nowMode', nowMode)
	localStorage.setItem('barStyle', barStyle)

	if (Number.isFinite(intervalSecRaw) && intervalSecRaw > 0) {
		localStorage.setItem('updateIntervalSec', String(intervalSecRaw))
	}

	localStorage.setItem(
		'updateIntervalSecStatus',
		String(updateIntervalSecStatus),
	)

	if (Number.isFinite(timestampRangeMinRaw)) {
		localStorage.setItem('timestampRangeMin', String(timestampRangeMinRaw))
	} else {
		localStorage.removeItem('timestampRangeMin')
	}

	if (Number.isFinite(timestampRangeMaxRaw)) {
		localStorage.setItem('timestampRangeMax', String(timestampRangeMaxRaw))
	} else {
		localStorage.removeItem('timestampRangeMax')
	}

	if (window.electronAPI?.setClientId && clientId) {
		await window.electronAPI.setClientId(clientId)
	}
	if (window.electronAPI?.setImageCycles) {
		await window.electronAPI.setImageCycles(imageCycles)
	}
	if (window.electronAPI?.setButtons) {
		await window.electronAPI.setButtons(buttonPairs)
	}
	if (window.electronAPI?.setCycles) {
		await window.electronAPI.setCycles(cycles)
	}
	if (window.electronAPI?.setPartyConfig) {
		await window.electronAPI.setPartyConfig({ entries: partyEntries })
	}
	if (window.electronAPI?.setTimestampConfig) {
		await window.electronAPI.setTimestampConfig({
			mode: timestampMode,
			rangeMin: Number.isFinite(timestampRangeMinRaw)
				? timestampRangeMinRaw
				: null,
			rangeMax: Number.isFinite(timestampRangeMaxRaw)
				? timestampRangeMaxRaw
				: null,
			nowMode,
			timeCycles,
		})
	}
	if (window.electronAPI?.setStatusIntervalConfig) {
		await window.electronAPI.setStatusIntervalConfig(updateIntervalSecStatus)
	}
	if (window.electronAPI?.setStatusCyclesConfig) {
		await window.electronAPI.setStatusCyclesConfig(statusCycles)
	}
}

export async function applyStateToUIAndLists(
	state: FullState,
	ctx: VoidPresenceCtx,
): Promise<void> {
	const clientInput = document.getElementById(
		'client-id-input',
	) as HTMLInputElement | null
	const updateInput = document.getElementById(
		'update-interval-input',
	) as HTMLInputElement | null
	const tokenInput = document.getElementById(
		'discord-token-input',
	) as HTMLInputElement | null
	const statusUpdateInput = document.getElementById(
		'status-update-interval-input',
	) as HTMLInputElement | null

	const modeNow = document.getElementById(
		'timestamp-mode-now',
	) as HTMLButtonElement | null
	const modeRange = document.getElementById(
		'timestamp-mode-range',
	) as HTMLButtonElement | null
	const modePersist = document.getElementById(
		'timestamp-mode-persist',
	) as HTMLButtonElement | null
	const rangeMinInput = document.getElementById(
		'timestamp-range-min',
	) as HTMLInputElement | null
	const rangeMaxInput = document.getElementById(
		'timestamp-range-max',
	) as HTMLInputElement | null
	const rangeRows = document.querySelectorAll<HTMLElement>(
		'.timestamp-range-row',
	)
	const persistRow = document.querySelector<HTMLElement>(
		'.timestamp-persist-row',
	)
	const nowPlain = document.getElementById(
		'now-mode-plain',
	) as HTMLButtonElement | null
	const nowProgress = document.getElementById(
		'now-mode-progress',
	) as HTMLButtonElement | null
	const nowCycles = document.getElementById(
		'now-mode-cycles',
	) as HTMLButtonElement | null
	const nowModeRow = document.querySelector<HTMLElement>('.now-mode-row')
	const timeDivider = document.querySelector<HTMLElement>(
		'.time-cycles-divider',
	)
	const timeHeader = document.querySelector<HTMLElement>('.time-cycles-header')
	const timeListEl = document.getElementById('time-list') as HTMLElement | null
	const barStyleRow = document.getElementById(
		'bar-style-row',
	) as HTMLElement | null
	const barButtons =
		document.querySelectorAll<HTMLButtonElement>('[data-bar-style]')

	if (!clientInput || !updateInput) return

	clientInput.value = state.clientId || ''
	updateInput.value =
		typeof state.updateIntervalSec === 'number'
			? String(state.updateIntervalSec)
			: (state.updateIntervalSec as string) || ''
	if (tokenInput) tokenInput.value = (state as any).discordToken || ''

	const su =
		typeof (state as any).updateIntervalSecStatus === 'number'
			? String((state as any).updateIntervalSecStatus)
			: (state as any).updateIntervalSecStatus || '30'
	if (statusUpdateInput) statusUpdateInput.value = su

	const mode: TimestampMode = (state.timestampMode as TimestampMode) || 'now'
	const setModeActive = (m: TimestampMode) => {
		if (modeNow) modeNow.dataset.active = m === 'now' ? 'true' : 'false'
		if (modeRange) modeRange.dataset.active = m === 'range' ? 'true' : 'false'
		if (modePersist)
			modePersist.dataset.active = m === 'persist' ? 'true' : 'false'
		rangeRows.forEach(row => {
			row.dataset.visible = m === 'range' ? 'true' : 'false'
		})
		if (persistRow) {
			persistRow.dataset.visible = m === 'persist' ? 'true' : 'false'
		}
	}

	setModeActive(mode)

	if (rangeMinInput) {
		rangeMinInput.value =
			typeof state.timestampRangeMin === 'number'
				? String(state.timestampRangeMin)
				: (state.timestampRangeMin as string) || ''
	}
	if (rangeMaxInput) {
		rangeMaxInput.value =
			typeof state.timestampRangeMax === 'number'
				? String(state.timestampRangeMax)
				: (state.timestampRangeMax as string) || ''
	}

	const nowMode: NowMode =
		(state.nowMode as NowMode) ||
		(localStorage.getItem('nowMode') as NowMode | null) ||
		'plain'

	const barStyle =
		(state as any).barStyle ||
		(localStorage.getItem('barStyle') as BarStyle | null) ||
		'unicode'

	localStorage.setItem('clientId', state.clientId || '')
	localStorage.setItem('discordToken', (state as any).discordToken || '')
	localStorage.setItem('buttonPairs', JSON.stringify(state.buttonPairs || []))
	localStorage.setItem('cycles', JSON.stringify(state.cycles || []))
	localStorage.setItem('imageCycles', JSON.stringify(state.imageCycles || []))
	localStorage.setItem('party', JSON.stringify(state.party || []))
	localStorage.setItem('timestampMode', mode)
	localStorage.setItem('nowMode', nowMode)
	localStorage.setItem('timeCycles', JSON.stringify(state.timeCycles || []))
	localStorage.setItem('barStyle', barStyle)
	localStorage.setItem(
		'statusCycles',
		JSON.stringify((state as any).statusCycles || []),
	)
	localStorage.setItem('updateIntervalSecStatus', su)

	ctx.buttonPairs = Array.isArray(state.buttonPairs) ? state.buttonPairs : []
	ctx.cycles = Array.isArray(state.cycles) ? state.cycles : []
	ctx.imageCycles = Array.isArray(state.imageCycles) ? state.imageCycles : []
	ctx.party = Array.isArray(state.party) ? state.party : []
	ctx.timeCycles = Array.isArray(state.timeCycles) ? state.timeCycles : []
	;(ctx as any).statusCycles = Array.isArray((state as any).statusCycles)
		? (state as any).statusCycles
		: []

	const applyNowMode = (m: NowMode) => {
		if (nowPlain) nowPlain.dataset.active = m === 'plain' ? 'true' : 'false'
		if (nowProgress)
			nowProgress.dataset.active = m === 'progress' ? 'true' : 'false'
		if (nowCycles) nowCycles.dataset.active = m === 'cycles' ? 'true' : 'false'

		const isNow = mode === 'now'
		const showTime = isNow && m === 'cycles'

		if (nowModeRow) nowModeRow.dataset.visible = isNow ? 'true' : 'false'
		if (timeDivider) timeDivider.dataset.visible = showTime ? 'true' : 'false'
		if (timeHeader) timeHeader.dataset.visible = showTime ? 'true' : 'false'
		if (timeListEl) timeListEl.dataset.visible = showTime ? 'true' : 'false'
	}

	applyNowMode(nowMode)

	barButtons.forEach(btn => {
		btn.dataset.active = btn.dataset.barStyle === barStyle ? 'true' : 'false'
	})
	if (barStyleRow) {
		const showBarStyle =
			localStorage.getItem('automaticActivity') === 'true' ||
			localStorage.getItem('hardwareMonitorEnabled') === 'true' ||
			mode === 'now'
		barStyleRow.dataset.visible = showBarStyle ? 'true' : 'false'
	}

	ctx.renderButtonPairs()
	ctx.renderCycles()
	ctx.renderImageCycles()
	ctx.renderPartyCycles()
	ctx.renderTimeCycles?.()
	ctx.renderStatusCycles?.()
}
