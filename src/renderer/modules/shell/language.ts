import i18next from 'i18next'
import i18n from '../core/i18n'

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

	document
		.querySelectorAll<HTMLElement>('.timestamp-mode-btn[data-language]')
		.forEach(btn => {
			const btnLang = btn.getAttribute('data-language')
			btn.setAttribute('data-active', btnLang === lang ? 'true' : 'false')
		})

	if (lang === 'ru' || lang === 'en' || lang === 'tr') {
		;(window as any).electronAPI.setLanguage(lang)
	}
}

export function tNative(
	key: string,
	replacements: Record<string, string> = {},
): string {
	const msg = i18next.t(key) as string
	let result = msg
	for (const [key, value] of Object.entries(replacements)) {
		result = result.replace(`{${key}}`, value)
	}
	return result
}
