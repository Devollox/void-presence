import { app } from 'electron'
import * as fs from 'fs'
import * as path from 'path'
import { Settings } from 'src/types/types'

const settingsPath = path.join(app.getPath('userData'), 'settings.json')

export function loadSettings(): Settings {
	try {
		const raw = fs.readFileSync(settingsPath, 'utf-8')
		const parsed = JSON.parse(raw) as Settings

		return {
			autoHideOnStart: parsed.autoHideOnStart === true,
			musicFilter: parsed.musicFilter === true,
			videoFilter: parsed.videoFilter === true,
			activityFilter: parsed.activityFilter === true,
			coverFetchEnabled: parsed.coverFetchEnabled === true,
		}
	} catch {
		return {
			musicFilter: false,
			videoFilter: false,
			activityFilter: false,
			coverFetchEnabled: false,
		}
	}
}

export function saveSettings(data: Settings) {
	const safe: Settings = {
		autoHideOnStart: data.autoHideOnStart === true,
		musicFilter: data.musicFilter === true,
		videoFilter: data.videoFilter === true,
		activityFilter: data.activityFilter === true,
		coverFetchEnabled: data.coverFetchEnabled === true,
	}

	try {
		fs.writeFileSync(settingsPath, JSON.stringify(safe, null, 2), 'utf-8')
	} catch {}
}
