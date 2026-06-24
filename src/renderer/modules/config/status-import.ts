import { CustomStatusItem, StoredStatusProfile } from '../../../types/types'
import { renderStatusProfiles } from './status-render'
import { getStatusProfiles, setStatusProfiles } from './status-storage'

export function setupStatusImportOverlay(): void {
	const overlay = document.getElementById('status-import-overlay') as HTMLElement | null
	const closeBtn = document.getElementById('status-import-close-btn') as HTMLButtonElement | null
	const fileInput = document.getElementById('status-import-file-input') as HTMLInputElement | null
	if (!overlay || !closeBtn || !fileInput) return

	function close(): void {
		overlay.dataset.open = 'false'
		fileInput.value = ''
	}

	closeBtn.addEventListener('click', e => {
		e.preventDefault()
		close()
	})

	overlay.addEventListener('click', e => {
		if (e.target === overlay) {
			close()
		}
	})

	document.addEventListener('keydown', e => {
		if (e.key === 'Escape' && overlay.dataset.open === 'true') {
			e.preventDefault()
			close()
		}
	})

	fileInput.addEventListener('change', async () => {
		if (!fileInput.files || !fileInput.files[0]) return
		const file = fileInput.files[0]
		try {
			const text = await file.text()
			const parsed = JSON.parse(text)
			let imported: StoredStatusProfile[] = []

			if (Array.isArray(parsed)) {
				if (parsed.length && typeof parsed[0]?.name === 'string') {
					imported = parsed as StoredStatusProfile[]
				} else {
					const items = parsed as CustomStatusItem[]
					imported = [
						{
							name: file.name.replace(/\.json$/i, ''),
							items,
							createdAt: new Date().toISOString(),
						},
					]
				}
			} else if (parsed && typeof parsed === 'object') {
				if (Array.isArray((parsed as any).items)) {
					imported = [
						{
							name:
								(parsed as any).name ||
								file.name.replace(/\.json$/i, '') ||
								'Imported status profile',
							items: (parsed as any).items as CustomStatusItem[],
							createdAt: new Date().toISOString(),
						},
					]
				}
			}

			if (!imported.length) {
				close()
				return
			}

			const current = getStatusProfiles()
			const merged = current.concat(imported)
			setStatusProfiles(merged)
			renderStatusProfiles()
		} catch {
			close()
			return
		}
		close()
	})
}
