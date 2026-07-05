import { t } from 'i18next'
import {
	ActivityType,
	CycleEntry,
	FullState,
	ImageCycleEntry,
	NowMode,
	StatusCycleEntry,
	StoredConfig,
	TimestampMode,
	VoidPresenceCtx,
} from '../../../types/types'
import { applyStateToUIAndLists } from '../core/state'
import { reattachDnDForProfiles } from '../helpers/dnd'
import { openConfigDetails } from '../modals/details'
import { appendLog, setActiveView } from '../shell/views'
import { filterListByExistingInput } from './config-search'
import {
	deepCloneState,
	getConfigs,
	getRecentApps,
	setConfigs,
	StoredRecentApp,
} from './config-storage'
import { downloadJson, pushLiveStateFromCtx } from './live'
import { setupToasts } from './toasts'
import { openUploadConfirm } from './upload-сonfirm'

export function addConfigFromState(name: string, state: FullState): void {
	const configs = getConfigs()
	configs.push({
		name,
		state: deepCloneState(state),
		createdAt: new Date().toISOString(),
	})
	setConfigs(configs)
	renderConfigs()
}

export function attachAddConfigGlobal() {
	;(window as any).addConfigFromState = addConfigFromState
}

export function buildBaseStateFromConfig(cfgState: Partial<FullState>): FullState {
	const state = cfgState || {}
	const base: FullState = {
		clientId: state.clientId || localStorage.getItem('clientId') || '',
		updateIntervalSec: state.updateIntervalSec || localStorage.getItem('updateIntervalSec') || '',
		buttonPairs: Array.isArray(state.buttonPairs) ? state.buttonPairs : [],
		cycles: Array.isArray(state.cycles) ? state.cycles : [],
		imageCycles: Array.isArray(state.imageCycles) ? state.imageCycles : [],
		party: Array.isArray(state.party) ? state.party : [],
		timeCycles: Array.isArray(state.timeCycles) ? state.timeCycles : [],
		timestampMode:
			state.timestampMode ??
			(localStorage.getItem('timestampMode') as TimestampMode | null) ??
			'now',
		timestampRangeMin: state.timestampRangeMin ?? localStorage.getItem('timestampRangeMin') ?? '',
		timestampRangeMax: state.timestampRangeMax ?? localStorage.getItem('timestampRangeMax') ?? '',
		nowMode: state.nowMode ?? (localStorage.getItem('nowMode') as NowMode | null) ?? 'plain',
		activityType:
			state.activityType ??
			(localStorage.getItem('activityType') as ActivityType | null) ??
			'playing',
	}
	return base
}

