import { app } from 'electron'
import { promises as fs } from 'fs'
import * as path from 'path'
import {
	ActivityTypeConfig,
	ButtonPair,
	ButtonsConfig,
	ClientConfig,
	ConfigState,
	CyclesConfig,
	ImageCycle,
	ImageCyclesConfig,
	NowMode,
	PartyConfig,
	PartyCycleEntry,
	TimestampConfig,
} from '../../types/types'

type Validator<T> = (input: unknown) => T

async function readJsonWithSchema<T>(
	filePath: string,
	validate: Validator<T>,
	fallback: T,
): Promise<T> {
	try {
		const raw = await fs.readFile(filePath, 'utf-8')
		const parsed = JSON.parse(raw)
		return validate(parsed)
	} catch {
		return fallback
	}
}

async function writeJsonSafe<T>(filePath: string, data: T): Promise<void> {
	const json = JSON.stringify(data, null, 2)
	await fs.writeFile(filePath, json, 'utf-8')
}

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

function getSettingsPath() {
	return getConfigPath('settings.json')
}

const defaultClientConfig: ClientConfig = {
	clientId: null,
	updateIntervalSec: null,
}

const validateClientConfig: Validator<ClientConfig> = (input): ClientConfig => {
	const obj = (input ?? {}) as Partial<ClientConfig>
	const clientId =
		typeof obj.clientId === 'string' && obj.clientId.trim().length > 0
			? obj.clientId.trim()
			: null
	const updateIntervalSec =
		typeof obj.updateIntervalSec === 'number' &&
		Number.isFinite(obj.updateIntervalSec) &&
		obj.updateIntervalSec > 0
			? obj.updateIntervalSec
			: null
	return { clientId, updateIntervalSec }
}

export async function readClientConfig(): Promise<ClientConfig> {
	return readJsonWithSchema(
		getClientConfigPath(),
		validateClientConfig,
		defaultClientConfig,
	)
}

export async function writeClientConfig(config: ClientConfig) {
	await writeJsonSafe(getClientConfigPath(), validateClientConfig(config))
}

export async function setActivityIntervalConfig(sec: number | null) {
	const cfg = await readClientConfig()
	let safe: number | null = null
	if (typeof sec === 'number' && Number.isFinite(sec) && sec > 0) {
		safe = Math.max(5, Math.floor(sec))
	}
	cfg.updateIntervalSec = safe
	await writeClientConfig(cfg)
}

const normalizeButtonPairLoose = (p: ButtonPair): ButtonPair => ({
	label1: typeof p.label1 === 'string' ? p.label1 : '',
	url1: typeof p.url1 === 'string' ? p.url1 : '',
	label2:
		typeof p.label2 === 'string' && p.label2.length > 0 ? p.label2 : undefined,
	url2: typeof p.url2 === 'string' && p.url2.length > 0 ? p.url2 : undefined,
})

const defaultButtonsConfig: ButtonsConfig = { pairs: [] }

const validateButtonsConfig: Validator<ButtonsConfig> = (
	input,
): ButtonsConfig => {
	const obj = (input ?? {}) as Partial<ButtonsConfig>
	const pairs = Array.isArray(obj.pairs) ? obj.pairs : []
	return {
		pairs: pairs.map(normalizeButtonPairLoose),
	}
}

export async function readButtonsConfig(): Promise<ButtonsConfig> {
	return readJsonWithSchema(
		getButtonsConfigPath(),
		validateButtonsConfig,
		defaultButtonsConfig,
	)
}

export async function writeButtonsConfig(config: ButtonsConfig) {
	await writeJsonSafe(getButtonsConfigPath(), validateButtonsConfig(config))
}

const defaultCyclesConfig: CyclesConfig = { entries: [] }

const validateCyclesConfig: Validator<CyclesConfig> = (input): CyclesConfig => {
	const obj = (input ?? {}) as Partial<CyclesConfig>
	const entries = Array.isArray(obj.entries) ? obj.entries : []
	return {
		entries: entries.map(e => ({
			details: e?.details?.toString() ?? '',
			state: e?.state?.toString() ?? '',
		})),
	}
}

export async function readCyclesConfig(): Promise<CyclesConfig> {
	return readJsonWithSchema(
		getCyclesConfigPath(),
		validateCyclesConfig,
		defaultCyclesConfig,
	)
}

export async function writeCyclesConfig(config: CyclesConfig) {
	await writeJsonSafe(getCyclesConfigPath(), validateCyclesConfig(config))
}

const defaultImageCyclesConfig: ImageCyclesConfig = { cycles: [] }

const validateImageCyclesConfig: Validator<ImageCyclesConfig> = (
	input,
): ImageCyclesConfig => {
	const obj = (input ?? {}) as Partial<ImageCyclesConfig>
	const arr = Array.isArray(obj.cycles) ? obj.cycles : []
	return {
		cycles: arr.map(c => ({
			largeImage:
				c?.largeImage === null || c?.largeImage === undefined
					? null
					: c.largeImage.toString(),
			largeText:
				c?.largeText === null || c?.largeText === undefined
					? null
					: c.largeText.toString(),
			smallImage:
				c?.smallImage === null || c?.smallImage === undefined
					? null
					: c.smallImage.toString(),
			smallText:
				c?.smallText === null || c?.smallText === undefined
					? null
					: c.smallText.toString(),
		})),
	}
}

