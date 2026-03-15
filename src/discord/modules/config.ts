import { app } from 'electron'
import { promises as fs } from 'fs'
import * as path from 'path'
import {
	ActivityTypeConfig,
	ButtonPair,
	ButtonsConfig,
	ClientConfig,
	CyclesConfig,
	ImageCycle,
	ImageCyclesConfig,
	NowMode,
	PartyConfig,
	PartyCycleEntry,
	TimestampConfig,
} from './types'

function getConfigPath(name: string) {
	const userData = app.getPath('userData')
	return path.join(userData, name)
}

function getClientConfigPath() {
	return getConfigPath('client-config.json')
}

function getButtonsConfigPath() {
	return getConfigPath('buttons-config.json')
}

function getCyclesConfigPath() {
	return getConfigPath('cycles-config.json')
}

function getImageCyclesConfigPath() {
	return getConfigPath('image-cycles.json')
}

function getPartyConfigPath() {
	return getConfigPath('party-config.json')
}

function getTimestampConfigPath() {
	return getConfigPath('timestamp-config.json')
}

function getActivityTypeConfigPath() {
	return getConfigPath('activity-type.json')
}

export async function readClientConfig(): Promise<ClientConfig> {
	const configPath = getClientConfigPath()
	try {
		const raw = await fs.readFile(configPath, 'utf-8')
		const parsed = JSON.parse(raw) as Partial<ClientConfig>
		return {
			clientId:
				typeof parsed.clientId === 'string' && parsed.clientId.trim().length > 0
					? parsed.clientId.trim()
					: null,
		}
	} catch {
		return { clientId: null }
	}
}

export async function writeClientConfig(config: ClientConfig) {
	const configPath = getClientConfigPath()
	await fs.writeFile(configPath, JSON.stringify(config, null, 2))
}

function normalizeButtonPairLoose(p: any): ButtonPair {
	return {
		label1: typeof p.label1 === 'string' ? p.label1 : '',
		url1: typeof p.url1 === 'string' ? p.url1 : '',
		label2:
			typeof p.label2 === 'string' && p.label2.length > 0
				? p.label2
				: undefined,
		url2: typeof p.url2 === 'string' && p.url2.length > 0 ? p.url2 : undefined,
	}
}

export async function readButtonsConfig(): Promise<ButtonsConfig> {
	const configPath = getButtonsConfigPath()
	try {
		const raw = await fs.readFile(configPath, 'utf-8')
		const parsed = JSON.parse(raw) as Partial<ButtonsConfig>
		const pairs = Array.isArray(parsed.pairs) ? parsed.pairs : []
		return {
			pairs: pairs.map(normalizeButtonPairLoose),
		}
	} catch {
		return { pairs: [] }
	}
}

export async function writeButtonsConfig(config: ButtonsConfig) {
	const configPath = getButtonsConfigPath()
	await fs.writeFile(configPath, JSON.stringify(config, null, 2))
}

export async function readCyclesConfig(): Promise<CyclesConfig> {
	const configPath = getCyclesConfigPath()
	try {
		const raw = await fs.readFile(configPath, 'utf-8')
		const parsed = JSON.parse(raw) as Partial<CyclesConfig>
		const entries = Array.isArray(parsed.entries) ? parsed.entries : []
		return {
			entries: entries.map(e => ({
				details: (e as any).details?.toString() ?? '',
				state: (e as any).state?.toString() ?? '',
			})),
		}
	} catch {
		return { entries: [] }
	}
}

export async function writeCyclesConfig(config: CyclesConfig) {
	const configPath = getCyclesConfigPath()
	await fs.writeFile(configPath, JSON.stringify(config, null, 2))
}

