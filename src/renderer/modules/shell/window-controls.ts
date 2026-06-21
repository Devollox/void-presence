export function setupWindowControls(): void {
	const closeBtn = document.getElementById('window-close') as HTMLButtonElement | null
	const minimizeBtn = document.getElementById('window-minimize') as HTMLButtonElement | null
	const maximizeBtn = document.getElementById('window-maximize') as HTMLButtonElement | null

	if (closeBtn && window.electronAPI?.windowClose) {
		closeBtn.addEventListener('click', () => {
			window.electronAPI.windowClose()
		})
	}

	if (minimizeBtn && window.electronAPI?.windowMinimize) {
		minimizeBtn.addEventListener('click', () => {
			window.electronAPI.windowMinimize()
		})
	}

	if (maximizeBtn && window.electronAPI?.windowToggleMaximize) {
		maximizeBtn.addEventListener('click', () => {
			window.electronAPI.windowToggleMaximize()
		})
	}
}
