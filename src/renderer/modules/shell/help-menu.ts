import { setActiveView } from './views-nav'
import { openShortcutsModal } from './shortcuts-modal'

let initialized = false

export default function setupHelpMenu(): void {
	if (initialized) return

	const helpTrigger = document.querySelector<HTMLButtonElement>('#help-menu-trigger')
	const helpPopover = document.querySelector<HTMLElement>('#help-menu-popover')
	const helpMenu = document.querySelector<HTMLElement>('#help-menu')
	const settingsItem = document.querySelector<HTMLButtonElement>('#help-menu-settings')
	const shortcutsItem = document.querySelector<HTMLButtonElement>('#help-menu-shortcuts')

	if (!helpTrigger || !helpPopover || !helpMenu) return

	initialized = true

	const getItems = (): HTMLElement[] => {
		return Array.from(helpMenu.querySelectorAll<HTMLElement>('[role="menuitem"]')).filter(
			item => !item.hidden && !(item instanceof HTMLButtonElement && item.disabled)
		)
	}

	const positionMenu = (): void => {
		const rect = helpTrigger.getBoundingClientRect()
		const padding = 8
		const gap = 5

		helpPopover.style.maxHeight = `${Math.max(0, window.innerHeight - padding * 2)}px`

		const menuRect = helpPopover.getBoundingClientRect()

		let left = rect.left
		let top = rect.top - menuRect.height - gap - 5

		if (top < padding) {
			top = rect.bottom + gap
		}

		left = Math.max(padding, Math.min(left, window.innerWidth - menuRect.width - padding))
		top = Math.max(padding, Math.min(top, window.innerHeight - menuRect.height - padding))

		helpPopover.style.left = `${Math.round(left)}px`
		helpPopover.style.top = `${Math.round(top)}px`
	}

	const closeMenu = (restoreFocus = false): void => {
		if (helpPopover.hidden) return

		helpPopover.hidden = true
		helpTrigger.setAttribute('aria-expanded', 'false')

		if (restoreFocus) {
			helpTrigger.focus()
		}
	}

	const openMenu = (lastItem = false, focusFirst = true): void => {
		helpPopover.hidden = false
		helpTrigger.setAttribute('aria-expanded', 'true')

		positionMenu()

		if (focusFirst) {
			const items = getItems()
			const item = lastItem ? items[items.length - 1] : items[0]

			item?.focus()
		}
	}

	helpTrigger.addEventListener('click', () => {
		if (helpPopover.hidden) {
			openMenu(false, false)
		} else {
			closeMenu(true)
		}
	})

	helpTrigger.addEventListener('keydown', event => {
		if (event.key !== 'ArrowDown' && event.key !== 'ArrowUp') return

		event.preventDefault()
		openMenu(event.key === 'ArrowUp', true)
	})

	helpMenu.addEventListener('keydown', event => {
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
		} else if (event.key === 'Escape') {
			event.preventDefault()
			closeMenu(true)
		}
	})

	document.addEventListener('keydown', event => {
		if (event.key !== 'Escape' || helpPopover.hidden) return

		event.preventDefault()
		closeMenu(true)
	})

	document.addEventListener('pointerdown', event => {
		if (helpPopover.hidden) return

		const target = event.target

		if (!(target instanceof Node)) return
		if (helpPopover.contains(target) || helpTrigger.contains(target)) return

		closeMenu()
	})

	document.addEventListener('focusin', event => {
		if (helpPopover.hidden) return

		const target = event.target

		if (!(target instanceof Node)) return
		if (helpPopover.contains(target) || helpTrigger.contains(target)) return

		closeMenu()
	})

	window.addEventListener('resize', () => {
		if (!helpPopover.hidden) {
			positionMenu()
		}
	})

	document.addEventListener(
		'scroll',
		event => {
			if (helpPopover.hidden) return
			if (event.target instanceof Node && helpPopover.contains(event.target)) return

			closeMenu(true)
		},
		true
	)

	window.addEventListener('blur', () => {
		closeMenu()
	})

	settingsItem?.addEventListener('click', () => {
		closeMenu(true)
		setActiveView('settings')
	})

	shortcutsItem?.addEventListener('click', () => {
		closeMenu(true)
		openShortcutsModal()
	})
}
