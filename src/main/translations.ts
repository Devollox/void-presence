export type Language = 'ru' | 'en' | 'tr'

interface TranslationDict {
	[key: string]: string
}

export const mainTranslations: Record<Language, TranslationDict> = {
	ru: {
		'customStatus.ready': 'Пользовательский статус готов',
		'customStatus.noDiscordToken':
			'Пользовательский статус: не установлен Discord токен',
		'customStatus.rateLimit':
			'Лимит скорости пользовательского статуса. Повтор через: {retry}с',
		'customStatus.apiError':
			'Ошибка API пользовательского статуса ({status}): {error}',
		'customStatus.applyError':
			'Ошибка применения пользовательского статуса: {error}',
		'customStatus.processCheckError':
			'Пользовательский статус: ошибка проверки процесса Discord: {error}',
		'customStatus.loopError': 'Ошибка цикла пользовательского статуса: {error}',
		'customStatus.initError':
			'ошибка инициализации пользовательского статуса: {error}',
		'customStatus.readError':
			'Ошибка чтения пользовательского статуса: {error}',
		rpcReady: 'RPC клиент готов',
		rpcDisconnected: 'RPC соединение разорвано',
		rpcLoginError: 'Ошибка входа RPC: {error}',
		rpcActivityError: 'Ошибка SET_ACTIVITY: {error}',
		rpcNoClientId: 'Не указан Client ID или не настроены details & state',
		rpcConnecting: 'Подключение RPC Client ID: {clientId}',
		configRefreshError: 'Ошибка обновления конфигурации: {error}',
		persistOffsetSaveError: 'Не удалось сохранить persist offset: {error}',
		persistOffsetUpdateError: 'Не удалось обновить persist offset: {error}',
		updateCheckFailed: 'Проверка обновления не удалась: {error}',
		updateAvailable:
			'Доступна новая версия {tag}! (текущая: v{current}). Нажмите на иконку в трее для установки.',
		updateDownloadStarted: 'Загрузка обновителя: {fileName}...',
		updateDownloading: 'Загрузка обновления… {mb}MB ({percent}%)',
		updateDownloaded: 'Загружено {mb}MB',
		updateInvalidExe: 'Некорректный EXE: {size} bytes',
		updateHttpError: 'HTTP {status}',
		updateFailedReader: 'Не удалось получить reader из response body',
		currentVersion: `Void Presence v{version}`,
		supportDiscord: `Поддержка Discord: devollox`,
		logLevelError: 'ОШИБКА',
		logLevelSuccess: 'УСПЕХ',
		logLevelWarn: 'ПРЕДУПРЕЖДЕНИЕ',
		logLevelInfo: 'ИНФО',
		idle: 'Бездействие',
		waitingToStart: 'Ожидание запуска',
		updatingDiscordStatus: 'Обновление статуса Discord',
		customStatusRestarting: 'Перезапуск пользовательского статуса',
		lookingForDiscordProcess: 'Поиск процесса Discord',
		attachingRichPresence: 'Присоединение к Rich Presence',
		presenceIsBroadcasting: 'Презенс транслируется',
		lostConnectionToDiscord: 'Потеряно соединение с Discord',
		noClientId: 'Установите ID, циклы, обновление',
		active: 'АКТИВНО',
		unknown: 'НЕИЗВЕСТНО',
		details: 'ДЕТАЛИ',
		buttons: 'КНОПКИ',
		buttonName1: 'Имя кнопки #1',
		url1: 'URL #1',
		buttonName2Optional: 'Имя кнопки #2 (необязательно)',
		url2Optional: 'URL #2 (необязательно)',
		detailsPlaceholder: 'Детали',
		stateOptional: 'Состояние (необязательно)',
		labelOptional: 'Метка (необязательно)',
		durationSec: 'Длительность (сек)',
		current_party_size_optional: 'Текущий размер партии (необязательно)',
		max_party_size_optional: 'Максимальный размер партии (необязательно)',
		large_image_url: 'URL большого изображения (.png/.jpeg/.gif и т.д.)',
		large_hover_text_optional: 'Текст при наведении на большое (необязательно)',
		small_image_url_optional:
			'URL малого изображения (.png/.jpeg/.gif и т.д.) (необязательно)',
		small_hover_text_optional: 'Текст при наведении на малое (необязательно)',
		text: 'Текст',
		emoji_optional: 'Эмодзи (необязательно)',
	},
	en: {
		'customStatus.ready': 'Custom status ready',
		'customStatus.noDiscordToken': 'Custom status: no Discord token set',
		'customStatus.rateLimit': 'Custom status rate limit. Retry after: {retry}s',
		'customStatus.apiError': 'Custom status API error ({status}): {error}',
		'customStatus.applyError': 'Custom status apply error: {error}',
		'customStatus.processCheckError':
			'Custom status: Discord process check error: {error}',
		'customStatus.loopError': 'Custom status loop error: {error}',
		'customStatus.initError': 'custom status init error: {error}',
		'customStatus.readError': 'Custom status read error: {error}',
		rpcReady: 'RPC ready',
		rpcDisconnected: 'RPC disconnected',
		rpcLoginError: 'RPC login error: {error}',
		rpcActivityError: 'SET_ACTIVITY error: {error}',
		rpcNoClientId: 'No client ID or no details & state configured',
		rpcConnecting: 'Connecting RPC Client ID: {clientId}',
		configRefreshError: 'Config refresh error: {error}',
		persistOffsetSaveError: 'Failed to save persist offset: {error}',
		persistOffsetUpdateError: 'Failed to update persist offset: {error}',
		updateCheckFailed: 'Update check failed: {error}',
		updateAvailable:
			'New version {tag} available! (current: v{current}). Click the tray icon to install the update.',
		updateDownloadStarted: 'Downloading updater: {fileName}...',
		updateDownloading: 'Downloading update… {mb}MB ({percent}%)',
		updateDownloaded: 'Downloaded {mb}MB',
		updateInvalidExe: 'Invalid EXE: {size} bytes',
		updateHttpError: 'HTTP {status}',
		updateFailedReader: 'Failed to get reader from response body',
		currentVersion: `Void Presence v{version}`,
		supportDiscord: `Support Discord: devollox`,
		logLevelError: 'ERROR',
		logLevelSuccess: 'SUCCESS',
		logLevelWarn: 'WARNING',
		logLevelInfo: 'INFO',
		idle: 'Idle',
		waitingToStart: 'Waiting to start',
		updatingDiscordStatus: 'Updating Discord status',
		customStatusRestarting: 'Custom status is restarting',
		lookingForDiscordProcess: 'Looking for Discord process',
		attachingRichPresence: 'Attaching Rich Presence',
		presenceIsBroadcasting: 'Presence is broadcasting',
		lostConnectionToDiscord: 'Lost connection to Discord',
		noClientId: 'Set ID, cycles, update',
		active: 'ACTIVE',
		unknown: 'UNKNOWN',
		details: 'DETAILS',
		buttons: 'BUTTONS',
		buttonName1: 'Button Name #1',
		url1: 'URL #1',
		buttonName2Optional: 'Button Name #2 (optional)',
		url2Optional: 'URL #2 (optional)',
		detailsPlaceholder: 'Details',
		stateOptional: 'State (optional)',
		labelOptional: 'Label (optional)',
		durationSec: 'Duration (sec)',
		current_party_size_optional: 'Current party size (optional)',
		max_party_size_optional: 'Max party size (optional)',
		large_image_url: 'Large image URL (.png/.jpeg/.gif and etc)',
		large_hover_text_optional: 'Large hover text (optional)',
		small_image_url_optional:
			'Small image URL (.png/.jpeg/.gif and etc) (optional)',
		small_hover_text_optional: 'Small hover text (optional)',
		text: 'Text',
		emoji_optional: 'Emoji (optional)',
	},
	tr: {
		'customStatus.ready': 'Özel durum hazır',
		'customStatus.noDiscordToken': 'Özel durum: Discord token ayarlanmadı',
		'customStatus.rateLimit': 'Özel durum hız sınırı. Tekrar deneme: {retry}s',
		'customStatus.apiError': 'Özel durum API hatası ({status}): {error}',
		'customStatus.applyError': 'Özel durum uygulama hatası: {error}',
		'customStatus.processCheckError':
			'Özel durum: Discord süreci kontrol hatası: {error}',
		'customStatus.loopError': 'Özel durum döngü hatası: {error}',
		'customStatus.initError': 'özel durum başlatma hatası: {error}',
		'customStatus.readError': 'Özel durum okuma hatası: {error}',
		rpcReady: 'RPC hazır',
		rpcDisconnected: 'RPC bağlantı kesildi',
		rpcLoginError: 'RPC giriş hatası: {error}',
		rpcActivityError: 'SET_ACTIVITY hatası: {error}',
		rpcNoClientId: 'Client ID veya details & state yapılandırılmadı',
		rpcConnecting: 'RPC Client ID bağlanıyor: {clientId}',
		configRefreshError: 'Yapılandırma yenileme hatası: {error}',
		persistOffsetSaveError: 'Persist offset kaydedilemedi: {error}',
		persistOffsetUpdateError: 'Persist offset güncellenemedi: {error}',
		updateCheckFailed: 'Güncelleme kontrolü başarısız: {error}',
		updateAvailable:
			'Yeni sürüm {tag} mevcut! (şu anda: v{current}). Güncellemeyi yüklemek için tepsi simgesine tıklayın.',
		updateDownloadStarted: 'Güncelleyici indiriliyor: {fileName}...',
		updateDownloading: 'Güncelleme indiriliyor… {mb}MB ({percent}%)',
		updateDownloaded: 'İndirildi {mb}MB',
		updateInvalidExe: 'Geçersiz EXE: {size} bytes',
		updateHttpError: 'HTTP {status}',
		updateFailedReader: "Response body'den reader alınamadı",
		currentVersion: `Void Presence v{version}`,
		supportDiscord: `Destek Discord: devollox`,
		logLevelError: 'HATA',
		logLevelSuccess: 'BAŞARILI',
		logLevelWarn: 'UYARI',
		logLevelInfo: 'BİLGİ',
		idle: 'Boşta',
		waitingToStart: 'Başlamayı bekliyor',
		updatingDiscordStatus: 'Discord durumu güncelleniyor',
		customStatusRestarting: 'Özel durum yeniden başlatılıyor',
		lookingForDiscordProcess: 'Discord süreci aranıyor',
		attachingRichPresence: 'Rich Presence ekleniyor',
		presenceIsBroadcasting: 'Varlık yayınlanıyor',
		lostConnectionToDiscord: "Discord'a bağlantı kaybedildi",
		noClientId: 'ID, döngüler, güncelleme ayarlayın',
		active: 'AKTİF',
		unknown: 'BİLİNMEYEN',
		details: 'DETAYLAR',
		buttons: 'DÜĞMELER',
		buttonName1: 'Düğme Adı #1',
		url1: 'URL #1',
		buttonName2Optional: 'Düğme Adı #2 (isteğe bağlı)',
		url2Optional: 'URL #2 (isteğe bağlı)',
		detailsPlaceholder: 'Detaylar',
		stateOptional: 'Durum (isteğe bağlı)',
		labelOptional: 'Etiket (isteğe bağlı)',
		durationSec: 'Süre (sn)',
		current_party_size_optional: 'Mevcut parti boyutu (isteğe bağlı)',
		max_party_size_optional: 'Maksimum parti boyutu (isteğe bağlı)',
		large_image_url: 'Büyük resim URL (.png/.jpeg/.gif ve diğer)',
		large_hover_text_optional: 'Büyük resim üzerine fare metni (isteğe bağlı)',
		small_image_url_optional:
			'Küçük resim URL (.png/.jpeg/.gif ve diğer) (isteğe bağlı)',
		small_hover_text_optional: 'Küçük resim üzerine fare metni (isteğe bağlı)',
		text: 'Metin',
		emoji_optional: 'Emoji (isteğe bağlı)',
	},
}

let currentLang: Language = 'en'

export function setMainLanguage(lang: Language): void {
	currentLang = lang
}

export function getCurrentLanguage(): Language {
	return currentLang
}

export function t(
	key: string,
	replacements: Record<string, string> = {},
): string {
	const msg =
		mainTranslations[currentLang][key] || mainTranslations.en[key] || key

	let result = msg
	for (const [key, value] of Object.entries(replacements)) {
		result = result.replace(`{${key}}`, value)
	}
	return result
}
