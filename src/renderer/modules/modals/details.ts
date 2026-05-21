import {
	ButtonPair,
	CycleEntry,
	ImageCycleEntry,
	PartyCycleEntry,
	StoredConfig,
} from '../../../types/types'

type RenderItem = CycleEntry | ImageCycleEntry | ButtonPair | PartyCycleEntry

function renderList(
	listEl: HTMLElement,
	items: RenderItem[],
	type: 'cycles' | 'images' | 'buttons' | 'party',
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
					: type === 'buttons'
						? 'No buttons configured'
						: 'No party configured'
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
			const it = item as CycleEntry
			const label = document.createElement('div')
			label.className = 'config-details-item-label'
			label.textContent = it.details || 'No details'

			const sub = document.createElement('div')
			sub.className = 'config-details-item-sub'
			sub.textContent = it.state || 'No state'

			main.appendChild(label)
			main.appendChild(sub)
		} else if (type === 'images') {
			const it = item as ImageCycleEntry
			const label = document.createElement('div')
			label.className = 'config-details-item-label'
			label.textContent = it.largeText || 'no large text'

			const largeUrlPill = document.createElement('div')
			largeUrlPill.className = 'config-details-pill'
			const largeLink = document.createElement('a')
			largeLink.href = it.largeImage || '#'
			largeLink.textContent = it.largeImage || 'no large url'
			largeLink.target = '_blank'
			largeUrlPill.appendChild(largeLink)

			main.appendChild(label)
			main.appendChild(largeUrlPill)

			const sub = document.createElement('div')
			sub.className = 'config-details-item-sub'
			sub.textContent = it.smallText || 'no small text'

			const smallUrlPill = document.createElement('div')
			smallUrlPill.className = 'config-details-pill'
			const smallLink = document.createElement('a')
			smallLink.href = it.smallImage || '#'
			smallLink.textContent = it.smallImage || 'no'
			if (smallLink.textContent !== 'no') {
				smallLink.target = '_blank'
				smallUrlPill.appendChild(smallLink)
				meta.appendChild(sub)
				meta.appendChild(smallUrlPill)
			}
		} else if (type === 'buttons') {
			const it = item as ButtonPair

			const col1 = document.createElement('div')
			const col1Label = document.createElement('div')
			col1Label.className = 'config-details-item-label'
			col1Label.textContent = it.label1 || ''
			const col1Url = document.createElement('div')
			col1Url.className = 'config-details-pill'
			const col1Link = document.createElement('a')
			col1Link.href = it.url1 || ''
			col1Link.textContent = it.url1 || ''
			if (it.url1) col1Link.target = '_blank'
			col1Url.appendChild(col1Link)
			col1.appendChild(col1Label)
			col1.appendChild(col1Url)

			const col2 = document.createElement('div')
			const col2Label = document.createElement('div')
			col2Label.className = 'config-details-item-label'
			col2Label.textContent = it.label2 || ''
			const col2Url = document.createElement('div')
			col2Url.className = 'config-details-pill'
			const col2Link = document.createElement('a')
			col2Link.href = it.url2 || ''
			col2Link.textContent = it.url2 || ''
			if (it.url2) col2Link.target = '_blank'
			col2Url.appendChild(col2Link)
			col2.appendChild(col2Label)
			col2.appendChild(col2Url)

			main.appendChild(col1)
			main.appendChild(col2)
		} else if (type === 'party') {
			const it = item as PartyCycleEntry
			const label = document.createElement('div')
			label.className = 'config-details-item-label'
			label.textContent = 'Party size'

			const sub = document.createElement('div')
			sub.className = 'config-details-item-sub'
			sub.textContent = `Current: ${it.sizeCurrent ?? '-'} | Max: ${
				it.sizeMax ?? '-'
			}`

			main.appendChild(label)
			main.appendChild(sub)
		}

		row.appendChild(main)
		row.appendChild(meta)
		listEl.appendChild(row)
	})
}

export function openConfigDetails(cfg: StoredConfig): void {
	const overlay = document.getElementById(
		'config-details-overlay',
	) as HTMLElement | null
	const nameEl = document.getElementById(
		'config-details-name',
	) as HTMLElement | null
	const cyclesEl = document.getElementById(
		'config-details-cycles',
	) as HTMLElement | null
	const imagesEl = document.getElementById(
		'config-details-images',
	) as HTMLElement | null
	const buttonsEl = document.getElementById(
		'config-details-buttons',
	) as HTMLElement | null
	const partyEl = document.getElementById(
		'config-details-party',
	) as HTMLElement | null

	if (!overlay || !nameEl || !cyclesEl || !imagesEl || !buttonsEl || !partyEl) {
		return
	}

	const state = cfg.state || {}

	nameEl.textContent = cfg.name || 'Unnamed profile'
	renderList(cyclesEl, state.cycles || [], 'cycles')
	renderList(imagesEl, state.imageCycles || [], 'images')
	renderList(buttonsEl, state.buttonPairs || [], 'buttons')
	renderList(partyEl, Array.isArray(state.party) ? state.party : [], 'party')

	overlay.dataset.open = 'true'
}

export function setupConfigDetailsOverlay(): void {
	const overlay = document.getElementById(
		'config-details-overlay',
	) as HTMLElement | null
	const closeBtn = document.getElementById(
		'config-details-close',
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
