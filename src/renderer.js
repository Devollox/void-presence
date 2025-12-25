const logsViewList = document.getElementById('logs-view-list')
const logsCounter = document.getElementById('logs-counter')
const maxLogs = 120
const navMain = document.getElementById('nav-main')
const navLogs = document.getElementById('nav-logs')
const navConfig = document.getElementById('nav-config')
const views = document.querySelectorAll('.view')

function setActiveView(viewName) {
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
			viewName === 'config' ? 'true' : 'false'
		)
	}
}

if (navMain) {
	navMain.addEventListener('click', () => setActiveView('main'))
}
if (navLogs) {
	navLogs.addEventListener('click', () => setActiveView('logs'))
}
if (navConfig) {
	navConfig.addEventListener('click', () => setActiveView('config'))
}

function appendLog(entry) {
	if (!logsViewList) return
	const now = new Date()
	const time =
		String(now.getHours()).padStart(2, '0') +
		':' +
		String(now.getMinutes()).padStart(2, '0') +
		':' +
		String(now.getSeconds()).padStart(2, '0')
	const level = (entry.level || entry.type || 'info').toLowerCase()
	const rawText = entry.message || entry.text || entry.error || String(entry)
	const isErrorText = /error/i.test(rawText) || /fails because/i.test(rawText)
	const isError = level === 'error' || isErrorText
	const item = document.createElement('div')
	item.className = 'log-item' + (isError ? ' log-error' : '')
	const dot = document.createElement('div')
	dot.className = 'log-level-dot'
	const meta = document.createElement('div')
	meta.className = 'log-item-meta'
	meta.textContent = time + ' · ' + level.toUpperCase()
	const msg = document.createElement('div')
	msg.className = 'log-item-message'
	rawText.split('\n').forEach(line => {
		const lineEl = document.createElement('div')
		lineEl.textContent = line
		msg.appendChild(lineEl)
	})
	item.appendChild(dot)
	item.appendChild(meta)
	item.appendChild(msg)
	logsViewList.insertBefore(item, logsViewList.firstChild)
	while (logsViewList.children.length > maxLogs) {
		logsViewList.removeChild(logsViewList.lastChild)
	}
	if (logsCounter) {
		const count = logsViewList.children.length
		logsCounter.textContent = count + ' entries'
	}
	if (navLogs) {
		const first = logsViewList.firstChild
		const firstIsError = first && first.classList.contains('log-error')
		if (firstIsError) {
			navLogs.classList.add('sidebar-nav-item-error')
		} else {
			navLogs.classList.remove('sidebar-nav-item-error')
		}
	}
}

if (window.electronAPI && window.electronAPI.onLogMessage) {
	window.electronAPI.onLogMessage(entry => {
		appendLog(entry)
	})
}

function mapStatusToText(status) {
	switch (status) {
		case 'DISABLED':
			return { chip: 'IDLE', sub: 'Waiting to start' }
		case 'SEARCHING DISCORD':
			return { chip: 'SEARCHING', sub: 'Looking for Discord process' }
		case 'CONNECTING RPC':
			return { chip: 'CONNECTING', sub: 'Attaching Rich Presence' }
		case 'ACTIVE':
			return { chip: 'ACTIVE', sub: 'Presence is broadcasting' }
		case 'RESTARTING':
			return { chip: 'RESTARTING', sub: 'Restarting Rich Presence' }
		case 'DISCONNECTED':
			return { chip: 'DISCONNECTED', sub: 'Lost connection to Discord' }
		case 'NO_CLIENT_ID':
			return { chip: 'NO CLIENT', sub: 'Set ID, cycles' }
		default:
			return { chip: 'UNKNOWN', sub: status || '' }
	}
}

