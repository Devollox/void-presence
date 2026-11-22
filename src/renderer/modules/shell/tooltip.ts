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
		if (e.code.startsWith('Digit')) return e.code.replace('Digit', '')
		if (e.code.startsWith('Key')) return e.code.replace('Key', '').toLowerCase()
		if (e.code === 'Backslash') return '\\'
		if (e.code === 'BracketLeft') return '['
		if (e.code === 'BracketRight') return ']'
		if (e.code === 'ArrowLeft') return 'left'
		if (e.code === 'ArrowRight') return 'right'
		return normalizeKey(e.key)
	}

	const isEditableTarget = (target: EventTarget | null): boolean => {
		if (!(target instanceof HTMLElement)) return false
		const tag = target.tagName
		return tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || target.isContentEditable
	}

	const matchesShortcut = (e: KeyboardEvent, shortcutAttr: string): boolean => {
		const parts = shortcutAttr.split('+').map(normalizeKey)

		const needCtrl = parts.includes('ctrl')
		const needAlt = parts.includes('alt')
		const needShift = parts.includes('shift')
		const needMeta = parts.includes('meta')

		if (e.ctrlKey !== needCtrl) return false
		if (e.altKey !== needAlt) return false
		if (e.shiftKey !== needShift) return false
		if (e.metaKey !== needMeta) return false

		const mainKey = parts.find(p => !['ctrl', 'alt', 'shift', 'meta'].includes(p))
		if (!mainKey) return false

		return getEventKeyId(e) === mainKey
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
		const gap = 6
		const padding = 8

		let left = rect.left + rect.width / 2 - tipRect.width / 2
		left = Math.max(padding, Math.min(left, window.innerWidth - tipRect.width - padding))

		let top = rect.bottom + gap
		if (top + tipRect.height > window.innerHeight - padding) {
			top = rect.top - tipRect.height - gap
		}

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
				const keyId = normalizeKey(trimmed)
				const kbd = document.createElement('kbd')
				kbd.className = 'linear-kbd'
				kbd.setAttribute('data-key', keyId)
				if (pressedKeys.has(keyId)) {
					kbd.setAttribute('data-active', 'true')
				}
				kbd.textContent = trimmed
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
