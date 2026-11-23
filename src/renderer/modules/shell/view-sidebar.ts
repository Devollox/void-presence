const SIDEBAR_STORAGE_KEY = 'app.sidebar.open'
const SIDEBAR_WIDTH_KEY = 'app.sidebar.width'

const MIN_SIDEBAR_WIDTH = 180
const MAX_SIDEBAR_WIDTH = 360
const COLLAPSE_THRESHOLD = 110

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
		const canPeek = isPeeking && sidebar.dataset.open === 'false' && !isResizing

		if (canPeek) {
			sidebar.inert = false
			sidebar.dataset.peek = 'true'
			return
		}

		delete sidebar.dataset.peek
		sidebar.inert = sidebar.dataset.open === 'false'
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

		sidebarHovered = false
		delete sidebar.dataset.peek

		if (instant) {
			sidebar.style.transition = 'none'
		}

		sidebarBtn.setAttribute('aria-expanded', String(isOpen))
		sidebar.dataset.open = String(isOpen)
		sidebar.inert = !isOpen

		if (instant) {
			void sidebar.offsetWidth
			sidebar.style.removeProperty('transition')
		}
	}

	applyState(initialState, true)

	sidebarBtn.addEventListener('pointerenter', (event: PointerEvent) => {
		if (event.pointerType !== 'mouse') return

		buttonHovered = true

		if (sidebar.dataset.open !== 'false' || isResizing) return

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

		if (sidebar.dataset.open === 'false') {
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

		const nextState = sidebar.dataset.open !== 'true'

		applyState(nextState)
		saveOpenState(nextState)
	})

	window.addEventListener('blur', () => {
		buttonHovered = false
		sidebarHovered = false

		clearPeekTimers()
		setPeek(false)
	})

	sidebar.querySelectorAll<HTMLElement>('.sidebar-section').forEach(section => {
		const button = section.querySelector<HTMLButtonElement>('.sidebar-section-toggle')
		const body = section.querySelector<HTMLElement>('.sidebar-section-body')

		if (!button || !body) return

		const applySectionState = (isOpen: boolean): void => {
			if (!isOpen && body.contains(document.activeElement)) {
				button.focus()
			}

			section.dataset.open = String(isOpen)
			button.setAttribute('aria-expanded', String(isOpen))
			body.toggleAttribute('inert', !isOpen)
		}

		applySectionState(section.dataset.open !== 'false')

		button.addEventListener('click', () => {
			applySectionState(section.dataset.open !== 'true')
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
		if (isResizing || sidebar.dataset.open !== 'true') return

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
			saveOpenState(sidebar.dataset.open === 'true')
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
