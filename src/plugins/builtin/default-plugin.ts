import {
	readActivityTypeConfig,
	readButtonsConfig,
	readCyclesConfig,
	readImageCyclesConfig,
	readPartyConfig,
	readTimerConfig,
} from '../../main/config'
import type { ActivityType, ImageCycle, PartyCycleEntry, PresencePayload } from '../../types/types'
import type { PluginContext, VoidPlugin } from '../plugin-types'

let _imageIndex = 0
let _cycleIndex = 0
let _buttonIndex = 0
let _partyIndex = 0
let _currentPayload: PresencePayload | null = null
let _pollTimer: NodeJS.Timeout | null = null
let _ctx: PluginContext | null = null
let _updateCb: (() => void) | null = null

function san(v: string | null | undefined): string | undefined {
	return v && v.trim() !== '' ? v : undefined
}

function getNextImageCycle(cycles: ImageCycle[]): ImageCycle {
	if (!cycles.length)
		return { largeImage: null, largeText: null, smallImage: null, smallText: null }
	const img = cycles[_imageIndex % cycles.length]
	_imageIndex = (_imageIndex + 1) % cycles.length
	return img
}

function getNextButtons(buttonPairs: any[]): { label: string; url: string }[] {
	if (!Array.isArray(buttonPairs) || !buttonPairs.length) return []
	const pair = buttonPairs[_buttonIndex % buttonPairs.length]
	_buttonIndex = (_buttonIndex + 1) % buttonPairs.length
	const res: { label: string; url: string }[] = []
	if (pair?.label1 && pair?.url1) res.push({ label: pair.label1, url: pair.url1 })
	if (pair?.label2 && pair?.url2) res.push({ label: pair.label2, url: pair.url2 })
	return res
}

function getNextParty(partyConfig: any): PartyCycleEntry | null {
	if (!partyConfig || !Array.isArray(partyConfig.entries) || !partyConfig.entries.length)
		return null
	const entry = partyConfig.entries[_partyIndex % partyConfig.entries.length]
	_partyIndex = (_partyIndex + 1) % partyConfig.entries.length
	return entry
}

async function refresh(): Promise<void> {
	try {
		const [cyclesCfg, imagesCfg, typeCfg, buttonsCfg, partyCfg] = await Promise.all([
			readCyclesConfig(),
			readImageCyclesConfig(),
			readActivityTypeConfig(),
			readButtonsConfig(),
			readPartyConfig(),
		])

		if (!cyclesCfg.entries.length) {
			_currentPayload = null
			return
		}

		const entry = cyclesCfg.entries[_cycleIndex % cyclesCfg.entries.length]
		_cycleIndex = (_cycleIndex + 1) % cyclesCfg.entries.length

		const img = getNextImageCycle(imagesCfg.cycles)
		const activityType: ActivityType = typeCfg.type
		const buttons = getNextButtons(buttonsCfg.pairs)
		const partyEntry = getNextParty(partyCfg)

		const party =
			partyEntry &&
			Number.isFinite(partyEntry.sizeCurrent) &&
			Number.isFinite(partyEntry.sizeMax) &&
			Number(partyEntry.sizeCurrent!) > 0 &&
			partyEntry.sizeMax! >= partyEntry.sizeCurrent!
				? {
						size: [Number(partyEntry.sizeCurrent!), Number(partyEntry.sizeMax!)] as [
							number,
							number,
						],
					}
				: undefined

		const largeImage = san(img.largeImage)
		const largeText = san(img.largeText)
		const smallImage = san(img.smallImage)
		const smallText = san(img.smallText)
		const hasAssets = largeImage || largeText || smallImage || smallText

		_currentPayload = {
			details: entry.details,
			state: entry.state,
			activityType,
			...(hasAssets
				? {
						assets: {
							large_image: largeImage,
							large_text: largeText,
							small_image: smallImage,
							small_text: smallText,
						},
					}
				: {}),
			...(party ? { party } : {}),
			...(buttons.length ? { buttons } : {}),
			priority: 0,
		}
	} catch {
		_currentPayload = null
	}
}

function startPoll() {
	if (_pollTimer) return

	async function tick() {
		if (!_pollTimer) return
		await refresh()
		_updateCb?.()
		const { updateIntervalSec } = await readTimerConfig()
		const intervalMs = (updateIntervalSec && updateIntervalSec >= 5 ? updateIntervalSec : 30) * 1000
		_pollTimer = setTimeout(tick, intervalMs)
	}

	_pollTimer = setTimeout(tick, 0)
}

function stopPoll() {
	if (_pollTimer) {
		clearTimeout(_pollTimer)
		_pollTimer = null
	}
	_currentPayload = null
	_imageIndex = 0
	_cycleIndex = 0
	_buttonIndex = 0
	_partyIndex = 0
}

export const defaultPlugin: VoidPlugin = {
	id: 'default',
	nameKey: 'plugins.default.name',
	version: '1.0.0',
	builtin: true,
	priority: 0,
	locked: true,
	controls: [],
	start(ctx: PluginContext) {
		_ctx = ctx
		_imageIndex = 0
		_cycleIndex = 0
		_buttonIndex = 0
		_partyIndex = 0
		startPoll()
	},
	stop() {
		stopPoll()
		_ctx = null
	},
	onUpdate(cb: () => void) {
		_updateCb = cb
	},
	getPayload() {
		return _currentPayload
	},
}
