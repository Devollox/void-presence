let initialized = false

export function openTimestampModal(): void {
	const modal = document.getElementById('timestamp-modal')
	const trigger = document.getElementById('timestamp-modal-trigger')
	if (!modal) return

	modal.removeAttribute('data-closing')
	modal.removeAttribute('hidden')

	requestAnimationFrame(() => {
		modal.dataset.open = 'true'
	})

	trigger?.setAttribute('aria-expanded', 'true')
	document.body.setAttribute('data-modal-open', 'true')
}

export function closeTimestampModal(): void {
	const modal = document.getElementById('timestamp-modal')
	const trigger = document.getElementById('timestamp-modal-trigger')
	if (!modal || modal.hasAttribute('hidden')) return

	modal.dataset.open = 'false'
	modal.setAttribute('data-closing', '')
	trigger?.setAttribute('aria-expanded', 'false')

	const panel = modal.querySelector<HTMLElement>('.dialog-panel')

	const finish = (): void => {
		modal.setAttribute('hidden', '')
		modal.removeAttribute('data-closing')
		modal.removeAttribute('data-open')
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
				modal.hasAttribute('data-closing')
			) {
				finish()
			}
		},
		{ once: true },
	)
}

export function updateTimestampSummary(): void {
	const summary = document.getElementById('timestamp-summary')
	if (!summary) return
	const mode = localStorage.getItem('timestampMode') || 'now'
	const nowMode = localStorage.getItem('nowMode') || 'plain'
	const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1)
	summary.textContent = mode === 'now' ? `${cap(mode)} · ${cap(nowMode)}` : cap(mode)
}

export function setupTimestampModal(): void {
	if (initialized) return
	const modal = document.getElementById('timestamp-modal')
	const trigger = document.getElementById('timestamp-modal-trigger')
	const closeBtn = document.getElementById('timestamp-modal-close')
	const backdrop = document.getElementById('timestamp-modal-backdrop')
	if (!modal || !trigger) return
	initialized = true

	trigger.addEventListener('click', () => openTimestampModal())
	closeBtn?.addEventListener('click', () => closeTimestampModal())
	backdrop?.addEventListener('click', () => closeTimestampModal())

	document.addEventListener('keydown', e => {
		if (e.key === 'Escape' && !modal.hidden) closeTimestampModal()
	})

	modal.addEventListener('click', e => {
		const target = e.target as HTMLElement
		if (target.closest('.dialog-option')) {
			setTimeout(updateTimestampSummary, 50)
		}
	})

	updateTimestampSummary()
}
