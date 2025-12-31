import { app } from 'electron'
import * as fs from 'fs'
import * as path from 'path'

const settingsPath = path.join(app.getPath('userData'), 'settings.json')

export type Settings = {
	autoHideOnStart?: boolean
}

export function loadSettings(): Settings {
	try {
		const raw = fs.readFileSync(settingsPath, 'utf-8')
		return JSON.parse(raw)
	} catch {
		return {}
	}
}

export function saveSettings(data: Settings) {
	try {
		fs.writeFileSync(settingsPath, JSON.stringify(data, null, 2), 'utf-8')
	} catch {}
}
