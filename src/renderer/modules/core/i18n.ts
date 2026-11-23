import i18n from 'i18next'
import en from '../../locales/en.json'
import ru from '../../locales/ru.json'
import tr from '../../locales/tr.json'
import zh from '../../locales/zh.json'
import ja from '../../locales/ja.json'

const resources = {
	en: { translation: en },
	ru: { translation: ru },
	tr: { translation: tr },
	zh: { translation: zh },
	ja: { translation: ja },
}

const supportedLanguages = ['en', 'ru', 'tr', 'zh', 'ja']

function getInitialLanguage(): string {
	const systemLanguage = navigator.language.split('–')[0]
	const savedLanguage = localStorage.getItem('language')

	if (savedLanguage && supportedLanguages.includes(savedLanguage)) {
		return savedLanguage
	}

	if (supportedLanguages.includes(systemLanguage)) {
		return systemLanguage
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
