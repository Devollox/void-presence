import { app, BrowserWindow } from 'electron'
import path from 'path'
import { getLanguage, readSettings } from './main/config'
import { getAutoHide, initIpc } from './main/ipc'
import { sendLog } from './main/logging'
import { setMainLanguage, t } from './main/translations'
import { createTray } from './main/tray'
import { checkForUpdates } from './main/updates'
import { createMainWindow } from './main/window'
import { cancelPendingLogin, exchangeActionTicket } from './main/desktop-auth'
import { registerPendingInstall } from './plugins/plugin-installer'
import { cleanupInstallerFolders } from './main/cleanup-updater'
import { runMigrations } from './main/migration'

const PROTOCOL = 'voidpresence'

const PENDING_URL_LIMIT = 4

const pendingUrls: string[] = []

const dispatchedTickets = new Set<string>()

if (process.defaultApp) {
	if (process.argv.length >= 2) {
		app.setAsDefaultProtocolClient(PROTOCOL, process.execPath, [path.resolve(process.argv[1])])
	}
} else {
	app.setAsDefaultProtocolClient(PROTOCOL)
}

let isQuitting = false
let mainWindow: BrowserWindow | null = null

function parseProtocolUrl(rawUrl: string): URL | null {
	try {
		const url = new URL(rawUrl)

		if (url.protocol !== `${PROTOCOL}:`) return null

		if (url.username || url.password || url.port) return null

		return url
	} catch {
		return null
	}
}

function getSingleParam(url: URL, name: string): string | null {
	if (url.searchParams.getAll(name).length !== 1) return null

	return url.searchParams.get(name)
}

const LEGACY_PARAMS = ['data', 'authorId', 'name', 'provider', 'avatar', 'url', 'zip']

const LEGACY_HOSTS = ['import-config', 'import-status-config', 'install-plugin']

function isLegacyUrl(url: URL): boolean {
	if (LEGACY_HOSTS.includes(url.hostname)) return true

	if (LEGACY_PARAMS.some(parameter => url.searchParams.has(parameter))) {
		return true
	}

	return false
}

function sendLegacyError(win: BrowserWindow): void {
	console.warn('[protocol] Legacy deep-link received — rejected')

	win.webContents.send('PROTOCOL_ERROR', {
		code: 'legacy_link',
		message: 'This link is no longer supported. Open voidpresence.com to get an updated link.',
	})
}

function sendActionError(win: BrowserWindow, code: string, message: string): void {
	win.webContents.send('PROTOCOL_ERROR', {
		code,
		message,
	})
}

async function handleUrl(rawUrl: string): Promise<void> {
	console.info('[protocol] Received callback', {
		scheme: PROTOCOL,
	})

	const url = parseProtocolUrl(rawUrl)

	if (!url) {
		console.warn('[protocol] Rejected — could not parse URL')
		return
	}

	const win = mainWindow

	if (!win || win.isDestroyed() || win.webContents.isLoadingMainFrame()) {
		if (pendingUrls.length < PENDING_URL_LIMIT) {
			pendingUrls.push(rawUrl)

			console.info('[protocol] Queued — window not ready', {
				queueLength: pendingUrls.length,
			})
		} else {
			console.warn('[protocol] Queue full — deep-link dropped')
		}

		return
	}

	if (isLegacyUrl(url)) {
		sendLegacyError(win)
		return
	}

	const host = url.hostname

	if (host === 'auth') {
		sendActionError(
			win,
			'unsupported',
			'This authorization method is no longer supported. Start login again from the app.'
		)

		return
	}

	if (host === 'action') {
		const ticket = getSingleParam(url, 'ticket')

		if (!ticket || !/^[A-Za-z0-9_-]{43}$/.test(ticket)) {
			console.warn('[protocol] Action ticket missing or malformed')

			sendActionError(win, 'invalid_ticket', 'The link is malformed. Please try again.')

			return
		}

		if (dispatchedTickets.has(ticket)) {
			console.warn('[protocol] Duplicate ticket delivery — ignored')

			sendActionError(
				win,
				'ticket_already_used',
				'This link has already been used. Click the button again to get a new one.'
			)

			return
		}

		const allowedParams = new Set(['ticket'])

		for (const key of url.searchParams.keys()) {
			if (!allowedParams.has(key)) {
				console.warn('[protocol] Unexpected query param in action URL', {
					key,
				})

				sendActionError(win, 'invalid_ticket', 'The link is malformed. Please try again.')

				return
			}
		}

		console.info('[protocol] Exchanging action ticket')

		const payload = await exchangeActionTicket(ticket)

		if (!payload) {
			console.warn('[protocol] Action ticket exchange failed')

			sendActionError(
				win,
				'ticket_invalid',
				'The link has expired or already been used. Click the button again to get a new one.'
			)

			return
		}

		dispatchedTickets.add(ticket)

		if (dispatchedTickets.size > 256) {
			const oldest = dispatchedTickets.values().next().value

			if (oldest !== undefined) {
				dispatchedTickets.delete(oldest)
			}
		}

		console.info('[protocol] Action ticket exchanged', {
			kind: payload.kind,
		})

		if (win.isDestroyed() || mainWindow !== win) {
			console.warn('[protocol] Window changed after action exchange — discarding payload')

			return
		}

		if (win.webContents.isLoadingMainFrame()) {
			console.warn('[protocol] Window reloaded after action exchange — discarding payload')

			return
		}

		if (win.isMinimized()) win.restore()

		win.show()
		win.focus()

		if (payload.kind === 'import-config') {
			win.webContents.send('ACTION_IMPORT_CONFIG', payload)
			win.webContents.send('ACTIVATE_VIEW_FROM_PROTOCOL', {
				view: 'config',
			})

			console.info('[protocol] import-config delivered to renderer')

			return
		}

		if (payload.kind === 'import-status') {
			win.webContents.send('ACTION_IMPORT_STATUS', payload)
			win.webContents.send('ACTIVATE_VIEW_FROM_PROTOCOL', {
				view: 'config',
			})

			console.info('[protocol] import-status delivered to renderer')

			return
		}

		if (payload.kind === 'install-plugin') {
			registerPendingInstall(payload.pluginId, {
				sourceUrl: payload.sourceUrl,
				isFolder: payload.isFolder,
				version: payload.version,
				title: payload.title,
			})

			win.webContents.send('ACTION_INSTALL_PLUGIN', {
				pluginId: payload.pluginId,
				title: payload.title,
				version: payload.version,
				isFolder: payload.isFolder,
			})

			win.webContents.send('ACTIVATE_VIEW_FROM_PROTOCOL', {
				view: 'logs',
			})

			console.info('[protocol] install-plugin delivered to renderer')

			return
		}

		console.warn('[protocol] Unknown action kind', {
			kind: (payload as any).kind,
		})

		sendActionError(
			win,
			'unsupported_action',
			'This action is not supported by the current version of the app.'
		)

		return
	}

	console.warn('[protocol] Unknown route', {
		host,
	})

	sendActionError(
		win,
		'unknown_route',
		'This link type is not recognised. Make sure you have the latest version of Void Presence.'
	)
}

