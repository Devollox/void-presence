import { CustomStatusItem, FullState } from '../../../types/types'
import { renderConfigs } from '../config-page/config-render'
import { getConfigs, setConfigs } from '../config-page/config-storage'
import { setupToasts } from '../config/toasts'
import { renderStatusProfiles } from '../status-page/status-render'
import { addStatusProfileFromItems } from '../status-page/status-storage'
import { getStatusProfiles, setStatusProfiles } from '../status-page/status-storage'
import { closeOverlay, isOverlayOpen } from '../shell/overlay-utils'
import { setActiveView } from '../shell/views-nav'

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
		const createdAt = addStatusProfileFromItems(name, parsed)
		renderStatusProfiles()

		showConfigImportedToast({
			onUndo: () => {
				const profiles = getStatusProfiles()
				const target = profiles.findIndex(p => p.createdAt === createdAt)
				if (target !== -1) {
					profiles.splice(target, 1)
					setStatusProfiles(profiles)
					renderStatusProfiles()
				}
			},
		})
		setActiveView('status')
		return
	}

	if (isStatusObject(parsed)) {
		const name = baseName || 'Imported status'
		const obj = parsed as { statusCycles: CustomStatusItem[] }
		const createdAt = addStatusProfileFromItems(name, obj.statusCycles)
		renderStatusProfiles()

		showConfigImportedToast({
			onUndo: () => {
				const profiles = getStatusProfiles()
				const target = profiles.findIndex(p => p.createdAt === createdAt)
				if (target !== -1) {
					profiles.splice(target, 1)
					setStatusProfiles(profiles)
					renderStatusProfiles()
				}
			},
		})
		setActiveView('status')
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
			statusCycles: [],
		}

		const nameInput = document.getElementById('config-name-input')
		const name =
			baseName ||
			(nameInput instanceof HTMLInputElement && nameInput.value.trim()
				? nameInput.value.trim()
				: 'Imported profile')

		const createdAt = new Date().toISOString()

		if (window.addConfigFromState) {
			window.addConfigFromState(name, state, createdAt)
		}

		renderConfigs()

		showConfigImportedToast({
			onUndo: () => {
				const configs = getConfigs()
				const target = configs.findIndex(c => c.createdAt === createdAt)
				if (target !== -1) {
					configs.splice(target, 1)
					setConfigs(configs)
					renderConfigs()
				}
			},
		})
		setActiveView('configs-presence')
		return
	}
}

export function importConfigFromFile(file: File): void {
	const reader = new FileReader()
	reader.onload = ev => {
		try {
			const text = String(ev.target?.result || '')
			const parsed = JSON.parse(text) as unknown

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
	const overlay = document.getElementById('import-overlay') as HTMLElement | null
	const closeBtn = document.getElementById('import-close-btn') as HTMLButtonElement | null
	const fileInput = document.getElementById('import-file-input') as HTMLInputElement | null
	const backdrop = document.getElementById('import-backdrop') as HTMLElement | null

	if (!overlay || !closeBtn || !fileInput) return

	const close = (): void => {
		closeOverlay(overlay, () => {
			fileInput.value = ''
		})
	}

	closeBtn.addEventListener('click', close)
	backdrop?.addEventListener('click', close)

	document.addEventListener('keydown', (e: KeyboardEvent) => {
		if (e.key === 'Escape' && isOverlayOpen(overlay)) {
			e.preventDefault()
			close()
		}
	})

	fileInput.addEventListener('change', () => {
		const file = fileInput.files?.[0]
		if (!file) return
		importConfigFromFile(file)
		close()
	})
}
