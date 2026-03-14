import {
	getRecentApps,
	removeRecentApp,
	updateRecentName,
} from './config-storage'

const copyToastId = 'vp-copy-toast'

function showCopyToast(): void {
	let toast = document.getElementById(copyToastId) as HTMLDivElement | null
	if (!toast) {
		toast = document.createElement('div')
		toast.id = copyToastId
		toast.className = 'copy-toast'
		toast.textContent = 'Client ID copied'
		document.body.appendChild(toast)
	}
	toast.dataset.visible = 'true'
	window.setTimeout(() => {
		toast && (toast.dataset.visible = 'false')
	}, 2000)
}

export function renderRecentApps(recentList: HTMLElement): void {
	const items = getRecentApps()
	recentList.innerHTML = ''
	if (!items.length) return

	items.forEach(item => {
		const row = document.createElement('div')
		row.className = 'cycle-row'
		row.dataset.id = item.id

		const inputsWrap = document.createElement('div')
		inputsWrap.className = 'cycle-inputs'

		const nameInput = document.createElement('input')
		nameInput.placeholder = 'App name'
		nameInput.value = item.name

		const idText = document.createElement('input')
		idText.value = item.id
		idText.readOnly = true
		idText.className = 'cycle-row input id-click'

		const remove = document.createElement('button')
		remove.className = 'remove-btn'
		remove.type = 'button'
		remove.textContent = '×'

		nameInput.addEventListener('input', () => {
			updateRecentName(item.id, nameInput.value)
		})

		row.addEventListener('click', async e => {
			const target = e.target as HTMLElement

			if (target.tagName === 'BUTTON' || target.closest('button') === remove) {
				return
			}

			if (target === nameInput || target.closest('input') === nameInput) {
				return
			}

			const inInputsWrap = !!target.closest('.cycle-inputs')
			if (!inInputsWrap) return

			try {
				if (navigator.clipboard && navigator.clipboard.writeText) {
					await navigator.clipboard.writeText(item.id)
					showCopyToast()
				}
			} catch {}
		})

		remove.addEventListener('click', e => {
			e.preventDefault()
			removeRecentApp(item.id)
			renderRecentApps(recentList)
		})

		row.appendChild(remove)
		inputsWrap.appendChild(nameInput)
		inputsWrap.appendChild(idText)
		row.appendChild(inputsWrap)
		recentList.appendChild(row)
	})
}
