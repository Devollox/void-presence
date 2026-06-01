import { refreshBarStyleVisibility } from '../config/bar-style-controls'
import { updateInfo, updateStatus } from './views'

type ToggleKey =
	| 'autoLaunch'
	| 'autoHide'
	| 'musicFilter'
	| 'videoFilter'
	| 'activityFilter'
	| 'coverFetchEnabled'
	| 'hardwareMonitorEnabled'
	| 'statusEnabled'
	| 'rpcEnabled'

type ToggleApi =
	| 'setAutoLaunch'
	| 'setAutoHide'
	| 'setMusicFilter'
	| 'setVideoFilter'
	| 'setAutomaticActivity'
	| 'setCoverFetch'
	| 'setHardwareMonitor'
	| 'setStatusEnabled'
	| 'setRpcEnabled'

type ToggleConfig<K extends ToggleKey, A extends ToggleApi> = {
	id: string
	storageKey: K
	apiMethod: A
}

function setupGenericToggle<K extends ToggleKey, A extends ToggleApi>(
	cfg: ToggleConfig<K, A>,
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

		refreshBarStyleVisibility()
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

export function setupMusicFilterToggle(): void {
	setupGenericToggle({
		id: 'music-filter-toggle',
		storageKey: 'musicFilter',
		apiMethod: 'setMusicFilter',
	})
}

export function setupVideoFilterToggle(): void {
	setupGenericToggle({
		id: 'video-filter-toggle',
		storageKey: 'videoFilter',
		apiMethod: 'setVideoFilter',
	})
}

export function setupAutomaticActivityToggle(): void {
	setupGenericToggle({
		id: 'automatic-activity-toggle',
		storageKey: 'activityFilter',
		apiMethod: 'setAutomaticActivity',
	})
}

export function setupCoverFetchToggle(): void {
	setupGenericToggle({
		id: 'cover-fetch-toggle',
		storageKey: 'coverFetchEnabled',
		apiMethod: 'setCoverFetch',
	})
}

export function setupHardwareFilterToggle(): void {
	setupGenericToggle({
		id: 'hardware-filter-toggle',
		storageKey: 'hardwareMonitorEnabled',
		apiMethod: 'setHardwareMonitor',
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

export function setupStopButton(): void {
	const btn = document.getElementById(
		'stop-discord',
	) as HTMLButtonElement | null
	if (!btn) return
	btn.addEventListener('click', e => {
		e.preventDefault()
		if (window.electronAPI?.stopDiscordRich) {
			updateStatus('DISABLED')
			updateInfo(null)
			void window.electronAPI.stopDiscordRich()
		}
	})
}

export function setupRestartButton(): void {
	const btn = document.getElementById(
		'restart-discord',
	) as HTMLButtonElement | null
	if (!btn) return
	btn.addEventListener('click', e => {
		e.preventDefault()
		if (window.electronAPI?.restartDiscordRich) {
			setTimeout(() => {
				updateStatus('RESTARTING')
			}, 100)
			window.electronAPI.restartDiscordRich()
		}
	})
}

export function setupCustomStatusControls() {
	const btnRestart = document.getElementById('custom-status-restart')
	const btnStop = document.getElementById('custom-status-stop')

	if (btnRestart && window.electronAPI?.customStatusRestart) {
		btnRestart.addEventListener('click', () => {
			window.electronAPI.customStatusRestart()
		})
	}

	if (btnStop && window.electronAPI?.customStatusStop) {
		btnStop.addEventListener('click', () => {
			window.electronAPI.customStatusStop()
		})
	}
}
