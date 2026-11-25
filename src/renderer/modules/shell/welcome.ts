import { WelcomeLanguageOption, AppTheme, Language } from 'src/types/types'
import i18n from '../core/i18n'
import { setLanguage } from './language'

const WELCOME_STORAGE_KEY = 'vp_onboarding_done'
const LANGUAGE_STORAGE_KEY = 'language'

const SUPPORTED_LANGUAGES: WelcomeLanguageOption[] = [
	{ code: 'en', label: 'English' },
	{ code: 'ru', label: 'Русский' },
	{ code: 'tr', label: 'Türkçe' },
	{ code: 'zh', label: '中文' },
	{ code: 'ja', label: '日本語' },
]

function detectLanguage(): Language {
	const savedLanguage = localStorage.getItem(LANGUAGE_STORAGE_KEY)

	const saved = SUPPORTED_LANGUAGES.find(option => option.code === savedLanguage)

	if (saved) {
		return saved.code
	}

	const languages = navigator.languages || [navigator.language || 'en']

	for (const language of languages) {
		const code = String(language).split('-')[0].toLowerCase()

		const match = SUPPORTED_LANGUAGES.find(option => option.code === code)

		if (match) {
			return match.code
		}
	}

	return 'en'
}

function applyWelcomeTheme(theme: AppTheme): void {
	document.documentElement.classList.toggle('dark', theme === 'dark')
	document.documentElement.classList.toggle('light', theme === 'light')
	document.documentElement.dataset.theme = theme

	const themeCards = document.querySelectorAll<HTMLButtonElement>('.welcome-theme')

	themeCards.forEach(card => {
		card.setAttribute('aria-checked', String(card.dataset.theme === theme))
	})

	localStorage.setItem('vp_theme', theme)
}

function applyWelcomeText(): void {
	const title = document.getElementById('welcome-title')
	const subtitle = document.getElementById('welcome-subtitle')
	const themeLabel = document.getElementById('welcome-theme-label')
	const languageLabel = document.getElementById('welcome-language-label')
	const themeLight = document.getElementById('welcome-theme-light')
	const themeDark = document.getElementById('welcome-theme-dark')
	const continueLabel = document.getElementById('welcome-continue-label')

	if (title) title.textContent = i18n.t('welcome.title')
	if (subtitle) subtitle.textContent = i18n.t('welcome.subtitle')
	if (themeLabel) themeLabel.textContent = i18n.t('welcome.themeLabel')
	if (languageLabel) {
		languageLabel.textContent = i18n.t('welcome.languageLabel')
	}
	if (themeLight) themeLight.textContent = i18n.t('welcome.themeLight')
	if (themeDark) themeDark.textContent = i18n.t('welcome.themeDark')
	if (continueLabel) {
		continueLabel.textContent = i18n.t('welcome.continueBtn')
	}
}

function createLanguageItem(
	option: WelcomeLanguageOption,
	selectedLanguage: Language
): HTMLDivElement {
	const item = document.createElement('div')

	item.className = 'welcome-select-item'
	item.setAttribute('role', 'option')
	item.dataset.lang = option.code
	item.setAttribute('aria-selected', String(option.code === selectedLanguage))
	item.tabIndex = option.code === selectedLanguage ? 0 : -1

	const text = document.createElement('span')
	text.className = 'welcome-select-item-text'
	text.textContent = option.label

	const check = document.createElement('span')
	check.className = 'welcome-select-check'
	check.setAttribute('aria-hidden', 'true')

	check.innerHTML = `
    <svg
      width="16"
      height="16"
      viewBox="0 0 16 16"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M4.2996 7.23968C4.01775 6.93614 3.5432 6.91857 3.23966 7.20042C2.93613 7.48227 2.91856 7.95682 3.20041 8.26035L6.45041 11.7603C6.7612 12.095 7.29647 12.0766 7.58346 11.7212L12.8335 5.22127C13.0937 4.89904 13.0435 4.42683 12.7213 4.16657C12.399 3.9063 11.9268 3.95654 11.6665 4.27877L6.96051 10.1053L4.2996 7.23968Z"
        fill="currentColor"
      />
    </svg>
  `

	item.append(text, check)

	return item
}

