import { StoredConfig, StoredStatusProfile } from '../../../types/types'
import { closeOverlay, openOverlay } from '../shell/overlay-utils'

export function openUploadConfirm(cfg: StoredConfig, onConfirm: () => void): void {
	const overlay = document.getElementById('upload-confirm-overlay') as HTMLElement | null
	if (!overlay) return

	const closeBtn = document.getElementById('upload-confirm-close') as HTMLButtonElement | null
	const okBtn = document.getElementById('upload-confirm-ok') as HTMLButtonElement | null
	const info = document.getElementById('upload-confirm-profile-info') as HTMLElement | null
	const backdrop = document.getElementById('upload-confirm-backdrop') as HTMLElement | null

	if (!closeBtn || !okBtn || !info) return

	info.textContent = cfg.name || 'Unnamed profile'

	const close = (): void => {
		closeOverlay(overlay)
		okBtn.removeEventListener('click', okHandler)
		closeBtn.removeEventListener('click', close)
		backdrop?.removeEventListener('click', close)
		document.removeEventListener('keydown', escHandler)
	}

	const okHandler = (): void => {
		close()
		onConfirm()
	}

	const escHandler = (e: KeyboardEvent): void => {
		if (e.key === 'Escape' && !overlay.hidden) close()
	}

	okBtn.addEventListener('click', okHandler)
	closeBtn.addEventListener('click', close)
	backdrop?.addEventListener('click', close)
	document.addEventListener('keydown', escHandler)

	openOverlay(overlay)
}

export function openStatusUploadConfirm(
	profile: StoredStatusProfile,
	onConfirm: () => void
): void {
	const overlay = document.getElementById('status-upload-confirm-overlay') as HTMLElement | null
	if (!overlay) return

	const closeBtn = document.getElementById(
		'status-upload-confirm-close'
	) as HTMLButtonElement | null
	const okBtn = document.getElementById('status-upload-confirm-ok') as HTMLButtonElement | null
	const info = document.getElementById(
		'status-upload-confirm-profile-info'
	) as HTMLElement | null
	const backdrop = document.getElementById(
		'status-upload-confirm-backdrop'
	) as HTMLElement | null

	if (!closeBtn || !okBtn || !info) return

	info.textContent = profile.name || 'Unnamed status profile'

	const close = (): void => {
		closeOverlay(overlay)
		okBtn.removeEventListener('click', okHandler)
		closeBtn.removeEventListener('click', close)
		backdrop?.removeEventListener('click', close)
		document.removeEventListener('keydown', escHandler)
	}

	const okHandler = (): void => {
		close()
		onConfirm()
	}

	const escHandler = (e: KeyboardEvent): void => {
		if (e.key === 'Escape' && !overlay.hidden) close()
	}

	okBtn.addEventListener('click', okHandler)
	closeBtn.addEventListener('click', close)
	backdrop?.addEventListener('click', close)
	document.addEventListener('keydown', escHandler)

	openOverlay(overlay)
}
