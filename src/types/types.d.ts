export type ActivityType = 'playing' | 'watching' | 'listening' | 'competing'
export type TimestampMode = 'now' | 'range' | 'persist'
export type NowMode = 'plain' | 'progress' | 'cycles'
export type ViewName = 'main' | 'logs' | 'config' | 'status' | 'settings'

export interface StatusStateResult {
	enabled: boolean
	enabledBrowser: boolean
}

export type RpcPayload = {
	details: string
	state: string
	coordinates: string
	buttons: {
		label: string
		url: string
	}[]
}

export interface RichPresenceButton {
	label: string
	url: string
}

export type PresencePayload = {
	source: 'media' | 'hardware'
	details?: string
	state?: string
	timestamps?: {
		start?: number
		end?: number
	}
	activityType?: ActivityType
	buttons?: {
		label: string
		url: string
	}[]
	party?: {
		size: [number, number]
	}
	assets?: {
		large_image?: string
		large_text?: string
		small_image?: string
		small_text?: string
	}
	priority?: number
}

export interface RichPresencePayload {
	details?: string
	state?: string
	type?: ActivityType | number
	buttons?: RichPresenceButton[]
	assets?: {
		large_image?: string
		large_text?: string
		small_image?: string
		small_text?: string
	}
	party?: {
		id?: string
		size?: [number, number]
	}
	timestamps?: {
		start?: number | Date
		end?: number | Date
	}
}

export interface ButtonPair {
	label1: string
	url1: string
	label2?: string
	url2?: string
}

export interface CycleEntry {
	details: string
	state: string
}

export interface ImageCycle {
	largeImage: string | null
	largeText: string | null
	smallImage: string | null
	smallText: string | null
}

export interface ImageCycleEntry {
	largeImage: string
	largeText: string
	smallImage: string
	smallText: string
}

export interface TimeCycleEntry {
	label: string
	seconds: number | string
}

export interface PartyCycleEntry {
	sizeCurrent: string | number
	sizeMax: string | number
	skip?: boolean
}

export type ClientConfig = {
	clientId: string | null
}

export type StatusCycleEntry = {
	text: string
	emoji: string | null
}

export type TimerConfig = {
	updateIntervalSec: number | null
	updateIntervalSecStatus: number | null
}

export type DiscordTokenConfig = {
	discordToken: string | null
}

export type ButtonsConfig = {
	pairs: ButtonPair[]
}
export type CyclesConfig = {
	entries: CycleEntry[]
}
export type ImageCyclesConfig = {
	cycles: ImageCycle[]
}

export interface ActivityTypeConfig {
	type: ActivityType
}

export interface PartyConfig {
	entries: PartyCycleEntry[]
}

export interface TimestampConfig {
	mode: TimestampMode
	rangeMin: number | null
	rangeMax: number | null
	persistOffsetSec?: number | null
	nowMode?: NowMode
	timeCycles?: TimeCycleEntry[]
}

export type StatusSourceMode = 'auto' | 'dynamic' | 'rpc' | 'manual'

export type StatusConfig = {
	cycles: StatusCycleEntry[]
}

export type LinksConfig = {
	largeImage: string | null
	largeText: string | null
	smallImage: string | null
	smallText: string | null
}

export type FullState = {
	clientId?: string
	updateIntervalSec?: number | string
	updateIntervalSecStatus?: number | string
	discordToken?: string
	buttonPairs?: ButtonPair[]
	cycles?: CycleEntry[]
	imageCycles?: ImageCycleEntry[]
	party?: PartyCycleEntry[]
	timeCycles?: TimeCycleEntry[]
	timestampMode?: TimestampMode
	timestampRangeMin?: string
	timestampRangeMax?: string
	activityType?: ActivityType
	nowMode?: NowMode
	barStyle?: string
	statusEnabled?: boolean
	statusSourceMode?: StatusSourceMode
	manualStatusText?: string | null
	manualStatusEmoji?: string | null
	statusCycles?: StatusCycleEntry[]
}

export interface StoredConfig {
	name: string
	state: FullState
	createdAt?: string
}

export type AppSettings = {
	autoHideOnStart?: boolean
	musicFilter?: boolean
	videoFilter?: boolean
	statusEnabled?: boolean
}

export interface LogEntry {
	level?: string
	type?: string
	message?: string
	text?: string
	error?: string
}

