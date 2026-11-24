import i18n from '../core/i18n'

interface PluginToggleControl {
	type: 'toggle'
	id: string
	labelKey: string
	hintKey: string
	storageKey: string
	ipcMethod: string
	defaultValue?: boolean
}

interface PluginSelectOption {
	value: string
	labelKey: string
}

interface PluginSelectControl {
	type: 'select'
	id: string
	labelKey: string
	storageKey: string
	ipcMethod: string
	options: PluginSelectOption[]
	defaultValue?: string
}

interface PluginInputControl {
	type: 'input'
	id: string
	labelKey: string
	hintKey?: string
	storageKey: string
	ipcMethod?: string
	placeholder?: string
	defaultValue?: string
}

type PluginControl = PluginToggleControl | PluginSelectControl | PluginInputControl

interface PluginInfo {
	id: string
	nameKey: string
	version: string
	builtin: boolean
	priority: number
	locked: boolean
	enabled: boolean
	controls: PluginControl[]
}

function renderSelect(control: PluginSelectControl): HTMLElement {
	const raw = localStorage.getItem(control.storageKey)
	const current = raw ?? control.defaultValue ?? control.options[0]?.value ?? ''

	const wrapper = document.createElement('div')
	wrapper.className = 'client-row plugins-select-row'

	const label = document.createElement('span')
	label.textContent = i18n.t(control.labelKey, { defaultValue: control.labelKey })
	wrapper.appendChild(label)

	const modeWrap = document.createElement('div')
	modeWrap.className = 'timestamp-mode-wrap'

	for (const opt of control.options) {
		const btn = document.createElement('button')
		btn.type = 'button'
		btn.className = 'timestamp-mode-btn'
		btn.dataset.value = opt.value
		btn.dataset.active = opt.value === current ? 'true' : 'false'
		btn.textContent = i18n.t(opt.labelKey, { defaultValue: opt.value })

		btn.addEventListener('click', () => {
			modeWrap.querySelectorAll<HTMLElement>('.timestamp-mode-btn').forEach(b => {
				b.dataset.active = 'false'
			})
			btn.dataset.active = 'true'
			localStorage.setItem(control.storageKey, opt.value)

			const api = (window as any).electronAPI
			if (api?.[control.ipcMethod]) {
				api[control.ipcMethod](opt.value)
			}
		})

		modeWrap.appendChild(btn)
	}

	wrapper.appendChild(modeWrap)
	return wrapper
}

function renderInput(control: PluginInputControl, pluginId: string): HTMLElement {
	const saved = localStorage.getItem(control.storageKey) ?? control.defaultValue ?? ''

	const wrapper = document.createElement('div')
	wrapper.className = 'client-row'

	const label = document.createElement('span')
	label.textContent = i18n.t(control.labelKey, { defaultValue: control.labelKey })
	wrapper.appendChild(label)

	const row = document.createElement('div')
	row.className = 'field-input-row'
	row.style.padding = '0'
	row.style.flex = '1'

	const input = document.createElement('input')
	input.id = control.id
	input.value = saved
	input.placeholder = control.placeholder ?? ''
	row.appendChild(input)

	let saveTimer: ReturnType<typeof setTimeout> | null = null
	input.addEventListener('input', () => {
		if (saveTimer) clearTimeout(saveTimer)
		saveTimer = setTimeout(() => {
			localStorage.setItem(control.storageKey, input.value)
			const api = (window as any).electronAPI
			api?.pluginsSetStorage?.(pluginId, control.storageKey, input.value)
		}, 600)
	})

	wrapper.appendChild(row)
	return wrapper
}

