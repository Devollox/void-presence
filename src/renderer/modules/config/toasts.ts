import { t } from 'i18next'
import { showToast, type ToastOptions } from '../shell/toasts'
import { VoidPresenceCtx } from '../../../types/types'

export type Toasts = {
	showConfigToast: () => void
	showClientIdToast: () => void
	showBlocksToast: () => void
	showConfigLoaded: () => void
}

export function setupToasts() {
	const showConfigSavedToast = () => showToast(t('toasts.configSaved'), { key: 'config-saved' })

	const showPluginSavedToast = ({ message }: { message: string }) => showToast(message)

	const showConfigCopiedToast = () => showToast(t('toasts.clientIdCopied'), { key: 'client-id-copied' })

	const showConfigLoadedToast = () => showToast(t('toasts.configLoaded'), { key: 'config-loaded' })

	const showConfigUpLoadedToast = () => showToast(t('toasts.configUploaded'), { key: 'config-uploaded' })

	const showConfigImportedToast = (options?: ToastOptions) =>
		showToast(t('toasts.configImported'), options)

	const showConfigDeleteToast = (options?: ToastOptions) =>
		showToast(t('toasts.configDeleted'), options)

	const showClientIdToast = () => showToast(t('toasts.clientIdSaved'), { key: 'client-id-saved' })

	const showBlocksToast = () => showToast(t('toasts.changesSaved'), { key: 'changes-saved' })

	const showRestartPresnceToast = () => showToast(t('toasts.restartPresence'), { key: 'restart-presence' })

	const showRestartStatusToast = () => showToast(t('toasts.restartStatus'), { key: 'restart-status' })

	const showStopPresnceToast = () => showToast(t('toasts.stopPresence'), { key: 'stop-presence' })

	const showStopStatusToast = () => showToast(t('toasts.stopStatus'), { key: 'stop-status' })

	const showMessageToast = ({ message }: { message: string }) =>
		showToast(message, { duration: 4000 })

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
