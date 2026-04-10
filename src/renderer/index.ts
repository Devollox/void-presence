import { setupCloudUpload } from './modules/cloud-upload'
import { setupActivityTypeControls } from './modules/config-activity'
import { setupConfigDetailsOverlay } from './modules/config-details'
import { setupImportOverlay } from './modules/config-import'
import { setupClientIdControls, setupConfigPage } from './modules/config-page'
import { setupGlobalDrop } from './modules/global-drop'
import { fetchNowPlaying } from './modules/now-playing'
import { setupIntervalControl } from './modules/state'
import {
	setupAutoHideToggle,
	setupAutoLaunchToggle,
	setupAutomaticActivityToggle,
	setupCoverFetchToggle,
	setupMusicFilterToggle,
	setupRestartButton,
	setupStopButton,
	setupVideoFilterToggle,
} from './modules/toggles'
import { setupTutorials } from './modules/tutorials'
import { updateInfo, updateStatus } from './modules/views'
import { setupWindowControls } from './modules/window-controls'

window.addEventListener('DOMContentLoaded', () => {
	setupRestartButton()
	setupClientIdControls()
	setupAutoLaunchToggle()
	setupAutoHideToggle()
	setupWindowControls()
	setupActivityTypeControls()
	setupConfigDetailsOverlay()
	setupConfigPage()
	setupStopButton()
	setupTutorials()
	setupMusicFilterToggle()
	setupVideoFilterToggle()
	setupCoverFetchToggle()
	setupAutomaticActivityToggle()
	void setupIntervalControl()
	setupImportOverlay()
	setupGlobalDrop()
	setupCloudUpload()
	updateInfo(null)
	updateStatus('DISABLED')

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

	async function pollNowPlayingUi() {
		const info = await fetchNowPlaying()
		setTimeout(pollNowPlayingUi, 4000)
	}

	void pollNowPlayingUi()
})
