import { updateInfo, updateStatus } from './views'

export function setupAutoLaunchToggle(): void {
	const toggle = document.getElementById(
		'auto-launch-toggle'
	) as HTMLElement | null
	if (!toggle) return
	const saved = localStorage.getItem('autoLaunch') === 'true'
	toggle.dataset.on = saved ? 'true' : 'false'
	toggle.addEventListener('click', () => {
		const current = toggle.dataset.on === 'true'
		const next = !current
		toggle.dataset.on = next ? 'true' : 'false'
		localStorage.setItem('autoLaunch', String(next))
		if (window.electronAPI?.setAutoLaunch) {
			window.electronAPI.setAutoLaunch(next)
		}
	})
}

export function setupAutoHideToggle(): void {
	const toggle = document.getElementById(
		'auto-hide-toggle'
	) as HTMLElement | null
	if (!toggle) return
	const saved = localStorage.getItem('autoHide') === 'true'
	toggle.dataset.on = saved ? 'true' : 'false'
	toggle.addEventListener('click', () => {
		const current = toggle.dataset.on === 'true'
		const next = !current
		toggle.dataset.on = next ? 'true' : 'false'
		localStorage.setItem('autoHide', String(next))
		if (window.electronAPI?.setAutoHide) {
			window.electronAPI.setAutoHide(next)
		}
	})
}

export function setupStopButton(): void {
	const btn = document.getElementById(
		'stop-discord'
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
		'restart-discord'
	) as HTMLButtonElement | null
	if (!btn) return
	btn.addEventListener('click', e => {
		e.preventDefault()
		if (window.electronAPI?.restartDiscordRich) {
			updateStatus('RESTARTING')
			window.electronAPI.restartDiscordRich()
		}
	})
}
