const views = document.querySelectorAll<HTMLElement>('[data-view]') as NodeListOf<
	HTMLElement & { dataset: { view: string } }
>

const navButtons = document.querySelectorAll<HTMLElement>('[data-page]') as NodeListOf<
	HTMLElement & { dataset: { page: string } }
>

const viewNames = [...views].map(v => v.dataset.view)
type ViewName = (typeof viewNames)[number]

export function setActiveView<T extends ViewName>(viewName: T): void {
	views.forEach(v => {
		v.dataset.active = String(v.dataset.view === viewName)
	})

	navButtons.forEach(b => {
		b.dataset.active = String(b.dataset.page === viewName)
	})
}

navButtons.forEach(button => {
	const viewName = button.dataset.page
	if (viewName) {
		button.addEventListener('click', () => setActiveView(viewName as ViewName))
	}
})
