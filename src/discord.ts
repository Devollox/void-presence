import { app } from 'electron'
import { promises as fs } from 'fs'
import * as path from 'path'
const rpc = require('discord-rpc')
const ps = require('ps-node')

const processName = 'Discord.exe'

let client: any = null
let cycleTimer: NodeJS.Timeout | null = null
let restartTimer: NodeJS.Timeout | null = null
let restartInterval: NodeJS.Timeout | null = null

export type RpcPayload = {
	details: string
	state: string
	coordinates: string
	buttons: { label: string; url: string }[]
}

type ClientConfig = {
	clientId: string | null
}

type LinksConfig = {
	largeImage: string | null
	largeText: string | null
	smallImage: string | null
	smallText: string | null
}

type ButtonPair = {
	label1: string
	url1: string
	label2: string
	url2: string
}

type ButtonsConfig = {
	pairs: ButtonPair[]
}

type CycleEntry = {
	details: string
	state: string
}

type CyclesConfig = {
	entries: CycleEntry[]
}

type ImageCycle = {
	largeImage: string | null
	largeText: string | null
	smallImage: string | null
	smallText: string | null
}

type ImageCyclesConfig = {
	cycles: ImageCycle[]
}

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

async function readClientConfig(): Promise<ClientConfig> {
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

async function writeClientConfig(config: ClientConfig) {
	const configPath = getClientConfigPath()
	await fs.writeFile(configPath, JSON.stringify(config, null, 2))
}

async function readLinksConfig(): Promise<LinksConfig> {
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

async function writeLinksConfig(config: LinksConfig) {
	const configPath = getLinksConfigPath()
	await fs.writeFile(configPath, JSON.stringify(config, null, 2))
}

async function readButtonsConfig(): Promise<ButtonsConfig> {
	const configPath = getButtonsConfigPath()
	try {
		const raw = await fs.readFile(configPath, 'utf-8')
		const parsed = JSON.parse(raw) as Partial<ButtonsConfig>
		const pairs = Array.isArray(parsed.pairs) ? parsed.pairs : []
		const cleaned = pairs
			.map(p => ({
				label1: (p.label1 || '').toString().trim(),
				url1: (p.url1 || '').toString().trim(),
				label2: (p.label2 || '').toString().trim(),
				url2: (p.url2 || '').toString().trim(),
			}))
			.filter(
				p =>
					p.label1.length > 0 &&
					p.url1.length > 0 &&
					p.label2.length > 0 &&
					p.url2.length > 0
			)
		return { pairs: cleaned }
	} catch {
		return { pairs: [] }
	}
}

async function writeButtonsConfig(config: ButtonsConfig) {
	const configPath = getButtonsConfigPath()
	await fs.writeFile(configPath, JSON.stringify(config, null, 2))
}

async function readCyclesConfig(): Promise<CyclesConfig> {
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

async function writeCyclesConfig(config: CyclesConfig) {
	const configPath = getCyclesConfigPath()
	await fs.writeFile(configPath, JSON.stringify(config, null, 2))
}

async function readImageCyclesConfig(): Promise<ImageCyclesConfig> {
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

async function writeImageCyclesConfig(config: ImageCyclesConfig) {
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
		.map(p => ({
			label1: (p.label1 || '').trim(),
			url1: (p.url1 || '').trim(),
			label2: (p.label2 || '').trim(),
			url2: (p.url2 || '').trim(),
		}))
		.filter(
			p =>
				p.label1.length > 0 &&
				p.url1.length > 0 &&
				p.label2.length > 0 &&
				p.url2.length > 0
		)
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

function createClient() {
	if (client) {
		try {
			client.clearActivity()
		} catch {}
		try {
			client.destroy()
		} catch {}
		client = null
	}
	client = new rpc.Client({ transport: 'ipc' })
	return client
}

export function stopDiscordRich() {
	if (cycleTimer) {
		clearInterval(cycleTimer)
		cycleTimer = null
	}
	if (restartTimer) {
		clearTimeout(restartTimer)
		restartTimer = null
	}
	if (restartInterval) {
		clearInterval(restartInterval)
		restartInterval = null
	}
	if (client) {
		try {
			client.clearActivity()
		} catch {}
		try {
			client.destroy()
		} catch {}
		client = null
	}
}

function startDiscordRich(
	sendPayload: (payload: RpcPayload) => void,
	sendStatus: (status: string) => void,
	sendLog?: (message: string) => void
) {
	async function startSession() {
		const { clientId } = await readClientConfig()
		const links = await readLinksConfig()
		const buttonsConfig = await readButtonsConfig()
		const cyclesConfig = await readCyclesConfig()
		const imageCyclesConfig = await readImageCyclesConfig()

		if (!clientId || !cyclesConfig.entries.length) {
			sendStatus('NO_CLIENT_ID')
			if (sendLog) sendLog('No client ID or no cycles configured')
			return
		}

		const baseImageCycles =
			imageCyclesConfig.cycles.length > 0
				? imageCyclesConfig.cycles
				: [
						{
							largeImage: links.largeImage || null,
							largeText: links.largeText || null,
							smallImage: links.smallImage || null,
							smallText: links.smallText || null,
						},
				  ]

		const localClient = createClient()
		const timestamps = { start: Date.now() }

		const baseCycles = cyclesConfig.entries
		const buttonPairs = buttonsConfig.pairs

		const cycles = baseCycles.map((c, idx) => {
			const img = baseImageCycles[idx % baseImageCycles.length]

			let buttons: { label: string; url: string }[] = []
			if (buttonPairs.length > 0) {
				const pairIndex = idx % buttonPairs.length
				const pair = buttonPairs[pairIndex]
				buttons = [
					{ label: pair.label1, url: pair.url1 },
					{ label: pair.label2, url: pair.url2 },
				]
			}

			return {
				details: c.details,
				state: c.state,
				buttons,
				largeImage: img.largeImage,
				largeText: img.largeText,
				smallImage: img.smallImage,
				smallText: img.smallText,
			}
		})

		let index = 0

		function pushActivity() {
			const current = cycles[index]
			index = (index + 1) % cycles.length

			const buttons = current.buttons

			const safeState =
				typeof current.state === 'string' && current.state.trim().length >= 2
					? current.state
					: undefined

			const activity: any = {
				details: current.details,
				state: safeState,
				assets: {
					large_image: current.largeImage || undefined,
					large_text: current.largeText || undefined,
					small_image: current.smallImage || undefined,
					small_text: current.smallText || undefined,
				},
				timestamps,
			}

			if (current.buttons.length > 0) {
				activity.buttons = current.buttons
			}

			localClient
				.request('SET_ACTIVITY', {
					pid: process.pid,
					activity,
				})
				.catch((e: any) => {
					if (sendLog) {
						sendLog(
							'SET_ACTIVITY error: ' + (e?.message || JSON.stringify(e) || '')
						)
					}
				})

			sendStatus('ACTIVE')

			sendPayload({
				details: current.details,
				state: current.state,
				coordinates: '',
				buttons,
			})
		}

		sendStatus('CONNECTING RPC')
		if (sendLog) sendLog('Connecting RPC with clientId ' + clientId)

		localClient.on('ready', () => {
			if (sendLog) sendLog('RPC ready')
			pushActivity()
			if (cycleTimer) {
				clearInterval(cycleTimer)
			}
			cycleTimer = setInterval(() => {
				pushActivity()
			}, 30000)
		})

		localClient.on('disconnected', () => {
			if (sendLog) sendLog('RPC disconnected')
			sendStatus('DISCONNECTED')
			if (restartTimer) {
				clearTimeout(restartTimer)
			}
			restartTimer = setTimeout(findAndRestartProcess, 3000)
		})

		localClient.on('error', (e: any) => {
			if (sendLog) sendLog('RPC error: ' + (e?.message || String(e)))
			sendStatus('DISCONNECTED')
			if (restartTimer) {
				clearTimeout(restartTimer)
			}
			restartTimer = setTimeout(findAndRestartProcess, 3000)
		})

		localClient.login({ clientId }).catch((e: any) => {
			if (sendLog) sendLog('RPC login error: ' + (e?.message || String(e)))
			sendStatus('DISCONNECTED')
			if (restartTimer) {
				clearTimeout(restartTimer)
			}
			restartTimer = setTimeout(findAndRestartProcess, 3000)
		})
	}

	function restartProcess() {
		ps.lookup({ command: processName }, (err: any, resultList: any[]) => {
			if (err) {
				if (sendLog)
					sendLog('ps lookup error: ' + (err?.message || String(err)))
				return
			}
			if (resultList.length <= 1) {
				sendStatus('SEARCHING DISCORD')
				findAndRestartProcess()
			} else {
				sendStatus('CONNECTING RPC')
			}
		})
	}

	function findAndRestartProcess() {
		ps.lookup({ command: processName }, (err: any, resultList: any[]) => {
			if (err) {
				if (sendLog)
					sendLog('ps lookup error: ' + (err?.message || String(err)))
				sendStatus('DISCONNECTED')
				return
			}
			if (resultList.length === 0) {
				sendStatus('SEARCHING DISCORD')
				if (restartTimer) {
					clearTimeout(restartTimer)
				}
				restartTimer = setTimeout(findAndRestartProcess, 5000)
			} else {
				if (restartTimer) {
					clearTimeout(restartTimer)
				}
				restartTimer = setTimeout(startSession, 25000)
				if (restartInterval) {
					clearInterval(restartInterval)
				}
				restartInterval = setInterval(restartProcess, 3600000)
			}
		})
	}

	findAndRestartProcess()
}

export { readClientConfig }
export default startDiscordRich
