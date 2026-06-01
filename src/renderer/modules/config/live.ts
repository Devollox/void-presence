import {
	ActivityType,
	ButtonPair,
	CycleEntry,
	ImageCycleEntry,
	NowMode,
	PartyCycleEntry,
	StatusCycleEntry,
	TimeCycleEntry,
	TimestampMode,
	VoidPresenceCtx,
} from '../../../types/types'

function buildPartyPayload(
	party: PartyCycleEntry[],
): { sizeCurrent: string; sizeMax: string }[] {
	return (party || []).map(p => ({
		sizeCurrent: p.sizeCurrent?.toString() ?? '',
		sizeMax: p.sizeMax?.toString() ?? '',
	}))
}

function buildTimeCyclesPayload(
	timeCycles: TimeCycleEntry[],
): { label: string; seconds: string }[] {
	return (timeCycles || []).map(tc => ({
		label: tc.label || '',
		seconds:
			typeof tc.seconds === 'number'
				? String(tc.seconds)
				: (tc.seconds as string) || '',
	}))
}

function buildTimestampPayloadFromLocal(): {
	mode: TimestampMode
	rangeMin: string
	rangeMax: string
	nowMode: NowMode
	activityType: ActivityType
} {
	const timestampMode: TimestampMode =
		(localStorage.getItem('timestampMode') as TimestampMode | null) || 'now'
	const timestampRangeMin = localStorage.getItem('timestampRangeMin') || ''
	const timestampRangeMax = localStorage.getItem('timestampRangeMax') || ''
	const activityType: ActivityType =
		(localStorage.getItem('activityType') as ActivityType | null) || 'playing'
	const nowMode: NowMode =
		(localStorage.getItem('nowMode') as NowMode | null) || 'plain'

	return {
		mode: timestampMode,
		rangeMin: timestampRangeMin,
		rangeMax: timestampRangeMax,
		nowMode,
		activityType,
	}
}

function buildStatusCyclesPayload(
	statusCycles: StatusCycleEntry[],
): { text: string; emoji: string | null }[] {
	return (statusCycles || []).map(s => ({
		text: s.text || '',
		emoji:
			typeof s.emoji === 'string' && s.emoji.trim().length > 0
				? s.emoji.trim()
				: null,
	}))
}

export async function pushStatusFromCtx(ctx: VoidPresenceCtx): Promise<void> {
	const statusIntervalInput = document.getElementById(
		'status-update-interval-input',
	) as HTMLInputElement | null

	const statusIntervalSec = statusIntervalInput
		? parseInt(statusIntervalInput.value.trim(), 10)
		: NaN

	const statusCycles = Array.isArray(ctx.statusCycles) ? ctx.statusCycles : []

	localStorage.setItem('statusCycles', JSON.stringify(statusCycles))

	if (!isNaN(statusIntervalSec) && statusIntervalSec > 0) {
		localStorage.setItem('updateIntervalSecStatus', String(statusIntervalSec))
	}

	if (
		!isNaN(statusIntervalSec) &&
		statusIntervalSec > 0 &&
		window.electronAPI?.liveSetStatusInterval
	) {
		await window.electronAPI.liveSetStatusInterval(statusIntervalSec)
	}
	if (window.electronAPI?.liveSetStatusCycles) {
		const payload = buildStatusCyclesPayload(statusCycles)
		await window.electronAPI.liveSetStatusCycles(payload)
	}
}

export async function pushLiveStateFromCtx(
	ctx: VoidPresenceCtx,
): Promise<void> {
	const clientInput = document.getElementById(
		'client-id-input',
	) as HTMLInputElement | null
	const intervalInput = document.getElementById(
		'update-interval-input',
	) as HTMLInputElement | null
	const tokenInput = document.getElementById(
		'discord-token-input',
	) as HTMLInputElement | null

	const clientId = clientInput ? clientInput.value.trim() : ''
	const intervalSec = intervalInput
		? parseInt(intervalInput.value.trim(), 10)
		: NaN
	const discordToken = tokenInput ? tokenInput.value.trim() : ''

	const timestampPayload = buildTimestampPayloadFromLocal()
	const timeCycles = Array.isArray(ctx.timeCycles) ? ctx.timeCycles : []

	localStorage.setItem('clientId', clientId)
	localStorage.setItem('discordToken', discordToken)
	localStorage.setItem('buttonPairs', JSON.stringify(ctx.buttonPairs))
	localStorage.setItem('cycles', JSON.stringify(ctx.cycles))
	localStorage.setItem('imageCycles', JSON.stringify(ctx.imageCycles))
	localStorage.setItem('party', JSON.stringify(ctx.party))
	localStorage.setItem('timeCycles', JSON.stringify(timeCycles))
	localStorage.setItem('timestampMode', timestampPayload.mode)
	localStorage.setItem('timestampRangeMin', timestampPayload.rangeMin)
	localStorage.setItem('timestampRangeMax', timestampPayload.rangeMax)
	localStorage.setItem('activityType', timestampPayload.activityType)
	localStorage.setItem('nowMode', timestampPayload.nowMode)

	if (window.electronAPI?.liveSetClientId && clientId.length > 18) {
		await window.electronAPI.liveSetClientId(clientId)
	}
	if (
		!isNaN(intervalSec) &&
		intervalSec > 0 &&
		window.electronAPI?.liveSetInterval
	) {
		await window.electronAPI.liveSetInterval(intervalSec)
	}
	if (window.electronAPI?.liveSetDiscordToken) {
		await window.electronAPI.liveSetDiscordToken(discordToken)
	}
	if (window.electronAPI?.liveSetCycles) {
		await window.electronAPI.liveSetCycles((ctx.cycles || []) as CycleEntry[])
	}
	if (window.electronAPI?.liveSetImages) {
		await window.electronAPI.liveSetImages(
			(ctx.imageCycles || []) as ImageCycleEntry[],
		)
	}
	if (window.electronAPI?.liveSetButtons) {
		await window.electronAPI.liveSetButtons(
			(ctx.buttonPairs || []) as ButtonPair[],
		)
	}
	if (window.electronAPI?.liveSetParty) {
		const partyPayload = buildPartyPayload(ctx.party || [])
		await window.electronAPI.liveSetParty(partyPayload)
	}
	if (window.electronAPI?.liveSetTimeCycles) {
		const timePayload = buildTimeCyclesPayload(timeCycles)
		await window.electronAPI.liveSetTimeCycles(timePayload)
	}
	if (window.electronAPI?.liveSetTimestamp) {
		await window.electronAPI.liveSetTimestamp({
			mode: timestampPayload.mode,
			rangeMin: timestampPayload.rangeMin,
			rangeMax: timestampPayload.rangeMax,
			nowMode: timestampPayload.nowMode,
		})
	}
}

export function downloadJson(data: unknown, filename: string): void {
	const json = JSON.stringify(data, null, 2)
	const blob = new Blob([json], { type: 'application/json' })
	const url = URL.createObjectURL(blob)
	const a = document.createElement('a')
	a.href = url
	a.download = filename
	document.body.appendChild(a)
	a.click()
	document.body.removeChild(a)
	URL.revokeObjectURL(url)
}
