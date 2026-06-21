import { randomUUID } from 'crypto'
import { app } from 'electron'
import { promises as fs } from 'fs'
import * as path from 'path'
import {
	ActivityTypeConfig,
	BarStyle,
	ButtonPair,
	ButtonsConfig,
	ClientConfig,
	ConfigState,
	CyclesConfig,
	DiscordTokenConfig,
	ImageCycle,
	ImageCyclesConfig,
	LanguageConfig,
	NowMode,
	PartyConfig,
	PartyCycleEntry,
	Settings,
	TimerConfig,
	TimestampConfig,
} from '../types/types'

type Validator<T> = (input: unknown) => T

async function ensureDir(filePath: string): Promise<void> {
	const dir = path.dirname(filePath)
	await fs.mkdir(dir, { recursive: true })
}

async function writeJsonSafe<T>(filePath: string, data: T, retry = 3): Promise<void> {
	const json = JSON.stringify(data, null, 2)
	await ensureDir(filePath)
	const dir = path.dirname(filePath)
	const tmpPath = path.join(dir, `.${path.basename(filePath)}.${process.pid}.${randomUUID()}.tmp`)

	for (let i = 0; i < retry; i++) {
		try {
			await fs.writeFile(tmpPath, json, 'utf-8')
			await fs.rename(tmpPath, filePath)
			return
		} catch {
			await new Promise(r => setTimeout(r, 50))
			try {
				await fs.unlink(tmpPath)
			} catch {}
		}
	}

	throw new Error(`Failed to write ${filePath} after ${retry} attempts`)
}

async function readJsonWithSchema<T>(
	filePath: string,
	validate: Validator<T>,
	fallback: T
): Promise<T> {
	try {
		const raw = await fs.readFile(filePath, 'utf-8')
		const parsed = JSON.parse(raw)
		return validate(parsed)
	} catch {
		return fallback
	}
}

function getConfigPath(name: string) {
	const userData = app.getPath('userData')
	return path.join(userData, name)
}

function getClientConfigPath() {
	return getConfigPath('client-config.json')
}

function getTimerConfigPath() {
	return getConfigPath('timer-config.json')
}

function getDiscordTokenConfigPath() {
	return getConfigPath('discord-token-config.json')
}

function getButtonsConfigPath() {
	return getConfigPath('buttons-config.json')
}

function getCyclesConfigPath() {
	return getConfigPath('cycles-config.json')
}

