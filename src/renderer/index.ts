import { setupActivityTypeControls } from './modules/config/activity'
import { initBarStyleControls } from './modules/config/bar-style-controls'
import { setupClientIdControls } from './modules/config/clientId-controls'
import { setupConfigPage } from './modules/config/config-page'
import { setupStatusDetailsOverlay } from './modules/config/status-details'
import { setupStatusImportOverlay } from './modules/config/status-import'
import { setupStatusPage } from './modules/config/status-page'
import { renderStatusProfiles, setupStatusIntervalControl } from './modules/config/status-render'
import { setupCloudUpload } from './modules/config/upload'
import { fetchNowPlaying } from './modules/core/now-playing'
import { setupIntervalControl } from './modules/core/state'
import { setupConfigDetailsOverlay } from './modules/modals/details'
import { setupGlobalDrop } from './modules/modals/global-drop'
import { importJsonPayload, setupImportOverlay } from './modules/modals/import'
import { setupStatusTutorialButtons, setupTutorials } from './modules/modals/tutorials'
import './modules/modals/update'
import { initUpdateOverlay } from './modules/modals/update'
import { initLanguage } from './modules/shell/language'
import { updatePlaceholders } from './modules/shell/placeholders'
import { updateStatusStatus, updateStatusText } from './modules/shell/runtime-status'
import {
	setupAutoHideToggle,
	setupAutoLaunchToggle,
	setupAutomaticActivityToggle,
	setupCoverFetchToggle,
	setupCustomStatusControls,
	setupHardwareFilterToggle,
	setupMusicFilterToggle,
	setupPresenceControls,
	setupRpcEnabledToggle,
	setupStatusEnabledBrowserToggle,
	setupStatusEnabledToggle,
	setupSupportAndLogsButtons,
	setupVideoFilterToggle,
} from './modules/shell/toggles'
import { updateInfo, updateStatus } from './modules/shell/views'
import { setupWindowControls } from './modules/shell/window-controls'

document.addEventListener('DOMContentLoaded', async () => {
	initLanguage()
	updatePlaceholders()

	void setupClientIdControls()
	void setupAutoLaunchToggle()
	void setupAutoHideToggle()
	void setupWindowControls()
	void setupActivityTypeControls()
	void setupConfigDetailsOverlay()
	void setupConfigPage()
	void setupMusicFilterToggle()
	void setupVideoFilterToggle()
	void setupCoverFetchToggle()
	void setupHardwareFilterToggle()
	void setupAutomaticActivityToggle()
	void setupStatusEnabledToggle()
	void setupCustomStatusControls()
	void setupSupportAndLogsButtons()
	void setupPresenceControls()
	void setupIntervalControl()
	void setupStatusTutorialButtons()
	void initUpdateOverlay()
	void setupImportOverlay()
	void setupGlobalDrop()
	void setupStatusPage()
	void setupCloudUpload()
	void setupTutorials()
	void setupRpcEnabledToggle()
	void setupStatusEnabledBrowserToggle()
	void renderStatusProfiles()
	void setupStatusImportOverlay()
	void setupStatusDetailsOverlay()
	void setupStatusIntervalControl()
	void initBarStyleControls()

	updateStatusStatus('CUSTOM_STATUS_DISABLED')
	updateStatus('RPC_DISABLED')

	if (window.electronAPI?.onRpcUpdate) {
		window.electronAPI.onRpcUpdate(payload => {
			updateInfo(payload)
		})
	}

	if (window.electronAPI?.onRpcStatus) {
		window.electronAPI.onRpcStatus(status => {
			updateStatus(status)
		})
	}

	if (window.electronAPI?.onStatusStatus) {
		window.electronAPI.onStatusStatus(status => {
			updateStatusStatus(status)
		})
	}

	if (window.electronAPI?.onStatusPayload) {
		window.electronAPI.onStatusPayload(payload => {
			updateStatusText(payload)
		})
	}

	if (window.electronAPI?.onImportConfigFromProtocol) {
		window.electronAPI.onImportConfigFromProtocol(raw => {
			try {
				const payload = raw as { data: unknown; title?: string }
				importJsonPayload(payload.data, payload.title)
			} catch (err: any) {
				console.error('Failed to import config from protocol', err?.message ?? err)
			}
		})
	}

	if (window.electronAPI?.onImportStatusFromProtocol) {
		window.electronAPI.onImportStatusFromProtocol(raw => {
			try {
				const payload = raw as { data: unknown; title?: string }
				importJsonPayload(payload.data, payload.title)
			} catch (err: any) {
				console.error('Failed to import config from protocol', err?.message ?? err)
			}
		})
	}

	if (window.electronAPI?.onActivateView) {
		window.electronAPI.onActivateView(payload => {
			const views = document.querySelectorAll('.view')
			views.forEach(v => {
				const name = v.getAttribute('data-view')
				v.setAttribute('data-active', name === payload.view ? 'true' : 'false')
			})

			document.getElementById('nav-main')?.setAttribute('data-active', 'false')
			document.getElementById('nav-config')?.setAttribute('data-active', 'true')
		})
	}

	if (window.electronAPI?.onAuthFromUrl) {
		window.electronAPI.onAuthFromUrl(user => {
			localStorage.setItem('authorId', user.authorId)
			if (user.authorName) localStorage.setItem('authorName', user.authorName)
			if (user.provider) localStorage.setItem('authorProvider', user.provider)
			if (user.avatar) localStorage.setItem('authorAvatar', user.avatar)

			const input = document.getElementById('config-author-input') as HTMLInputElement
			if (input) input.value = user.authorId

			const label = document.getElementById('config-author-label')
			if (label) label.textContent = user.authorName || user.authorId
		})
	}

	async function pollNowPlayingUi() {
		const info = await fetchNowPlaying()
		setTimeout(pollNowPlayingUi, 4000)
	}

	void pollNowPlayingUi()
})
