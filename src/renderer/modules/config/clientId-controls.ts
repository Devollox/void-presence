import { createInitialCtx } from './ctx'
import { attachDnD } from './dnd'
import {
	setupButtonPairs,
	setupCycles,
	setupImageCycles,
	setupParty,
} from './list-renderers'
import { pushLiveStateFromCtx } from './live'
import { createModeControllers } from './mode-сontrols'
import { renderRecentApps } from './recent'
import { upsertRecentApp } from './storage'
import { setupTimeControls } from './time-сontrols'
import { setupToasts } from './toasts'

function getRequiredElements(...ids: string[]): (HTMLElement | null)[] {
	return ids.map(id => document.getElementById(id))
}

export function setupClientIdControls(): void {
	const [
		clientInput,
		buttonsList,
		addButtonPair,
		cyclesList,
		addCycle,
		imagesList,
		addImage,
		recentList,
	] = getRequiredElements(
		'client-id-input',
		'buttons-list',
		'add-button-pair',
		'cycles-list',
		'add-cycle',
		'images-list',
		'add-image',
		'recent-list',
	)

	const $clientInput = clientInput as HTMLInputElement | null
	const $intervalInput = document.getElementById(
		'update-interval-input',
	) as HTMLInputElement | null

	if (
		!$clientInput ||
		!buttonsList ||
		!addButtonPair ||
		!cyclesList ||
		!addCycle ||
		!imagesList ||
		!addImage ||
		!recentList
	) {
		return
	}

	const { showClientIdToast, showBlocksToast } = setupToasts()

	$clientInput.value = localStorage.getItem('clientId')
	let lastSavedClientId = $clientInput.value.trim()
	if (lastSavedClientId.length > 18) {
		window.electronAPI.liveSetClientId(lastSavedClientId)
	}

	const useReadyIdBtn = document.getElementById(
		'use-ready-id',
	) as HTMLButtonElement | null

	useReadyIdBtn?.addEventListener('click', async e => {
		e.preventDefault()
		$clientInput.value = '1492470601686847598'
		localStorage.setItem('clientId', $clientInput.value)
		if (window.electronAPI?.useReadyClientId) {
			await window.electronAPI.useReadyClientId()
		}
		upsertRecentApp('1492470601686847598', '')
		renderRecentApps(recentList)
		showClientIdToast()
	})

	const ctx = createInitialCtx()

	createModeControllers(ctx)
	setupTimeControls(ctx, showBlocksToast)

	setupButtonPairs(ctx, showBlocksToast)
	setupCycles(ctx, showBlocksToast)
	setupImageCycles(ctx, showBlocksToast)
	setupParty(ctx, showBlocksToast)

	ctx.renderButtonPairs()
	ctx.renderCycles()
	ctx.renderImageCycles()
	ctx.renderPartyCycles()
	ctx.renderTimeCycles?.()

	renderRecentApps(recentList)

	const partyList = document.getElementById('party-list') as HTMLElement | null
	const timeList = document.getElementById('time-list') as HTMLElement | null

	const lists = [
		[partyList, ctx.party, ctx.renderPartyCycles as (() => void) | undefined],
		[
			buttonsList,
			ctx.buttonPairs,
			ctx.renderButtonPairs as (() => void) | undefined,
		],
		[cyclesList, ctx.cycles, ctx.renderCycles as (() => void) | undefined],
		[
			imagesList,
			ctx.imageCycles,
			ctx.renderImageCycles as (() => void) | undefined,
		],
		[
			timeList,
			ctx.timeCycles,
			ctx.renderTimeCycles as (() => void) | undefined,
		],
	] as const

	for (const [list, items, render] of lists) {
		if (!list || !items || !render) continue
		attachDnD<unknown>(list, items, () => {
			render()
			void pushLiveStateFromCtx(ctx)
			showBlocksToast()
		})
	}

	let clientIdDebounce: number | undefined
	let intervalDebounce: number | undefined

	$clientInput.addEventListener('input', () => {
		if (clientIdDebounce) {
			window.clearTimeout(clientIdDebounce)
		}
		clientIdDebounce = window.setTimeout(() => {
			const newClientId = $clientInput.value.trim()
			void pushLiveStateFromCtx(ctx)
			if (newClientId.length !== 19) return
			if (newClientId === lastSavedClientId) return

			lastSavedClientId = newClientId
			upsertRecentApp(newClientId, '')
			renderRecentApps(recentList)
			showClientIdToast()
		}, 600)
	})

	if ($intervalInput) {
		const rawInterval = localStorage.getItem('updateIntervalSec')
		const savedInterval = rawInterval != null ? Number(rawInterval) : NaN
		$intervalInput.value =
			Number.isFinite(savedInterval) && savedInterval > 0
				? String(savedInterval)
				: ''

		$intervalInput.addEventListener('input', () => {
			if (intervalDebounce) {
				window.clearTimeout(intervalDebounce)
			}
			intervalDebounce = window.setTimeout(async () => {
				const raw = $intervalInput.value.trim()
				const val = Number(raw)
				if (!Number.isFinite(val) || val <= 0) return

				localStorage.setItem('updateIntervalSec', String(val))
				if (window.electronAPI?.liveSetInterval) {
					await window.electronAPI.liveSetInterval(val)
				}
				void pushLiveStateFromCtx(ctx)
				showBlocksToast()
			}, 600)
		})
	}

	const initialClientId = $clientInput.value.trim()
	if (initialClientId) {
		upsertRecentApp(initialClientId, '')
		renderRecentApps(recentList)
	}
}
