import { DragStateList } from 'src/types/types'

const DRAG_THRESHOLD = 4
const DROP_DURATION = 220

type DnDTarget = {
	items: unknown[]
	renderFn: () => void
}

const targets = new WeakMap<HTMLElement, DnDTarget>()

export function attachDnD<T>(container: HTMLElement, items: T[], renderFn: () => void): void {
	targets.set(container, { items, renderFn })

	if (container.dataset.dndInit === 'true') return

	container.dataset.dndInit = 'true'

	const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)')

	let state: DragStateList | null = null
	let blockClicksUntil = 0
	let dropTimer: number | undefined

	const getRows = (): HTMLElement[] =>
		Array.from(container.children).filter(
			(child): child is HTMLElement =>
				child instanceof HTMLElement &&
				(child.classList.contains('presence-list-item') ||
					child.classList.contains('cycle-row')) &&
				child.getClientRects().length > 0
		)

	const removeWindowListeners = (): void => {
		window.removeEventListener('pointermove', onPointerMove)
		window.removeEventListener('pointerup', onPointerUp)
		window.removeEventListener('pointercancel', onPointerCancel)
		window.removeEventListener('keydown', onKeyDown)
		window.removeEventListener('blur', onBlur)
	}

	const reset = (commit: boolean): void => {
		const current = state

		if (!current) return

		window.clearTimeout(dropTimer)
		removeWindowListeners()

		for (const row of current.rows) {
			row.classList.add('presence-list-reset')
			row.style.removeProperty('transform')
			row.removeAttribute('data-dragging')
			row.removeAttribute('data-dropping')
		}

		if (commit && current.from !== current.to) {
			const dragged = current.rows[current.from]!
			const target = current.rows[current.to]!

			container.insertBefore(dragged, current.from < current.to ? target.nextSibling : target)

			const entry = targets.get(container)

			if (entry) {
				const [moved] = entry.items.splice(current.from, 1)
				entry.items.splice(current.to, 0, moved)
				entry.renderFn()
			}
		}

		container.classList.remove('presence-list-sorting')
		document.body.classList.remove('presence-dnd-active')

		if (current.active) {
			blockClicksUntil = Date.now() + 250
		}

		state = null

		void container.offsetHeight

		for (const row of getRows()) {
			row.classList.remove('presence-list-reset')
		}
	}

	const updateSiblings = (targetIndex: number): void => {
		const current = state

		if (!current) return

		current.to = targetIndex

		const activeRect = current.rects[current.from]!
		const step = activeRect.height + current.gap

		current.rows.forEach((row, index) => {
			if (index === current.from) return

			let shift = 0

			if (current.from < targetIndex && index > current.from && index <= targetIndex) {
				shift = -step
			} else if (current.from > targetIndex && index >= targetIndex && index < current.from) {
				shift = step
			}

			row.style.transform = `translate3d(0, ${shift}px, 0)`
		})
	}

	function onPointerMove(event: PointerEvent): void {
		const current = state

		if (!current || current.dropping || event.pointerId !== current.pointerId) {
			return
		}

		const dy = event.clientY - current.startY

		if (!current.active) {
			if (Math.abs(dy) < DRAG_THRESHOLD) return

			current.active = true
			container.classList.add('presence-list-sorting')
			current.row.setAttribute('data-dragging', 'true')
			document.body.classList.add('presence-dnd-active')
			blockClicksUntil = Number.POSITIVE_INFINITY
		}

		event.preventDefault()

		const first = current.rects[0]!
		const last = current.rects[current.rects.length - 1]!
		const active = current.rects[current.from]!

		const minDy = first.top - active.top
		const maxDy = last.bottom - active.bottom
		const clampedDy = Math.max(minDy, Math.min(dy, maxDy))

		current.row.style.transform = `translate3d(0, ${clampedDy}px, 0)`

		let targetIndex = current.from

		if (clampedDy > 0) {
			for (let index = current.from + 1; index < current.rects.length; index++) {
				const rect = current.rects[index]!

				if (active.bottom + clampedDy > rect.top + rect.height / 2) {
					targetIndex = index
				}
			}
		} else if (clampedDy < 0) {
			for (let index = current.from - 1; index >= 0; index--) {
				const rect = current.rects[index]!

				if (active.top + clampedDy < rect.top + rect.height / 2) {
					targetIndex = index
				}
			}
		}

		updateSiblings(targetIndex)
	}

	function onPointerUp(event: PointerEvent): void {
		const current = state

		if (!current || current.dropping || event.pointerId !== current.pointerId) {
			return
		}

		if (!current.active) {
			reset(false)
			return
		}

		current.dropping = true
		blockClicksUntil = Number.POSITIVE_INFINITY

		current.row.removeAttribute('data-dragging')
		current.row.setAttribute('data-dropping', 'true')

		const active = current.rects[current.from]!
		const target = current.rects[current.to]!

		const finalDy =
			current.to > current.from ? target.bottom - active.bottom : target.top - active.top

		current.row.style.transform = `translate3d(0, ${finalDy}px, 0)`

		dropTimer = window.setTimeout(() => reset(true), reducedMotion.matches ? 0 : DROP_DURATION)
	}

	function onPointerCancel(event: PointerEvent): void {
		if (state?.pointerId === event.pointerId) {
			reset(false)
		}
	}

	function onKeyDown(event: KeyboardEvent): void {
		if (event.key !== 'Escape' || !state) return

		event.preventDefault()
		event.stopPropagation()
		reset(false)
	}

	function onBlur(): void {
		reset(false)
	}

	container.addEventListener(
		'click',
		event => {
			if (Date.now() >= blockClicksUntil) return

			event.preventDefault()
			event.stopImmediatePropagation()
		},
		true
	)

	container.addEventListener('dragstart', event => {
		if (event.target instanceof Element && event.target.closest('.presence-drag-handle, .drag-handle')) {
			event.preventDefault()
		}
	})

	container.addEventListener('pointerdown', event => {
		if (
			state ||
			event.button !== 0 ||
			!event.isPrimary ||
			!(event.target instanceof Element)
		) {
			return
		}

		const handle = event.target.closest<HTMLElement>('.presence-drag-handle, .drag-handle')

		if (!handle) return

		const row = handle.closest<HTMLElement>('.presence-list-item, .cycle-row')

		if (!row || row.parentElement !== container) return

		const rows = getRows()

		if (rows.length < 2) return

		const from = rows.indexOf(row)

		if (from === -1) return

		const rects = rows.map(child => child.getBoundingClientRect())
		const gaps = rects.slice(1).map((rect, index) => rect.top - rects[index]!.bottom)

		state = {
			pointerId: event.pointerId,
			row,
			rows,
			rects,
			from,
			to: from,
			startY: event.clientY,
			gap: gaps.length > 0 ? gaps.reduce((sum, value) => sum + value, 0) / gaps.length : 0,
			active: false,
			dropping: false,
		}

		window.addEventListener('pointermove', onPointerMove, {
			passive: false,
		})
		window.addEventListener('pointerup', onPointerUp)
		window.addEventListener('pointercancel', onPointerCancel)
		window.addEventListener('keydown', onKeyDown)
		window.addEventListener('blur', onBlur)
	})
}
