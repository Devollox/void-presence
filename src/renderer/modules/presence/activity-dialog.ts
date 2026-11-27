let initialized = false

export function openActivityDialog(): void {
	const dialog = document.getElementById('activity-type-dialog')
	const trigger = document.getElementById('activity-type-trigger')
	if (!dialog) return

	dialog.removeAttribute('data-closing')
	dialog.removeAttribute('hidden')

	requestAnimationFrame(() => {
		dialog.dataset.open = 'true'
	})

	trigger?.setAttribute('aria-expanded', 'true')
	document.body.setAttribute('data-modal-open', 'true')
}

export function closeActivityDialog(): void {
	const dialog = document.getElementById('activity-type-dialog')
	const trigger = document.getElementById('activity-type-trigger')
	if (!dialog || dialog.hasAttribute('hidden')) return

	dialog.dataset.open = 'false'
	dialog.setAttribute('data-closing', '')
	trigger?.setAttribute('aria-expanded', 'false')

	const panel = dialog.querySelector<HTMLElement>('.dialog-panel')

	const finish = (): void => {
		dialog.setAttribute('hidden', '')
		dialog.removeAttribute('data-closing')
		dialog.removeAttribute('data-open')
		document.body.removeAttribute('data-modal-open')
	}

	if (!panel) {
		finish()
		return
	}

	panel.addEventListener(
		'transitionend',
		(event: TransitionEvent) => {
			if (
				event.target === panel &&
				event.propertyName === 'opacity' &&
				dialog.hasAttribute('data-closing')
			) {
				finish()
			}
		},
		{ once: true },
	)
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
