import { t } from 'i18next'

export function updatePlaceholders(): void {
	const configSearchInput = document.getElementById(
		'config-search-input'
	) as HTMLInputElement | null
	if (configSearchInput) {
		configSearchInput.placeholder = t('config.searchConfigsPlaceholder')
	}

	const statusSearchInput = document.getElementById(
		'status-search-input'
	) as HTMLInputElement | null
	if (statusSearchInput) {
		statusSearchInput.placeholder = t('config.searchStatusesPlaceholder')
	}

	const configNameInput = document.getElementById('config-name-input') as HTMLInputElement | null
	if (configNameInput) {
		configNameInput.placeholder = t('config.configNamePlaceholder')
	}

	const statusNameInput = document.getElementById('status-name-input') as HTMLInputElement | null
	if (statusNameInput) {
		statusNameInput.placeholder = t('config.statusProfileNamePlaceholder')
	}

	const configAuthorInput = document.getElementById(
		'config-author-input'
	) as HTMLInputElement | null
	if (configAuthorInput) {
		configAuthorInput.placeholder = t('config.authorIdPlaceholder')
	}

	const configNameCurrentInput = document.getElementById(
		'config-name-input-current'
	) as HTMLInputElement | null
	if (configNameCurrentInput) {
		configNameCurrentInput.placeholder = t('config.configNamePlaceholder')
	}

	const discordTokenInput = document.getElementById(
		'discord-token-input'
	) as HTMLInputElement | null
	if (discordTokenInput) {
		discordTokenInput.placeholder = t('status.discordTokenPlaceholder')
	}

	const statusUpdateIntervalInput = document.getElementById(
		'status-update-interval-input'
	) as HTMLInputElement | null
	if (statusUpdateIntervalInput) {
		statusUpdateIntervalInput.placeholder = t('status.statusUpdatePlaceholder')
	}

	const clientIdInput = document.getElementById('client-id-input') as HTMLInputElement | null
	if (clientIdInput) {
		clientIdInput.placeholder = t('activity.clientIdPlaceholder')
	}

	const updateIntervalInput = document.getElementById(
		'update-interval-input'
	) as HTMLInputElement | null
	if (updateIntervalInput) {
		updateIntervalInput.placeholder = t('activity.updateActivityPlaceholder')
	}
}
