function getBaseUrl() {
	const raw = process.env.FIREBASE_DB_URL || ''
	return raw.endsWith('/') ? raw.slice(0, -1) : raw
}

export type UploadConfigPayload = {
	title: string
	authorId: string
	authorName: string
	description: string
	configData: unknown
}

type UserRecord = {
	name?: string
	createdAt?: number
}

export async function fetchAuthor(
	authorId: string,
): Promise<UserRecord | null> {
	const base = getBaseUrl()
	if (!base) return null
	const url = `${base}/users/${authorId}.json`
	const res = await fetch(url)
	if (!res.ok) return null
	const data = (await res.json()) as UserRecord | null
	if (!data) return null
	return data
}

export async function uploadConfigToCloud(
	config: UploadConfigPayload,
): Promise<string> {
	const base = getBaseUrl()
	if (!base) throw new Error('FIREBASE_DB_URL is not set')

	const url = `${base}/configs.json`

	const response = await fetch(url, {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify({
			title: config.title,
			author: config.authorName,
			authorId: `${config.authorId}`,
			description: config.description,
			configData: config.configData,
			downloads: 0,
			uploadedAt: Date.now(),
		}),
	})

	if (!response.ok) throw new Error(`HTTP ${response.status}`)
	const result: Record<string, unknown> = await response.json()
	const keys = Object.keys(result)
	return keys[0] || 'unknown'
}
