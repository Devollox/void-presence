export function attachSearchToList(inputId: string, listId: string) {
	const searchInput = document.getElementById(inputId) as HTMLInputElement | null
	const list = document.getElementById(listId) as HTMLElement | null
	if (!searchInput || !list) return

	const handler = () => {
		const query = searchInput.value.trim().toLowerCase()
		const items = list.querySelectorAll<HTMLElement>('[data-config-id]')
		items.forEach(item => {
			const name = (item.getAttribute('data-name') || '').toLowerCase()
			const author = (item.getAttribute('data-author') || '').toLowerCase()
			const match = !query || name.includes(query) || author.includes(query)
			item.style.display = match ? '' : 'none'
		})
	}

	searchInput.addEventListener('input', handler)
}

export function filterListByExistingInput(input: HTMLInputElement, list: HTMLElement) {
	const q = input.value.trim().toLowerCase()
	if (!q) return
	const items = list.querySelectorAll<HTMLElement>('[data-config-id]')
	items.forEach(item => {
		const name = (item.getAttribute('data-name') || '').toLowerCase()
		const author = (item.getAttribute('data-author') || '').toLowerCase()
		const match = !q || name.includes(q) || author.includes(q)
		item.style.display = match ? '' : 'none'
	})
}
