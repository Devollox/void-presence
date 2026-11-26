import { BrowserWindow, app, ipcMain, nativeTheme, screen, shell } from 'electron'
import * as path from 'path'
import { readSettings } from './config'

let mainWindow: BrowserWindow | null = null
let hasShownOnce = false

export function getMainWindow() {
	return mainWindow
}

function getAssetPath(...segments: string[]) {
	const appPath = app.isPackaged ? app.getAppPath() : process.cwd()
	return path.join(appPath, ...segments)
}

const iconPath = getAssetPath('public', 'favicons', 'logo.png')

const THEME_BG: Record<string, string> = {
	dark: '#09090a',
	light: '#efeff0',
}

export async function createMainWindow(autoHideOnStart: boolean, isQuitting: () => boolean) {
	const settings = await readSettings()
	const systemTheme = nativeTheme.shouldUseDarkColors ? 'dark' : 'light'
	const backgroundColor = THEME_BG[settings.theme ?? systemTheme]
	const shouldShow = !autoHideOnStart

	const { width, height } = screen.getPrimaryDisplay().workAreaSize

	mainWindow = new BrowserWindow({
		icon: iconPath,
		frame: false,
		titleBarStyle: 'hidden',
		show: false,
		backgroundColor,
		width,
		height,
		x: 0,
		y: 0,
		webPreferences: {
			preload: path.join(__dirname, 'preload.js'),
			nodeIntegration: false,
			contextIsolation: true,
		},
	})

	mainWindow.setMenuBarVisibility(false)

	mainWindow.webContents.setWindowOpenHandler(({ url }) => {
		try {
			const parsed = new URL(url)

			const isSecureUrl =
				parsed.protocol === 'https:' && !parsed.username && !parsed.password && !parsed.port

			const isSite = parsed.hostname === 'voidpresence.com'

			const isDiscordInvite = parsed.hostname === 'discord.gg' && parsed.pathname === '/9FEkxGPPmu'

			if (isSecureUrl && (isSite || isDiscordInvite)) {
				void shell.openExternal(parsed.href).catch(error => {
					console.error('[external-link:open]', error)
				})
			}
		} catch (error) {
			console.error('[external-link:invalid-url]', error)
		}

		return { action: 'deny' }
	})

	mainWindow.loadFile('src/renderer/index.html')

	const capturedWindow = mainWindow
	const onReady = () => {
		ipcMain.off('renderer:ready', onReady)
		if (!capturedWindow || capturedWindow.isDestroyed()) return
		if (shouldShow) {
			if (!hasShownOnce) {
				capturedWindow.maximize()
				hasShownOnce = true
			}
			capturedWindow.show()
			capturedWindow.focus()
		}
	}
	ipcMain.on('renderer:ready', onReady)

	mainWindow.on('close', ev => {
		if (!isQuitting()) {
			ev.preventDefault()
			mainWindow?.hide()
			return
		}
	})

	mainWindow.on('show', () => {
		if (!hasShownOnce) {
			mainWindow?.maximize()
			hasShownOnce = true
		}
	})

	return mainWindow
}
