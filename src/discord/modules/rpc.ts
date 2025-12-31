import { exec } from 'child_process'
import rpc from 'discord-rpc'
import {
	readButtonsConfig,
	readClientConfig,
	readCyclesConfig,
	readImageCyclesConfig,
	readLinksConfig,
} from './config'
import { ImageCycle, RpcPayload } from './types'

const processName = 'Discord.exe'

let client: any = null
let cycleTimer: NodeJS.Timeout | null = null
let restartTimer: NodeJS.Timeout | null = null
let restartInterval: NodeJS.Timeout | null = null
let activityIntervalMs = 30000

export function setActivityInterval(sec: number) {
	if (!Number.isFinite(sec) || sec < 5) {
		activityIntervalMs = 5000
	} else {
		activityIntervalMs = sec * 1000
	}
	if (cycleTimer) {
		clearInterval(cycleTimer)
		cycleTimer = null
	}
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

function checkDiscordRunning(cb: (err: any, isRunning: boolean) => void) {
	exec('tasklist', (err, stdout) => {
		if (err) return cb(err, false)
		const found = stdout.toLowerCase().includes(processName.toLowerCase())
		cb(null, found)
	})
}

export default function startDiscordRich(
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

		const baseImageCycles: ImageCycle[] =
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

			const buttons: { label: string; url: string }[] = []
			if (buttonPairs.length > 0) {
				const pairIndex = idx % buttonPairs.length
				const pair = buttonPairs[pairIndex]
				if (pair.label1 && pair.url1) {
					buttons.push({ label: pair.label1, url: pair.url1 })
				}
				if (pair.label2 && pair.url2) {
					buttons.push({ label: pair.label2, url: pair.url2 })
				}
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
			}, activityIntervalMs)
		})

		localClient.on('disconnected', () => {
			if (sendLog) sendLog('RPC disconnected')
			sendStatus('DISCONNECTED')

			if (cycleTimer) {
				clearInterval(cycleTimer)
				cycleTimer = null
			}

			if (restartTimer) {
				clearTimeout(restartTimer)
			}
			restartTimer = setTimeout(findAndRestartProcess, 5000)
		})

		localClient.on('error', (e: any) => {
			if (sendLog) sendLog('RPC error: ' + (e?.message || String(e)))
			sendStatus('DISCONNECTED')

			if (cycleTimer) {
				clearInterval(cycleTimer)
				cycleTimer = null
			}

			if (restartTimer) {
				clearTimeout(restartTimer)
			}
			restartTimer = setTimeout(findAndRestartProcess, 5000)
		})

		localClient.login({ clientId }).catch((e: any) => {
			if (sendLog) sendLog('RPC login error: ' + (e?.message || String(e)))
			sendStatus('DISCONNECTED')
			if (restartTimer) {
				clearTimeout(restartTimer)
			}
			restartTimer = setTimeout(findAndRestartProcess, 5000)
		})
	}

	function findAndRestartProcess() {
		checkDiscordRunning((err, isRunning) => {
			if (err) {
				if (sendLog) sendLog('tasklist error: ' + (err?.message || String(err)))
				sendStatus('DISCONNECTED')
				return
			}
			if (!isRunning) {
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
			}
		})
	}

	findAndRestartProcess()
}
