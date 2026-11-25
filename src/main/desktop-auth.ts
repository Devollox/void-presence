import { createHash, randomBytes, timingSafeEqual } from 'node:crypto'
import http from 'node:http'
import { net, shell } from 'electron'
import {
	LoginAttempt,
	DesktopProfile,
	ActionPayload,
	ImportConfigAction,
	ImportStatusAction,
} from 'src/types/types'

const CONNECT_URL = 'https://voidpresence.com/desktop/connect'
const EXCHANGE_URL = 'https://voidpresence.com/api/auth/desktop/exchange'
const ACTION_EXCHANGE_URL = 'https://voidpresence.com/api/action/exchange'

const ATTEMPT_TTL = 10 * 60 * 1000
const REQUEST_TIMEOUT = 15000

const CALLBACK_PATH = '/callback'

let pendingAttempt: LoginAttempt | null = null

function isRecord(value: unknown): value is Record<string, unknown> {
	return value !== null && typeof value === 'object' && !Array.isArray(value)
}

function matchesState(actual: string, expected: string): boolean {
	const actualBuffer = Buffer.from(actual, 'utf8')
	const expectedBuffer = Buffer.from(expected, 'utf8')

	if (actualBuffer.length !== expectedBuffer.length) return false

	return timingSafeEqual(actualBuffer, expectedBuffer)
}

function getAvatarUrl(value: string): string {
	if (!value) return ''

	try {
		const url = new URL(value)

		if (url.protocol !== 'https:') return ''
		if (url.hostname !== 'cdn.discordapp.com') return ''
		if (url.username || url.password || url.port) return ''

		return url.href
	} catch {
		return ''
	}
}

function readProfile(value: unknown): DesktopProfile | null {
	if (!isRecord(value)) return null
	if (typeof value.authorId !== 'string') return null
	if (typeof value.authorName !== 'string') return null
	if (typeof value.provider !== 'string') return null
	if (typeof value.avatar !== 'string') return null

	const authorId = value.authorId.trim()
	const authorName = value.authorName.trim()
	const provider = value.provider.trim()

	if (!authorId || authorId.length > 256) return null
	if (authorName.length > 512) return null
	if (provider.length > 128) return null
	if (value.avatar.length > 2048) return null

	return {
		authorId,
		authorName,
		provider,
		avatar: getAvatarUrl(value.avatar),
	}
}

function readActionPayload(value: unknown): ActionPayload | null {
	if (!isRecord(value)) return null

	const kind = value.kind

	if (kind === 'import-config') {
		if (typeof value.configId !== 'string' || !value.configId) return null
		if (typeof value.title !== 'string') return null
		if (!isRecord(value.configData)) return null

		return {
			kind: 'import-config',
			configId: value.configId,
			title: value.title,
			configData: value.configData as ImportConfigAction['configData'],
		}
	}

	if (kind === 'import-status') {
		if (typeof value.configId !== 'string' || !value.configId) return null
		if (typeof value.title !== 'string') return null
		if (!isRecord(value.configData)) return null
		if (!Array.isArray((value.configData as any).statusCycles)) return null

		return {
			kind: 'import-status',
			configId: value.configId,
			title: value.title,
			configData: value.configData as ImportStatusAction['configData'],
		}
	}

	if (kind === 'install-plugin') {
		if (typeof value.pluginId !== 'string' || !value.pluginId) return null
		if (typeof value.title !== 'string') return null
		if (typeof value.version !== 'string') return null
		if (typeof value.sourceUrl !== 'string' || !value.sourceUrl) return null
		if (typeof value.isFolder !== 'boolean') return null

		try {
			const url = new URL(value.sourceUrl)

			if (url.protocol !== 'https:') return null
			if (url.username || url.password) return null
		} catch {
			return null
		}

		return {
			kind: 'install-plugin',
			pluginId: value.pluginId,
			title: value.title,
			version: value.version,
			sourceUrl: value.sourceUrl,
			isFolder: value.isFolder,
		}
	}

	return null
}

function closePendingAttempt(): void {
	if (!pendingAttempt) return

	pendingAttempt.server.close()
	pendingAttempt = null
}

function sendCallbackResponse(response: http.ServerResponse, status: number, message = ''): void {
	response.statusCode = status
	response.setHeader('Content-Type', 'text/html; charset=utf-8')
	response.setHeader('Cache-Control', 'no-store')
	response.setHeader('Referrer-Policy', 'no-referrer')
	response.setHeader('Pragma', 'no-cache')

	if (status === 200) {
		response.end(
			'<!doctype html><html><head><meta charset="utf-8"><title>Void Presence</title></head><body><script>window.close()</script></body></html>'
		)

		return
	}

	response.end(message)
}

