type ActivityTypeLocal = 'playing' | 'watching' | 'listening' | 'competing'

export function setupActivityTypeControls(): void {
	const activityButtons = [
		{
			type: 'playing' as ActivityTypeLocal,
			el: document.getElementById('activity-type-playing'),
		},
		{
			type: 'watching' as ActivityTypeLocal,
			el: document.getElementById('activity-type-watching'),
		},
		{
			type: 'listening' as ActivityTypeLocal,
			el: document.getElementById('activity-type-listening'),
		},
		{
			type: 'competing' as ActivityTypeLocal,
			el: document.getElementById('activity-type-competing'),
		},
	]

	function applyActivity(type: ActivityTypeLocal) {
		activityButtons.forEach(btn => {
			if (!btn.el) return
			btn.el.dataset.active = btn.type === type ? 'true' : 'false'
		})
	}

	const stored: ActivityTypeLocal =
		(localStorage.getItem('activityType') as ActivityTypeLocal | null) ||
		'playing'

	applyActivity(stored)

	activityButtons.forEach(btn => {
		btn.el?.addEventListener('click', e => {
			e.preventDefault()
			const type = btn.type

			localStorage.setItem('activityType', type)
			applyActivity(type)

			if (window.electronAPI?.invoke) {
				window.electronAPI.invoke('set-activity-type', type)
			} else if (window.electronAPI?.setActivityType) {
				window.electronAPI.setActivityType(type)
			}
		})
	})
}
