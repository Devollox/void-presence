import i18n from '../core/i18n'

type ElectronAPIRef = Window & typeof globalThis & { electronAPI?: typeof window.electronAPI }

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

function renderToggleControl(control: PluginToggleControl): HTMLElement {
	const raw = localStorage.getItem(control.storageKey)
	const isOn: boolean = raw === null ? (control.defaultValue ?? false) : raw === 'true'

	const row = document.createElement('div')
	row.className = 'plugin-control-row'

	const labelWrap = document.createElement('div')

	const label = document.createElement('div')
	label.className = 'plugin-control-label'
	label.textContent = i18n.t(control.labelKey, { defaultValue: control.labelKey })
	labelWrap.appendChild(label)

	const hint = document.createElement('div')
	hint.className = 'plugin-control-hint'
	hint.textContent = i18n.t(control.hintKey, { defaultValue: control.hintKey })
	labelWrap.appendChild(hint)

	const toggle = document.createElement('button')
	toggle.type = 'button'
	toggle.id = control.id
	toggle.className = 'welcome-switch'
	toggle.dataset.on = isOn ? 'true' : 'false'
	toggle.setAttribute('role', 'switch')
	toggle.setAttribute('aria-checked', isOn ? 'true' : 'false')

	const knob = document.createElement('span')
	knob.className = 'welcome-switch-knob'
	toggle.appendChild(knob)

	toggle.addEventListener('click', () => {
		const current = toggle.dataset.on === 'true'
		const next = !current
		toggle.dataset.on = next ? 'true' : 'false'
		toggle.setAttribute('aria-checked', next ? 'true' : 'false')
		localStorage.setItem(control.storageKey, String(next))

		const api = (window as ElectronAPIRef).electronAPI
		const method = control.ipcMethod as keyof NonNullable<typeof api>
		if (api && typeof api[method] === 'function') {
			;(api[method] as (v: boolean) => void)(next)
		}
	})

	row.appendChild(labelWrap)
	row.appendChild(toggle)
	return row
}

function renderSelectControl(control: PluginSelectControl): HTMLElement {
	const raw = localStorage.getItem(control.storageKey)
	const current = raw ?? control.defaultValue ?? control.options[0]?.value ?? ''

	const row = document.createElement('div')
	row.className = 'plugin-control-row'

	const label = document.createElement('div')
	label.className = 'plugin-control-label'
	label.textContent = i18n.t(control.labelKey, { defaultValue: control.labelKey })

	const segmented = document.createElement('div')
	segmented.className = 'plugin-segmented'

	for (const opt of control.options) {
		const btn = document.createElement('button')
		btn.type = 'button'
		btn.className = 'plugin-segmented-btn'
		btn.dataset.value = opt.value
		btn.dataset.active = opt.value === current ? 'true' : 'false'
		btn.textContent = i18n.t(opt.labelKey, { defaultValue: opt.value })

		btn.addEventListener('click', () => {
			segmented.querySelectorAll<HTMLElement>('.plugin-segmented-btn').forEach(b => {
				b.dataset.active = 'false'
			})
			btn.dataset.active = 'true'
			localStorage.setItem(control.storageKey, opt.value)

			const api = (window as ElectronAPIRef).electronAPI
			const method = control.ipcMethod as keyof NonNullable<typeof api>
			if (api && typeof api[method] === 'function') {
				;(api[method] as (v: string) => void)(opt.value)
			}
		})

		segmented.appendChild(btn)
	}

	row.appendChild(label)
	row.appendChild(segmented)
	return row
}

