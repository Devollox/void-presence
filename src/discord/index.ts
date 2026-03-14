import { stopDiscordRich as stopDiscordRichAdvanced } from './modules/rpc_advanced'
import { stopDiscordRich as stopDiscordRichBasic } from './modules/rpc_basic'

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
} from './modules/rpc_basic'

export {
	resetPersistTimestampValue as resetPersistTimestampValueAdvanced,
	setActivityInterval as setActivityIntervalAdvanced,
	default as startDiscordRichAdvanced,
	stopDiscordRich as stopDiscordRichAdvanced,
} from './modules/rpc_advanced'

export function stopDiscordRich() {
	try {
		stopDiscordRichBasic()
	} catch {}
	try {
		stopDiscordRichAdvanced()
	} catch {}
}
