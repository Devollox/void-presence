import { StoredConfig } from '../../../types/types'

export function openUploadConfirm(cfg: StoredConfig, onConfirm: () => void) {
	const overlay = document.getElementById(
		'upload-confirm-overlay',
	) as HTMLElement | null
	if (!overlay) return

	const closeBtn = document.getElementById(
		'upload-confirm-close',
	) as HTMLButtonElement | null
	const okBtn = document.getElementById(
		'upload-confirm-ok',
	) as HTMLButtonElement | null
	const info = document.getElementById(
		'upload-confirm-profile-info',
	) as HTMLElement | null

	if (!closeBtn || !okBtn || !info) return

	info.textContent = cfg.name || 'Unnamed profile'
	overlay.dataset.open = 'true'

	const okHandler = () => {
		close()
		onConfirm()
	}

	const overlayHandler = (e: MouseEvent) => {
		if (e.target === overlay) {
			close()
		}
	}

	const close = () => {
		overlay.dataset.open = 'false'
		okBtn.removeEventListener('click', okHandler)
		closeBtn.removeEventListener('click', close)
		overlay.removeEventListener('click', overlayHandler)
	}

	okBtn.addEventListener('click', okHandler)
	closeBtn.addEventListener('click', close)
	overlay.addEventListener('click', overlayHandler)
}
