import {
	ButtonPair,
	CycleEntry,
	FullState,
	ImageCycleEntry,
	VoidPresenceCtx,
} from './types'
import { updateStatus } from './views'

export async function setupIntervalControl(): Promise<void> {
	const input = document.getElementById(
		'update-interval-input'
	) as HTMLInputElement | null
	if (!input) return
	const saved = parseInt(localStorage.getItem('updateIntervalSec') || '30', 10)
	if (!Number.isNaN(saved) && saved > 0) {
		input.value = String(saved)
		if (window.electronAPI?.setActivityInterval) {
			await window.electronAPI.setActivityInterval(saved)
		}
	}
}

export function loadCurrentState(): FullState {
	const clientId = localStorage.getItem('clientId') || ''
	const buttonPairs =
		(JSON.parse(localStorage.getItem('buttonPairs') || '[]') as ButtonPair[]) ||
		[]
	const cycles =
		(JSON.parse(localStorage.getItem('cycles') || '[]') as CycleEntry[]) || []
	const imageCycles =
		(JSON.parse(
			localStorage.getItem('imageCycles') || '[]'
		) as ImageCycleEntry[]) || []
	return { clientId, buttonPairs, cycles, imageCycles }
}

export async function saveAllFromState(state: FullState): Promise<void> {
	const clientId = (state.clientId || '').trim()
	const buttonPairs = Array.isArray(state.buttonPairs) ? state.buttonPairs : []
	const cycles = Array.isArray(state.cycles) ? state.cycles : []
	const imageCycles = Array.isArray(state.imageCycles) ? state.imageCycles : []

	const cleanedPairs: ButtonPair[] = buttonPairs
		.map(p => {
			const label1 = (p.label1 || '').trim()
			const url1 = (p.url1 || '').trim()
			const label2 = (p.label2 || '').trim()
			const url2 = (p.url2 || '').trim()
			const has1 = !!(label1 && url1)
			const has2 = !!(label2 && url2)
			return {
				label1: has1 ? label1 : '',
				url1: has1 ? url1 : '',
				label2: has2 ? label2 : '',
				url2: has2 ? url2 : '',
			}
		})
		.filter(p => (p.label1 && p.url1) || (p.label2 && p.url2))
		.map(p => {
			const res: ButtonPair = { label1: p.label1, url1: p.url1 }
			if (p.label2 && p.url2) {
				res.label2 = p.label2
				res.url2 = p.url2
			}
			return res
		})

	const cleanedCycles: CycleEntry[] = cycles
		.map(c => ({
			details: (c.details || '').trim(),
			state: (c.state || '').trim(),
		}))
		.filter(c => c.details.length > 0 || c.state.length > 0)

	const cleanedImageCycles: ImageCycleEntry[] = imageCycles
		.map(c => ({
			largeImage: (c.largeImage || '').trim(),
			largeText: (c.largeText || '').trim(),
			smallImage: (c.smallImage || '').trim(),
			smallText: (c.smallText || '').trim(),
		}))
		.filter(
			c =>
				c.largeImage.length > 0 ||
				c.largeText.length > 0 ||
				c.smallImage.length > 0 ||
				c.smallText.length > 0
		)

	const intervalSecRaw = Number(state.updateIntervalSec)

	if (
		!clientId ||
		!cleanedCycles.length ||
		!Number.isFinite(intervalSecRaw) ||
		intervalSecRaw <= 0
	) {
		updateStatus('NO_CLIENT_ID')
		return
	}

	localStorage.setItem('clientId', clientId)
	localStorage.setItem('buttonPairs', JSON.stringify(cleanedPairs))
	localStorage.setItem('cycles', JSON.stringify(cleanedCycles))
	localStorage.setItem('imageCycles', JSON.stringify(cleanedImageCycles))
	localStorage.setItem('updateIntervalSec', String(intervalSecRaw))

	if (window.electronAPI?.setClientId) {
		await window.electronAPI.setClientId(clientId)
	}
	if (window.electronAPI?.setImageCycles) {
		await window.electronAPI.setImageCycles(cleanedImageCycles)
	}
	if (window.electronAPI?.setButtons) {
		await window.electronAPI.setButtons(cleanedPairs)
	}
	if (window.electronAPI?.setCycles) {
		await window.electronAPI.setCycles(cleanedCycles)
	}
	if (window.electronAPI?.setActivityInterval) {
		await window.electronAPI.setActivityInterval(intervalSecRaw)
	}
	if (window.electronAPI?.restartDiscordRich) {
		await window.electronAPI.restartDiscordRich()
	}
}

export function applyStateToUIAndLists(
	state: FullState,
	ctx: VoidPresenceCtx
): void {
	const clientInput = document.getElementById(
		'client-id-input'
	) as HTMLInputElement | null
	if (!clientInput) return
	clientInput.value = state.clientId || ''
	localStorage.setItem('clientId', state.clientId || '')
	localStorage.setItem('buttonPairs', JSON.stringify(state.buttonPairs || []))
	localStorage.setItem('cycles', JSON.stringify(state.cycles || []))
	localStorage.setItem('imageCycles', JSON.stringify(state.imageCycles || []))
	ctx.buttonPairs = Array.isArray(state.buttonPairs) ? state.buttonPairs : []
	ctx.cycles = Array.isArray(state.cycles) ? state.cycles : []
	ctx.imageCycles = Array.isArray(state.imageCycles) ? state.imageCycles : []
	ctx.renderButtonPairs()
	ctx.renderCycles()
	ctx.renderImageCycles()
}
