import { app } from 'electron'
import path from 'path'
import { hotLoadPlugin, markPluginInstallDone, markPluginInstalling } from './plugin-manager'

export interface InstallResult {
	ok: boolean
	path?: string
	folder?: boolean
	error?: string
}

type LogFn = (msg: string, level?: string) => void

function downloadToBuffer(url: string, log: LogFn, depth = 0): Promise<Buffer> {
	return new Promise((resolve, reject) => {
		if (depth > 3) {
			reject(new Error('Too many redirects'))
			return
		}

		let proto: typeof import('https') | typeof import('http')

		void (async () => {
			try {
				if (url.startsWith('https://')) {
					proto = await import('https')
				} else if (url.startsWith('http://')) {
					if (!url.startsWith('http://localhost') && !url.startsWith('http://127.0.0.1')) {
						reject(new Error(`Refused non-HTTPS URL: ${url.split('?')[0]}`))
						return
					}
					proto = await import('http')
				} else {
					reject(new Error(`Unsupported URL scheme`))
					return
				}

				const MAX_BYTES = 32 * 1024 * 1024

				const chunks: Buffer[] = []
				let received = 0

				const req = proto.get(url, { headers: { 'User-Agent': 'void-presence' } }, (res: any) => {
					if (
						res.statusCode === 301 ||
						res.statusCode === 302 ||
						res.statusCode === 307 ||
						res.statusCode === 308
					) {
						const location: string | undefined = res.headers.location
						if (!location) {
							reject(new Error('Redirect without location'))
							return
						}
						if (location.startsWith('http://') && url.startsWith('https://')) {
							reject(new Error('Refused HTTP redirect from HTTPS'))
							return
						}
						downloadToBuffer(location, log, depth + 1)
							.then(resolve)
							.catch(reject)
						return
					}

					if (res.statusCode !== 200) {
						reject(new Error(`HTTP ${res.statusCode}`))
						return
					}

					res.on('data', (chunk: Buffer) => {
						received += chunk.length
						if (received > MAX_BYTES) {
							req.destroy(new Error('Download exceeded 32 MB limit'))
							return
						}
						chunks.push(chunk)
					})

					res.on('end', () => resolve(Buffer.concat(chunks)))
					res.on('error', reject)
				})

				req.on('error', reject)
			} catch (e) {
				reject(e)
			}
		})()
	})
}

export async function installPluginFromUrl(
	pluginUrl: string,
	isZip: boolean,
	log: LogFn
): Promise<InstallResult> {
	const { promises: fsp } = await import('fs')
	const pluginsDir = path.join(app.getPath('userData'), 'plugins')
	await fsp.mkdir(pluginsDir, { recursive: true })

	const ghTreeMatch = pluginUrl.match(
		/^https:\/\/github\.com\/([^/]+)\/([^/]+)\/tree\/([^/]+)\/(.+)$/
	)

	if (isZip || ghTreeMatch) {
		let apiUrl: string
		let pluginId: string

		if (ghTreeMatch) {
			const [, owner, repo, branch, folderPath] = ghTreeMatch
			pluginId = folderPath.split('/').pop() || 'plugin'
			apiUrl = `https://api.github.com/repos/${owner}/${repo}/contents/${folderPath}?ref=${branch}`
		} else {
			const urlObj = new URL(pluginUrl)
			pluginId =
				urlObj.pathname
					.split('/')
					.pop()
					?.replace(/\.zip$/, '') || 'plugin'

			const m = pluginUrl.match(
				/raw\.githubusercontent\.com\/([^/]+)\/([^/]+)\/([^/]+)\/(.+?)\/[^/]+\.zip/
			)
			if (!m) throw new Error(`Cannot parse folder URL: ${pluginUrl.split('?')[0]}`)
			const [, owner, repo, branch, folderPath] = m
			apiUrl = `https://api.github.com/repos/${owner}/${repo}/contents/${folderPath}/${pluginId}?ref=${branch}`
		}

		const destDir = path.join(pluginsDir, pluginId)

		if (!destDir.startsWith(pluginsDir + path.sep)) {
			throw new Error('Path traversal detected in plugin ID')
		}

		await fsp.mkdir(destDir, { recursive: true })
		markPluginInstalling(pluginId)
		log(`Downloading plugin folder: ${pluginId}`, 'info')

		async function downloadDir(apiDirUrl: string, localDir: string): Promise<void> {
			const buf = await downloadToBuffer(apiDirUrl, log)
			const items = JSON.parse(buf.toString('utf-8')) as unknown[]

			if (!Array.isArray(items)) {
				throw new Error(`Unexpected API response from ${apiDirUrl}`)
			}

			await fsp.mkdir(localDir, { recursive: true })

			for (const item of items as any[]) {
				const safeName = path.basename(item.name as string)
				const localPath = path.join(localDir, safeName)

				if (!localPath.startsWith(pluginsDir + path.sep)) {
					log(`Skipping suspicious path: ${item.name}`, 'warn')
					continue
				}

				if (item.type === 'dir') {
					await downloadDir(item.url as string, localPath)
				} else if (item.type === 'file' && item.download_url) {
					const fileBuf = await downloadToBuffer(item.download_url as string, log)
					await fsp.writeFile(localPath, fileBuf)
					log(`Downloaded: ${item.path}`, 'info')
				}
			}
		}

		try {
			await downloadDir(apiUrl, destDir)
			await fsp.unlink(path.join(destDir, '.rebuilt')).catch(() => {})

			log(`Plugin folder installed: ${destDir}`, 'success')

			try {
				await hotLoadPlugin(path.join(destDir, 'index.js'), pluginId, destDir)
			} catch (e: any) {
				log(`Plugin loaded with warning: ${e?.message ?? String(e)}`, 'warn')
			}
		} finally {
			markPluginInstallDone(pluginId)
		}

		return { ok: true, path: destDir, folder: true }
	}

	const urlObj = new URL(pluginUrl)
	const rawName = urlObj.pathname.split('/').pop() || 'plugin'
	const fileName = rawName.endsWith('.js') ? rawName : `${rawName}.js`

	const safeFileName = path.basename(fileName)
	const destPath = path.join(pluginsDir, safeFileName)

	if (!destPath.startsWith(pluginsDir + path.sep)) {
		throw new Error('Path traversal detected in plugin file name')
	}

	log(`Downloading plugin file from: [url redacted]`, 'info')
	const buf = await downloadToBuffer(pluginUrl, log)
	await fsp.writeFile(destPath, buf)

	log(`Plugin file installed: ${destPath}`, 'success')
	return { ok: true, path: destPath, folder: false }
}

interface PendingInstall {
	sourceUrl: string
	isFolder: boolean
	version: string
	title: string
}

const pendingInstalls = new Map<string, PendingInstall>()

export function registerPendingInstall(pluginId: string, entry: PendingInstall): void {
	pendingInstalls.set(pluginId, entry)
}

export function consumePendingInstall(pluginId: string): PendingInstall | null {
	const entry = pendingInstalls.get(pluginId) ?? null
	if (entry) pendingInstalls.delete(pluginId)
	return entry
}