function getStatusConfigPath() {
	return getConfigPath('status-config.json')
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

function getLanguageConfigPath(): string {
	return getConfigPath('language.json')
}

const defaultClientConfig: ClientConfig = {
	clientId: null,
}

const validateClientConfig: Validator<ClientConfig> = (input): ClientConfig => {
	const obj = (input ?? {}) as Partial<ClientConfig>
	const clientId =
		typeof obj.clientId === 'string' && obj.clientId.trim().length > 0 ? obj.clientId.trim() : null
	return { clientId }
}

export async function readClientConfig(): Promise<ClientConfig> {
	return readJsonWithSchema(getClientConfigPath(), validateClientConfig, defaultClientConfig)
}

export async function writeClientConfig(config: ClientConfig) {
	await writeJsonSafe(getClientConfigPath(), validateClientConfig(config))
}

export async function setClientId(clientId: string) {
	const cfg = await readClientConfig()
	cfg.clientId = clientId.trim() || null
	await writeClientConfig(cfg)
}

const defaultTimerConfig: TimerConfig = {
	updateIntervalSec: null,
	updateIntervalSecStatus: null,
}

const validateTimerConfig: Validator<TimerConfig> = (input): TimerConfig => {
	const obj = (input ?? {}) as Partial<TimerConfig> & {
		updateIntervalSecStatus?: unknown
	}
	const updateIntervalSec =
		typeof obj.updateIntervalSec === 'number' &&
		Number.isFinite(obj.updateIntervalSec) &&
		obj.updateIntervalSec > 0
			? Math.max(5, Math.floor(obj.updateIntervalSec))
			: null
	const updateIntervalSecStatus =
		typeof obj.updateIntervalSecStatus === 'number' &&
		Number.isFinite(obj.updateIntervalSecStatus) &&
		obj.updateIntervalSecStatus > 0
			? Math.max(5, Math.floor(obj.updateIntervalSecStatus))
			: null
	return { updateIntervalSec, updateIntervalSecStatus }
}

export async function readTimerConfig(): Promise<TimerConfig> {
	return readJsonWithSchema(getTimerConfigPath(), validateTimerConfig, defaultTimerConfig)
}

export async function writeTimerConfig(config: TimerConfig) {
	await writeJsonSafe(getTimerConfigPath(), validateTimerConfig(config))
}

export async function setActivityIntervalConfig(sec: number | null) {
	const cfg = await readTimerConfig()
	cfg.updateIntervalSec =
		typeof sec === 'number' && Number.isFinite(sec) && sec > 0 ? Math.max(5, Math.floor(sec)) : null
	await writeTimerConfig(cfg)
}

export async function setActivityIntervalStatusConfig(sec: number | null) {
	const cfg = await readTimerConfig()
	cfg.updateIntervalSecStatus =
		typeof sec === 'number' && Number.isFinite(sec) && sec > 0 ? Math.max(5, Math.floor(sec)) : null
	await writeTimerConfig(cfg)
}

const defaultDiscordTokenConfig: DiscordTokenConfig = {
	discordToken: null,
}

const validateDiscordTokenConfig: Validator<DiscordTokenConfig> = (input): DiscordTokenConfig => {
	const obj = (input ?? {}) as Partial<DiscordTokenConfig>
	const discordToken =
		typeof obj.discordToken === 'string' && obj.discordToken.trim().length > 0
			? obj.discordToken.trim()
			: null
	return { discordToken }
}

export async function readDiscordTokenConfig(): Promise<DiscordTokenConfig> {
	return readJsonWithSchema(
		getDiscordTokenConfigPath(),
		validateDiscordTokenConfig,
		defaultDiscordTokenConfig
	)
}

export async function writeDiscordTokenConfig(config: DiscordTokenConfig) {
	await writeJsonSafe(getDiscordTokenConfigPath(), validateDiscordTokenConfig(config))
}

export async function setDiscordTokenConfig(token: string | null) {
	await writeDiscordTokenConfig({
		discordToken: token && token.trim().length > 0 ? token.trim() : null,
	})
}

const normalizeButtonPairLoose = (p: ButtonPair): ButtonPair => ({
	label1: typeof p.label1 === 'string' ? p.label1 : '',
	url1: typeof p.url1 === 'string' ? p.url1 : '',
	label2: typeof p.label2 === 'string' && p.label2.length > 0 ? p.label2 : undefined,
	url2: typeof p.url2 === 'string' && p.url2.length > 0 ? p.url2 : undefined,
})

const defaultButtonsConfig: ButtonsConfig = { pairs: [] }

const validateButtonsConfig: Validator<ButtonsConfig> = (input): ButtonsConfig => {
	const obj = (input ?? {}) as Partial<ButtonsConfig>
	const pairs = Array.isArray(obj.pairs) ? obj.pairs : []
	return {
		pairs: pairs.map(normalizeButtonPairLoose),
	}
}

export async function readButtonsConfig(): Promise<ButtonsConfig> {
	return readJsonWithSchema(getButtonsConfigPath(), validateButtonsConfig, defaultButtonsConfig)
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
	return readJsonWithSchema(getCyclesConfigPath(), validateCyclesConfig, defaultCyclesConfig)
}

export async function writeCyclesConfig(config: CyclesConfig) {
	await writeJsonSafe(getCyclesConfigPath(), validateCyclesConfig(config))
}

const defaultStatusConfig: {
	cycles: { text: string; emoji: string | null }[]
} = {
	cycles: [],
}

const validateStatusConfig: Validator<{
	cycles: { text: string; emoji: string | null }[]
}> = (input): { cycles: { text: string; emoji: string | null }[] } => {
	const obj = (input ?? {}) as { cycles?: unknown[] }
	const cycles = Array.isArray(obj.cycles) ? obj.cycles : []
	return {
		cycles: cycles
			.map((c: any) => ({
				text: typeof c?.text === 'string' ? c.text.trim() : '',
				emoji: typeof c?.emoji === 'string' && c.emoji.trim().length > 0 ? c.emoji.trim() : null,
			}))
			.filter(c => c.text.length > 0),
	}
}

export async function readStatusConfig(): Promise<{
	cycles: { text: string; emoji: string | null }[]
}> {
	return readJsonWithSchema(getStatusConfigPath(), validateStatusConfig, defaultStatusConfig)
}

export async function writeStatusConfig(config: {
	cycles: { text: string; emoji: string | null }[]
}) {
	await writeJsonSafe(getStatusConfigPath(), validateStatusConfig(config))
}

export async function setStatusConfig(cycles: { text: string; emoji: string | null }[]) {
	await writeStatusConfig({ cycles: Array.isArray(cycles) ? cycles : [] })
}

const defaultImageCyclesConfig: ImageCyclesConfig = { cycles: [] }

const validateImageCyclesConfig: Validator<ImageCyclesConfig> = (input): ImageCyclesConfig => {
	const obj = (input ?? {}) as Partial<ImageCyclesConfig>
	const arr = Array.isArray(obj.cycles) ? obj.cycles : []
	return {
		cycles: arr.map(c => ({
			largeImage:
				c?.largeImage === null || c?.largeImage === undefined ? null : c.largeImage.toString(),
			largeText:
				c?.largeText === null || c?.largeText === undefined ? null : c.largeText.toString(),
			smallImage:
				c?.smallImage === null || c?.smallImage === undefined ? null : c.smallImage.toString(),
			smallText:
				c?.smallText === null || c?.smallText === undefined ? null : c.smallText.toString(),
		})),
	}
}

export async function readImageCyclesConfig(): Promise<ImageCyclesConfig> {
	return readJsonWithSchema(
		getImageCyclesConfigPath(),
		validateImageCyclesConfig,
		defaultImageCyclesConfig
	)
}

export async function writeImageCyclesConfig(config: ImageCyclesConfig) {
	await writeJsonSafe(getImageCyclesConfigPath(), validateImageCyclesConfig(config))
}

const defaultPartyConfig: PartyConfig | null = null

const validatePartyConfig: Validator<PartyConfig | null> = (input): PartyConfig | null => {
	if (!input || typeof input !== 'object') return null
	const obj = input as Partial<PartyConfig>
	const entriesRaw = Array.isArray(obj.entries) ? obj.entries : []
	const entries: PartyCycleEntry[] = entriesRaw.map((p: PartyCycleEntry) => ({
		sizeCurrent:
			p?.sizeCurrent === null || p?.sizeCurrent === undefined ? null : Number(p.sizeCurrent),
		sizeMax: p?.sizeMax === null || p?.sizeMax === undefined ? null : Number(p.sizeMax),
	}))
	return { entries }
}

export async function readPartyConfig(): Promise<PartyConfig | null> {
	return readJsonWithSchema(getPartyConfigPath(), validatePartyConfig, defaultPartyConfig)
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

const validateTimestampConfig: Validator<TimestampConfig> = (input): TimestampConfig => {
	const obj = (input ?? {}) as Partial<TimestampConfig>
	const mode = obj.mode || 'now'
	const min =
		typeof obj.rangeMin === 'number' && Number.isFinite(obj.rangeMin) ? obj.rangeMin : null
	const max =
		typeof obj.rangeMax === 'number' && Number.isFinite(obj.rangeMax) ? obj.rangeMax : null
	const persistOffsetSec =
		typeof obj.persistOffsetSec === 'number' && Number.isFinite(obj.persistOffsetSec)
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
		defaultTimestampConfig
	)
}

export async function writeTimestampConfig(config: TimestampConfig) {
	await writeJsonSafe(getTimestampConfigPath(), validateTimestampConfig(config))
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

	const hasPersistOffset =
		typeof config.persistOffsetSec === 'number' && Number.isFinite(config.persistOffsetSec)

	const persistOffsetSecRaw = hasPersistOffset
		? Number(config.persistOffsetSec)
		: current.persistOffsetSec

	let persistOffsetSec =
		Number.isFinite(persistOffsetSecRaw) && persistOffsetSecRaw > 0
			? roundToNearest5(persistOffsetSecRaw)
			: 0

	if (
		typeof current.persistOffsetSec === 'number' &&
		Number.isFinite(current.persistOffsetSec) &&
		current.persistOffsetSec > 0 &&
		!hasPersistOffset &&
		persistOffsetSec === 0
	) {
		persistOffsetSec = current.persistOffsetSec
	}

	const nowMode = config.nowMode || current.nowMode || 'plain'
	const timeCycles = Array.isArray(config.timeCycles) ? config.timeCycles : current.timeCycles

	await writeTimestampConfig({
		mode,
		rangeMin: min,
		rangeMax: max,
		persistOffsetSec,
		nowMode,
		timeCycles,
	})
}

const defaultActivityTypeConfig: ActivityTypeConfig = { type: 'playing' }

const validateActivityTypeConfig: Validator<ActivityTypeConfig> = (input): ActivityTypeConfig => {
	const obj = (input ?? {}) as Partial<ActivityTypeConfig>
	const type = obj.type || 'playing'
	return { type }
}

export async function readActivityTypeConfig(): Promise<ActivityTypeConfig> {
	return readJsonWithSchema(
		getActivityTypeConfigPath(),
		validateActivityTypeConfig,
		defaultActivityTypeConfig
	)
}

export async function writeActivityTypeConfig(config: ActivityTypeConfig) {
	await writeJsonSafe(getActivityTypeConfigPath(), validateActivityTypeConfig(config))
}

export async function setActivityType(type: ActivityTypeConfig['type']) {
	const safeType =
		type === 'watching' || type === 'listening' || type === 'competing' ? type : 'playing'
	await writeActivityTypeConfig({ type: safeType })
}

export async function setButtonsConfig(pairs: ButtonPair[]) {
	const cleaned: ButtonPair[] = (Array.isArray(pairs) ? pairs : []).map(p => {
		const rawUrl1 = (p.url1 ?? '').toString().trim()
		const rawUrl2 = (p.url2 ?? '').toString().trim()
		const url1 = rawUrl1.length > 0 && !rawUrl1.includes(' ') ? rawUrl1 : ''
		const url2 = rawUrl2.length > 0 && !rawUrl2.includes(' ') ? rawUrl2 : undefined
		return {
			label1: (p.label1 ?? '').toString(),
			url1,
			label2: p.label2 ?? undefined,
			url2,
		}
	})

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
	}[]
) {
	const cleaned: ImageCycle[] = (Array.isArray(cycles) ? cycles : []).map(c => {
		const li = c.largeImage?.toString().trim() ?? ''
		const si = c.smallImage?.toString().trim() ?? ''

		const safeLargeImage = li.length > 0 && !li.includes(' ') ? li : null
		const safeSmallImage = si.length > 0 && !si.includes(' ') ? si : null

		return {
			largeImage: safeLargeImage,
			largeText: c.largeText === null || c.largeText === undefined ? null : c.largeText.toString(),
			smallImage: safeSmallImage,
			smallText: c.smallText === null || c.smallText === undefined ? null : c.smallText.toString(),
		}
	})

	await writeImageCyclesConfig({ cycles: cleaned })
}

