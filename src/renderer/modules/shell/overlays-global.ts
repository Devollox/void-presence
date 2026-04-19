function closeOverlay(overlayId: string) {
	const overlay = document.getElementById(overlayId) as HTMLElement | null
	if (!overlay) return
	overlay.setAttribute('data-open', 'false')

	if (overlayId === 'import-overlay') {
		const input = document.getElementById(
			'import-file-input',
		) as HTMLInputElement | null
		if (input) input.value = ''
	}
}

document.addEventListener('keydown', event => {
	if (event.key !== 'Escape') return

	const tag = (document.activeElement?.tagName || '').toUpperCase()
	if (tag === 'INPUT' || tag === 'TEXTAREA') return

	const importOverlay = document.getElementById('import-overlay')
	const detailsOverlay = document.getElementById('config-details-overlay')
	const uploadOverlay = document.getElementById('upload-confirm-overlay')
	const updateOverlay = document.getElementById('update-overlay')

	if (importOverlay && importOverlay.getAttribute('data-open') === 'true') {
		event.preventDefault()
		closeOverlay('import-overlay')
		return
	}

	if (updateOverlay && updateOverlay.getAttribute('data-open') === 'true') {
		event.preventDefault()
		closeOverlay('update-overlay')
		return
	}

	if (uploadOverlay && uploadOverlay.getAttribute('data-open') === 'true') {
		event.preventDefault()
		closeOverlay('upload-confirm-overlay')
		return
	}

	if (detailsOverlay && detailsOverlay.getAttribute('data-open') === 'true') {
		event.preventDefault()
		closeOverlay('config-details-overlay')
		return
	}
})
