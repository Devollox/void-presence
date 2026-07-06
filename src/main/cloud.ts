import sharp from 'sharp'

export type UploadConfigPayload = {
	title: string
	authorId: string
	description: string
	configData: any
}

type ColorResult = {
	averageColor: string
}

function defaultColor(): ColorResult {
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
			return defaultColor()
		}

		const res = await fetch(url, {
			headers: {
				'User-Agent':
					'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/149.0.0.0 Safari/537.36',
			},
			signal: AbortSignal.timeout(7000),
		})

		if (!res.ok) {
			return defaultColor()
		}

		const contentType = res.headers.get('content-type') || ''
		if (!contentType.startsWith('image/')) {
			return defaultColor()
		}

		const arrayBuffer = await res.arrayBuffer()
		const buffer = Buffer.from(arrayBuffer)

		const rgbaBuffer = await sharp(buffer, { page: 0 })
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
			return defaultColor()
		}

		r = Math.round(r / count)
		g = Math.round(g / count)
		b = Math.round(b / count)

		return { averageColor: rgbToHex(r, g, b) }
	} catch {
		return defaultColor()
	}
}

async function getColorsFromImages(urls: string[]): Promise<string[]> {
	const validUrls = urls.filter(url => typeof url === 'string' && url.trim().length > 0)
	if (!validUrls.length) {
		return []
	}

	const results = await Promise.all(validUrls.map(url => getColorsFromImage(url)))
	return results.map(res => res.averageColor)
}

export async function uploadConfigToCloud(config: UploadConfigPayload): Promise<string> {
	const data = config.configData as any
	const imageUrls: string[] = Array.isArray(data?.imageCycles)
		? data.imageCycles
				.map((img: any) => (typeof img?.largeImage === 'string' ? img.largeImage : ''))
				.filter((url: string) => url.length > 0)
		: []

	const averageColors = imageUrls.length > 0 ? await getColorsFromImages(imageUrls) : []

	const response = await fetch(
		`https://api.voidpresence.site/v1/authors/${encodeURIComponent(config.authorId)}/add-config`,
		{
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({
				kind: 'presence',
				title: config.title,
				authorId: `${config.authorId}`,
				description: config.description,
				configData: config.configData,
				downloads: 0,
				uploadedAt: Date.now(),
				averageColors,
			}),
			signal: AbortSignal.timeout(10000),
		}
	)

	if (!response.ok) throw new Error(`HTTP ${response.status}`)
	const result = (await response.json()) as { id: string }
	return result.id || 'unknown'
}

export async function uploadStatusConfigToCloud(config: UploadConfigPayload): Promise<string> {
	const response = await fetch(
		`https://api.voidpresence.site/v1/authors/${encodeURIComponent(config.authorId)}/add-config`,
		{
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({
				kind: 'status',
				title: config.title,
				authorId: `${config.authorId}`,
				description: config.description,
				configData: config.configData,
				downloads: 0,
				uploadedAt: Date.now(),
			}),
			signal: AbortSignal.timeout(10000),
		}
	)

	if (!response.ok) throw new Error(`HTTP ${response.status}`)
	const result = (await response.json()) as { id: string }
	return result.id || 'unknown'
}
