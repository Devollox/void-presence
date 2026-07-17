import { setupToasts } from '../config/toasts'
import { updateInfo, updateStatus } from './views'

type ToggleKey = 'autoLaunch' | 'autoHide' | 'statusEnabled' | 'statusEnabledBrowser' | 'rpcEnabled'

type ToggleApi =
	| 'setAutoLaunch'
	| 'setAutoHide'
	| 'setStatusEnabled'
	| 'setStatusEnabledBrowser'
	| 'setRpcEnabled'

type ToggleConfig<K extends ToggleKey, A extends ToggleApi> = {
	id: string
	storageKey: K
	apiMethod: A
}

function setupGenericToggle<K extends ToggleKey, A extends ToggleApi>(
	cfg: ToggleConfig<K, A>
): void {
	const toggle = document.getElementById(cfg.id) as HTMLElement | null
	if (!toggle) return

	const raw = localStorage.getItem(cfg.storageKey)

	let saved: boolean

	if (cfg.storageKey === 'rpcEnabled') {
		saved = raw === null ? true : raw === 'true'
	} else {
		saved = raw === 'true'
	}

	toggle.dataset.on = saved ? 'true' : 'false'

	toggle.addEventListener('click', () => {
		const current = toggle.dataset.on === 'true'
		const next = !current
		toggle.dataset.on = next ? 'true' : 'false'
		localStorage.setItem(cfg.storageKey, String(next))

		const api = window.electronAPI as any
		if (api?.[cfg.apiMethod]) {
			api[cfg.apiMethod](next)
		}
	})
}

export function setupAutoLaunchToggle(): void {
	setupGenericToggle({
		id: 'auto-launch-toggle',
		storageKey: 'autoLaunch',
		apiMethod: 'setAutoLaunch',
	})
}

export function setupAutoHideToggle(): void {
	setupGenericToggle({
		id: 'auto-hide-toggle',
		storageKey: 'autoHide',
		apiMethod: 'setAutoHide',
	})
}

export function setupStatusEnabledToggle(): void {
	setupGenericToggle({
		id: 'status-custom-enabled-toggle',
		storageKey: 'statusEnabled',
		apiMethod: 'setStatusEnabled',
	})
}

export function setupRpcEnabledToggle(): void {
	setupGenericToggle({
		id: 'rpc-enabled-toggle',
		storageKey: 'rpcEnabled',
		apiMethod: 'setRpcEnabled',
	})
}

export function setupStatusEnabledBrowserToggle(): void {
	setupGenericToggle({
		id: 'status-custom-browser-toggle',
		storageKey: 'statusEnabledBrowser',
		apiMethod: 'setStatusEnabledBrowser',
	})
}

export function setupPresenceControls() {
	const btnRestart = document.getElementById('restart-discord') as HTMLButtonElement | null
	const btnStop = document.getElementById('stop-discord') as HTMLButtonElement | null

	if (btnRestart && window.electronAPI?.customStatusRestart) {
		btnRestart.addEventListener('click', e => {
			e.preventDefault()
			setTimeout(() => {
				updateStatus('RPC_RESTARTING')
			}, 100)
			window.electronAPI.restartDiscordRich()

			const { showRestartPresnceToast } = setupToasts()
			showRestartPresnceToast()
		})
	}

	if (btnRestart && window.electronAPI?.stopDiscordRich) {
		btnStop.addEventListener('click', e => {
			e.preventDefault()
			updateStatus('RPC_DISABLED')
			updateInfo(null)
			void window.electronAPI.stopDiscordRich()

			const { showStopPresnceToast } = setupToasts()
			showStopPresnceToast()
		})
	}
}

export function setupCustomStatusControls() {
	const btnRestart = document.getElementById('custom-status-restart')
	const btnStop = document.getElementById('custom-status-stop')

	if (btnRestart && window.electronAPI?.customStatusRestart) {
		btnRestart.addEventListener('click', () => {
			window.electronAPI.customStatusRestart()

			const { showRestartStatusToast } = setupToasts()
			showRestartStatusToast()
		})
	}

	if (btnStop && window.electronAPI?.customStatusStop) {
		btnStop.addEventListener('click', () => {
			window.electronAPI.customStatusStop()

			const { showStopStatusToast } = setupToasts()
			showStopStatusToast()
		})
	}
}

export function setupSupportAndLogsButtons() {
	const api = window.electronAPI

	const btnSupportSite = document.getElementById('support-open-site')
	const btnSupportDiscord = document.getElementById('support-open-discord')
	const btnClearLogs = document.getElementById('logs-clear-btn')
	const btnDownloadLogs = document.getElementById('logs-download-btn')

	if (btnSupportSite && api?.openSupportSite) {
		btnSupportSite.addEventListener('click', () => {
			api.openSupportSite?.()
		})
	}

	if (btnSupportDiscord && api?.openSupportDiscord) {
		btnSupportDiscord.addEventListener('click', () => {
			api.openSupportDiscord?.()
		})
	}

	if (btnClearLogs && api?.clearLogs) {
		btnClearLogs.addEventListener('click', () => {
			api.clearLogs?.()
		})
	}

	if (btnDownloadLogs && api?.downloadLogs) {
		btnDownloadLogs.addEventListener('click', () => {
			api.downloadLogs?.()
		})
	}
}

export function setupPluginsExternalButtons() {
	const api = window.electronAPI

	const btnBrowse = document.getElementById('plugins-open-site')
	const btnAdd = document.getElementById('plugins-add-yours')

	if (btnBrowse) {
		btnBrowse.addEventListener('click', () => {
			api?.openExternal?.('https://voidpresence.site/plugins')
		})
	}

	if (btnAdd) {
		btnAdd.addEventListener('click', () => {
			api?.openExternal?.('https://github.com/Devollox/void-web/tree/main/plugins')
		})
	}
}
