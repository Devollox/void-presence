import sharp from 'sharp'

const ENV_DATA =
	'RklyZWJBU0VfREJfVVJMPWh0dHBzOi8vc3R1ZGlvLTU3MTAzMDA1ODgtMjYyNWItZGVmYXVsdC1ydGRiLmZpcmViYXNlaW8uY29tLw=='

export function decodeEnv() {
	const decoded = Buffer.from(ENV_DATA, 'base64').toString()
	const lines = decoded.split('\n')
	lines.forEach(line => {
		const [key, ...valueParts] = line.split('=')
		if (key) process.env[key.trim()] = valueParts.join('=').trim()
	})
}

export type UploadConfigPayload = {
	title: string
	authorId: string
	authorName: string
	description: string
	configData: any
}

type UserRecord = {
	name?: string
	createdAt?: number
}

type ColorResult = {
	averageColor: string
}

function getBaseUrl() {
	const raw = process.env.FIREBASE_DB_URL || ''
	return raw.endsWith('/') ? raw.slice(0, -1) : raw
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
	} catch (err: any) {
		return defaultColors()
	}
}

export async function fetchAuthor(
	authorId: string,
): Promise<UserRecord | null> {
	const base = getBaseUrl()
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
	const url = `${base}/configs.json`

	const firstImage = getFirstImageUrl(config.configData)
	const colors = firstImage
		? await getColorsFromImage(firstImage)
		: defaultColors()

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
			...colors,
		}),
	})

	if (!response.ok) throw new Error(`HTTP ${response.status}`)
	const result: Record<string, unknown> = await response.json()
	const keys = Object.keys(result)
	return keys[0] || 'unknown'
}
