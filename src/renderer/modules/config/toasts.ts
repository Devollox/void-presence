import { t } from 'i18next'
import { VoidPresenceCtx } from '../../../types/types'

const toastTimers = new WeakMap<HTMLElement, ReturnType<typeof setTimeout>>()

function showToast(el: HTMLElement | null, message?: string, duration = 1800): void {
	if (!el) return

	const previousTimer = toastTimers.get(el)

	if (previousTimer !== undefined) {
		clearTimeout(previousTimer)
	}

	if (typeof message === 'string') {
		el.textContent = message
	}

	el.setAttribute('role', 'status')
	el.setAttribute('aria-live', 'polite')
	el.dataset.visible = 'true'

	const timer = setTimeout(() => {
		el.dataset.visible = 'false'
		toastTimers.delete(el)
	}, duration)

	toastTimers.set(el, timer)
}

export type Toasts = {
	showConfigToast: () => void
	showClientIdToast: () => void
	showBlocksToast: () => void
	showConfigLoaded: () => void
}

export function setupToasts() {
	const getToastElement = () => document.getElementById('blocks-toast')

	const showConfigSavedToast = () => showToast(getToastElement(), t('toasts.configSaved'))

	const showPluginSavedToast = ({ message }: { message: string }) =>
		showToast(getToastElement(), message)

	const showConfigCopiedToast = () => showToast(getToastElement(), t('toasts.clientIdCopied'))

	const showConfigLoadedToast = () => showToast(getToastElement(), t('toasts.configLoaded'))

	const showConfigUpLoadedToast = () => showToast(getToastElement(), t('toasts.configUploaded'))

	const showConfigImportedToast = () => showToast(getToastElement(), t('toasts.configImported'))

	const showConfigDeleteToast = () => showToast(getToastElement(), t('toasts.configDeleted'))

	const showClientIdToast = () => showToast(getToastElement(), t('toasts.clientIdSaved'))

	const showBlocksToast = () => showToast(getToastElement(), t('toasts.changesSaved'))

	const showRestartPresnceToast = () => showToast(getToastElement(), t('toasts.restartPresence'))

	const showRestartStatusToast = () => showToast(getToastElement(), t('toasts.restartStatus'))

	const showStopPresnceToast = () => showToast(getToastElement(), t('toasts.stopPresence'))

	const showStopStatusToast = () => showToast(getToastElement(), t('toasts.stopStatus'))

	const showMessageToast = ({ message }: { message: string }) =>
		showToast(getToastElement(), message, 4000)

	return {
		showConfigSavedToast,
		showConfigCopiedToast,
		showConfigLoadedToast,
		showClientIdToast,
		showBlocksToast,
		showConfigImportedToast,
		showConfigUpLoadedToast,
		showConfigDeleteToast,
		showRestartPresnceToast,
		showRestartStatusToast,
		showStopPresnceToast,
		showStopStatusToast,
		showPluginSavedToast,
		showMessageToast,
	}
}

export function attachToastToCtx(ctx: VoidPresenceCtx, showBlocksToast: () => void) {
	ctx.showBlocksToast = showBlocksToast
}
