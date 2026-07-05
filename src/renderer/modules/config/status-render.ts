import { t } from 'i18next'
import {
	CustomStatusItem,
	FullState,
	StatusCycleEntry,
	StoredStatusProfile,
	VoidPresenceCtx,
} from '../../../types/types'
import { applyStateToUIAndLists, loadCurrentState } from '../core/state'
import { appendLog, setActiveView } from '../shell/views'
import { downloadJson, pushLiveStateFromCtx } from './live'
import { openStatusDetails } from './status-details'
import { filterStatusListByExistingInput } from './status-search'
import { deepCloneStatusItems, getStatusProfiles, setStatusProfiles } from './status-storage'
import { setupToasts } from './toasts'
import { openStatusUploadConfirm } from './upload-сonfirm'

function createStatusCard(
	profile: StoredStatusProfile,
	list: HTMLElement,
	nameInput: HTMLInputElement,
	showSavedToast: () => void
): void {
	const items: CustomStatusItem[] = Array.isArray(profile.items) ? profile.items : []

	const preview = items.length > 0 ? `${items[0].text || ''}`.slice(0, 40) || '...' : 'Empty'

	const card = document.createElement('div')
	card.className = 'config-activity-card'
	card.setAttribute('data-status-id', profile.createdAt || String(Date.now()))
	card.setAttribute('data-name', (profile.name || '').toLowerCase())

	const body = document.createElement('div')
	body.className = 'config-activity-body'

	const detailsWrap = document.createElement('div')
	detailsWrap.className = 'config-activity-details'

	const title = document.createElement('div')
	title.className = 'config-activity-title'
	title.textContent = profile.name || 'Unnamed status profile'

	const line1 = document.createElement('div')
	line1.className = 'config-activity-line'
	line1.textContent = preview

	const line2 = document.createElement('div')
	line2.className = 'config-activity-line'
	line2.textContent = `${items.length} statuses`

	const footer = document.createElement('div')
	footer.className = 'config-activity-footer'

	detailsWrap.appendChild(title)
	detailsWrap.appendChild(line1)
	detailsWrap.appendChild(line2)
	detailsWrap.appendChild(footer)
	body.appendChild(detailsWrap)

	card.appendChild(body)

	const actions = document.createElement('div')
	actions.className = 'config-activity-actions'

	const loadBtn = document.createElement('button')
	loadBtn.className = 'config-activity-btn'
	loadBtn.textContent = t('load')

	const uploadBtn = document.createElement('button')
	uploadBtn.className = 'config-activity-btn'
	uploadBtn.textContent = t('upload')

	const detailsBtn = document.createElement('button')
	detailsBtn.className = 'config-activity-btn'
	detailsBtn.textContent = t('details')

	const exportBtn = document.createElement('button')
	exportBtn.className = 'config-activity-btn'
	exportBtn.textContent = t('export')

	const delBtn = document.createElement('button')
	delBtn.className = 'config-activity-btn danger'
	delBtn.textContent = t('deleteBtn')

	loadBtn.addEventListener('click', async e => {
		e.preventDefault()

		const ctx = window.__voidPresenceCtx as VoidPresenceCtx | undefined
		if (!ctx) return

		const safeItems = deepCloneStatusItems(items)

		const statusCycles: StatusCycleEntry[] = safeItems.map(it => ({
			text: it.text || '',
			emoji: typeof it.emoji === 'string' && it.emoji.trim().length > 0 ? it.emoji.trim() : null,
		}))

		try {
			const currentState = loadCurrentState()

			const nextState: FullState = {
				...currentState,
				statusCycles,
			}

			await applyStateToUIAndLists(nextState, ctx)
			ctx.statusCycles = statusCycles

			await pushLiveStateFromCtx(ctx)

			const profiles = getStatusProfiles()
			const idx = profiles.findIndex(p => p.createdAt === profile.createdAt)
			if (idx !== -1) {
				const [picked] = profiles.splice(idx, 1)
				profiles.unshift(picked)
				setStatusProfiles(profiles)
			}

			nameInput.value = ''
			setActiveView('status')

			const { showConfigSavedToast } = setupToasts()
			showConfigSavedToast()
		} catch (err: any) {}

		const { showConfigLoadedToast } = setupToasts()
		showConfigLoadedToast()
	})

	uploadBtn.addEventListener('click', e => {
		e.preventDefault()

		openStatusUploadConfirm(profile, async () => {
			const authorInput = document.getElementById('config-author-input') as HTMLInputElement | null
			if (!authorInput?.value.trim()) {
				appendLog({
					message: t('logs.enterAuthorIdFirst'),
					level: 'error',
				})
				return
			}

			if (!window.electronAPI?.uploadStatusConfig) {
				appendLog({
					message: t('logs.cloudUploadNotAvailable'),
					level: 'error',
				})
				return
			}

			const authorId = authorInput.value.trim()

			try {
				uploadBtn.disabled = true
				uploadBtn.textContent = 'uploading...'

				const safeItems = deepCloneStatusItems(items)

				const statusCycles: StatusCycleEntry[] = safeItems.map(it => ({
					text: it.text || '',
					emoji:
						typeof it.emoji === 'string' && it.emoji.trim().length > 0 ? it.emoji.trim() : null,
				}))

				const storedAuthorName = localStorage.getItem('authorName') || ''
				const storedAuthorAvatar = localStorage.getItem('authorAvatar') || ''

				const payload = {
					title: profile.name || `void-presence-status-${new Date().toISOString().slice(0, 10)}`,
					authorId,
					authorName: storedAuthorName,
					authorAvatar: storedAuthorAvatar,
					description: `Uploaded ${new Date().toLocaleDateString()}`,
					configData: { statusCycles },
				}

				await window.electronAPI.uploadStatusConfig(payload)

				appendLog({
					message: t('logs.statusConfigUploaded').replace('{title}', payload.title),
					level: 'success',
				})

				const { showConfigUpLoadedToast } = setupToasts()
				showConfigUpLoadedToast()
			} catch (err: any) {
				appendLog({
					message: t('logs.uploadFailed').replace('{error}', err?.message ?? String(err)),
					level: 'error',
				})
			} finally {
				uploadBtn.disabled = false
				uploadBtn.textContent = t('upload')
			}
		})
	})

	detailsBtn.addEventListener('click', e => {
		e.preventDefault()
		openStatusDetails(profile)
	})

	exportBtn.addEventListener('click', e => {
		e.preventDefault()
		const data = deepCloneStatusItems(items)
		const name = profile.name || `void-presence-status-${new Date().toISOString().slice(0, 10)}`
		downloadJson(data, `${name}.json`)
	})

	delBtn.addEventListener('click', e => {
		e.preventDefault()
		const profiles = getStatusProfiles()
		const index = profiles.findIndex(p => p.createdAt === profile.createdAt)
		if (index === -1) return
		profiles.splice(index, 1)
		setStatusProfiles(profiles)
		renderStatusProfiles()

		const { showConfigDeleteToast } = setupToasts()
		showConfigDeleteToast()
	})

	actions.appendChild(loadBtn)
	actions.appendChild(uploadBtn)
	actions.appendChild(detailsBtn)
	actions.appendChild(exportBtn)
	actions.appendChild(delBtn)

	card.appendChild(actions)
	list.appendChild(card)
}

