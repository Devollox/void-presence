import { stopDiscordRich as stopDiscordRichAdvancedModule } from './modules/rpc'

export {
	readClientConfig,
	setButtonsConfig,
	setClientId,
	setCycles,
	setImageCyclesConfig,
	setPartyConfig,
	setTimestampConfig,
} from '../main/config'

export {
	resetPersistTimestampValue as resetPersistTimestampValueAdvanced,
	setActivityInterval as setActivityIntervalAdvanced,
	default as startDiscordRichAdvanced,
	stopDiscordRich as stopDiscordRichAdvanced,
} from './modules/rpc'

export function stopDiscordRich() {
	try {
		stopDiscordRichAdvancedModule()
	} catch {}
}
