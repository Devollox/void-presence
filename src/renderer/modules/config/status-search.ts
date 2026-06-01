export function attachStatusSearch(inputId: string, listId: string) {
	const searchInput = document.getElementById(
		inputId,
	) as HTMLInputElement | null
	const list = document.getElementById(listId) as HTMLElement | null
	if (!searchInput || !list) return

	const handler = () => {
		const query = searchInput.value.trim().toLowerCase()
		const items = list.querySelectorAll<HTMLElement>('[data-status-id]')
		items.forEach(item => {
			const name = (item.getAttribute('data-name') || '').toLowerCase()
			const match = !query || name.includes(query)
			item.style.display = match ? '' : 'none'
		})
	}

	searchInput.addEventListener('input', handler)
}

export function filterStatusListByExistingInput(
	input: HTMLInputElement,
	list: HTMLElement,
) {
	const q = input.value.trim().toLowerCase()
	const items = list.querySelectorAll<HTMLElement>('[data-status-id]')
	items.forEach(item => {
		const name = (item.getAttribute('data-name') || '').toLowerCase()
		const match = !q || name.includes(q)
		item.style.display = match ? '' : 'none'
	})
}
