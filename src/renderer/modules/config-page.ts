import { PartyCycleEntry } from 'src/discord/modules/types'
import { openConfigDetails } from './config-details'
import {
	applyStateToUIAndLists,
	loadCurrentState,
	saveAllFromState,
} from './state'
import {
	ButtonPair,
	CycleEntry,
	FullState,
	ImageCycleEntry,
	StoredConfig,
	TimestampMode,
	VoidPresenceCtx,
} from './types'
import { appendLog, setActiveView } from './views'

type StoredRecentApp = {
	id: string
	name: string
	lastUsedAt: string
}

function getConfigs(): StoredConfig[] {
	try {
		const raw = localStorage.getItem('vpConfigs')
		return raw ? (JSON.parse(raw) as StoredConfig[]) : []
	} catch {
		return []
	}
}

function setConfigs(configs: StoredConfig[]): void {
	localStorage.setItem('vpConfigs', JSON.stringify(configs))
}

function getRecentApps(): StoredRecentApp[] {
	try {
		const raw = localStorage.getItem('vpRecentApps')
		return raw ? (JSON.parse(raw) as StoredRecentApp[]) : []
	} catch {
		return []
	}
}

function setRecentApps(items: StoredRecentApp[]): void {
	localStorage.setItem('vpRecentApps', JSON.stringify(items))
}

function upsertRecentApp(id: string, name: string): void {
	const cleanId = id.trim()
	if (!cleanId) return
	const cleanName = name.trim() || 'Unnamed app'
	const items = getRecentApps()
	const exists = items.some(x => x.id === cleanId)
	if (exists) {
		setRecentApps(items)
		return
	}
	const now = new Date().toISOString()
	items.push({ id: cleanId, name: cleanName, lastUsedAt: now })
	const sorted = items
		.slice()
		.sort(
			(a, b) =>
				new Date(b.lastUsedAt).getTime() - new Date(a.lastUsedAt).getTime(),
		)
	setRecentApps(sorted.slice(0, 10))
}

function updateRecentName(id: string, name: string): void {
	const items = getRecentApps()
	const idx = items.findIndex(x => x.id === id)
	if (idx === -1) return
	items[idx] = { ...items[idx], name: name.trim() || 'Unnamed app' }
	setRecentApps(items)
}

function removeRecentApp(id: string): void {
	const items = getRecentApps().filter(x => x.id !== id)
	setRecentApps(items)
}

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

function createButtonPairRow(
	pair: ButtonPair,
	index: number,
	onChange: (pair: ButtonPair) => void,
	onRemove: () => void,
): HTMLDivElement {
	const row = document.createElement('div')
	row.className = 'pair-row'
	row.dataset.index = String(index)
	row.draggable = true

	const inputsWrap = document.createElement('div')
	inputsWrap.className = 'pair-inputs'

	const input1 = document.createElement('input')
	input1.placeholder = 'Button Name #1'
	input1.value = pair.label1 || ''

	const input2 = document.createElement('input')
	input2.placeholder = 'URL #1'
	input2.value = pair.url1 || ''

	const input3 = document.createElement('input')
	input3.placeholder = 'Button Name #2 (optional)'
	input3.value = pair.label2 || ''

	const input4 = document.createElement('input')
	input4.placeholder = 'URL #2 (optional)'
	input4.value = pair.url2 || ''

	const remove = document.createElement('button')
	remove.className = 'remove-btn'
	remove.type = 'button'
	remove.textContent = '×'

	function triggerChange(): void {
		onChange({
			label1: input1.value,
			url1: input2.value,
			label2: input3.value,
			url2: input4.value,
		})
	}

	input1.addEventListener('input', triggerChange)
	input2.addEventListener('input', triggerChange)
	input3.addEventListener('input', triggerChange)
	input4.addEventListener('input', triggerChange)

	remove.addEventListener('click', e => {
		e.preventDefault()
		onRemove()
	})

	row.appendChild(remove)
	inputsWrap.appendChild(input1)
	inputsWrap.appendChild(input2)
	inputsWrap.appendChild(input3)
	inputsWrap.appendChild(input4)
	row.appendChild(inputsWrap)

	return row
}

