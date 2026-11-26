type TutorialConfig = {
	cardId: string
	closeId: string
	dontShowId: string
	storageKey: string
}

function setupGenericTutorial(config: TutorialConfig) {
	const card = document.getElementById(config.cardId)
	const closeBtn = document.getElementById(config.closeId)
	const dontShowBtn = document.getElementById(config.dontShowId)

	if (!(card instanceof HTMLElement)) return

	const isOnboarding = card.classList.contains('presence-onboarding')
	const isHidden = window.localStorage.getItem(config.storageKey) === '1'

	const hide = (permanent: boolean) => {
		if (isOnboarding) {
			card.dataset.done = 'true'
		} else {
			card.hidden = true
		}

		if (permanent) {
			window.localStorage.setItem(config.storageKey, '1')
		}
	}

	closeBtn?.addEventListener('click', () => hide(true))
	dontShowBtn?.addEventListener('click', () => hide(true))

	if (isOnboarding) {
		card.dataset.done = isHidden ? 'true' : 'false'
	} else {
		card.hidden = isHidden
	}
}

export function setupTutorials() {
	setupGenericTutorial({
		cardId: 'tutorial-card',
		closeId: 'tutorial-inline-close',
		dontShowId: 'tutorial-inline-dont-show',
		storageKey: 'vp_hide_tutorial',
	})

	setupGenericTutorial({
		cardId: 'cloud-tutorial-card',
		closeId: 'cloud-tutorial-close',
		dontShowId: 'cloud-tutorial-dont-show',
		storageKey: 'vp_hide_cloud_tutorial',
	})

	setupGenericTutorial({
		cardId: 'status-tutorial-card',
		closeId: 'status-tutorial-close',
		dontShowId: 'status-tutorial-dont-show',
		storageKey: 'vp_hide_status_tutorial',
	})
}