function updateInfo(payload) {
	const title = document.getElementById('activity-title')
	const sub = document.getElementById('activity-sub')
	const infoButtons = document.getElementById('info-buttons')
	const infoObject = document.getElementById('info-object')
	const infoDetails = document.getElementById('info-details')
	const infoStatus = document.getElementById('info-status')
	const metaObject = document.getElementById('meta-object')
	const metaButtons = document.getElementById('meta-buttons')
	if (
		!title ||
		!sub ||
		!infoButtons ||
		!infoObject ||
		!infoDetails ||
		!infoStatus ||
		!metaObject ||
		!metaButtons
	) {
		return
	}
	if (!payload) {
		title.textContent = 'Idle'
		sub.textContent = 'Waiting for Discord'
		infoButtons.textContent = '–'
		infoObject.textContent = '–'
		infoDetails.textContent = '–'
		infoStatus.textContent = 'No active rich presence'
		metaObject.textContent = 'OBJECT: —'
		metaButtons.textContent = 'BUTTONS: —'
		return
	}
	title.textContent = payload.details || 'Rich Presence'
	sub.textContent = payload.state || ''
	const buttonsText =
		payload.buttons && payload.buttons.length
			? payload.buttons.map(b => b.label).join(' • ')
			: 'None'
	infoButtons.textContent = buttonsText
	infoObject.textContent = payload.details || '–'
	infoDetails.textContent = payload.state || '–'
	infoStatus.textContent = 'Active'
	metaObject.textContent = `OBJECT: ${payload.details || '—'}`
	metaButtons.textContent = `BUTTONS: ${buttonsText}`
}

function updateStatus(status) {
	const chip = document.querySelector('.status-chip span')
	const statusDot = document.querySelector('.status-dot')
	const subLabel = document.getElementById('activity-sub')
	const mapped = mapStatusToText(status)
	const title = document.getElementById('activity-title')
	if (title) title.textContent = mapped.chip
	if (chip) chip.textContent = mapped.chip
	if (subLabel) subLabel.textContent = mapped.sub
	if (statusDot) {
		if (status === 'ACTIVE') {
			statusDot.style.background =
				'radial-gradient(circle, #4ade80 0, #22c55e 50%, #000000 100%)'
		} else if (status === 'DISCONNECTED') {
			statusDot.style.background =
				'radial-gradient(circle, #fb7185 0, #f97373 50%, #000000 100%)'
		} else if (status === 'RESTARTING' || status === 'CONNECTING RPC') {
			statusDot.style.background =
				'radial-gradient(circle, #facc15 0, #eab308 50%, #000000 100%)'
		} else if (status === 'NO_CLIENT_ID') {
			statusDot.style.background =
				'radial-gradient(circle, #f97316 0, #ea580c 50%, #000000 100%)'
		} else {
			statusDot.style.background =
				'radial-gradient(circle, #ffffff 0, #ffffff 50%, #000000 100%)'
		}
	}
}

function setupRestartButton() {
	const btn = document.getElementById('restart-discord')
	if (!btn) return
	btn.addEventListener('click', e => {
		e.preventDefault()
		if (window.electronAPI && window.electronAPI.restartDiscordRich) {
			updateStatus('RESTARTING')
			window.electronAPI.restartDiscordRich()
		}
	})
}

function createButtonPairRow(pair, index, onChange, onRemove) {
	const row = document.createElement('div')
	row.className = 'pair-row'
	row.dataset.index = String(index)
	row.draggable = true
	const inputsWrap = document.createElement('div')
	inputsWrap.className = 'pair-inputs'
	const input1 = document.createElement('input')
	input1.placeholder = 'Label #1'
	input1.value = pair.label1 || ''
	const input2 = document.createElement('input')
	input2.placeholder = 'URL #1'
	input2.value = pair.url1 || ''
	const input3 = document.createElement('input')
	input3.placeholder = 'Label #2'
	input3.value = pair.label2 || ''
	const input4 = document.createElement('input')
	input4.placeholder = 'URL #2'
	input4.value = pair.url2 || ''
	const remove = document.createElement('button')
	remove.className = 'remove-btn'
	remove.type = 'button'
	remove.textContent = '×'
	function triggerChange() {
		onChange({
			label1: input1.value,
			url1: input2.value,
			label2: input3.value,
			url2: input4.value,
		})
	}
	input1.addEventListener('input', triggerChange)
	input2.addEventListener('input', triggerChange)
	input3.addEventListener('input', triggerChange)
	input4.addEventListener('input', triggerChange)
	remove.addEventListener('click', e => {
		e.preventDefault()
		onRemove()
	})
	row.appendChild(remove)
	inputsWrap.appendChild(input1)
	inputsWrap.appendChild(input2)
	inputsWrap.appendChild(input3)
	inputsWrap.appendChild(input4)
	row.appendChild(inputsWrap)
	return row
}

