import { t } from 'i18next'
import { VoidPresenceCtx } from '../../../types/types'

function showToast(el: HTMLElement | null, message?: string) {
	if (!el) return
	if (typeof message === 'string') {
		el.textContent = message
	}
	el.dataset.visible = 'true'
	setTimeout(() => {
		el.dataset.visible = 'false'
	}, 1800)
}

export type Toasts = {
	showConfigToast: () => void
	showClientIdToast: () => void
	showBlocksToast: () => void
	showConfigLoaded: () => void
}

export function setupToasts() {
	const blocksToast = document.getElementById('blocks-toast') as HTMLElement | null

	const showConfigSavedToast = () => showToast(blocksToast, t('toasts.configSaved'))
	const showPluginSavedToast = ({ message }: { message: string }) => showToast(blocksToast, message)
	const showConfigCopiedToast = () => showToast(blocksToast, t('toasts.clientIdCopied'))
	const showConfigLoadedToast = () => showToast(blocksToast, t('toasts.configLoaded'))
	const showConfigUpLoadedToast = () => showToast(blocksToast, t('toasts.configUploaded'))
	const showConfigImportedToast = () => showToast(blocksToast, t('toasts.configImported'))
	const showConfigDeleteToast = () => showToast(blocksToast, t('toasts.configDeleted'))
	const showClientIdToast = () => showToast(blocksToast, t('toasts.clientIdSaved'))
	const showBlocksToast = () => showToast(blocksToast, t('toasts.changesSaved'))
	const showRestartPresnceToast = () => showToast(blocksToast, t('toasts.restartPresence'))
	const showRestartStatusToast = () => showToast(blocksToast, t('toasts.restartStatus'))
	const showStopPresnceToast = () => showToast(blocksToast, t('toasts.stopPresence'))
	const showStopStatusToast = () => showToast(blocksToast, t('toasts.stopStatus'))

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
	}
}

export function attachToastToCtx(ctx: VoidPresenceCtx, showBlocksToast: () => void) {
	ctx.showBlocksToast = showBlocksToast
}
