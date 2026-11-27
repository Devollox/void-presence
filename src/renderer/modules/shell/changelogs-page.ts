const API_URL = 'https://api.github.com/repos/Devollox/void-presence/releases?per_page=10&page='
const CACHE_KEY = 'vp_changelogs_v2'
const UNREAD_KEY = 'vp_changelog_read_id'
const CACHE_TTL = 5 * 60 * 1000

interface Release {
	id: number
	tag_name: string
	name: string
	body: string
	published_at: string
	prerelease: boolean
}

function getReadId(): number {
	try {
		return Number(localStorage.getItem(UNREAD_KEY) ?? '0')
	} catch {
		return 0
	}
}

function setReadId(id: number): void {
	try {
		localStorage.setItem(UNREAD_KEY, String(id))
	} catch {}
}

export function syncChangelogUnreadDot(releases?: Release[]): void {
	const item = document.querySelector<HTMLElement>('#sidebar-changelog')
	if (!item) return

	if (!releases) {
		try {
			const raw = localStorage.getItem(CACHE_KEY)
			if (!raw) return
			const val = JSON.parse(raw) as { pages?: Record<string, Release[]> }
			releases = val?.pages?.[1] ?? []
		} catch {
			return
		}
	}

	const latestId = releases[0]?.id ?? 0
	const unread = latestId > getReadId()
	item.dataset.unread = String(unread)
}

function markRead(releases: Release[]): void {
	const latestId = releases[0]?.id ?? 0
	if (latestId > getReadId()) setReadId(latestId)
	syncChangelogUnreadDot(releases)
}

function parseMarkdown(md: string): string {
	const src = md.replace(/\r\n/g, '\n').replace(/\r/g, '\n')

	const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')

	const inline = (raw: string): string =>
		esc(raw)
			.replace(/`([^`]+)`/g, '<code>$1</code>')
			.replace(/\*\*([^*\n]+)\*\*/g, '<strong>$1</strong>')
			.replace(/(?<!\*)\*(?!\*)([^*\n]+)\*(?!\*)/g, '<em>$1</em>')
			.replace(
				/\[([^\]]+)\]\((https?:\/\/[^)]+)\)/g,
				'<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>'
			)

	const lines = src.split('\n')
	const chunks: string[] = []
	let listBuf: string[] = []

	const flushList = () => {
		if (!listBuf.length) return
		chunks.push(`<ul>${listBuf.join('')}</ul>`)
		listBuf = []
	}

	for (const raw of lines) {
		const line = raw.trimEnd()
		if (!line.trim()) {
			flushList()
			continue
		}

		const h3m = line.match(/^#{3,}\s+(.+)/)
		if (h3m) {
			flushList()
			chunks.push(`<h3>${esc(h3m[1]!.trim())}</h3>`)
			continue
		}

		const h2m = line.match(/^#{2}\s+(.+)/)
		if (h2m) {
			flushList()
			chunks.push(`<h2>${esc(h2m[1]!.trim())}</h2>`)
			continue
		}

		const h1m = line.match(/^#\s+(.+)/)
		if (h1m) {
			flushList()
			chunks.push(`<h2>${esc(h1m[1]!.trim())}</h2>`)
			continue
		}

		const lim = line.match(/^[-*]\s+(.+)/)
		if (lim) {
			listBuf.push(`<li>${inline(lim[1]!.trim())}</li>`)
			continue
		}

		flushList()
		chunks.push(`<p>${inline(line.trim())}</p>`)
	}

	flushList()
	return chunks.join('\n')
}

function formatDate(iso: string): string {
	try {
		return new Date(iso).toLocaleDateString('en-US', {
			year: 'numeric',
			month: 'short',
			day: 'numeric',
		})
	} catch {
		return iso.slice(0, 10)
	}
}

interface PagedCache {
	pages: Record<number, Release[]>
	ts: number
}

function readPageCache(page: number): Release[] | null {
	try {
		const raw = localStorage.getItem(CACHE_KEY)
		if (!raw) return null
		const val = JSON.parse(raw) as PagedCache
		if (!val || Date.now() - val.ts > CACHE_TTL) return null
		return val.pages[page] ?? null
	} catch {
		return null
	}
}

function writePageCache(page: number, releases: Release[]): void {
	try {
		const raw = localStorage.getItem(CACHE_KEY)
		const val: PagedCache = raw ? (JSON.parse(raw) as PagedCache) : { pages: {}, ts: Date.now() }
		val.pages[page] = releases
		val.ts = Date.now()
		localStorage.setItem(CACHE_KEY, JSON.stringify(val))
	} catch {}
}

async function fetchPage(page: number, force = false): Promise<Release[]> {
	if (!force) {
		const cached = readPageCache(page)
		if (cached) return cached
	}
	const res = await fetch(`${API_URL}${page}`, {
		headers: { Accept: 'application/vnd.github+json' },
	})
	if (!res.ok) throw new Error(`GitHub API ${res.status}`)
	const data = (await res.json()) as Release[]
	writePageCache(page, data)
	return data
}

function buildEntry(release: Release, isLatest: boolean, delay: number): HTMLElement {
	const entry = document.createElement('div')
	entry.className = 'changelog-entry'
	entry.style.animationDelay = `${delay}ms`

	const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
	const title = esc((release.name?.trim() || release.tag_name).replace(/^v/, ''))

	const tagClass = isLatest
		? 'changelog-entry-tag changelog-entry-tag--latest'
		: release.prerelease
			? 'changelog-entry-tag changelog-entry-tag--pre'
			: 'changelog-entry-tag'
	const tagLabel = isLatest ? 'latest' : release.prerelease ? 'pre' : 'release'

	entry.innerHTML = `
