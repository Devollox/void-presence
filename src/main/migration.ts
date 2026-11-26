import { promises as fs } from 'fs'
import { getConfigRegistry } from './config'

export async function runMigrations(): Promise<void> {
	const registry = getConfigRegistry()

	for (const { filePath, defaults } of registry) {
		let raw: string
		try {
			raw = await fs.readFile(filePath, 'utf-8')
		} catch {
			continue
		}

		let parsed: Record<string, unknown>
		try {
			parsed = JSON.parse(raw) as Record<string, unknown>
		} catch {
			continue
		}

		const missingFields = Object.entries(defaults).filter(([key]) => !(key in parsed))

		if (missingFields.length === 0) continue

		const patched = { ...parsed }
		for (const [key, value] of missingFields) {
			patched[key] = value
			console.info(
				`[migration] ${filePath.split(/[\\/]/).pop()}: added missing field "${key}" = ${JSON.stringify(value)}`
			)
		}

		try {
			await fs.writeFile(filePath, JSON.stringify(patched, null, 2), 'utf-8')
		} catch (e) {
			console.error(`[migration] Failed to patch ${filePath}:`, e)
		}
	}
}