export interface VoidPresenceCtx {
	clientId: string | number[]
	party?: PartyCycleEntry[]
	buttonPairs: ButtonPair[]
	cycles: CycleEntry[]
	imageCycles: ImageCycleEntry[]
	timeCycles?: TimeCycleEntry[]
	statusCycles?: StatusCycleEntry[]
	showBlocksToast: () => void
	renderButtonPairs: () => void
	renderCycles: () => void
	renderImageCycles: () => void
	renderPartyCycles: () => void
	renderTimeCycles?: () => void
	renderStatusCycles?: () => void
}

export interface DiscordClient {
	clearActivity(): Promise<void>
	connect(clientId: string): Promise<void>
	request(command: string, args: Record<string, unknown>): Promise<unknown>
	login(options: { clientId: string }): Promise<this>
	destroy(): Promise<void>
	on(event: string, handler: (...args: unknown[]) => void): this
}

export interface NowPlayingData {
	sourceAppId?: string
	lastUpdatedTime?: number
	title?: string
	artist?: string
	albumTitle?: string
	albumArtist?: string
	genres?: string[]
	playbackStatus?: string | null
	playbackType?: string | null
	position?: number | null
	duration?: number | null
	startedAt?: number | null
	endsAt?: number | null
	thumbnail?: {
		width: number
		height: number
		size: number
	} | null
	isThumbMusic?: boolean
	isThumbVideo?: boolean
}

export type ConfigState = {
	musicFilter?: boolean
	videoFilter?: boolean
	activityFilter?: boolean
	coverFetchEnabled?: boolean
	hardwareMonitorEnabled?: boolean
	statusEnabled?: boolean
	statusEnabledBrowser: boolean
	rpcEnabled?: boolean
}

export type UpdateInfo = {
	latestTag: string
	downloadUrl: string | null
	currentVersion: string
	changelogMd: string
}

export type BarStyle = 'unicode' | 'cmd' | 'block' | 'soft' | 'retro' | 'cyber'

export interface LanguageConfig {
	language: Language
}

export interface Settings {
	autoHideOnStart: boolean
	musicFilter: boolean
	videoFilter: boolean
	activityFilter: boolean
	coverFetchEnabled: boolean
	hardwareMonitorEnabled: boolean
	statusEnabled: boolean
	rpcEnabled: boolean
	barStyle: BarStyle
	statusEnabledBrowser: boolean
	lastUpdateNotified: string | null
	lastUpdateNotifiedVersion: string | null
}

export type NowPlayingInfo = {
	sourceAppId: string
	lastUpdatedTime: number | null
	title: string
	artist: string
	albumTitle: string
	albumArtist: string
	genres: string[]
	playbackStatus: string | null
	playbackType: string | null
	position: number | null
	duration: number | null
	startedAt: number | null
	endsAt: number | null
	isThumbMusic?: boolean | null
	isThumbVideo?: boolean | null
} | null

export type LogLevel = 'info' | 'warn' | 'error' | 'success'

export interface CustomStatusItem {
	text: string
	emoji: string | null
}

export interface StoredStatusProfile {
	name: string
	items: CustomStatusItem[]
	createdAt: string
}

