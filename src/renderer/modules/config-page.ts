import {
	ActivityType,
	ButtonPair,
	CycleEntry,
	FullState,
	ImageCycleEntry,
	NowMode,
	PartyCycleEntry,
	StoredConfig,
	TimeCycleEntry,
	TimestampMode,
	VoidPresenceCtx,
} from '../../types/types'
import { openConfigDetails } from './config-details'
import { attachDnD } from './config-dnd'
import { renderRecentApps } from './config-recent'
import {
	createButtonPairRow,
	createCycleRow,
	createImageCycleRow,
	createPartyRow,
	createTimeRow,
} from './config-rows'
import {
	deepCloneState,
	getConfigs,
	setConfigs,
	upsertRecentApp,
} from './config-storage'
import { applyStateToUIAndLists, loadCurrentState } from './state'
import { appendLog, setActiveView } from './views'

function downloadJson(data: unknown, filename: string): void {
	const json = JSON.stringify(data, null, 2)
	const blob = new Blob([json], { type: 'application/json' })
	const url = URL.createObjectURL(blob)
	const a = document.createElement('a')
	a.href = url
	a.download = filename
	document.body.appendChild(a)
	a.click()
	document.body.removeChild(a)
	URL.revokeObjectURL(url)
}

async function pushLiveStateFromCtx(ctx: VoidPresenceCtx): Promise<void> {
	const clientInput = document.getElementById(
		'client-id-input',
	) as HTMLInputElement | null
	const intervalInput = document.getElementById(
		'update-interval-input',
	) as HTMLInputElement | null

	const clientId = clientInput ? clientInput.value.trim() : ''
	const intervalSec = intervalInput
		? parseInt(intervalInput.value.trim(), 10)
		: NaN

	const timestampMode: TimestampMode =
		(localStorage.getItem('timestampMode') as TimestampMode | null) || 'now'
	const timestampRangeMin = localStorage.getItem('timestampRangeMin') || ''
	const timestampRangeMax = localStorage.getItem('timestampRangeMax') || ''
	const activityType: ActivityType =
		(localStorage.getItem('activityType') as ActivityType | null) || 'playing'
	const nowMode: NowMode =
		(localStorage.getItem('nowMode') as NowMode | null) || 'plain'
	const timeCycles = Array.isArray(ctx.timeCycles) ? ctx.timeCycles : []

	const state: FullState = {
		clientId,
		buttonPairs: ctx.buttonPairs,
		cycles: ctx.cycles,
		imageCycles: ctx.imageCycles,
		updateIntervalSec: intervalSec,
		party: ctx.party,
		timestampMode,
		timestampRangeMin,
		timestampRangeMax,
		activityType,
		nowMode,
		timeCycles,
	}

	localStorage.setItem('clientId', clientId)
	localStorage.setItem('buttonPairs', JSON.stringify(ctx.buttonPairs))
	localStorage.setItem('cycles', JSON.stringify(ctx.cycles))
	localStorage.setItem('imageCycles', JSON.stringify(ctx.imageCycles))
	localStorage.setItem('party', JSON.stringify(ctx.party))
	localStorage.setItem('timeCycles', JSON.stringify(timeCycles))
	localStorage.setItem('timestampMode', timestampMode)
	localStorage.setItem('timestampRangeMin', timestampRangeMin)
	localStorage.setItem('timestampRangeMax', timestampRangeMax)
	localStorage.setItem('activityType', activityType)
	localStorage.setItem('nowMode', nowMode)

	if (window.electronAPI?.liveSetClientId) {
		await window.electronAPI.liveSetClientId(clientId)
	}
	if (window.electronAPI?.liveSetCycles) {
		await window.electronAPI.liveSetCycles((ctx.cycles || []) as CycleEntry[])
	}
	if (window.electronAPI?.liveSetImages) {
		await window.electronAPI.liveSetImages(
			(ctx.imageCycles || []) as ImageCycleEntry[],
		)
	}
	if (window.electronAPI?.liveSetButtons) {
		await window.electronAPI.liveSetButtons(
			(ctx.buttonPairs || []) as ButtonPair[],
		)
	}
	if (window.electronAPI?.liveSetParty) {
		const partyPayload = (ctx.party || []).map(p => ({
			sizeCurrent: p.sizeCurrent?.toString() ?? '',
			sizeMax: p.sizeMax?.toString() ?? '',
		}))
		await window.electronAPI.liveSetParty(partyPayload)
	}
	if (window.electronAPI?.liveSetTimeCycles) {
		const timePayload = timeCycles.map(tc => ({
			label: tc.label || '',
			seconds:
				typeof tc.seconds === 'number'
					? String(tc.seconds)
					: (tc.seconds as string) || '',
		}))
		await window.electronAPI.liveSetTimeCycles(timePayload)
	}
	if (window.electronAPI?.liveSetTimestamp) {
		await window.electronAPI.liveSetTimestamp({
			mode: timestampMode,
			rangeMin: timestampRangeMin,
			rangeMax: timestampRangeMax,
			nowMode,
		})
	}
}