function createConfigCard(
	cfg: StoredConfig,
	list: HTMLElement,
	nameInput: HTMLInputElement,
	showConfigToast: () => void
): void {
	const state = cfg.state || {}
	const cycles: CycleEntry[] = Array.isArray(state.cycles) ? state.cycles : []
	const firstCycle: CycleEntry | undefined = cycles[0]
	const details = firstCycle?.details || 'New cycle'
	const activityState = firstCycle?.state || 'In the void'
	const firstImage: ImageCycleEntry | null =
		(Array.isArray(state.imageCycles) && state.imageCycles[0]) || null
	const largeImage = firstImage && firstImage.largeImage ? firstImage.largeImage : 'about:blank'

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

	card.appendChild(body)

	const actions = document.createElement('div')
	actions.className = 'config-activity-actions'

	const loadBtn = document.createElement('button')
	loadBtn.className = 'config-activity-btn'
	loadBtn.textContent = t('load')

	const uploadCloudBtn = document.createElement('button')
	uploadCloudBtn.className = 'config-activity-btn'
	uploadCloudBtn.textContent = t('upload')

	const detailsBtn = document.createElement('button')
	detailsBtn.className = 'config-activity-btn'
	detailsBtn.textContent = t('details')

	const exportBtnCfg = document.createElement('button')
	exportBtnCfg.className = 'config-activity-btn'
	exportBtnCfg.textContent = t('export')

	const delBtn = document.createElement('button')
	delBtn.className = 'config-activity-btn danger'
	delBtn.textContent = '✕'

	loadBtn.addEventListener('click', async e => {
		e.preventDefault()
		const ctx = window.__voidPresenceCtx as VoidPresenceCtx | undefined
		if (!ctx) return

		const safeState = deepCloneState((state || {}) as FullState)
		const base = buildBaseStateFromConfig(safeState)

		const currentStatusCyclesRaw = localStorage.getItem('statusCycles')
		const currentStatusCycles: StatusCycleEntry[] = (() => {
			if (!currentStatusCyclesRaw) return []
			try {
				const parsed = JSON.parse(currentStatusCyclesRaw)
				return Array.isArray(parsed) ? parsed : []
			} catch {
				return []
			}
		})()

		const currentStatusInterval = localStorage.getItem('updateIntervalSecStatus') || '30'
		const currentDiscordToken = localStorage.getItem('discordToken') || ''

		const configCycles: CycleEntry[] = Array.isArray(safeState.cycles) ? safeState.cycles : []

		const st: FullState = {
			...base,
			statusCycles: currentStatusCycles,
			updateIntervalSecStatus: currentStatusInterval,
			discordToken: currentDiscordToken,
			cycles: configCycles,
		}

		await applyStateToUIAndLists(st, ctx)
		await pushLiveStateFromCtx(ctx)

		nameInput.value = ''
		setActiveView('main')

		const { showBlocksToast } = setupToasts()
		const storedRecent: StoredRecentApp[] = getRecentApps()
		reattachDnDForProfiles(ctx, showBlocksToast, storedRecent)

		const { showConfigLoadedToast } = setupToasts()
		showConfigLoadedToast()
	})

	uploadCloudBtn.addEventListener('click', e => {
		e.preventDefault()
		openUploadConfirm(cfg, async () => {
			const authorInput = document.getElementById('config-author-input') as HTMLInputElement | null
			if (!authorInput?.value.trim()) {
				appendLog({
					message: 'Enter author ID(get from voidpresence.site/profile) first',
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
				buttonPairs: Array.isArray(cfg.state?.buttonPairs) ? cfg.state!.buttonPairs : [],
				cycles: Array.isArray(cfg.state?.cycles) ? cfg.state!.cycles : [],
				imageCycles: Array.isArray(cfg.state?.imageCycles) ? cfg.state!.imageCycles : [],
				party: Array.isArray(cfg.state?.party) ? cfg.state!.party : [],
			}

			try {
				uploadCloudBtn.disabled = true
				uploadCloudBtn.innerHTML = 'uploading...'

				const safeState = JSON.parse(
					JSON.stringify(stateFromConfig, (key, value) => (key === 'clientId' ? undefined : value))
				) as FullState

				const storedAuthorName = localStorage.getItem('authorName') || ''
				const storedAuthorAvatar = localStorage.getItem('authorAvatar') || ''

				const config = {
					title: cfg.name || 'Unnamed profile',
					authorId,
					authorName: storedAuthorName,
					authorAvatar: storedAuthorAvatar,
					description: `Uploaded ${new Date().toLocaleDateString()}`,
					configData: safeState,
				}

				await window.electronAPI.uploadConfig(config)

				appendLog({
					message: `Config "${config.title}" uploaded!`,
					level: 'success',
				})
				const { showConfigUpLoadedToast } = setupToasts()
				showConfigUpLoadedToast()
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
		const clonedCfg: StoredConfig = {
			...cfg,
			state: cfg.state ? deepCloneState(cfg.state as FullState) : undefined,
		}
		openConfigDetails(clonedCfg)
	})

	exportBtnCfg.addEventListener('click', e => {
		e.preventDefault()
		const data: FullState = {
			clientId: undefined,
			cycles: (state.cycles && state.cycles.slice()) || [],
			imageCycles: (state.imageCycles && state.imageCycles.slice()) || [],
			buttonPairs: (state.buttonPairs && state.buttonPairs.slice()) || [],
			party: Array.isArray(state.party) ? state.party.slice() : undefined,
			timeCycles: Array.isArray(state.timeCycles) ? state.timeCycles.slice() : [],
			timestampMode: state.timestampMode,
			timestampRangeMin: state.timestampRangeMin,
			timestampRangeMax: state.timestampRangeMax,
			activityType: state.activityType,
			nowMode: state.nowMode,
			updateIntervalSec: state.updateIntervalSec,
		}
		const name = cfg.name || `void-presence-${new Date().toISOString().slice(0, 10)}`
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

		const { showConfigDeleteToast } = setupToasts()
		showConfigDeleteToast()
	})

	actions.appendChild(loadBtn)
	actions.appendChild(uploadCloudBtn)
	actions.appendChild(detailsBtn)
	actions.appendChild(exportBtnCfg)
	actions.appendChild(delBtn)

	card.appendChild(actions)
	list.appendChild(card)
}

export function renderConfigs() {
	const list = document.getElementById('config-list') as HTMLElement | null
	const nameInput = document.getElementById('config-name-input') as HTMLInputElement | null
	const configSearchInput = document.getElementById(
		'config-search-input'
	) as HTMLInputElement | null
	if (!list || !nameInput) return

	const configs = getConfigs()
		.slice()
		.sort((a, b) => {
			const ad = a.createdAt ? new Date(a.createdAt).getTime() : 0
			const bd = b.createdAt ? new Date(b.createdAt).getTime() : 0
			return bd - ad
		})

	list.innerHTML = ''

	const { showConfigSavedToast } = setupToasts()

	configs.forEach(cfg => {
		createConfigCard(cfg, list, nameInput, showConfigSavedToast)
	})

	if (configSearchInput) {
		filterListByExistingInput(configSearchInput, list)
	}
}
