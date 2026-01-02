import { importConfigFromFile } from './config-import'

export function setupGlobalDrop(): void {
	const overlay = document.getElementById(
		'global-drop-overlay'
	) as HTMLElement | null
	if (!overlay) return

	const showOverlay = () => {
		overlay.dataset.active = 'true'
	}

	const hideOverlay = () => {
		overlay.dataset.active = 'false'
	}

	const hasFileItem = (items: DataTransferItemList): boolean =>
		Array.from(items).some(it => it.kind === 'file')

	document.addEventListener('dragenter', e => {
		const items = e.dataTransfer?.items
		if (!items || !items.length) return
		if (!hasFileItem(items)) return

		showOverlay()
		e.preventDefault()
	})

	document.addEventListener('dragover', e => {
		const items = e.dataTransfer?.items
		if (!items || !items.length) return
		if (!hasFileItem(items)) return

		e.preventDefault()
		if (e.dataTransfer) e.dataTransfer.dropEffect = 'copy'

		const leftWindow =
			e.clientX <= 0 ||
			e.clientY <= 0 ||
			e.clientX >= window.innerWidth ||
			e.clientY >= window.innerHeight

		if (leftWindow) {
			hideOverlay()
		}
	})

	document.addEventListener('dragleave', e => {
		const leftWindow =
			e.clientX <= 0 ||
			e.clientY <= 0 ||
			e.clientX >= window.innerWidth ||
			e.clientY >= window.innerHeight

		if (
			leftWindow ||
			e.target === document.documentElement ||
			e.target === document.body
		) {
			hideOverlay()
		}
	})

	document.addEventListener('dragexit', () => {
		hideOverlay()
	})

	window.addEventListener('blur', () => {
		hideOverlay()
	})

	document.addEventListener('drop', e => {
		const files = e.dataTransfer?.files
		hideOverlay()
		if (!files || !files.length) return
		e.preventDefault()
		const file = files[0]
		if (!file) return
		importConfigFromFile(file)
	})
}
