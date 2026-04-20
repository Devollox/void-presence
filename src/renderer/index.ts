import { setupActivityTypeControls } from './modules/config/activity'
import { setupClientIdControls } from './modules/config/clientId-controls'
import { setupConfigPage } from './modules/config/page'
import { setupCloudUpload } from './modules/config/upload'
import { fetchNowPlaying } from './modules/core/now-playing'
import { setupIntervalControl } from './modules/core/state'
import { setupConfigDetailsOverlay } from './modules/modals/details'
import { setupGlobalDrop } from './modules/modals/global-drop'
import { setupImportOverlay } from './modules/modals/import'
import { setupTutorials } from './modules/modals/tutorials'
import './modules/modals/update'
import { initUpdateOverlay } from './modules/modals/update'
import {
	setupAutoHideToggle,
	setupAutoLaunchToggle,
	setupAutomaticActivityToggle,
	setupCoverFetchToggle,
	setupMusicFilterToggle,
	setupRestartButton,
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
	void setupAutomaticActivityToggle()
	void setupIntervalControl()
	void initUpdateOverlay()
	void setupImportOverlay()
	void setupGlobalDrop()
	void setupCloudUpload()
	void setupTutorials()
	void updateInfo(null)
	void updateStatus('DISABLED')

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
