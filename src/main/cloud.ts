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
	author: string
	description: string
	configData: unknown
}

export async function uploadConfigToCloud(
	config: UploadConfigPayload
): Promise<string> {
	const url = `${process.env.FIREBASE_DB_URL}/configs.json`

	const response = await fetch(url, {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify({
			title: config.title,
			author: config.author,
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
