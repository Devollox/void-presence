export interface ToastOptions {
	undoLabel?: string
	onUndo?: () => void
	duration?: number
	key?: string
}

const ANIMATION_DURATION = 220

const keyedToasts = new Map<string, { resetTimer: () => void }>()

function getRegion(): HTMLElement | null {
	return document.getElementById('toast-region')
}

export function showToast(message: string, options?: ToastOptions): void {
	const region = getRegion()
	if (!region) return

	const duration = options?.duration ?? 5000
	const onUndo = options?.onUndo
	const undoLabel = options?.undoLabel ?? 'Undo'
	const key = options?.key

	if (key) {
		const existing = keyedToasts.get(key)
		if (existing) {
			existing.resetTimer()
			return
		}
	}

	const toast = document.createElement('div')
	toast.className = 'toast'
	toast.setAttribute('role', 'status')
	toast.setAttribute('aria-live', 'polite')

	const msg = document.createElement('span')
	msg.className = 'toast-message'
	msg.textContent = message
	toast.appendChild(msg)

	let dismissed = false
	let timer: ReturnType<typeof setTimeout> | null = null

	const dismiss = (): void => {
		if (dismissed) return
		dismissed = true

		if (timer !== null) {
			clearTimeout(timer)
			timer = null
		}

		if (key) keyedToasts.delete(key)

		toast.dataset.closing = 'true'
		toast.dataset.visible = 'false'

		setTimeout(() => {
			toast.remove()
		}, ANIMATION_DURATION)
	}

	const resetTimer = (): void => {
		if (timer !== null) clearTimeout(timer)
		timer = setTimeout(dismiss, duration)
	}

	if (onUndo) {
		const undoBtn = document.createElement('button')
		undoBtn.type = 'button'
		undoBtn.className = 'toast-undo'
		undoBtn.textContent = undoLabel
		undoBtn.addEventListener('click', () => {
			onUndo()
			dismiss()
		})
		toast.appendChild(undoBtn)
	}

	if (key) keyedToasts.set(key, { resetTimer })

	region.appendChild(toast)

	requestAnimationFrame(() => {
		requestAnimationFrame(() => {
			toast.dataset.visible = 'true'
		})
	})

	timer = setTimeout(dismiss, duration)
}
