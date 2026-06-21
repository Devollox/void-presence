const { SMTCMonitor } = require('@coooookies/windows-smtc-monitor')
const { parentPort } = require('worker_threads')

const POLL_INTERVAL_MS = 7000

function mapPlaybackStatus(status) {
	if (status === 0) return 'Closed'
	if (status === 1) return 'Opened'
	if (status === 2) return 'Changing'
	if (status === 3) return 'Stopped'
	if (status === 4) return 'Playing'
	if (status === 5) return 'Paused'
	return 'Unknown'
}

function mapPlaybackType(type) {
	if (type === 0) return 'Unknown'
	if (type === 1) return 'Music'
	if (type === 2) return 'Video'
	if (type === 3) return 'Image'
	return 'Unknown'
}

function getPngSize(buf) {
	if (!buf) return null
	const b = Buffer.isBuffer(buf) ? buf : Buffer.from(buf)
	if (b.length < 24) return null
	if (
		b[0] !== 0x89 ||
		b[1] !== 0x50 ||
		b[2] !== 0x4e ||
		b[3] !== 0x47 ||
		b[4] !== 0x0d ||
		b[5] !== 0x0a ||
		b[6] !== 0x1a ||
		b[7] !== 0x0a
	) {
		return null
	}
	const width = b.readUInt32BE(16)
	const height = b.readUInt32BE(20)
	return { width, height, size: b.length }
}

function isProbablyMusicFromThumb(thumb) {
	if (!thumb) return false
	return thumb.width === thumb.height
}

function isProbablyVideoFromThumb(thumb) {
	if (!thumb) return false
	const ratio = thumb.width / thumb.height
	return ratio > 1.6 && ratio < 1.9
}

function postNowPlaying(info) {
	if (parentPort) parentPort.postMessage({ type: 'nowPlaying', data: info })
}

function postSmtcError(err) {
	if (!parentPort) return
	parentPort.postMessage({
		type: 'smtcError',
		error: err && err.message ? String(err.message) : String(err),
	})
}

function safeGetCurrentMediaSession() {
	try {
		return SMTCMonitor.getCurrentMediaSession()
	} catch (e) {
		postSmtcError(e)
		return null
	}
}

function classifyThumbByKnownSizes(thumb) {
	if (!thumb) return { isMusic: false, isVideo: false }

	const { width, height } = thumb

	if ((width === 150 && height === 150) || (width === 120 && height === 120)) {
		return { isMusic: true, isVideo: false }
	}

	if ((width === 256 && height === 256) || (width === 150 && height === 83)) {
		return { isMusic: false, isVideo: true }
	}

	return { isMusic: null, isVideo: null }
}

function calcNowPlaying() {
	const now = Date.now()
	const session = safeGetCurrentMediaSession()

	if (!session) {
		postNowPlaying(null)
		return null
	}

	const { media, sourceAppId, timeline, playback, lastUpdatedTime } = session
	const title = (media && media.title) || ''
	const artist = (media && media.artist) || ''

	if (!title) {
		postNowPlaying(null)
		return null
	}

	let startedAt = null
	let endsAt = null
	let position = null
	let duration = null

	if (timeline) {
		position = typeof timeline.position === 'number' ? timeline.position : null
		duration = typeof timeline.duration === 'number' ? timeline.duration : null

		if (typeof position === 'number') {
			startedAt = now - position * 1000
			if (typeof duration === 'number' && duration > 0) {
				endsAt = startedAt + duration * 1000
			}
		}
	}

	const thumbInfo = getPngSize(media && media.thumbnail ? media.thumbnail : null)
	const known = classifyThumbByKnownSizes(thumbInfo)

	let isThumbMusic
	let isThumbVideo

	if (known.isMusic !== null || known.isVideo !== null) {
		isThumbMusic = known.isMusic
		isThumbVideo = known.isVideo
	} else {
		isThumbMusic = isProbablyMusicFromThumb(thumbInfo)
		isThumbVideo = isProbablyVideoFromThumb(thumbInfo)
	}

	let playbackStatus = null
	let playbackType = null

	if (playback) {
		if (typeof playback.playbackStatus === 'number') {
			playbackStatus = mapPlaybackStatus(playback.playbackStatus)
		}
		if (typeof playback.playbackType === 'number') {
			playbackType = mapPlaybackType(playback.playbackType)
		}
	}

	const info = {
		sourceAppId: sourceAppId || 'Player',
		lastUpdatedTime,
		title,
		artist,
		albumTitle: (media && media.albumTitle) || '',
		albumArtist: (media && media.albumArtist) || '',
		genres: (media && media.genres) || [],
		playbackStatus,
		playbackType,
		position,
		duration,
		startedAt,
		endsAt,
		thumbnail: thumbInfo,
		isThumbMusic,
		isThumbVideo,
		timeline,
	}

	postNowPlaying(info)
	return info
}

if (!parentPort) {
	process.exit(1)
}

parentPort.on('message', msg => {
	if (msg === 'getNowPlaying') {
		calcNowPlaying()
	}
})

setInterval(() => {
	calcNowPlaying()
}, POLL_INTERVAL_MS)
