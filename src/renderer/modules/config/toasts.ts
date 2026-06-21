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

	const showConfigSavedToast = () => showToast(blocksToast, 'config saved')
	const showConfigCopiedToast = () => showToast(blocksToast, 'client id copied')
	const showConfigLoadedToast = () => showToast(blocksToast, 'config loaded')
	const showClientIdToast = () => showToast(blocksToast, 'client id saved')
	const showBlocksToast = () => showToast(blocksToast, 'changes saved')

	return {
		showConfigSavedToast,
		showConfigCopiedToast,
		showConfigLoadedToast,
		showClientIdToast,
		showBlocksToast,
	}
}

export function attachToastToCtx(ctx: VoidPresenceCtx, showBlocksToast: () => void) {
	ctx.showBlocksToast = showBlocksToast
}
