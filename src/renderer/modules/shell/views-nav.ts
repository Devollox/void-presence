const STORAGE_KEY = 'desktop-tabs-v1'

const NAVIGATION_SELECTOR = '.tab-btn[data-page], .sidebar-item[data-page]'

interface SavedTabs {
	open: string[]
	active: string
}

interface TabEntry {
	wrapper: HTMLDivElement
	button: HTMLButtonElement
	close: HTMLButtonElement
}

let initialized = false
let viewHistory: string[] = []
let historyIndex = -1
let openTabs: string[] = []

const tabs = new Map<string, TabEntry>()

function getNavigationButtons(): HTMLButtonElement[] {
	return Array.from(document.querySelectorAll<HTMLButtonElement>(NAVIGATION_SELECTOR))
}

function hasView(viewName: string): boolean {
	return Array.from(document.querySelectorAll<HTMLElement>('.app-content > [data-view]')).some(
		section => section.dataset.view === viewName
	)
}

function readSavedTabs(): SavedTabs | null {
	try {
		const raw = localStorage.getItem(STORAGE_KEY)

		if (!raw) return null

		const value: unknown = JSON.parse(raw)

		if (!value || typeof value !== 'object') return null

		const saved = value as Partial<SavedTabs>

		if (
			!Array.isArray(saved.open) ||
			!saved.open.every(page => typeof page === 'string') ||
			typeof saved.active !== 'string'
		) {
			return null
		}

		return {
			open: [...new Set(saved.open)],
			active: saved.active,
		}
	} catch {
		return null
	}
}

function saveTabs(): void {
	try {
		const state: SavedTabs = {
			open: [...openTabs],
			active: viewHistory[historyIndex] ?? openTabs[0] ?? '',
		}

		localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
	} catch (error) {
		console.error('[desktop-tabs:save]', error)
	}
}

function updateHistoryButtons(): void {
	const back = document.querySelector<HTMLButtonElement>('#nav-back')
	const forward = document.querySelector<HTMLButtonElement>('#nav-forward')

	if (back) {
		back.disabled = historyIndex <= 0
	}

	if (forward) {
		forward.disabled = historyIndex >= viewHistory.length - 1
	}
}

function syncTabs(): void {
	const container = document.querySelector<HTMLElement>('.tabs[data-horizontal-scroll-container]')

	if (!container) return

	for (const [page, entry] of tabs) {
		entry.wrapper.hidden = !openTabs.includes(page)
		entry.close.disabled = openTabs.length <= 1
	}

	for (const page of openTabs) {
		const entry = tabs.get(page)

		if (entry) {
			container.append(entry.wrapper)
		}
	}
}

function ensureTabOpen(viewName: string): void {
	if (!tabs.has(viewName)) return

	if (!openTabs.includes(viewName)) {
		openTabs.push(viewName)
	}

	syncTabs()
}

function renderView(viewName: string): void {
	if (!hasView(viewName) || !tabs.has(viewName)) return

	ensureTabOpen(viewName)

	document.querySelectorAll<HTMLElement>('.app-content > [data-view]').forEach(section => {
		section.dataset.active = String(section.dataset.view === viewName)
	})

	getNavigationButtons().forEach(button => {
		const active = button.dataset.page === viewName

		button.dataset.active = String(active)

		if (active) {
			button.setAttribute('aria-current', 'page')
		} else {
			button.removeAttribute('aria-current')
		}
	})

	updateHistoryButtons()
	saveTabs()
}

export function setActiveView(viewName: string): void {
	if (!initialized || !hasView(viewName) || !tabs.has(viewName)) {
		return
	}

	if (viewHistory[historyIndex] === viewName) {
		renderView(viewName)
		return
	}

	viewHistory = viewHistory.slice(0, historyIndex + 1)
	viewHistory.push(viewName)
	historyIndex = viewHistory.length - 1

	renderView(viewName)
}

function closeTab(viewName: string): void {
	const index = openTabs.indexOf(viewName)

	if (index === -1 || openTabs.length <= 1) return

	const wasActive = viewHistory[historyIndex] === viewName
	const entry = tabs.get(viewName)
	const focused = document.activeElement

	const hadFocus = focused !== null && Boolean(entry?.wrapper.contains(focused))

	openTabs.splice(index, 1)
	syncTabs()

	if (wasActive) {
		const next = openTabs[index] ?? openTabs[index - 1] ?? openTabs[0]

		if (next) {
			setActiveView(next)
		}
	} else {
		saveTabs()
	}

	if (hadFocus) {
		const active = viewHistory[historyIndex]

		if (active) {
			tabs.get(active)?.button.focus()
		}
	}
}

