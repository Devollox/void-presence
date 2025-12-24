import { app, BrowserWindow, ipcMain, Menu, Tray } from 'electron'
import * as path from 'path'
import startDiscordRich, {
	setButtonsConfig,
	setClientId,
	setCycles,
	setImageCyclesConfig,
	stopDiscordRich,
} from './discord'

let mainWindow: BrowserWindow | null = null
let tray: Tray | null = null

function getAssetPath(...segments: string[]) {
	const appPath = app.isPackaged ? app.getAppPath() : process.cwd()
	return path.join(appPath, ...segments)
}

const iconPath = getAssetPath('public', 'favicons', 'dark-fav.png')

function sendStatus(status: string) {
	const win = BrowserWindow.getAllWindows()[0]
	if (!win || win.isDestroyed()) return
	win.webContents.send('rpc-status', status)
}

function createWindow() {
	mainWindow = new BrowserWindow({
		width: 480,
		height: 640,
		resizable: false,
		icon: iconPath,
		frame: false,
		titleBarStyle: 'hidden',
		backgroundColor: '#000000',
		webPreferences: {
			preload: path.join(__dirname, 'preload.js'),
			nodeIntegration: false,
			contextIsolation: true,
		},
	})

	mainWindow.setMenuBarVisibility(false)
	mainWindow.loadFile('index.html')

	sendStatus('DISABLED')

	startDiscordRich(
		(payload: any) => {
			if (!mainWindow || mainWindow.isDestroyed()) return
			mainWindow.webContents.send('rpc-update', payload)
		},
		(status: string) => {
			sendStatus(status)
		}
	)

	mainWindow.on('close', ev => {
		ev.preventDefault()
		BrowserWindow.getAllWindows().forEach(w => {
			if (!w.isMinimized()) {
				w.hide()
			}
		})
	})
}

function createTray() {
	const contextMenu = Menu.buildFromTemplate([
		{ label: 'Cosmic Rich Presence', enabled: false },
		{ type: 'separator' },
		{
			label: 'Show Window',
			accelerator: 'CmdOrCtrl+,',
			click: () => {
				const win = BrowserWindow.getAllWindows()[0]
				if (win) {
					if (win.isMinimized()) win.restore()
					win.show()
					win.focus()
				}
			},
		},
		{
			label: 'Restart Presence',
			accelerator: 'CmdOrCtrl+R',
			click: () => {
				const win = BrowserWindow.getAllWindows()[0]
				if (win && !win.isDestroyed()) {
					sendStatus('RESTARTING')
					stopDiscordRich()
					startDiscordRich(
						payload => {
							if (win.isDestroyed()) return
							win.webContents.send('rpc-update', payload)
						},
						status => {
							sendStatus(status)
						}
					)
				}
			},
		},
		{ type: 'separator' },
		{
			label: 'Quit',
			accelerator: 'CmdOrCtrl+Q',
			click: () => {
				BrowserWindow.getAllWindows().forEach(w => w.destroy())
				stopDiscordRich()
				app.quit()
			},
		},
	])

	tray = new Tray(iconPath)
	tray.setToolTip('Cosmic Rich Presence')
	tray.setContextMenu(contextMenu)
	tray.on('click', () => {
		const win = BrowserWindow.getAllWindows()[0]
		if (win) {
			if (win.isMinimized()) win.restore()
			win.show()
			win.focus()
		}
	})
	tray.on('double-click', () => {
		const win = BrowserWindow.getAllWindows()[0]
		if (win) {
			if (win.isMinimized()) win.restore()
			win.show()
			win.focus()
		}
	})
}

app.whenReady().then(() => {
	createWindow()
	createTray()
})

app.on('activate', () => {
	const window = BrowserWindow.getAllWindows()[0]
	if (window) {
		window.show()
	} else {
		createWindow()
	}
})

ipcMain.handle('restart-discord-rich', async () => {
	const win = BrowserWindow.getAllWindows()[0]
	if (!win || win.isDestroyed()) return
	sendStatus('RESTARTING')
	stopDiscordRich()
	startDiscordRich(
		(payload: any) => {
			if (win.isDestroyed()) return
			win.webContents.send('rpc-update', payload)
		},
		(status: string) => {
			sendStatus(status)
		}
	)
})

ipcMain.handle('set-client-id', async (_event, clientId: string) => {
	await setClientId(clientId)
	return true
})

ipcMain.handle(
	'set-image-cycles',
	async (
		_event,
		cycles: {
			largeImage: string
			largeText: string
			smallImage: string
			smallText: string
		}[]
	) => {
		await setImageCyclesConfig(cycles)
		return true
	}
)

ipcMain.handle(
	'set-buttons',
	async (
		_event,
		pairs: {
			label1: string
			url1: string
			label2: string
			url2: string
		}[]
	) => {
		await setButtonsConfig(pairs)
		return true
	}
)

ipcMain.handle(
	'set-cycles',
	async (_event, entries: { details: string; state: string }[]) => {
		await setCycles(entries)
		return true
	}
)

function setAutoLaunch(enabled: boolean) {
	app.setLoginItemSettings({
		openAtLogin: enabled,
		path: app.getPath('exe'),
		args: [],
	})
}

ipcMain.handle('set-auto-launch', async (_event, enabled: boolean) => {
	setAutoLaunch(enabled)
	return true
})

ipcMain.handle('window-close', () => {
	const win = BrowserWindow.getAllWindows()[0]
	if (win && !win.isDestroyed()) {
		win.close()
	}
})

ipcMain.handle('window-minimize', () => {
	const win = BrowserWindow.getAllWindows()[0]
	if (win && !win.isDestroyed()) {
		win.minimize()
	}
})
