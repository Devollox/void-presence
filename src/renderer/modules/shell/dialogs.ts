type DialogElements = {
	dialog: HTMLDivElement | null
	trigger: HTMLButtonElement | null
}

const getDialog = (id: string): HTMLDivElement | null =>
	document.getElementById(id) as HTMLDivElement | null

const getButton = (id: string): HTMLButtonElement | null =>
	document.getElementById(id) as HTMLButtonElement | null

const openDialog = (elements: DialogElements): void => {
	const { dialog, trigger } = elements

	if (!dialog) return

	dialog.removeAttribute('data-closing')
	dialog.removeAttribute('hidden')

	requestAnimationFrame(() => {
		dialog.dataset.open = 'true'
	})

	trigger?.setAttribute('aria-expanded', 'true')
}

const closeDialog = (elements: DialogElements): void => {
	const { dialog, trigger } = elements

	if (!dialog || dialog.hasAttribute('hidden')) return

	dialog.dataset.open = 'false'
	dialog.setAttribute('data-closing', '')
	trigger?.setAttribute('aria-expanded', 'false')

	const panel = dialog.querySelector<HTMLElement>('.dialog-panel')

	const finish = (): void => {
		dialog.setAttribute('hidden', '')
		dialog.removeAttribute('data-closing')
		dialog.removeAttribute('data-open')
	}

	if (!panel) {
		finish()
		return
	}

	panel.addEventListener(
		'transitionend',
		(event: TransitionEvent) => {
			if (
				event.target === panel &&
				event.propertyName === 'opacity' &&
				dialog.hasAttribute('data-closing')
			) {
				finish()
			}
		},
		{ once: true }
	)
}

export function setupDialogs(): void {
	const activityDialog: DialogElements = {
		dialog: getDialog('activity-type-dialog'),
		trigger: getButton('activity-type-trigger'),
	}

	const timestampDialog: DialogElements = {
		dialog: getDialog('timestamp-modal'),
		trigger: getButton('timestamp-modal-trigger'),
	}

	const activityClose = document.getElementById('activity-type-dialog-close')
	const timestampClose = document.getElementById('timestamp-modal-close')

	const activityBackdrop = document.getElementById('activity-type-dialog-backdrop')
	const timestampBackdrop = document.getElementById('timestamp-modal-backdrop')

	activityDialog.trigger?.addEventListener('click', () => openDialog(activityDialog))

	timestampDialog.trigger?.addEventListener('click', () => openDialog(timestampDialog))

	activityClose?.addEventListener('click', () => closeDialog(activityDialog))
	timestampClose?.addEventListener('click', () => closeDialog(timestampDialog))

	activityBackdrop?.addEventListener('click', () => closeDialog(activityDialog))
	timestampBackdrop?.addEventListener('click', () => closeDialog(timestampDialog))

	document.addEventListener('keydown', (event: KeyboardEvent) => {
		if (event.key !== 'Escape') return

		const openedDialog = document.querySelector<HTMLDivElement>('.dialog:not([hidden])')

		if (openedDialog === activityDialog.dialog) {
			closeDialog(activityDialog)
		} else if (openedDialog === timestampDialog.dialog) {
			closeDialog(timestampDialog)
		}
	})
}
