import { DragState } from 'src/types/types'

export default function setupTabsDnd(onReorder?: (orderedIds: string[]) => void): void {
	const element = document.querySelector<HTMLElement>('.tabs-scroll-container')

	if (!element || element.dataset.dndInit === 'true') return

	const container: HTMLElement = element

	container.dataset.dndInit = 'true'

	const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)')

	let state: DragState | null = null
	let timer: number | undefined
	let blockClicksUntil = 0

	const getItems = (): HTMLElement[] =>
		Array.from(
			container.querySelectorAll<HTMLElement>(':scope > .desktop-tab-wrapper:not([hidden])')
		).filter(item => item.getClientRects().length > 0)

	const updateShortcuts = (): void => {
		container
			.querySelectorAll<HTMLElement>('.desktop-tab')
			.forEach(tab => tab.removeAttribute('data-shortcut'))

		getItems().forEach((wrapper, index) => {
			const tab = wrapper.querySelector<HTMLElement>('.desktop-tab')

			if (tab && index < 9) {
				tab.dataset.shortcut = `Ctrl+${index + 1}`
			}
		})
	}

	const removeListeners = (): void => {
		window.removeEventListener('pointermove', onPointerMove)
		window.removeEventListener('pointerup', onPointerUp)
		window.removeEventListener('pointercancel', onPointerCancel)
		window.removeEventListener('keydown', onKeyDown)
		window.removeEventListener('blur', onBlur)
	}

	const finish = (commit: boolean): void => {
		const current = state

		if (!current) return

		window.clearTimeout(timer)
		removeListeners()

		for (const item of current.items) {
			item.classList.add('desktop-tab-reset')
			item.style.removeProperty('transform')
			item.removeAttribute('data-dragging')
			item.removeAttribute('data-dropping')
		}

		const active = current.items[current.from]
		const target = current.items[current.to]

		if (commit && active && target && current.from !== current.to) {
			container.insertBefore(active, current.from < current.to ? target.nextSibling : target)
		}

		container.classList.remove('desktop-tabs-sorting')

		if (current.active) {
			blockClicksUntil = Date.now() + 250
		}

		state = null

		void container.offsetWidth

		for (const item of current.items) {
			item.classList.remove('desktop-tab-reset')
		}

		updateShortcuts()

		if (commit && current.active) {
			container.dispatchEvent(new Event('desktop-tabs-reordered'))

			const ids = getItems()
				.map(item => item.querySelector<HTMLButtonElement>('.desktop-tab')?.id)
				.filter((id): id is string => Boolean(id))

			onReorder?.(ids)
		}
	}

	function onPointerMove(event: PointerEvent): void {
		const current = state

		if (!current || current.dropping || event.pointerId !== current.pointerId) {
			return
		}

		const dx = event.clientX - current.startX

		if (!current.active) {
			if (Math.abs(dx) < 4) return

			current.active = true
			blockClicksUntil = Number.POSITIVE_INFINITY

			container.classList.add('desktop-tabs-sorting')
			current.items[current.from]!.dataset.dragging = 'true'
		}

		event.preventDefault()

		const first = current.rects[0]!
		const last = current.rects[current.rects.length - 1]!
		const activeRect = current.rects[current.from]!

		const minDx = first.left - activeRect.left
		const maxDx = last.right - activeRect.right
		const offset = Math.max(minDx, Math.min(dx, maxDx))

		current.items[current.from]!.style.transform = `translate3d(${offset}px, 0, 0)`

		const center = activeRect.left + activeRect.width / 2 + offset

		let closest = current.from
		let distance = Number.POSITIVE_INFINITY

		current.rects.forEach((rect, index) => {
			const next = Math.abs(center - (rect.left + rect.width / 2))

			if (next < distance) {
				distance = next
				closest = index
			}
		})

		current.to = closest

		const gap = current.rects.length > 1 ? current.rects[1]!.left - current.rects[0]!.right : 0

		const step = activeRect.width + gap

		current.items.forEach((item, index) => {
			if (index === current.from) return

			let shift = 0

			if (current.from < closest && index > current.from && index <= closest) {
				shift = -step
			} else if (current.from > closest && index >= closest && index < current.from) {
				shift = step
			}

			item.style.transform = `translate3d(${shift}px, 0, 0)`
		})
	}

	function onPointerUp(event: PointerEvent): void {
		const current = state

		if (!current || current.dropping || event.pointerId !== current.pointerId) {
			return
		}

		if (!current.active) {
			finish(false)
			return
		}

		current.dropping = true

		const active = current.items[current.from]!
		const from = current.rects[current.from]!
		const to = current.rects[current.to]!

		active.removeAttribute('data-dragging')
		active.dataset.dropping = 'true'

		const offset = current.to > current.from ? to.right - from.right : to.left - from.left

		active.style.transform = `translate3d(${offset}px, 0, 0)`

		timer = window.setTimeout(() => finish(true), reducedMotion.matches ? 0 : 220)
	}

	function onPointerCancel(event: PointerEvent): void {
		if (state?.pointerId === event.pointerId) {
			finish(false)
		}
	}

	function onKeyDown(event: KeyboardEvent): void {
		if (event.key !== 'Escape' || !state) return

		event.preventDefault()
		finish(false)
	}

	function onBlur(): void {
		finish(false)
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
		event.preventDefault()
	})

	container.addEventListener('pointerdown', event => {
		if (
			state ||
			event.button !== 0 ||
			!event.isPrimary ||
			!(event.target instanceof Element) ||
			event.target.closest('.desktop-tab-close')
		) {
			return
		}

		const wrapper = event.target.closest<HTMLElement>('.desktop-tab-wrapper')

		if (!wrapper || wrapper.parentElement !== container) return

		const items = getItems()
		const from = items.indexOf(wrapper)

		if (items.length < 2 || from === -1) return

		state = {
			pointerId: event.pointerId,
			items,
			rects: items.map(item => item.getBoundingClientRect()),
			from,
			to: from,
			startX: event.clientX,
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

	const observer = new MutationObserver(() => {
		if (!state) updateShortcuts()
	})

	observer.observe(container, {
		childList: true,
		subtree: true,
		attributes: true,
		attributeFilter: ['hidden'],
	})

	updateShortcuts()
}