function createCycleRow(entry, index, onChange, onRemove) {
	const row = document.createElement('div')
	row.className = 'cycle-row'
	row.dataset.index = String(index)
	row.draggable = true
	const inputsWrap = document.createElement('div')
	inputsWrap.className = 'cycle-inputs'
	const input1 = document.createElement('input')
	input1.placeholder = 'Details'
	input1.value = entry.details || ''
	const input2 = document.createElement('input')
	input2.placeholder = 'State'
	input2.value = entry.state || ''
	const remove = document.createElement('button')
	remove.className = 'remove-btn'
	remove.type = 'button'
	remove.textContent = '×'
	function triggerChange() {
		onChange({
			details: input1.value,
			state: input2.value,
		})
	}
	input1.addEventListener('input', triggerChange)
	input2.addEventListener('input', triggerChange)
	remove.addEventListener('click', e => {
		e.preventDefault()
		onRemove()
	})
	row.appendChild(remove)
	inputsWrap.appendChild(input1)
	inputsWrap.appendChild(input2)
	row.appendChild(inputsWrap)
	return row
}

function createImageCycleRow(entry, index, onChange, onRemove) {
	const row = document.createElement('div')
	row.className = 'image-row'
	row.dataset.index = String(index)
	row.draggable = true
	const wrap = document.createElement('div')
	wrap.className = 'image-inputs'
	const largeKey = document.createElement('input')
	largeKey.placeholder = 'Large image key or URL'
	largeKey.value = entry.largeImage || ''
	const largeText = document.createElement('input')
	largeText.placeholder = 'Large hover text'
	largeText.value = entry.largeText || ''
	const smallKey = document.createElement('input')
	smallKey.placeholder = 'Small image key or URL'
	smallKey.value = entry.smallImage || ''
	const smallText = document.createElement('input')
	smallText.placeholder = 'Small hover text'
	smallText.value = entry.smallText || ''
	const remove = document.createElement('button')
	remove.className = 'remove-btn'
	remove.type = 'button'
	remove.textContent = '×'
	function triggerChange() {
		onChange({
			largeImage: largeKey.value,
			largeText: largeText.value,
			smallImage: smallKey.value,
			smallText: smallText.value,
		})
	}
	largeKey.addEventListener('input', triggerChange)
	largeText.addEventListener('input', triggerChange)
	smallKey.addEventListener('input', triggerChange)
	smallText.addEventListener('input', triggerChange)
	remove.addEventListener('click', e => {
		e.preventDefault()
		onRemove()
	})
	row.appendChild(remove)
	wrap.appendChild(largeKey)
	wrap.appendChild(largeText)
	wrap.appendChild(smallKey)
	wrap.appendChild(smallText)
	row.appendChild(wrap)
	return row
}

function loadCurrentState() {
	const clientId = localStorage.getItem('clientId') || ''
	const buttonPairs =
		JSON.parse(localStorage.getItem('buttonPairs') || '[]') || []
	const cycles = JSON.parse(localStorage.getItem('cycles') || '[]') || []
	const imageCycles =
		JSON.parse(localStorage.getItem('imageCycles') || '[]') || []
	return { clientId, buttonPairs, cycles, imageCycles }
}

function applyStateToUI(state) {
	const clientInput = document.getElementById('client-id-input')
	if (!clientInput) return
	clientInput.value = state.clientId || ''
	localStorage.setItem('clientId', state.clientId || '')
	localStorage.setItem('buttonPairs', JSON.stringify(state.buttonPairs || []))
	localStorage.setItem('cycles', JSON.stringify(state.cycles || []))
	localStorage.setItem('imageCycles', JSON.stringify(state.imageCycles || []))
	setupClientIdControls()
}

