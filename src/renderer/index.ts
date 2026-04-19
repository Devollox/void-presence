import { setupActivityTypeControls } from './modules/config/activity'
import { setupClientIdControls, setupConfigPage } from './modules/config/ui'
import { setupCloudUpload } from './modules/config/upload'
import { setupConfigDetailsOverlay } from './modules/modals/details'
import { setupImportOverlay } from './modules/modals/import'

import { fetchNowPlaying } from './modules/core/now-playing'
import { setupIntervalControl } from './modules/core/state'
import { setupGlobalDrop } from './modules/modals/global-drop'
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
	initUpdateOverlay()
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
