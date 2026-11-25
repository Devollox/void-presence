let initialized = false

const CLOSING_DURATION = 250

export function openShortcutsModal(): void {
	const modal = document.querySelector<HTMLElement>('#shortcuts-modal')

	if (!modal) return
	if (!modal.hidden || modal.hasAttribute('data-closing')) return

	modal.hidden = false
	document.body.setAttribute('data-modal-open', 'true')

	const search = modal.querySelector<HTMLInputElement>('#shortcuts-modal-search')

	search?.focus()
}

function closeShortcutsModal(): void {
	const modal = document.querySelector<HTMLElement>('#shortcuts-modal')

	if (!modal || modal.hidden || modal.hasAttribute('data-closing')) return

	modal.setAttribute('data-closing', '')

	setTimeout(() => {
		modal.hidden = true
		modal.removeAttribute('data-closing')
		document.body.removeAttribute('data-modal-open')
	}, CLOSING_DURATION)
}

export default function setupShortcutsModal(): void {
	if (initialized) return

	const modal = document.querySelector<HTMLElement>('#shortcuts-modal')
	const closeBtn = document.querySelector<HTMLButtonElement>('#shortcuts-modal-close')
	const backdrop = modal?.querySelector<HTMLElement>('.shortcuts-modal-backdrop')
	const search = modal?.querySelector<HTMLInputElement>('#shortcuts-modal-search')
	const empty = modal?.querySelector<HTMLElement>('#shortcuts-empty')

	if (!modal || !closeBtn || !backdrop || !search || !empty) return

	initialized = true

	closeBtn.addEventListener('click', () => {
		closeShortcutsModal()
	})

	backdrop.addEventListener('click', () => {
		closeShortcutsModal()
	})

	document.addEventListener('keydown', event => {
		if (event.key !== 'Escape' || modal.hidden) return

		event.preventDefault()
		closeShortcutsModal()
	})

	document.addEventListener('keydown', event => {
		if (event.key !== '?') return
		if (!modal.hidden) return

		const tag = (document.activeElement?.tagName ?? '').toUpperCase()

		if (
			tag === 'INPUT' ||
			tag === 'TEXTAREA' ||
			(document.activeElement as HTMLElement)?.isContentEditable
		) return

		event.preventDefault()
		openShortcutsModal()
	})

	search.addEventListener('input', () => {
		const query = search.value.trim().toLowerCase()
		const sections = modal.querySelectorAll<HTMLElement>('[data-section]')

		let totalVisible = 0

		sections.forEach(section => {
			const rows = section.querySelectorAll<HTMLElement>('[data-shortcut-row]')
			let visibleInSection = 0

			rows.forEach(row => {
				const label = row.querySelector<HTMLElement>('.shortcuts-label')
				const text = label?.textContent?.toLowerCase() ?? ''
				const matches = !query || text.includes(query)

				row.hidden = !matches

				if (matches) visibleInSection++
			})

			section.hidden = visibleInSection === 0
			totalVisible += visibleInSection
		})

		empty.hidden = totalVisible > 0
	})
}
