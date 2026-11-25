import i18next from 'i18next'
import { setMainLanguage } from '../../../main/translations'
import i18n from '../core/i18n'
import { updatePlaceholders } from './placeholders'

const SUPPORTED_LANGUAGES = ['en', 'ru', 'tr', 'zh', 'ja']

function isSupportedLanguage(language: string): language is 'en' | 'ru' | 'tr' | 'zh' | 'ja' {
	return SUPPORTED_LANGUAGES.includes(language)
}

export function applyLanguage(lang: string): void {
	document.body.classList.remove('lang-en', 'lang-ru', 'lang-tr', 'lang-zh', 'lang-ja')

	document.body.classList.add(`lang-${lang}`)

	document.querySelectorAll('[data-i18n]').forEach(el => {
		const key = el.getAttribute('data-i18n')

		if (key) {
			el.textContent = i18n.t(key)
		}
	})

	document.querySelectorAll<HTMLElement>('.timestamp-mode-btn[data-language]').forEach(btn => {
		const btnLang = btn.getAttribute('data-language')

		btn.setAttribute('data-active', btnLang === lang ? 'true' : 'false')
	})
}

export async function setLanguage(lang: string): Promise<void> {
	if (!isSupportedLanguage(lang)) {
		return
	}

	localStorage.setItem('language', lang)

	const api = (window as any).electronAPI

	if (api?.setLanguage) {
		await api.setLanguage(lang)
	}

	await i18n.changeLanguage(lang)

	applyLanguage(lang)
	updatePlaceholders()

	document.dispatchEvent(
		new CustomEvent('language-changed', {
			detail: { language: lang },
		})
	)
}

export function tNative(key: string, replacements: Record<string, string> = {}): string {
	const msg = i18next.t(key) as string

	let result = msg

	for (const [key, value] of Object.entries(replacements)) {
		result = result.replace(`{${key}}`, value)
	}

	return result
}

export async function initLanguage(): Promise<void> {
	const savedLanguage = localStorage.getItem('language')

	const initialLanguage = savedLanguage && isSupportedLanguage(savedLanguage) ? savedLanguage : 'en'

	applyLanguage(initialLanguage)

	document.querySelectorAll<HTMLElement>('.timestamp-mode-btn[data-language]').forEach(btn => {
		btn.addEventListener('click', () => {
			const lang = btn.getAttribute('data-language')

			if (lang) {
				setLanguage(lang)
				updatePlaceholders()
			}
		})
	})

	const settingsLangSelector = document.getElementById(
		'settings-language-selector'
	) as HTMLSelectElement | null

	if (settingsLangSelector) {
		settingsLangSelector.value = i18n.language

		settingsLangSelector.addEventListener('change', event => {
			const lang = (event.target as HTMLSelectElement).value

			setLanguage(lang)
			updatePlaceholders()
		})
	}

	if (isSupportedLanguage(initialLanguage)) {
		setMainLanguage(initialLanguage)
	}
}
