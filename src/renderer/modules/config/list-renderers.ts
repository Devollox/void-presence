import {
	ButtonPair,
	CycleEntry,
	ImageCycleEntry,
	PartyCycleEntry,
	VoidPresenceCtx,
} from '../../../types/types'
import { pushLiveStateFromCtx } from './live'
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
	const buttonsList = document.getElementById(
		'buttons-list',
	) as HTMLElement | null
	const addButtonPair = document.getElementById(
		'add-button-pair',
	) as HTMLButtonElement | null

	ctx.renderButtonPairs = function renderButtonPairs(): void {
		if (!buttonsList) return
		buttonsList.innerHTML = ''
		ctx.buttonPairs.forEach((pair: ButtonPair, idx: number) => {
			const row = createButtonPairRow(
				pair,
				idx,
				updated => {
					ctx.buttonPairs[idx] = updated
					localStorage.setItem('buttonPairs', JSON.stringify(ctx.buttonPairs))
					void pushLiveStateFromCtx(ctx)
					showBlocksToast()
				},
				() => {
					ctx.buttonPairs.splice(idx, 1)
					localStorage.setItem('buttonPairs', JSON.stringify(ctx.buttonPairs))
					ctx.renderButtonPairs()
					void pushLiveStateFromCtx(ctx)
					showBlocksToast()
				},
			)
			buttonsList.appendChild(row)
		})
	}

	addButtonPair?.addEventListener('click', e => {
		e.preventDefault()
		ctx.buttonPairs.push({
			label1: '',
			url1: '',
			label2: '',
			url2: '',
		})
		ctx.renderButtonPairs()
		void pushLiveStateFromCtx(ctx)
		showBlocksToast()
	})
}

export function setupCycles(ctx: VoidPresenceCtx, showBlocksToast: () => void) {
	const cyclesList = document.getElementById(
		'cycles-list',
	) as HTMLElement | null
	const addCycle = document.getElementById(
		'add-cycle',
	) as HTMLButtonElement | null

	ctx.renderCycles = function renderCycles(): void {
		if (!cyclesList) return
		cyclesList.innerHTML = ''
		ctx.cycles.forEach((entry: CycleEntry, idx: number) => {
			const row = createCycleRow(
				entry,
				idx,
				updated => {
					ctx.cycles[idx] = updated
					localStorage.setItem('cycles', JSON.stringify(ctx.cycles))
					void pushLiveStateFromCtx(ctx)
					showBlocksToast()
				},
				() => {
					ctx.cycles.splice(idx, 1)
					localStorage.setItem('cycles', JSON.stringify(ctx.cycles))
					ctx.renderCycles()
					void pushLiveStateFromCtx(ctx)
					showBlocksToast()
				},
			)
			cyclesList.appendChild(row)
		})
	}

	addCycle?.addEventListener('click', e => {
		e.preventDefault()
		ctx.cycles.push({
			details: '',
			state: '',
		})
		ctx.renderCycles()
		void pushLiveStateFromCtx(ctx)
		showBlocksToast()
	})
}

export function setupImageCycles(
	ctx: VoidPresenceCtx,
	showBlocksToast: () => void,
) {
	const imagesList = document.getElementById(
		'images-list',
	) as HTMLElement | null
	const addImage = document.getElementById(
		'add-image',
	) as HTMLButtonElement | null

	ctx.renderImageCycles = function renderImageCycles(): void {
		if (!imagesList) return
		imagesList.innerHTML = ''
		ctx.imageCycles.forEach((entry: ImageCycleEntry, idx: number) => {
			const row = createImageCycleRow(
				entry,
				idx,
				updated => {
					ctx.imageCycles[idx] = updated
					localStorage.setItem('imageCycles', JSON.stringify(ctx.imageCycles))
					void pushLiveStateFromCtx(ctx)
					showBlocksToast()
				},
				() => {
					ctx.imageCycles.splice(idx, 1)
					localStorage.setItem('imageCycles', JSON.stringify(ctx.imageCycles))
					ctx.renderImageCycles()
					void pushLiveStateFromCtx(ctx)
					showBlocksToast()
				},
			)
			imagesList.appendChild(row)
		})
	}

	addImage?.addEventListener('click', e => {
		e.preventDefault()
		ctx.imageCycles.push({
			largeImage: '',
			largeText: '',
			smallImage: '',
			smallText: '',
		})
		ctx.renderImageCycles()
		void pushLiveStateFromCtx(ctx)
		showBlocksToast()
	})
}

export function setupParty(ctx: VoidPresenceCtx, showBlocksToast: () => void) {
	const partyList = document.getElementById('party-list') as HTMLElement | null
	const addParty = document.getElementById(
		'add-party',
	) as HTMLButtonElement | null

	ctx.renderPartyCycles = function renderPartyCycles(): void {
		if (!partyList) return
		partyList.innerHTML = ''
		ctx.party.forEach((partyEntry: PartyCycleEntry, idx: number) => {
			const row = createPartyRow(
				partyEntry,
				idx,
				updated => {
					ctx.party[idx] = updated
					localStorage.setItem('party', JSON.stringify(ctx.party))
					void pushLiveStateFromCtx(ctx)
					showBlocksToast()
				},
				() => {
					ctx.party.splice(idx, 1)
					if (!ctx.party.length) {
						localStorage.removeItem('party')
					} else {
						localStorage.setItem('party', JSON.stringify(ctx.party))
					}
					ctx.renderPartyCycles()
					void pushLiveStateFromCtx(ctx)
					showBlocksToast()
				},
			)
			partyList.appendChild(row)
		})
	}

	addParty?.addEventListener('click', e => {
		e.preventDefault()
		ctx.party.push({ sizeCurrent: '', sizeMax: '' })
		localStorage.setItem('party', JSON.stringify(ctx.party))
		ctx.renderPartyCycles()
		void pushLiveStateFromCtx(ctx)
		showBlocksToast()
	})
}
