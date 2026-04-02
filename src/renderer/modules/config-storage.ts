import { FullState, StoredConfig } from '../../types/types'

export type StoredRecentApp = {
	id: string
	name: string
	lastUsedAt: string
}

const CONFIGS_KEY = 'vpConfigs'
const RECENT_APPS_KEY = 'vpRecentApps'

export function getConfigs(): StoredConfig[] {
	try {
		const raw = localStorage.getItem(CONFIGS_KEY)
		return raw ? (JSON.parse(raw) as StoredConfig[]) : []
	} catch {
		return []
	}
}

export function setConfigs(configs: StoredConfig[]): void {
	localStorage.setItem(CONFIGS_KEY, JSON.stringify(configs))
}

export function getRecentApps(): StoredRecentApp[] {
	try {
		const raw = localStorage.getItem(RECENT_APPS_KEY)
		return raw ? (JSON.parse(raw) as StoredRecentApp[]) : []
	} catch {
		return []
	}
}

export function setRecentApps(items: StoredRecentApp[]): void {
	localStorage.setItem(RECENT_APPS_KEY, JSON.stringify(items))
}

export function upsertRecentApp(id: string, name: string): void {
	const cleanId = id.trim()
	if (!cleanId) return

	const cleanName = name.trim() || 'Unnamed app'
	const items = getRecentApps()
	const exists = items.some(x => x.id === cleanId)
	if (exists) {
		setRecentApps(items)
		return
	}

	const now = new Date().toISOString()
	items.push({ id: cleanId, name: cleanName, lastUsedAt: now })
	const sorted = items
		.slice()
		.sort(
			(a, b) =>
				new Date(b.lastUsedAt).getTime() - new Date(a.lastUsedAt).getTime(),
		)

	setRecentApps(sorted.slice(0, 10))
}

export function updateRecentName(id: string, name: string): void {
	const items = getRecentApps()
	const idx = items.findIndex(x => x.id === id)
	if (idx === -1) return
	items[idx] = { ...items[idx], name: name.trim() || 'Unnamed app' }
	setRecentApps(items)
}

export function removeRecentApp(id: string): void {
	const items = getRecentApps().filter(x => x.id !== id)
	setRecentApps(items)
}

export function deepCloneState(state: FullState): FullState {
	return JSON.parse(JSON.stringify(state)) as FullState
}
