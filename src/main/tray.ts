import { Menu, Tray, app } from 'electron'
import * as path from 'path'
import startDiscordRich, { stopDiscordRich } from '../discord'
import { sendStatus } from './logging'
import { getMainWindow } from './window'

let tray: Tray | null = null

function getAssetPath(...segments: string[]) {
	const appPath = app.isPackaged ? app.getAppPath() : process.cwd()
	return path.join(appPath, ...segments)
}

const iconPath = getAssetPath('public', 'favicons', 'dark-fav.png')

function showOrCreateWindow(create: () => void) {
	const win = getMainWindow()
	if (!win || win.isDestroyed()) {
		create()
		return
	}
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
			click: () => {
				showOrCreateWindow(createWindow)
			},
		},
		{
			label: 'Restart Presence',
			accelerator: 'CmdOrCtrl+R',
			click: () => {
				const win = getMainWindow()
				if (!win || win.isDestroyed()) return
				sendStatus('RESTARTING')
				stopDiscordRich()
				startDiscordRich(payload => {
					if (win.isDestroyed()) return
					win.webContents.send('rpc-update', payload)
				})
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
	tray.on('click', () => {
		showOrCreateWindow(createWindow)
	})
	tray.on('double-click', () => {
		showOrCreateWindow(createWindow)
	})
}
