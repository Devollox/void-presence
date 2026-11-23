export default function setupTooltips(): void {
	const tooltip = document.createElement('div')
	tooltip.className = 'linear-tooltip'
	tooltip.setAttribute('role', 'tooltip')
	document.body.appendChild(tooltip)

	let showTimer: number | null = null
	let activeTarget: HTMLElement | null = null
	const pressedKeys = new Set<string>()

	const clearTimer = (): void => {
		if (showTimer !== null) {
			window.clearTimeout(showTimer)
			showTimer = null
		}
	}

	const normalizeKey = (raw: string): string => {
		const k = raw.trim().toLowerCase()
		if (k === 'control' || k === 'ctrl') return 'ctrl'
		if (k === 'meta' || k === 'cmd' || k === 'command' || k === 'os') return 'meta'
		if (k === 'option' || k === 'alt') return 'alt'
		if (k === ' ' || k === 'spacebar') return 'space'
		if (k === 'arrowleft' || k === 'left' || k === '←') return 'left'
		if (k === 'arrowright' || k === 'right' || k === '→') return 'right'
		return k
	}

	const getEventKeyId = (e: KeyboardEvent): string => {
		const { code } = e

		if (/^Key[A-Z]$/.test(code)) {
			return code.slice(3).toLowerCase()
		}

		if (/^Digit[0-9]$/.test(code)) {
			return code.slice(5)
		}

		const keys: Record<string, string> = {
			ControlLeft: 'ctrl',
			ControlRight: 'ctrl',
			ShiftLeft: 'shift',
			ShiftRight: 'shift',
			AltLeft: 'alt',
			AltRight: 'alt',
			MetaLeft: 'meta',
			MetaRight: 'meta',
			Space: 'space',
			ArrowLeft: 'left',
			ArrowRight: 'right',
			ArrowUp: 'up',
			ArrowDown: 'down',
			Backslash: '\\',
			BracketLeft: '[',
			BracketRight: ']',
			Semicolon: ';',
			Quote: "'",
			Comma: ',',
			Period: '.',
			Slash: '/',
			Minus: '-',
			Equal: '=',
			Backquote: '`',
			Escape: 'escape',
			Enter: 'enter',
			Tab: 'tab',
			Backspace: 'backspace',
			Delete: 'delete',
			Home: 'home',
			End: 'end',
			PageUp: 'pageup',
			PageDown: 'pagedown',
		}

		return keys[code] ?? normalizeKey(e.key)
	}

	const isEditableTarget = (target: EventTarget | null): boolean => {
		if (!(target instanceof HTMLElement)) return false
		const tag = target.tagName
		return tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || target.isContentEditable
	}

	const matchesShortcut = (e: KeyboardEvent, shortcutAttr: string): boolean => {
		const parts = shortcutAttr
			.split('+')
			.map(normalizeKey)
			.filter(part => part !== '' && part !== 'then')

		const modifiers = new Set(['ctrl', 'alt', 'shift', 'meta'])

		if (e.ctrlKey !== parts.includes('ctrl')) return false
		if (e.altKey !== parts.includes('alt')) return false
		if (e.shiftKey !== parts.includes('shift')) return false
		if (e.metaKey !== parts.includes('meta')) return false

		const keys = parts.filter(part => !modifiers.has(part))

		if (!keys.length) return false

		const lastKey = keys[keys.length - 1]

		if (getEventKeyId(e) !== lastKey) return false

		return keys.every(key => pressedKeys.has(key))
	}

	const syncPressedKeysUI = (): void => {
		document.querySelectorAll<HTMLElement>('.linear-kbd[data-key]').forEach(kbd => {
			const keyId = kbd.getAttribute('data-key') ?? ''
			if (pressedKeys.has(keyId)) {
				kbd.setAttribute('data-active', 'true')
			} else {
				kbd.removeAttribute('data-active')
			}
		})
	}

	const updatePosition = (target: HTMLElement): void => {
		const rect = target.getBoundingClientRect()
		const tipRect = tooltip.getBoundingClientRect()
		const gap = 8
		const padding = 8
		const isSidebar = target.closest('.app-sidebar') !== null

		let left: number
		let top: number

		if (isSidebar) {
			left = rect.right + gap
			top = rect.top + (rect.height - tipRect.height) / 2

			if (left + tipRect.width > window.innerWidth - padding) {
				left = rect.left - tipRect.width - gap
			}
		} else {
			left = rect.left + (rect.width - tipRect.width) / 2
			top = rect.bottom + gap

			if (top + tipRect.height > window.innerHeight - padding) {
				top = rect.top - tipRect.height - gap
			}
		}

		left = Math.max(padding, Math.min(left, window.innerWidth - tipRect.width - padding))

		top = Math.max(padding, Math.min(top, window.innerHeight - tipRect.height - padding))

		tooltip.style.left = `${Math.round(left)}px`
		tooltip.style.top = `${Math.round(top)}px`
	}

	const renderContent = (target: HTMLElement): void => {
		const text = target.getAttribute('data-tooltip') ?? ''
		const shortcut = target.getAttribute('data-shortcut')

		tooltip.innerHTML = ''

		const label = document.createElement('span')
		label.className = 'linear-tooltip-label'
		label.textContent = text
		tooltip.appendChild(label)

		if (shortcut) {
			const keysWrapper = document.createElement('span')
			keysWrapper.className = 'linear-tooltip-keys'

			shortcut.split('+').forEach(key => {
				const trimmed = key.trim()

				if (!trimmed) return

				if (trimmed.toLowerCase() === 'then') {
					const separator = document.createElement('span')
					separator.className = 'linear-tooltip-then'
					separator.textContent = 'then'
					keysWrapper.appendChild(separator)
					return
				}

				const keyId = normalizeKey(trimmed)
				const kbd = document.createElement('kbd')

				kbd.className = 'linear-kbd'
				kbd.setAttribute('data-key', keyId)
				kbd.textContent = trimmed

				if (pressedKeys.has(keyId)) {
					kbd.setAttribute('data-active', 'true')
				}

				keysWrapper.appendChild(kbd)
			})

			tooltip.appendChild(keysWrapper)
		}
	}

	const showTooltip = (target: HTMLElement): void => {
		renderContent(target)
		tooltip.setAttribute('data-visible', 'true')
		updatePosition(target)
	}

	const hideTooltip = (): void => {
		clearTimer()
		activeTarget = null
		tooltip.removeAttribute('data-visible')
	}

	document.addEventListener('pointerover', (e: PointerEvent) => {
		if (e.pointerType !== 'mouse' || e.buttons !== 0) return
		const target = (e.target as HTMLElement | null)?.closest<HTMLElement>('[data-tooltip]')
		if (!target || target === activeTarget) return

		clearTimer()
		activeTarget = target

		const delay = tooltip.hasAttribute('data-visible') ? 60 : 350
		showTimer = window.setTimeout(() => {
			if (activeTarget === target) {
				showTooltip(target)
			}
		}, delay)
	})

	document.addEventListener('pointerout', (e: PointerEvent) => {
		if (!activeTarget) return
		const related = e.relatedTarget as HTMLElement | null
		if (related && activeTarget.contains(related)) return
		hideTooltip()
	})

	document.addEventListener('pointerdown', () => {
		hideTooltip()
	})

	window.addEventListener('keydown', (e: KeyboardEvent) => {
		if (e.ctrlKey) pressedKeys.add('ctrl')
		if (e.altKey) pressedKeys.add('alt')
		if (e.shiftKey) pressedKeys.add('shift')
		if (e.metaKey) pressedKeys.add('meta')

		pressedKeys.add(getEventKeyId(e))
		syncPressedKeysUI()

		if (e.repeat || isEditableTarget(e.target)) return

		const shortcutElements = document.querySelectorAll<HTMLElement>('[data-shortcut]')
		for (const el of shortcutElements) {
			const shortcut = el.getAttribute('data-shortcut')
			if (!shortcut || !matchesShortcut(e, shortcut)) continue
			if ((el as HTMLButtonElement).disabled) return

			e.preventDefault()
			el.setAttribute('data-key-pressed', 'true')
			el.click()
			break
		}
	})

	window.addEventListener('keyup', (e: KeyboardEvent) => {
		if (!e.ctrlKey) pressedKeys.delete('ctrl')
		if (!e.altKey) pressedKeys.delete('alt')
		if (!e.shiftKey) pressedKeys.delete('shift')
		if (!e.metaKey) pressedKeys.delete('meta')

		pressedKeys.delete(getEventKeyId(e))
		syncPressedKeysUI()

		document.querySelectorAll<HTMLElement>('[data-key-pressed="true"]').forEach(el => {
			el.removeAttribute('data-key-pressed')
		})
	})

	window.addEventListener('blur', () => {
		pressedKeys.clear()
		syncPressedKeysUI()
		document.querySelectorAll<HTMLElement>('[data-key-pressed="true"]').forEach(el => {
			el.removeAttribute('data-key-pressed')
		})
		hideTooltip()
	})
}
