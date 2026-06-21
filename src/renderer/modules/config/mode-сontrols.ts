import { NowMode, TimestampMode, VoidPresenceCtx } from '../../../types/types'
import { pushLiveStateFromCtx } from './live'

export function createModeControllers(ctx: VoidPresenceCtx) {
	const modeNow = document.getElementById('timestamp-mode-now') as HTMLButtonElement | null
	const modeRange = document.getElementById('timestamp-mode-range') as HTMLButtonElement | null
	const modePersist = document.getElementById('timestamp-mode-persist') as HTMLButtonElement | null

	const rangeMinInput = document.getElementById('timestamp-range-min') as HTMLInputElement | null
	const rangeMaxInput = document.getElementById('timestamp-range-max') as HTMLInputElement | null
	const persistResetBtn = document.getElementById(
		'timestamp-persist-reset'
	) as HTMLButtonElement | null

	const rangeRows = document.querySelectorAll<HTMLElement>('.timestamp-range-row')
	const persistRow = document.querySelector<HTMLElement>('.timestamp-persist-row')

	const timeList = document.getElementById('time-list') as HTMLElement | null
	const nowPlain = document.getElementById('now-mode-plain') as HTMLButtonElement | null
	const nowProgress = document.getElementById('now-mode-progress') as HTMLButtonElement | null
	const nowCycles = document.getElementById('now-mode-cycles') as HTMLButtonElement | null
	const nowModeRow = document.querySelector<HTMLElement>('.now-mode-row')
	const timeDivider = document.querySelector<HTMLElement>('.time-cycles-divider')
	const timeHeader = document.querySelector<HTMLElement>('.time-cycles-header')

	const storedMode = (localStorage.getItem('timestampMode') as TimestampMode | null) || 'now'
	const storedMin = localStorage.getItem('timestampRangeMin') || ''
	const storedMax = localStorage.getItem('timestampRangeMax') || ''
	const storedNowMode = (localStorage.getItem('nowMode') as NowMode | null) || 'plain'

	function setVisibility(elements: Array<HTMLElement | null>, visible: boolean): void {
		elements.forEach(el => {
			if (el) el.dataset.visible = visible ? 'true' : 'false'
		})
	}

	function setNowMode(m: NowMode): void {
		if (nowPlain) nowPlain.dataset.active = m === 'plain' ? 'true' : 'false'
		if (nowProgress) nowProgress.dataset.active = m === 'progress' ? 'true' : 'false'
		if (nowCycles) nowCycles.dataset.active = m === 'cycles' ? 'true' : 'false'

		localStorage.setItem('nowMode', m)

		const currentMode = (localStorage.getItem('timestampMode') as TimestampMode | null) || 'now'
		const isNow = currentMode === 'now'
		const showTime = isNow && m === 'cycles'

		setVisibility([nowModeRow], isNow)
		setVisibility([timeDivider, timeHeader, timeList], showTime)

		void pushLiveStateFromCtx(ctx)
	}

	function setMode(m: TimestampMode): void {
		if (modeNow) modeNow.dataset.active = m === 'now' ? 'true' : 'false'
		if (modeRange) modeRange.dataset.active = m === 'range' ? 'true' : 'false'
		if (modePersist) modePersist.dataset.active = m === 'persist' ? 'true' : 'false'

		rangeRows.forEach(row => {
			row.dataset.visible = m === 'range' ? 'true' : 'false'
		})
		if (persistRow) {
			persistRow.dataset.visible = m === 'persist' ? 'true' : 'false'
		}

		const isNow = m === 'now'
		setVisibility([nowModeRow], isNow)

		const nowModeVal: NowMode = storedNowMode
		const showTime = isNow && nowModeVal === 'cycles'
		setVisibility([timeDivider, timeHeader, timeList], showTime)

		localStorage.setItem('timestampMode', m)
		void pushLiveStateFromCtx(ctx)
	}

	setNowMode(storedNowMode)
	setMode(storedMode)

	modeNow?.addEventListener('click', e => {
		e.preventDefault()
		setMode('now')
	})
	modeRange?.addEventListener('click', e => {
		e.preventDefault()
		setMode('range')
	})
	modePersist?.addEventListener('click', e => {
		e.preventDefault()
		setMode('persist')
	})

	nowPlain?.addEventListener('click', e => {
		e.preventDefault()
		setNowMode('plain')
	})
	nowProgress?.addEventListener('click', e => {
		e.preventDefault()
		setNowMode('progress')
	})
	nowCycles?.addEventListener('click', e => {
		e.preventDefault()
		setNowMode('cycles')
	})

	if (rangeMinInput) rangeMinInput.value = storedMin
	if (rangeMaxInput) rangeMaxInput.value = storedMax

	rangeMinInput?.addEventListener('input', () => {
		localStorage.setItem('timestampRangeMin', rangeMinInput.value)
		void pushLiveStateFromCtx(ctx)
	})

	rangeMaxInput?.addEventListener('input', () => {
		localStorage.setItem('timestampRangeMax', rangeMaxInput.value)
		void pushLiveStateFromCtx(ctx)
	})

	persistResetBtn?.addEventListener('click', e => {
		e.preventDefault()
		if (window.electronAPI?.resetPersistTimestamp) {
			window.electronAPI.resetPersistTimestamp()
		}
	})
}
