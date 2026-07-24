const views = document.querySelectorAll<HTMLElement>('[data-view]')
const navButtons = document.querySelectorAll<HTMLElement>('[data-page]')

type ViewName = string

export function setActiveView(viewName: ViewName): void {
	views.forEach(view => {
		view.dataset.active = String(view.dataset.view === viewName)
	})

	navButtons.forEach(btn => {
		btn.dataset.active = String(btn.dataset.page === viewName)
	})
}

navButtons.forEach(button => {
	const page = button.dataset.page
	if (page) {
		button.addEventListener('click', () => setActiveView(page))
	}
})
