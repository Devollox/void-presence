const SIDEBAR_STORAGE_KEY = 'app.sidebar.open'

export default function setupSidebarToggle(): void {
	const sidebarBtn = document.querySelector<HTMLButtonElement>('.sidebar-toggle-btn')
	const sidebar = document.querySelector<HTMLElement>('.app-sidebar')

	if (!sidebarBtn || !sidebar) return
	if (sidebarBtn.dataset.sidebarInitialized === 'true') return

	sidebarBtn.dataset.sidebarInitialized = 'true'

	const savedState = localStorage.getItem(SIDEBAR_STORAGE_KEY)
	const initialState = savedState !== null ? savedState === 'true' : true

	const applyState = (isOpen: boolean): void => {
		const value = String(isOpen)

		sidebarBtn.setAttribute('aria-expanded', value)
		sidebar.dataset.open = value
	}

	applyState(initialState)

	sidebarBtn.addEventListener('click', () => {
		const isOpen = sidebar.dataset.open === 'true'
		const nextState = !isOpen

		applyState(nextState)
		localStorage.setItem(SIDEBAR_STORAGE_KEY, String(nextState))
	})
}
