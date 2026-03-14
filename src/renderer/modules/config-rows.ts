import { PartyCycleEntry } from 'src/discord/modules/types'
import {
	ButtonPair,
	CycleEntry,
	ImageCycleEntry,
	TimeCycleEntry,
} from './types'

export function createButtonPairRow(
	pair: ButtonPair,
	index: number,
	onChange: (pair: ButtonPair) => void,
	onRemove: () => void,
): HTMLDivElement {
	const row = document.createElement('div')
	row.className = 'pair-row'
	row.dataset.index = String(index)
	row.draggable = true

	const inputsWrap = document.createElement('div')
	inputsWrap.className = 'pair-inputs'

	const input1 = document.createElement('input')
	input1.placeholder = 'Button Name #1'
	input1.value = pair.label1 || ''

	const input2 = document.createElement('input')
	input2.placeholder = 'URL #1'
	input2.value = pair.url1 || ''

	const input3 = document.createElement('input')
	input3.placeholder = 'Button Name #2 (optional)'
	input3.value = pair.label2 || ''

	const input4 = document.createElement('input')
	input4.placeholder = 'URL #2 (optional)'
	input4.value = pair.url2 || ''

	const remove = document.createElement('button')
	remove.className = 'remove-btn'
	remove.type = 'button'
	remove.textContent = '×'

	function triggerChange(): void {
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

export function createCycleRow(
	entry: CycleEntry,
	index: number,
	onChange: (entry: CycleEntry) => void,
	onRemove: () => void,
): HTMLDivElement {
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

	function triggerChange(): void {
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

export function createTimeRow(
	entry: TimeCycleEntry,
	index: number,
	onChange: (entry: TimeCycleEntry) => void,
	onRemove: () => void,
): HTMLDivElement {
	const row = document.createElement('div')
	row.className = 'cycle-row'
	row.dataset.index = String(index)
	row.draggable = true

	const inputsWrap = document.createElement('div')
	inputsWrap.className = 'cycle-inputs'

	const nameInput = document.createElement('input')
	nameInput.placeholder = 'Label (optional)'
	nameInput.value = entry.label || ''

	const secInput = document.createElement('input')
	secInput.placeholder = 'Duration (sec)'
	secInput.value =
		typeof entry.seconds === 'number'
			? String(entry.seconds)
			: (entry.seconds as string) || ''

	const remove = document.createElement('button')
	remove.className = 'remove-btn'
	remove.type = 'button'
	remove.textContent = '×'

	function triggerChange(): void {
		onChange({
			label: nameInput.value,
			seconds: secInput.value,
		})
	}

	nameInput.addEventListener('input', triggerChange)
	secInput.addEventListener('input', triggerChange)

	remove.addEventListener('click', e => {
		e.preventDefault()
		onRemove()
	})

	row.appendChild(remove)
	inputsWrap.appendChild(nameInput)
	inputsWrap.appendChild(secInput)
	row.appendChild(inputsWrap)

	return row
}

export function createPartyRow(
	party: PartyCycleEntry,
	index: number,
	onChange: (party: PartyCycleEntry) => void,
	onRemove: () => void,
): HTMLDivElement {
	const row = document.createElement('div')
	row.className = 'party-row'
	row.dataset.index = String(index)
	row.draggable = true

	const wrap = document.createElement('div')
	wrap.className = 'party-inputs'

	const currentInput = document.createElement('input')
	currentInput.placeholder = 'Current party size'
	currentInput.value = party.sizeCurrent?.toString() ?? ''

	const maxInput = document.createElement('input')
	maxInput.placeholder = 'Max party size'
	maxInput.value = party.sizeMax?.toString() ?? ''

	const remove = document.createElement('button')
	remove.className = 'remove-btn'
	remove.textContent = '×'

	const updateParty = () => {
		onChange({
			sizeCurrent: currentInput.value,
			sizeMax: maxInput.value,
		} as any)
	}

	currentInput.addEventListener('input', updateParty)
	maxInput.addEventListener('input', updateParty)

	remove.addEventListener('click', e => {
		e.preventDefault()
		onRemove()
	})

	row.appendChild(remove)
	wrap.appendChild(currentInput)
	wrap.appendChild(maxInput)
	row.appendChild(wrap)

	return row
}

export function createImageCycleRow(
	entry: ImageCycleEntry,
	index: number,
	onChange: (entry: ImageCycleEntry) => void,
	onRemove: () => void,
): HTMLDivElement {
	const row = document.createElement('div')
	row.className = 'image-row'
	row.dataset.index = String(index)
	row.draggable = true

	const wrap = document.createElement('div')
	wrap.className = 'image-inputs'

	const largeKey = document.createElement('input')
	largeKey.placeholder = 'Large image URL(.png/.jpeg/.gif and etc)'
	largeKey.value = entry.largeImage || ''

	const largeText = document.createElement('input')
	largeText.placeholder = 'Large hover text'
	largeText.value = entry.largeText || ''

	const smallKey = document.createElement('input')
	smallKey.placeholder = 'Small image URL(.png/.jpeg/.gif and etc) (optional)'
	smallKey.value = entry.smallImage || ''

	const smallText = document.createElement('input')
	smallText.placeholder = 'Small hover text (optional)'
	smallText.value = entry.smallText || ''

	const remove = document.createElement('button')
	remove.className = 'remove-btn'
	remove.type = 'button'
	remove.textContent = '×'

	function triggerChange(): void {
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
