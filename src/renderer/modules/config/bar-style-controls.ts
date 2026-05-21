import { BarStyle } from '../../../types/types'

const STORAGE_KEY = 'barStyle'
const VALID_STYLES: BarStyle[] = [
	'unicode',
	'cmd',
	'block',
	'soft',
	'retro',
	'cyber',
]

function getStoredBarStyle(): BarStyle {
	const v = localStorage.getItem(STORAGE_KEY) as BarStyle | null
	return v && VALID_STYLES.includes(v) ? v : 'unicode'
}

function setActiveButtons(style: BarStyle): void {
	document.querySelectorAll<HTMLElement>('[data-bar-style]').forEach(btn => {
		btn.dataset.active = btn.dataset.barStyle === style ? 'true' : 'false'
	})
}

function isVisibleByFilters(): boolean {
	return localStorage.getItem('hardwareMonitorEnabled') === 'true'
}

export function refreshBarStyleVisibility(): void {
	const row = document.getElementById('bar-style-row') as HTMLElement | null
	if (!row) return
	row.dataset.visible = isVisibleByFilters() ? 'true' : 'false'
}

export async function applyBarStyle(style: BarStyle): Promise<void> {
	const v = VALID_STYLES.includes(style) ? style : 'unicode'
	localStorage.setItem(STORAGE_KEY, v)
	setActiveButtons(v)
	if (window.electronAPI?.setBarStyleConfig) {
		await window.electronAPI.setBarStyleConfig(v)
	}
}

export function initBarStyleControls(): void {
	const buttons =
		document.querySelectorAll<HTMLButtonElement>('[data-bar-style]')

	setActiveButtons(getStoredBarStyle())
	refreshBarStyleVisibility()

	buttons.forEach(btn => {
		btn.addEventListener('click', e => {
			e.preventDefault()
			const style = btn.dataset.barStyle as BarStyle | undefined
			if (!style) return
			void applyBarStyle(style)
		})
	})
}

export function getBarStyle(): BarStyle {
	return getStoredBarStyle()
}

export function setBarStyle(style: BarStyle): void {
	const v = VALID_STYLES.includes(style) ? style : 'unicode'
	localStorage.setItem(STORAGE_KEY, v)
	setActiveButtons(v)
}
