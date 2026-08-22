import { app, BrowserWindow, Menu, Tray } from 'electron'
import * as path from 'path'
import { stopDiscordRich } from '../discord'
import { startDiscordRichLogic } from './ipc'
import { sendStatus } from './logging'
import { checkForUpdates } from './updates'
import { getMainWindow } from './window'

let tray: Tray | null = null

function getAssetPath(...segments: string[]) {
	const appPath = app.isPackaged ? app.getAppPath() : process.cwd()
	return path.join(appPath, ...segments)
}

const iconPath = getAssetPath('public', 'favicons', 'logo.png')

function showOrCreateWindow(create: () => void) {
	let win = getMainWindow()

	if (!win || win.isDestroyed()) {
		create()
		win = getMainWindow()
	}

	if (!win || win.isDestroyed()) return

	if (win.isMinimized()) win.restore()

	win.show()
	win.focus()
}

export function createTray(createWindow: () => void, markQuitting: () => void) {
	const contextMenu = Menu.buildFromTemplate([
		{ label: 'Void Presence', enabled: false },
		{ type: 'separator' },
		{
			label: 'Show Window',
			accelerator: 'CmdOrCtrl+,',
			click: () => showOrCreateWindow(createWindow),
		},
		{
			label: 'Restart Presence',
			accelerator: 'CmdOrCtrl+R',
			click: async () => {
				const win = getMainWindow() || BrowserWindow.getAllWindows()[0]
				if (!win || win.isDestroyed()) return
				stopDiscordRich()

				startDiscordRichLogic(payload => {
					if (win.isDestroyed()) return
					win.webContents.send('rpc-update', payload)
				})
			},
		},
		{
			label: 'Stop Presence',
			accelerator: 'CmdOrCtrl+D',
			click: async () => {
				const win = getMainWindow() || BrowserWindow.getAllWindows()[0]
				if (!win || win.isDestroyed()) return
				stopDiscordRich()
				sendStatus('RPC_DISABLED')
			},
		},
		{ type: 'separator' },
		{
			label: 'Check Updates',
			accelerator: 'CmdOrCtrl+U',
			click: () => {
				showOrCreateWindow(createWindow)
				checkForUpdates({ log: false })
			},
		},
		{ type: 'separator' },
		{
			label: 'Quit',
			accelerator: 'CmdOrCtrl+Q',
			click: () => {
				markQuitting()
				stopDiscordRich()
				app.quit()
			},
		},
	])

	tray = new Tray(iconPath)
	tray.setToolTip('Void Presence')
	tray.setContextMenu(contextMenu)
	tray.on('click', () => showOrCreateWindow(createWindow))
	tray.on('double-click', () => showOrCreateWindow(createWindow))
}