function setupConfigPage() {
	const nameInput = document.getElementById('config-name-input')
	const saveBtn = document.getElementById('config-save-btn')
	const list = document.getElementById('config-list')
	const addBtn = document.getElementById('config-add-btn')
	const exportBtn = document.getElementById('config-export-btn')
	if (!nameInput || !saveBtn || !list || !addBtn || !exportBtn) return

	function getConfigs() {
		try {
			const raw = localStorage.getItem('vpConfigs')
			return raw ? JSON.parse(raw) : []
		} catch {
			return []
		}
	}

	function setConfigs(configs) {
		localStorage.setItem('vpConfigs', JSON.stringify(configs))
	}

	function renderConfigs() {
		const configs = getConfigs()
			.slice()
			.sort((a, b) => {
				const ad = a.createdAt ? new Date(a.createdAt).getTime() : 0
				const bd = b.createdAt ? new Date(b.createdAt).getTime() : 0
				return bd - ad
			})

		list.innerHTML = ''
		configs.forEach(cfg => {
			const state = cfg.state || {}
			const firstCycle = (state.cycles && state.cycles[0]) || {}
			const details = firstCycle.details || 'New cycle'
			const activityState = firstCycle.state || 'In the void'
			const firstImage = (state.imageCycles && state.imageCycles[0]) || {}
			const largeImage =
				firstImage.largeImage ||
				'https://avatars.githubusercontent.com/u/122895078?v=4'

			const card = document.createElement('div')
			card.className = 'config-activity-card'

			const body = document.createElement('div')
			body.className = 'config-activity-body'

			const imgWrap = document.createElement('div')
			imgWrap.className = 'config-activity-image'
			const img = document.createElement('img')
			img.src = largeImage
			img.alt = 'app icon'
			imgWrap.appendChild(img)

			const detailsWrap = document.createElement('div')
			detailsWrap.className = 'config-activity-details'

			const title = document.createElement('div')
			title.className = 'config-activity-title'
			title.textContent = cfg.name || 'Unnamed profile'

			const line1 = document.createElement('div')
			line1.className = 'config-activity-line'
			line1.textContent = details

			const line2 = document.createElement('div')
			line2.className = 'config-activity-line'
			line2.textContent = activityState

			const footer = document.createElement('div')
			footer.className = 'config-activity-footer'
			footer.textContent = '00:35'

			detailsWrap.appendChild(title)
			detailsWrap.appendChild(line1)
			detailsWrap.appendChild(line2)
			detailsWrap.appendChild(footer)

			body.appendChild(imgWrap)
			body.appendChild(detailsWrap)

			const actions = document.createElement('div')
			actions.className = 'config-activity-actions'

			const loadBtn = document.createElement('button')
			loadBtn.className = 'config-activity-btn'
			loadBtn.textContent = 'load'

			const delBtn = document.createElement('button')
			delBtn.className = 'config-activity-btn danger'
			delBtn.textContent = '✕'

			loadBtn.addEventListener('click', e => {
				e.preventDefault()
				applyStateToUI(cfg.state)
				nameInput.value = cfg.name || ''
				setActiveView('main')
			})
			delBtn.addEventListener('click', e => {
				e.preventDefault()
				const filtered = getConfigs().filter(c => c.name !== cfg.name)
				setConfigs(filtered)
				renderConfigs()
			})

			actions.appendChild(loadBtn)
			actions.appendChild(delBtn)

			card.appendChild(body)
			card.appendChild(actions)

			list.appendChild(card)
		})
	}

	function addConfigFromState(name, state) {
		const configs = getConfigs().filter(c => c.name !== name)
		configs.push({
			name,
			state,
			createdAt: new Date().toISOString(),
		})
		setConfigs(configs)
		renderConfigs()
	}

	function downloadJson(data, filename) {
		const json = JSON.stringify(data, null, 2)
		const blob = new Blob([json], { type: 'application/json' })
		const url = URL.createObjectURL(blob)
		const a = document.createElement('a')
		a.href = url
		a.download = filename
		document.body.appendChild(a)
		a.click()
		document.body.removeChild(a)
		URL.revokeObjectURL(url)
	}

	saveBtn.addEventListener('click', e => {
		e.preventDefault()
		const name = nameInput.value.trim()
		if (!name) return
		const state = loadCurrentState()
		addConfigFromState(name, state)
	})

	addBtn.addEventListener('click', e => {
		e.preventDefault()
		const state = loadCurrentState()
		const name =
			nameInput.value.trim() ||
			`Profile ${new Date().toLocaleTimeString().slice(0, 5)}`
		addConfigFromState(name, state)
	})

	addBtn.addEventListener('dragover', e => {
		e.preventDefault()
		e.dataTransfer.dropEffect = 'copy'
	})

	addBtn.addEventListener('drop', e => {
		e.preventDefault()
		const files = e.dataTransfer.files
		if (!files || !files.length) return
		const file = files[0]
		const reader = new FileReader()
		reader.onload = ev => {
			try {
				const text = String(ev.target.result || '')
				const parsed = JSON.parse(text)
				const state = {
					clientId: localStorage.getItem('clientId') || '',
					cycles: Array.isArray(parsed.cycles) ? parsed.cycles : [],
					imageCycles: Array.isArray(parsed.imageCycles)
						? parsed.imageCycles
						: [],
					buttonPairs: Array.isArray(parsed.buttonPairs)
						? parsed.buttonPairs
						: [],
				}
				const baseName =
					nameInput.value.trim() ||
					file.name.replace(/\.[^.]+$/, '') ||
					'Imported profile'
				addConfigFromState(baseName, state)
			} catch (err) {
				console.error('Failed to import config', err)
			}
		}
		reader.readAsText(file)
	})

	exportBtn.addEventListener('click', e => {
		e.preventDefault()
		const state = loadCurrentState()
		const data = {
			clientId: undefined,
			cycles: state.cycles || [],
			imageCycles: state.imageCycles || [],
			buttonPairs: state.buttonPairs || [],
		}
		const name =
			nameInput.value.trim() ||
			`void-presence-${new Date().toISOString().slice(0, 10)}`
		downloadJson(data, `${name}.json`)
	})

	renderConfigs()
}

