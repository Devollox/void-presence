const CLOSING_DURATION = 250
let initialized = false

export function openActivityDialog(): void {
	const dialog = document.getElementById('activity-type-dialog')
	if (!dialog || !dialog.hidden || dialog.hasAttribute('data-closing')) return
	dialog.hidden = false
	document.body.setAttribute('data-modal-open', 'true')
}

export function closeActivityDialog(): void {
	const dialog = document.getElementById('activity-type-dialog')
	if (!dialog || dialog.hidden || dialog.hasAttribute('data-closing')) return
	dialog.setAttribute('data-closing', '')
	setTimeout(() => {
		dialog.hidden = true
		dialog.removeAttribute('data-closing')
		document.body.removeAttribute('data-modal-open')
	}, CLOSING_DURATION)
}

export function updateActivityTypeSummary(): void {
	const summary = document.getElementById('activity-type-summary')
	if (!summary) return
	const type = localStorage.getItem('activityType') || 'playing'
	const labels: Record<string, string> = {
		playing: 'Playing',
		watching: 'Watching',
		listening: 'Listening',
		competing: 'Competing',
	}
	summary.textContent = labels[type] ?? 'Playing'
}

export function setupActivityDialog(): void {
	if (initialized) return
	const dialog = document.getElementById('activity-type-dialog')
	const trigger = document.getElementById('activity-type-trigger')
	const closeBtn = document.getElementById('activity-type-dialog-close')
	const backdrop = document.getElementById('activity-type-dialog-backdrop')
	if (!dialog || !trigger) return
	initialized = true

	trigger.addEventListener('click', () => openActivityDialog())
	closeBtn?.addEventListener('click', () => closeActivityDialog())
	backdrop?.addEventListener('click', () => closeActivityDialog())

	document.addEventListener('keydown', e => {
		if (e.key === 'Escape' && !dialog.hidden) closeActivityDialog()
	})

	dialog.addEventListener('click', e => {
		const option = (e.target as HTMLElement).closest<HTMLElement>('.dialog-option')
		if (!option) return
		setTimeout(() => {
			updateActivityTypeSummary()
			closeActivityDialog()
		}, 120)
	})

	updateActivityTypeSummary()
}