function createCycleRow(
	entry: CycleEntry,
	index: number,
	onChange: (entry: CycleEntry) => void,
	onRemove: () => void,
): HTMLDivElement {
	const row = document.createElement('div')
	row.className = 'cycle-row'
	row.dataset.index = String(index)
	row.draggable = true

	const inputsWrap = document.createElement('div')
	inputsWrap.className = 'cycle-inputs'

	const input1 = document.createElement('input')
	input1.placeholder = 'Details'
	input1.value = entry.details || ''

	const input2 = document.createElement('input')
	input2.placeholder = 'State'
	input2.value = entry.state || ''

	const remove = document.createElement('button')
	remove.className = 'remove-btn'
	remove.type = 'button'
	remove.textContent = '×'

	function triggerChange(): void {
		onChange({
			details: input1.value,
			state: input2.value,
		})
	}

	input1.addEventListener('input', triggerChange)
	input2.addEventListener('input', triggerChange)

	remove.addEventListener('click', e => {
		e.preventDefault()
		onRemove()
	})

	row.appendChild(remove)
	inputsWrap.appendChild(input1)
	inputsWrap.appendChild(input2)
	row.appendChild(inputsWrap)

	return row
}

function createPartyRow(
	party: PartyCycleEntry,
	index: number,
	onChange: (party: PartyCycleEntry) => void,
	onRemove: () => void,
): HTMLDivElement {
	const row = document.createElement('div')
	row.className = 'party-row'
	row.dataset.index = String(index)
	row.draggable = true

	const wrap = document.createElement('div')
	wrap.className = 'party-inputs'

	const currentInput = document.createElement('input')
	currentInput.placeholder = 'Current party size'
	currentInput.value = party.sizeCurrent?.toString() ?? ''

	const maxInput = document.createElement('input')
	maxInput.placeholder = 'Max party size'
	maxInput.value = party.sizeMax?.toString() ?? ''

	const remove = document.createElement('button')
	remove.className = 'remove-btn'
	remove.textContent = '×'

	const updateParty = () => {
		onChange({
			sizeCurrent: currentInput.value,
			sizeMax: maxInput.value,
		} as any)
	}

	currentInput.addEventListener('input', updateParty)
	maxInput.addEventListener('input', updateParty)

	remove.addEventListener('click', e => {
		e.preventDefault()
		onRemove()
	})

	row.appendChild(remove)
	wrap.appendChild(currentInput)
	wrap.appendChild(maxInput)
	row.appendChild(wrap)

	return row
}

function createImageCycleRow(
	entry: ImageCycleEntry,
	index: number,
	onChange: (entry: ImageCycleEntry) => void,
	onRemove: () => void,
): HTMLDivElement {
	const row = document.createElement('div')
	row.className = 'image-row'
	row.dataset.index = String(index)
	row.draggable = true

	const wrap = document.createElement('div')
	wrap.className = 'image-inputs'

	const largeKey = document.createElement('input')
	largeKey.placeholder = 'Large image URL(.png/.jpeg/.gif and etc)'
	largeKey.value = entry.largeImage || ''

	const largeText = document.createElement('input')
	largeText.placeholder = 'Large hover text'
	largeText.value = entry.largeText || ''

	const smallKey = document.createElement('input')
	smallKey.placeholder = 'Small image URL(.png/.jpeg/.gif and etc) (optional)'
	smallKey.value = entry.smallImage || ''

	const smallText = document.createElement('input')
	smallText.placeholder = 'Small hover text (optional)'
	smallText.value = entry.smallText || ''

	const remove = document.createElement('button')
	remove.className = 'remove-btn'
	remove.type = 'button'
	remove.textContent = '×'

	function triggerChange(): void {
		onChange({
			largeImage: largeKey.value,
			largeText: largeText.value,
			smallImage: smallKey.value,
			smallText: smallText.value,
		})
	}

	largeKey.addEventListener('input', triggerChange)
	largeText.addEventListener('input', triggerChange)
	smallKey.addEventListener('input', triggerChange)
	smallText.addEventListener('input', triggerChange)

	remove.addEventListener('click', e => {
		e.preventDefault()
		onRemove()
	})

	row.appendChild(remove)
	wrap.appendChild(largeKey)
	wrap.appendChild(largeText)
	wrap.appendChild(smallKey)
	wrap.appendChild(smallText)
	row.appendChild(wrap)

	return row
}

