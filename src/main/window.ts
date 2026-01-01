import { BrowserWindow, app } from 'electron'
import * as path from 'path'
import startDiscordRich from '../discord'
import { sendStatus } from './logging'

let mainWindow: BrowserWindow | null = null

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
	isQuitting: () => boolean
) {
	const shouldShow = !autoHideOnStart

	mainWindow = new BrowserWindow({
		width: 480,
		height: 640,
		icon: iconPath,
		frame: false,
		resizable: false,
		titleBarStyle: 'hidden',
		backgroundColor: '#000000',
		show: false,
		webPreferences: {
			preload: path.join(__dirname, 'preload.js'),
			nodeIntegration: false,
			contextIsolation: true,
		},
	})

	mainWindow.setMenuBarVisibility(false)
	mainWindow.loadFile('src/renderer/index.html')

	if (shouldShow) {
		mainWindow.once('ready-to-show', () => {
			if (!mainWindow || mainWindow.isDestroyed()) return
			mainWindow.show()
		})
	}

	sendStatus('RESTARTING')

	startDiscordRich(payload => {
		if (!mainWindow || mainWindow.isDestroyed()) return
		mainWindow.webContents.send('rpc-update', payload)
	})

	mainWindow.on('close', ev => {
		if (!isQuitting()) {
			ev.preventDefault()
			mainWindow?.hide()
			return
		}
	})

	return mainWindow
}
