export function setupWindowControls(): void {
	const closeBtn = document.getElementById(
		'window-close'
	) as HTMLButtonElement | null
	const minimizeBtn = document.getElementById(
		'window-minimize'
	) as HTMLButtonElement | null
	if (closeBtn && window.electronAPI?.windowClose) {
		closeBtn.addEventListener('click', () => {
			window.electronAPI?.windowClose?.()
		})
	}
	if (minimizeBtn && window.electronAPI?.windowMinimize) {
		minimizeBtn.addEventListener('click', () => {
			window.electronAPI?.windowMinimize?.()
		})
	}
}
