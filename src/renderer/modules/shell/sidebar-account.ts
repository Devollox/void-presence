import { SidebarAccount } from 'src/types/types'

export function syncSidebarAccount(
	account: SidebarAccount | null,
	siteOrigin = 'https://voidpresence.com'
): void {
	const section = document.querySelector<HTMLElement>('#sidebar-account-section')

	const name = document.querySelector<HTMLElement>('#sidebar-account-name')

	if (!section || !name) return

	const authorId = String(account?.authorId ?? '').trim()
	const connected = authorId.length > 0

	section.hidden = !connected

	if (!connected) {
		name.textContent = 'Your account'
		name.removeAttribute('title')
		return
	}

	const displayName = account?.authorName?.trim() || 'Your account'

	name.textContent = displayName
	name.title = displayName

	section.querySelectorAll<HTMLAnchorElement>('a[data-account-path]').forEach(link => {
		const path = link.dataset.accountPath

		if (!path) return

		link.href = new URL(path, siteOrigin).href
	})
}