export function setupConfigPage(): void {
	const nameInput = document.getElementById(
		'config-name-input',
	) as HTMLInputElement | null
	const saveBtn = document.getElementById(
		'config-save-btn',
	) as HTMLButtonElement | null
	const list = document.getElementById('config-list') as HTMLElement | null
	const addBtn = document.getElementById(
		'config-add-btn',
	) as HTMLButtonElement | null
	const exportBtn = document.getElementById(
		'config-export-btn',
	) as HTMLButtonElement | null
	const configSearchInput = document.getElementById(
		'config-search-input',
	) as HTMLInputElement | null

	if (!nameInput || !saveBtn || !list || !addBtn || !exportBtn) return

	function openUploadConfirm(cfg: StoredConfig, onConfirm: () => void) {
		const overlay = document.getElementById(
			'upload-confirm-overlay',
		) as HTMLElement | null
		if (!overlay) return

		const closeBtn = document.getElementById(
			'upload-confirm-close',
		) as HTMLButtonElement | null
		const okBtn = document.getElementById(
			'upload-confirm-ok',
		) as HTMLButtonElement | null
		const info = document.getElementById(
			'upload-confirm-profile-info',
		) as HTMLElement | null

		if (!closeBtn || !okBtn || !info) return

		info.textContent = cfg.name || 'Unnamed profile'
		overlay.dataset.open = 'true'

		const close = () => {
			overlay.dataset.open = 'false'
			okBtn.removeEventListener('click', okHandler)
			closeBtn.removeEventListener('click', close)
			overlay.removeEventListener('click', overlayHandler)
		}

		const okHandler = () => {
			close()
			onConfirm()
		}

		const overlayHandler = (e: MouseEvent) => {
			if (e.target === overlay) {
				close()
			}
		}

		okBtn.addEventListener('click', okHandler)
		closeBtn.addEventListener('click', close)
		overlay.addEventListener('click', overlayHandler)
	}

	function renderConfigs(): void {
		const configs = getConfigs()
			.slice()
			.sort((a, b) => {
				const ad = a.createdAt ? new Date(a.createdAt).getTime() : 0
				const bd = b.createdAt ? new Date(b.createdAt).getTime() : 0
				return bd - ad
			})

		list.innerHTML = ''

		configs.forEach(cfg => {
			const state = cfg.state || {}
			const cycles: CycleEntry[] = Array.isArray(state.cycles)
				? state.cycles
				: []
			const firstCycle: CycleEntry | undefined = cycles[0]
			const details = firstCycle?.details || 'New cycle'
			const activityState = firstCycle?.state || 'In the void'

			const firstImage =
				(Array.isArray(state.imageCycles) && state.imageCycles[0]) || null
			const largeImage =
				firstImage && firstImage.largeImage
					? firstImage.largeImage
					: 'about:blank'

			const card = document.createElement('div')
			card.className = 'config-activity-card'

			card.setAttribute('data-config-id', cfg.createdAt || String(Date.now()))
			card.setAttribute('data-name', (cfg.name || '').toLowerCase())
			const rawAuthor = (state as any).authorId || (state as any).author || ''
			card.setAttribute('data-author', String(rawAuthor).toLowerCase())

			const body = document.createElement('div')
			body.className = 'config-activity-body'

			const imgWrap = document.createElement('div')
			imgWrap.className = 'config-activity-image'
			const img = document.createElement('img')
			img.src = largeImage
			img.alt = 'app icon'
			imgWrap.appendChild(img)

			const detailsWrap = document.createElement('div')
			detailsWrap.className = 'config-activity-details'

			const title = document.createElement('div')
			title.className = 'config-activity-title'
			title.textContent = cfg.name || 'Unnamed profile'

			const line1 = document.createElement('div')
			line1.className = 'config-activity-line'
			line1.textContent = details

			const line2 = document.createElement('div')
			line2.className = 'config-activity-line'
			line2.textContent = activityState

			const footer = document.createElement('div')
			footer.className = 'config-activity-footer'

			detailsWrap.appendChild(title)
			detailsWrap.appendChild(line1)
			detailsWrap.appendChild(line2)
			detailsWrap.appendChild(footer)

			body.appendChild(imgWrap)
			body.appendChild(detailsWrap)

			const actions = document.createElement('div')
			actions.className = 'config-activity-actions'

			const loadBtn = document.createElement('button')
			loadBtn.className = 'config-activity-btn'
			loadBtn.textContent = 'load'

			const uploadCloudBtn = document.createElement('button')
			uploadCloudBtn.className = 'config-activity-btn'
			uploadCloudBtn.textContent = 'upload'

			const detailsBtn = document.createElement('button')
			detailsBtn.className = 'config-activity-btn'
			detailsBtn.textContent = 'details'

			const exportBtnCfg = document.createElement('button')
			exportBtnCfg.className = 'config-activity-btn'
			exportBtnCfg.textContent = 'export'

			const delBtn = document.createElement('button')
			delBtn.className = 'config-activity-btn danger'
			delBtn.textContent = '✕'

			loadBtn.addEventListener('click', async e => {
				e.preventDefault()
				const ctx = window.__voidPresenceCtx as VoidPresenceCtx | undefined
				if (!ctx) return

				const base: FullState = {
					clientId: state.clientId || localStorage.getItem('clientId') || '',
					updateIntervalSec:
						state.updateIntervalSec ||
						localStorage.getItem('updateIntervalSec') ||
						'',
					buttonPairs: Array.isArray(state.buttonPairs)
						? state.buttonPairs
						: [],
					cycles: Array.isArray(state.cycles) ? state.cycles : [],
					imageCycles: Array.isArray(state.imageCycles)
						? state.imageCycles
						: [],
					party: Array.isArray(state.party) ? state.party : [],
					timeCycles: Array.isArray(state.timeCycles) ? state.timeCycles : [],
					timestampMode:
						state.timestampMode ??
						(localStorage.getItem('timestampMode') as TimestampMode | null) ??
						'now',
					timestampRangeMin:
						state.timestampRangeMin ??
						localStorage.getItem('timestampRangeMin') ??
						'',
					timestampRangeMax:
						state.timestampRangeMax ??
						localStorage.getItem('timestampRangeMax') ??
						'',
					nowMode:
						state.nowMode ??
						(localStorage.getItem('nowMode') as NowMode | null) ??
						'plain',
					activityType:
						state.activityType ??
						(localStorage.getItem('activityType') as ActivityType | null) ??
						'playing',
				}

				const st = deepCloneState(base)
				applyStateToUIAndLists(st, ctx)
				await pushLiveStateFromCtx(ctx)
				nameInput.value = ''
				setActiveView('main')
			})

			uploadCloudBtn.addEventListener('click', e => {
				e.preventDefault()

				openUploadConfirm(cfg, async () => {
					const authorInput = document.getElementById(
						'config-author-input',
					) as HTMLInputElement | null

					if (!authorInput?.value.trim()) {
						appendLog({
							message: 'Enter author ID first',
							level: 'error',
						})
						return
					}

					const authorId = authorInput.value.trim()

					if (!window.electronAPI?.uploadConfig) {
						appendLog({
							message: 'Cloud upload is not available',
							level: 'error',
						})
						return
					}

					const stateFromConfig: FullState = {
						clientId: cfg.state?.clientId ?? '',
						updateIntervalSec: cfg.state?.updateIntervalSec ?? '',
						buttonPairs: Array.isArray(cfg.state?.buttonPairs)
							? cfg.state!.buttonPairs
							: [],
						cycles: Array.isArray(cfg.state?.cycles) ? cfg.state!.cycles : [],
						imageCycles: Array.isArray(cfg.state?.imageCycles)
							? cfg.state!.imageCycles
							: [],
						party: Array.isArray(cfg.state?.party) ? cfg.state!.party : [],
						timeCycles: Array.isArray(cfg.state?.timeCycles)
							? cfg.state!.timeCycles
							: [],
					}

					try {
						uploadCloudBtn.disabled = true
						uploadCloudBtn.innerHTML = 'uploading...'

						const safeState = JSON.parse(
							JSON.stringify(stateFromConfig, (key, value) =>
								key === 'clientId' ? undefined : value,
							),
						) as FullState

						const config = {
							title: cfg.name || 'Unnamed profile',
							authorId,
							authorName: '',
							description: `Uploaded ${new Date().toLocaleDateString()}`,
							configData: safeState,
						}

						await window.electronAPI.uploadConfig(config)

						appendLog({
							message: `Config "${config.title}" uploaded!`,
							level: 'success',
						})
					} catch (err: any) {
						appendLog({
							message: `Upload failed: ${err?.message ?? String(err)}`,
							level: 'error',
						})
					} finally {
						uploadCloudBtn.disabled = false
						uploadCloudBtn.innerHTML = 'upload'
					}
				})
			})

			detailsBtn.addEventListener('click', e => {
				e.preventDefault()
				openConfigDetails(cfg)
			})

			exportBtnCfg.addEventListener('click', e => {
				e.preventDefault()
				const data: FullState = {
					clientId: undefined,
					cycles: (state.cycles && state.cycles.slice()) || [],
					imageCycles: (state.imageCycles && state.imageCycles.slice()) || [],
					buttonPairs: (state.buttonPairs && state.buttonPairs.slice()) || [],
					party: Array.isArray(state.party) ? state.party.slice() : undefined,
					timeCycles: Array.isArray(state.timeCycles)
						? state.timeCycles.slice()
						: [],
					timestampMode: state.timestampMode,
					timestampRangeMin: state.timestampRangeMin,
					timestampRangeMax: state.timestampRangeMax,
					activityType: state.activityType,
					nowMode: state.nowMode,
					updateIntervalSec: state.updateIntervalSec,
				}

				const name =
					cfg.name || `void-presence-${new Date().toISOString().slice(0, 10)}`
				downloadJson(data, `${name}.json`)
			})

			delBtn.addEventListener('click', e => {
				e.preventDefault()
				const configs = getConfigs()
				const index = configs.findIndex(c => c.createdAt === cfg.createdAt)
				if (index === -1) return
				configs.splice(index, 1)
				setConfigs(configs)
				renderConfigs()
			})

			actions.appendChild(loadBtn)
			actions.appendChild(uploadCloudBtn)
			actions.appendChild(detailsBtn)
			actions.appendChild(exportBtnCfg)
			actions.appendChild(delBtn)

			card.appendChild(body)
			card.appendChild(actions)

			list.appendChild(card)
		})

		if (configSearchInput) {
			const q = configSearchInput.value.trim().toLowerCase()
			if (q) {
				const items = list.querySelectorAll<HTMLElement>('[data-config-id]')
				items.forEach(item => {
					const name = (item.getAttribute('data-name') || '').toLowerCase()
					const author = (item.getAttribute('data-author') || '').toLowerCase()
					const match = !q || name.includes(q) || author.includes(q)
					item.style.display = match ? '' : 'none'
				})
			}
		}
	}

	function addConfigFromState(name: string, state: FullState): void {
		const configs = getConfigs()
		configs.push({
			name,
			state: deepCloneState(state),
			createdAt: new Date().toISOString(),
		})
		setConfigs(configs)
		renderConfigs()
	}

	;(window as any).addConfigFromState = addConfigFromState

	const configToast = document.getElementById(
		'config-toast',
	) as HTMLElement | null

	function showConfigToast() {
		if (!configToast) return
		configToast.dataset.visible = 'true'
		setTimeout(() => {
			configToast.dataset.visible = 'false'
		}, 1800)
	}

	saveBtn.addEventListener('click', e => {
		e.preventDefault()
		const name = nameInput.value.trim()
		if (!name) return
		const state = loadCurrentState()
		addConfigFromState(name, state)
		nameInput.value = ''
		showConfigToast()
	})

	addBtn.addEventListener('click', e => {
		e.preventDefault()
		const importOverlay = document.getElementById(
			'import-overlay',
		) as HTMLElement | null
		if (importOverlay) {
			importOverlay.dataset.open = 'true'
		}
	})

	exportBtn.addEventListener('click', e => {
		e.preventDefault()
		const state = loadCurrentState()
		const data: FullState = {
			clientId: undefined,
			cycles: state.cycles || [],
			imageCycles: state.imageCycles || [],
			buttonPairs: state.buttonPairs || [],
			party: state.party || [],
			timeCycles: state.timeCycles || [],
		}

		const name =
			nameInput.value.trim() ||
			`void-presence-${new Date().toISOString().slice(0, 10)}`
		downloadJson(data, `${name}.json`)
	})

	if (configSearchInput && list) {
		configSearchInput.addEventListener('input', () => {
			const query = configSearchInput.value.trim().toLowerCase()
			const items = list.querySelectorAll<HTMLElement>('[data-config-id]')

			items.forEach(item => {
				const name = (item.getAttribute('data-name') || '').toLowerCase()
				const author = (item.getAttribute('data-author') || '').toLowerCase()
				const match = !query || name.includes(query) || author.includes(query)
				item.style.display = match ? '' : 'none'
			})
		})
	}

	renderConfigs()
}