export interface ElectronAPI {
	openSupportSite?: () => Promise<boolean> | boolean
	openSupportDiscord?: () => Promise<boolean> | boolean
	clearLogs?: () => Promise<boolean> | boolean
	downloadLogs?: () => Promise<boolean> | boolean
	onLogsClear?: (handler: () => void) => void
	onLogsDownload?: (handler: () => void) => void
	uploadConfig?: (config: {
		title: string
		authorId: string
		description: string
		configData: FullState
	}) => Promise<unknown>
	uploadStatusConfig?: (config: {
		title: string
		authorId: string
		description: string
		configData: { statusCycles: StatusCycleEntry[] }
	}) => Promise<unknown>
	statusGetCurrent?: () => Promise<StatusCycleEntry[]>
	statusSetCurrent?: (cycles: StatusCycleEntry[]) => Promise<boolean>
	onImportConfigFromProtocol?: (handler: (payload: unknown) => void) => void
	onImportStatusFromProtocol?: (handler: (payload: unknown) => void) => void
	onActivateView: (handler: (payload: ActivateViewPayload) => void) => void
	onAuthFromUrl: (
		handler: (user: {
			authorId: string
			authorName: string | null
			provider: string | null
			avatar: string | null
		}) => void
	) => void
	getLanguage?: () => Promise<void>
	setLanguage?: () => Promise<void>
	onStatusPayload?: (handler: (text: string | null) => void) => void
	setStatusEnabledBrowser?: (on: boolean) => Promise<void> | void
	setRpcEnabled?: () => Promise<void>
	openDiscordGetTokenVideoError?: () => Promise<void>
	setupStatusTutorialButtons?: () => Promise<void>
	customStatusRestart?: () => Promise<void>
	customStatusStop?: () => Promise<void>
	setStatusIntervalConfig?: (sec: number | null) => Promise<void> | void
	setStatusCyclesConfig?: (cycles: StatusCycleEntry[]) => Promise<void> | void
	setBarStyleConfig: (barStyle: BarStyle) => Promise<void> | void
	setHardwareMonitor?: (on: boolean) => Promise<void> | void
	useRecentClientId: (clientId: string) => Promise<unknown>
	useReadyClientId?: () => Promise<void>
	onUpdateAvailable?: (callback: (info: UpdateInfo) => void) => void
	installUpdate?: (info: UpdateInfo) => void
	setCoverFetch?: (on: boolean) => Promise<void> | void
	setAutomaticActivity?: (on: boolean) => Promise<void> | void
	setMusicFilter?: (on: boolean) => Promise<void> | void
	setVideoFilter?: (on: boolean) => Promise<void> | void
	openDiscordDeveloperPortal?: () => Promise<void>
	openDiscordDeveloperAuthorId?: () => Promise<void>
	openDiscordGetTokenVideo?: () => Promise<void>
	liveSetClientId?: (clientId: string) => Promise<unknown> | unknown
	liveSetButtons?: (pairs: ButtonPair[]) => Promise<unknown> | unknown
	liveSetCycles?: (cycles: CycleEntry[]) => Promise<unknown> | unknown
	liveSetImages?: (cycles: ImageCycleEntry[]) => Promise<unknown> | unknown
	liveSetParty?: (party: { sizeCurrent: string; sizeMax: string }[]) => Promise<unknown> | unknown
	liveSetTimestamp?: (cfg: {
		mode: TimestampMode
		rangeMin: string
		rangeMax: string
		nowMode: NowMode
	}) => Promise<unknown> | unknown
	liveSetInterval?: (sec: number) => Promise<unknown> | unknown
	liveSetDiscordToken?: (token: string) => Promise<unknown> | unknown
	liveSetStatusInterval?: (sec: number) => Promise<unknown> | unknown
	liveSetStatusCycles?: (cycles: StatusCycleEntry[]) => Promise<unknown> | unknown
	liveSetTimeCycles?: (cycles: { label: string; seconds: string }[]) => Promise<unknown> | unknown
	setRpcMode(mode: string): unknown
	setActivityInterval: (sec: number) => Promise<unknown> | unknown
	setActivityType(type: ActivityType): unknown
	setAutoHide: (value: boolean) => Promise<void> | void
	getAutoHide: () => Promise<boolean>
	windowClose: () => Promise<void>
	windowMinimize: () => Promise<void>
	windowToggleMaximize: () => Promise<void>
	setAutoLaunch: (enabled: boolean) => Promise<void>
	setImageCycles: (
		cycles: { largeImage: string; largeText: string; smallImage: string; smallText: string }[]
	) => Promise<void>
	setButtons: (
		pairs: { label1: string; url1: string; label2: string; url2: string }[]
	) => Promise<void>
	setCycles: (entries: { details: string; state: string }[]) => Promise<void>
	onLogMessage: (callback: (entry: LogEntry) => void) => void
	setPartySize: (sizeCurrent: number, sizeMax: number) => Promise<void>
	setPartyConfig: (config: PartyConfig) => Promise<void>
	setTimestampConfig: (cfg: {
		mode: string
		rangeMin: number | null
		rangeMax: number | null
	}) => Promise<void>
	resetPersistTimestamp: () => Promise<void>
	openSupportSite: () => Promise<void>
	openSupportDiscord: () => Promise<void>
	clearLogs: () => Promise<void>
	downloadLogs: () => Promise<void>
	onLogsClear: (handler: () => void) => void
	onLogsDownload: (handler: () => void) => void
	setStatusEnabled: (enabled: boolean) => Promise<void>
	onRpcUpdate?: (callback: (payload: RpcPayload) => void) => void
	onRpcStatus?: (callback: (status: string) => void) => void
	onStatusStatus?: (callback: (status: string) => void) => void
}

declare const MAIN_WINDOW_VITE_DEV_SERVER_URL: string
declare const MAIN_WINDOW_VITE_NAME: string

declare global {
	interface Window {
		electronAPI?: ElectronAPI
		__voidPresenceCtx?: VoidPresenceCtx
		voidPresenceCtx?: VoidPresenceCtx
		addConfigFromState?: (name: string, state: FullState) => void
	}
}

export {}
