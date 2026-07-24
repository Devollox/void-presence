const navButtons = document.querySelectorAll<HTMLElement>('[data-page]')
const views = document.querySelectorAll<HTMLElement>('[data-view]')

export function setActiveView(viewName: string): void {
	views.forEach(v => {
		v.setAttribute('data-active', String(v.getAttribute('data-view') === viewName))
	})

	navButtons.forEach(b => {
		b.setAttribute('data-active', String(b.getAttribute('data-page') === viewName))
	})
}

navButtons.forEach(button => {
	const viewName = button.getAttribute('data-page')
	if (viewName) {
		button.addEventListener('click', () => setActiveView(viewName))
	}
})