export async function readImageCyclesConfig(): Promise<ImageCyclesConfig> {
	const configPath = getImageCyclesConfigPath()
	try {
		const raw = await fs.readFile(configPath, 'utf-8')
		const parsed = JSON.parse(raw) as Partial<ImageCyclesConfig>
		const arr = Array.isArray(parsed.cycles) ? parsed.cycles : []
		return {
			cycles: arr.map(c => ({
				largeImage:
					(c as any).largeImage === null || (c as any).largeImage === undefined
						? null
						: (c as any).largeImage.toString(),
				largeText:
					(c as any).largeText === null || (c as any).largeText === undefined
						? null
						: (c as any).largeText.toString(),
				smallImage:
					(c as any).smallImage === null || (c as any).smallImage === undefined
						? null
						: (c as any).smallImage.toString(),
				smallText:
					(c as any).smallText === null || (c as any).smallText === undefined
						? null
						: (c as any).smallText.toString(),
			})),
		}
	} catch {
		return { cycles: [] }
	}
}

export async function writeImageCyclesConfig(config: ImageCyclesConfig) {
	const configPath = getImageCyclesConfigPath()
	await fs.writeFile(configPath, JSON.stringify(config, null, 2))
}

export async function readPartyConfig(): Promise<PartyConfig | null> {
	const configPath = getPartyConfigPath()
	try {
		const raw = await fs.readFile(configPath, 'utf-8')
		const parsed = JSON.parse(raw) as any
		const entriesRaw = Array.isArray(parsed.entries) ? parsed.entries : []
		const entries: PartyCycleEntry[] = entriesRaw.map((p: any) => ({
			sizeCurrent:
				p?.sizeCurrent === null || p?.sizeCurrent === undefined
					? null
					: Number(p.sizeCurrent),
			sizeMax:
				p?.sizeMax === null || p?.sizeMax === undefined
					? null
					: Number(p.sizeMax),
		}))
		return { entries }
	} catch {
		return null
	}
}

export async function writePartyConfig(config: PartyConfig | null) {
	const configPath = getPartyConfigPath()
	if (!config || !Array.isArray(config.entries)) {
		try {
			await fs.unlink(configPath)
		} catch {}
		return
	}
	await fs.writeFile(configPath, JSON.stringify(config, null, 2))
}

export async function readTimestampConfig(): Promise<TimestampConfig> {
	const configPath = getTimestampConfigPath()
	try {
		const raw = await fs.readFile(configPath, 'utf-8')
		const parsed = JSON.parse(raw) as Partial<TimestampConfig>
		const mode = parsed.mode || 'now'
		const min =
			typeof parsed.rangeMin === 'number' && Number.isFinite(parsed.rangeMin)
				? parsed.rangeMin
				: null
		const max =
			typeof parsed.rangeMax === 'number' && Number.isFinite(parsed.rangeMax)
				? parsed.rangeMax
				: null
		const persistOffsetSec =
			typeof parsed.persistOffsetSec === 'number' &&
			Number.isFinite(parsed.persistOffsetSec)
				? parsed.persistOffsetSec
				: 0
		const nowMode = (parsed.nowMode as NowMode) || 'plain'
		const timeCycles = Array.isArray(parsed.timeCycles) ? parsed.timeCycles : []
		return {
			mode,
			rangeMin: min,
			rangeMax: max,
			persistOffsetSec,
			nowMode,
			timeCycles,
		}
	} catch {
		return {
			mode: 'now',
			rangeMin: null,
			rangeMax: null,
			persistOffsetSec: 0,
			nowMode: 'plain',
			timeCycles: [],
		}
	}
}

export async function writeTimestampConfig(config: TimestampConfig) {
	const configPath = getTimestampConfigPath()
	await fs.writeFile(configPath, JSON.stringify(config, null, 2))
}

export async function readActivityTypeConfig(): Promise<ActivityTypeConfig> {
	const configPath = getActivityTypeConfigPath()
	try {
		const raw = await fs.readFile(configPath, 'utf-8')
		const parsed = JSON.parse(raw) as Partial<ActivityTypeConfig>
		const type = parsed.type || 'playing'
		return { type }
	} catch {
		return { type: 'playing' }
	}
}