export async function setPartyConfig(config: PartyConfig) {
	const entriesRaw = Array.isArray(config.entries) ? config.entries : []
	const cleaned: PartyCycleEntry[] = entriesRaw.map(p => ({
		sizeCurrent:
			p.sizeCurrent === null || p.sizeCurrent === undefined ? null : Number(p.sizeCurrent),
		sizeMax: p.sizeMax === null || p.sizeMax === undefined ? null : Number(p.sizeMax),
	}))
	const finalCfg: PartyConfig = { entries: cleaned }
	await writePartyConfig(finalCfg)
}

function roundToNearest5(x: number) {
	return Math.round(x / 5) * 5
}

export async function readFiltersState(): Promise<ConfigState> {
	try {
		const raw = await fs.readFile(getSettingsPath(), 'utf-8')
		const parsed = JSON.parse(raw) as {
			musicFilter?: boolean
			videoFilter?: boolean
			activityFilter?: boolean
			coverFetchEnabled?: boolean
			hardwareMonitorEnabled?: boolean
			statusEnabled?: boolean
			statusEnabledBrowser?: boolean
			rpcEnabled?: boolean
		}
		return {
			musicFilter: parsed.musicFilter === true,
			videoFilter: parsed.videoFilter === true,
			activityFilter: parsed.activityFilter === true,
			coverFetchEnabled: parsed.coverFetchEnabled === true,
			hardwareMonitorEnabled: parsed.hardwareMonitorEnabled === true,
			statusEnabled: parsed.statusEnabled === true,
			statusEnabledBrowser: parsed.statusEnabledBrowser === true,
			rpcEnabled: parsed.rpcEnabled === true,
		}
	} catch {
		return {
			musicFilter: false,
			videoFilter: false,
			activityFilter: false,
			coverFetchEnabled: false,
			hardwareMonitorEnabled: false,
			statusEnabled: false,
			statusEnabledBrowser: false,
			rpcEnabled: false,
		}
	}
}