function renderToggle(control: PluginToggleControl): HTMLElement {
	const raw = localStorage.getItem(control.storageKey)
	let isOn: boolean
	if (raw === null) {
		isOn = control.defaultValue ?? false
	} else {
		isOn = raw === 'true'
	}

	const wrapper = document.createElement('div')
	wrapper.className = 'wrapper-auto-label'

	wrapper.innerHTML = `
		<div class="auto-label">
			<span>${i18n.t(control.labelKey, { defaultValue: control.labelKey })}</span>
			<div class="hint-text">${i18n.t(control.hintKey, { defaultValue: control.hintKey })}</div>
		</div>
		<div id="${control.id}" class="auto-toggle" data-on="${isOn ? 'true' : 'false'}">
			<div class="auto-toggle-knob"></div>
		</div>
	`

	const toggleEl = wrapper.querySelector<HTMLElement>(`#${control.id}`)
	if (toggleEl) {
		toggleEl.addEventListener('click', () => {
			const current = toggleEl.dataset.on === 'true'
			const next = !current
			toggleEl.dataset.on = next ? 'true' : 'false'
			localStorage.setItem(control.storageKey, String(next))

			const api = (window as any).electronAPI
			if (api?.[control.ipcMethod]) {
				api[control.ipcMethod](next)
			}
		})
	}

	return wrapper
}

function renderPluginCard(plugin: PluginInfo): HTMLElement {
	const card = document.createElement('div')
	card.className = 'config-activity-card plugins-plugin-card'
	card.dataset.pluginId = plugin.id

	const nameText = i18n.t(plugin.nameKey, { defaultValue: plugin.id })
	const isLocked = plugin.locked

	const body = document.createElement('div')
	body.className = 'config-activity-body'

	const details = document.createElement('div')
	details.className = 'config-activity-details'

	const titleEl = document.createElement('div')
	titleEl.className = 'config-activity-title'
	titleEl.textContent = nameText

	const line1 = document.createElement('div')
	line1.className = 'config-activity-line'
	line1.textContent = `v${plugin.version} · ${plugin.builtin ? 'builtin' : 'external'}`

	const priorityWrap = document.createElement('div')
	priorityWrap.className = 'config-activity-line plugins-priority-wrap'
	priorityWrap.innerHTML = `<span style="color:rgba(255,255,255,0.4);font-size:9px;text-transform:uppercase;letter-spacing:0.1em;">priority</span>`

	const priorityInput = document.createElement('input')
	priorityInput.type = 'number'
	priorityInput.value = String(plugin.priority)
	priorityInput.min = '0'
	priorityInput.max = '999'
	priorityInput.className = 'plugins-priority-input'
	priorityInput.title = 'Plugin priority (higher = takes over lower priority plugins)'

	let priorityTimer: ReturnType<typeof setTimeout> | null = null
	priorityInput.addEventListener('input', () => {
		if (priorityTimer) clearTimeout(priorityTimer)
		priorityTimer = setTimeout(() => {
			const val = parseInt(priorityInput.value, 10)
			if (!isNaN(val) && val >= 0) {
				const api = (window as any).electronAPI
				api?.pluginsSetPriority?.(plugin.id, val)
			}
		}, 600)
	})

	priorityWrap.appendChild(priorityInput)

	details.appendChild(titleEl)
	details.appendChild(line1)
	details.appendChild(priorityWrap)
	body.appendChild(details)
	card.appendChild(body)

	const actions = document.createElement('div')
	actions.className = 'config-activity-actions'

	if (!isLocked) {
		const toggleBtn = document.createElement('button')
		toggleBtn.className = `config-activity-btn ${plugin.enabled ? 'disable_btn' : 'enable_btn'}`
		toggleBtn.textContent = plugin.enabled ? 'disable' : 'enable'
		toggleBtn.addEventListener('click', () => {
			const next = !plugin.enabled
			plugin.enabled = next

			toggleBtn.textContent = next ? 'disable' : 'enable'
			toggleBtn.className = `config-activity-btn ${next ? 'disable_btn' : 'enable_btn'}`

			const api = (window as any).electronAPI
			api?.pluginsSetEnabled?.(plugin.id, next)
		})
		actions.appendChild(toggleBtn)

		const removeBtn = document.createElement('button')
		removeBtn.className = 'config-activity-btn danger'
		removeBtn.textContent = '✕'
		removeBtn.title = 'Remove plugin file'
		removeBtn.addEventListener('click', async () => {
			const api = (window as any).electronAPI
			if (api?.pluginsRemove) {
				await api.pluginsRemove(plugin.id)
			}
		})
		actions.appendChild(removeBtn)
	} else {
		const lockedBadge = document.createElement('span')
		lockedBadge.className = 'plugins-locked-badge'
		lockedBadge.textContent = 'locked'
		actions.appendChild(lockedBadge)
	}

	card.appendChild(actions)

	if (plugin.controls.length > 0) {
		const divider = document.createElement('div')
		divider.className = 'divider'
		card.appendChild(divider)

		const controlsWrap = document.createElement('div')
		controlsWrap.className = 'client-row plugins-controls-row'

		const togglesWrap = document.createElement('div')
		togglesWrap.className = 'advanced-toggles-wrap'

		for (const control of plugin.controls) {
			if (control.type === 'toggle') {
				togglesWrap.appendChild(renderToggle(control))
			} else if (control.type === 'select') {
				controlsWrap.appendChild(renderSelect(control))
			} else if (control.type === 'input') {
				controlsWrap.appendChild(renderInput(control, plugin.id))
			}
		}

		controlsWrap.appendChild(togglesWrap)
		card.appendChild(controlsWrap)
	}

	return card
}

