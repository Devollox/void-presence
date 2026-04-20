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

export function setupClientIdControls(): void {
	const clientInput = document.getElementById(
		'client-id-input',
	) as HTMLInputElement | null
	const buttonsList = document.getElementById(
		'buttons-list',
	) as HTMLElement | null
	const addButtonPair = document.getElementById(
		'add-button-pair',
	) as HTMLButtonElement | null
	const cyclesList = document.getElementById(
		'cycles-list',
	) as HTMLElement | null
	const addCycle = document.getElementById(
		'add-cycle',
	) as HTMLButtonElement | null
	const imagesList = document.getElementById(
		'images-list',
	) as HTMLElement | null
	const addImage = document.getElementById(
		'add-image',
	) as HTMLButtonElement | null
	const recentList = document.getElementById(
		'recent-list',
	) as HTMLElement | null

	if (
		!clientInput ||
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

	clientInput.value = localStorage.getItem('clientId') || ''
	let lastSavedClientId = clientInput.value.trim()
	if (lastSavedClientId.length > 18) {
		window.electronAPI.liveSetClientId(lastSavedClientId)
	}

	const useReadyIdBtn = document.getElementById(
		'use-ready-id',
	) as HTMLButtonElement | null

	useReadyIdBtn?.addEventListener('click', async e => {
		e.preventDefault()
		clientInput.value = '1492470601686847598'
		localStorage.setItem('clientId', clientInput.value)
		if (window.electronAPI?.useReadyClientId) {
			await window.electronAPI.useReadyClientId()
		}
		upsertRecentApp('1492470601686847598', '')
		if (recentList) renderRecentApps(recentList)
		showClientIdToast()
	})

	const ctx = createInitialCtx()

	createModeControllers(ctx)
	setupTimeControls(ctx, showBlocksToast)
	setupButtonPairs(ctx, showBlocksToast)
	setupCycles(ctx, showBlocksToast)
	setupImageCycles(ctx, showBlocksToast)
	setupParty(ctx, showBlocksToast)

	ctx.renderPartyCycles()
	ctx.renderButtonPairs()
	ctx.renderCycles()
	ctx.renderImageCycles()
	ctx.renderTimeCycles()

	if (recentList) renderRecentApps(recentList)

	const partyList = document.getElementById('party-list') as HTMLElement | null
	const timeList = document.getElementById('time-list') as HTMLElement | null

	if (partyList)
		attachDnD(partyList, ctx.party, () => {
			ctx.renderPartyCycles()
			void pushLiveStateFromCtx(ctx)
			showBlocksToast()
		})

	if (buttonsList)
		attachDnD(buttonsList, ctx.buttonPairs, () => {
			ctx.renderButtonPairs()
			void pushLiveStateFromCtx(ctx)
			showBlocksToast()
		})

	if (cyclesList)
		attachDnD(cyclesList, ctx.cycles, () => {
			ctx.renderCycles()
			void pushLiveStateFromCtx(ctx)
			showBlocksToast()
		})

	if (imagesList)
		attachDnD(imagesList, ctx.imageCycles, () => {
			ctx.renderImageCycles()
			void pushLiveStateFromCtx(ctx)
			showBlocksToast()
		})

	if (timeList && ctx.timeCycles)
		attachDnD(timeList, ctx.timeCycles, () => {
			ctx.renderTimeCycles!()
			void pushLiveStateFromCtx(ctx)
			showBlocksToast()
		})

	let clientIdDebounce: number | undefined
	let intervalDebounce: number | undefined

	clientInput.addEventListener('input', () => {
		if (clientIdDebounce) {
			window.clearTimeout(clientIdDebounce)
		}
		clientIdDebounce = window.setTimeout(() => {
			const newClientId = clientInput.value.trim()
			void pushLiveStateFromCtx(ctx)
			if (newClientId.length !== 19) {
				return
			}
			if (newClientId === lastSavedClientId) {
				return
			}
			lastSavedClientId = newClientId
			upsertRecentApp(newClientId, '')
			if (recentList) {
				renderRecentApps(recentList)
			}
			showClientIdToast()
		}, 600)
	})

	const intervalInput = document.getElementById(
		'update-interval-input',
	) as HTMLInputElement | null

	if (intervalInput) {
		const rawInterval = localStorage.getItem('updateIntervalSec')
		const savedInterval = rawInterval != null ? Number(rawInterval) : NaN
		if (Number.isFinite(savedInterval) && savedInterval > 0) {
			intervalInput.value = String(savedInterval)
		} else {
			intervalInput.value = ''
		}

		intervalInput.addEventListener('input', () => {
			if (intervalDebounce) {
				window.clearTimeout(intervalDebounce)
			}
			intervalDebounce = window.setTimeout(async () => {
				const raw = intervalInput.value.trim()
				const val = Number(raw)
				if (!Number.isFinite(val) || val <= 0) {
					return
				}
				localStorage.setItem('updateIntervalSec', String(val))
				if (window.electronAPI?.liveSetInterval) {
					await window.electronAPI.liveSetInterval(val)
				}
				void pushLiveStateFromCtx(ctx)
				showBlocksToast()
			}, 600)
		})
	}

	const initialClientId = clientInput.value.trim()
	if (initialClientId) {
		upsertRecentApp(initialClientId, '')
		if (recentList) {
			renderRecentApps(recentList)
		}
	}
}