export async function readImageCyclesConfig(): Promise<ImageCyclesConfig> {
	return readJsonWithSchema(
		getImageCyclesConfigPath(),
		validateImageCyclesConfig,
		defaultImageCyclesConfig,
	)
}

export async function writeImageCyclesConfig(config: ImageCyclesConfig) {
	await writeJsonSafe(
		getImageCyclesConfigPath(),
		validateImageCyclesConfig(config),
	)
}

const defaultPartyConfig: PartyConfig | null = null

const validatePartyConfig: Validator<PartyConfig | null> = (
	input,
): PartyConfig | null => {
	if (!input || typeof input !== 'object') return null
	const obj = input as Partial<PartyConfig>
	const entriesRaw = Array.isArray(obj.entries) ? obj.entries : []
	const entries: PartyCycleEntry[] = entriesRaw.map((p: PartyCycleEntry) => ({
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
}

export async function readPartyConfig(): Promise<PartyConfig | null> {
	return readJsonWithSchema(
		getPartyConfigPath(),
		validatePartyConfig,
		defaultPartyConfig,
	)
}

export async function writePartyConfig(config: PartyConfig | null) {
	const configPath = getPartyConfigPath()
	if (!config || !Array.isArray(config.entries)) {
		try {
			await fs.unlink(configPath)
		} catch {}
		return
	}
	await writeJsonSafe(configPath, validatePartyConfig(config) as PartyConfig)
}

const defaultTimestampConfig: TimestampConfig = {
	mode: 'now',
	rangeMin: null,
	rangeMax: null,
	persistOffsetSec: 0,
	nowMode: 'plain',
	timeCycles: [],
}

const validateTimestampConfig: Validator<TimestampConfig> = (
	input,
): TimestampConfig => {
	const obj = (input ?? {}) as Partial<TimestampConfig>
	const mode = obj.mode || 'now'
	const min =
		typeof obj.rangeMin === 'number' && Number.isFinite(obj.rangeMin)
			? obj.rangeMin
			: null
	const max =
		typeof obj.rangeMax === 'number' && Number.isFinite(obj.rangeMax)
			? obj.rangeMax
			: null
	const persistOffsetSec =
		typeof obj.persistOffsetSec === 'number' &&
		Number.isFinite(obj.persistOffsetSec)
			? obj.persistOffsetSec
			: 0
	const nowMode = (obj.nowMode as NowMode) || 'plain'
	const timeCycles = Array.isArray(obj.timeCycles) ? obj.timeCycles : []
	return {
		mode,
		rangeMin: min,
		rangeMax: max,
		persistOffsetSec,
		nowMode,
		timeCycles,
	}
}

export async function readTimestampConfig(): Promise<TimestampConfig> {
	return readJsonWithSchema(
		getTimestampConfigPath(),
		validateTimestampConfig,
		defaultTimestampConfig,
	)
}

export async function writeTimestampConfig(config: TimestampConfig) {
	await writeJsonSafe(getTimestampConfigPath(), validateTimestampConfig(config))
}

const defaultActivityTypeConfig: ActivityTypeConfig = { type: 'playing' }

const validateActivityTypeConfig: Validator<ActivityTypeConfig> = (
	input,
): ActivityTypeConfig => {
	const obj = (input ?? {}) as Partial<ActivityTypeConfig>
	const type = obj.type || 'playing'
	return { type }
}

export async function readActivityTypeConfig(): Promise<ActivityTypeConfig> {
	return readJsonWithSchema(
		getActivityTypeConfigPath(),
		validateActivityTypeConfig,
		defaultActivityTypeConfig,
	)
}

export async function writeActivityTypeConfig(config: ActivityTypeConfig) {
	await writeJsonSafe(
		getActivityTypeConfigPath(),
		validateActivityTypeConfig(config),
	)
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

function roundToNearest5(x: number) {
	return Math.round(x / 5) * 5
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
	const persistOffsetSecRaw =
		config.persistOffsetSec != null && Number.isFinite(config.persistOffsetSec)
			? Number(config.persistOffsetSec)
			: current.persistOffsetSec
	const persistOffsetSec =
		Number.isFinite(persistOffsetSecRaw) && persistOffsetSecRaw > 0
			? roundToNearest5(persistOffsetSecRaw)
			: 0
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

export async function readFiltersState(): Promise<ConfigState> {
	try {
		const raw = await fs.readFile(getSettingsPath(), 'utf-8')
		const parsed = JSON.parse(raw) as {
			musicFilter?: boolean
			videoFilter?: boolean
			activityFilter?: boolean
			coverFetchEnabled?: boolean
		}
		return {
			musicFilter: parsed.musicFilter === true,
			videoFilter: parsed.videoFilter === true,
			activityFilter: parsed.activityFilter === true,
			coverFetchEnabled: parsed.coverFetchEnabled === true,
		}
	} catch {
		return {
			musicFilter: false,
			videoFilter: false,
			activityFilter: false,
			coverFetchEnabled: false,
		}
	}
}
