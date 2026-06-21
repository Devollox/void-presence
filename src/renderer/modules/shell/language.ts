import i18next from 'i18next'
import { setMainLanguage } from '../../../main/translations'
import i18n from '../core/i18n'
import { updatePlaceholders } from './placeholders'

export function setLanguage(lang: string) {
	document.body.classList.remove('lang-en', 'lang-ru', 'lang-tr')
	document.body.classList.add(`lang-${lang}`)

	localStorage.setItem('language', lang)

	i18n.changeLanguage(lang)

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

	if (lang === 'ru' || lang === 'en' || lang === 'tr') {
		;(window as any).electronAPI.setLanguage(lang)
	}
}

export function tNative(key: string, replacements: Record<string, string> = {}): string {
	const msg = i18next.t(key) as string
	let result = msg
	for (const [key, value] of Object.entries(replacements)) {
		result = result.replace(`{${key}}`, value)
	}
	return result
}

export async function initLanguage() {
	const initialLang = (await (window as any).electronAPI?.getLanguage?.()) || 'ru'
	setLanguage(initialLang)

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

		settingsLangSelector.addEventListener('change', e => {
			const lang = (e.target as HTMLSelectElement).value
			setLanguage(lang)
			updatePlaceholders()
		})
	}

	const lang: 'ru' | 'en' | 'tr' = 'ru'
	setMainLanguage(lang)
}
