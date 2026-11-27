const SIDEBAR_STORAGE_KEY = 'app.sidebar.open'
const SIDEBAR_WIDTH_KEY = 'app.sidebar.width'

const MIN_SIDEBAR_WIDTH = 180
const MAX_SIDEBAR_WIDTH = 360
const COLLAPSE_THRESHOLD = 110
const NARROW_BREAKPOINT = 600

let _sidebarOpen = true

export function isSidebarOpen(): boolean {
	return _sidebarOpen
}

function isNarrowWindow(): boolean {
	return window.innerWidth < NARROW_BREAKPOINT
}

export default function setupSidebarToggle(): void {
	const sidebarBtn = document.querySelector<HTMLButtonElement>('.sidebar-toggle-btn')
	const sidebar = document.querySelector<HTMLElement>('.app-sidebar')

	if (!sidebarBtn || !sidebar) return
	if (sidebarBtn.dataset.sidebarInitialized === 'true') return

	sidebarBtn.dataset.sidebarInitialized = 'true'

	let initialState = true
	let isResizing = false

	let peekTimer: number | null = null
	let closePeekTimer: number | null = null

	let buttonHovered = false
	let sidebarHovered = false

	const saveOpenState = (isOpen: boolean): void => {
		try {
			localStorage.setItem(SIDEBAR_STORAGE_KEY, String(isOpen))
		} catch {}
	}

	const saveWidth = (): void => {
		const width = Number.parseFloat(
			document.documentElement.style.getPropertyValue('--sidebar-width')
		)

		if (!Number.isFinite(width)) return

		try {
			localStorage.setItem(SIDEBAR_WIDTH_KEY, String(Math.round(width)))
		} catch {}
	}

	try {
		const savedState = localStorage.getItem(SIDEBAR_STORAGE_KEY)
		initialState = savedState !== null ? savedState === 'true' : true

		const savedWidth = localStorage.getItem(SIDEBAR_WIDTH_KEY)

		if (savedWidth !== null) {
			const width = Number(savedWidth)

			if (Number.isFinite(width) && width >= MIN_SIDEBAR_WIDTH && width <= MAX_SIDEBAR_WIDTH) {
				document.documentElement.style.setProperty('--sidebar-width', `${width}px`)
			}
		}
	} catch {
		initialState = true
	}

	const clearPeekTimers = (): void => {
		if (peekTimer !== null) {
			window.clearTimeout(peekTimer)
			peekTimer = null
		}

		if (closePeekTimer !== null) {
			window.clearTimeout(closePeekTimer)
			closePeekTimer = null
		}
	}

	const setPeek = (isPeeking: boolean): void => {
		const effectivelyClosed = !_sidebarOpen || isNarrowWindow()
		const canPeek = isPeeking && effectivelyClosed && !isResizing

		if (canPeek) {
			sidebar.inert = false
			sidebar.dataset.peek = 'true'
			return
		}

		delete sidebar.dataset.peek
		sidebar.inert = !_sidebarOpen
	}

	const scheduleClosePeek = (): void => {
		clearPeekTimers()

		closePeekTimer = window.setTimeout(() => {
			closePeekTimer = null

			if (buttonHovered || sidebarHovered) return

			setPeek(false)
		}, 180)
	}

	const applyState = (isOpen: boolean, instant = false): void => {
		clearPeekTimers()

		_sidebarOpen = isOpen

		sidebarHovered = false
		delete sidebar.dataset.peek

		if (instant) {
			sidebar.style.transition = 'none'
		}

		sidebarBtn.setAttribute('aria-expanded', String(isOpen))
		sidebar.dataset.open = String(isOpen)
		sidebar.inert = isNarrowWindow() ? false : !isOpen

		if (instant) {
			void sidebar.offsetWidth
			sidebar.style.removeProperty('transition')
		}
	}

	applyState(initialState, true)

	window.addEventListener(
		'resize',
		() => {
			const narrow = isNarrowWindow()
			const wasNarrow = document.documentElement.hasAttribute('data-narrow')

			if (narrow === wasNarrow) return

			if (narrow) {
				clearPeekTimers()
				delete sidebar.dataset.peek
				sidebar.inert = false
				document.documentElement.setAttribute('data-narrow', 'true')
			} else {
				document.documentElement.removeAttribute('data-narrow')
				clearPeekTimers()
				delete sidebar.dataset.peek
				sidebar.inert = !_sidebarOpen
			}
		},
		{ passive: true }
	)

	if (isNarrowWindow()) {
		document.documentElement.setAttribute('data-narrow', 'true')
	}

	sidebarBtn.addEventListener('pointerenter', (event: PointerEvent) => {
		if (event.pointerType !== 'mouse') return

		buttonHovered = true

		if ((!isNarrowWindow() && _sidebarOpen) || isResizing) return

		clearPeekTimers()

		peekTimer = window.setTimeout(() => {
			peekTimer = null

			if (!buttonHovered) return

			setPeek(true)
		}, 120)
	})

	sidebarBtn.addEventListener('pointerleave', (event: PointerEvent) => {
		if (event.pointerType !== 'mouse') return

		buttonHovered = false

		if (!_sidebarOpen || isNarrowWindow()) {
			scheduleClosePeek()
		}
	})

	sidebar.addEventListener('pointerenter', (event: PointerEvent) => {
		if (event.pointerType !== 'mouse') return

		sidebarHovered = true

		if (sidebar.dataset.peek === 'true') {
			clearPeekTimers()
		}
	})

	sidebar.addEventListener('pointerleave', (event: PointerEvent) => {
		if (event.pointerType !== 'mouse') return

		sidebarHovered = false

		if (sidebar.dataset.peek === 'true') {
			scheduleClosePeek()
		}
	})

	sidebarBtn.addEventListener('click', () => {
		if (isResizing) return

		if (isNarrowWindow()) {
			if (sidebar.dataset.peek === 'true') {
				setPeek(false)
			} else {
				setPeek(true)
			}
			return
		}

		const nextState = !_sidebarOpen
		applyState(nextState)
		saveOpenState(nextState)
	})

	window.addEventListener('blur', () => {
		buttonHovered = false
		sidebarHovered = false

		clearPeekTimers()
		setPeek(false)
	})

	const collapsibleSections = sidebar.querySelectorAll<HTMLElement>(
		'.sidebar-section, .sidebar-account-group'
	)

	collapsibleSections.forEach(section => {
		const isAccount = section.classList.contains('sidebar-account-group')

		const button = isAccount
			? section.querySelector<HTMLButtonElement>('.sidebar-account-heading')
			: section.querySelector<HTMLButtonElement>('.sidebar-section-toggle')

		const body = isAccount
			? section.querySelector<HTMLElement>('.sidebar-account-body')
			: section.querySelector<HTMLElement>('.sidebar-section-body')

		if (!button || !body) return

		const storageKey = section.id
			? `app.sidebar.section.${section.id}`
			: button.getAttribute('aria-controls')
				? `app.sidebar.section.${button.getAttribute('aria-controls')}`
				: null

		const applySectionState = (isOpen: boolean): void => {
			if (!isOpen && body.contains(document.activeElement)) {
				button.focus()
			}

			section.dataset.open = String(isOpen)
			button.setAttribute('aria-expanded', String(isOpen))
			body.toggleAttribute('inert', !isOpen)
		}

		let defaultOpen = section.dataset.open !== 'false'

		if (storageKey) {
			try {
				const saved = localStorage.getItem(storageKey)
				if (saved !== null) defaultOpen = saved === 'true'
			} catch {}
		}

		applySectionState(defaultOpen)

		button.addEventListener('click', () => {
			const nextOpen = section.dataset.open !== 'true'
			applySectionState(nextOpen)

			if (storageKey) {
				try {
					localStorage.setItem(storageKey, String(nextOpen))
				} catch {}
			}
		})
	})

	const resizer = sidebar.querySelector<HTMLElement>('.sidebar-resizer')

	if (!resizer) return

	const updateCursorY = (clientY: number): void => {
		const rect = resizer.getBoundingClientRect()
		const y = Math.max(0, Math.min(clientY - rect.top, rect.height))

		resizer.style.setProperty('--resizer-y', `${y}px`)
		resizer.style.setProperty('--resizer-fade-length', `${rect.height}px`)
	}

	resizer.addEventListener('pointermove', (event: PointerEvent) => {
		if (!isResizing) {
			updateCursorY(event.clientY)
		}
	})

	resizer.addEventListener('pointerdown', (event: PointerEvent) => {
		if (event.button !== 0) return
		if (isResizing || !_sidebarOpen) return

		event.preventDefault()

		clearPeekTimers()

		isResizing = true

		let moved = false

		const pointerId = event.pointerId
		const startX = event.clientX
		const startWidth = sidebar.getBoundingClientRect().width
		const previousCursor = document.body.style.cursor

		sidebar.dataset.resizing = 'true'
		document.body.style.cursor = 'col-resize'

		updateCursorY(event.clientY)

		const finishResize = (): void => {
			isResizing = false

			delete sidebar.dataset.resizing
			document.body.style.cursor = previousCursor

			window.removeEventListener('pointermove', onMove)
			window.removeEventListener('pointerup', onUp)
			window.removeEventListener('pointercancel', onCancel)
			window.removeEventListener('blur', onBlur)
		}

		const collapseSidebar = (): void => {
			saveWidth()
			finishResize()

			sidebar.style.removeProperty('transition')
			void sidebar.offsetWidth

			applyState(false)
			saveOpenState(false)
		}

		const onMove = (moveEvent: PointerEvent): void => {
			if (!isResizing || moveEvent.pointerId !== pointerId) return

			updateCursorY(moveEvent.clientY)

			const dx = moveEvent.clientX - startX

			if (Math.abs(dx) > 3) {
				moved = true
			}

			const rawWidth = startWidth + dx

			if (rawWidth < COLLAPSE_THRESHOLD) {
				collapseSidebar()
				return
			}

			const width = Math.max(MIN_SIDEBAR_WIDTH, Math.min(rawWidth, MAX_SIDEBAR_WIDTH))

			document.documentElement.style.setProperty('--sidebar-width', `${Math.round(width)}px`)
		}

		const onUp = (upEvent: PointerEvent): void => {
			if (upEvent.pointerId !== pointerId) return

			if (!moved) {
				collapseSidebar()
				return
			}

			finishResize()
			saveWidth()
		}

		const cancelResize = (): void => {
			finishResize()
			saveWidth()
		}

		const onCancel = (cancelEvent: PointerEvent): void => {
			if (cancelEvent.pointerId !== pointerId) return

			cancelResize()
		}

		const onBlur = (): void => {
			cancelResize()
		}

		window.addEventListener('pointermove', onMove)
		window.addEventListener('pointerup', onUp)
		window.addEventListener('pointercancel', onCancel)
		window.addEventListener('blur', onBlur)
	})
}

export function syncSidebarCollapsibleStates(): void {
	const sidebar = document.querySelector<HTMLElement>('.app-sidebar')

	if (!sidebar) return

	const collapsibleSections = sidebar.querySelectorAll<HTMLElement>(
		'.sidebar-section, .sidebar-account-group'
	)

	collapsibleSections.forEach(section => {
		const isAccount = section.classList.contains('sidebar-account-group')

		const button = isAccount
			? section.querySelector<HTMLButtonElement>('.sidebar-account-heading')
			: section.querySelector<HTMLButtonElement>('.sidebar-section-toggle')

		const body = isAccount
			? section.querySelector<HTMLElement>('.sidebar-account-body')
			: section.querySelector<HTMLElement>('.sidebar-section-body')

		if (!button || !body) return

		const isOpen = section.dataset.open !== 'false'

		section.dataset.open = String(isOpen)
		button.setAttribute('aria-expanded', String(isOpen))
		body.toggleAttribute('inert', !isOpen)
	})
}