function setupClientIdControls() {
	const clientInput = document.getElementById('client-id-input')
	const saveBtn = document.getElementById('client-id-save')
	const buttonsList = document.getElementById('buttons-list')
	const addButtonPair = document.getElementById('add-button-pair')
	const cyclesList = document.getElementById('cycles-list')
	const addCycle = document.getElementById('add-cycle')
	const imagesList = document.getElementById('images-list')
	const addImage = document.getElementById('add-image')
	if (
		!clientInput ||
		!saveBtn ||
		!buttonsList ||
		!addButtonPair ||
		!cyclesList ||
		!addCycle ||
		!imagesList ||
		!addImage
	)
		return
	saveBtn.type = 'button'
	clientInput.value = localStorage.getItem('clientId') || ''
	let buttonPairs = []
	let cycles = []
	let imageCycles = []
	try {
		const rawPairs = localStorage.getItem('buttonPairs')
		if (rawPairs) {
			buttonPairs = JSON.parse(rawPairs)
		}
	} catch {}
	try {
		const rawCycles = localStorage.getItem('cycles')
		if (rawCycles) {
			cycles = JSON.parse(rawCycles)
		}
	} catch {}
	try {
		const rawImages = localStorage.getItem('imageCycles')
		if (rawImages) {
			imageCycles = JSON.parse(rawImages)
		}
	} catch {}
	if (!Array.isArray(imageCycles) || !imageCycles.length) {
		imageCycles = [
			{
				largeImage: 'https://avatars.githubusercontent.com/u/122895078?v=4',
				largeText: '',
				smallImage: '',
				smallText: '',
			},
		]
	}
	if (!Array.isArray(cycles) || !cycles.length) {
		cycles = [
			{ details: 'Idling in the void', state: 'Just vibing' },
			{ details: 'Counting stars', state: 'Lost in space' },
			{ details: 'Listening to silence', state: 'Deep focus' },
		]
	}
	if (!Array.isArray(imageCycles) || !imageCycles.length) {
		imageCycles = [
			{
				largeImage: localStorage.getItem('largeImage') || '',
				largeText: localStorage.getItem('largeText') || '',
				smallImage: localStorage.getItem('smallImage') || '',
				smallText: localStorage.getItem('smallText') || '',
			},
		]
	}

	function attachDnD(container, items, renderFn) {
		let dragIndex = null
		container.addEventListener('dragstart', e => {
			const row = e.target.closest('[data-index]')
			if (!row) return
			dragIndex = Number(row.dataset.index)
			row.classList.add('dragging')
		})
		container.addEventListener('dragend', e => {
			const row = e.target.closest('[data-index]')
			if (row) row.classList.remove('dragging')
			Array.from(container.children).forEach(ch => {
				ch.classList.remove('drop-target-top', 'drop-target-bottom')
			})
			dragIndex = null
		})
		container.addEventListener('dragover', e => {
			e.preventDefault()
			const row = e.target.closest('[data-index]')
			if (!row || dragIndex === null) return
			Array.from(container.children).forEach(ch => {
				ch.classList.remove('drop-target-top', 'drop-target-bottom')
			})
			const rect = row.getBoundingClientRect()
			const offset = e.clientY - rect.top
			if (offset < rect.height / 2) {
				row.classList.add('drop-target-top')
			} else {
				row.classList.add('drop-target-bottom')
			}
		})
		container.addEventListener('drop', e => {
			e.preventDefault()
			const row = e.target.closest('[data-index]')
			if (!row || dragIndex === null) return
			const targetIndex = Number(row.dataset.index)
			const rect = row.getBoundingClientRect()
			const offset = e.clientY - rect.top
			let insertIndex = targetIndex
			if (offset >= rect.height / 2) insertIndex = targetIndex + 1
			const [moved] = items.splice(dragIndex, 1)
			if (insertIndex > items.length) insertIndex = items.length
			items.splice(insertIndex, 0, moved)
			renderFn()
		})
	}

	function renderButtonPairs() {
		buttonsList.innerHTML = ''
		buttonPairs.forEach((pair, idx) => {
			const row = createButtonPairRow(
				pair,
				idx,
				updated => {
					buttonPairs[idx] = updated
				},
				() => {
					buttonPairs.splice(idx, 1)
					renderButtonPairs()
				}
			)
			buttonsList.appendChild(row)
		})
	}

	function renderCycles() {
		cyclesList.innerHTML = ''
		cycles.forEach((entry, idx) => {
			const row = createCycleRow(
				entry,
				idx,
				updated => {
					cycles[idx] = updated
				},
				() => {
					cycles.splice(idx, 1)
					renderCycles()
				}
			)
			cyclesList.appendChild(row)
		})
	}

	function renderImageCycles() {
		imagesList.innerHTML = ''
		imageCycles.forEach((entry, idx) => {
			const row = createImageCycleRow(
				entry,
				idx,
				updated => {
					imageCycles[idx] = updated
				},
				() => {
					imageCycles.splice(idx, 1)
					renderImageCycles()
				}
			)
			imagesList.appendChild(row)
		})
	}

	renderButtonPairs()
	renderCycles()
	renderImageCycles()
	attachDnD(buttonsList, buttonPairs, renderButtonPairs)
	attachDnD(cyclesList, cycles, renderCycles)
	attachDnD(imagesList, imageCycles, renderImageCycles)

	addButtonPair.addEventListener('click', e => {
		e.preventDefault()
		buttonPairs.push({
			label1: 'Button 1',
			url1: '',
			label2: 'Button 2',
			url2: '',
		})
		renderButtonPairs()
	})

	addCycle.addEventListener('click', e => {
		e.preventDefault()
		cycles.push({
			details: 'New cycle',
			state: '',
		})
		renderCycles()
	})

	addImage.addEventListener('click', e => {
		e.preventDefault()
		imageCycles.push({
			largeImage: '',
			largeText: '',
			smallImage: '',
			smallText: '',
		})
		renderImageCycles()
	})

	async function saveAll() {
		const clientId = clientInput.value.trim()
		const cleanedPairs = buttonPairs
			.map(p => ({
				label1: (p.label1 || '').trim(),
				url1: (p.url1 || '').trim(),
				label2: (p.label2 || '').trim(),
				url2: (p.url2 || '').trim(),
			}))
			.filter(
				p =>
					p.label1.length > 0 &&
					p.url1.length > 0 &&
					p.label2.length > 0 &&
					p.url2.length > 0
			)
		const cleanedCycles = cycles
			.map(c => ({
				details: (c.details || '').trim(),
				state: (c.state || '').trim(),
			}))
			.filter(c => c.details.length > 0 || c.state.length > 0)
		const cleanedImageCycles = imageCycles
			.map(c => ({
				largeImage: (c.largeImage || '').trim(),
				largeText: (c.largeText || '').trim(),
				smallImage: (c.smallImage || '').trim(),
				smallText: (c.smallText || '').trim(),
			}))
			.filter(
				c =>
					c.largeImage.length > 0 ||
					c.largeText.length > 0 ||
					c.smallImage.length > 0 ||
					c.smallText.length > 0
			)
		const first = cleanedImageCycles[0] || {
			largeImage: '',
			largeText: '',
			smallImage: '',
			smallText: '',
		}
		const largeImage = first.largeImage
		const largeText = first.largeText
		const smallImage = first.smallImage
		const smallText = first.smallText
		if (!clientId || !cleanedCycles.length) {
			updateStatus('NO_CLIENT_ID')
			return
		}
		localStorage.setItem('clientId', clientId)
		localStorage.setItem('largeImage', largeImage)
		localStorage.setItem('largeText', largeText)
		localStorage.setItem('smallImage', smallImage)
		localStorage.setItem('smallText', smallText)
		localStorage.setItem('buttonPairs', JSON.stringify(cleanedPairs))
		localStorage.setItem('cycles', JSON.stringify(cleanedCycles))
		localStorage.setItem('imageCycles', JSON.stringify(cleanedImageCycles))
		if (window.electronAPI && window.electronAPI.setClientId) {
			await window.electronAPI.setClientId(clientId)
		}
		if (window.electronAPI && window.electronAPI.setImageCycles) {
			await window.electronAPI.setImageCycles(cleanedImageCycles)
		}
		if (window.electronAPI && window.electronAPI.setButtons) {
			await window.electronAPI.setButtons(cleanedPairs)
		}
		if (window.electronAPI && window.electronAPI.setCycles) {
			await window.electronAPI.setCycles(cleanedCycles)
		}
		if (window.electronAPI && window.electronAPI.restartDiscordRich) {
			await window.electronAPI.restartDiscordRich()
		}
	}

	saveBtn.addEventListener('click', e => {
		e.preventDefault()
		saveAll()
	})
}

