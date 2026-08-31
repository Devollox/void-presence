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

type ApiLatestInfo = {
	tag: string
	assetName: string
	downloadUrl: string
	body: string
}

export async function checkForUpdates({ log }: { log: boolean }) {
	try {
		const res = await fetch('https://api.voidpresence.com/v3/github/releases', {
			method: 'POST',
			headers: {
				Accept: 'application/json',
				'Content-Type': 'application/json',
			},
			body: JSON.stringify({
				platform:
					process.platform === 'darwin'
						? 'macos'
						: process.platform === 'linux'
							? 'linux'
							: 'windows',
			}),
		})
		if (!res.ok) {
			return null
		}

		const data = (await res.json()) as ApiLatestInfo

		const latestTag = data.tag
		if (!latestTag) {
			return null
		}

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

		const downloadUrl = data.downloadUrl || null

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

function getInstallDir() {
	if (process.platform === 'win32') {
		const portableDir = process.env.PORTABLE_EXECUTABLE_DIR
		if (portableDir && portableDir.trim().length > 0) {
			return portableDir
		}
	}

	const exePath = app.getPath('exe')
	return path.dirname(exePath)
}

function updateFileName(version: string): string {
	if (process.platform === 'win32') return `Void.Presence.Updates.${version}.exe`
	if (process.platform === 'darwin') return `Void.Presence.Updates.${version}.dmg`
	return `Void.Presence.Updates.${version}.deb`
}

export async function downloadFile(url: string, version: string): Promise<{ filePath: string }> {
	const fileName = updateFileName(version)
	const installDir = getInstallDir()
	const filePath = path.join(installDir, fileName)

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
				const minSizeBytes = process.platform === 'win32' ? 50 * 1024 * 1024 : 1 * 1024 * 1024
				if (err || stats.size < minSizeBytes) {
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

export function isPortable() {
	if (process.platform === 'win32') {
		const portableDir = process.env.PORTABLE_EXECUTABLE_DIR
		if (portableDir && portableDir.trim().length > 0) return true

		const dir = getInstallDir().toLowerCase()
		const inAppData = dir.includes('\\appdata\\local\\programs\\')
		const inProgramFiles =
			dir.includes('\\program files\\') || dir.includes('\\program files (x86)\\')
		return !(inAppData || inProgramFiles)
	}

	if (process.platform === 'darwin') {
		const dir = getInstallDir()
		return !dir.startsWith('/Applications/')
	}

	const dir = getInstallDir()
	return !dir.startsWith('/usr/') && !dir.startsWith('/opt/')
}

export { getInstallDir }
