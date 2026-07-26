import { CustomStatusItem } from 'src/types/types'
import { downloadJson } from '../config/live'
import { setupToasts } from '../config/toasts'
import { renderStatusProfiles } from './status-render'
import { attachStatusSearch } from './status-search'
import { addStatusProfileFromState, deepCloneStatusItems } from './status-storage'

export function setupStatusPage(): void {
	const nameInput = document.getElementById('status-name-input') as HTMLInputElement | null
	const saveBtn = document.getElementById('status-save-btn') as HTMLButtonElement | null
	const list = document.getElementById('status-list-config') as HTMLElement | null
	const exportBtn = document.getElementById('status-export-btn') as HTMLButtonElement | null
	const importBtn = document.getElementById('status-import-btn') as HTMLButtonElement | null

	if (!nameInput || !saveBtn || !list || !exportBtn || !importBtn) return

	attachStatusSearch('status-search-input', 'status-list-config')

	const { showConfigSavedToast } = setupToasts()

	saveBtn.addEventListener('click', async e => {
		e.preventDefault()
		const name = nameInput.value.trim()
		if (!name) return
		if (!window.electronAPI?.statusGetCurrent) return
		const items = (await window.electronAPI.statusGetCurrent()) as CustomStatusItem[]
		if (!Array.isArray(items)) return
		addStatusProfileFromState(name, items)
		nameInput.value = ''
		showConfigSavedToast()
		renderStatusProfiles()
	})

	exportBtn.addEventListener('click', async e => {
		e.preventDefault()
		if (!window.electronAPI?.statusGetCurrent) return
		const items = (await window.electronAPI.statusGetCurrent()) as CustomStatusItem[]
		if (!Array.isArray(items)) return
		const data = deepCloneStatusItems(items)
		const name =
			nameInput.value.trim() || `void-presence-status-${new Date().toISOString().slice(0, 10)}`
		downloadJson(data, `${name}.json`)
	})

	importBtn.addEventListener('click', e => {
		e.preventDefault()
		const importOverlay = document.getElementById('status-import-overlay') as HTMLElement | null
		if (importOverlay) {
			importOverlay.dataset.open = 'true'
		}
	})

	renderStatusProfiles()
}
