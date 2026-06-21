import { TimeCycleEntry, VoidPresenceCtx } from '../../../types/types'
import { createListManager } from '../helpers/list'
import { createTimeRow } from './rows'

export function setupTimeControls(ctx: VoidPresenceCtx, showBlocksToast: () => void): void {
	ctx.renderTimeCycles = createListManager<TimeCycleEntry>(ctx, showBlocksToast, {
		listId: 'time-list',
		addBtnId: 'add-time',
		storageKey: 'timeCycles',
		createRowFn: (
			entry: TimeCycleEntry,
			idx: number,
			onUpdate: (entry: TimeCycleEntry) => void,
			onDelete: () => void
		) => createTimeRow(entry, idx, onUpdate, onDelete),
		getDefaultItem: () => ({
			label: '',
			seconds: '',
		}),
	})
}