function goBack(): void {
	if (historyIndex <= 0) return

	historyIndex -= 1
	renderView(viewHistory[historyIndex]!)
}

function goForward(): void {
	if (historyIndex >= viewHistory.length - 1) return

	historyIndex += 1
	renderView(viewHistory[historyIndex]!)
}

function registerTab(button: HTMLButtonElement): void {
	const page = button.dataset.page

	if (!page || !hasView(page) || tabs.has(page)) return

	const wrapper = document.createElement('div')
	wrapper.className = 'desktop-tab-wrapper'

	const close = document.createElement('button')
	close.type = 'button'
	close.className = 'desktop-tab-close'
	close.textContent = '×'

	button.before(wrapper)
	wrapper.append(button, close)

	button.addEventListener('click', () => {
		setActiveView(page)
	})

	close.addEventListener('click', event => {
		event.stopPropagation()
		closeTab(page)
	})

	wrapper.addEventListener('auxclick', event => {
		if (event.button !== 1) return

		event.preventDefault()
		closeTab(page)
	})

	tabs.set(page, {
		wrapper,
		button,
		close,
	})
}

export default function setupViewsNavigation(): void {
	if (initialized) return

	const container = document.querySelector<HTMLElement>('.tabs[data-horizontal-scroll-container]')

	if (!container) return

	const existingTabs = Array.from(
		container.querySelectorAll<HTMLButtonElement>('.tab-btn[data-page]')
	)

	const initialView =
		existingTabs.find(button => button.dataset.active === 'true')?.dataset.page ??
		existingTabs[0]?.dataset.page

	for (const button of existingTabs) {
		registerTab(button)
	}

	document
		.querySelectorAll<HTMLButtonElement>('.sidebar-item[data-page]')
		.forEach(sidebarButton => {
			const page = sidebarButton.dataset.page

			if (!page || !hasView(page)) return

			if (!tabs.has(page)) {
				const button = document.createElement('button')
				button.type = 'button'
				button.className = 'tab-btn desktop-tab'
				button.dataset.page = page
				button.dataset.desktopTab = 'true'
				button.dataset.active = 'false'

				const content = document.createElement('span')
				content.className = 'desktop-tab-content'

				const sourceIcon = sidebarButton.querySelector('.sidebar-item-icon')

				if (sourceIcon) {
					const icon = document.createElement('span')
					icon.className = 'desktop-tab-icon'
					icon.setAttribute('aria-hidden', 'true')

					for (const child of Array.from(sourceIcon.childNodes)) {
						icon.append(child.cloneNode(true))
					}

					content.append(icon)
				}

				const title = document.createElement('span')
				title.className = 'desktop-tab-title'
				title.textContent =
					sidebarButton.querySelector('.sidebar-item-label')?.textContent?.trim() || page

				content.append(title)
				button.append(content)
				container.append(button)

				registerTab(button)
			}

			sidebarButton.addEventListener('click', () => {
				setActiveView(page)
			})
		})

	if (tabs.size === 0) return

	initialized = true

	container.addEventListener('desktop-tabs-reordered', () => {
		openTabs = Array.from(
			container.querySelectorAll<HTMLElement>(':scope > .desktop-tab-wrapper:not([hidden])')
		)
			.map(wrapper => wrapper.querySelector<HTMLButtonElement>('.desktop-tab')?.dataset.page)
			.filter((page): page is string => Boolean(page && tabs.has(page)))

		saveTabs()
	})

	const saved = readSavedTabs()

	const defaultOpen = existingTabs
		.map(button => button.dataset.page)
		.filter((page): page is string => Boolean(page && tabs.has(page)))

	openTabs = saved ? saved.open.filter(page => tabs.has(page)) : defaultOpen

	if (openTabs.length === 0) {
		openTabs = [tabs.keys().next().value!]
	}

	const active =
		saved && openTabs.includes(saved.active)
			? saved.active
			: initialView && openTabs.includes(initialView)
				? initialView
				: openTabs[0]!

	viewHistory = [active]
	historyIndex = 0

	renderView(active)

	document.querySelector<HTMLButtonElement>('#nav-back')?.addEventListener('click', goBack)

	document.querySelector<HTMLButtonElement>('#nav-forward')?.addEventListener('click', goForward)
}
