import { StoredConfig } from './types'

function renderList(
	listEl: HTMLElement,
	items: any[],
	type: 'cycles' | 'images' | 'buttons'
): void {
	listEl.innerHTML = ''
	if (!items || !items.length) {
		const empty = document.createElement('div')
		empty.className = 'config-details-empty'
		empty.textContent =
			type === 'cycles'
				? 'No cycles saved'
				: type === 'images'
					? 'No image configuration'
					: 'No buttons configured'
		listEl.appendChild(empty)
		return
	}

	items.forEach((item, idx) => {
		const row = document.createElement('div')
		row.className = 'config-details-item'

		const main = document.createElement('div')
		main.className = 'config-details-item-main'

		const meta = document.createElement('div')
		meta.className = 'config-details-item-meta'

		if (type === 'cycles') {
			const label = document.createElement('div')
			label.className = 'config-details-item-label'
			label.textContent = item.details || 'No details'

			const sub = document.createElement('div')
			sub.className = 'config-details-item-sub'
			sub.textContent = item.state || 'No state'

			main.appendChild(label)
			main.appendChild(sub)

			const pill = document.createElement('div')
			pill.className = 'config-details-pill'
			pill.textContent = `#${idx + 1}`
			meta.appendChild(pill)
		} else if (type === 'images') {
			const label = document.createElement('div')
			label.className = 'config-details-item-label'
			label.textContent = item.largeText || item.largeImage || 'Large image'

			const largeUrlPill = document.createElement('div')
			largeUrlPill.className = 'config-details-pill'
			const largeLink = document.createElement('a')
			largeLink.href = item.largeImage || '#'
			largeLink.textContent = item.largeImage || 'no large url'
			largeLink.target = '_blank'
			largeUrlPill.appendChild(largeLink)

			main.appendChild(label)
			main.appendChild(largeUrlPill)

			const sub = document.createElement('div')
			sub.className = 'config-details-item-sub'
			sub.textContent = item.smallText || item.smallImage || 'Small image'

			const smallUrlPill = document.createElement('div')
			smallUrlPill.className = 'config-details-pill'
			const smallLink = document.createElement('a')
			smallLink.href = item.smallImage || '#'
			smallLink.textContent = item.smallImage || 'no'
			if (smallLink.textContent !== 'no') {
				smallLink.target = '_blank'
				smallUrlPill.appendChild(smallLink)
				meta.appendChild(sub)
				meta.appendChild(smallUrlPill)
			}
		} else if (type === 'buttons') {
			const mainLabel = document.createElement('div')
			mainLabel.className = 'config-details-item-label'
			mainLabel.textContent = item.label1 || 'Button 1'

			const mainUrlPill = document.createElement('div')
			mainUrlPill.className = 'config-details-pill'
			const mainLink = document.createElement('a')
			mainLink.href = item.url1 || '#'
			mainLink.textContent = item.url1 || 'no url 1'
			if (mainLink.textContent !== 'no url 1') {
				mainLink.target = '_blank'
				mainUrlPill.appendChild(mainLink)
				main.appendChild(mainLabel)
				main.appendChild(mainUrlPill)
			}

			const metaLabel = document.createElement('div')
			metaLabel.className = 'config-details-item-label'
			metaLabel.textContent = item.label2 || 'Button 2'

			const metaUrlPill = document.createElement('div')
			metaUrlPill.className = 'config-details-pill'
			const metaLink = document.createElement('a')
			metaLink.href = item.url2 || '#'
			metaLink.textContent = item.url2 || 'no url 2'
			if (metaLink.textContent !== 'no url 2') {
				metaLink.target = '_blank'
				metaUrlPill.appendChild(metaLink)
				main.appendChild(metaLabel)
				main.appendChild(metaUrlPill)
			}
		}

		row.appendChild(main)
		row.appendChild(meta)
		listEl.appendChild(row)
	})
}

export function openConfigDetails(cfg: StoredConfig): void {
	const overlay = document.getElementById(
		'config-details-overlay'
	) as HTMLElement | null
	const nameEl = document.getElementById(
		'config-details-name'
	) as HTMLElement | null
	const cyclesEl = document.getElementById(
		'config-details-cycles'
	) as HTMLElement | null
	const imagesEl = document.getElementById(
		'config-details-images'
	) as HTMLElement | null
	const buttonsEl = document.getElementById(
		'config-details-buttons'
	) as HTMLElement | null
	if (!overlay || !nameEl || !cyclesEl || !imagesEl || !buttonsEl) {
		return
	}
	const state = cfg.state || {}
	nameEl.textContent = cfg.name || 'Unnamed profile'
	renderList(cyclesEl, state.cycles || [], 'cycles')
	renderList(imagesEl, state.imageCycles || [], 'images')
	renderList(buttonsEl, state.buttonPairs || [], 'buttons')
	overlay.dataset.open = 'true'
}

export function setupConfigDetailsOverlay(): void {
	const overlay = document.getElementById(
		'config-details-overlay'
	) as HTMLElement | null
	const closeBtn = document.getElementById(
		'config-details-close'
	) as HTMLButtonElement | null
	if (!overlay || !closeBtn) return

	function close(): void {
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
}
