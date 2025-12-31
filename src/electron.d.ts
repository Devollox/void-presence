export {}

declare global {
	interface Window {
		electronAPI?: {
			onLogMessage?: (handler: (entry: unknown) => void) => void
			onRpcUpdate?: (handler: (payload: unknown) => void) => void
			onRpcStatus?: (handler: (status: string) => void) => void
			setClientId?: (id: string) => Promise<void>
			setButtons?: (pairs: unknown[]) => Promise<void>
			setButtonPairs?: (pairs: unknown[]) => Promise<void>
			setCycles?: (cycles: unknown[]) => Promise<void>
			setImageCycles?: (cycles: unknown[]) => Promise<void>
			setActivityInterval?: (sec: number) => Promise<void>
			restartDiscordRich?: () => Promise<void>
			stopDiscordRich?: () => Promise<void>
			setAutoLaunch?: (on: boolean) => Promise<void>
			setAutoHide?: (on: boolean) => Promise<void>
			windowClose?: () => void
			windowMinimize?: () => void
			uploadConfig?: (config: unknown) => Promise<unknown>
		}
		voidPresenceCtx?: {
			buttonPairs: ButtonPair[]
			cycles: CycleEntry[]
			imageCycles: ImageCycleEntry[]
			renderButtonPairs: () => void
			renderCycles: () => void
			renderImageCycles: () => void
		}
	}
}
