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

export interface FullState {
	clientId?: string
	updateIntervalSec?: number | string
	buttonPairs?: ButtonPair[]
	cycles?: CycleEntry[]
	imageCycles?: ImageCycleEntry[]
	party?: PartyCycleEntry[]
	timestampMode?: TimestampMode
	timestampRangeMin?: number | string
	timestampRangeMax?: number | string
}

export interface StoredConfig {
	name: string
	state: FullState
	createdAt?: string
}

export interface PartyCycleEntry {
	sizeCurrent: any
	sizeMax: any
	skip?: boolean
}

export interface PartyConfig {
	entries: PartyCycleEntry[]
}

export interface VoidPresenceCtx {
	party?: PartyCycleEntry[]
	buttonPairs: ButtonPair[]
	cycles: CycleEntry[]
	imageCycles: ImageCycleEntry[]
	renderButtonPairs: () => void
	renderCycles: () => void
	renderImageCycles: () => void
	renderPartyCycles: () => void
}

export interface ElectronAPI {
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
