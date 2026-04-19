import { app, BrowserWindow } from 'electron'
import fs from 'fs'
import path from 'path'
import { sendLog } from './logging'
import { loadSettings, saveSettings } from './settings'

export async function checkForUpdates({ log }: { log: boolean }) {
	try {
		const res = await fetch(
			'https://api.github.com/repos/Devollox/void-presence/releases/latest',
			{ headers: { Accept: 'application/vnd.github+json' } },
		)
		if (!res.ok) return null

		const data = await res.json()
		const latestTag = data.tag_name
		const latest = latestTag.replace(/^v/i, '')
		const current = app.getVersion()
		const changelogMd: string = (data.body || '').trim()

		if (latest === current) {
			sendLog(`Void Presence v${current}`)
			return null
		}

		const settings = loadSettings()
		const lastNotified = settings.lastUpdateNotified || null
		const lastNotifiedFor = settings.lastUpdateNotifiedVersion || current

		const downloadUrl = getDownloadUrl(data.assets)

		const info = {
			latestTag,
			downloadUrl,
			currentVersion: current,
			changelogMd,
		}

		if (lastNotified === latestTag && lastNotifiedFor === current) {
			return info
		}

		if (log) {
			sendLog(
				`New version ${latestTag} available! (current: v${current}). Click the tray icon to install the update.`,
				'warn',
			)
		}

		saveSettings({
			...settings,
			lastUpdateNotified: latestTag,
			lastUpdateNotifiedVersion: current,
		})

		const win = BrowserWindow.getAllWindows()[0]
		if (win) {
			win.webContents.send('update-available', info)
		}

		return info
	} catch (e: any) {
		sendLog(`Update failed: ${e?.message || String(e)}`)
	}
}

function getDownloadUrl(assets: any[]) {
	return (
		assets?.find(
			(a: any) => a.name.includes('Setup') && a.name.endsWith('.exe'),
		)?.browser_download_url || null
	)
}

export async function downloadFile(
	url: string,
	version: string,
): Promise<{ filePath: string }> {
	const fileName = `Void.Presence.Setup.${version}.exe`
	const filePath = path.join(app.getPath('temp'), fileName)

	sendLog(`Downloading updater: ${fileName}...`)

	const response = await fetch(url)
	if (!response.ok) throw new Error(`HTTP ${response.status}`)

	const file = fs.createWriteStream(filePath)
	const reader = response.body?.getReader()
	const total = Number(response.headers.get('content-length') || 0)
	let downloaded = 0

	if (!reader) throw new Error('Failed to get reader from response body')

	while (true) {
		const { done, value } = await reader.read()
		if (done) break

		downloaded += value.byteLength
		file.write(Buffer.from(value))

		if (total) {
			const mb = Math.round(downloaded / 1024 / 1024)
			const percent = Math.round((downloaded / total) * 100)
			sendLog(`Downloading update… ${mb}MB (${percent}%)`)
		}
	}

	return new Promise((resolve, reject) => {
		file.end()
		file.on('finish', () => {
			fs.stat(filePath, (err, stats) => {
				if (err || stats.size < 50 * 1024 * 1024) {
					if (fs.existsSync(filePath)) fs.unlinkSync(filePath)
					reject(new Error(`Invalid EXE: ${stats?.size || 0} bytes`))
				} else {
					sendLog(`Downloaded ${Math.round(stats.size / 1024 / 1024)}MB`)
					resolve({ filePath })
				}
			})
		})
	})
}
