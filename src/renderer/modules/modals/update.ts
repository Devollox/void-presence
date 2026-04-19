import { marked } from 'marked'

interface UpdateInfo {
	latestTag: string
	downloadUrl: string | null
	currentVersion: string
	changelogMd: string
}

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

function bindUpdateOverlayControls() {
	const overlay = document.getElementById(
		'update-overlay',
	) as HTMLElement | null
	if (!overlay) return

	const closeBtn = document.getElementById('update-close-btn')
	const installBtn = document.getElementById('update-install-btn')

	if (closeBtn) {
		closeBtn.addEventListener('click', () => {
			overlay.dataset.open = 'false'
		})
	}

	if (installBtn) {
		installBtn.addEventListener('click', () => {
			if (
				window.electronAPI &&
				typeof window.electronAPI.installUpdate === 'function'
			) {
				const latestTag = (
					document.getElementById('update-latest-version')?.textContent || ''
				).trim()
				const currentVersion = (
					document.getElementById('update-current-version')?.textContent || ''
				).trim()
				window.electronAPI.installUpdate?.({
					latestTag,
					currentVersion,
					downloadUrl: null,
					changelogMd: '',
				})
			}
		})
	}
}

export function initUpdateOverlay() {
	bindUpdateOverlayControls()

	if (
		window.electronAPI &&
		typeof window.electronAPI.onUpdateAvailable === 'function'
	) {
		window.electronAPI.onUpdateAvailable(info => {
			void openUpdateOverlay(info)
		})
	}
}
