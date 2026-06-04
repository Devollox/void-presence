import { t } from 'i18next'
import { setMainLanguage } from '../main/translations'
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
import i18n from './modules/core/i18n'
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
import { setLanguage } from './modules/shell/language'
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

function updatePlaceholders(): void {
	const configSearchInput = document.getElementById(
		'config-search-input',
	) as HTMLInputElement | null
	if (configSearchInput) {
		configSearchInput.placeholder = t('config.searchConfigsPlaceholder')
	}

	const statusSearchInput = document.getElementById(
		'status-search-input',
	) as HTMLInputElement | null
	if (statusSearchInput) {
		statusSearchInput.placeholder = t('config.searchStatusesPlaceholder')
	}

	const configNameInput = document.getElementById(
		'config-name-input',
	) as HTMLInputElement | null
	if (configNameInput) {
		configNameInput.placeholder = t('config.configNamePlaceholder')
	}

	const statusNameInput = document.getElementById(
		'status-name-input',
	) as HTMLInputElement | null
	if (statusNameInput) {
		statusNameInput.placeholder = t('config.statusProfileNamePlaceholder')
	}

	const configAuthorInput = document.getElementById(
		'config-author-input',
	) as HTMLInputElement | null
	if (configAuthorInput) {
		configAuthorInput.placeholder = t('config.authorIdPlaceholder')
	}

	const configNameCurrentInput = document.getElementById(
		'config-name-input-current',
	) as HTMLInputElement | null
	if (configNameCurrentInput) {
		configNameCurrentInput.placeholder = t('config.configNamePlaceholder')
	}
}

document.addEventListener('DOMContentLoaded', async () => {
	const initialLang =
		(await (window as any).electronAPI?.getLanguage?.()) || 'ru'
	setLanguage(initialLang)

	document
		.querySelectorAll<HTMLElement>('.timestamp-mode-btn[data-language]')
		.forEach(btn => {
			btn.addEventListener('click', () => {
				const lang = btn.getAttribute('data-language')
				if (lang) {
					setLanguage(lang)
				}
			})
		})

	const settingsLangSelector = document.getElementById(
		'settings-language-selector',
	) as HTMLSelectElement | null
	if (settingsLangSelector) {
		settingsLangSelector.value = i18n.language

		settingsLangSelector.addEventListener('change', e => {
			const lang = (e.target as HTMLSelectElement).value
			setLanguage(lang)
			updatePlaceholders()
		})
	}

	const lang: 'ru' | 'en' | 'tr' = 'ru'
	setMainLanguage(lang)

	updatePlaceholders()

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
