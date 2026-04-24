import { FullState } from '../../../types/types'
import { loadCurrentState } from '../core/state'
import { appendLog } from '../shell/views'

export function setupCloudUpload(): void {
	const uploadBtn = document.getElementById(
		'cloud-upload-btn',
	) as HTMLButtonElement | null
	if (!uploadBtn) return

	function saveAuthorToLocalStorage(): void {
		const authorInput = document.getElementById(
			'config-author-input',
		) as HTMLInputElement | null
		if (authorInput) localStorage.setItem('authorId', authorInput.value)
	}

	function loadInputsFromLocalStorage(): void {
		const nameInput = document.getElementById(
			'config-name-input-current',
		) as HTMLInputElement | null
		const authorInput = document.getElementById(
			'config-author-input',
		) as HTMLInputElement | null
		const savedAuthor = localStorage.getItem('authorId') || ''
		if (nameInput) nameInput.value = ''
		if (authorInput) authorInput.value = savedAuthor
	}

	const authorInput = document.getElementById(
		'config-author-input',
	) as HTMLInputElement | null

	if (authorInput) {
		authorInput.addEventListener('input', saveAuthorToLocalStorage)
	}

	uploadBtn.addEventListener('click', async e => {
		e.preventDefault()
		const nameInput = document.getElementById(
			'config-name-input-current',
		) as HTMLInputElement | null
		const authorInput = document.getElementById(
			'config-author-input',
		) as HTMLInputElement | null

		if (!nameInput?.value.trim() || !authorInput?.value.trim()) {
			appendLog({
				message:
					'Enter config name and author ID(get from voidpresence.site/profile) first',
				level: 'error',
			})
			return
		}

		const authorId = authorInput.value.trim()

		try {
			uploadBtn.disabled = true
			uploadBtn.innerHTML = `<svg
										xmlns="http://www.w3.org/2000/svg"
										width="12"
										height="12"
										viewBox="0 0 24 24"
										fill="none"
										stroke="currentColor"
										stroke-width="2"
										stroke-linecap="round"
										stroke-linejoin="round"
										class="rpc-button-icon-svg"
									>
										<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
										<polyline points="17 8 12 3 7 8"></polyline>
										<line x1="12" y1="3" x2="12" y2="15"></line>
									</svg>Uploading..`

			const state = loadCurrentState()

			const safeState = JSON.parse(
				JSON.stringify(state, (key, value) =>
					key === 'clientId' ? undefined : value,
				),
			) as FullState

			const config = {
				title: nameInput.value.trim(),
				authorId,
				authorName: '',
				description: `Uploaded ${new Date().toLocaleDateString()}`,
				configData: safeState,
			}

			if (!window.electronAPI?.uploadConfig) {
				throw new Error('Cloud upload is not available')
			}

			await window.electronAPI.uploadConfig(config)

			appendLog({
				message: `Config "${config.title}" uploaded!`,
				level: 'success',
			})

			nameInput.value = ''
			localStorage.setItem('authorId', authorId)
		} catch (err) {
			appendLog({
				message: `Upload failed: ${err?.message ?? String(err)}`,
				level: 'error',
			})
		} finally {
			uploadBtn.disabled = false
			uploadBtn.innerHTML = `<svg
										xmlns="http://www.w3.org/2000/svg"
										width="12"
										height="12"
										viewBox="0 0 24 24"
										fill="none"
										stroke="currentColor"
										stroke-width="2"
										stroke-linecap="round"
										stroke-linejoin="round"
										class="rpc-button-icon-svg"
									>
										<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
										<polyline points="17 8 12 3 7 8"></polyline>
										<line x1="12" y1="3" x2="12" y2="15"></line>
									</svg>
									Upload Current`
		}
	})

	loadInputsFromLocalStorage()
}
