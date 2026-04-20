import { TimeCycleEntry, VoidPresenceCtx } from '../../../types/types'
import { pushLiveStateFromCtx } from './live'
import { createTimeRow } from './rows'

export function setupTimeControls(
	ctx: VoidPresenceCtx,
	showBlocksToast: () => void,
) {
	const timeList = document.getElementById('time-list') as HTMLElement | null
	const addTime = document.getElementById(
		'add-time',
	) as HTMLButtonElement | null

	ctx.renderTimeCycles = function renderTimeCycles(): void {
		if (!timeList) return
		timeList.innerHTML = ''
		ctx.timeCycles!.forEach((entry: TimeCycleEntry, idx: number) => {
			const row = createTimeRow(
				entry,
				idx,
				updated => {
					ctx.timeCycles![idx] = updated
					localStorage.setItem('timeCycles', JSON.stringify(ctx.timeCycles))
					void pushLiveStateFromCtx(ctx)
					showBlocksToast()
				},
				() => {
					ctx.timeCycles!.splice(idx, 1)
					if (!ctx.timeCycles!.length) {
						localStorage.removeItem('timeCycles')
					} else {
						localStorage.setItem('timeCycles', JSON.stringify(ctx.timeCycles))
					}
					ctx.renderTimeCycles!()
					void pushLiveStateFromCtx(ctx)
					showBlocksToast()
				},
			)
			timeList!.appendChild(row)
		})
	}

	addTime?.addEventListener('click', e => {
		e.preventDefault()
		ctx.timeCycles!.push({ label: '', seconds: '' })
		localStorage.setItem('timeCycles', JSON.stringify(ctx.timeCycles))
		ctx.renderTimeCycles!()
		void pushLiveStateFromCtx(ctx)
		showBlocksToast()
	})
}
