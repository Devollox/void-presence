const views = document.querySelectorAll<HTMLElement>('[data-view]')
const navButtons = document.querySelectorAll<HTMLButtonElement>('.tab-btn[data-page]')
const backButton = document.querySelector<HTMLButtonElement>('#nav-back')
const forwardButton = document.querySelector<HTMLButtonElement>('#nav-forward')

type ViewName = string

const history: ViewName[] = []
let historyIndex = -1

function updateHistoryButtons(): void {
	if (backButton) {
		backButton.disabled = historyIndex <= 0
	}

	if (forwardButton) {
		forwardButton.disabled = historyIndex >= history.length - 1
	}
}

function renderView(viewName: ViewName): void {
	views.forEach(view => {
		view.dataset.active = String(view.dataset.view === viewName)
	})

	navButtons.forEach(button => {
		button.dataset.active = String(button.dataset.page === viewName)
	})

	updateHistoryButtons()
}

export function setActiveView(viewName: ViewName): void {
	const exists = Array.from(navButtons).some(button => button.dataset.page === viewName)

	if (!exists || history[historyIndex] === viewName) {
		return
	}

	history.splice(historyIndex + 1)
	history.push(viewName)
	historyIndex = history.length - 1

	renderView(viewName)
}

function goBack(): void {
	if (historyIndex <= 0) {
		return
	}

	historyIndex -= 1
	renderView(history[historyIndex]!)
}

function goForward(): void {
	if (historyIndex >= history.length - 1) {
		return
	}

	historyIndex += 1
	renderView(history[historyIndex]!)
}

navButtons.forEach(button => {
	const page = button.dataset.page

	if (page) {
		button.addEventListener('click', () => setActiveView(page))
	}
})

backButton?.addEventListener('click', goBack)
forwardButton?.addEventListener('click', goForward)

const initialView =
	Array.from(navButtons).find(button => button.dataset.active === 'true')?.dataset.page ??
	navButtons[0]?.dataset.page

if (initialView) {
	setActiveView(initialView)
} else {
	updateHistoryButtons()
}
