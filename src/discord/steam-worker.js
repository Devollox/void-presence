const { randomUUID } = require('crypto')
const { parentPort } = require('worker_threads')
const os = require('os')
const path = require('path')
const puppeteer = require('puppeteer')

let browser = null
let isBusy = false
const VANITY_ID_DEFAULT = 'Devollox'

async function getBrowser() {
	if (browser && browser.isConnected()) return browser
	const tmpDir = os.tmpdir()
	const userDataDir = path.join(tmpDir, 'vp_steam_profile_' + randomUUID())
	browser = await puppeteer.launch({
		headless: true,
		args: [
			'--no-sandbox',
			'--disable-setuid-sandbox',
			`--user-data-dir=${userDataDir}`,
		],
	})
	return browser
}

function buildSteamImagesFromUrl(gameUrl) {
	if (!gameUrl) return { appId: null, header: null, capsule: null }

	try {
		const url = new URL(gameUrl)
		const parts = url.pathname.split('/').filter(Boolean)
		const appIndex = parts.indexOf('app')
		const appId =
			appIndex !== -1 &&
			parts[appIndex + 1] &&
			/^\d+$/.test(parts[appIndex + 1])
				? parts[appIndex + 1]
				: null

		if (!appId) return { appId: null, header: null, capsule: null }

		const header = `https://cdn.akamai.steamstatic.com/steam/apps/${appId}/header.jpg`
		const capsule = `https://shared.fastly.steamstatic.com/store_item_assets/steam/apps/${appId}/capsule_184x69.jpg`

		return { appId, header, capsule }
	} catch {
		return { appId: null, header: null, capsule: null }
	}
}

async function fetchSteamPresenceOnce(vanityIdOrUrl) {
	const vanity = vanityIdOrUrl || VANITY_ID_DEFAULT
	const urlBase = vanity.startsWith('http')
		? vanity
		: `https://steamcommunity.com/id/${vanity}/`

	const url = `${urlBase}?t=${Date.now()}`
	const b = await getBrowser()
	const page = await b.newPage()

	try {
		console.log('[steam-worker] goto', url)
		await page.goto(url, { waitUntil: 'networkidle2', timeout: 30000 })

		const infoPropfile = await page
			.$eval('.profile_in_game_header', el => el.textContent?.trim() || '')
			.catch(() => '')

		const infoLastGamesName = await page
			.$eval('.profile_in_game_name', el => el.textContent?.trim() || '')
			.catch(() => '')

		const infoLastGamesDetails = ''

		const infoLastGamesNameUrl = await page
			.$eval('.profile_in_game_name a', el => el.href || '')
			.catch(() => '')

		const avatars = await page
			.$$eval('.playerAvatarAutoSizeInner img[src*="avatars"]', imgs =>
				imgs.map(img => img.src),
			)
			.catch(() => [])

		const steamImages = buildSteamImagesFromUrl(infoLastGamesNameUrl)

		const data = {
			infoLastGamesName,
			infoLastGamesDetails,
			infoPropfile,
			urlGames: steamImages.capsule ? [steamImages.capsule] : [],
			avatars,
			infoLastGamesNameUrl,
			steamImages,
		}

		console.log('[steam-worker] parsed', {
			status: infoPropfile,
			lastGame: infoLastGamesName,
			appId: steamImages.appId,
		})

		return data
	} catch (err) {
		console.error('[steam-worker] error', err)
		return null
	} finally {
		await page.close()
	}
}

if (!parentPort) {
	process.exit(1)
}

parentPort.on('message', async msg => {
	if (!msg || typeof msg !== 'object') return
	if (msg.type !== 'getSteamPresence') return
	if (isBusy) {
		parentPort.postMessage({ type: 'steamPresence', data: null })
		return
	}
	isBusy = true
	try {
		const data = await fetchSteamPresenceOnce(msg.vanityId)
		parentPort.postMessage({ type: 'steamPresence', data })
	} catch {
		parentPort.postMessage({ type: 'steamPresence', data: null })
	} finally {
		isBusy = false
	}
})
