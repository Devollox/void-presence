import { loadCurrentState } from './state'
import { FullState } from './types'
import { appendLog } from './views'

export function setupCloudUpload(): void {
	const uploadBtn = document.getElementById(
		'cloud-upload-btn'
	) as HTMLButtonElement | null
	if (!uploadBtn) return

	function saveAuthorToLocalStorage(): void {
		const authorInput = document.getElementById(
			'config-author-input'
		) as HTMLInputElement | null
		if (authorInput) localStorage.setItem('configAuthor', authorInput.value)
	}

	function loadInputsFromLocalStorage(): void {
		const nameInput = document.getElementById(
			'config-name-input'
		) as HTMLInputElement | null
		const authorInput = document.getElementById(
			'config-author-input'
		) as HTMLInputElement | null
		const savedAuthor = localStorage.getItem('configAuthor') || ''
		if (nameInput) nameInput.value = ''
		if (authorInput) authorInput.value = savedAuthor
	}

	const authorInput = document.getElementById(
		'config-author-input'
	) as HTMLInputElement | null

	if (authorInput) {
		authorInput.addEventListener('input', saveAuthorToLocalStorage)
	}

	uploadBtn.addEventListener('click', async e => {
		e.preventDefault()
		const nameInput = document.getElementById(
			'config-name-input'
		) as HTMLInputElement | null
		const authorInput = document.getElementById(
			'config-author-input'
		) as HTMLInputElement | null

		if (!nameInput?.value.trim() || !authorInput?.value.trim()) {
			appendLog({
				message: 'Enter config name and author ID first',
				level: 'error',
			})
			return
		}

		const authorId = authorInput.value.trim()

		try {
			uploadBtn.disabled = true
			uploadBtn.innerHTML =
				'<div class="rpc-button-icon">☁️</div><span>Uploading...</span>'

			const state = loadCurrentState()

			const safeState = JSON.parse(
				JSON.stringify(state, (key, value) =>
					key === 'clientId' ? undefined : value
				)
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
			localStorage.setItem('configAuthor', authorId)
		} catch (err: any) {
			appendLog({
				message: `Upload failed: ${err?.message ?? String(err)}`,
				level: 'error',
			})
		} finally {
			uploadBtn.disabled = false
			uploadBtn.innerHTML =
				'<div class="rpc-button-icon">☁️</div><span>Upload Current</span>'
		}
	})

	loadInputsFromLocalStorage()
}
