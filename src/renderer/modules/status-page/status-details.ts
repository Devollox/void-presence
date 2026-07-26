import { StoredStatusProfile } from '../../../types/types'

export function openStatusDetails(profile: StoredStatusProfile): void {
	const overlay = document.getElementById('status-details-overlay') as HTMLElement | null
	const nameEl = document.getElementById('status-details-name') as HTMLElement | null
	const listEl = document.getElementById('status-details-list') as HTMLElement | null

	if (!overlay || !nameEl || !listEl) {
		return
	}

	const items = Array.isArray(profile.items) ? profile.items : []

	nameEl.textContent = profile.name || 'Unnamed status profile'
	listEl.innerHTML = ''

	if (!items.length) {
		const empty = document.createElement('div')
		empty.className = 'config-details-empty'
		empty.textContent = 'No statuses saved'
		listEl.appendChild(empty)
	} else {
		items.forEach(it => {
			const row = document.createElement('div')
			row.className = 'config-details-item'

			const main = document.createElement('div')
			main.className = 'config-details-item-main'

			const label = document.createElement('div')
			label.className = 'config-details-item-label'
			label.textContent = it.text || 'No text'

			const sub = document.createElement('div')
			sub.className = 'config-details-item-sub'
			sub.textContent = typeof it.emoji === 'string' && it.emoji.trim() ? it.emoji : 'No emoji'

			main.appendChild(label)
			main.appendChild(sub)
			row.appendChild(main)
			listEl.appendChild(row)
		})
	}

	overlay.dataset.open = 'true'
}

export function setupStatusDetailsOverlay(): void {
	const overlay = document.getElementById('status-details-overlay') as HTMLElement | null
	const closeBtn = document.getElementById('status-details-close') as HTMLButtonElement | null
	if (!overlay || !closeBtn) return

	function close(): void {
		if (!overlay) return

		overlay.dataset.open = 'false'
	}

	closeBtn.addEventListener('click', e => {
		e.preventDefault()
		close()
	})

	overlay.addEventListener('click', e => {
		if (e.target === overlay) {
			close()
		}
	})

	document.addEventListener('keydown', e => {
		if (e.key === 'Escape' && overlay.dataset.open === 'true') {
			e.preventDefault()
			close()
		}
	})
}
