import { t } from 'i18next'
import { updateRecentName } from '../config-page/config-storage'
import { setActiveView } from '../shell/views-nav'
import { setupToasts } from './toasts'

export type RecentApp = {
	id: string
	name?: string
}

export function renderRecentApps(recentList: HTMLElement, items: RecentApp[]): void {
	recentList.innerHTML = ''
	if (!items.length) return

	const { showConfigCopiedToast } = setupToasts()

	items.forEach((item, index) => {
		const row = document.createElement('div')
		row.className = 'cycle-row'
		row.dataset.id = item.id
		row.dataset.index = String(index)

		const handle = document.createElement('div')
		handle.className = 'drag-handle'
		handle.draggable = true

		const inputsWrap = document.createElement('div')
		inputsWrap.className = 'cycle-inputs'

		const nameInput = document.createElement('input')
		nameInput.placeholder = t('recent.appNamePlaceholder') || 'App name'
		nameInput.value = item.name || ''

		const idText = document.createElement('input')
		idText.value = item.id
		idText.readOnly = true
		idText.className = 'cycle-row input id-click'

		const remove = document.createElement('button')
		remove.className = 'remove-btn'
		remove.type = 'button'
		remove.textContent = '×'

		const useBtn = document.createElement('button')
		useBtn.className = 'btn'
		useBtn.type = 'button'
		useBtn.textContent = '↻'

		const appNotFoundText = t('recent.appNotFound')
		const fetchFailedText = t('recent.fetchFailed')

		if (item.name === appNotFoundText || item.name === fetchFailedText) {
			nameInput.disabled = true
			nameInput.classList.add('app-not-found')
			useBtn.disabled = true
			useBtn.classList.add('app-not-found')
		}

		nameInput.addEventListener('input', () => {
			nameInput.disabled = false
			nameInput.classList.remove('app-not-found')
			useBtn.disabled = false
			useBtn.classList.remove('app-not-found')
			updateRecentName(item.id, nameInput.value)
			item.name = nameInput.value
		})

		if (!item.name && !(item as any)._checked) {
			;(item as any)._checked = true

			const fetchId = item.id

			fetch(`https://discord.com/api/v10/applications/${fetchId}/rpc`)
				.then(res => res.json().catch(() => null as any))
				.then(app => {
					if (fetchId !== item.id) return

					if (app?.name) {
						nameInput.value = app.name
						nameInput.title = `Discord app: ${app.name}`
						nameInput.disabled = false
						nameInput.classList.remove('app-not-found')
						useBtn.disabled = false
						useBtn.classList.remove('app-not-found')
						updateRecentName(fetchId, app.name)
						item.name = app.name
					} else {
						nameInput.value = appNotFoundText
						nameInput.disabled = true
						nameInput.classList.add('app-not-found')
						nameInput.title = `ID ${fetchId} invalid`
						useBtn.disabled = true
						useBtn.classList.add('app-not-found')
						updateRecentName(fetchId, appNotFoundText)
						item.name = appNotFoundText
					}
				})
				.catch(err => {
					console.warn(`Failed to fetch app ${item.id}:`, err)
					if (fetchId !== item.id) return
					nameInput.value = fetchFailedText
					nameInput.disabled = true
					nameInput.classList.add('app-not-found')
					nameInput.title = `Network error for ID ${item.id}`
					useBtn.disabled = true
					useBtn.classList.add('app-not-found')
					updateRecentName(fetchId, fetchFailedText)
					item.name = fetchFailedText
				})
		}

		row.addEventListener('click', async e => {
			const target = e.target as HTMLElement

			if (
				target === remove ||
				target.closest('button') === remove ||
				target === useBtn ||
				target.closest('button') === useBtn
			) {
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
					showConfigCopiedToast()
				}
			} catch {}
		})

		remove.addEventListener('click', e => {
			e.preventDefault()
			row.dispatchEvent(
				new CustomEvent('recent:remove', {
					bubbles: true,
					detail: { id: item.id },
				})
			)
		})

		useBtn.addEventListener('click', async e => {
			e.preventDefault()

			if (useBtn.disabled) return

			try {
				const input = document.getElementById('client-id-input') as HTMLInputElement | null

				if (input) {
					input.value = item.id
				}

				localStorage.setItem('clientId', item.id)

				if (window.electronAPI?.useRecentClientId) {
					await window.electronAPI.useRecentClientId(item.id)
				}

				setActiveView('main')
			} catch (err: any) {
				console.error('Failed to use recent clientId:', err)
			}
		})

		row.appendChild(handle)
		row.appendChild(useBtn)
		inputsWrap.appendChild(nameInput)
		inputsWrap.appendChild(idText)
		row.appendChild(inputsWrap)
		row.appendChild(remove)
		recentList.appendChild(row)
	})
}
