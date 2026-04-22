import {
	ButtonPair,
	CycleEntry,
	ImageCycleEntry,
	PartyCycleEntry,
	VoidPresenceCtx,
} from '../../../types/types'
import { createListManager } from '../helpers/list'
import {
	createButtonPairRow,
	createCycleRow,
	createImageCycleRow,
	createPartyRow,
} from './rows'

export function setupButtonPairs(
	ctx: VoidPresenceCtx,
	showBlocksToast: () => void,
) {
	ctx.renderButtonPairs = createListManager<ButtonPair>(ctx, showBlocksToast, {
		listId: 'buttons-list',
		addBtnId: 'add-button-pair',
		storageKey: 'buttonPairs',
		createRowFn: createButtonPairRow,
		getDefaultItem: () => ({
			label1: '',
			url1: '',
			label2: '',
			url2: '',
		}),
	})
}

export function setupCycles(ctx: VoidPresenceCtx, showBlocksToast: () => void) {
	ctx.renderCycles = createListManager<CycleEntry>(ctx, showBlocksToast, {
		listId: 'cycles-list',
		addBtnId: 'add-cycle',
		storageKey: 'cycles',
		createRowFn: createCycleRow,
		getDefaultItem: () => ({
			details: '',
			state: '',
		}),
	})
}

export function setupImageCycles(
	ctx: VoidPresenceCtx,
	showBlocksToast: () => void,
) {
	ctx.renderImageCycles = createListManager<ImageCycleEntry>(
		ctx,
		showBlocksToast,
		{
			listId: 'images-list',
			addBtnId: 'add-image',
			storageKey: 'imageCycles',
			createRowFn: createImageCycleRow,
			getDefaultItem: () => ({
				largeImage: '',
				largeText: '',
				smallImage: '',
				smallText: '',
			}),
		},
	)
}

export function setupParty(ctx: VoidPresenceCtx, showBlocksToast: () => void) {
	ctx.renderPartyCycles = createListManager<PartyCycleEntry>(
		ctx,
		showBlocksToast,
		{
			listId: 'party-list',
			addBtnId: 'add-party',
			storageKey: 'party',
			createRowFn: createPartyRow,
			getDefaultItem: () => ({
				sizeCurrent: '',
				sizeMax: '',
			}),
		},
	)
}
