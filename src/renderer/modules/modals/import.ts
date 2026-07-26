import { CustomStatusItem, FullState } from '../../../types/types'
import { renderConfigs } from '../config-page/config-render'
import { setupToasts } from '../config/toasts'
import { renderStatusProfiles } from '../status-page/status-render'
import { addStatusProfileFromItems } from '../status-page/status-storage'

function isStatusArray(data: unknown): data is CustomStatusItem[] {
	return (
		Array.isArray(data) &&
		data.every(
			x =>
				x &&
				typeof x === 'object' &&
				'text' in x &&
				typeof (x as CustomStatusItem).text === 'string'
		)
	)
}

function isStatusObject(data: unknown): data is { statusCycles: CustomStatusItem[] } {
	if (!data || typeof data !== 'object' || Array.isArray(data)) return false
	const obj = data as Record<string, unknown>
	if (!Array.isArray(obj.statusCycles)) return false
	return obj.statusCycles.every(
		x =>
			x && typeof x === 'object' && 'text' in x && typeof (x as CustomStatusItem).text === 'string'
	)
}

function isConfigLike(data: unknown): data is Partial<FullState> {
	if (!data || typeof data !== 'object' || Array.isArray(data)) return false
	const obj = data as Record<string, unknown>
	return (
		'buttonPairs' in obj ||
		'cycles' in obj ||
		'imageCycles' in obj ||
		'party' in obj ||
		'timeCycles' in obj
	)
}

export function importJsonPayload(parsed: unknown, baseName?: string): void {
	const { showConfigImportedToast } = setupToasts()

	if (isStatusArray(parsed)) {
		const name = baseName || 'Imported status'
		addStatusProfileFromItems(name, parsed)
		renderStatusProfiles()
		showConfigImportedToast()
		return
	}

	if (isStatusObject(parsed)) {
		const name = baseName || 'Imported status'
		const obj = parsed as { statusCycles: CustomStatusItem[] }
		const items = obj.statusCycles
		addStatusProfileFromItems(name, items)
		renderStatusProfiles()
		showConfigImportedToast()
		return
	}

	if (isConfigLike(parsed)) {
		const p = parsed as Partial<FullState>

		const state: FullState = {
			clientId: undefined,
			cycles: Array.isArray(p.cycles) ? p.cycles : [],
			imageCycles: Array.isArray(p.imageCycles) ? p.imageCycles : [],
			buttonPairs: Array.isArray(p.buttonPairs) ? p.buttonPairs : [],
			party: Array.isArray(p.party) ? p.party : undefined,
			timeCycles: Array.isArray(p.timeCycles) ? p.timeCycles : [],
			timestampMode: p.timestampMode,
			timestampRangeMin: p.timestampRangeMin,
			timestampRangeMax: p.timestampRangeMax,
			activityType: p.activityType,
			nowMode: p.nowMode,
			updateIntervalSec: p.updateIntervalSec,
			statusCycles: Array.isArray((p as any).statusCycles) ? (p as any).statusCycles : [],
		}

		const nameInput = document.getElementById('config-name-input')
		const name =
			baseName ||
			(nameInput instanceof HTMLInputElement && nameInput.value.trim()
				? nameInput.value.trim()
				: 'Imported profile')

		if (window.addConfigFromState) {
			window.addConfigFromState(name, state)
		}

		renderConfigs()
		showConfigImportedToast()
		return
	}
}

export function importConfigFromFile(file: File): void {
	const reader = new FileReader()
	reader.onload = ev => {
		try {
			const text = String(ev.target?.result || '')
			const parsed = JSON.parse(text)

			const nameInput = document.getElementById('config-name-input')
			const baseName =
				nameInput instanceof HTMLInputElement && nameInput.value.trim()
					? nameInput.value.trim()
					: file.name.replace(/\.[^.]+$/, '') || 'Imported profile'

			importJsonPayload(parsed, baseName)
		} catch (err) {
			console.error('Failed to import config', err)
		}
	}
	reader.readAsText(file)
}

export function setupImportOverlay(): void {
	const importOverlay = document.getElementById('import-overlay') as HTMLInputElement | null
	const importCloseBtn = document.getElementById('import-close-btn') as HTMLInputElement | null
	const importFileInput = document.getElementById('import-file-input') as HTMLInputElement | null

	if (
		!(importOverlay instanceof HTMLElement) ||
		!(importCloseBtn instanceof HTMLButtonElement) ||
		!(importFileInput instanceof HTMLInputElement)
	) {
		return
	}

	function closeImport(): void {
		if (!importOverlay || !importFileInput) return

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
