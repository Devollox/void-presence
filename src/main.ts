import { app, BrowserWindow } from 'electron'
import path from 'path'
import { getLanguage, readSettings } from './main/config'
import { getAutoHide, initIpc } from './main/ipc'
import { sendLog } from './main/logging'
import { setMainLanguage, t } from './main/translations'
import { createTray } from './main/tray'
import { checkForUpdates } from './main/updates'
import { createMainWindow } from './main/window'

const PROTOCOL = 'voidpresence'

if (process.defaultApp) {
	if (process.argv.length >= 2) {
		app.setAsDefaultProtocolClient(PROTOCOL, process.execPath, [path.resolve(process.argv[1])])
	}
} else {
	app.setAsDefaultProtocolClient(PROTOCOL)
}

let isQuitting = false
let mainWindow: BrowserWindow | null = null
let pendingUrl: string | null = null

async function handleUrl(rawUrl: string) {
	try {
		const url = new URL(rawUrl)
		const authorId = url.searchParams.get('authorId')
		const authorName = url.searchParams.get('name')
		const provider = url.searchParams.get('provider')
		const avatar = url.searchParams.get('avatar')
		const configData = url.searchParams.get('data')
		const title = url.searchParams.get('title') || undefined

		const kindParam = url.searchParams.get('kind')
		const host = url.host
		const pathname = url.pathname.replace('/', '')
		const payloadType = kindParam || pathname || 'config'

		if (host === 'install-plugin') {
			const pluginUrl = url.searchParams.get('url')
			if (pluginUrl) {
				if (mainWindow && !mainWindow.isDestroyed()) {
					mainWindow.webContents.send('INSTALL_PLUGIN_FROM_URL', { url: pluginUrl })
					mainWindow.webContents.send('ACTIVATE_VIEW_FROM_PROTOCOL', { view: 'logs' })
				} else {
					pendingUrl = rawUrl
				}
			}
			return
		}

		if (configData) {
			const parsed = JSON.parse(configData)
			if (mainWindow && !mainWindow.isDestroyed()) {
				if (payloadType === 'status') {
					mainWindow.webContents.send('IMPORT_STATUS_FROM_PROTOCOL', { data: parsed, title })
				} else {
					mainWindow.webContents.send('IMPORT_CONFIG_FROM_PROTOCOL', { data: parsed, title })
				}
				mainWindow.webContents.send('ACTIVATE_VIEW_FROM_PROTOCOL', { view: 'config' })
			} else {
				pendingUrl = rawUrl
			}
		}

		if (authorId) {
			if (mainWindow && !mainWindow.isDestroyed()) {
				mainWindow.webContents.send('AUTH_FROM_URL', {
					authorId,
					authorName,
					provider,
					avatar,
				})
				mainWindow.webContents.send('ACTIVATE_VIEW_FROM_PROTOCOL', { view: 'config' })
			} else {
				pendingUrl = rawUrl
			}
		}
	} catch (e: any) {
		console.error('Failed to parse URL or handle protocol data:', e?.message ?? e)
	}
}

const gotTheLock = app.requestSingleInstanceLock()
if (!gotTheLock) {
	app.quit()
} else {
	app.on('second-instance', (event, commandLine) => {
		event.preventDefault()
		const url = commandLine.find(arg => arg.startsWith(`${PROTOCOL}://`))
		if (url) {
			handleUrl(url)
		}

		if (mainWindow && !mainWindow.isDestroyed()) {
			if (mainWindow.isMinimized()) mainWindow.restore()
			mainWindow.show()
			mainWindow.focus()
		}
	})

	app.on('open-url', (event, url) => {
		event.preventDefault()
		handleUrl(url)
	})

	app.on('before-quit', () => {
		isQuitting = true
	})

	app.whenReady().then(async () => {
		const initialSettings = await readSettings()
		const autoHideOnStart = !!initialSettings.autoHideOnStart

		const lang = await getLanguage()
		setMainLanguage(lang)

		mainWindow = createMainWindow(autoHideOnStart, () => isQuitting)
		initIpc()

		createTray(
			() => {
				if (mainWindow && !mainWindow.isDestroyed()) {
					mainWindow.show()
					mainWindow.focus()
				}
				return mainWindow
			},
			() => {
				isQuitting = true
				app.quit()
			}
		)

		if (mainWindow) {
			mainWindow.webContents.once('did-finish-load', () => {
				if (sendLog) sendLog(t('supportDiscord'), 'info')
				checkForUpdates({ log: true })

				if (pendingUrl) {
					handleUrl(pendingUrl)
					pendingUrl = null
				}
			})
		} else {
			if (sendLog) sendLog(t('supportDiscord'), 'info')
			checkForUpdates({ log: true })
		}
	})
}

if (process.platform === 'darwin') {
	app.on('will-finish-launching', () => {
		app.on('open-url', (event, url) => {
			event.preventDefault()
			pendingUrl = url
		})
	})
} else {
	const url = process.argv.find(arg => arg.startsWith(`${PROTOCOL}://`))
	if (url) pendingUrl = url
}

app.on('activate', () => {
	if (!getAutoHide() && !mainWindow) {
		mainWindow = createMainWindow(getAutoHide(), () => isQuitting)
	}
})

app.on('window-all-closed', () => {
	if (process.platform !== 'darwin') {
		app.quit()
	}
})
