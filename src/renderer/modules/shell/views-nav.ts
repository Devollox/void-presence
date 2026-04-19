import { ViewName } from '../../../types/types'

const navMain = document.getElementById('nav-main') as HTMLElement | null
const navLogs = document.getElementById('nav-logs') as HTMLElement | null
const navConfig = document.getElementById('nav-config') as HTMLElement | null
const views = document.querySelectorAll<HTMLElement>('.view')

export function setActiveView(viewName: ViewName): void {
	views.forEach(v => {
		const name = v.getAttribute('data-view')
		v.setAttribute('data-active', name === viewName ? 'true' : 'false')
	})
	if (navMain) {
		navMain.setAttribute('data-active', viewName === 'main' ? 'true' : 'false')
	}
	if (navLogs) {
		navLogs.setAttribute('data-active', viewName === 'logs' ? 'true' : 'false')
	}
	if (navConfig) {
		navConfig.setAttribute(
			'data-active',
			viewName === 'config' ? 'true' : 'false',
		)
	}
}

navMain?.addEventListener('click', () => setActiveView('main'))
navLogs?.addEventListener('click', () => setActiveView('logs'))
navConfig?.addEventListener('click', () => setActiveView('config'))
