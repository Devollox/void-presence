import { FullState } from '../../../types/types'
import { loadCurrentState } from '../core/state'
import {
	addConfigFromState,
	attachAddConfigGlobal,
	renderConfigs,
} from './config-render'
import { downloadJson } from './live'

import { attachSearchToList } from './config-search'
import { setupToasts } from './toasts'

export function setupConfigPage(): void {
	const nameInput = document.getElementById(
		'config-name-input',
	) as HTMLInputElement | null
	const saveBtn = document.getElementById(
		'config-save-btn',
	) as HTMLButtonElement | null
	const list = document.getElementById('config-list') as HTMLElement | null
	const addBtn = document.getElementById(
		'config-add-btn',
	) as HTMLButtonElement | null
	const exportBtn = document.getElementById(
		'config-export-btn',
	) as HTMLButtonElement | null

	if (!nameInput || !saveBtn || !list || !addBtn || !exportBtn) return

	const { showConfigSavedToast } = setupToasts()
	attachAddConfigGlobal()

	saveBtn.addEventListener('click', e => {
		e.preventDefault()
		const name = nameInput.value.trim()
		if (!name) return
		const state = loadCurrentState()
		addConfigFromState(name, state)
		nameInput.value = ''
		showConfigSavedToast()
	})

	addBtn.addEventListener('click', e => {
		e.preventDefault()
		const importOverlay = document.getElementById(
			'import-overlay',
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
			cycles: (state.cycles && state.cycles.slice()) || [],
			imageCycles: (state.imageCycles && state.imageCycles.slice()) || [],
			buttonPairs: (state.buttonPairs && state.buttonPairs.slice()) || [],
			party: Array.isArray(state.party) ? state.party.slice() : undefined,
			timeCycles: Array.isArray(state.timeCycles)
				? state.timeCycles.slice()
				: [],
			timestampMode: state.timestampMode,
			timestampRangeMin: state.timestampRangeMin,
			timestampRangeMax: state.timestampRangeMax,
			activityType: state.activityType,
			nowMode: state.nowMode,
			updateIntervalSec: state.updateIntervalSec,
		}
		const name =
			nameInput.value.trim() ||
			`void-presence-${new Date().toISOString().slice(0, 10)}`
		downloadJson(data, `${name}.json`)
	})

	attachSearchToList('config-search-input', 'config-list')
	renderConfigs()
}
