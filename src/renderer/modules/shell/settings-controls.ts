import { getTheme, setTheme } from './theme'
import { setLanguage } from './language'
import { AppTheme, Language } from '../../../types/types'

const LANGUAGES: Array<{ code: Language; label: string; nativeLabel: string }> = [
	{ code: 'en', label: 'English', nativeLabel: 'English' },
	{ code: 'ru', label: 'Russian', nativeLabel: 'Русский' },
	{ code: 'tr', label: 'Turkish', nativeLabel: 'Türkçe' },
	{ code: 'zh', label: 'Chinese', nativeLabel: '中文' },
	{ code: 'ja', label: 'Japanese', nativeLabel: '日本語' },
	{ code: 'de', label: 'German', nativeLabel: 'Deutsch' },
	{ code: 'fr', label: 'French', nativeLabel: 'Français' },
	{ code: 'ko', label: 'Korean', nativeLabel: '한국어' },
	{ code: 'pt', label: 'Portuguese', nativeLabel: 'Português' },
	{ code: 'es', label: 'Spanish', nativeLabel: 'Español' },
]

function getLangLabel(code: string): string {
	return LANGUAGES.find(l => l.code === code)?.nativeLabel ?? code
}

export function setupSettingsTheme(): void {
	const themeButtons = document.querySelectorAll<HTMLButtonElement>(
		'.settings-theme-btn[data-theme]'
	)
	if (!themeButtons.length) return

	const current = getTheme()

	themeButtons.forEach(btn => {
		btn.dataset.active = btn.dataset.theme === current ? 'true' : 'false'
		btn.setAttribute('aria-checked', btn.dataset.theme === current ? 'true' : 'false')
	})

	themeButtons.forEach(btn => {
		btn.addEventListener('click', () => {
			const theme = btn.dataset.theme as AppTheme | undefined
			if (theme !== 'light' && theme !== 'dark') return

			setTheme(theme)

			themeButtons.forEach(b => {
				b.dataset.active = b.dataset.theme === theme ? 'true' : 'false'
				b.setAttribute('aria-checked', b.dataset.theme === theme ? 'true' : 'false')
			})
		})
	})

	document.addEventListener('themeChanged', ((e: CustomEvent<{ theme: AppTheme }>) => {
		const theme = e.detail.theme
		themeButtons.forEach(btn => {
			btn.dataset.active = btn.dataset.theme === theme ? 'true' : 'false'
			btn.setAttribute('aria-checked', btn.dataset.theme === theme ? 'true' : 'false')
		})
	}) as EventListener)
}

export function setupSettingsLanguage(): void {
	const triggerBtn = document.getElementById('settings-language-btn')
	const valueEl = document.getElementById('settings-language-value')
	const popup = document.getElementById('settings-lang-popup')
	const dropdown = document.getElementById('settings-lang-dropdown')

	if (!triggerBtn || !popup) return

	const currentLang = (localStorage.getItem('language') ?? 'en') as Language

	if (valueEl) valueEl.textContent = getLangLabel(currentLang)

	function buildList(activeLang: string): void {
		if (!popup) return
		popup.innerHTML = ''

		LANGUAGES.forEach(lang => {
			const item = document.createElement('button')
			item.type = 'button'
			item.className = 'settings-lang-popup-item'
			item.dataset.lang = lang.code
			item.dataset.active = lang.code === activeLang ? 'true' : 'false'
			item.setAttribute('role', 'option')
			item.setAttribute('aria-selected', lang.code === activeLang ? 'true' : 'false')

			const native = document.createElement('span')
			native.textContent = lang.nativeLabel

			const check = document.createElement('span')
			check.className = 'settings-lang-popup-item-check'
			check.setAttribute('aria-hidden', 'true')
			check.innerHTML = `<svg width="12" height="12" viewBox="0 0 12 12" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M2 6l3 3 5-5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>`

			item.append(native, check)

			item.addEventListener('click', () => {
				void setLanguage(lang.code)
				if (valueEl) valueEl.textContent = getLangLabel(lang.code)
				buildList(lang.code)
				closeDropdown()
			})

			popup.appendChild(item)
		})
	}

	buildList(currentLang)

	function openDropdown(): void {
		popup!.dataset.open = 'true'
		triggerBtn!.setAttribute('aria-expanded', 'true')
	}

	function closeDropdown(): void {
		popup!.dataset.open = 'false'
		triggerBtn!.setAttribute('aria-expanded', 'false')
	}

	function toggleDropdown(): void {
		if (popup!.dataset.open === 'true') {
			closeDropdown()
		} else {
			openDropdown()
		}
	}

	triggerBtn.addEventListener('click', e => {
		e.stopPropagation()
		toggleDropdown()
	})

	document.addEventListener('click', e => {
		if (dropdown && !dropdown.contains(e.target as Node)) {
			closeDropdown()
		}
	})

	document.addEventListener('keydown', e => {
		if (e.key === 'Escape' && popup?.dataset.open === 'true') {
			closeDropdown()
			triggerBtn?.focus()
		}
	})

	document.addEventListener('language-changed', ((e: CustomEvent<{ language: Language }>) => {
		const lang = e.detail.language
		if (valueEl) valueEl.textContent = getLangLabel(lang)
		buildList(lang)
	}) as EventListener)
}
