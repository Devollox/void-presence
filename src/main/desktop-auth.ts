import { createHash, randomBytes, timingSafeEqual } from 'node:crypto'
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
			const u = new URL(value.sourceUrl)
			if (u.protocol !== 'https:') return null
			if (u.username || u.password) return null
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

export function cancelPendingLogin(): void {
	pendingAttempt = null
}

export async function openDesktopLogin(webContentsId: number): Promise<void> {
	const state = randomBytes(32).toString('base64url')
	const verifier = randomBytes(32).toString('base64url')
	const challenge = createHash('sha256').update(verifier).digest('base64url')

	const attempt: LoginAttempt = {
		state,
		verifier,
		webContentsId,
		expiresAt: Date.now() + ATTEMPT_TTL,
		exchanging: false,
	}

	pendingAttempt = attempt

	const url = new URL(CONNECT_URL)
	url.searchParams.set('state', state)
	url.searchParams.set('code_challenge', challenge)
	url.searchParams.set('code_challenge_method', 'S256')

	try {
		await shell.openExternal(url.toString())
	} catch {
		if (pendingAttempt === attempt) pendingAttempt = null
		throw new Error('Could not open the browser.')
	}
}

export async function exchangeDesktopAuth(
	url: URL,
	webContentsId: number
): Promise<DesktopProfile | null> {
	if (url.protocol !== 'voidpresence:') return null
	if (url.hostname !== 'auth') return null
	if (url.username || url.password || url.port || url.hash) return null
	if (url.pathname !== '' && url.pathname !== '/') return null

	const allowedParams = new Set(['ticket', 'state'])
	for (const key of url.searchParams.keys()) {
		if (!allowedParams.has(key)) return null
	}

	if (url.searchParams.getAll('ticket').length !== 1) return null
	if (url.searchParams.getAll('state').length !== 1) return null

	const ticket = url.searchParams.get('ticket')
	const state = url.searchParams.get('state')

	if (!ticket || !/^[A-Za-z0-9_-]{43}$/.test(ticket)) return null
	if (!state || !/^[A-Za-z0-9_-]{43,128}$/.test(state)) return null

	const attempt = pendingAttempt
	if (!attempt) return null
	if (attempt.webContentsId !== webContentsId) return null
	if (Date.now() >= attempt.expiresAt) {
		pendingAttempt = null
		return null
	}
	if (!matchesState(state, attempt.state)) return null
	if (attempt.exchanging) return null

	attempt.exchanging = true

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
		if (!isRecord(payload)) throw new Error('The account server returned an invalid response.')

		const profile = readProfile(payload.profile)
		if (!profile) throw new Error('The account server returned an invalid profile.')

		if (pendingAttempt !== attempt) return null
		if (Date.now() >= attempt.expiresAt) {
			pendingAttempt = null
			return null
		}

		pendingAttempt = null
		return profile
	} finally {
		clearTimeout(timer)
		attempt.exchanging = false
	}
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
