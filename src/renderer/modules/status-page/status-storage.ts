import { CustomStatusItem, StoredStatusProfile } from '../../../types/types'

const STATUS_PROFILES_KEY = 'vpStatusProfiles'

export function getStatusProfiles(): StoredStatusProfile[] {
	try {
		const raw = localStorage.getItem(STATUS_PROFILES_KEY)
		return raw ? (JSON.parse(raw) as StoredStatusProfile[]) : []
	} catch {
		return []
	}
}

export function setStatusProfiles(items: StoredStatusProfile[]): void {
	localStorage.setItem(STATUS_PROFILES_KEY, JSON.stringify(items))
}

export function addStatusProfileFromItems(name: string, items: CustomStatusItem[]): void {
	const profiles = getStatusProfiles()
	const safeItems: CustomStatusItem[] = (items || []).map(x => ({
		text: String(x?.text || '').trim(),
		emoji: typeof x?.emoji === 'string' && x.emoji.trim() !== '' ? x.emoji.trim() : null,
	}))
	profiles.push({
		name,
		items: safeItems,
		createdAt: new Date().toISOString(),
	})
	setStatusProfiles(profiles)
}

export function deepCloneStatusItems(items: CustomStatusItem[]): CustomStatusItem[] {
	return JSON.parse(JSON.stringify(items)) as CustomStatusItem[]
}

export function addStatusProfileFromState(name: string, items: CustomStatusItem[]): void {
	const profiles = getStatusProfiles()
	const safeItems: CustomStatusItem[] = (items || []).map(x => ({
		text: String(x?.text || '').trim(),
		emoji: typeof x?.emoji === 'string' && x.emoji.trim() !== '' ? x.emoji.trim() : null,
	}))
	profiles.push({
		name,
		items: safeItems,
		createdAt: new Date().toISOString(),
	})
	setStatusProfiles(profiles)
}
