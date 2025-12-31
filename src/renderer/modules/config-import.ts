import { FullState } from './types'

export function importConfigFromFile(file: File): void {
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

export function setupImportOverlay(): void {
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
