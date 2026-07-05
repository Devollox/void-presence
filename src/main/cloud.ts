export type UploadConfigPayload = {
	title: string
	authorId: string
	authorName: string
	description: string
	configData: any
	authorAvatar?: string | null
}

type ResolvedAuthor = {
	name: string
	avatar: string | null
}

async function resolveAuthor(
	authorId: string,
	authorName: string,
	authorAvatar?: string | null
): Promise<ResolvedAuthor> {
	const trimmedName = authorName.trim()
	const trimmedAvatar = (authorAvatar ?? '').trim()

	const hasName = trimmedName.length > 0
	const hasAvatar = trimmedAvatar.length > 0

	if (hasName || hasAvatar) {
		return {
			name: hasName ? trimmedName : authorId,
			avatar: hasAvatar ? trimmedAvatar : null,
		}
	}

	try {
		const res = await fetch(
			`https://api.voidpresence.site/v1/authors/${encodeURIComponent(authorId)}/configs`
		)

		if (!res.ok) {
			return { name: authorId, avatar: null }
		}

		const data = (await res.json()) as any
		const user = data?.user
		const name =
			typeof user?.name === 'string' && user.name.trim().length > 0 ? user.name.trim() : authorId
		const avatar =
			typeof user?.avatar === 'string' && user.avatar.trim().length > 0 ? user.avatar.trim() : null

		return { name, avatar }
	} catch {
		return { name: authorId, avatar: null }
	}
}

export async function uploadConfigToCloud(config: UploadConfigPayload): Promise<string> {
	const resolved = await resolveAuthor(config.authorId, config.authorName, config.authorAvatar)

	const response = await fetch(
		`https://api.voidpresence.site/v1/authors/${encodeURIComponent(config.authorId)}/add-config`,
		{
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({
				kind: 'presence',
				title: config.title,
				authorId: `${config.authorId}`,
				author: resolved.name,
				authorAvatar: resolved.avatar ?? null,
				description: config.description,
				configData: config.configData,
				downloads: 0,
				uploadedAt: Date.now(),
			}),
		}
	)

	if (!response.ok) throw new Error(`HTTP ${response.status}`)
	const result = (await response.json()) as { id: string }
	return result.id || 'unknown'
}

export async function uploadStatusConfigToCloud(config: UploadConfigPayload): Promise<string> {
	const resolved = await resolveAuthor(config.authorId, config.authorName, config.authorAvatar)

	const response = await fetch(
		`https://api.voidpresence.site/v1/authors/${encodeURIComponent(config.authorId)}/add-config`,
		{
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({
				kind: 'status',
				title: config.title,
				authorId: `${config.authorId}`,
				author: resolved.name,
				authorAvatar: resolved.avatar ?? null,
				description: config.description,
				configData: config.configData,
				downloads: 0,
				uploadedAt: Date.now(),
			}),
		}
	)

	if (!response.ok) throw new Error(`HTTP ${response.status}`)
	const result = (await response.json()) as { id: string }
	return result.id || 'unknown'
}
