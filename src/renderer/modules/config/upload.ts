export function setupCloudUpload(): void {
	function saveAuthorToLocalStorage(): void {
		const authorInput = document.getElementById('config-author-input') as HTMLInputElement | null
		if (authorInput) localStorage.setItem('authorId', authorInput.value)
	}

	function loadInputsFromLocalStorage(): void {
		const nameInput = document.getElementById(
			'config-name-input-current'
		) as HTMLInputElement | null
		const authorInput = document.getElementById('config-author-input') as HTMLInputElement | null
		const authorLabel = document.getElementById('config-author-label') as HTMLElement | null

		const savedAuthorId = localStorage.getItem('authorId') || ''
		const savedAuthorName = localStorage.getItem('authorName') || ''
		const savedAuthorProvider = localStorage.getItem('authorProvider') || ''

		if (nameInput) nameInput.value = ''

		if (authorInput) authorInput.value = savedAuthorId

		if (authorLabel) {
			if (savedAuthorName && savedAuthorProvider) {
				authorLabel.textContent = `${savedAuthorName} (${savedAuthorProvider})`
			} else if (savedAuthorName) {
				authorLabel.textContent = savedAuthorName
			} else if (savedAuthorProvider) {
				authorLabel.textContent = savedAuthorProvider
			} else if (savedAuthorId) {
				authorLabel.textContent = savedAuthorId
			} else {
				authorLabel.textContent = 'None'
			}
		}
	}

	const authorInput = document.getElementById('config-author-input') as HTMLInputElement | null

	if (authorInput) {
		authorInput.addEventListener('input', saveAuthorToLocalStorage)
	}

	loadInputsFromLocalStorage()
}
