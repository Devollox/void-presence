import {
	ButtonPair,
	CycleEntry,
	FullState,
	ImageCycleEntry,
	PartyCycleEntry,
	TimestampMode,
	VoidPresenceCtx,
} from './types'
import { updateStatus } from './views'

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

	if (!Array.isArray(buttonPairs)) buttonPairs = []
	if (!Array.isArray(cycles)) cycles = []
	if (!Array.isArray(imageCycles)) imageCycles = []
	if (!Array.isArray(party)) party = []

	const timestampMode =
		(localStorage.getItem('timestampMode') as TimestampMode | null) || 'now'
	const timestampRangeMin = localStorage.getItem('timestampRangeMin') || ''
	const timestampRangeMax = localStorage.getItem('timestampRangeMax') || ''

	return {
		clientId,
		updateIntervalSec: localStorage.getItem('updateIntervalSec') || '',
		buttonPairs,
		cycles,
		imageCycles,
		party,
		timestampMode,
		timestampRangeMin,
		timestampRangeMax,
	}
}

export async function saveAllFromState(state: FullState): Promise<void> {
	const clientId = (state.clientId || '').trim()
	const buttonPairs = Array.isArray(state.buttonPairs) ? state.buttonPairs : []
	const cycles = Array.isArray(state.cycles) ? state.cycles : []
	const imageCycles = Array.isArray(state.imageCycles) ? state.imageCycles : []
	const partyEntries = Array.isArray(state.party) ? state.party : []

	const intervalSecRaw = Number(state.updateIntervalSec)

	if (!clientId || !Number.isFinite(intervalSecRaw) || intervalSecRaw <= 0) {
		updateStatus('NO_CLIENT_ID')
		return
	}

	const timestampMode: TimestampMode =
		(state.timestampMode as TimestampMode) || 'now'
	const timestampRangeMin =
		typeof state.timestampRangeMin === 'number'
			? state.timestampRangeMin
			: Number(state.timestampRangeMin)
	const timestampRangeMax =
		typeof state.timestampRangeMax === 'number'
			? state.timestampRangeMax
			: Number(state.timestampRangeMax)

	localStorage.setItem('clientId', clientId)
	localStorage.setItem('buttonPairs', JSON.stringify(buttonPairs))
	localStorage.setItem('cycles', JSON.stringify(cycles))
	localStorage.setItem('imageCycles', JSON.stringify(imageCycles))
	localStorage.setItem('updateIntervalSec', String(intervalSecRaw))
	localStorage.setItem('party', JSON.stringify(partyEntries))
	localStorage.setItem('timestampMode', timestampMode)
	if (Number.isFinite(timestampRangeMin)) {
		localStorage.setItem('timestampRangeMin', String(timestampRangeMin))
	} else {
		localStorage.removeItem('timestampRangeMin')
	}
	if (Number.isFinite(timestampRangeMax)) {
		localStorage.setItem('timestampRangeMax', String(timestampRangeMax))
	} else {
		localStorage.removeItem('timestampRangeMax')
	}

	if (window.electronAPI?.setClientId) {
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
	if (window.electronAPI?.setActivityInterval) {
		await window.electronAPI.setActivityInterval(intervalSecRaw)
	}
	if (window.electronAPI?.setPartyConfig) {
		await window.electronAPI.setPartyConfig({ entries: partyEntries })
	}
	if (window.electronAPI?.setTimestampConfig) {
		await window.electronAPI.setTimestampConfig({
			mode: timestampMode,
			rangeMin: Number.isFinite(timestampRangeMin) ? timestampRangeMin : null,
			rangeMax: Number.isFinite(timestampRangeMax) ? timestampRangeMax : null,
		})
	}
	if (window.electronAPI?.restartDiscordRich) {
		await window.electronAPI.restartDiscordRich()
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

	if (!clientInput || !updateInput) return

	clientInput.value = state.clientId || ''
	updateInput.value =
		typeof state.updateIntervalSec === 'number'
			? String(state.updateIntervalSec)
			: (state.updateIntervalSec as string) || ''

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

	localStorage.setItem('clientId', state.clientId || '')
	localStorage.setItem('buttonPairs', JSON.stringify(state.buttonPairs || []))
	localStorage.setItem('cycles', JSON.stringify(state.cycles || []))
	localStorage.setItem('imageCycles', JSON.stringify(state.imageCycles || []))
	localStorage.setItem('party', JSON.stringify(state.party || []))
	localStorage.setItem('timestampMode', mode)
	if (state.timestampRangeMin != null) {
		localStorage.setItem('timestampRangeMin', String(state.timestampRangeMin))
	}
	if (state.timestampRangeMax != null) {
		localStorage.setItem('timestampRangeMax', String(state.timestampRangeMax))
	}

	ctx.buttonPairs = Array.isArray(state.buttonPairs) ? state.buttonPairs : []
	ctx.cycles = Array.isArray(state.cycles) ? state.cycles : []
	ctx.imageCycles = Array.isArray(state.imageCycles) ? state.imageCycles : []
	ctx.party = Array.isArray(state.party) ? state.party : []

	ctx.renderButtonPairs()
	ctx.renderCycles()
	ctx.renderImageCycles()
	ctx.renderPartyCycles()
}
