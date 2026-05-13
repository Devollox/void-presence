export function attachDnD<T>(
	container: HTMLElement,
	items: T[],
	renderFn: () => void,
): void {
	let dragIndex: number | null = null

	const getRow = (target: HTMLElement | null): HTMLElement | null =>
		target?.closest('[data-index]') as HTMLElement | null

	const clearClasses = () => {
		Array.from(container.children).forEach((ch: Element) => {
			ch.classList.remove('dragging', 'drop-target-top', 'drop-target-bottom')
		})
	}

	container.addEventListener('dragstart', (e: DragEvent) => {
		const row = getRow(e.target as HTMLElement)

		const handle = (e.target as HTMLElement).closest('.drag-handle')
		if (!handle || !row || window.getSelection()?.toString()) {
			e.preventDefault()
			return
		}

		dragIndex = Number(row.dataset.index)
		row.classList.add('dragging')
	})

	container.addEventListener('dragend', () => {
		clearClasses()
		dragIndex = null
	})

	container.addEventListener('dragover', (e: DragEvent) => {
		e.preventDefault()
		if (!e.dataTransfer) return
		e.dataTransfer.dropEffect = 'move'

		const row = getRow(e.target as HTMLElement)
		if (!row || dragIndex === null) return

		clearClasses()
		const rect = row.getBoundingClientRect()
		const isTop = e.clientY < rect.top + rect.height / 2

		row.classList.add(isTop ? 'drop-target-top' : 'drop-target-bottom')
	})

	container.addEventListener('drop', (e: DragEvent) => {
		e.preventDefault()
		const row = getRow(e.target as HTMLElement)
		if (!row || dragIndex === null) return

		const targetIndex = Number(row.dataset.index)
		const rect = row.getBoundingClientRect()
		let insertIndex =
			e.clientY >= rect.top + rect.height / 2 ? targetIndex + 1 : targetIndex

		const [moved] = items.splice(dragIndex, 1)

		if (insertIndex > dragIndex) {
			insertIndex -= 1
		}

		items.splice(Math.min(insertIndex, items.length), 0, moved)

		clearClasses()
		renderFn()
	})
}
