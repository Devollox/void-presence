import {
	ButtonPair,
	CycleEntry,
	ImageCycleEntry,
	NowMode,
	PartyCycleEntry,
	TimeCycleEntry,
	TimestampMode,
	VoidPresenceCtx,
} from '../../../types/types'
import { pushLiveStateFromCtx } from './live'

export function createInitialCtx(): VoidPresenceCtx {
	const ctx: VoidPresenceCtx = {
		clientId: [],
		buttonPairs: [],
		cycles: [],
		imageCycles: [],
		party: [],
		timeCycles: [],
		showBlocksToast: () => {},
		renderButtonPairs: () => {},
		renderCycles: () => {},
		renderImageCycles: () => {},
		renderPartyCycles: () => {},
		renderTimeCycles: () => {},
	}

	try {
		const rawTime = localStorage.getItem('timeCycles')
		if (rawTime) ctx.timeCycles = JSON.parse(rawTime) as TimeCycleEntry[]
	} catch {}

	if (!Array.isArray(ctx.timeCycles)) ctx.timeCycles = []

	try {
		const rawPairs = localStorage.getItem('buttonPairs')
		if (rawPairs) ctx.buttonPairs = JSON.parse(rawPairs) as ButtonPair[]
	} catch {}

	try {
		const rawCycles = localStorage.getItem('cycles')
		if (rawCycles) ctx.cycles = JSON.parse(rawCycles) as CycleEntry[]
	} catch {}

	try {
		const rawImages = localStorage.getItem('imageCycles')
		if (rawImages) ctx.imageCycles = JSON.parse(rawImages) as ImageCycleEntry[]
	} catch {}

	try {
		const rawParty = localStorage.getItem('party')
		if (rawParty) ctx.party = JSON.parse(rawParty) as PartyCycleEntry[]
	} catch {}

	if (!Array.isArray(ctx.buttonPairs)) ctx.buttonPairs = []
	if (!Array.isArray(ctx.cycles) || !ctx.cycles.length) {
		ctx.cycles = [
			{ details: 'Idling in the void', state: 'Just vibing' },
			{ details: 'Counting stars', state: 'Lost in space' },
			{ details: 'Listening to silence', state: 'Deep focus' },
		]
	}
	if (!Array.isArray(ctx.imageCycles)) ctx.imageCycles = []
	if (!Array.isArray(ctx.party)) ctx.party = []
	;(window as any).__voidPresenceCtx = ctx
	return ctx
}

export function setupModeInitialVisibility() {
	const timeList = document.getElementById('time-list') as HTMLElement | null
	const nowModeRow = document.querySelector<HTMLElement>('.now-mode-row')
	const timeDivider = document.querySelector<HTMLElement>(
		'.time-cycles-divider',
	)
	const timeHeader = document.querySelector<HTMLElement>('.time-cycles-header')

	const storedMode =
		(localStorage.getItem('timestampMode') as TimestampMode | null) || 'now'
	const storedNowMode =
		(localStorage.getItem('nowMode') as NowMode | null) || 'plain'

	const isNow = storedMode === 'now'
	const showTime = isNow && storedNowMode === 'cycles'

	if (nowModeRow) nowModeRow.dataset.visible = isNow ? 'true' : 'false'
	if (timeDivider) timeDivider.dataset.visible = showTime ? 'true' : 'false'
	if (timeHeader) timeHeader.dataset.visible = showTime ? 'true' : 'false'
	if (timeList) timeList.dataset.visible = showTime ? 'true' : 'false'

	void pushLiveStateFromCtx(
		(window as any).__voidPresenceCtx as VoidPresenceCtx,
	)
}
