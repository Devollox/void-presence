import { contextBridge, ipcRenderer } from 'electron'

contextBridge.exposeInMainWorld('electronAPI', {
	restartDiscordRich: () => ipcRenderer.invoke('restart-discord-rich'),
	stopDiscordRich: () => ipcRenderer.invoke('stop-discord-rich'),
	onRpcUpdate: (callback: (payload: any) => void) => {
		ipcRenderer.on('rpc-update', (_event, payload) => callback(payload))
	},
	onRpcStatus: (callback: (status: string) => void) => {
		ipcRenderer.on('rpc-status', (_event, status) => callback(status))
	},
	setClientId: (clientId: string) =>
		ipcRenderer.invoke('set-client-id', clientId),
	setAutoLaunch: (enabled: boolean) =>
		ipcRenderer.invoke('set-auto-launch', enabled),
	setImageCycles: (
		cycles: {
			largeImage: string
			largeText: string
			smallImage: string
			smallText: string
		}[]
	) => ipcRenderer.invoke('set-image-cycles', cycles),
	setButtons: (
		pairs: { label1: string; url1: string; label2: string; url2: string }[]
	) => ipcRenderer.invoke('set-buttons', pairs),
	setCycles: (entries: { details: string; state: string }[]) =>
		ipcRenderer.invoke('set-cycles', entries),
	windowClose: () => ipcRenderer.invoke('window-close'),
	windowMinimize: () => ipcRenderer.invoke('window-minimize'),
	onLogMessage: (callback: (msg: string) => void) => {
		ipcRenderer.on('log-message', (_event, msg) => callback(msg))
	},
	setAutoHide: (value: boolean) => ipcRenderer.invoke('set-auto-hide', value),
	getAutoHide: () => ipcRenderer.invoke('get-auto-hide'),
})
