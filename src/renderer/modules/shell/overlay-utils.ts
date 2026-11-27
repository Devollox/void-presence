const CLOSING_DURATION = 250

export function openOverlay(overlay: HTMLElement): void {
	overlay.removeAttribute('data-closing')
	overlay.hidden = false
	document.body.setAttribute('data-modal-open', 'true')
}

export function closeOverlay(overlay: HTMLElement, onDone?: () => void): void {
	if (overlay.hidden || overlay.hasAttribute('data-closing')) return

	overlay.setAttribute('data-closing', '')

	setTimeout(() => {
		overlay.hidden = true
		overlay.removeAttribute('data-closing')
		document.body.removeAttribute('data-modal-open')
		onDone?.()
	}, CLOSING_DURATION)
}

export function isOverlayOpen(overlay: HTMLElement): boolean {
	return !overlay.hidden && !overlay.hasAttribute('data-closing')
}
