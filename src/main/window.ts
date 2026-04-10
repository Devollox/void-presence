import { BrowserWindow, app, screen } from 'electron'
import * as path from 'path'

let mainWindow: BrowserWindow | null = null
let hasShownOnce = false

export function getMainWindow() {
	return mainWindow
}

function getAssetPath(...segments: string[]) {
	const appPath = app.isPackaged ? app.getAppPath() : process.cwd()
	return path.join(appPath, ...segments)
}

const iconPath = getAssetPath('public', 'favicons', 'dark-fav.png')

export function createMainWindow(
	autoHideOnStart: boolean,
	isQuitting: () => boolean,
) {
	const shouldShow = !autoHideOnStart

	const { width, height } = screen.getPrimaryDisplay().workAreaSize

	mainWindow = new BrowserWindow({
		icon: iconPath,
		frame: false,
		titleBarStyle: 'hidden',
		backgroundColor: '#000000',
		show: shouldShow,
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
	mainWindow.loadFile('src/renderer/index.html')

	mainWindow.webContents.once('did-finish-load', () => {
		if (!autoHideOnStart && !hasShownOnce) {
			mainWindow?.maximize()
			hasShownOnce = true
		}
	})

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