function renderInputControl(control: PluginInputControl, pluginId: string): HTMLElement {
	const saved = localStorage.getItem(control.storageKey) ?? control.defaultValue ?? ''

	const row = document.createElement('div')
	row.className = 'plugin-control-row'

	const labelWrap = document.createElement('div')

	const label = document.createElement('div')
	label.className = 'plugin-control-label'
	label.textContent = i18n.t(control.labelKey, { defaultValue: control.labelKey })
	labelWrap.appendChild(label)

	if (control.hintKey) {
		const hint = document.createElement('div')
		hint.className = 'plugin-control-hint'
		hint.textContent = i18n.t(control.hintKey, { defaultValue: control.hintKey })
		labelWrap.appendChild(hint)
	}

	const input = document.createElement('input')
	input.id = control.id
	input.type = 'text'
	input.className = 'dialog-field-input'
	input.value = saved
	input.placeholder = control.placeholder ?? ''

	let saveTimer: ReturnType<typeof setTimeout> | null = null
	input.addEventListener('input', () => {
		if (saveTimer) clearTimeout(saveTimer)
		saveTimer = setTimeout(() => {
			localStorage.setItem(control.storageKey, input.value)
			const api = (window as ElectronAPIRef).electronAPI
			api?.pluginsSetStorage?.(pluginId, control.storageKey, input.value)
		}, 600)
	})

	row.appendChild(labelWrap)
	row.appendChild(input)
	return row
}

