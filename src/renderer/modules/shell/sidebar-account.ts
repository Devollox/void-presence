import { SidebarAccount } from 'src/types/types'

let wasConnected: boolean | null = null

export function syncSidebarAccount(
	account: SidebarAccount | null,
	siteOrigin = 'https://voidpresence.com'
): void {
	const section = document.querySelector<HTMLElement>('#sidebar-account-section')
	const name = document.querySelector<HTMLElement>('#sidebar-account-name')
	const group = document.querySelector<HTMLElement>('.sidebar-account-group')

	if (!section || !name || !group) return

	const authorId = String(account?.authorId ?? '').trim()
	const connected = authorId.length > 0

	section.dataset.open = connected ? 'true' : 'false'

	if (wasConnected !== connected) {
		group.dataset.open = connected ? 'true' : 'false'

		const heading = group.querySelector<HTMLButtonElement>('.sidebar-account-heading')

		if (heading) {
			heading.setAttribute('aria-expanded', connected ? 'true' : 'false')
		}

		wasConnected = connected
	}

	if (!connected) {
		name.textContent = 'Your account'
		name.removeAttribute('title')
		return
	}

	const displayName = account?.authorName?.trim() || 'Your account'

	name.textContent = displayName

	section.querySelectorAll<HTMLAnchorElement>('a[data-account-path]').forEach(link => {
		const path = link.dataset.accountPath

		if (!path) return

		link.href = new URL(path, siteOrigin).href
	})
}
