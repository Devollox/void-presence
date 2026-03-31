import { stopDiscordRich as stopDiscordRichAdvancedModule } from './modules/rpc-advanced'
import { stopDiscordRich as stopDiscordRichBasicModule } from './modules/rpc-basic'

export {
	readClientConfig,
	setButtonsConfig,
	setClientId,
	setCycles,
	setImageCyclesConfig,
	setPartyConfig,
	setTimestampConfig,
} from './modules/config'

export {
	resetPersistTimestampValue as resetPersistTimestampValueBasic,
	setActivityInterval as setActivityIntervalBasic,
	default as startDiscordRichBasic,
	stopDiscordRich as stopDiscordRichBasic,
} from './modules/rpc-basic'

export {
	resetPersistTimestampValue as resetPersistTimestampValueAdvanced,
	setActivityInterval as setActivityIntervalAdvanced,
	default as startDiscordRichAdvanced,
	stopDiscordRich as stopDiscordRichAdvanced,
} from './modules/rpc-advanced'

export function stopDiscordRich() {
	try {
		stopDiscordRichBasicModule()
	} catch {}
	try {
		stopDiscordRichAdvancedModule()
	} catch {}
}