function renderPluginCard(plugin: PluginInfo): DocumentFragment {
	const fragment = document.createDocumentFragment()

	const card = document.createElement('div')
	card.className = 'plugin-card'
	card.dataset.pluginId = plugin.id

	const info = document.createElement('div')
	info.className = 'plugin-card-info'

	const icon = document.createElement('div')
	icon.className = 'plugin-card-icon'
	icon.setAttribute('aria-hidden', 'true')
	icon.innerHTML = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M20.24 12.24a6 6 0 0 0-8.49-8.49L5 10.5V19h8.5z"/><line x1="16" y1="8" x2="2" y2="22"/><line x1="17.5" y1="15" x2="9" y2="15"/></svg>`

	const meta = document.createElement('div')
	meta.className = 'plugin-card-meta'

	const name = document.createElement('div')
	name.className = 'plugin-card-name'
	name.textContent = i18n.t(plugin.nameKey, { defaultValue: plugin.id })

	const line = document.createElement('div')
	line.className = 'plugin-card-line'
	line.textContent = `v${plugin.version} · ${plugin.builtin ? 'built-in' : 'external'}`

	meta.appendChild(name)
	meta.appendChild(line)
	info.appendChild(icon)
	info.appendChild(meta)

	const actions = document.createElement('div')
	actions.className = 'plugin-card-actions'

	if (!plugin.locked) {
		const toggleBtn = document.createElement('button')
		toggleBtn.type = 'button'
		toggleBtn.className = `plugin-card-toggle-btn${plugin.enabled ? ' plugin-card-toggle-btn--on' : ''}`
		toggleBtn.textContent = plugin.enabled
			? i18n.t('plugins.disable', { defaultValue: 'Disable' })
			: i18n.t('plugins.enable', { defaultValue: 'Enable' })

		toggleBtn.addEventListener('click', () => {
			const next = !plugin.enabled
			plugin.enabled = next

			toggleBtn.textContent = next
				? i18n.t('plugins.disable', { defaultValue: 'Disable' })
				: i18n.t('plugins.enable', { defaultValue: 'Enable' })

			if (next) {
				toggleBtn.classList.add('plugin-card-toggle-btn--on')
			} else {
				toggleBtn.classList.remove('plugin-card-toggle-btn--on')
			}

			const api = (window as ElectronAPIRef).electronAPI
			api?.pluginsSetEnabled?.(plugin.id, next)
		})

		const removeBtn = document.createElement('button')
		removeBtn.type = 'button'
		removeBtn.className = 'plugin-card-remove-btn'
		removeBtn.setAttribute(
			'aria-label',
			i18n.t('plugins.remove', { defaultValue: 'Remove plugin' })
		)
		removeBtn.title = i18n.t('plugins.remove', { defaultValue: 'Remove plugin' })
		removeBtn.innerHTML = `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>`

		removeBtn.addEventListener('click', () => {
			const api = (window as ElectronAPIRef).electronAPI
			void api?.pluginsRemove?.(plugin.id)
		})

		actions.appendChild(toggleBtn)
		actions.appendChild(removeBtn)
	} else {
		const badge = document.createElement('span')
		badge.className = 'plugin-card-badge'
		badge.textContent = i18n.t('plugins.locked', { defaultValue: 'locked' })
		actions.appendChild(badge)
	}

	card.appendChild(info)
	card.appendChild(actions)
	fragment.appendChild(card)

	if (!plugin.locked) {
		const priorityControls = document.createElement('div')
		priorityControls.className = 'plugin-card-controls'

		const priorityRow = document.createElement('div')
		priorityRow.className = 'plugin-control-row'

		const priorityLabel = document.createElement('div')
		priorityLabel.className = 'plugin-control-label'
		priorityLabel.textContent = i18n.t('plugins.priority', { defaultValue: 'Priority' })

		const priorityWrap = document.createElement('div')
		priorityWrap.className = 'plugin-priority-wrap'

		const priorityCaption = document.createElement('span')
		priorityCaption.className = 'plugin-priority-label'
		priorityCaption.textContent = i18n.t('plugins.priorityShort', { defaultValue: 'priority' })

		const priorityInput = document.createElement('input')
		priorityInput.type = 'number'
		priorityInput.className = 'plugin-priority-input'
		priorityInput.value = String(plugin.priority)
		priorityInput.min = '0'
		priorityInput.max = '999'
		priorityInput.title = i18n.t('plugins.priorityHint', {
			defaultValue: 'Plugin priority (higher = takes over lower priority plugins)',
		})

		let priorityTimer: ReturnType<typeof setTimeout> | null = null
		priorityInput.addEventListener('input', () => {
			if (priorityTimer) clearTimeout(priorityTimer)
			priorityTimer = setTimeout(() => {
				const val = parseInt(priorityInput.value, 10)
				if (!isNaN(val) && val >= 0) {
					const api = (window as ElectronAPIRef).electronAPI
					api?.pluginsSetPriority?.(plugin.id, val)
				}
			}, 600)
		})

		priorityWrap.appendChild(priorityCaption)
		priorityWrap.appendChild(priorityInput)
		priorityRow.appendChild(priorityLabel)
		priorityRow.appendChild(priorityWrap)
		priorityControls.appendChild(priorityRow)

		if (plugin.controls.length > 0) {
			for (const control of plugin.controls) {
				if (control.type === 'toggle') {
					priorityControls.appendChild(renderToggleControl(control))
				} else if (control.type === 'select') {
					priorityControls.appendChild(renderSelectControl(control))
				} else if (control.type === 'input') {
					priorityControls.appendChild(renderInputControl(control, plugin.id))
				}
			}
		}

		fragment.appendChild(priorityControls)
	} else if (plugin.controls.length > 0) {
		const controlsWrap = document.createElement('div')
		controlsWrap.className = 'plugin-card-controls'

		for (const control of plugin.controls) {
			if (control.type === 'toggle') {
				controlsWrap.appendChild(renderToggleControl(control))
			} else if (control.type === 'select') {
				controlsWrap.appendChild(renderSelectControl(control))
			} else if (control.type === 'input') {
				controlsWrap.appendChild(renderInputControl(control, plugin.id))
			}
		}

		fragment.appendChild(controlsWrap)
	}

	return fragment
}

