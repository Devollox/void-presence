export function attachDnD<T>(
	container: HTMLElement,
	items: T[],
	renderFn: () => void,
): void {
	let dragIndex: number | null = null

	container.addEventListener('dragstart', e => {
		const target = e.target as HTMLElement | null
		if (!target) return

		const row = target.closest<HTMLElement>('[data-index]')
		if (!row) return

		if (window.getSelection()?.toString()) {
			e.preventDefault()
			return
		}

		dragIndex = Number(row.dataset.index)
		row.classList.add('dragging')
	})

	container.addEventListener('dragend', e => {
		const target = e.target as HTMLElement | null
		const row = target?.closest<HTMLElement>('[data-index]')
		if (row) row.classList.remove('dragging')
		Array.from(container.children).forEach(ch => {
			;(ch as HTMLElement).classList.remove(
				'drop-target-top',
				'drop-target-bottom',
			)
		})
		dragIndex = null
	})

	container.addEventListener('dragover', e => {
		e.preventDefault()
		const target = e.target as HTMLElement | null
		const row = target?.closest<HTMLElement>('[data-index]')
		if (!row || dragIndex === null) return

		Array.from(container.children).forEach(ch => {
			;(ch as HTMLElement).classList.remove(
				'drop-target-top',
				'drop-target-bottom',
			)
		})

		const rect = row.getBoundingClientRect()
		const offset = e.clientY - rect.top
		if (offset < rect.height / 2) {
			row.classList.add('drop-target-top')
		} else {
			row.classList.add('drop-target-bottom')
		}
	})

	container.addEventListener('drop', e => {
		e.preventDefault()
		const target = e.target as HTMLElement | null
		const row = target?.closest<HTMLElement>('[data-index]')
		if (!row || dragIndex === null) return

		const targetIndex = Number(row.dataset.index)
		const rect = row.getBoundingClientRect()
		const offset = e.clientY - rect.top
		let insertIndex = targetIndex
		if (offset >= rect.height / 2) insertIndex = targetIndex + 1

		const [moved] = items.splice(dragIndex, 1)
		if (insertIndex > items.length) insertIndex = items.length
		items.splice(insertIndex, 0, moved)
		renderFn()
	})
}