function setupAutoLaunchToggle() {
	const toggle = document.getElementById('auto-launch-toggle')
	if (!toggle) return
	const saved = localStorage.getItem('autoLaunch') === 'true'
	toggle.dataset.on = saved ? 'true' : 'false'
	toggle.addEventListener('click', () => {
		const current = toggle.dataset.on === 'true'
		const next = !current
		toggle.dataset.on = next ? 'true' : 'false'
		localStorage.setItem('autoLaunch', String(next))
		if (window.electronAPI && window.electronAPI.setAutoLaunch) {
			window.electronAPI.setAutoLaunch(next)
		}
	})
}

function setupWindowControls() {
	const closeBtn = document.getElementById('window-close')
	const minimizeBtn = document.getElementById('window-minimize')
	if (closeBtn && window.electronAPI && window.electronAPI.windowClose) {
		closeBtn.addEventListener('click', () => {
			window.electronAPI.windowClose()
		})
	}
	if (minimizeBtn && window.electronAPI && window.electronAPI.windowMinimize) {
		minimizeBtn.addEventListener('click', () => {
			window.electronAPI.windowMinimize()
		})
	}
}

window.addEventListener('DOMContentLoaded', () => {
	setupRestartButton()
	setupClientIdControls()
	setupAutoLaunchToggle()
	setupWindowControls()
	setupConfigPage()
	updateInfo(null)
	updateStatus('DISABLED')
	if (window.electronAPI && window.electronAPI.onRpcUpdate) {
		window.electronAPI.onRpcUpdate(payload => {
			updateInfo(payload)
		})
	}
	if (window.electronAPI && window.electronAPI.onRpcStatus) {
		window.electronAPI.onRpcStatus(status => {
			updateStatus(status)
		})
	}
})
