import { setActiveView } from './views-nav'

let initialized = false

const helpTrigger = document.querySelector<HTMLButtonElement>('#help-menu-trigger')
const helpPopover = document.querySelector<HTMLElement>('#help-menu-popover')
const helpMenu = document.querySelector<HTMLElement>('#help-menu')
const settingsItem = document.querySelector<HTMLButtonElement>('#help-menu-settings')
const shortcutsItem = document.querySelector<HTMLButtonElement>('#help-menu-shortcuts')

function getHelpItems(): HTMLElement[] {
	if (!helpMenu) return []

	return Array.from(helpMenu.querySelectorAll<HTMLElement>('[role="menuitem"]')).filter(
		item => !item.hidden && !(item instanceof HTMLButtonElement && item.disabled)
	)
}

function positionHelpMenu(): void {
	if (!helpTrigger || !helpPopover) return

	const rect = helpTrigger.getBoundingClientRect()
	const padding = 8
	const gap = 5

	helpPopover.style.maxHeight = `${Math.max(0, window.innerHeight - padding * 2)}px`

	const menuRect = helpPopover.getBoundingClientRect()

	let left = rect.left + 2
	let top = rect.top - menuRect.height - gap - 79

	if (top < padding) {
		top = rect.bottom + gap
	}

	left = Math.max(padding, Math.min(left, window.innerWidth - menuRect.width - padding))

	top = Math.max(padding, Math.min(top, window.innerHeight - menuRect.height - padding))

	helpPopover.style.left = `${Math.round(left)}px`
	helpPopover.style.top = `${Math.round(top)}px`
}

function closeHelpMenu(restoreFocus = false): void {
	if (!helpTrigger || !helpPopover || helpPopover.hidden) return

	helpPopover.hidden = true
	helpTrigger.setAttribute('aria-expanded', 'false')

	if (restoreFocus) {
		helpTrigger.focus()
	}
}

function openHelpMenu(lastItem = false): void {
	if (!helpTrigger || !helpPopover) return

	helpPopover.hidden = false
	helpTrigger.setAttribute('aria-expanded', 'true')

	void helpPopover.offsetHeight

	positionHelpMenu()

	const items = getHelpItems()
	const item = lastItem ? items[items.length - 1] : items[0]

	item?.focus()
}

export default function setupHelpMenu(): void {
	if (initialized) return
	if (!helpTrigger || !helpPopover || !helpMenu) return

	initialized = true

	helpTrigger.addEventListener('click', () => {
		if (helpPopover.hidden) {
			openHelpMenu()
		} else {
			closeHelpMenu(true)
		}
	})

	helpTrigger.addEventListener('keydown', event => {
		if (event.key !== 'ArrowDown' && event.key !== 'ArrowUp') return

		event.preventDefault()
		openHelpMenu(event.key === 'ArrowUp')
	})

	helpMenu.addEventListener('keydown', event => {
		const items = getHelpItems()
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
			closeHelpMenu(true)
		} else if (event.key === 'Escape') {
			event.preventDefault()
			closeHelpMenu(true)
		}
	})

	document.addEventListener('keydown', event => {
		if (event.key !== 'Escape' || helpPopover.hidden) return

		event.preventDefault()
		closeHelpMenu(true)
	})

	document.addEventListener('pointerdown', event => {
		if (helpPopover.hidden) return

		const target = event.target

		if (!(target instanceof Node)) return
		if (helpPopover.contains(target) || helpTrigger.contains(target)) return

		closeHelpMenu()
	})

	document.addEventListener('focusin', event => {
		if (helpPopover.hidden) return

		const target = event.target

		if (!(target instanceof Node)) return
		if (helpPopover.contains(target) || helpTrigger.contains(target)) return

		closeHelpMenu()
	})

	window.addEventListener('resize', () => {
		if (!helpPopover.hidden) {
			positionHelpMenu()
		}
	})

	document.addEventListener(
		'scroll',
		event => {
			if (helpPopover.hidden) return
			if (event.target instanceof Node && helpPopover.contains(event.target)) {
				return
			}

			closeHelpMenu(true)
		},
		true
	)

	settingsItem?.addEventListener('click', () => {
		closeHelpMenu(true)
		setActiveView('settings')
	})

	shortcutsItem?.addEventListener('click', () => {
		closeHelpMenu(true)
	})
}
