export function setupWindowControls(): void {
	const api = window.electronAPI
	if (!api) return

	document.getElementById('window-close')?.addEventListener('click', () => api.windowClose())
	document.getElementById('window-minimize')?.addEventListener('click', () => api.windowMinimize())
	document
		.getElementById('window-maximize')
		?.addEventListener('click', () => api.windowToggleMaximize())
}
