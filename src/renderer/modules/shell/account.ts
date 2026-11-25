import type { AccountProfile } from 'src/types/types'
import { setActiveView } from './views-nav'
import { syncSidebarAccount } from './sidebar-account'
import i18n from '../core/i18n'

const STORAGE_KEYS = ['authorId', 'authorName', 'authorProvider', 'authorAvatar'] as const

let initialized = false
let openingBrowser = false

function cleanText(value: unknown): string {
	return typeof value === 'string' ? value.trim() : ''
}

function getAvatarUrl(value: unknown): string {
	const raw = cleanText(value)

	if (!raw) return ''

	try {
		const url = new URL(raw)

		if (url.protocol !== 'https:') return ''
		if (url.hostname !== 'cdn.discordapp.com') return ''
		if (url.username || url.password || url.port) return ''

		return url.href
	} catch {
		return ''
	}
}

function readProfile(): AccountProfile | null {
	try {
		const authorId = cleanText(localStorage.getItem('authorId'))

		if (!authorId) return null

		return {
			authorId,
			authorName: cleanText(localStorage.getItem('authorName')),
			provider: cleanText(localStorage.getItem('authorProvider')),
			avatar: getAvatarUrl(localStorage.getItem('authorAvatar')),
		}
	} catch {
		return null
	}
}

function getInitials(name: string): string {
	const words = name
		.replace(/[^\p{L}\p{N}\s]/gu, '')
		.trim()
		.split(/\s+/)
		.filter(Boolean)

	if (words.length === 0) return 'VP'

	if (words.length === 1) {
		return Array.from(words[0]!).slice(0, 2).join('').toUpperCase()
	}

	return `${Array.from(words[0]!)[0] ?? ''}${Array.from(words[1]!)[0] ?? ''}`.toUpperCase()
}

function setFeedback(message: string, isError = false): void {
	const feedback = document.querySelector<HTMLElement>('#account-feedback')

	if (!feedback) return

	feedback.textContent = message
	feedback.hidden = !message
	feedback.dataset.error = String(isError)
}

function syncAuthorFields(profile: AccountProfile | null): void {
	const input = document.querySelector<HTMLInputElement>('#config-author-input')
	const label = document.querySelector<HTMLElement>('#config-author-label')

	if (input) {
		input.value = profile?.authorId ?? ''
	}

	if (label) {
		label.textContent = profile ? cleanText(profile.authorName) || profile.authorId : ''
	}
}

export function refreshAccountUI(): void {
	const profile = readProfile()

	syncSidebarAccount(profile)

	const name = profile ? cleanText(profile.authorName) || 'Void Presence' : 'Void Presence'

	const title = document.querySelector<HTMLElement>('.workspace-title')
	const image = document.querySelector<HTMLImageElement>('.workspace-avatar-image')
	const fallback = document.querySelector<HTMLElement>('.workspace-avatar-fallback')
	const login = document.querySelector<HTMLButtonElement>('#account-login')
	const logout = document.querySelector<HTMLButtonElement>('#account-logout')

	if (title) {
		title.textContent = name
	}

	if (login) {
		login.hidden = profile !== null
		login.disabled = openingBrowser

		const label = login.querySelector('span')

		if (label) {
			label.textContent = openingBrowser
				? i18n.t('account.openingBrowser')
				: i18n.t('account.login')
		}
	}

	if (logout) {
		logout.hidden = profile === null
	}

	if (!image || !fallback) return

	fallback.textContent = profile ? getInitials(name) : 'VP'

	const avatar = profile ? getAvatarUrl(profile.avatar) : ''

	if (avatar && image.getAttribute('src') === avatar) {
		return
	}

	image.onload = null
	image.onerror = null
	image.hidden = true
	fallback.hidden = false

	if (!avatar) {
		image.removeAttribute('src')
		return
	}

	image.referrerPolicy = 'no-referrer'

	image.onload = () => {
		image.hidden = false
		fallback.hidden = true
	}

	image.onerror = () => {
		image.hidden = true
		fallback.hidden = false
	}

	image.src = avatar
}

export function acceptAccountProfile(profile: AccountProfile): void {
	const authorId = cleanText(profile.authorId)

	if (!authorId) {
		throw new Error('The profile does not contain an author ID.')
	}

	const normalized: AccountProfile = {
		authorId,
		authorName: cleanText(profile.authorName),
		provider: cleanText(profile.provider),
		avatar: getAvatarUrl(profile.avatar),
	}

	const values: Record<(typeof STORAGE_KEYS)[number], string> = {
		authorId: normalized.authorId,
		authorName: cleanText(normalized.authorName),
		authorProvider: cleanText(normalized.provider),
		authorAvatar: getAvatarUrl(normalized.avatar),
	}

	for (const key of STORAGE_KEYS) {
		const value = values[key]

		if (value) {
			localStorage.setItem(key, value)
		} else {
			localStorage.removeItem(key)
		}
	}

	setFeedback('')
	syncAuthorFields(normalized)
	refreshAccountUI()
}

export function clearAccountProfile(): void {
	for (const key of STORAGE_KEYS) {
		localStorage.removeItem(key)
	}

	syncAuthorFields(null)
	setFeedback('')
	refreshAccountUI()
}

