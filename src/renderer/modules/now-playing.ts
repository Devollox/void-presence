export type NowPlayingInfo = {
	sourceAppId: string
	lastUpdatedTime: number | null
	title: string
	artist: string
	albumTitle: string
	albumArtist: string
	genres: string[]
	playbackStatus: string | null
	playbackType: string | null
	position: number | null
	duration: number | null
	startedAt: number | null
	endsAt: number | null
} | null

export async function fetchNowPlaying(): Promise<NowPlayingInfo> {
	if (!window.electronAPI?.invoke) {
		return null
	}

	try {
		const raw: any = await window.electronAPI.invoke('get-now-playing')

		if (!raw || typeof raw !== 'object') return null

		return {
			sourceAppId: raw.sourceAppId || 'Player',
			lastUpdatedTime:
				typeof raw.lastUpdatedTime === 'number' ? raw.lastUpdatedTime : null,
			title: raw.title || '',
			artist: raw.artist || '',
			albumTitle: raw.albumTitle || '',
			albumArtist: raw.albumArtist || '',
			genres: Array.isArray(raw.genres) ? raw.genres : [],
			playbackStatus:
				typeof raw.playbackStatus === 'string' ? raw.playbackStatus : null,
			playbackType:
				typeof raw.playbackType === 'string' ? raw.playbackType : null,
			position: typeof raw.position === 'number' ? raw.position : null,
			duration: typeof raw.duration === 'number' ? raw.duration : null,
			startedAt: typeof raw.startedAt === 'number' ? raw.startedAt : null,
			endsAt: typeof raw.endsAt === 'number' ? raw.endsAt : null,
		}
	} catch (e) {
		console.log('[SMTC] fetchNowPlaying error:', e)
		return null
	}
}
