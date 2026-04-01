declare const MAIN_WINDOW_VITE_DEV_SERVER_URL: string
declare const MAIN_WINDOW_VITE_NAME: string
export {}

export type ViewName = 'main' | 'logs' | 'config'

export interface LogEntry {
	level?: string
	type?: string
	message?: string
	text?: string
	error?: string
}

export interface RichPresenceButton {
	label: string
	url: string
}

export interface RichPresencePayload {
	details?: string
	state?: string
	buttons?: RichPresenceButton[]
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

export interface ImageCycleEntry {
	largeImage: string
	largeText: string
	smallImage: string
	smallText: string
}

export type TimestampMode = 'now' | 'range' | 'persist'

export type ActivityType = 'playing' | 'watching' | 'listening' | 'competing'

export type NowMode = 'plain' | 'progress' | 'cycles'

export interface TimeCycleEntry {
	label: string
	seconds: number | string
}

export interface PartyCycleEntry {
	sizeCurrent: any
	sizeMax: any
	skip?: boolean
}

export interface PartyConfig {
	entries: PartyCycleEntry[]
}

export type FullState = {
	clientId?: string
	updateIntervalSec?: number | string
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
	rpcMode?: 'basic' | 'advanced'
}

export interface StoredConfig {
	name: string
	state: FullState
	createdAt?: string
}

export interface VoidPresenceCtx {
	clientId: any[]
	party?: PartyCycleEntry[]
	buttonPairs: ButtonPair[]
	cycles: CycleEntry[]
	imageCycles: ImageCycleEntry[]
	timeCycles?: TimeCycleEntry[]
	renderButtonPairs: () => void
	renderCycles: () => void
	renderImageCycles: () => void
	renderPartyCycles: () => void
	renderTimeCycles?: () => void
}

export type AppSettings = {
	autoHideOnStart?: boolean
	rpcMode?: 'basic' | 'advanced'
}

export interface ElectronAPI {
	liveSetClientId?: (clientId: string) => Promise<unknown> | unknown
	liveSetButtons?: (pairs: ButtonPair[]) => Promise<unknown> | unknown
	liveSetCycles?: (cycles: CycleEntry[]) => Promise<unknown> | unknown
	liveSetImages?: (cycles: ImageCycleEntry[]) => Promise<unknown> | unknown
	liveSetParty?: (
		party: { sizeCurrent: string; sizeMax: string }[],
	) => Promise<unknown> | unknown
	liveSetTimestamp?: (cfg: {
		mode: TimestampMode
		rangeMin: string
		rangeMax: string
		nowMode: NowMode
	}) => Promise<unknown> | unknown
	liveSetInterval?: (sec: number) => Promise<unknown> | unknown
	liveSetTimeCycles?: (
		cycles: { label: string; seconds: string }[],
	) => Promise<unknown> | unknown
	setRpcMode(mode: string): unknown
	startDiscordRichProfile: any
	invoke: any
	setActivityType(activityType: string): unknown
	resetPersistTimestamp(): unknown
	setTimestampConfig(arg0: {
		mode: TimestampMode
		rangeMin: number
		rangeMax: number
	}): unknown
	setPartyConfig?: (config: PartyConfig) => Promise<void>
	setPartySize?: (
		sizeCurrent: number,
		sizeMax: number,
	) => Promise<unknown> | unknown
	setPartySize(sizeCurrent: number, sizeMax: number): unknown
	onLogMessage?: (handler: (entry: LogEntry) => void) => void
	onRpcUpdate?: (handler: (payload: RichPresencePayload) => void) => void
	onRpcStatus?: (handler: (status: string) => void) => void
	setClientId?: (id: string) => Promise<void>
	setButtons?: (pairs: ButtonPair[]) => Promise<void>
	setButtonPairs?: (pairs: ButtonPair[]) => Promise<void>
	setCycles?: (cycles: CycleEntry[]) => Promise<void>
	setImageCycles?: (cycles: ImageCycleEntry[]) => Promise<void>
	setActivityInterval?: (sec: number) => Promise<void>
	restartDiscordRich?: () => Promise<void>
	stopDiscordRich?: () => Promise<void>
	setAutoLaunch?: (on: boolean) => Promise<void> | void
	setAutoHide?: (on: boolean) => Promise<void> | void
	windowClose?: () => void
	windowMinimize?: () => void
	uploadConfig?: (config: {
		title: string
		authorId: string
		authorName: string
		description: string
		configData: FullState
	}) => Promise<unknown>
}

declare global {
	interface Window {
		electronAPI?: ElectronAPI
		__voidPresenceCtx?: VoidPresenceCtx
		addConfigFromState?: (name: string, state: FullState) => void
	}
}