const configSearchInput = document.getElementById(
	'config-search-input',
) as HTMLInputElement | null
const configList = document.getElementById('config-list') as HTMLElement | null

if (configSearchInput && configList) {
	configSearchInput.addEventListener('input', () => {
		const query = configSearchInput.value.trim().toLowerCase()
		const items = configList.querySelectorAll<HTMLElement>('[data-config-id]')

		items.forEach(item => {
			const name = (item.getAttribute('data-name') || '').toLowerCase()
			const author = (item.getAttribute('data-author') || '').toLowerCase()
			const match = !query || name.includes(query) || author.includes(query)

			item.style.display = match ? '' : 'none'
		})
	})
}

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
	const partyList = document.getElementById('party-list') as HTMLElement | null
	const addParty = document.getElementById(
		'add-party',
	) as HTMLButtonElement | null

	const modeNow = document.getElementById(
		'timestamp-mode-now',
	) as HTMLButtonElement | null
	const modeRange = document.getElementById(
		'timestamp-mode-range',
	) as HTMLButtonElement | null
	const modePersist = document.getElementById(
		'timestamp-mode-persist',
	) as HTMLButtonElement | null

	const rangeMinInput = document.getElementById(
		'timestamp-range-min',
	) as HTMLInputElement | null
	const rangeMaxInput = document.getElementById(
		'timestamp-range-max',
	) as HTMLInputElement | null
	const persistResetBtn = document.getElementById(
		'timestamp-persist-reset',
	) as HTMLButtonElement | null

	const rangeRows = document.querySelectorAll<HTMLElement>(
		'.timestamp-range-row',
	)
	const persistRow = document.querySelector<HTMLElement>(
		'.timestamp-persist-row',
	)

	const timeList = document.getElementById('time-list') as HTMLElement | null
	const addTime = document.getElementById(
		'add-time',
	) as HTMLButtonElement | null

	const nowPlain = document.getElementById(
		'now-mode-plain',
	) as HTMLButtonElement | null
	const nowProgress = document.getElementById(
		'now-mode-progress',
	) as HTMLButtonElement | null
	const nowCycles = document.getElementById(
		'now-mode-cycles',
	) as HTMLButtonElement | null

	const nowModeRow = document.querySelector<HTMLElement>('.now-mode-row')
	const timeDivider = document.querySelector<HTMLElement>(
		'.time-cycles-divider',
	)

	const timeHeader = document.querySelector<HTMLElement>('.time-cycles-header')

	const storedMode =
		(localStorage.getItem('timestampMode') as TimestampMode | null) || 'now'
	const storedMin = localStorage.getItem('timestampRangeMin') || ''
	const storedMax = localStorage.getItem('timestampRangeMax') || ''

	const storedNowMode =
		(localStorage.getItem('nowMode') as NowMode | null) || 'plain'

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

	clientInput.value = localStorage.getItem('clientId') || ''
	let lastSavedClientId = clientInput.value.trim()

	const ctx: VoidPresenceCtx = {
		clientId: [],
		buttonPairs: [],
		cycles: [],
		imageCycles: [],
		party: [],
		timeCycles: [],
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

	function setNowMode(m: NowMode) {
		if (nowPlain) nowPlain.dataset.active = m === 'plain' ? 'true' : 'false'
		if (nowProgress)
			nowProgress.dataset.active = m === 'progress' ? 'true' : 'false'
		if (nowCycles) nowCycles.dataset.active = m === 'cycles' ? 'true' : 'false'

		localStorage.setItem('nowMode', m)

		const mode: TimestampMode =
			(localStorage.getItem('timestampMode') as TimestampMode | null) || 'now'
		const isNow = mode === 'now'
		const showTime = isNow && m === 'cycles'

		if (nowModeRow) nowModeRow.dataset.visible = isNow ? 'true' : 'false'
		if (timeDivider) timeDivider.dataset.visible = showTime ? 'true' : 'false'
		if (timeHeader) timeHeader.dataset.visible = showTime ? 'true' : 'false'
		if (timeList) timeList.dataset.visible = showTime ? 'true' : 'false'

		void pushLiveStateFromCtx(ctx)
	}

	function setMode(m: TimestampMode) {
		if (modeNow) modeNow.dataset.active = m === 'now' ? 'true' : 'false'
		if (modeRange) modeRange.dataset.active = m === 'range' ? 'true' : 'false'
		if (modePersist)
			modePersist.dataset.active = m === 'persist' ? 'true' : 'false'

		rangeRows.forEach(row => {
			row.dataset.visible = m === 'range' ? 'true' : 'false'
		})
		if (persistRow) {
			persistRow.dataset.visible = m === 'persist' ? 'true' : 'false'
		}

		const isNow = m === 'now'
		if (nowModeRow) nowModeRow.dataset.visible = isNow ? 'true' : 'false'

		const nowModeVal: NowMode =
			(localStorage.getItem('nowMode') as NowMode | null) || 'plain'
		const showTime = isNow && nowModeVal === 'cycles'

		if (timeDivider) timeDivider.dataset.visible = showTime ? 'true' : 'false'
		if (timeHeader) timeHeader.dataset.visible = showTime ? 'true' : 'false'
		if (timeList) timeList.dataset.visible = showTime ? 'true' : 'false'

		localStorage.setItem('timestampMode', m)

		void pushLiveStateFromCtx(ctx)
	}

	setNowMode(storedNowMode)
	setMode(storedMode)

	modeNow?.addEventListener('click', e => {
		e.preventDefault()
		setMode('now')
	})

	modeRange?.addEventListener('click', e => {
		e.preventDefault()
		setMode('range')
	})

	modePersist?.addEventListener('click', e => {
		e.preventDefault()
		setMode('persist')
	})

	nowPlain?.addEventListener('click', e => {
		e.preventDefault()
		setNowMode('plain')
	})

	nowProgress?.addEventListener('click', e => {
		e.preventDefault()
		setNowMode('progress')
	})

	nowCycles?.addEventListener('click', e => {
		e.preventDefault()
		setNowMode('cycles')
	})

	if (rangeMinInput) rangeMinInput.value = storedMin
	if (rangeMaxInput) rangeMaxInput.value = storedMax

	rangeMinInput?.addEventListener('input', () => {
		localStorage.setItem('timestampRangeMin', rangeMinInput.value)
		void pushLiveStateFromCtx(ctx)
	})

	rangeMaxInput?.addEventListener('input', () => {
		localStorage.setItem('timestampRangeMax', rangeMaxInput.value)
		void pushLiveStateFromCtx(ctx)
	})

	persistResetBtn?.addEventListener('click', e => {
		e.preventDefault()
		if (window.electronAPI?.resetPersistTimestamp) {
			window.electronAPI.resetPersistTimestamp()
		}
	})

	const clientIdToast = document.getElementById(
		'client-id-toast',
	) as HTMLElement | null
	const blocksToast = document.getElementById(
		'blocks-toast',
	) as HTMLElement | null

	function showClientIdToast() {
		if (!clientIdToast) return
		clientIdToast.dataset.visible = 'true'
		setTimeout(() => {
			clientIdToast.dataset.visible = 'false'
		}, 1800)
	}

	function showBlocksToast() {
		if (!blocksToast) return
		blocksToast.dataset.visible = 'true'
		setTimeout(() => {
			blocksToast.dataset.visible = 'false'
		}, 1800)
	}

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

	addTime?.addEventListener('click', e => {
		e.preventDefault()
		ctx.timeCycles!.push({ label: '', seconds: '' })
		localStorage.setItem('timeCycles', JSON.stringify(ctx.timeCycles))
		ctx.renderTimeCycles!()
		void pushLiveStateFromCtx(ctx)
		showBlocksToast()
	})

	addParty?.addEventListener('click', e => {
		e.preventDefault()
		ctx.party.push({ sizeCurrent: '', sizeMax: '' })
		localStorage.setItem('party', JSON.stringify(ctx.party))
		ctx.renderPartyCycles()
		void pushLiveStateFromCtx(ctx)
		showBlocksToast()
	})

	ctx.renderPartyCycles()
	ctx.renderButtonPairs()
	ctx.renderCycles()
	ctx.renderImageCycles()
	ctx.renderTimeCycles()

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

	addButtonPair.addEventListener('click', e => {
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

	addCycle.addEventListener('click', e => {
		e.preventDefault()
		ctx.cycles.push({
			details: '',
			state: '',
		})
		ctx.renderCycles()
		void pushLiveStateFromCtx(ctx)
		showBlocksToast()
	})

	addImage.addEventListener('click', e => {
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
	;(window as any).__voidPresenceCtx = ctx
	if (recentList) {
		renderRecentApps(recentList)
	}

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
