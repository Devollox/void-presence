import { CustomStatusItem, FullState, StoredConfig } from 'src/types/types'
import { getConfigs, setConfigs } from './config-storage'
import { addStatusProfileFromItems } from './status-storage'

type AnyJson = unknown

function isStatusItemArray(data: AnyJson): data is CustomStatusItem[] {
	if (!Array.isArray(data)) return false
	return data.every(
		x =>
			x &&
			typeof x === 'object' &&
			'text' in x &&
			typeof (x as CustomStatusItem).text === 'string'
	)
}

function isConfigObject(data: AnyJson): data is FullState | StoredConfig {
	if (!data || typeof data !== 'object' || Array.isArray(data)) return false
	const obj = data as Record<string, unknown>
	return (
		'buttonPairs' in obj ||
		'cycles' in obj ||
		'imageCycles' in obj ||
		'party' in obj ||
		'timeCycles' in obj ||
		'statusCycles' in obj
	)
}

export type ImportKind = 'status' | 'config' | 'invalid'

export function applyImportedJson(
	parsed: AnyJson,
	baseName: string
): ImportKind {
	if (isStatusItemArray(parsed)) {
		addStatusProfileFromItems(
			baseName || `Imported status ${new Date().toISOString().slice(0, 19)}`,
			parsed
		)
		return 'status'
	}

	if (isConfigObject(parsed)) {
		const configs = getConfigs()
		const cfg: StoredConfig = {
			name:
				baseName || `Imported config ${new Date().toISOString().slice(0, 19)}`,
			createdAt: new Date().toISOString(),
			...(parsed as Partial<StoredConfig>),
		} as StoredConfig
		configs.push(cfg)
		setConfigs(configs)
		return 'config'
	}

	return 'invalid'
}
