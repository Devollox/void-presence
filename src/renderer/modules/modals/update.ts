import { marked } from 'marked'
import type { UpdateInfo } from 'src/types/types'

let pendingUpdate: UpdateInfo | null = null

async function renderMarkdown(md: string): Promise<string> {
	marked.setOptions({ breaks: true })
	const result = marked.parse(md)
	if (typeof result === 'string') return result
	return await result
}

function setText(id: string, value: string) {
	const el = document.getElementById(id)
	if (!el) return
	el.textContent = value
}

function setHtml(id: string, html: string) {
	const el = document.getElementById(id)
	if (!el) return
	el.innerHTML = html
}

function setDataAttr(id: string, attr: string, value: string) {
	const el = document.getElementById(id) as HTMLElement | null
	if (!el) return
	el.dataset[attr] = value
}

async function openUpdateOverlay(info: UpdateInfo) {
	const overlay = document.getElementById(
		'update-overlay',
	) as HTMLElement | null
	if (!overlay) return

	pendingUpdate = info

	const titleText =
		info.latestTag && info.currentVersion
			? `New version ${info.latestTag} available`
			: 'New version available'

	setText('update-title', titleText)
	setText('update-current-version', info.currentVersion || '–')
	setText('update-latest-version', info.latestTag || '–')

	const hasChangelog = !!info.changelogMd && info.changelogMd.trim().length > 0

	if (hasChangelog) {
		setDataAttr('update-changelog-block', 'visible', 'true')
		const html = await renderMarkdown(info.changelogMd.trim())
		setHtml('update-changelog', html)
	} else {
		setDataAttr('update-changelog-block', 'visible', 'false')
		setText('update-changelog', '–')
	}

	overlay.dataset.open = 'true'
}

function hideUpdateOverlay() {
	const overlay = document.getElementById(
		'update-overlay',
	) as HTMLElement | null
	if (!overlay) return
	overlay.dataset.open = 'false'
}

function bindUpdateOverlayControls() {
	const overlay = document.getElementById(
		'update-overlay',
	) as HTMLElement | null
	if (!overlay) return

	const closeBtn = document.getElementById(
		'update-close-btn',
	) as HTMLButtonElement | null
	const laterBtn = document.getElementById(
		'update-later-btn',
	) as HTMLButtonElement | null
	const installBtn = document.getElementById(
		'update-install-btn',
	) as HTMLButtonElement | null

	if (closeBtn) {
		closeBtn.addEventListener('click', () => {
			hideUpdateOverlay()
		})
	}

	if (laterBtn) {
		laterBtn.addEventListener('click', () => {
			hideUpdateOverlay()
		})
	}

	if (installBtn) {
		installBtn.addEventListener('click', () => {
			if (
				!window.electronAPI ||
				typeof window.electronAPI.installUpdate !== 'function'
			) {
				return
			}
			if (!pendingUpdate || !pendingUpdate.downloadUrl) {
				return
			}
			window.electronAPI.installUpdate(pendingUpdate)
			hideUpdateOverlay()
		})
	}
}

export function initUpdateOverlay() {
	bindUpdateOverlayControls()

	if (
		window.electronAPI &&
		typeof window.electronAPI.onUpdateAvailable === 'function'
	) {
		window.electronAPI.onUpdateAvailable((info: UpdateInfo) => {
			void openUpdateOverlay(info)
		})
	}
}