function flushPendingUrls(): void {
	const queued = pendingUrls.splice(0)

	for (const url of queued) {
		void handleUrl(url)
	}
}

function restoreOrCreateWindow(): void {
	if (mainWindow && !mainWindow.isDestroyed()) {
		if (mainWindow.isMinimized()) {
			mainWindow.restore()
		}

		mainWindow.show()
		mainWindow.focus()

		return
	}

	mainWindow = createMainWindow(getAutoHide(), () => isQuitting)
}

const gotTheLock = app.requestSingleInstanceLock()

if (!gotTheLock) {
	app.quit()
} else {
	app.on('second-instance', (_event, commandLine) => {
		const url = commandLine.find(argument => argument.toLowerCase().startsWith(`${PROTOCOL}://`))

		console.info('[protocol] Second-instance event', {
			hasProtocolUrl: Boolean(url),
		})

		restoreOrCreateWindow()

		if (url) {
			void handleUrl(url)
		}
	})

	app.on('open-url', (event, url) => {
		event.preventDefault()

		void handleUrl(url)
	})

	app.on('before-quit', () => {
		isQuitting = true

		cancelPendingLogin()
	})

	app.whenReady().then(async () => {
		await cleanupInstallerFolders()

		await runMigrations()

		const initialSettings = await readSettings()
		const autoHideOnStart = !!initialSettings.autoHideOnStart

		const language = await getLanguage()

		setMainLanguage(language)

		mainWindow = createMainWindow(autoHideOnStart, () => isQuitting)

		initIpc()

		createTray(
			() => {
				restoreOrCreateWindow()

				return mainWindow
			},
			() => {
				isQuitting = true

				app.quit()
			}
		)

		if (mainWindow) {
			mainWindow.webContents.once('did-finish-load', () => {
				if (sendLog) {
					sendLog(t('supportDiscord'), 'info')
				}

				checkForUpdates({
					log: true,
				})

				flushPendingUrls()
			})
		} else {
			if (sendLog) {
				sendLog(t('supportDiscord'), 'info')
			}

			checkForUpdates({
				log: true,
			})
		}
	})
}

if (process.platform !== 'darwin') {
	const url = process.argv.find(argument => argument.startsWith(`${PROTOCOL}://`))

	if (url) {
		pendingUrls.push(url)
	}
}

if (process.platform === 'darwin') {
	app.on('will-finish-launching', () => {
		app.once('open-url', (event, url) => {
			event.preventDefault()

			pendingUrls.push(url)
		})
	})
}

app.on('activate', () => {
	restoreOrCreateWindow()
})

app.on('window-all-closed', () => {
	if (process.platform !== 'darwin') return
})