const defaultSettings: Settings = {
	autoHideOnStart: false,
	musicFilter: false,
	videoFilter: false,
	activityFilter: false,
	coverFetchEnabled: false,
	hardwareMonitorEnabled: false,
	statusEnabled: false,
	rpcEnabled: true,
	statusEnabledBrowser: false,
	barStyle: 'unicode',
	lastUpdateNotified: null,
	lastUpdateNotifiedVersion: null,
}

const validateSettings: Validator<Settings> = (input): Settings => {
	const obj = (input ?? {}) as Partial<Settings>
	const barStyle =
		obj.barStyle === 'cmd' ||
		obj.barStyle === 'block' ||
		obj.barStyle === 'soft' ||
		obj.barStyle === 'retro' ||
		obj.barStyle === 'cyber'
			? obj.barStyle
			: 'unicode'

	return {
		autoHideOnStart: obj.autoHideOnStart === true,
		musicFilter: obj.musicFilter === true,
		videoFilter: obj.videoFilter === true,
		activityFilter: obj.activityFilter === true,
		coverFetchEnabled: obj.coverFetchEnabled === true,
		hardwareMonitorEnabled: obj.hardwareMonitorEnabled === true,
		statusEnabled: obj.statusEnabled === true,
		statusEnabledBrowser: obj.statusEnabledBrowser === true,
		rpcEnabled: obj.rpcEnabled === true,
		barStyle,
		lastUpdateNotified:
			typeof obj.lastUpdateNotified === 'string' && obj.lastUpdateNotified.trim().length > 0
				? obj.lastUpdateNotified.trim()
				: null,
		lastUpdateNotifiedVersion:
			typeof obj.lastUpdateNotifiedVersion === 'string' &&
			obj.lastUpdateNotifiedVersion.trim().length > 0
				? obj.lastUpdateNotifiedVersion.trim()
				: null,
	}
}

