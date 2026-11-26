import en from '../renderer/locales/en.json'
import ru from '../renderer/locales/ru.json'
import tr from '../renderer/locales/tr.json'
import zh from '../renderer/locales/zh.json'
import ja from '../renderer/locales/ja.json'
import de from '../renderer/locales/de.json'
import fr from '../renderer/locales/fr.json'
import ko from '../renderer/locales/ko.json'
import pt from '../renderer/locales/pt.json'
import es from '../renderer/locales/es.json'
import { Language } from 'src/types/types'

interface TranslationDict {
	[key: string]: unknown
}

export const mainTranslations: Record<Language, TranslationDict> = {
	en: en as unknown as TranslationDict,
	ru: ru as unknown as TranslationDict,
	tr: tr as unknown as TranslationDict,
	zh: zh as unknown as TranslationDict,
	ja: ja as unknown as TranslationDict,
	de: de as unknown as TranslationDict,
	fr: fr as unknown as TranslationDict,
	ko: ko as unknown as TranslationDict,
	pt: pt as unknown as TranslationDict,
	es: es as unknown as TranslationDict,
}

let currentLang: Language = 'en'

export function setMainLanguage(lang: Language): void {
	currentLang = lang
}

export function getCurrentLanguage(): Language {
	return currentLang
}

function getTranslation(language: Language, key: string): string | undefined {
	const dictionary = mainTranslations[language]

	if (!dictionary) {
		return undefined
	}

	const parts = key.split('.')

	let current: unknown = dictionary

	for (const part of parts) {
		if (
			current === null ||
			typeof current !== 'object' ||
			!(part in (current as Record<string, unknown>))
		) {
			return undefined
		}

		current = (current as Record<string, unknown>)[part]
	}

	return typeof current === 'string' ? current : undefined
}

export function t(key: string, replacements: Record<string, string> = {}): string {
	const value = getTranslation(currentLang, key) ?? getTranslation('en', key) ?? key

	let result = value

	for (const [replKey, replacement] of Object.entries(replacements)) {
		result = result.replace(new RegExp(`\\{${replKey}\\}`, 'g'), replacement)
	}

	return result
}
