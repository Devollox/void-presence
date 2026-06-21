import { contextBridge, ipcRenderer } from 'electron'
import { Language } from './main/translations'
import {
	ButtonPair,
	CycleEntry,
	FullState,
	ImageCycleEntry,
	LogEntry,
	PartyConfig,
	RpcPayload,
	StatusCycleEntry,
	UpdateInfo,
} from './types/types'

contextBridge.exposeInMainWorld('electronAPI', {
	liveSetClientId: (clientId: string) => ipcRenderer.invoke('live-set-client-id', clientId),
	liveSetButtons: (pairs: ButtonPair[]) => ipcRenderer.invoke('live-set-buttons', pairs),
	liveSetCycles: (entries: CycleEntry[]) => ipcRenderer.invoke('live-set-cycles', entries),
	liveSetImages: (cycles: ImageCycleEntry[]) => ipcRenderer.invoke('live-set-images', cycles),
	liveSetParty: (party: { sizeCurrent: string; sizeMax: string }[]) =>
		ipcRenderer.invoke('live-set-party', party),
	liveSetTimeCycles: (cycles: { label: string; seconds: string }[]) =>
		ipcRenderer.invoke('live-set-time-cycles', cycles),
	liveSetInterval: (sec: number) => ipcRenderer.invoke('live-set-interval', sec),
	liveSetDiscordToken: (token: string) => ipcRenderer.invoke('live-set-discord-token', token),
	liveSetStatusInterval: (sec: number) => ipcRenderer.invoke('live-set-status-interval', sec),
	liveSetStatusCycles: (cycles: StatusCycleEntry[]) =>
		ipcRenderer.invoke('live-set-status-cycles', cycles),
	liveSetTimestamp: (cfg: { mode: string; rangeMin: string; rangeMax: string; nowMode: string }) =>
		ipcRenderer.invoke('live-set-timestamp', cfg),
	restartDiscordRich: () => ipcRenderer.invoke('restart-discord-rich'),
	stopDiscordRich: () => ipcRenderer.invoke('stop-discord-rich'),
	onRpcUpdate: (callback: (payload: RpcPayload) => void) => {
		ipcRenderer.on('rpc-update', (_event, payload) => callback(payload))
	},
	onRpcStatus: (callback: (status: string) => void) => {
		ipcRenderer.on('rpc-status', (_event, status) => callback(status))
	},
	onStatusStatus: (callback: (status: string) => void) => {
		ipcRenderer.on('status-status', (_event, status) => callback(status))
	},
	onStatusPayload: (callback: (text: string | null) => void) => {
		ipcRenderer.on('status-payload', (_event, text) => callback(text))
	},
	setClientId: (clientId: string) => ipcRenderer.invoke('set-client-id', clientId),
	setAutoLaunch: (enabled: boolean) => ipcRenderer.invoke('set-auto-launch', enabled),
	setImageCycles: (
		cycles: {
			largeImage: string
			largeText: string
			smallImage: string
			smallText: string
		}[]
	) => ipcRenderer.invoke('set-image-cycles', cycles),
	setButtons: (pairs: { label1: string; url1: string; label2: string; url2: string }[]) =>
		ipcRenderer.invoke('set-buttons', pairs),
	setCycles: (entries: { details: string; state: string }[]) =>
		ipcRenderer.invoke('set-cycles', entries),
	windowClose: () => ipcRenderer.invoke('window-close'),
	windowMinimize: () => ipcRenderer.invoke('window-minimize'),
	windowToggleMaximize: () => ipcRenderer.invoke('window-toggle-maximize'),
	onLogMessage: (callback: (entry: LogEntry) => void) => {
		ipcRenderer.on('log-message', (_event, entry) => callback(entry))
	},
	setAutoHide: (value: boolean) => ipcRenderer.invoke('set-auto-hide', value),
	getAutoHide: () => ipcRenderer.invoke('get-auto-hide'),
	setActivityInterval: (sec: number) => ipcRenderer.invoke('set-activity-interval', sec),
	uploadConfig: (config: {
		title: string
		authorId: string
		authorName: string
		description: string
		configData: FullState
	}) => ipcRenderer.invoke('cloud:uploadConfig', config),
	uploadStatusConfig: (config: {
		title: string
		authorId: string
		authorName: string
		description: string
		configData: { statusCycles: StatusCycleEntry[] }
	}) => ipcRenderer.invoke('cloud:uploadStatusConfig', config),
	setPartySize: (sizeCurrent: number, sizeMax: number) =>
		ipcRenderer.invoke('set-party-size', { sizeCurrent, sizeMax }),
	setPartyConfig: (config: PartyConfig) => ipcRenderer.invoke('set-party-config', config),
	setTimestampConfig: (cfg: { mode: string; rangeMin: number | null; rangeMax: number | null }) =>
		ipcRenderer.invoke('set-timestamp-config', cfg),
	resetPersistTimestamp: () => ipcRenderer.invoke('reset-persist-timestamp'),
	setActivityType: (type: string) => ipcRenderer.invoke('set-activity-type', type),
	openDiscordDeveloperAuthorId: () => {
		ipcRenderer.invoke('open-discord-author-id')
	},
	openDiscordDeveloperPortal: () => {
		ipcRenderer.invoke('open-discord-client-id')
	},
	openDiscordGetTokenVideo: () => {
		ipcRenderer.invoke('open-discord-token-id')
	},
	openDiscordGetTokenVideoError: () => {
		ipcRenderer.invoke('open-discord-token-error-id')
	},
	setMusicFilter: (enabled: boolean) => ipcRenderer.invoke('settings:set-music-filter', enabled),
	setVideoFilter: (enabled: boolean) => ipcRenderer.invoke('settings:set-video-filter', enabled),
	setAutomaticActivity: (enabled: boolean) =>
		ipcRenderer.invoke('settings:set-automatic-activity', enabled),
	setCoverFetch: (enabled: boolean) => ipcRenderer.invoke('settings:set-cover-fetch', enabled),
	setStatusEnabled: (enabled: boolean) =>
		ipcRenderer.invoke('settings:set-status-enabled', enabled),
	setStatusCyclesConfig: (cycles: StatusCycleEntry[]) =>
		ipcRenderer.invoke('settings:set-status-cycles', cycles),
	statusGetCurrent: () => ipcRenderer.invoke('status:get-current'),
	statusSetCurrent: (cycles: StatusCycleEntry[]) =>
		ipcRenderer.invoke('status:set-current', cycles),
	setRpcEnabled: (enabled: boolean) => ipcRenderer.invoke('settings:set-rpc-enabled', enabled),
	onUpdateAvailable: (callback: (info: UpdateInfo) => void) => {
		ipcRenderer.on('update-available', (_event, info) => callback(info))
	},
	installUpdate: (info: UpdateInfo) => {
		ipcRenderer.send('install-update', info)
	},
	useReadyClientId: () => ipcRenderer.invoke('use-ready-client-id'),
	useRecentClientId: (clientId: string) => ipcRenderer.invoke('use-recent-client-id', clientId),
	setHardwareMonitor: (enabled: boolean) =>
		ipcRenderer.invoke('settings:set-hardware-monitor', enabled),
	setBarStyleConfig: (barStyle: string) => ipcRenderer.invoke('set-bar-style-config', barStyle),
	customStatusRestart: () => ipcRenderer.invoke('custom-status:restart'),
	customStatusStop: () => ipcRenderer.invoke('custom-status:stop'),
	setStatusEnabledBrowser: (enabled: boolean) =>
		ipcRenderer.invoke('settings:set-status-enabled-browser', enabled),
	getLanguage: () => ipcRenderer.invoke('get-language'),
	setLanguage: (lang: Language) => ipcRenderer.invoke('set-language', lang),
	onImportConfigFromProtocol: (callback: (payload: unknown) => void) => {
		ipcRenderer.on('IMPORT_CONFIG_FROM_PROTOCOL', (_event, payload) => callback(payload))
	},
})
