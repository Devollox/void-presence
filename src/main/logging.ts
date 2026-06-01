import { BrowserWindow } from 'electron'
import { LogLevel } from 'src/types/types'

export function sendStatus(status: string) {
	const win = BrowserWindow.getAllWindows()[0]
	if (!win || win.isDestroyed()) return
	win.webContents.send('rpc-status', status)
}

export function sendStatusCustom(status: string) {
	const win = BrowserWindow.getAllWindows()[0]
	if (!win || win.isDestroyed()) return
	win.webContents.send('status-status', status)
}

export function sendStatusCustomPayload(text: string | null) {
	const win = BrowserWindow.getAllWindows()[0]
	if (!win || win.isDestroyed()) return
	win.webContents.send('status-payload', text)
}

export function sendLog(message: string, level: LogLevel = 'info') {
	const win = BrowserWindow.getAllWindows()[0]
	if (!win || win.isDestroyed()) return
	win.webContents.send('log-message', { message, level })
}
