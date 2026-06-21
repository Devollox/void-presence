import { app, BrowserWindow } from 'electron'
import fs from 'fs'
import path from 'path'
import { readSettings, writeSettings } from './config'
import { sendLog } from './logging'
import { t } from './translations'

type UpdateInfo = {
	latestTag: string
	downloadUrl: string | null
	portableUrl: string | null
	currentVersion: string
	changelogMd: string
}

export async function checkForUpdates({ log }: { log: boolean }) {
	try {
		const res = await fetch('https://api.github.com/repos/Devollox/void-presence/releases/latest', {
			headers: { Accept: 'application/vnd.github+json' },
		})
		if (!res.ok) {
			return null
		}

		const data = await res.json()
		const latestTag = data.tag_name as string
		const latest = latestTag.replace(/^v/i, '')
		const current = app.getVersion()
		const changelogMd: string = (data.body || '').trim()

		if (latest === current) {
			sendLog(t('currentVersion', { version: current }))
			return null
		}

		const settings = await readSettings()
		const lastNotified = settings.lastUpdateNotified || null
		const lastNotifiedFor = settings.lastUpdateNotifiedVersion || current

		const downloadUrl = getInstallerUrl(data.assets)

		const info: UpdateInfo = {
			latestTag,
			downloadUrl,
			portableUrl: null,
			currentVersion: current,
			changelogMd,
		}

		const alreadyNotified = lastNotified === latestTag && lastNotifiedFor === current

		if (log) {
			sendLog(t('updateAvailable', { tag: latestTag, current }), 'warn')
		}

		if (!alreadyNotified) {
			await writeSettings({
				...settings,
				lastUpdateNotified: latestTag,
				lastUpdateNotifiedVersion: current,
			})
		}

		const win = BrowserWindow.getAllWindows()[0]
		if (win) {
			win.webContents.send('update-available', info)
		}

		return info
	} catch (e: any) {
		sendLog(t('updateCheckFailed', { error: e?.message || String(e) }))
		return null
	}
}

function getInstallerUrl(assets: any[]): string | null {
	return (
		assets?.find(
			(a: any) => typeof a.name === 'string' && a.name.includes('Setup') && a.name.endsWith('.exe')
		)?.browser_download_url || null
	)
}

export async function downloadFile(url: string, version: string): Promise<{ filePath: string }> {
	const fileName = `Void.Presence.Setup.${version}.exe`
	const filePath = path.join(app.getPath('temp'), fileName)

	sendLog(t('updateDownloadStarted', { fileName }))

	const response = await fetch(url)
	if (!response.ok) {
		throw new Error(t('updateHttpError', { status: String(response.status) }))
	}

	const file = fs.createWriteStream(filePath)
	const reader = response.body?.getReader()
	const total = Number(response.headers.get('content-length') || 0)
	let downloaded = 0

	if (!reader) {
		throw new Error(t('updateFailedReader'))
	}

	while (true) {
		const { done, value } = await reader.read()
		if (done) break

		downloaded += value.byteLength
		file.write(Buffer.from(value))

		if (total) {
			const mb = Math.round(downloaded / 1024 / 1024)
			const percent = Math.round((downloaded / total) * 100)
			sendLog(t('updateDownloading', { mb: String(mb), percent: String(percent) }))
		}
	}

	return new Promise((resolve, reject) => {
		file.end()
		file.on('finish', () => {
			fs.stat(filePath, (err, stats) => {
				if (err || stats.size < 50 * 1024 * 1024) {
					if (fs.existsSync(filePath)) fs.unlinkSync(filePath)
					reject(new Error(t('updateInvalidExe', { size: String(stats?.size || 0) })))
				} else {
					const mb = Math.round(stats.size / 1024 / 1024)
					sendLog(t('updateDownloaded', { mb: String(mb) }))
					resolve({ filePath })
				}
			})
		})
		file.on('error', err => {
			reject(err)
		})
	})
}

function getInstallDir() {
	return path.dirname(process.execPath)
}

export function isPortable() {
	const dir = getInstallDir().toLowerCase()
	const inAppData = dir.includes('\\appdata\\local\\programs\\')
	const inProgramFiles =
		dir.includes('\\program files\\') || dir.includes('\\program files (x86)\\')
	const portable = !(inAppData || inProgramFiles)
	return portable
}