export function renderStatusProfiles(): void {
	const list = document.getElementById('status-list-config') as HTMLElement | null
	const nameInput = document.getElementById('status-name-input') as HTMLInputElement | null
	const statusSearchInput = document.getElementById(
		'status-search-input'
	) as HTMLInputElement | null
	if (!list || !nameInput) return

	const profiles = getStatusProfiles()
		.slice()
		.sort((a, b) => {
			const ad = a.createdAt ? new Date(a.createdAt).getTime() : 0
			const bd = b.createdAt ? new Date(b.createdAt).getTime() : 0
			return bd - ad
		})

	list.innerHTML = ''

	const { showConfigLoadedToast } = setupToasts()

	profiles.forEach(profile => {
		createStatusCard(profile, list, nameInput, showConfigLoadedToast)
	})

	if (statusSearchInput) {
		filterStatusListByExistingInput(statusSearchInput, list)
	}
}

export async function setupStatusIntervalControl(): Promise<void> {
	const input = document.getElementById('status-update-interval-input') as HTMLInputElement | null
	if (!input) return

	const raw = localStorage.getItem('updateIntervalSecStatus')

	if (raw != null) {
		const saved = parseInt(raw, 10)
		if (!Number.isNaN(saved) && saved > 0) {
			input.value = String(saved)
			if (window.electronAPI?.setStatusIntervalConfig) {
				await window.electronAPI.setStatusIntervalConfig(saved)
			}
		} else {
			input.value = '60'
			localStorage.setItem('updateIntervalSecStatus', '60')
			if (window.electronAPI?.setStatusIntervalConfig) {
				await window.electronAPI.setStatusIntervalConfig(60)
			}
		}
	} else {
		input.value = '60'
		localStorage.setItem('updateIntervalSecStatus', '60')
		if (window.electronAPI?.setStatusIntervalConfig) {
			await window.electronAPI.setStatusIntervalConfig(60)
		}
	}
}
