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
	const isSuccess = level === 'success'
	const item = document.createElement('div')
	item.className = 'log-item'
	if (isError) {
		item.classList.add('log-error')
	} else if (isSuccess) {
		item.classList.add('log-success')
	}
	const dot = document.createElement('div')
	dot.className = 'log-level-dot'
	if (isError) {
		dot.classList.add('dot-error')
	} else if (isSuccess) {
		dot.classList.add('dot-success')
	}
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
		const firstIsSuccess = first && first.classList.contains('log-success')

		navLogs.classList.remove(
			'sidebar-nav-item-error',
			'sidebar-nav-item-success'
		)

		if (firstIsError) {
			navLogs.classList.add('sidebar-nav-item-error')
		} else if (firstIsSuccess) {
			navLogs.classList.add('sidebar-nav-item-success')
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
			return {
				chip: 'SEARCHING DISCORD PROCESS',
				sub: 'Looking for Discord process',
			}
		case 'CONNECTING RPC':
			return { chip: 'CONNECTING', sub: 'Attaching Rich Presence' }
		case 'ACTIVE':
			return { chip: 'ACTIVE', sub: 'Presence is broadcasting' }
		case 'RESTARTING':
			return { chip: 'RESTARTING', sub: 'Restarting Rich Presence' }
		case 'DISCONNECTED':
			return { chip: 'DISCONNECTED', sub: 'Lost connection to Discord' }
		case 'NO_CLIENT_ID':
			return { chip: 'NO CLIENT', sub: 'Set ID, cycles, update' }
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

async function setupIntervalControl() {
	const input = document.getElementById('update-interval-input')
	if (!input) return
	const saved = parseInt(localStorage.getItem('updateIntervalSec') || '30', 10)
	if (!Number.isNaN(saved) && saved > 0) {
		input.value = String(saved)
		if (window.electronAPI && window.electronAPI.setActivityInterval) {
			await window.electronAPI.setActivityInterval(saved)
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

async function saveAllFromState(state) {
	const clientId = (state.clientId || '').trim()
	const buttonPairs = Array.isArray(state.buttonPairs) ? state.buttonPairs : []
	const cycles = Array.isArray(state.cycles) ? state.cycles : []
	const imageCycles = Array.isArray(state.imageCycles) ? state.imageCycles : []

	const cleanedPairs = buttonPairs
		.map(p => {
			const label1 = (p.label1 || '').trim()
			const url1 = (p.url1 || '').trim()
			const label2 = (p.label2 || '').trim()
			const url2 = (p.url2 || '').trim()
			const has1 = label1 && url1
			const has2 = label2 && url2
			return {
				label1: has1 ? label1 : '',
				url1: has1 ? url1 : '',
				label2: has2 ? label2 : '',
				url2: has2 ? url2 : '',
			}
		})
		.filter(p => (p.label1 && p.url1) || (p.label2 && p.url2))
		.map(p => {
			const res = { label1: p.label1, url1: p.url1 }
			if (p.label2 && p.url2) {
				res.label2 = p.label2
				res.url2 = p.url2
			}
			return res
		})

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

	const intervalSecRaw = Number(state.updateIntervalSec)

	if (
		!clientId ||
		!cleanedCycles.length ||
		!Number.isFinite(intervalSecRaw) ||
		intervalSecRaw <= 0
	) {
		updateStatus('NO_CLIENT_ID')
		return
	}

	localStorage.setItem('clientId', clientId)
	localStorage.setItem('buttonPairs', JSON.stringify(cleanedPairs))
	localStorage.setItem('cycles', JSON.stringify(cleanedCycles))
	localStorage.setItem('imageCycles', JSON.stringify(cleanedImageCycles))
	localStorage.setItem('updateIntervalSec', String(intervalSecRaw))

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
	if (window.electronAPI && window.electronAPI.setActivityInterval) {
		await window.electronAPI.setActivityInterval(intervalSecRaw)
	}
	if (window.electronAPI && window.electronAPI.restartDiscordRich) {
		await window.electronAPI.restartDiscordRich()
	}
}

function applyStateToUIAndLists(state, ctx) {
	const clientInput = document.getElementById('client-id-input')
	if (!clientInput) return
	clientInput.value = state.clientId || ''
	localStorage.setItem('clientId', state.clientId || '')
	localStorage.setItem('buttonPairs', JSON.stringify(state.buttonPairs || []))
	localStorage.setItem('cycles', JSON.stringify(state.cycles || []))
	localStorage.setItem('imageCycles', JSON.stringify(state.imageCycles || []))
	ctx.buttonPairs = Array.isArray(state.buttonPairs) ? state.buttonPairs : []
	ctx.cycles = Array.isArray(state.cycles) ? state.cycles : []
	ctx.imageCycles = Array.isArray(state.imageCycles) ? state.imageCycles : []
	ctx.renderButtonPairs()
	ctx.renderCycles()
	ctx.renderImageCycles()
}

function renderList(listEl, items, type) {
	listEl.innerHTML = ''
	if (!items || !items.length) {
		const empty = document.createElement('div')
		empty.className = 'config-details-empty'
		empty.textContent =
			type === 'cycles'
				? 'No cycles saved'
				: type === 'images'
					? 'No image configuration'
					: 'No buttons configured'
		listEl.appendChild(empty)
		return
	}

	items.forEach((item, idx) => {
		const row = document.createElement('div')
		row.className = 'config-details-item'
		const main = document.createElement('div')
		main.className = 'config-details-item-main'
		const meta = document.createElement('div')
		meta.className = 'config-details-item-meta'

		if (type === 'cycles') {
			const label = document.createElement('div')
			label.className = 'config-details-item-label'
			label.textContent = item.details || 'No details'
			const sub = document.createElement('div')
			sub.className = 'config-details-item-sub'
			sub.textContent = item.state || 'No state'
			main.appendChild(label)
			main.appendChild(sub)
			const pill = document.createElement('div')
			pill.className = 'config-details-pill'
			pill.textContent = `#${idx + 1}`
			meta.appendChild(pill)
		} else if (type === 'images') {
			const label = document.createElement('div')
			label.className = 'config-details-item-label'
			label.textContent = item.largeText || item.largeImage || 'Large image'
			const largeUrlPill = document.createElement('div')
			largeUrlPill.className = 'config-details-pill'
			const largeLink = document.createElement('a')
			largeLink.href = item.largeImage || '#'
			largeLink.textContent = item.largeImage || 'no large url'
			largeLink.target = '_blank'
			largeUrlPill.appendChild(largeLink)
			main.appendChild(label)
			main.appendChild(largeUrlPill)
			const sub = document.createElement('div')
			sub.className = 'config-details-item-sub'
			sub.textContent = item.smallText || item.smallImage || 'Small image'
			const smallUrlPill = document.createElement('div')
			smallUrlPill.className = 'config-details-pill'
			const smallLink = document.createElement('a')
			smallLink.href = item.smallImage || '#'
			smallLink.textContent = item.smallImage || 'no'
			if (smallLink.textContent !== 'no') {
				smallLink.target = '_blank'
				smallUrlPill.appendChild(smallLink)
				meta.appendChild(sub)
				meta.appendChild(smallUrlPill)
			}
		} else if (type === 'buttons') {
			const mainLabel = document.createElement('div')
			mainLabel.className = 'config-details-item-label'
			mainLabel.textContent = item.label1 || 'Button 1'
			const mainUrlPill = document.createElement('div')
			mainUrlPill.className = 'config-details-pill'
			const mainLink = document.createElement('a')
			mainLink.href = item.url1 || '#'
			mainLink.textContent = item.url1 || 'no url 1'
			if (mainLink.textContent !== 'no url 1') {
				mainLink.target = '_blank'
				mainUrlPill.appendChild(mainLink)
				main.appendChild(mainLabel)
				main.appendChild(mainUrlPill)
			}
			const metaLabel = document.createElement('div')
			metaLabel.className = 'config-details-item-label'
			metaLabel.textContent = item.label2 || 'Button 2'
			const metaUrlPill = document.createElement('div')
			metaUrlPill.className = 'config-details-pill'
			const metaLink = document.createElement('a')
			metaLink.href = item.url2 || '#'
			metaLink.textContent = item.url2 || 'no url 2'
			if (metaLink.textContent !== 'no url 2') {
				metaLink.target = '_blank'
				metaUrlPill.appendChild(metaLink)
				main.appendChild(metaLabel)
				main.appendChild(metaUrlPill)
			}
		}

		row.appendChild(main)
		row.appendChild(meta)
		listEl.appendChild(row)
	})
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
	const ctx = {
		buttonPairs: [],
		cycles: [],
		imageCycles: [],
		renderButtonPairs: null,
		renderCycles: null,
		renderImageCycles: null,
	}
	try {
		const rawPairs = localStorage.getItem('buttonPairs')
		if (rawPairs) ctx.buttonPairs = JSON.parse(rawPairs)
	} catch {}
	try {
		const rawCycles = localStorage.getItem('cycles')
		if (rawCycles) ctx.cycles = JSON.parse(rawCycles)
	} catch {}
	try {
		const rawImages = localStorage.getItem('imageCycles')
		if (rawImages) ctx.imageCycles = JSON.parse(rawImages)
	} catch {}
	if (!Array.isArray(ctx.buttonPairs)) ctx.buttonPairs = []
	if (!Array.isArray(ctx.cycles) || !ctx.cycles.length) {
		ctx.cycles = [
			{ details: 'Idling in the void', state: 'Just vibing' },
			{ details: 'Counting stars', state: 'Lost in space' },
			{ details: 'Listening to silence', state: 'Deep focus' },
		]
	}
	if (!Array.isArray(ctx.imageCycles)) ctx.imageCycles = []

	function attachDnD(container, items, renderFn) {
		let dragIndex = null
		container.addEventListener('dragstart', e => {
			const target = e.target
			const isInput =
				target instanceof HTMLInputElement ||
				target instanceof HTMLTextAreaElement
			if (isInput || window.getSelection()?.toString()) {
				e.preventDefault()
				return
			}
			const row = target.closest('[data-index]')
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

	ctx.renderButtonPairs = function () {
		buttonsList.innerHTML = ''
		ctx.buttonPairs.forEach((pair, idx) => {
			const row = createButtonPairRow(
				pair,
				idx,
				updated => {
					ctx.buttonPairs[idx] = updated
				},
				() => {
					ctx.buttonPairs.splice(idx, 1)
					ctx.renderButtonPairs()
				}
			)
			buttonsList.appendChild(row)
		})
	}

	ctx.renderCycles = function () {
		cyclesList.innerHTML = ''
		ctx.cycles.forEach((entry, idx) => {
			const row = createCycleRow(
				entry,
				idx,
				updated => {
					ctx.cycles[idx] = updated
				},
				() => {
					ctx.cycles.splice(idx, 1)
					ctx.renderCycles()
				}
			)
			cyclesList.appendChild(row)
		})
	}

	ctx.renderImageCycles = function () {
		imagesList.innerHTML = ''
		ctx.imageCycles.forEach((entry, idx) => {
			const row = createImageCycleRow(
				entry,
				idx,
				updated => {
					ctx.imageCycles[idx] = updated
				},
				() => {
					ctx.imageCycles.splice(idx, 1)
					ctx.renderImageCycles()
				}
			)
			imagesList.appendChild(row)
		})
	}

	ctx.renderButtonPairs()
	ctx.renderCycles()
	ctx.renderImageCycles()
	attachDnD(buttonsList, ctx.buttonPairs, ctx.renderButtonPairs)
	attachDnD(cyclesList, ctx.cycles, ctx.renderCycles)
	attachDnD(imagesList, ctx.imageCycles, ctx.renderImageCycles)

	addButtonPair.addEventListener('click', e => {
		e.preventDefault()
		ctx.buttonPairs.push({
			label1: '',
			url1: '',
			label2: '',
			url2: '',
		})
		ctx.renderButtonPairs()
	})

	addCycle.addEventListener('click', e => {
		e.preventDefault()
		ctx.cycles.push({
			details: '',
			state: '',
		})
		ctx.renderCycles()
	})

	addImage.addEventListener('click', e => {
		e.preventDefault()
		ctx.imageCycles.push({
			largeImage: '',
			largeText: '',
			smallImage: '',
			smallText: '',
		})
		ctx.renderImageCycles()
	})

	async function saveAll() {
		const intervalInput = document.getElementById('update-interval-input')
		const intervalSec = intervalInput
			? parseInt(intervalInput.value.trim(), 10)
			: NaN
		const state = {
			clientId: clientInput.value,
			buttonPairs: ctx.buttonPairs,
			cycles: ctx.cycles,
			imageCycles: ctx.imageCycles,
			updateIntervalSec: intervalSec,
		}
		await saveAllFromState(state)
	}

	saveBtn.addEventListener('click', e => {
		e.preventDefault()
		saveAll()
	})

	window.__voidPresenceCtx = ctx
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

function setupAutoHideToggle() {
	const toggle = document.getElementById('auto-hide-toggle')
	if (!toggle) return
	const saved = localStorage.getItem('autoHide') === 'true'
	toggle.dataset.on = saved ? 'true' : 'false'
	toggle.addEventListener('click', () => {
		const current = toggle.dataset.on === 'true'
		const next = !current
		toggle.dataset.on = next ? 'true' : 'false'
		localStorage.setItem('autoHide', String(next))
		if (window.electronAPI && window.electronAPI.setAutoHide) {
			window.electronAPI.setAutoHide(next)
		}
	})
}

function setupStopButton() {
	const btn = document.getElementById('stop-discord')
	if (!btn) return
	btn.addEventListener('click', e => {
		e.preventDefault()
		if (window.electronAPI && window.electronAPI.stopDiscordRich) {
			updateStatus('DISABLED')
			updateInfo(null)
			window.electronAPI.stopDiscordRich()
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

function setupConfigDetailsOverlay() {
	const overlay = document.getElementById('config-details-overlay')
	const closeBtn = document.getElementById('config-details-close')
	if (!overlay || !closeBtn) return
	function close() {
		overlay.dataset.open = 'false'
	}
	closeBtn.addEventListener('click', e => {
		e.preventDefault()
		close()
	})
	overlay.addEventListener('click', e => {
		if (e.target === overlay) {
			close()
		}
	})
}

function openConfigDetails(cfg) {
	const overlay = document.getElementById('config-details-overlay')
	const nameEl = document.getElementById('config-details-name')
	const cyclesEl = document.getElementById('config-details-cycles')
	const imagesEl = document.getElementById('config-details-images')
	const buttonsEl = document.getElementById('config-details-buttons')
	if (!overlay || !nameEl || !cyclesEl || !imagesEl || !buttonsEl) {
		return
	}
	const state = cfg.state || {}
	nameEl.textContent = cfg.name || 'Unnamed profile'
	renderList(cyclesEl, state.cycles || [], 'cycles')
	renderList(imagesEl, state.imageCycles || [], 'images')
	renderList(buttonsEl, state.buttonPairs || [], 'buttons')
	overlay.dataset.open = 'true'
}

function importConfigFromFile(file) {
	const reader = new FileReader()
	reader.onload = ev => {
		try {
			const text = String(ev.target.result || '')
			const parsed = JSON.parse(text)
			const state = {
				clientId: undefined,
				cycles: Array.isArray(parsed.cycles) ? parsed.cycles : [],
				imageCycles: Array.isArray(parsed.imageCycles)
					? parsed.imageCycles
					: [],
				buttonPairs: Array.isArray(parsed.buttonPairs)
					? parsed.buttonPairs
					: [],
			}
			const nameInput = document.getElementById('config-name-input')
			const baseName =
				(nameInput && nameInput.value.trim()) ||
				file.name.replace(/\.[^.]+$/, '') ||
				'Imported profile'
			addConfigFromState(baseName, state)
		} catch (err) {
			console.error('Failed to import config', err)
		}
	}
	reader.readAsText(file)
}

function setupImportOverlay() {
	const importOverlay = document.getElementById('import-overlay')
	const importCloseBtn = document.getElementById('import-close-btn')
	const importFileInput = document.getElementById('import-file-input')
	if (!importOverlay || !importCloseBtn || !importFileInput) return

	function closeImport() {
		importOverlay.dataset.open = 'false'
		importFileInput.value = ''
	}

	importCloseBtn.addEventListener('click', e => {
		e.preventDefault()
		closeImport()
	})

	importOverlay.addEventListener('click', e => {
		if (e.target === importOverlay) closeImport()
	})

	importFileInput.addEventListener('change', () => {
		const file = importFileInput.files && importFileInput.files[0]
		if (!file) return
		importConfigFromFile(file)
		closeImport()
	})
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
			const firstImage =
				(Array.isArray(state.imageCycles) && state.imageCycles[0]) || null
			const largeImage =
				firstImage && firstImage.largeImage
					? firstImage.largeImage
					: 'about:blank'

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

			const detailsBtn = document.createElement('button')
			detailsBtn.className = 'config-activity-btn'
			detailsBtn.textContent = 'details'

			const exportBtnCfg = document.createElement('button')
			exportBtnCfg.className = 'config-activity-btn'
			exportBtnCfg.textContent = 'export'

			const delBtn = document.createElement('button')
			delBtn.className = 'config-activity-btn danger'
			delBtn.textContent = '✕'

			loadBtn.addEventListener('click', async e => {
				e.preventDefault()
				const ctx = window.__voidPresenceCtx
				if (!ctx) return
				const st = {
					clientId: state.clientId || localStorage.getItem('clientId') || '',
					updateIntervalSec:
						state.updateIntervalSec ||
						localStorage.getItem('updateIntervalSec') ||
						'',
					buttonPairs: Array.isArray(state.buttonPairs)
						? state.buttonPairs
						: [],
					cycles: Array.isArray(state.cycles) ? state.cycles : [],
					imageCycles: Array.isArray(state.imageCycles)
						? state.imageCycles
						: [],
				}
				applyStateToUIAndLists(st, ctx)
				await saveAllFromState(st)
				nameInput.value = ''

				setActiveView('main')
			})

			detailsBtn.addEventListener('click', e => {
				e.preventDefault()
				openConfigDetails(cfg)
			})

			exportBtnCfg.addEventListener('click', e => {
				e.preventDefault()
				const data = {
					clientId: undefined,
					cycles: (state.cycles && state.cycles.slice()) || [],
					imageCycles: (state.imageCycles && state.imageCycles.slice()) || [],
					buttonPairs: (state.buttonPairs && state.buttonPairs.slice()) || [],
				}
				const name =
					cfg.name || `void-presence-${new Date().toISOString().slice(0, 10)}`
				downloadJson(data, `${name}.json`)
			})

			delBtn.addEventListener('click', e => {
				e.preventDefault()
				const filtered = getConfigs().filter(c => c.name !== cfg.name)
				setConfigs(filtered)
				renderConfigs()
			})

			actions.appendChild(loadBtn)
			actions.appendChild(detailsBtn)
			actions.appendChild(exportBtnCfg)
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

	window.addConfigFromState = addConfigFromState

	saveBtn.addEventListener('click', async e => {
		e.preventDefault()
		const name = nameInput.value.trim()
		if (!name) return
		const state = loadCurrentState()
		addConfigFromState(name, state)
		await saveAllFromState(state)
		nameInput.value = ''
	})

	addBtn.addEventListener('click', async e => {
		e.preventDefault()
		const importOverlay = document.getElementById('import-overlay')
		if (importOverlay) {
			importOverlay.dataset.open = 'true'
		}
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

function setupGlobalDrop() {
	const overlay = document.getElementById('global-drop-overlay')
	const app = document.querySelector('.app')
	if (!overlay || !app) return
	let dragDepth = 0

	function showOverlay() {
		overlay.dataset.active = 'true'
	}
	function hideOverlay() {
		overlay.dataset.active = 'false'
	}

	document.addEventListener('dragenter', e => {
		const items = e.dataTransfer && e.dataTransfer.items
		if (!items || !items.length) return
		const hasFile = Array.from(items).some(
			it => it.kind === 'file' || it.type === 'Files'
		)
		if (!hasFile) return
		dragDepth += 1
		showOverlay()
		e.preventDefault()
	})

	document.addEventListener('dragover', e => {
		const items = e.dataTransfer && e.dataTransfer.items
		if (!items || !items.length) return
		const hasFile = Array.from(items).some(
			it => it.kind === 'file' || it.type === 'Files'
		)
		if (!hasFile) return
		e.preventDefault()
		e.dataTransfer.dropEffect = 'copy'
	})

	document.addEventListener('dragleave', e => {
		if (!app.contains(e.relatedTarget)) {
			dragDepth -= 1
			if (dragDepth <= 0) {
				dragDepth = 0
				hideOverlay()
			}
		}
	})

	document.addEventListener('drop', e => {
		const files = e.dataTransfer && e.dataTransfer.files
		dragDepth = 0
		hideOverlay()
		if (!files || !files.length) return
		e.preventDefault()
		const file = files[0]
		if (!file) return
		importConfigFromFile(file)
	})
}

function setupCloudUpload() {
	const uploadBtn = document.getElementById('cloud-upload-btn')
	if (!uploadBtn) return

	function saveAuthorToLocalStorage() {
		const authorInput = document.getElementById('config-author-input')
		if (authorInput) localStorage.setItem('configAuthor', authorInput.value)
	}

	function loadInputsFromLocalStorage() {
		const nameInput = document.getElementById('config-name-input')
		const authorInput = document.getElementById('config-author-input')
		const savedAuthor = localStorage.getItem('configAuthor') || ''
		if (nameInput) nameInput.value = ''
		if (authorInput) authorInput.value = savedAuthor
	}

	const nameInput = document.getElementById('config-name-input')
	const authorInput = document.getElementById('config-author-input')

	if (authorInput) {
		authorInput.addEventListener('input', saveAuthorToLocalStorage)
	}

	uploadBtn.addEventListener('click', async e => {
		e.preventDefault()
		const nameInput = document.getElementById('config-name-input')
		const authorInput = document.getElementById('config-author-input')
		const ctx = window.__voidPresenceCtx

		if (!nameInput?.value.trim() || !authorInput?.value.trim() || !ctx) {
			appendLog({
				message: 'Enter config name, author and save first',
				level: 'error',
			})
			return
		}

		try {
			uploadBtn.disabled = true
			uploadBtn.innerHTML =
				'<div class="rpc-button-icon">☁️</div><span>Uploading...</span>'

			const state = loadCurrentState()

			const safeState = JSON.parse(
				JSON.stringify(state, (key, value) =>
					key === 'clientId' ? undefined : value
				)
			)

			const config = {
				title: nameInput.value.trim(),
				author: authorInput.value.trim(),
				configData: safeState,
			}

			const result = await window.electronAPI.uploadConfig(config)

			appendLog({
				message: `Config "${config.title}" uploaded!`,
				level: 'success',
			})

			nameInput.value = ''
			localStorage.setItem('configAuthor', config.author)
		} catch (err) {
			appendLog({
				message: `Upload failed: ${err.message}`,
				level: 'error',
			})
		} finally {
			uploadBtn.disabled = false
			uploadBtn.innerHTML =
				'<div class="rpc-button-icon">☁️</div><span>Upload Current</span>'
		}
	})

	loadInputsFromLocalStorage()
}

window.addEventListener('DOMContentLoaded', () => {
	setupRestartButton()
	setupClientIdControls()
	setupAutoLaunchToggle()
	setupAutoHideToggle()
	setupWindowControls()
	setupConfigDetailsOverlay()
	setupConfigPage()
	setupStopButton()
	setupIntervalControl()
	setupImportOverlay()
	setupGlobalDrop()
	setupCloudUpload()
	updateInfo(null)
	updateStatus('CONNECTING RPC')
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
