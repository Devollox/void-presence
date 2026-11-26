import i18n from 'i18next'
import en from '../../locales/en.json'
import ru from '../../locales/ru.json'
import tr from '../../locales/tr.json'
import zh from '../../locales/zh.json'
import ja from '../../locales/ja.json'
import de from '../../locales/de.json'
import fr from '../../locales/fr.json'
import ko from '../../locales/ko.json'
import pt from '../../locales/pt.json'
import es from '../../locales/es.json'

const resources = {
	en: { translation: en },
	ru: { translation: ru },
	tr: { translation: tr },
	zh: { translation: zh },
	ja: { translation: ja },
	de: { translation: de },
	fr: { translation: fr },
	ko: { translation: ko },
	pt: { translation: pt },
	es: { translation: es },
}

const supportedLanguages = ['en', 'ru', 'tr', 'zh', 'ja', 'de', 'fr', 'ko', 'pt', 'es']

function getInitialLanguage(): string {
	const savedLanguage = localStorage.getItem('language')

	if (savedLanguage && supportedLanguages.includes(savedLanguage)) {
		return savedLanguage
	}

	const languages = navigator.languages || [navigator.language || 'en']

	for (const language of languages) {
		const code = String(language).split('-')[0].toLowerCase()

		if (supportedLanguages.includes(code)) {
			return code
		}
	}

	return 'en'
}

const currentLanguage = getInitialLanguage()

i18n.init({
	resources,
	lng: currentLanguage,
	fallbackLng: 'en',
	debug: false,
	interpolation: {
		escapeValue: false,
	},
})

export default i18n