async function exchangeTicket(ticket: string, attempt: LoginAttempt): Promise<DesktopProfile> {
	const controller = new AbortController()
	const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT)

	try {
		const response = await net.fetch(EXCHANGE_URL, {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
				Accept: 'application/json',
			},
			body: JSON.stringify({
				ticket,
				state: attempt.state,
				code_verifier: attempt.verifier,
				redirect_uri: attempt.redirectUri,
			}),
			credentials: 'omit',
			redirect: 'error',
			cache: 'no-store',
			signal: controller.signal,
		})

		if (!response.ok) {
			throw new Error(
				response.status === 400
					? 'The connection link is invalid or expired. Start login again.'
					: 'The account server is unavailable. Start login again.'
			)
		}

		const payload: unknown = await response.json()

		if (!isRecord(payload)) {
			throw new Error('The account server returned an invalid response.')
		}

		const profile = readProfile(payload.profile)

		if (!profile) {
			throw new Error('The account server returned an invalid profile.')
		}

		return profile
	} finally {
		clearTimeout(timer)
	}
}

export function cancelPendingLogin(): void {
	closePendingAttempt()
}

export async function openDesktopLogin(): Promise<DesktopProfile> {
	closePendingAttempt()

	const state = randomBytes(32).toString('base64url')
	const verifier = randomBytes(32).toString('base64url')
	const challenge = createHash('sha256').update(verifier).digest('base64url')

	const server = http.createServer()

	await new Promise<void>((resolve, reject) => {
		server.once('error', reject)
		server.listen(0, '127.0.0.1', () => resolve())
	})

	const address = server.address()

	if (!address || typeof address === 'string') {
		server.close()
		throw new Error('Could not start the local authorization server.')
	}

	const redirectUri = `http://127.0.0.1:${address.port}${CALLBACK_PATH}`

	const attempt: LoginAttempt = {
		state,
		verifier,
		redirectUri,
		server,
		expiresAt: Date.now() + ATTEMPT_TTL,
		exchanging: false,
	}

	pendingAttempt = attempt

	return new Promise<DesktopProfile>((resolve, reject) => {
		let settled = false

		const finish = (profile: DesktopProfile) => {
			if (settled) return

			settled = true
			closePendingAttempt()
			resolve(profile)
		}

		const fail = (error: Error) => {
			if (settled) return

			settled = true
			closePendingAttempt()
			reject(error)
		}

		server.on('request', (request, response) => {
			const requestUrl = new URL(request.url ?? '/', 'http://127.0.0.1')

			if (requestUrl.pathname !== CALLBACK_PATH) {
				sendCallbackResponse(response, 404, 'Not found')
				return
			}

			const ticket = requestUrl.searchParams.get('ticket')
			const receivedState = requestUrl.searchParams.get('state')

			if (!ticket || !receivedState) {
				sendCallbackResponse(response, 400, 'Invalid authorization response')
				return
			}

			if (!/^[A-Za-z0-9_-]{43}$/.test(ticket)) {
				sendCallbackResponse(response, 400, 'Invalid authorization response')
				return
			}

			if (!matchesState(receivedState, attempt.state)) {
				sendCallbackResponse(response, 400, 'Invalid authorization response')
				return
			}

			if (Date.now() >= attempt.expiresAt) {
				sendCallbackResponse(response, 400, 'Authorization attempt expired')
				fail(new Error('The authorization attempt expired. Start login again.'))
				return
			}

			if (attempt.exchanging) {
				sendCallbackResponse(response, 429, 'Authorization already in progress')
				return
			}

			attempt.exchanging = true

			sendCallbackResponse(response, 200)

			exchangeTicket(ticket, attempt)
				.then(profile => {
					finish(profile)
				})
				.catch((error: unknown) => {
					fail(error instanceof Error ? error : new Error('Could not complete authorization.'))
				})
		})

		server.on('error', error => {
			fail(
				error instanceof Error
					? error
					: new Error('Could not start the local authorization server.')
			)
		})

		const connectUrl = new URL(CONNECT_URL)

		connectUrl.searchParams.set('state', state)
		connectUrl.searchParams.set('code_challenge', challenge)
		connectUrl.searchParams.set('code_challenge_method', 'S256')
		connectUrl.searchParams.set('redirect_uri', redirectUri)

		shell.openExternal(connectUrl.toString()).catch(() => {
			fail(new Error('Could not open the browser.'))
		})

		setTimeout(() => {
			if (pendingAttempt === attempt) {
				fail(new Error('The authorization attempt expired. Start login again.'))
			}
		}, ATTEMPT_TTL)
	})
}

export async function exchangeActionTicket(ticket: string): Promise<ActionPayload | null> {
	if (!/^[A-Za-z0-9_-]{43}$/.test(ticket)) return null

	const controller = new AbortController()
	const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT)

	try {
		const response = await net.fetch(ACTION_EXCHANGE_URL, {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
				Accept: 'application/json',
			},
			body: JSON.stringify({ ticket }),
			credentials: 'omit',
			redirect: 'error',
			cache: 'no-store',
			signal: controller.signal,
		})

		if (!response.ok) return null

		const data: unknown = await response.json()

		if (!isRecord(data)) return null

		return readActionPayload(data.payload)
	} catch {
		return null
	} finally {
		clearTimeout(timer)
	}
}
