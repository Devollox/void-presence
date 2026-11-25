import { setupConfigPage } from './modules/config-page/config-page'
import { setupActivityTypeControls } from './modules/config/activity'
import { setupClientIdControls } from './modules/config/clientId-controls'
import { setupToasts } from './modules/config/toasts'
import { setupCloudUpload } from './modules/config/upload'
import { fetchNowPlaying } from './modules/core/now-playing'
import { setupIntervalControl } from './modules/core/state'
import { setupConfigDetailsOverlay } from './modules/modals/details'
import { setupGlobalDrop } from './modules/modals/global-drop'
import { importJsonPayload, setupImportOverlay } from './modules/modals/import'
import { setupStatusTutorialButtons, setupTutorials } from './modules/modals/tutorials'
import './modules/modals/update'
import { initUpdateOverlay } from './modules/modals/update'
import { setupPluginsPage } from './modules/plugins/plugins-page'
import setupTabsDnd from './modules/shell/dnd-tabs'
import { initLanguage } from './modules/shell/language'
import { updatePlaceholders } from './modules/shell/placeholders'
import { updateStatusStatus, updateStatusText } from './modules/shell/runtime-status'
import {
	setupAutoHideToggle,
	setupAutoLaunchToggle,
	setupCustomStatusControls,
	setupPluginsExternalButtons,
	setupPresenceControls,
	setupRpcEnabledToggle,
	setupStatusEnabledBrowserToggle,
	setupStatusEnabledToggle,
	setupSupportAndLogsButtons,
} from './modules/shell/toggles'
import setupTooltips from './modules/shell/tooltip'
import setupSidebarToggle from './modules/shell/view-sidebar'
import { updateInfo, updateStatus } from './modules/shell/views'
import setupViewsNavigation, { setActiveView } from './modules/shell/views-nav'
import { setupWindowControls } from './modules/shell/window-controls'
import { setupStatusDetailsOverlay } from './modules/status-page/status-details'
import { setupStatusImportOverlay } from './modules/status-page/status-import'
import { setupStatusPage } from './modules/status-page/status-page'
import {
	renderStatusProfiles,
	setupStatusIntervalControl,
} from './modules/status-page/status-render'
import setupAccountModal, { acceptAccountProfile } from './modules/shell/account'
import setupSidebarDnd from './modules/shell/sidebar-dnd'
import initSidebarPeek from './modules/shell/sidebar-peek'
import { setupWelcomeScreen } from './modules/shell/welcome'
import { initTheme } from './modules/shell/theme'
import setupHelpMenu from './modules/shell/help-menu'
import setupShortcutsModal, { openShortcutsModal } from './modules/shell/shortcuts-modal'

function isRecord(value: unknown): value is Record<string, unknown> {
	return value !== null && typeof value === 'object' && !Array.isArray(value)
}

