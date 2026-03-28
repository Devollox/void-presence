const { SMTCMonitor } = require('@coooookies/windows-smtc-monitor')
const { parentPort } = require('worker_threads')
const fs = require('fs')
const path = require('path')

const userData =
	process.env.SMTC_USER_DATA ||
	path.join(process.env.APPDATA || '', 'Void Presence')

const nowPlayingPath = path.join(userData, 'now-playing.json')

let lastSession = null
let lastSessionTime = 0
const SESSION_CACHE_MS = 2000

function ensureDir() {
	try {
		fs.mkdirSync(userData, { recursive: true })
	} catch {}
}

function saveNowPlaying(info) {
	ensureDir()
	try {
		const json = JSON.stringify(info || null)
		fs.writeFileSync(nowPlayingPath, json, 'utf8')
	} catch {}
}

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

function postNowPlaying(info) {
	saveNowPlaying(info)
	if (parentPort) {
		parentPort.postMessage({ type: 'nowPlaying', data: info })
	}
}

function calcNowPlaying() {
	const now = Date.now()
	if (lastSession && now - lastSessionTime < SESSION_CACHE_MS) {
		postNowPlaying(lastSession)
		return lastSession
	}

	const session = SMTCMonitor.getCurrentMediaSession()
	if (!session) {
		lastSession = null
		lastSessionTime = now
		postNowPlaying(null)
		return null
	}

	const { media, sourceAppId, timeline, playback, lastUpdatedTime } = session

	const title = (media && media.title) || ''
	const artist = (media && media.artist) || ''
	if (!title && !artist) {
		lastSession = null
		lastSessionTime = now
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
		timeline,
	}

	lastSession = info
	lastSessionTime = now

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
