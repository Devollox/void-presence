import i18n from 'i18next'

import en from '../../locales/en.json'
import ru from '../../locales/ru.json'
import tr from '../../locales/tr.json'

const resources = {
	en: { translation: en },
	ru: { translation: ru },
	tr: { translation: tr },
}

const userLanguage = navigator.language.split('-')[0]
const supportedLanguages = ['en', 'ru', 'tr']
const defaultLang = supportedLanguages.includes(userLanguage)
	? userLanguage
	: 'en'

i18n.init({
	resources,
	lng: localStorage.getItem('language') || defaultLang,
	fallbackLng: 'en',
	debug: false,
	interpolation: {
		escapeValue: false,
	},
})

export default i18n
