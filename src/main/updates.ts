import { app } from 'electron'
import { sendLog } from './logging'

export async function checkForUpdates() {
	try {
		const res = await fetch(
			'https://api.github.com/repos/Devollox/void-presence/releases/latest',
			{ headers: { Accept: 'application/vnd.github+json' } }
		)
		if (!res.ok) return

		const data = await res.json()
		const latestTag: string = data.tag_name
		const latest = latestTag.replace(/^v/i, '')
		const current = app.getVersion()

		if (latest !== current) {
			sendLog(
				`Warning: new version available ${latestTag} (you have v${current})`,
				'warn'
			)
		} else {
			sendLog(`Void Presence v${current} (up to date)`)
		}
	} catch (e: any) {
		console.error('checkForUpdates error', e)
		sendLog(`Update check failed: ${e?.message || String(e)}`)
	}
}
