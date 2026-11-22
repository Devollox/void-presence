const TABS_ORDER_STORAGE_KEY = 'app.tabs.order'

export default function setupTabsDnd(onReorder?: (orderedIds: string[]) => void): void {
	const container = document.querySelector<HTMLElement>('.tabs-scroll-container')
	if (!container || container.dataset.dndInit === 'true') return
	container.dataset.dndInit = 'true'

	const updateShortcuts = (): void => {
		const tabs = Array.from(container.querySelectorAll<HTMLElement>('.desktop-tab'))
		tabs.forEach((tab, index) => {
			if (index < 9) {
				tab.setAttribute('data-shortcut', `Ctrl+${index + 1}`)
			} else {
				tab.removeAttribute('data-shortcut')
			}
		})
	}

	const restoreOrder = (): void => {
		try {
			const raw = localStorage.getItem(TABS_ORDER_STORAGE_KEY)
			if (!raw) return
			const savedIds: unknown = JSON.parse(raw)
			if (!Array.isArray(savedIds)) return

			const tabsMap = new Map<string, HTMLElement>()
			container.querySelectorAll<HTMLElement>('.desktop-tab').forEach(tab => {
				if (tab.id) tabsMap.set(tab.id, tab)
			})

			savedIds.forEach(id => {
				if (typeof id === 'string') {
					const tab = tabsMap.get(id)
					if (tab) {
						container.appendChild(tab)
						tabsMap.delete(id)
					}
				}
			})

			tabsMap.forEach(tab => container.appendChild(tab))
		} catch {
			localStorage.removeItem(TABS_ORDER_STORAGE_KEY)
		}
	}

	const saveOrder = (): string[] => {
		const ids = Array.from(container.querySelectorAll<HTMLElement>('.desktop-tab'))
			.map(el => el.id)
			.filter(Boolean)

		localStorage.setItem(TABS_ORDER_STORAGE_KEY, JSON.stringify(ids))
		return ids
	}

	restoreOrder()
	updateShortcuts()

	const DRAG_THRESHOLD = 4

	let tabs: HTMLElement[] = []
	let initialRects: DOMRect[] = []
	let draggingIndex = -1
	let targetIndex = -1
	let startX = 0
	let stepWidth = 0
	let isDragging = false

	const updateSiblingsShift = (newTargetIndex: number): void => {
		if (newTargetIndex === targetIndex) return
		targetIndex = newTargetIndex

		tabs.forEach((tab, i) => {
			if (i === draggingIndex) return

			let shift = 0
			if (draggingIndex < targetIndex && i > draggingIndex && i <= targetIndex) {
				shift = -stepWidth
			} else if (draggingIndex > targetIndex && i >= targetIndex && i < draggingIndex) {
				shift = stepWidth
			}

			tab.style.transform = shift !== 0 ? `translate3d(${shift}px, 0, 0)` : ''
		})
	}

	const onPointerMove = (e: PointerEvent): void => {
		if (draggingIndex === -1) return

		const dx = e.clientX - startX

		if (!isDragging) {
			if (Math.abs(dx) < DRAG_THRESHOLD) return
			isDragging = true
			tabs[draggingIndex].setAttribute('data-dragging', 'true')
		}

		const activeTab = tabs[draggingIndex]
		const firstRect = initialRects[0]
		const lastRect = initialRects[initialRects.length - 1]
		const currentRect = initialRects[draggingIndex]

		const minDx = firstRect.left - currentRect.left
		const maxDx = lastRect.right - currentRect.right
		const clampedDx = Math.max(minDx, Math.min(dx, maxDx))

		activeTab.style.transform = `translate3d(${clampedDx}px, 0, 0)`

		const draggedCenter = currentRect.left + currentRect.width / 2 + clampedDx
		let closestIndex = draggingIndex
		let minDistance = Infinity

		initialRects.forEach((rect, i) => {
			const center = rect.left + rect.width / 2
			const distance = Math.abs(draggedCenter - center)
			if (distance < minDistance) {
				minDistance = distance
				closestIndex = i
			}
		})

		updateSiblingsShift(closestIndex)
	}

	const onPointerUp = (): void => {
		window.removeEventListener('pointermove', onPointerMove)
		window.removeEventListener('pointerup', onPointerUp)
		window.removeEventListener('pointercancel', onPointerUp)

		if (draggingIndex === -1) return

		const activeTab = tabs[draggingIndex]
		const fromIdx = draggingIndex
		const toIdx = targetIndex

		draggingIndex = -1

		if (!isDragging) {
			activeTab.removeAttribute('data-dragging')
			return
		}

		isDragging = false

		activeTab.removeAttribute('data-dragging')
		activeTab.setAttribute('data-dropping', 'true')

		const finalDx = (toIdx - fromIdx) * stepWidth
		activeTab.style.transform = `translate3d(${finalDx}px, 0, 0)`

		window.setTimeout(() => {
			tabs.forEach(tab => {
				tab.style.transition = 'none'
				tab.style.transform = ''
				tab.removeAttribute('data-dragging')
				tab.removeAttribute('data-dropping')
			})

			if (fromIdx !== toIdx) {
				if (fromIdx < toIdx) {
					container.insertBefore(activeTab, tabs[toIdx].nextSibling)
				} else {
					container.insertBefore(activeTab, tabs[toIdx])
				}
			}

			requestAnimationFrame(() => {
				tabs.forEach(tab => {
					tab.style.transition = ''
				})
			})

			const ids = saveOrder()
			updateShortcuts()
			if (onReorder) onReorder(ids)
		}, 255)
	}

	container.addEventListener('pointerdown', (e: PointerEvent) => {
		if (e.button !== 0) return
		const target = e.target as HTMLElement | null
		if (target?.closest('.desktop-tab-close')) return

		const tab = target?.closest<HTMLElement>('.desktop-tab')
		if (!tab) return

		tabs = Array.from(container.querySelectorAll<HTMLElement>('.desktop-tab'))
		if (tabs.length < 2) return

		initialRects = tabs.map(t => t.getBoundingClientRect())
		draggingIndex = tabs.indexOf(tab)
		targetIndex = draggingIndex
		startX = e.clientX
		isDragging = false

		stepWidth =
			initialRects.length > 1 ? initialRects[1].left - initialRects[0].left : initialRects[0].width

		window.addEventListener('pointermove', onPointerMove)
		window.addEventListener('pointerup', onPointerUp)
		window.addEventListener('pointercancel', onPointerUp)
	})
}
