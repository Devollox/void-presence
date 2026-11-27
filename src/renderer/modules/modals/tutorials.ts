const CLOUD_TUTORIAL_KEY = 'vp_hide_cloud_tutorial'

function hideOnboarding(card: HTMLElement, permanent: boolean): void {
	card.dataset.done = 'true'
	if (permanent) {
		window.localStorage.setItem(CLOUD_TUTORIAL_KEY, '1')
	}
}

function setupCloudTutorialCard(cardId: string, btnId: string): void {
	const card = document.getElementById(cardId)
	const btn = document.getElementById(btnId)
	if (!(card instanceof HTMLElement)) return

	const isHidden = window.localStorage.getItem(CLOUD_TUTORIAL_KEY) === '1'
	card.dataset.done = isHidden ? 'true' : 'false'

	btn?.addEventListener('click', () => {
		const ids = ['cloud-tutorial-presence-card', 'cloud-tutorial-status-card']
		ids.forEach(id => {
			const el = document.getElementById(id)
			if (el instanceof HTMLElement) hideOnboarding(el, true)
		})
	})
}

function setupGenericOnboarding(config: {
	cardId: string
	closeId: string
	dontShowId: string
	storageKey: string
}): void {
	const card = document.getElementById(config.cardId)
	const closeBtn = document.getElementById(config.closeId)
	const dontShowBtn = document.getElementById(config.dontShowId)
	if (!(card instanceof HTMLElement)) return

	const isHidden = window.localStorage.getItem(config.storageKey) === '1'
	card.dataset.done = isHidden ? 'true' : 'false'

	const hide = (permanent: boolean) => {
		card.dataset.done = 'true'
		if (permanent) {
			window.localStorage.setItem(config.storageKey, '1')
		}
	}

	closeBtn?.addEventListener('click', () => hide(true))
	dontShowBtn?.addEventListener('click', () => hide(true))
}

export function setupTutorials(): void {
	setupGenericOnboarding({
		cardId: 'tutorial-card',
		closeId: 'tutorial-inline-close',
		dontShowId: 'tutorial-inline-dont-show',
		storageKey: 'vp_hide_tutorial',
	})

	setupGenericOnboarding({
		cardId: 'status-tutorial-card',
		closeId: 'status-tutorial-close',
		dontShowId: 'status-tutorial-dont-show',
		storageKey: 'vp_hide_status_tutorial',
	})

	setupCloudTutorialCard('cloud-tutorial-presence-card', 'cloud-tutorial-presence-close')
	setupCloudTutorialCard('cloud-tutorial-status-card', 'cloud-tutorial-status-close')
}
