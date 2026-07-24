import { t } from 'i18next'

const elementPlaceholders = {
	'config-search-input': 'config.searchConfigsPlaceholder',
	'status-search-input': 'config.searchStatusesPlaceholder',
	'config-name-input': 'config.configNamePlaceholder',
	'status-name-input': 'config.statusProfileNamePlaceholder',
	'config-author-input': 'config.authorIdPlaceholder',
	'config-name-input-current': 'config.configNamePlaceholder',
	'discord-token-input': 'status.discordTokenPlaceholder',
	'status-update-interval-input': 'status.statusUpdatePlaceholder',
	'client-id-input': 'activity.clientIdPlaceholder',
	'update-interval-input': 'activity.updateActivityPlaceholder',
} as const satisfies Record<string, string>

export function updatePlaceholders(): void {
	Object.entries(elementPlaceholders).forEach(([elementId, placeholderKey]) => {
		const target = document.getElementById(elementId) as HTMLInputElement | null
		if (target) {
			target.placeholder = t(placeholderKey)
		}
	})
}
