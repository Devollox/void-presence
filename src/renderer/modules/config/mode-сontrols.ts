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

	const rangeSection = document.querySelector<HTMLElement>('.timestamp-range-section')
	const persistSection = document.querySelector<HTMLElement>('.timestamp-persist-section')
	const nowModeSection = document.querySelector<HTMLElement>('.now-mode-section')
	const timeCyclesSection = document.querySelector<HTMLElement>('.time-cycles-section')

	const rangeRows = document.querySelectorAll<HTMLElement>('.timestamp-range-row')
	const persistRow = document.querySelector<HTMLElement>('.timestamp-persist-row')

	const timeList = document.getElementById('time-list') as HTMLElement | null
	const nowPlain = document.getElementById('now-mode-plain') as HTMLButtonElement | null
	const nowProgress = document.getElementById('now-mode-progress') as HTMLButtonElement | null
	const nowCycles = document.getElementById('now-mode-cycles') as HTMLButtonElement | null

	const storedMode = (localStorage.getItem('timestampMode') as TimestampMode | null) || 'now'
	const storedMin = localStorage.getItem('timestampRangeMin') || ''
	const storedMax = localStorage.getItem('timestampRangeMax') || ''
	const storedNowMode = (localStorage.getItem('nowMode') as NowMode | null) || 'plain'

	function setVisible(el: HTMLElement | null, visible: boolean) {
		if (el) el.dataset.visible = visible ? 'true' : 'false'
	}

	function setAriaChecked(btn: HTMLButtonElement | null, checked: boolean) {
		btn?.setAttribute('aria-checked', String(checked))
	}

	function setNowMode(m: NowMode): void {
		if (nowPlain) {
			nowPlain.dataset.active = m === 'plain' ? 'true' : 'false'
			setAriaChecked(nowPlain, m === 'plain')
		}
		if (nowProgress) {
			nowProgress.dataset.active = m === 'progress' ? 'true' : 'false'
			setAriaChecked(nowProgress, m === 'progress')
		}
		if (nowCycles) {
			nowCycles.dataset.active = m === 'cycles' ? 'true' : 'false'
			setAriaChecked(nowCycles, m === 'cycles')
		}

		localStorage.setItem('nowMode', m)

		const currentMode = (localStorage.getItem('timestampMode') as TimestampMode | null) || 'now'
		const isNow = currentMode === 'now'
		const showCycles = isNow && m === 'cycles'

		setVisible(nowModeSection, isNow)
		setVisible(timeCyclesSection, showCycles)
		setVisible(timeList, showCycles)

		void pushLiveStateFromCtx(ctx)
	}

	function setMode(m: TimestampMode): void {
		if (modeNow) {
			modeNow.dataset.active = m === 'now' ? 'true' : 'false'
			setAriaChecked(modeNow, m === 'now')
		}
		if (modeRange) {
			modeRange.dataset.active = m === 'range' ? 'true' : 'false'
			setAriaChecked(modeRange, m === 'range')
		}
		if (modePersist) {
			modePersist.dataset.active = m === 'persist' ? 'true' : 'false'
			setAriaChecked(modePersist, m === 'persist')
		}

		setVisible(rangeSection, m === 'range')
		setVisible(persistSection, m === 'persist')
		rangeRows.forEach(row => setVisible(row, m === 'range'))
		if (persistRow) setVisible(persistRow, m === 'persist')

		const isNow = m === 'now'
		setVisible(nowModeSection, isNow)

		const nowModeVal = (localStorage.getItem('nowMode') as NowMode | null) || 'plain'
		const showCycles = isNow && nowModeVal === 'cycles'
		setVisible(timeCyclesSection, showCycles)
		setVisible(timeList, showCycles)

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
