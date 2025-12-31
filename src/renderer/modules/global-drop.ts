import { importConfigFromFile } from './config-import'

let dragDepth = 0
let hideOverlay: () => void

export function setupGlobalDrop(): void {
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