export function setupPluginsPage(): void {
	const api = window.electronAPI

	const list = document.getElementById('plugins-list') as HTMLElement | null
	const empty = document.getElementById('plugins-empty') as HTMLElement | null
	const count = document.getElementById('plugins-count') as HTMLElement | null

	if (!list || !empty || !count) return

	async function render() {
		if (!list || !empty || !count) return

		list.innerHTML = ''

		let plugins: PluginInfo[] = []

		if (api?.pluginsList) {
			try {
				plugins = await api.pluginsList()
			} catch {
				plugins = []
			}
		}

		if (plugins.length === 0) {
			empty.setAttribute('data-visible', 'true')
			count.innerHTML = `0 <span data-i18n="plugins.available">${i18n.t('plugins.available')}</span>`
			return
		}

		empty.setAttribute('data-visible', 'false')
		count.innerHTML = `${plugins.length} <span data-i18n="plugins.available">${i18n.t('plugins.available')}</span>`

		const sorted = [...plugins].sort((a, b) => b.priority - a.priority)

		for (const plugin of sorted) {
			list.appendChild(renderPluginCard(plugin))
		}
	}

	void render()

	if (api?.onPluginsListUpdated) {
		api.onPluginsListUpdated((updatedPlugins: PluginInfo[]) => {
			list.innerHTML = ''
			if (updatedPlugins.length === 0) {
				empty.setAttribute('data-visible', 'true')
				count.innerHTML = `0 <span>${i18n.t('plugins.available')}</span>`
				return
			}
			empty.setAttribute('data-visible', 'false')
			count.innerHTML = `${updatedPlugins.length} <span>${i18n.t('plugins.available')}</span>`
			const sorted = [...updatedPlugins].sort((a, b) => b.priority - a.priority)
			for (const plugin of sorted) {
				list.appendChild(renderPluginCard(plugin))
			}
		})
	}

	if (api?.onInstallPluginFromUrl) {
		api.onInstallPluginFromUrl(payload => {
			showInstallConfirm(payload, api)
		})
	}
}

