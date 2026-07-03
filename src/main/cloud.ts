import sharp from 'sharp'

export type UploadConfigPayload = {
	title: string
	authorId: string
	authorName: string
	description: string
	configData: any
}

type ColorResult = {
	averageColor: string
}

function getFirstImageUrl(configData: unknown): string {
	const data = configData as any
	return data?.imageCycles?.[0]?.largeImage || ''
}

function defaultColors(): ColorResult {
	return { averageColor: '#5b5b5b' }
}

function toHex(n: number) {
	return n.toString(16).padStart(2, '0')
}

function rgbToHex(r: number, g: number, b: number) {
	return `#${toHex(r)}${toHex(g)}${toHex(b)}`
}

async function getColorsFromImage(url: string): Promise<ColorResult> {
	try {
		if (!url) {
			return defaultColors()
		}

		const res = await fetch(url, {
			headers: {
				'User-Agent':
					'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/149.0.0.0 Safari/537.36',
			},
		})

		if (!res.ok) {
			return defaultColors()
		}

		const contentType = res.headers.get('content-type') || ''
		if (!contentType.startsWith('image/')) {
			return defaultColors()
		}

		const arrayBuffer = await res.arrayBuffer()
		const buffer = Buffer.from(arrayBuffer)

		const rgbaBuffer = await sharp(buffer)
			.resize(24, 24, { fit: 'fill' })
			.ensureAlpha()
			.raw()
			.toBuffer()

		let r = 0
		let g = 0
		let b = 0
		let count = 0

		for (let i = 0; i < rgbaBuffer.length; i += 4) {
			const alpha = rgbaBuffer[i + 3]
			if (alpha < 128) continue
			r += rgbaBuffer[i]
			g += rgbaBuffer[i + 1]
			b += rgbaBuffer[i + 2]
			count++
		}

		if (!count) {
			return defaultColors()
		}

		r = Math.round(r / count)
		g = Math.round(g / count)
		b = Math.round(b / count)

		const hex = rgbToHex(r, g, b)

		return {
			averageColor: hex,
		}
	} catch {
		return defaultColors()
	}
}

export async function uploadConfigToCloud(config: UploadConfigPayload): Promise<string> {
	const firstImage = getFirstImageUrl(config.configData)
	const colors = firstImage ? await getColorsFromImage(firstImage) : defaultColors()

	const response = await fetch(
		`https://api.voidpresence.site/v1/authors/${encodeURIComponent(config.authorId)}/add-config`,
		{
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({
				kind: 'presence',
				title: config.title,
				description: config.description,
				configData: config.configData,
				downloads: 0,
				uploadedAt: Date.now(),
				...colors,
			}),
		}
	)

	if (!response.ok) throw new Error(`HTTP ${response.status}`)
	const result = (await response.json()) as { id: string }
	return result.id || 'unknown'
}

export async function uploadStatusConfigToCloud(config: UploadConfigPayload): Promise<string> {
	console.log(config.authorName)
	const response = await fetch(
		`https://api.voidpresence.site/v1/authors/${encodeURIComponent(config.authorId)}/add-config`,
		{
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({
				kind: 'status',
				title: config.title,
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
