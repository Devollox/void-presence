import { setupCloudUpload } from './modules/cloud-upload'
import { setupConfigDetailsOverlay } from './modules/config-details'
import { setupImportOverlay } from './modules/config-import'
import { setupClientIdControls, setupConfigPage } from './modules/config-page'
import { setupGlobalDrop } from './modules/global-drop'
import { setupIntervalControl } from './modules/state'
import {
	setupAutoHideToggle,
	setupAutoLaunchToggle,
	setupRestartButton,
	setupStopButton,
} from './modules/toggles'
import { updateInfo, updateStatus } from './modules/views'
import { setupWindowControls } from './modules/window-controls'

window.addEventListener('DOMContentLoaded', () => {
	setupRestartButton()
	setupClientIdControls()
	setupAutoLaunchToggle()
	setupAutoHideToggle()
	setupWindowControls()
	setupConfigDetailsOverlay()
	setupConfigPage()
	setupStopButton()
	void setupIntervalControl()
	setupImportOverlay()
	setupGlobalDrop()
	setupCloudUpload()
	updateInfo(null)
	updateStatus('CONNECTING RPC')

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
})