export function setupPluginsPage(): void {
	const api = window.electronAPI

	const list = document.getElementById('plugins-list')
	const empty = document.getElementById('plugins-empty')
	const count = document.getElementById('plugins-count')

	if (!list || !empty || !count) return

	function updateCount(n: number): void {
		if (!count) return
		count.innerHTML = `${n} <span data-i18n="plugins.available">${i18n.t('plugins.available', { defaultValue: 'available' })}</span>`
	}

	function renderPlugins(plugins: PluginInfo[]): void {
		if (!list || !empty) return

		list.innerHTML = ''

		if (plugins.length === 0) {
			empty.setAttribute('data-visible', 'true')
			updateCount(0)
			return
		}

		empty.setAttribute('data-visible', 'false')
		updateCount(plugins.length)

		const sorted = [...plugins].sort((a, b) => b.priority - a.priority)
		for (const plugin of sorted) {
			list.appendChild(renderPluginCard(plugin))
		}
	}

	async function initialRender(): Promise<void> {
		let plugins: PluginInfo[] = []

		if (api?.pluginsList) {
			try {
				plugins = await api.pluginsList()
			} catch {
				plugins = []
			}
		}

		renderPlugins(plugins)
	}

	void initialRender()

	if (api?.onPluginsListUpdated) {
		api.onPluginsListUpdated((updatedPlugins: PluginInfo[]) => {
			renderPlugins(updatedPlugins)
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

	const dialog = document.createElement('div')
	dialog.id = 'plugin-install-confirm'
	dialog.className = 'dialog'
	dialog.setAttribute('role', 'dialog')
	dialog.setAttribute('aria-modal', 'true')
	dialog.setAttribute('aria-labelledby', 'plugin-install-title')
	dialog.hidden = true

	const backdrop = document.createElement('div')
	backdrop.className = 'dialog-backdrop'
	backdrop.addEventListener('click', () => {
		close()
	})

	const panel = document.createElement('div')
	panel.className = 'dialog-panel'

	const header = document.createElement('div')
	header.className = 'dialog-header'

	const title = document.createElement('h2')
	title.id = 'plugin-install-title'
	title.className = 'dialog-title'
	title.textContent = i18n.t('plugins.installTitle', { defaultValue: 'Install plugin?' })

	const closeBtn = document.createElement('button')
	closeBtn.type = 'button'
	closeBtn.className = 'dialog-close'
	closeBtn.setAttribute('aria-label', i18n.t('common.close', { defaultValue: 'Close' }))
	closeBtn.innerHTML = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>`
	closeBtn.addEventListener('click', () => {
		close()
	})

	header.appendChild(title)
	header.appendChild(closeBtn)

	const body = document.createElement('div')
	body.className = 'dialog-body'
	body.style.padding = '12px 16px'
	body.style.display = 'flex'
	body.style.flexDirection = 'column'
	body.style.gap = '8px'

	const pluginName = document.createElement('p')
	pluginName.style.margin = '0'
	pluginName.style.fontSize = '13px'
	pluginName.style.fontWeight = '500'
	pluginName.style.color = 'var(--content-highlight-color)'
	pluginName.textContent = `${payload.title} · v${payload.version}`

	const warning = document.createElement('p')
	warning.style.margin = '0'
	warning.style.fontSize = '12px'
	warning.style.lineHeight = '1.5'
	warning.style.color = 'var(--text-secondary)'
	warning.textContent = i18n.t('plugins.installWarning', {
		defaultValue:
			'Plugin code runs with the same permissions as Void Presence. Install only plugins you trust.',
	})

	const feedback = document.createElement('p')
	feedback.setAttribute('role', 'status')
	feedback.setAttribute('aria-live', 'polite')
	feedback.style.margin = '0'
	feedback.style.fontSize = '12px'
	feedback.style.color = 'var(--text-secondary)'
	feedback.hidden = true

	body.appendChild(pluginName)
	body.appendChild(warning)
	body.appendChild(feedback)

	const footer = document.createElement('div')
	footer.style.display = 'flex'
	footer.style.justifyContent = 'flex-end'
	footer.style.gap = '8px'
	footer.style.padding = '12px 16px'
	footer.style.borderTop = 'var(--editor-hairline) solid var(--border-secondary)'

	const cancelBtn = document.createElement('button')
	cancelBtn.type = 'button'
	cancelBtn.className = 'dialog-btn dialog-btn--ghost'
	cancelBtn.textContent = i18n.t('common.cancel', { defaultValue: 'Cancel' })

	const confirmBtn = document.createElement('button')
	confirmBtn.type = 'button'
	confirmBtn.className = 'dialog-btn'
	confirmBtn.textContent = i18n.t('plugins.install', { defaultValue: 'Install' })

	cancelBtn.addEventListener('click', () => {
		close()
	})

	footer.appendChild(cancelBtn)
	footer.appendChild(confirmBtn)

	panel.appendChild(header)
	panel.appendChild(body)
	panel.appendChild(footer)

	dialog.appendChild(backdrop)
	dialog.appendChild(panel)
	document.body.appendChild(dialog)

	dialog.removeAttribute('data-closing')
	dialog.hidden = false
	requestAnimationFrame(() => {
		dialog.dataset.open = 'true'
	})

	let installing = false
	let closed = false

	function close(): void {
		if (installing || closed) return
		closed = true
		document.removeEventListener('keydown', onKeyDown)

		dialog.dataset.closing = ''
		delete dialog.dataset.open

		panel.addEventListener(
			'transitionend',
			() => {
				dialog.remove()
				if (previousFocus instanceof HTMLElement && previousFocus.isConnected) {
					previousFocus.focus()
				}
			},
			{ once: true }
		)
	}

	function onKeyDown(event: KeyboardEvent): void {
		if (!dialog.isConnected) {
			document.removeEventListener('keydown', onKeyDown)
			return
		}

		if (event.key === 'Escape') {
			event.preventDefault()
			close()
			return
		}

		if (event.key !== 'Tab') return

		const focusable = [cancelBtn, confirmBtn].filter(btn => !btn.disabled && !btn.hidden)
		const first = focusable[0]
		const last = focusable[focusable.length - 1]

		if (!first || !last) {
			event.preventDefault()
			return
		}

		if (
			event.shiftKey &&
			(document.activeElement === first || !panel.contains(document.activeElement))
		) {
			event.preventDefault()
			last.focus()
		} else if (
			!event.shiftKey &&
			(document.activeElement === last || !panel.contains(document.activeElement))
		) {
			event.preventDefault()
			first.focus()
		}
	}

	confirmBtn.addEventListener('click', () => {
		void (async () => {
			if (installing || closed) return

			installing = true
			cancelBtn.disabled = true
			confirmBtn.disabled = true
			confirmBtn.textContent = i18n.t('plugins.installing', { defaultValue: 'Installing…' })
			feedback.hidden = false
			feedback.textContent = i18n.t('plugins.downloading', { defaultValue: 'Downloading plugin…' })

			console.info('[plugins] User confirmed install', { pluginId: payload.pluginId })

			try {
				if (typeof api.pluginsInstallConfirmed !== 'function') {
					throw new Error(
						i18n.t('plugins.apiUnavailable', {
							defaultValue: 'Plugin installation API is unavailable.',
						})
					)
				}

				const result = await api.pluginsInstallConfirmed(payload.pluginId)

				if (!result?.ok) {
					throw new Error(
						result?.error ??
							i18n.t('plugins.installFailed', { defaultValue: 'Plugin installation failed.' })
					)
				}

				feedback.textContent = i18n.t('plugins.downloadSuccess', {
					defaultValue: 'Plugin downloaded successfully.',
				})
				confirmBtn.hidden = true

				console.info('[plugins] Install completed', { pluginId: payload.pluginId })
			} catch (error) {
				feedback.textContent =
					error instanceof Error
						? error.message
						: i18n.t('plugins.installFailed', { defaultValue: 'Plugin installation failed.' })

				confirmBtn.hidden = true

				console.warn('[plugins] Install failed', { pluginId: payload.pluginId })
			} finally {
				installing = false
				cancelBtn.disabled = false
				cancelBtn.textContent = i18n.t('common.close', { defaultValue: 'Close' })
				cancelBtn.focus()
			}
		})()
	})

	document.addEventListener('keydown', onKeyDown)
	cancelBtn.focus()

	console.info('[plugins] Install confirmation opened', { pluginId: payload.pluginId })
}
