import { setupActivityTypeControls } from './modules/config/activity'
import { initBarStyleControls } from './modules/config/bar-style-controls'
import { setupClientIdControls } from './modules/config/clientId-controls'
import { setupConfigPage } from './modules/config/config-page'
import { setupStatusDetailsOverlay } from './modules/config/status-details'
import { setupStatusImportOverlay } from './modules/config/status-import'
import {
	renderStatusProfiles,
	setupStatusIntervalControl,
	setupStatusPage,
} from './modules/config/status-page'
import { setupCloudUpload } from './modules/config/upload'
import { fetchNowPlaying } from './modules/core/now-playing'
import { setupIntervalControl } from './modules/core/state'
import { setupConfigDetailsOverlay } from './modules/modals/details'
import { setupGlobalDrop } from './modules/modals/global-drop'
import { setupImportOverlay } from './modules/modals/import'
import {
	setupStatusTutorialButtons,
	setupTutorials,
} from './modules/modals/tutorials'
import './modules/modals/update'
import { initUpdateOverlay } from './modules/modals/update'
import {
	updateStatusStatus,
	updateStatusText,
} from './modules/shell/runtime-status'
import {
	setupAutoHideToggle,
	setupAutoLaunchToggle,
	setupAutomaticActivityToggle,
	setupCoverFetchToggle,
	setupCustomStatusControls,
	setupHardwareFilterToggle,
	setupMusicFilterToggle,
	setupRestartButton,
	setupRpcEnabledToggle,
	setupStatusEnabledBrowserToggle,
	setupStatusEnabledToggle,
	setupStopButton,
	setupVideoFilterToggle,
} from './modules/shell/toggles'
import { updateInfo, updateStatus } from './modules/shell/views'
import { setupWindowControls } from './modules/shell/window-controls'

window.addEventListener('DOMContentLoaded', () => {
	void setupRestartButton()
	void setupClientIdControls()
	void setupAutoLaunchToggle()
	void setupAutoHideToggle()
	void setupWindowControls()
	void setupActivityTypeControls()
	void setupConfigDetailsOverlay()
	void setupConfigPage()
	void setupStopButton()
	void setupMusicFilterToggle()
	void setupVideoFilterToggle()
	void setupCoverFetchToggle()
	void setupHardwareFilterToggle()
	void setupAutomaticActivityToggle()
	void setupStatusEnabledToggle()
	void setupCustomStatusControls()
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

	async function pollNowPlayingUi() {
		const info = await fetchNowPlaying()
		setTimeout(pollNowPlayingUi, 4000)
	}

	void pollNowPlayingUi()
})