export async function writeActivityTypeConfig(config: ActivityTypeConfig) {
	const configPath = getActivityTypeConfigPath()
	await fs.writeFile(configPath, JSON.stringify(config, null, 2))
}

export async function setActivityType(type: ActivityTypeConfig['type']) {
	const safeType =
		type === 'watching' || type === 'listening' || type === 'competing'
			? type
			: 'playing'

	await writeActivityTypeConfig({ type: safeType })
}

export async function setClientId(clientId: string) {
	const cfg = await readClientConfig()
	cfg.clientId = clientId.trim() || null
	await writeClientConfig(cfg)
}

export async function setButtonsConfig(pairs: ButtonPair[]) {
	const cleaned: ButtonPair[] = (Array.isArray(pairs) ? pairs : []).map(p => ({
		label1: (p.label1 ?? '').toString(),
		url1: (p.url1 ?? '').toString(),
		label2: p.label2 ?? undefined,
		url2: p.url2 ?? undefined,
	}))
	await writeButtonsConfig({ pairs: cleaned })
}

export async function setCycles(entries: { details: string; state: string }[]) {
	const cleaned = (Array.isArray(entries) ? entries : []).map(e => ({
		details: (e.details ?? '').toString(),
		state: (e.state ?? '').toString(),
	}))
	await writeCyclesConfig({ entries: cleaned })
}

export async function setImageCyclesConfig(
	cycles: {
		largeImage: string | null
		largeText: string | null
		smallImage: string | null
		smallText: string | null
	}[],
) {
	const cleaned: ImageCycle[] = (Array.isArray(cycles) ? cycles : []).map(
		c => ({
			largeImage:
				c.largeImage === null || c.largeImage === undefined
					? null
					: c.largeImage.toString(),
			largeText:
				c.largeText === null || c.largeText === undefined
					? null
					: c.largeText.toString(),
			smallImage:
				c.smallImage === null || c.smallImage === undefined
					? null
					: c.smallImage.toString(),
			smallText:
				c.smallText === null || c.smallText === undefined
					? null
					: c.smallText.toString(),
		}),
	)
	await writeImageCyclesConfig({ cycles: cleaned })
}

export async function setPartyConfig(config: PartyConfig) {
	const entriesRaw = Array.isArray(config.entries) ? config.entries : []
	const cleaned: PartyCycleEntry[] = entriesRaw.map(p => ({
		sizeCurrent:
			p.sizeCurrent === null || p.sizeCurrent === undefined
				? null
				: Number(p.sizeCurrent),
		sizeMax:
			p.sizeMax === null || p.sizeMax === undefined ? null : Number(p.sizeMax),
	}))
	const finalCfg: PartyConfig = { entries: cleaned }
	await writePartyConfig(finalCfg)
}

export async function setTimestampConfig(config: Partial<TimestampConfig>) {
	const current = await readTimestampConfig()
	const mode = config.mode || current.mode || 'now'
	const min =
		config.rangeMin != null && Number.isFinite(config.rangeMin)
			? Number(config.rangeMin)
			: current.rangeMin
	const max =
		config.rangeMax != null && Number.isFinite(config.rangeMax)
			? Number(config.rangeMax)
			: current.rangeMax
	const persistOffsetSec =
		config.persistOffsetSec != null && Number.isFinite(config.persistOffsetSec)
			? Number(config.persistOffsetSec)
			: current.persistOffsetSec
	const nowMode = config.nowMode || current.nowMode || 'plain'
	const timeCycles = Array.isArray(config.timeCycles)
		? config.timeCycles
		: current.timeCycles

	await writeTimestampConfig({
		mode,
		rangeMin: min,
		rangeMax: max,
		persistOffsetSec,
		nowMode,
		timeCycles,
	})
}
