import type { ConfigState, LogLevel, PresencePayload, Settings } from '../types/types'

export type PluginControlType = 'toggle' | 'select' | 'input'

export interface PluginToggleControl {
	type: 'toggle'
	id: string
	labelKey: string
	hintKey: string
	storageKey: string
	ipcMethod: string
	defaultValue?: boolean
}

export interface PluginSelectOption {
	value: string
	labelKey: string
}

export interface PluginSelectControl {
	type: 'select'
	id: string
	labelKey: string
	storageKey: string
	ipcMethod: string
	options: PluginSelectOption[]
	defaultValue?: string
}

export interface PluginInputControl {
	type: 'input'
	id: string
	labelKey: string
	hintKey?: string
	storageKey: string
	ipcMethod?: string
	placeholder?: string
	defaultValue?: string
}

export type PluginControl = PluginToggleControl | PluginSelectControl | PluginInputControl

export interface PluginContext {
	readSettings(): Promise<Settings>
	readFiltersState(): Promise<ConfigState>
	sendLog(msg: string, level?: LogLevel): void
	userDataPath: string
	pluginDir: string | null
	readConfig(name: string): Promise<Record<string, unknown> | null>
	writeConfig(name: string, data: Record<string, unknown>): Promise<void>
}

export interface VoidPlugin {
	id: string
	nameKey: string
	version: string
	builtin: boolean
	priority: number
	locked?: boolean
	waitForWorker?: boolean
	exclusive?: boolean
	controls: PluginControl[]
	start(ctx: PluginContext): Promise<void> | void
	stop(): Promise<void> | void
	onUpdate(cb: () => void): void
	onConfigChanged?(key: string): void
	getPayload(): PresencePayload | null
}

export interface PluginInfo {
	id: string
	nameKey: string
	version: string
	builtin: boolean
	priority: number
	locked: boolean
	enabled: boolean
	exclusive: boolean
	controls: PluginControl[]
}
