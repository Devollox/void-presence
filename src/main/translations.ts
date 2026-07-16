import en from '../renderer/locales/en.json'
import ru from '../renderer/locales/ru.json'
import tr from '../renderer/locales/tr.json'

export type Language = 'ru' | 'en' | 'tr'

interface TranslationDict {
	[key: string]: string
}

export const mainTranslations: Record<Language, TranslationDict> = {
	ru: ru as unknown as TranslationDict,
	en: en as unknown as TranslationDict,
	tr: tr as unknown as TranslationDict,
}

let currentLang: Language = 'en'

export function setMainLanguage(lang: Language): void {
	currentLang = lang
}

export function getCurrentLanguage(): Language {
	return currentLang
}

export function t(key: string, replacements: Record<string, string> = {}): string {
	const msg = mainTranslations[currentLang][key] || mainTranslations.en[key] || key

	let result = msg
	for (const [replKey, value] of Object.entries(replacements)) {
		result = result.replace(new RegExp(`\\{${replKey}\\}`, 'g'), value)
	}
	return result
}
