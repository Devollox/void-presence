import { VoidPresenceCtx } from 'src/types/types'
import { StoredRecentApp, setRecentApps } from '../config/config-storage'
import { attachDnD } from '../config/dnd'
import { pushLiveStateFromCtx } from '../config/live'
import { RecentApp, renderRecentApps } from '../config/recent'

export function reattachDnDForProfiles(
	ctx: VoidPresenceCtx,
	showBlocksToast: () => void,
	storedRecent: StoredRecentApp[]
): void {
	const partyList = document.getElementById('party-list') as HTMLElement | null
	const buttonsList = document.getElementById('buttons-list') as HTMLElement | null
	const cyclesList = document.getElementById('cycles-list') as HTMLElement | null
	const imagesList = document.getElementById('images-list') as HTMLElement | null
	const timeList = document.getElementById('time-list') as HTMLElement | null
	const recentList = document.getElementById('recent-list') as HTMLElement | null

	const lists = [
		[partyList, ctx.party, ctx.renderPartyCycles as (() => void) | undefined],
		[buttonsList, ctx.buttonPairs, ctx.renderButtonPairs as (() => void) | undefined],
		[cyclesList, ctx.cycles, ctx.renderCycles as (() => void) | undefined],
		[imagesList, ctx.imageCycles, ctx.renderImageCycles as (() => void) | undefined],
		[timeList, ctx.timeCycles, ctx.renderTimeCycles as (() => void) | undefined],
	] as const

	for (const [list, items, render] of lists) {
		if (!list || !items || !render) continue
		attachDnD<unknown>(list, items, () => {
			render()
			void pushLiveStateFromCtx(ctx)
			showBlocksToast()
		})
	}

	if (recentList) {
		attachDnD<StoredRecentApp>(recentList, storedRecent, () => {
			setRecentApps(storedRecent)
			renderRecentApps(
				recentList,
				storedRecent.map<RecentApp>(x => ({ id: x.id, name: x.name }))
			)
		})
	}
}