export async function readSettings(): Promise<Settings> {
	return readJsonWithSchema(getSettingsPath(), validateSettings, defaultSettings)
}

export async function writeSettings(data: Settings): Promise<void> {
	const safe = validateSettings(data)
	await writeJsonSafe(getSettingsPath(), safe)
}

export async function setBarStyle(style: BarStyle) {
	const cfg = await readSettings()
	cfg.barStyle =
		style === 'cmd' ||
		style === 'block' ||
		style === 'soft' ||
		style === 'retro' ||
		style === 'cyber'
			? style
			: 'unicode'
	await writeSettings(cfg)
}

export async function setStatusEnabled(enabled: boolean) {
	const cfg = await readSettings()
	cfg.statusEnabled = !!enabled
	await writeSettings(cfg)
}

export async function setStatusIntervalConfig(sec: number | null) {
	const cfg = await readTimerConfig()
	cfg.updateIntervalSecStatus =
		typeof sec === 'number' && Number.isFinite(sec) && sec > 0 ? Math.max(5, Math.floor(sec)) : null
	await writeTimerConfig(cfg)
}

import { StatusCycleEntry } from '../types/types'
import { Language } from './translations'

const defaultStatusCyclesConfig = {
	cycles: [] as StatusCycleEntry[],
}

function validateStatusCyclesConfig(input: unknown) {
	const obj = (input ?? {}) as { cycles?: unknown }
	const cycles = Array.isArray(obj.cycles) ? obj.cycles : []

	return {
		cycles: cycles.map((c: any) => ({
			text: typeof c?.text === 'string' ? c.text : '',
			emoji: typeof c?.emoji === 'string' && c.emoji.trim().length > 0 ? c.emoji : null,
		})),
	}
}
function getStatusCyclesConfigPath() {
	return getConfigPath('status-cycles.json')
}

