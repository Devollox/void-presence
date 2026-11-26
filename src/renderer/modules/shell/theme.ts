import { AppTheme } from 'src/types/types'

const THEME_STORAGE_KEY = 'vp_theme'

function getStoredTheme(): AppTheme | null {
	const value = localStorage.getItem(THEME_STORAGE_KEY)

	if (value === 'light' || value === 'dark') {
		return value
	}

	return null
}

function getSystemTheme(): AppTheme {
	return window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark'
}

export function getTheme(): AppTheme {
	return getStoredTheme() ?? getSystemTheme()
}

export function applyTheme(theme: AppTheme): void {
	const root = document.documentElement

	root.classList.toggle('dark', theme === 'dark')
	root.classList.toggle('light', theme === 'light')
	root.dataset.theme = theme

	document.querySelectorAll<HTMLButtonElement>('.welcome-theme').forEach(button => {
		button.setAttribute('aria-checked', String(button.dataset.theme === theme))
	})
}

export function setTheme(theme: AppTheme): void {
	localStorage.setItem(THEME_STORAGE_KEY, theme)
	applyTheme(theme)
	window.electronAPI?.setTheme?.(theme)
	document.dispatchEvent(new CustomEvent('themeChanged', { detail: { theme } }))
}

export function initTheme(): void {
	applyTheme(getTheme())

	window.matchMedia('(prefers-color-scheme: light)').addEventListener('change', () => {
		if (!getStoredTheme()) {
			applyTheme(getTheme())
		}
	})
}