export default function setupAccountModal(): void {
	if (initialized) return

	const trigger = document.querySelector<HTMLButtonElement>('#account-trigger')
	const popover = document.querySelector<HTMLElement>('#account-popover')
	const menu = document.querySelector<HTMLElement>('#account-menu')
	const settings = document.querySelector<HTMLButtonElement>('#account-settings')
	const login = document.querySelector<HTMLButtonElement>('#account-login')
	const logout = document.querySelector<HTMLButtonElement>('#account-logout')

	if (!trigger || !popover || !menu || !settings || !login || !logout) return

	initialized = true

	const getItems = (): HTMLButtonElement[] => {
		return Array.from(menu.querySelectorAll<HTMLButtonElement>('[role="menuitem"]')).filter(
			item => !item.hidden && !item.disabled
		)
	}

	const positionMenu = (): void => {
		const rect = trigger.getBoundingClientRect()
		const padding = 8
		const gap = 5

		popover.style.maxHeight = `${Math.max(0, window.innerHeight - padding * 2)}px`

		const menuRect = popover.getBoundingClientRect()

		let left = rect.left
		let top = rect.top - menuRect.height - gap

		if (top < padding) {
			top = rect.bottom + gap
		}

		left = Math.max(padding, Math.min(left, window.innerWidth - menuRect.width - padding))
		top = Math.max(padding, Math.min(top, window.innerHeight - menuRect.height - padding))

		popover.style.left = `${Math.round(left)}px`
		popover.style.top = `${Math.round(top)}px`
	}

	const closeMenu = (restoreFocus = false): void => {
		if (popover.hidden) return

		popover.hidden = true
		trigger.setAttribute('aria-expanded', 'false')

		if (restoreFocus) {
			trigger.focus()
		}
	}

	const openMenu = (lastItem = false): void => {
		setFeedback('')
		refreshAccountUI()

		popover.hidden = false
		trigger.setAttribute('aria-expanded', 'true')

		positionMenu()

		const items = getItems()
		const item = lastItem ? items[items.length - 1] : items[0]

		item?.focus()
	}

	trigger.addEventListener('click', () => {
		if (popover.hidden) {
			openMenu()
		} else {
			closeMenu(true)
		}
	})

	trigger.addEventListener('keydown', event => {
		if (event.key !== 'ArrowDown' && event.key !== 'ArrowUp') return

		event.preventDefault()
		openMenu(event.key === 'ArrowUp')
	})

	menu.addEventListener('keydown', event => {
		const items = getItems()
		const index = items.findIndex(item => item === document.activeElement)

		if (event.key === 'ArrowDown') {
			event.preventDefault()

			if (items.length > 0) {
				items[(index + 1) % items.length]?.focus()
			}
		} else if (event.key === 'ArrowUp') {
			event.preventDefault()

			if (items.length > 0) {
				items[(index - 1 + items.length) % items.length]?.focus()
			}
		} else if (event.key === 'Home') {
			event.preventDefault()
			items[0]?.focus()
		} else if (event.key === 'End') {
			event.preventDefault()
			items[items.length - 1]?.focus()
		} else if (event.key === 'Tab') {
			closeMenu(true)
		} else if (
			event.key.length === 1 &&
			!event.ctrlKey &&
			!event.altKey &&
			!event.metaKey &&
			event.key !== ' '
		) {
			const ordered = [...items.slice(index + 1), ...items.slice(0, index + 1)]

			const match = ordered.find(item =>
				item.textContent?.trim().toLowerCase().startsWith(event.key.toLowerCase())
			)

			if (match) {
				event.preventDefault()
				match.focus()
			}
		}
	})

	document.addEventListener('keydown', event => {
		if (event.key !== 'Escape' || popover.hidden) return

		event.preventDefault()
		closeMenu(true)
	})

	document.addEventListener('pointerdown', event => {
		if (popover.hidden) return

		const target = event.target

		if (!(target instanceof Node)) return
		if (popover.contains(target) || trigger.contains(target)) return

		closeMenu()
	})

	document.addEventListener('focusin', event => {
		if (popover.hidden) return

		const target = event.target

		if (!(target instanceof Node)) return
		if (popover.contains(target) || trigger.contains(target)) return

		closeMenu()
	})

	window.addEventListener('resize', () => {
		if (!popover.hidden) {
			positionMenu()
		}
	})

	document.addEventListener(
		'scroll',
		event => {
			if (popover.hidden) return
			if (event.target instanceof Node && popover.contains(event.target)) return

			closeMenu(true)
		},
		true
	)

	window.addEventListener('blur', () => {
		closeMenu()
	})

	settings.addEventListener('click', () => {
		closeMenu(true)
		setActiveView('settings')
	})

	login.addEventListener('click', async () => {
		if (openingBrowser) return

		openingBrowser = true
		setFeedback('')
		refreshAccountUI()

		try {
			const api = window.electronAPI

			if (!api?.openLogin) {
				throw new Error('electronAPI.openLogin is missing. Check preload.')
			}

			closeMenu(true)
			await api.openLogin()
		} catch (error) {
			const message = error instanceof Error ? error.message : String(error)

			console.error('[account:open-login]', error)

			openMenu()
			setFeedback(message, true)
			positionMenu()
		} finally {
			openingBrowser = false
			refreshAccountUI()
		}
	})

	logout.addEventListener('click', () => {
		try {
			clearAccountProfile()
			closeMenu(true)
		} catch {
			setFeedback(i18n.t('account.logoutError'), true)
			positionMenu()
		}
	})

	window.addEventListener('storage', event => {
		if (event.key === null || STORAGE_KEYS.some(key => key === event.key)) {
			closeMenu(true)
			syncAuthorFields(readProfile())
			refreshAccountUI()
		}
	})

	refreshAccountUI()
}