function showInstallConfirm(
	payload: {
		pluginId: string
		title: string
		version: string
		isFolder: boolean
	},
	api: NonNullable<typeof window.electronAPI>
): void {
	document.getElementById('plugin-install-confirm')?.remove()

	const previousFocus = document.activeElement

	const overlay = document.createElement('div')
	overlay.id = 'plugin-install-confirm'
	overlay.setAttribute('role', 'dialog')
	overlay.setAttribute('aria-modal', 'true')
	overlay.setAttribute('aria-labelledby', 'plugin-install-title')

	Object.assign(overlay.style, {
		position: 'fixed',
		inset: '0',
		zIndex: '1000',
		display: 'flex',
		alignItems: 'center',
		justifyContent: 'center',
		padding: '20px',
		background: 'rgba(0, 0, 0, 0.8)',
	})

	const modal = document.createElement('div')
	modal.className = 'import-modal'

	const title = document.createElement('h2')
	title.id = 'plugin-install-title'
	title.className = 'import-title'
	title.textContent = 'Install plugin?'

	const body = document.createElement('div')
	body.className = 'import-body'

	const pluginName = document.createElement('p')
	pluginName.textContent = `${payload.title} · v${payload.version}`

	const warning = document.createElement('p')
	warning.textContent =
		'Plugin code runs with the same permissions as Void Presence. Install only plugins you trust.'

	const feedback = document.createElement('p')
	feedback.setAttribute('role', 'status')
	feedback.setAttribute('aria-live', 'polite')
	feedback.hidden = true

	const actions = document.createElement('div')

	Object.assign(actions.style, {
		display: 'flex',
		justifyContent: 'flex-end',
		gap: '8px',
		marginTop: '12px',
	})

	const cancel = document.createElement('button')
	cancel.type = 'button'
	cancel.className = 'config-activity-btn'
	cancel.textContent = 'Cancel'

	const confirm = document.createElement('button')
	confirm.type = 'button'
	confirm.className = 'config-activity-btn'
	confirm.textContent = 'Install'

	let installing = false
	let closed = false

	function close(): void {
		if (installing || closed) return

		closed = true
		document.removeEventListener('keydown', onKeyDown)
		overlay.remove()

		if (previousFocus instanceof HTMLElement && previousFocus.isConnected) {
			previousFocus.focus()
		}
	}

	function onKeyDown(event: KeyboardEvent): void {
		if (!overlay.isConnected) {
			document.removeEventListener('keydown', onKeyDown)
			return
		}

		if (event.key === 'Escape') {
			event.preventDefault()
			close()
			return
		}

		if (event.key !== 'Tab') return

		const buttons = [cancel, confirm].filter(button => !button.disabled && !button.hidden)

		const first = buttons[0]
		const last = buttons[buttons.length - 1]

		if (!first || !last) {
			event.preventDefault()
			return
		}

		if (
			event.shiftKey &&
			(document.activeElement === first || !modal.contains(document.activeElement))
		) {
			event.preventDefault()
			last.focus()
		} else if (
			!event.shiftKey &&
			(document.activeElement === last || !modal.contains(document.activeElement))
		) {
			event.preventDefault()
			first.focus()
		}
	}

	cancel.addEventListener('click', close)

	overlay.addEventListener('click', event => {
		if (event.target === overlay) close()
	})

	confirm.addEventListener('click', () => {
		void (async () => {
			if (installing || closed) return

			installing = true
			cancel.disabled = true
			confirm.disabled = true
			confirm.textContent = 'Installing…'
			feedback.hidden = false
			feedback.textContent = 'Downloading plugin…'

			console.info('[plugins] User confirmed install', {
				pluginId: payload.pluginId,
			})

			try {
				if (typeof api.pluginsInstallConfirmed !== 'function') {
					throw new Error('Plugin installation API is unavailable.')
				}

				const result = await api.pluginsInstallConfirmed(payload.pluginId)

				if (!result?.ok) {
					throw new Error(result?.error || 'Plugin installation failed.')
				}

				feedback.textContent = 'Plugin downloaded successfully.'
				confirm.hidden = true

				console.info('[plugins] Install completed', {
					pluginId: payload.pluginId,
				})
			} catch (error) {
				feedback.textContent =
					error instanceof Error ? error.message : 'Plugin installation failed.'

				confirm.hidden = true

				console.warn('[plugins] Install failed', {
					pluginId: payload.pluginId,
				})
			} finally {
				installing = false
				cancel.disabled = false
				cancel.textContent = 'Close'
				cancel.focus()
			}
		})()
	})

	body.append(pluginName, warning, feedback)
	actions.append(cancel, confirm)
	modal.append(title, body, actions)
	overlay.appendChild(modal)
	document.body.appendChild(overlay)
	document.addEventListener('keydown', onKeyDown)

	cancel.focus()

	console.info('[plugins] Install confirmation opened', {
		pluginId: payload.pluginId,
	})
}