<div class="changelog-entry-meta">
  <span class="changelog-entry-date">${formatDate(release.published_at)}</span>
  <span class="${tagClass}">${tagLabel}</span>
</div>
<div class="changelog-entry-content">
  <h2 class="changelog-entry-title">${title}</h2>
  <div class="changelog-body">${parseMarkdown(release.body ?? '')}</div>
</div>`

	return entry
}

export function setupChangelogsPage(): void {
	const view = document.querySelector<HTMLElement>('[data-view="changelogs"]')
	if (!view) return
	const pg = view.querySelector<HTMLElement>('.changelogs-page')
	if (!pg) return

	const refreshBtn = pg.querySelector<HTMLButtonElement>('.changelogs-refresh-btn')!
	const feed = pg.querySelector<HTMLElement>('.changelogs-feed')!
	const skeleton = pg.querySelector<HTMLElement>('.changelogs-skeleton')!
	const stateEl = pg.querySelector<HTMLElement>('.changelogs-state')!
	const stateTitle = stateEl.querySelector<HTMLElement>('.changelogs-state-title')!
	const stateHint = stateEl.querySelector<HTMLElement>('.changelogs-state-hint')!
	const sentinel = pg.querySelector<HTMLElement>('.changelogs-sentinel')!

	let curPage = 1
	let fetching = false
	let exhausted = false
	let loaded = false
	let total = 0

	const setLoading = (on: boolean) => {
		refreshBtn.dataset.loading = String(on)
	}

	const showState = (t: string, h: string) => {
		feed.hidden = skeleton.hidden = true
		stateEl.hidden = false
		stateTitle.textContent = t
		stateHint.textContent = h
	}

	const loadPage = async (page: number, force = false) => {
		if (fetching) return
		fetching = true
		if (page === 1) setLoading(true)

		try {
			const releases = await fetchPage(page, force)

			if (page === 1) {
				syncChangelogUnreadDot(releases)
			}

			if (releases.length === 0) {
				exhausted = true
				if (page === 1) showState('No releases found', 'Check back later or open GitHub.')
				return
			}

			if (page === 1) {
				Array.from(feed.children).forEach(c => {
					if (c !== sentinel) c.remove()
				})
				total = 0
				skeleton.hidden = true
				stateEl.hidden = true
				feed.hidden = false
			}

			releases.forEach((r, i) => {
				const isLatest = page === 1 && i === 0
				const entry = buildEntry(r, isLatest, (i % 10) * 25)
				feed.insertBefore(entry, sentinel)
				total++
			})

			if (releases.length < 10) exhausted = true
		} catch {
			if (page === 1)
				showState('Could not load releases', 'Check your internet connection and try again.')
		} finally {
			if (page === 1) setLoading(false)
			fetching = false
			loaded = true
		}
	}

	const scrollObserver = new IntersectionObserver(
		entries => {
			if (entries[0]?.isIntersecting && !exhausted && !fetching) {
				curPage++
				void loadPage(curPage)
			}
		},
		{ rootMargin: '300px' }
	)
	scrollObserver.observe(sentinel)

	const readObserver = new IntersectionObserver(
		entries => {
			if (entries[0]?.isIntersecting && loaded && total > 0) {
				const cached = readPageCache(1)
				if (cached?.length) markRead(cached)
			}
		},
		{ threshold: 0.05 }
	)
	readObserver.observe(feed)

	refreshBtn.addEventListener('click', () => {
		exhausted = false
		curPage = 1
		void loadPage(1, true)
	})

	const activateObserver = new MutationObserver(() => {
		if (view.dataset.active !== 'true') return
		if (!loaded) {
			skeleton.hidden = false
			void loadPage(1)
		}
		const cached = readPageCache(1)
		if (cached?.length) markRead(cached)
	})
	activateObserver.observe(view, { attributes: true, attributeFilter: ['data-active'] })

	if (view.dataset.active === 'true') {
		skeleton.hidden = false
		void loadPage(1)
	}

	syncChangelogUnreadDot()
}
