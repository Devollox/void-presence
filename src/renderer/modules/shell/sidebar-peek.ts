export default function initSidebarPeek(): void {
	const workspace = document.querySelector<HTMLElement>('.app-workspace')
	const sidebar = workspace?.querySelector<HTMLElement>('.app-sidebar')

	if (!workspace || !sidebar) return

	const backdrop = document.createElement('div')
	backdrop.className = 'sidebar-peek-backdrop'
	backdrop.setAttribute('aria-hidden', 'true')
	workspace.append(backdrop)

	const closePeek = (): void => {
		if (sidebar.dataset.open !== 'false') return

		sidebar.removeAttribute('data-peek')
	}

	backdrop.addEventListener('pointerdown', closePeek)

	sidebar.addEventListener('click', (event: MouseEvent): void => {
		if (!(event.target instanceof Element)) return

		const item = event.target.closest<HTMLElement>('.sidebar-item, .sidebar-account-link')

		if (!item || item.matches(':disabled, [aria-disabled="true"]')) {
			return
		}

		closePeek()
	})

	document.addEventListener('keydown', (event: KeyboardEvent): void => {
		if (event.key === 'Escape') closePeek()
	})
}