function deepCloneState(state: FullState): FullState {
	return JSON.parse(JSON.stringify(state)) as FullState
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
				const ctx = (window as any).__voidPresenceCtx
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
				}

				const st = deepCloneState(base)
				applyStateToUIAndLists(st, ctx)
				await saveAllFromState(st)
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
						party: Array.isArray(state.party) ? state.party : [],
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

	saveBtn.addEventListener('click', async e => {
		e.preventDefault()
		const name = nameInput.value.trim()
		if (!name) return
		const state = loadCurrentState()
		addConfigFromState(name, state)
		await saveAllFromState(state)
		nameInput.value = ''
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
		}
		const name =
			nameInput.value.trim() ||
			`void-presence-${new Date().toISOString().slice(0, 10)}`
		downloadJson(data, `${name}.json`)
	})

	renderConfigs()
}

export function setupClientIdControls(): void {
	const clientInput = document.getElementById(
		'client-id-input',
	) as HTMLInputElement | null
	const saveBtn = document.getElementById(
		'client-id-save',
	) as HTMLButtonElement | null
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

	const storedMode =
		(localStorage.getItem('timestampMode') as TimestampMode | null) || 'now'
	const storedMin = localStorage.getItem('timestampRangeMin') || ''
	const storedMax = localStorage.getItem('timestampRangeMax') || ''

	if (rangeMinInput) rangeMinInput.value = storedMin
	if (rangeMaxInput) rangeMaxInput.value = storedMax

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
		localStorage.setItem('timestampMode', m)
	}

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

	rangeMinInput?.addEventListener('input', () => {
		localStorage.setItem('timestampRangeMin', rangeMinInput.value)
	})

	rangeMaxInput?.addEventListener('input', () => {
		localStorage.setItem('timestampRangeMax', rangeMaxInput.value)
	})

	persistResetBtn?.addEventListener('click', e => {
		e.preventDefault()
		if (window.electronAPI?.resetPersistTimestamp) {
			window.electronAPI.resetPersistTimestamp()
		}
	})

	if (
		!clientInput ||
		!saveBtn ||
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

	saveBtn.type = 'button'
	clientInput.value = localStorage.getItem('clientId') || ''

	const ctx: VoidPresenceCtx = {
		buttonPairs: [],
		cycles: [],
		imageCycles: [],
		party: [],
		renderButtonPairs: () => {},
		renderCycles: () => {},
		renderImageCycles: () => {},
		renderPartyCycles: () => {},
	}

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

	function attachDnD<T>(
		container: HTMLElement,
		items: T[],
		renderFn: () => void,
	): void {
		let dragIndex: number | null = null

		container.addEventListener('dragstart', e => {
			const target = e.target as HTMLElement | null
			if (!target) return

			const isInput =
				target instanceof HTMLInputElement ||
				target instanceof HTMLTextAreaElement
			if (isInput || window.getSelection()?.toString()) {
				e.preventDefault()
				return
			}

			const row = target.closest<HTMLElement>('[data-index]')
			if (!row) return
			dragIndex = Number(row.dataset.index)
			row.classList.add('dragging')
		})

		container.addEventListener('dragend', e => {
			const target = e.target as HTMLElement | null
			const row = target?.closest<HTMLElement>('[data-index]')
			if (row) row.classList.remove('dragging')
			Array.from(container.children).forEach(ch => {
				;(ch as HTMLElement).classList.remove(
					'drop-target-top',
					'drop-target-bottom',
				)
			})
			dragIndex = null
		})

		container.addEventListener('dragover', e => {
			e.preventDefault()
			const target = e.target as HTMLElement | null
			const row = target?.closest<HTMLElement>('[data-index]')
			if (!row || dragIndex === null) return
			Array.from(container.children).forEach(ch => {
				;(ch as HTMLElement).classList.remove(
					'drop-target-top',
					'drop-target-bottom',
				)
			})
			const rect = row.getBoundingClientRect()
			const offset = e.clientY - rect.top
			if (offset < rect.height / 2) {
				row.classList.add('drop-target-top')
			} else {
				row.classList.add('drop-target-bottom')
			}
		})

		container.addEventListener('drop', e => {
			e.preventDefault()
			const target = e.target as HTMLElement | null
			const row = target?.closest<HTMLElement>('[data-index]')
			if (!row || dragIndex === null) return
			const targetIndex = Number(row.dataset.index)
			const rect = row.getBoundingClientRect()
			const offset = e.clientY - rect.top
			let insertIndex = targetIndex
			if (offset >= rect.height / 2) insertIndex = targetIndex + 1
			const [moved] = items.splice(dragIndex, 1)
			if (insertIndex > items.length) insertIndex = items.length
			items.splice(insertIndex, 0, moved)
			renderFn()
		})
	}

	ctx.renderButtonPairs = function renderButtonPairs(): void {
		if (!buttonsList) return
		buttonsList.innerHTML = ''
		ctx.buttonPairs.forEach((pair, idx) => {
			const row = createButtonPairRow(
				pair,
				idx,
				updated => {
					ctx.buttonPairs[idx] = updated
				},
				() => {
					ctx.buttonPairs.splice(idx, 1)
					ctx.renderButtonPairs()
				},
			)
			buttonsList.appendChild(row)
		})
	}

	ctx.renderCycles = function renderCycles(): void {
		if (!cyclesList) return
		cyclesList.innerHTML = ''
		ctx.cycles.forEach((entry, idx) => {
			const row = createCycleRow(
				entry,
				idx,
				updated => {
					ctx.cycles[idx] = updated
				},
				() => {
					ctx.cycles.splice(idx, 1)
					ctx.renderCycles()
				},
			)
			cyclesList.appendChild(row)
		})
	}

	ctx.renderImageCycles = function renderImageCycles(): void {
		if (!imagesList) return
		imagesList.innerHTML = ''
		ctx.imageCycles.forEach((entry, idx) => {
			const row = createImageCycleRow(
				entry,
				idx,
				updated => {
					ctx.imageCycles[idx] = updated
				},
				() => {
					ctx.imageCycles.splice(idx, 1)
					ctx.renderImageCycles()
				},
			)
			imagesList.appendChild(row)
		})
	}

	ctx.renderPartyCycles = function renderPartyCycles(): void {
		if (!partyList) return
		partyList.innerHTML = ''

		ctx.party.forEach((partyEntry, idx) => {
			const row = createPartyRow(
				partyEntry,
				idx,
				updated => {
					ctx.party[idx] = updated
					localStorage.setItem('party', JSON.stringify(ctx.party))
				},
				() => {
					ctx.party.splice(idx, 1)

					if (!ctx.party.length) {
						localStorage.removeItem('party')
					} else {
						localStorage.setItem('party', JSON.stringify(ctx.party))
					}

					ctx.renderPartyCycles()
				},
			)
			partyList.appendChild(row)
		})
	}

	try {
		const rawParty = localStorage.getItem('party')
		if (rawParty) ctx.party = JSON.parse(rawParty) as PartyCycleEntry[]
	} catch {}

	if (!Array.isArray(ctx.party)) ctx.party = []

	addParty?.addEventListener('click', e => {
		e.preventDefault()
		ctx.party.push({ sizeCurrent: '', sizeMax: '' })
		localStorage.setItem('party', JSON.stringify(ctx.party))
		ctx.renderPartyCycles()
	})

	ctx.renderPartyCycles()
	ctx.renderButtonPairs()
	ctx.renderCycles()
	ctx.renderImageCycles()

	if (partyList) attachDnD(partyList, ctx.party, ctx.renderPartyCycles)
	if (buttonsList)
		attachDnD(buttonsList, ctx.buttonPairs, ctx.renderButtonPairs)
	if (cyclesList) attachDnD(cyclesList, ctx.cycles, ctx.renderCycles)
	if (imagesList) attachDnD(imagesList, ctx.imageCycles, ctx.renderImageCycles)

	addButtonPair.addEventListener('click', e => {
		e.preventDefault()
		ctx.buttonPairs.push({
			label1: '',
			url1: '',
			label2: '',
			url2: '',
		})
		ctx.renderButtonPairs()
	})

	addCycle.addEventListener('click', e => {
		e.preventDefault()
		ctx.cycles.push({
			details: '',
			state: '',
		})
		ctx.renderCycles()
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
	})

	const copyToastId = 'vp-copy-toast'
	function showCopyToast(): void {
		let toast = document.getElementById(copyToastId) as HTMLDivElement | null
		if (!toast) {
			toast = document.createElement('div')
			toast.id = copyToastId
			toast.className = 'copy-toast'
			toast.textContent = 'Client ID copied'
			document.body.appendChild(toast)
		}
		toast.dataset.visible = 'true'
		window.setTimeout(() => {
			toast && (toast.dataset.visible = 'false')
		}, 2000)
	}
	function renderRecentApps(): void {
		const items = getRecentApps()
		recentList.innerHTML = ''
		if (!items.length) return

		items.forEach(item => {
			const row = document.createElement('div')
			row.className = 'cycle-row'
			row.dataset.id = item.id

			const inputsWrap = document.createElement('div')
			inputsWrap.className = 'cycle-inputs'

			const nameInput = document.createElement('input')
			nameInput.placeholder = 'App name'
			nameInput.value = item.name

			const idText = document.createElement('input')
			idText.value = item.id
			idText.readOnly = true
			idText.className = 'cycle-row input id-click'

			const remove = document.createElement('button')
			remove.className = 'remove-btn'
			remove.type = 'button'
			remove.textContent = '×'

			nameInput.addEventListener('input', () => {
				updateRecentName(item.id, nameInput.value)
			})

			row.addEventListener('click', async e => {
				const target = e.target as HTMLElement

				if (
					target.tagName === 'BUTTON' ||
					target.closest('button') === remove
				) {
					return
				}

				if (target === nameInput || target.closest('input') === nameInput) {
					return
				}

				const inInputsWrap = !!target.closest('.cycle-inputs')
				if (!inInputsWrap) {
					return
				}

				clientInput.value = item.id
				localStorage.setItem('clientId', item.id)

				try {
					if (navigator.clipboard && navigator.clipboard.writeText) {
						await navigator.clipboard.writeText(item.id)
						showCopyToast()
					}
				} catch {}
			})

			remove.addEventListener('click', e => {
				e.preventDefault()
				removeRecentApp(item.id)
				renderRecentApps()
			})

			row.appendChild(remove)
			inputsWrap.appendChild(nameInput)
			inputsWrap.appendChild(idText)
			row.appendChild(inputsWrap)
			recentList.appendChild(row)
		})
	}

	async function saveAll(): Promise<void> {
		const intervalInput = document.getElementById(
			'update-interval-input',
		) as HTMLInputElement | null
		const intervalSec = intervalInput
			? parseInt(intervalInput.value.trim(), 10)
			: NaN
		const state: FullState = {
			clientId: clientInput.value,
			buttonPairs: ctx.buttonPairs,
			cycles: ctx.cycles,
			imageCycles: ctx.imageCycles,
			updateIntervalSec: intervalSec,
			party: ctx.party,
			timestampMode:
				(localStorage.getItem('timestampMode') as TimestampMode) || 'now',
			timestampRangeMin: localStorage.getItem('timestampRangeMin') || '',
			timestampRangeMax: localStorage.getItem('timestampRangeMax') || '',
		}

		const partyRaw = localStorage.getItem('party')
		if (partyRaw) state.party = JSON.parse(partyRaw)
		await saveAllFromState(state)
		localStorage.setItem('clientId', state.clientId || '')
		upsertRecentApp(state.clientId || '', '')
		renderRecentApps()
	}

	saveBtn.addEventListener('click', e => {
		e.preventDefault()
		void saveAll()
	})

	clientInput.addEventListener('input', () => {
		localStorage.setItem('clientId', clientInput.value)
	})
	;(window as any).__voidPresenceCtx = ctx
	renderRecentApps()
}
