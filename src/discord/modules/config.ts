import { app } from 'electron'
import { promises as fs } from 'fs'
import * as path from 'path'
import {
	ButtonPair,
	ButtonsConfig,
	ClientConfig,
	CyclesConfig,
	ImageCycle,
	ImageCyclesConfig,
	LinksConfig,
} from './types'

function getConfigPath(name: string) {
	const userData = app.getPath('userData')
	return path.join(userData, name)
}

function getClientConfigPath() {
	return getConfigPath('client-config.json')
}

function getLinksConfigPath() {
	return getConfigPath('links-config.json')
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

export async function readLinksConfig(): Promise<LinksConfig> {
	const configPath = getLinksConfigPath()
	try {
		const raw = await fs.readFile(configPath, 'utf-8')
		const parsed = JSON.parse(raw) as Partial<LinksConfig>
		return {
			largeImage:
				typeof parsed.largeImage === 'string' &&
				parsed.largeImage.trim().length > 0
					? parsed.largeImage.trim()
					: null,
			largeText:
				typeof parsed.largeText === 'string' &&
				parsed.largeText.trim().length > 0
					? parsed.largeText.trim()
					: null,
			smallImage:
				typeof parsed.smallImage === 'string' &&
				parsed.smallImage.trim().length > 0
					? parsed.smallImage.trim()
					: null,
			smallText:
				typeof parsed.smallText === 'string' &&
				parsed.smallText.trim().length > 0
					? parsed.smallText.trim()
					: null,
		}
	} catch {
		return {
			largeImage: null,
			largeText: null,
			smallImage: null,
			smallText: null,
		}
	}
}

export async function writeLinksConfig(config: LinksConfig) {
	const configPath = getLinksConfigPath()
	await fs.writeFile(configPath, JSON.stringify(config, null, 2))
}

function normalizeButtonPair(p: any): ButtonPair | null {
	const label1 = (p.label1 || '').toString().trim()
	const url1 = (p.url1 || '').toString().trim()
	const label2 = (p.label2 || '').toString().trim()
	const url2 = (p.url2 || '').toString().trim()

	const has1 = label1.length > 0 && url1.length > 0
	const has2 = label2.length > 0 && url2.length > 0

	if (!has1 && !has2) return null
	if (has1 && !has2) return { label1, url1 }
	if (!has1 && has2) return { label1: label2, url1: url2 }
	return { label1, url1, label2, url2 }
}

export async function readButtonsConfig(): Promise<ButtonsConfig> {
	const configPath = getButtonsConfigPath()
	try {
		const raw = await fs.readFile(configPath, 'utf-8')
		const parsed = JSON.parse(raw) as Partial<ButtonsConfig>
		const pairs = Array.isArray(parsed.pairs) ? parsed.pairs : []
		const cleaned = pairs
			.map(normalizeButtonPair)
			.filter((p): p is ButtonPair => !!p)
		return { pairs: cleaned }
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
			entries: entries
				.map(e => {
					const details = (e.details || '').toString().trim()
					let state = (e.state || '').toString().trim()
					if (state.length > 0 && state.length < 2) {
						state = ''
					}
					return { details, state }
				})
				.filter(e => e.details.length > 0 || e.state.length >= 2),
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
				largeImage: c.largeImage?.toString().trim() || null,
				largeText: c.largeText?.toString().trim() || null,
				smallImage: c.smallImage?.toString().trim() || null,
				smallText: c.smallText?.toString().trim() || null,
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

export async function setClientId(clientId: string) {
	const cfg = await readClientConfig()
	cfg.clientId = clientId.trim() || null
	await writeClientConfig(cfg)
}

export async function setLinksConfig(
	largeImage: string,
	largeText: string,
	smallImage: string,
	smallText: string
) {
	const cfg: LinksConfig = {
		largeImage: largeImage.trim() || null,
		largeText: largeText.trim() || null,
		smallImage: smallImage.trim() || null,
		smallText: smallText.trim() || null,
	}
	await writeLinksConfig(cfg)
}

export async function setButtonsConfig(pairs: ButtonPair[]) {
	const cleaned = pairs
		.map(normalizeButtonPair)
		.filter((p): p is ButtonPair => !!p)
	await writeButtonsConfig({ pairs: cleaned })
}

export async function setCycles(entries: { details: string; state: string }[]) {
	const cleaned = entries
		.map(e => ({
			details: (e.details || '').trim(),
			state: (e.state || '').trim(),
		}))
		.map(e => {
			if (e.state.length > 0 && e.state.length < 2) {
				e.state = ''
			}
			return e
		})
		.filter(e => e.details.length > 0 || e.state.length >= 2)
	await writeCyclesConfig({ entries: cleaned })
}

export async function setImageCyclesConfig(
	cycles: {
		largeImage: string
		largeText: string
		smallImage: string
		smallText: string
	}[]
) {
	const cleaned: ImageCycle[] = cycles.map(c => ({
		largeImage: c.largeImage.trim() || null,
		largeText: c.largeText.trim() || null,
		smallImage: c.smallImage.trim() || null,
		smallText: c.smallText.trim() || null,
	}))
	await writeImageCyclesConfig({ cycles: cleaned })
}
