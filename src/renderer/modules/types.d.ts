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

export interface FullState {
	clientId?: string
	updateIntervalSec?: number | string
	buttonPairs?: ButtonPair[]
	cycles?: CycleEntry[]
	imageCycles?: ImageCycleEntry[]
}

export interface StoredConfig {
	name: string
	state: FullState
	createdAt?: string
}

export interface VoidPresenceCtx {
	buttonPairs: ButtonPair[]
	cycles: CycleEntry[]
	imageCycles: ImageCycleEntry[]
	renderButtonPairs: () => void
	renderCycles: () => void
	renderImageCycles: () => void
}

export interface ElectronAPI {
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
		author: string
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
