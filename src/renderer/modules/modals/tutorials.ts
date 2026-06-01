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

	if (!card) return

	function hide(permanent: boolean) {
		card.setAttribute('data-visible', 'false')

		const onTransitionEnd = (e: TransitionEvent) => {
			if (e.propertyName !== 'opacity') return
			;(card as HTMLElement).style.display = 'none'
			card.removeEventListener('transitionend', onTransitionEnd)

			if (permanent) {
				window.localStorage.setItem(config.storageKey, '1')
			}
		}

		card.addEventListener('transitionend', onTransitionEnd)
	}

	closeBtn?.addEventListener('click', () => hide(false))
	dontShowBtn?.addEventListener('click', () => hide(true))

	if (window.localStorage.getItem(config.storageKey) === '1') {
		;(card as HTMLElement).style.display = 'none'
	} else {
		;(card as HTMLElement).style.display = ''
		card.setAttribute('data-visible', 'true')
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

export function setupStatusTutorialButtons() {
	const openDevBtn = document.getElementById('tutorial-inline-open-dev')
	const authorBtn = document.getElementById('get-author-id')
	const videoBtn = document.getElementById('get-video-id')
	const videoBtnError = document.getElementById('get-video-error-id')

	openDevBtn?.addEventListener('click', () => {
		window.electronAPI.openDiscordDeveloperPortal()
	})

	authorBtn?.addEventListener('click', () => {
		window.electronAPI.openDiscordDeveloperAuthorId()
	})

	videoBtn?.addEventListener('click', () => {
		window.electronAPI.openDiscordGetTokenVideo()
	})

	videoBtnError?.addEventListener('click', () => {
		window.electronAPI.openDiscordGetTokenVideoError()
	})
}
