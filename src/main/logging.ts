import { BrowserWindow } from 'electron'

export type LogLevel = 'info' | 'warn' | 'error'

export function sendStatus(status: string) {
	const win = BrowserWindow.getAllWindows()[0]
	if (!win || win.isDestroyed()) return
	win.webContents.send('rpc-status', status)
}

export function sendLog(message: string, level: LogLevel = 'info') {
	const win = BrowserWindow.getAllWindows()[0]
	if (!win || win.isDestroyed()) return
	win.webContents.send('log-message', { message, level })
}
