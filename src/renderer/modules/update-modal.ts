import { UpdateInfo } from 'src/types/types'

const updateOverlay = document.getElementById(
	'update-overlay',
) as HTMLElement | null
const updateInstallBtn = document.getElementById(
	'update-install-btn',
) as HTMLButtonElement | null
const updateLaterBtn = document.getElementById(
	'update-later-btn',
) as HTMLButtonElement | null
const updateCloseBtn = document.getElementById(
	'update-close-btn',
) as HTMLButtonElement | null
const updateCurrentEl = document.getElementById(
	'update-current-version',
) as HTMLElement | null
const updateLatestEl = document.getElementById(
	'update-latest-version',
) as HTMLElement | null

let pendingUpdate: UpdateInfo | null = null

export function showUpdateModal(info: UpdateInfo) {
	pendingUpdate = info

	if (updateCurrentEl) updateCurrentEl.textContent = info.currentVersion
	if (updateLatestEl) updateLatestEl.textContent = info.latestTag
	if (updateOverlay) updateOverlay.setAttribute('data-open', 'true')
}

function hideUpdateModal() {
	if (updateOverlay) updateOverlay.setAttribute('data-open', 'false')
}

if (window.electronAPI?.onUpdateAvailable) {
	window.electronAPI.onUpdateAvailable((info: UpdateInfo) => {
		showUpdateModal(info)
	})
}

updateInstallBtn?.addEventListener('click', () => {
	if (!pendingUpdate) return
	window.electronAPI?.installUpdate?.(pendingUpdate)
	hideUpdateModal()
})

updateLaterBtn?.addEventListener('click', () => {
	hideUpdateModal()
})

updateCloseBtn?.addEventListener('click', () => {
	hideUpdateModal()
})