export function setupWelcomeScreen(): void {
	const overlay = document.getElementById('welcome')

	if (!overlay) return

	const hasSeenWelcome = localStorage.getItem(WELCOME_STORAGE_KEY)

	if (hasSeenWelcome) {
		overlay.dataset.done = 'true'
		return
	}

	const language = detectLanguage()

	i18n.changeLanguage(language)
	localStorage.setItem(LANGUAGE_STORAGE_KEY, language)

	applyWelcomeText()

	const savedTheme = localStorage.getItem('vp_theme')

	const systemTheme = window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark'

	applyWelcomeTheme(savedTheme === 'light' || savedTheme === 'dark' ? savedTheme : systemTheme)

	const themeCards = document.querySelectorAll<HTMLButtonElement>('.welcome-theme')

	themeCards.forEach(card => {
		card.addEventListener('click', () => {
			const theme = card.dataset.theme

			if (theme === 'light' || theme === 'dark') {
				applyWelcomeTheme(theme)
			}
		})
	})

	const selectRoot = document.getElementById('welcome-language-select')
	const selectTrigger = document.getElementById('welcome-language-trigger')
	const selectPopup = selectRoot?.querySelector<HTMLDivElement>('.welcome-select-popup')
	const selectValue = document.getElementById('welcome-language-value')
	const selectList = document.getElementById('welcome-language-listbox')

	if (!selectRoot || !selectTrigger || !selectPopup || !selectValue || !selectList) {
		return
	}

	const selectedOption =
		SUPPORTED_LANGUAGES.find(option => option.code === language) ?? SUPPORTED_LANGUAGES[0]

	selectValue.textContent = selectedOption.label

	const languageItems = SUPPORTED_LANGUAGES.map(option => createLanguageItem(option, language))

	selectList.append(...languageItems)

	const toggleSelect = (forceOpen?: boolean): void => {
		const isOpen =
			forceOpen !== undefined ? forceOpen : selectTrigger.getAttribute('aria-expanded') !== 'true'

		selectTrigger.setAttribute('aria-expanded', String(isOpen))
		selectPopup.dataset.open = String(isOpen)

		if (isOpen) {
			const activeItem =
				languageItems.find(item => item.getAttribute('aria-selected') === 'true') ??
				languageItems[0]

			activeItem?.focus()
		}
	}

	const chooseLanguage = (nextLanguage: Language): void => {
		const selected = SUPPORTED_LANGUAGES.find(option => option.code === nextLanguage)

		if (!selected) return

		selectValue.textContent = selected.label

		languageItems.forEach(item => {
			const isSelected = item.dataset.lang === nextLanguage

			item.setAttribute('aria-selected', String(isSelected))
			item.tabIndex = isSelected ? 0 : -1
		})

		void setLanguage(nextLanguage)
	}

	selectTrigger.addEventListener('click', event => {
		event.stopPropagation()

		toggleSelect()
	})

	languageItems.forEach((item, index) => {
		item.addEventListener('click', () => {
			const language = item.dataset.lang

			if (
				language === 'en' ||
				language === 'ru' ||
				language === 'tr' ||
				language === 'zh' ||
				language === 'ja'
			) {
				chooseLanguage(language)
			}

			toggleSelect(false)
			selectTrigger.focus()
		})

		item.addEventListener('keydown', event => {
			if (event.key === 'ArrowDown') {
				event.preventDefault()

				languageItems[(index + 1) % languageItems.length].focus()
			} else if (event.key === 'ArrowUp') {
				event.preventDefault()

				languageItems[(index - 1 + languageItems.length) % languageItems.length].focus()
			} else if (event.key === 'Enter' || event.key === ' ') {
				event.preventDefault()

				const language = item.dataset.lang

				if (
					language === 'en' ||
					language === 'ru' ||
					language === 'tr' ||
					language === 'zh' ||
					language === 'ja'
				) {
					chooseLanguage(language)
				}

				toggleSelect(false)
				selectTrigger.focus()
			} else if (event.key === 'Escape') {
				event.preventDefault()

				toggleSelect(false)
				selectTrigger.focus()
			}
		})
	})

	document.addEventListener('click', event => {
		if (!selectRoot.contains(event.target as Node)) {
			toggleSelect(false)
		}
	})

	const continueButton = document.getElementById('welcome-continue')

	continueButton?.addEventListener('click', () => {
		localStorage.setItem(WELCOME_STORAGE_KEY, 'true')

		overlay.dataset.done = 'true'
	})

	const autoLaunchToggle = document.getElementById('welcome-auto-launch-toggle')

	const autoHideToggle = document.getElementById('welcome-auto-hide-toggle')

	const setupWelcomeToggle = (
		element: HTMLElement | null,
		onChange: (enabled: boolean) => void
	): void => {
		if (!element) return

		const updateState = (enabled: boolean): void => {
			element.dataset.on = String(enabled)
			element.setAttribute('aria-checked', String(enabled))
		}

		const toggle = (): void => {
			const enabled = element.dataset.on !== 'true'

			updateState(enabled)
			onChange(enabled)
		}

		element.addEventListener('click', toggle)

		element.addEventListener('keydown', event => {
			if (event.key === 'Enter' || event.key === ' ') {
				event.preventDefault()
				toggle()
			}
		})

		updateState(false)
	}

	let welcomeAutoLaunch = false
	let welcomeAutoHide = false

	setupWelcomeToggle(autoLaunchToggle, enabled => {
		welcomeAutoLaunch = enabled
	})

	setupWelcomeToggle(autoHideToggle, enabled => {
		welcomeAutoHide = enabled
	})

	let stageTimer: ReturnType<typeof setTimeout> | null = null
	let focusDelayTimer: ReturnType<typeof setTimeout> | null = null
	let introStarted = false

	const startIntroSequence = (): void => {
		if (introStarted) return

		introStarted = true

		overlay.dataset.done = 'false'
		overlay.dataset.stage = 'logo'
		overlay.dataset.focused = 'true'

		if (stageTimer) {
			clearTimeout(stageTimer)
		}

		stageTimer = setTimeout(() => {
			overlay.dataset.stage = 'setup'
		}, 1450)
	}

	const setWindowFocus = (isFocused: boolean): void => {
		overlay.dataset.focused = String(isFocused)

		if (focusDelayTimer) {
			clearTimeout(focusDelayTimer)
			focusDelayTimer = null
		}

		if (isFocused) {
			focusDelayTimer = setTimeout(() => {
				requestAnimationFrame(() => {
					startIntroSequence()
				})
			}, 250)
		}
	}

	window.addEventListener('focus', () => {
		setWindowFocus(true)
	})

	window.addEventListener('blur', () => {
		setWindowFocus(false)
	})

	if (document.readyState === 'complete') {
		if (document.hasFocus()) {
			setWindowFocus(true)
		} else {
			setWindowFocus(false)
		}
	} else {
		window.addEventListener('load', () => {
			if (document.hasFocus()) {
				setWindowFocus(true)
			} else {
				setWindowFocus(false)
			}
		})
	}
}
