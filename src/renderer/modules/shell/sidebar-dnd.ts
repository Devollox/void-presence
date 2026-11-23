import { Layout, DragStateSidebar } from 'src/types/types'

const STORAGE_KEY = 'sidebar-layout-v1'
const DRAG_THRESHOLD = 4
const DROP_DURATION = 220

function readLayout(): Layout {
	try {
		const value: unknown = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}')

		if (!value || typeof value !== 'object' || Array.isArray(value)) {
			return {}
		}

		const result: Layout = {}

		for (const [key, order] of Object.entries(value)) {
			if (Array.isArray(order) && order.every((id: unknown) => typeof id === 'string')) {
				result[key] = [...new Set(order)]
			}
		}

		return result
	} catch {
		return {}
	}
}

export default function setupSidebarDnd(): void {
	const sidebar = document.querySelector<HTMLElement>('#app-sidebar')
	const viewport = sidebar?.querySelector<HTMLElement>('.sidebar-scroll-viewport')

	if (!sidebar || !viewport || sidebar.dataset.dndInit === 'true') {
		return
	}

	sidebar.dataset.dndInit = 'true'

	const layout = readLayout()
	const containers = new Map<string, HTMLElement>()
	const sources = new Map<HTMLElement, HTMLElement>()
	const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)')

	let state: DragStateSidebar | null = null
	let blockClicksUntil = 0
	let dropTimer: number | undefined

	const getItems = (container: HTMLElement): HTMLElement[] => {
		return Array.from(container.children).filter(
			(child): child is HTMLElement =>
				child instanceof HTMLElement && Boolean(child.dataset.sidebarDndId)
		)
	}

	const saveOrder = (): void => {
		const next: Layout = {}

		for (const [key, container] of containers) {
			next[key] = getItems(container).map(item => item.dataset.sidebarDndId!)
		}

		try {
			localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
		} catch (error) {
			console.error('[sidebar-dnd:save]', error)
		}
	}

	const registerContainer = (key: string, container: HTMLElement): void => {
		containers.set(key, container)

		const items = getItems(container)
		const byId = new Map(items.map(item => [item.dataset.sidebarDndId!, item]))

		for (const id of layout[key] || []) {
			const item = byId.get(id)

			if (!item) continue

			container.appendChild(item)
			byId.delete(id)
		}

		for (const item of byId.values()) {
			container.appendChild(item)
		}
	}

	const registerSource = (item: HTMLElement, source: HTMLElement, id: string): void => {
		item.dataset.sidebarDndId = id
		item.classList.add('sidebar-sort-item')
		source.classList.add('sidebar-sort-handle')
		source.draggable = false
		sources.set(source, item)
	}

	const changelog = viewport.querySelector<HTMLElement>(':scope > .sidebar-group')

	const changelogButton = changelog?.querySelector<HTMLElement>('#sidebar-changelog')

	if (changelog && changelogButton) {
		registerSource(changelog, changelogButton, 'changelog')
	}

	const workspaceList = viewport.querySelector<HTMLElement>('#sidebar-workspace-list')

	const workspace = workspaceList?.closest<HTMLElement>('.sidebar-section')

	const workspaceHeading = workspace?.querySelector<HTMLElement>('.sidebar-section-toggle')

	if (workspace && workspaceHeading) {
		registerSource(workspace, workspaceHeading, 'workspace')
	}

	if (workspaceList) {
		for (const item of workspaceList.querySelectorAll<HTMLElement>(
			':scope > .sidebar-item[data-page]'
		)) {
			registerSource(item, item, `page:${item.dataset.page}`)
		}

		registerContainer('workspace', workspaceList)
	}

	const account = viewport.querySelector<HTMLElement>('#sidebar-account-section')

	const accountHeading = account?.querySelector<HTMLElement>('.sidebar-account-heading')

	if (account && accountHeading) {
		registerSource(account, accountHeading, 'account')
	}

	const accountLinks = account?.querySelector<HTMLElement>('.sidebar-account-links')

	if (accountLinks) {
		for (const link of accountLinks.querySelectorAll<HTMLAnchorElement>(
			':scope > .sidebar-account-link'
		)) {
			const id = link.dataset.accountPath || link.getAttribute('href')

			if (id) {
				registerSource(link, link, `account:${id}`)
			}
		}

		registerContainer('account-links', accountLinks)
	}

	registerContainer('groups', viewport)

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

		for (const item of current.items) {
			item.classList.add('sidebar-sort-reset')
			item.style.removeProperty('transform')
			item.removeAttribute('data-sidebar-dragging')
			item.removeAttribute('data-sidebar-dropping')
		}

		if (commit && current.from !== current.to) {
			const target = current.items[current.to]!

			current.container.insertBefore(
				current.item,
				current.from < current.to ? target.nextSibling : target
			)

			saveOrder()
		}

		current.container.classList.remove('sidebar-sort-container')
		sidebar.classList.remove('is-sorting')
		document.body.classList.remove('sidebar-sort-active')

		if (current.active) {
			blockClicksUntil = Date.now() + 250
		}

		state = null

		void current.container.offsetHeight

		for (const item of current.items) {
			item.classList.remove('sidebar-sort-reset')
		}
	}

	const updateSiblings = (targetIndex: number): void => {
		const current = state

		if (!current) return

		current.to = targetIndex

		const activeRect = current.rects[current.from]!
		const step = activeRect.height + current.gap

		current.items.forEach((item, index) => {
			if (index === current.from) return

			let shift = 0

			if (current.from < targetIndex && index > current.from && index <= targetIndex) {
				shift = -step
			} else if (current.from > targetIndex && index >= targetIndex && index < current.from) {
				shift = step
			}

			item.style.transform = `translate3d(0, ${shift}px, 0)`
		})
	}

	function onPointerMove(event: PointerEvent): void {
		const current = state

		if (!current || current.dropping || event.pointerId !== current.pointerId) {
			return
		}

		const scrollDelta = viewport!.scrollTop - current.scrollTop
		const dy = event.clientY - current.startY + scrollDelta

		if (!current.active) {
			if (Math.abs(dy) < DRAG_THRESHOLD) return

			current.active = true
			current.container.classList.add('sidebar-sort-container')
			current.item.setAttribute('data-sidebar-dragging', 'true')
			sidebar!.classList.add('is-sorting')
			document.body.classList.add('sidebar-sort-active')
			blockClicksUntil = Number.POSITIVE_INFINITY
		}

		event.preventDefault()

		const first = current.rects[0]!
		const last = current.rects[current.rects.length - 1]!
		const active = current.rects[current.from]!

		const minDy = first.top - active.top
		const maxDy = last.bottom - active.bottom
		const clampedDy = Math.max(minDy, Math.min(dy, maxDy))

		current.item.style.transform = `translate3d(0, ${clampedDy}px, 0)`

		const center = active.top + active.height / 2 + clampedDy
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

		if (Number.isFinite(center)) {
			updateSiblings(targetIndex)
		}
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

		current.item.removeAttribute('data-sidebar-dragging')
		current.item.setAttribute('data-sidebar-dropping', 'true')

		const active = current.rects[current.from]!
		const target = current.rects[current.to]!

		const finalDy =
			current.to > current.from ? target.bottom - active.bottom : target.top - active.top

		current.item.style.transform = `translate3d(0, ${finalDy}px, 0)`

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

	sidebar.addEventListener('dragstart', event => {
		if (event.target instanceof Element && event.target.closest('.sidebar-sort-handle')) {
			event.preventDefault()
		}
	})

	sidebar.addEventListener(
		'click',
		event => {
			if (Date.now() >= blockClicksUntil) return

			event.preventDefault()
			event.stopImmediatePropagation()
		},
		true
	)

	sidebar.addEventListener('pointerdown', event => {
		if (state || event.button !== 0 || !event.isPrimary || !(event.target instanceof Element)) {
			return
		}

		const source = event.target.closest<HTMLElement>('.sidebar-sort-handle')

		const item = source ? sources.get(source) : undefined
		const container = item?.parentElement

		if (!item || !container) return

		const items = getItems(container).filter(child => child.getClientRects().length > 0)

		if (items.length < 2) return

		const from = items.indexOf(item)

		if (from === -1) return

		const rects = items.map(child => child.getBoundingClientRect())
		const gaps = rects.slice(1).map((rect, index) => rect.top - rects[index]!.bottom)

		const gap = gaps.length > 0 ? gaps.reduce((sum, value) => sum + value, 0) / gaps.length : 0

		state = {
			pointerId: event.pointerId,
			container,
			item,
			items,
			rects,
			from,
			to: from,
			startY: event.clientY,
			scrollTop: viewport.scrollTop,
			gap,
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