export async function readStatusCyclesConfig() {
	return readJsonWithSchema(
		getStatusCyclesConfigPath(),
		validateStatusCyclesConfig,
		defaultStatusCyclesConfig
	)
}

export async function writeStatusCyclesConfig(config: { cycles: StatusCycleEntry[] }) {
	await writeJsonSafe(getStatusCyclesConfigPath(), validateStatusCyclesConfig(config))
}

export async function setStatusCyclesConfig(cycles: StatusCycleEntry[]) {
	const cleaned = Array.isArray(cycles)
		? cycles.map(c => ({
				text: c.text?.toString() ?? '',
				emoji: c.emoji === null || c.emoji === undefined ? null : c.emoji.toString(),
			}))
		: []

	await writeStatusCyclesConfig({ cycles: cleaned })
}

export function normalizeStatuses(list: any[] | undefined | null): StatusCycleEntry[] {
	if (!Array.isArray(list)) return []
	return list
		.map(x => ({
			text: typeof x?.text === 'string' ? (x.text as string).trim() : '',
			emoji:
				typeof x?.emoji === 'string' && (x.emoji as string).trim() !== ''
					? (x.emoji as string).trim()
					: null,
		}))
		.filter((x): x is StatusCycleEntry => x.text.length > 0)
}

export async function setRpcEnabled(enabled: boolean) {
	const cfg = await readSettings()
	cfg.rpcEnabled = !!enabled
	await writeSettings(cfg)
}

export async function setStatusEnabledBrowser(enabled: boolean) {
	const cfg = await readSettings()
	cfg.statusEnabledBrowser = !!enabled
	await writeSettings(cfg)
}

const defaultLanguageConfig: LanguageConfig = {
	language: 'ru',
}

const validateLanguageConfig: Validator<LanguageConfig> = (input): LanguageConfig => {
	const obj = (input ?? {}) as Partial<LanguageConfig>
	const lang = obj.language
	if (lang === 'ru' || lang === 'en' || lang === 'tr') {
		return { language: lang }
	}
	return defaultLanguageConfig
}

export async function readLanguageConfig(): Promise<LanguageConfig> {
	return readJsonWithSchema(getLanguageConfigPath(), validateLanguageConfig, defaultLanguageConfig)
}

export async function writeLanguageConfig(config: LanguageConfig): Promise<void> {
	await writeJsonSafe(getLanguageConfigPath(), validateLanguageConfig(config))
}

export async function getLanguage(): Promise<Language> {
	const config = await readLanguageConfig()
	return config.language
}

export async function setLanguage(lang: Language): Promise<void> {
	await writeLanguageConfig({ language: lang })
}