document.addEventListener('DOMContentLoaded', () => {
	initTheme()
	initLanguage()
	updatePlaceholders()
	setupWelcomeScreen()
	const toasts = setupToasts()

	void setupClientIdControls()
	void setupAutoLaunchToggle()
	void setupAutoHideToggle()
	void setupWindowControls()
	void setupActivityTypeControls()
	void setupConfigDetailsOverlay()
	void setupConfigPage()
	void setupStatusEnabledToggle()
	void setupCustomStatusControls()
	void setupSupportAndLogsButtons()
	void setupPresenceControls()
	void setupIntervalControl()
	void setupStatusTutorialButtons()
	void setupTooltips()
	void setupTabsDnd()
	void setupHelpMenu()
	void setupShortcutsModal()
	void setupViewsNavigation()
	void setupSidebarToggle()
	void setupAccountModal()
	void setupSidebarDnd()
	void initSidebarPeek()
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
	void setupPluginsPage()
	void setupPluginsExternalButtons()

	updateStatusStatus('CUSTOM_STATUS_DISABLED')
	updateStatus('RPC_DISABLED')

	const api = window.electronAPI

	if (api?.onRpcUpdate) {
		api.onRpcUpdate(payload => {
			updateInfo(payload)
		})
	}

	if (api?.onRpcStatus) {
		api.onRpcStatus(status => {
			updateStatus(status)
		})
	}

	if (api?.onStatusStatus) {
		api.onStatusStatus(status => {
			updateStatusStatus(status)
		})
	}

	if (api?.onStatusPayload) {
		api.onStatusPayload(payload => {
			updateStatusText(payload)
		})
	}

	if (api?.onImportConfigFromProtocol) {
		api.onImportConfigFromProtocol(raw => {
			void (async () => {
				try {
					if (
						!isRecord(raw) ||
						raw.kind !== 'import-config' ||
						typeof raw.configId !== 'string' ||
						!raw.configId ||
						typeof raw.title !== 'string' ||
						!isRecord(raw.configData)
					) {
						throw new Error('Invalid config import payload.')
					}

					await importJsonPayload(raw.configData, raw.title)
				} catch (error) {
					console.error('[protocol] Config import failed', {
						message: error instanceof Error ? error.message : 'Unknown error',
					})

					toasts.showMessageToast({
						message: 'Could not open this config for import.',
					})
				}
			})()
		})
	}

	if (api?.onImportStatusFromProtocol) {
		api.onImportStatusFromProtocol(raw => {
			void (async () => {
				try {
					if (
						!isRecord(raw) ||
						raw.kind !== 'import-status' ||
						typeof raw.configId !== 'string' ||
						!raw.configId ||
						typeof raw.title !== 'string' ||
						!isRecord(raw.configData) ||
						!Array.isArray(raw.configData.statusCycles)
					) {
						throw new Error('Invalid status import payload.')
					}

					await importJsonPayload(raw.configData, raw.title)
				} catch (error) {
					console.error('[protocol] Status import failed', {
						message: error instanceof Error ? error.message : 'Unknown error',
					})

					toasts.showMessageToast({
						message: 'Could not open this status for import.',
					})
				}
			})()
		})
	}

	if (api?.onProtocolError) {
		api.onProtocolError(({ code, message }) => {
			console.warn('[protocol] Action rejected', { code })

			toasts.showMessageToast({
				message:
					typeof message === 'string' && message.trim()
						? message.slice(0, 500)
						: 'Could not process this link.',
			})
		})
	}

	if (api?.onActivateView) {
		api.onActivateView(payload => {
			if (!payload || typeof payload.view !== 'string') {
				return
			}

			const view = payload.view === 'config' ? 'configs' : payload.view

			const allowedViews = new Set([
				'presence',
				'status',
				'logs',
				'plugins',
				'configs',
				'settings',
				'changelogs',
			])

			if (!allowedViews.has(view)) return

			setActiveView(view)
		})
	}

	if (api?.onAuthFromUrl) {
		console.info('[account] Auth listener registered')

		api.onAuthFromUrl(user => {
			console.info('[account] Verified profile received')

			try {
				acceptAccountProfile({
					authorId: user.authorId,
					authorName: user.authorName ?? '',
					provider: user.provider ?? '',
					avatar: user.avatar ?? '',
				})

				console.info('[account] Profile saved', {
					hasAuthorId: Boolean(localStorage.getItem('authorId')),
				})
			} catch {
				console.error('[account] Could not save profile')

				toasts.showMessageToast({
					message: 'Could not save the connected account.',
				})
			}
		})
	} else {
		console.error('[account] electronAPI.onAuthFromUrl is missing')
	}

	let stopped = false
	let pollTimer: ReturnType<typeof setTimeout> | null = null

	async function pollNowPlayingUi(): Promise<void> {
		if (stopped) return

		try {
			await fetchNowPlaying()
		} catch {
			console.error('Failed to fetch now playing')
		} finally {
			if (!stopped) {
				pollTimer = setTimeout(() => {
					void pollNowPlayingUi()
				}, 4000)
			}
		}
	}

	window.addEventListener(
		'beforeunload',
		() => {
			stopped = true

			if (pollTimer !== null) {
				clearTimeout(pollTimer)
				pollTimer = null
			}
		},
		{ once: true }
	)

	void pollNowPlayingUi()

	if (api?.onPluginToast) {
		api.onPluginToast(({ message }) => {
			if (typeof message !== 'string') return

			toasts.showPluginSavedToast({
				message,
			})
		})
	}

	if (api?.onPluginsListUpdated) {
		api.onPluginsListUpdated(plugins => {
			document.dispatchEvent(
				new CustomEvent('plugins-reload', {
					detail: plugins,
				})
			)
		})
	}
})
