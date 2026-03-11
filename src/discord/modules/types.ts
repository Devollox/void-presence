export type RpcPayload = {
	details: string
	state: string
	coordinates: string
	buttons: { label: string; url: string }[]
}

export type ClientConfig = {
	clientId: string | null
}

export type LinksConfig = {
	largeImage: string | null
	largeText: string | null
	smallImage: string | null
	smallText: string | null
}

export type ButtonPair = {
	label1: string
	url1: string
	label2?: string
	url2?: string
}

export type ButtonsConfig = {
	pairs: ButtonPair[]
}

export type CycleEntry = {
	details: string
	state: string
}

export type CyclesConfig = {
	entries: CycleEntry[]
}

export type ImageCycle = {
	largeImage: string | null
	largeText: string | null
	smallImage: string | null
	smallText: string | null
}

export type ImageCyclesConfig = {
	cycles: ImageCycle[]
}

export interface PartyCycleEntry {
	sizeCurrent: number | null
	sizeMax: number | null
}

export interface PartyConfig {
	entries: PartyCycleEntry[]
}

export type TimestampMode = 'now' | 'range' | 'persist'

export interface TimestampConfig {
	mode: TimestampMode
	rangeMin: number | null
	rangeMax: number | null
	persistOffsetSec?: number | null
}
