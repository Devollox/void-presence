import { app, BrowserWindow } from 'electron'
import path from 'path'
import { decodeEnv } from './main/cloud'
import { readSettings } from './main/config'
import { getAutoHide, initIpc } from './main/ipc'
import { createTray } from './main/tray'
import { checkForUpdates } from './main/updates'
import { createMainWindow } from './main/window'

const PROTOCOL = 'voidpresence'

if (process.defaultApp) {
	if (process.argv.length >= 2) {
		app.setAsDefaultProtocolClient(PROTOCOL, process.execPath, [
			path.resolve(process.argv[1]),
		])
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

		if (authorId) {
			mainWindow?.webContents.send('AUTH_FROM_URL', authorId)

			if (mainWindow && !mainWindow.isDestroyed()) {
				await mainWindow.webContents.executeJavaScript(`
					(function() {
						localStorage.setItem("authorId", ${JSON.stringify(authorId)});
						const el = document.getElementById('config-author-input');
						if (el) el.value = ${JSON.stringify(authorId)};

						const navMain = document.getElementById('nav-main')
						const navLogs = document.getElementById('nav-logs')
						const navConfig = document.getElementById('nav-config');
						const views = document.querySelectorAll('.view');

						views.forEach(v => {
							const name = v.getAttribute('data-view');
							v.setAttribute('data-active', name === 'config' ? 'true' : 'false');
						});

						if (navMain) {
							navMain.setAttribute('data-active', 'false')
						}

						if (navLogs) {
							navLogs.setAttribute('data-active', 'false')
						}

						if (navConfig) {
							navConfig.setAttribute('data-active', 'true');
						}
					})()
        `)
			} else {
				pendingUrl = rawUrl
			}
		}
	} catch (e) {
		console.error('Failed to parse URL or save to storage:', e)
	}
}

const gotTheLock = app.requestSingleInstanceLock()
if (!gotTheLock) {
	app.quit()
} else {
	app.on('second-instance', (event, commandLine) => {
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

	decodeEnv()

	app.on('before-quit', () => {
		isQuitting = true
	})

	app.whenReady().then(async () => {
		const initialSettings = await readSettings()
		const autoHideOnStart = !!initialSettings.autoHideOnStart

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
			},
		)
		if (mainWindow) {
			mainWindow.webContents.once('did-finish-load', () => {
				checkForUpdates({ log: true })

				if (pendingUrl) {
					handleUrl(pendingUrl)
					pendingUrl = null
				}
			})
		} else {
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
