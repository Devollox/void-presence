import * as dotenv from 'dotenv'
import { app, BrowserWindow, ipcMain, Menu, Tray } from 'electron'
import * as fs from 'fs'
import * as path from 'path'
import startDiscordRich, {
	setActivityInterval,
	setButtonsConfig,
	setClientId,
	setCycles,
	setImageCyclesConfig,
	stopDiscordRich,
} from './discord'
dotenv.config()

let mainWindow: BrowserWindow | null = null
let tray: Tray | null = null
let autoHideOnStart = false
let isQuitting = false

function getAssetPath(...segments: string[]) {
	const appPath = app.isPackaged ? app.getAppPath() : process.cwd()
	return path.join(appPath, ...segments)
}

const iconPath = getAssetPath('public', 'favicons', 'dark-fav.png')
const settingsPath = path.join(app.getPath('userData'), 'settings.json')

function loadSettings(): { autoHideOnStart?: boolean } {
	try {
		const raw = fs.readFileSync(settingsPath, 'utf-8')
		return JSON.parse(raw)
	} catch {
		return {}
	}
}

function saveSettings(data: { autoHideOnStart?: boolean }) {
	try {
		fs.writeFileSync(settingsPath, JSON.stringify(data, null, 2), 'utf-8')
	} catch {}
}

function setAutoHide(enabled: boolean) {
	autoHideOnStart = !!enabled
	const current = loadSettings()
	saveSettings({ ...current, autoHideOnStart })
}

function sendStatus(status: string) {
	const win = BrowserWindow.getAllWindows()[0]
	if (!win || win.isDestroyed()) return
	win.webContents.send('rpc-status', status)
}

function sendLog(message: string) {
	const win = BrowserWindow.getAllWindows()[0]
	if (!win || win.isDestroyed()) return
	win.webContents.send('log-message', message)
}

function createWindow() {
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
	mainWindow.loadFile('index.html')

	if (shouldShow) {
		mainWindow.once('ready-to-show', () => {
			if (!mainWindow || mainWindow.isDestroyed()) return
			mainWindow.show()
		})
	}

	sendStatus('RESTARTING')

	startDiscordRich(
		(payload: any) => {
			if (!mainWindow || mainWindow.isDestroyed()) return
			mainWindow.webContents.send('rpc-update', payload)
		},
		(status: string) => {
			sendStatus(status)
		},
		(message: string) => {
			sendLog(message)
		}
	)

	mainWindow.on('close', ev => {
		if (!isQuitting) {
			ev.preventDefault()
			mainWindow?.hide()
			return
		}
	})
}

function showOrCreateWindow() {
	if (!mainWindow || mainWindow.isDestroyed()) {
		createWindow()
		return
	}
	if (mainWindow.isMinimized()) mainWindow.restore()
	mainWindow.show()
	mainWindow.focus()
}

function createTray() {
	const contextMenu = Menu.buildFromTemplate([
		{ label: 'Void Presence', enabled: false },
		{ type: 'separator' },
		{
			label: 'Show Window',
			accelerator: 'CmdOrCtrl+,',
			click: () => {
				showOrCreateWindow()
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
						},
						message => {
							sendLog(message)
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
				isQuitting = true
				BrowserWindow.getAllWindows().forEach(w => w.destroy())
				stopDiscordRich()
				app.quit()
			},
		},
	])

	tray = new Tray(iconPath)
	tray.setToolTip('Void Presence')
	tray.setContextMenu(contextMenu)
	tray.on('click', () => {
		showOrCreateWindow()
	})
	tray.on('double-click', () => {
		showOrCreateWindow()
	})
}

function setAutoLaunch(enabled: boolean) {
	app.setLoginItemSettings({
		openAtLogin: enabled,
		path: app.getPath('exe'),
		args: [],
	})
}

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
		},
		(message: string) => {
			sendLog(message)
		}
	)
})

ipcMain.handle('stop-discord-rich', async () => {
	stopDiscordRich()
	sendStatus('DISABLED')
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

ipcMain.handle('set-auto-launch', async (_event, enabled: boolean) => {
	setAutoLaunch(enabled)
	return true
})

ipcMain.handle('set-auto-hide', async (_event, enabled: boolean) => {
	setAutoHide(enabled)
	return true
})

ipcMain.handle('get-auto-hide', async () => {
	const s = loadSettings()
	return !!s.autoHideOnStart
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

ipcMain.handle('set-activity-interval', async (_event, sec: number) => {
	await setActivityInterval(sec)
	return true
})

ipcMain.handle('upload-config', async (event, config) => {
	try {
		const response = await fetch(
			`${process.env.FIREBASE_DB_URL}/configs.json`,
			{
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					title: config.title,
					author: config.author,
					description: config.description,
					configData: config.configData,
					downloads: 0,
					uploadedAt: Date.now(),
				}),
			}
		)

		if (!response.ok) throw new Error(`HTTP ${response.status}`)

		const result = await response.json()
		return Object.keys(result)[0] || 'unknown'
	} catch (error) {
		throw error
	}
})

app.on('before-quit', () => {
	isQuitting = true
})

app.whenReady().then(() => {
	const initialSettings = loadSettings()
	autoHideOnStart = !!initialSettings.autoHideOnStart
	if (!autoHideOnStart) {
		createWindow()
	}
	createTray()
})

app.on('activate', () => {
	if (!mainWindow || mainWindow.isDestroyed()) {
		createWindow()
	} else {
		mainWindow.show()
	}
})

app.on('window-all-closed', () => {
	if (process.platform !== 'darwin') {
		app.quit()
	}
})
