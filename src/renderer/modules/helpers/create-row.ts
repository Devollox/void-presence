type RowInput = {
	placeholder: string
	value: string
}

type RowConfig<T> = {
	className: string
	inputs: RowInput[]
	onChange: (value: T) => void
	onRemove: () => void
}

function createRow<T extends Record<string, string>>(
	index: number,
	{ inputs, onChange, onRemove }: RowConfig<T>
): HTMLDivElement {
	const row = document.createElement('div')
	row.className = 'presence-list-item'
	row.dataset.index = String(index)

	const values: Record<string, string> = {}

	const handle = document.createElement('div')
	handle.className = 'presence-drag-handle'
	handle.setAttribute('aria-hidden', 'true')
	handle.innerHTML = `<svg width="12" height="12" viewBox="0 0 12 12" fill="none" xmlns="http://www.w3.org/2000/svg"><circle cx="4" cy="3" r="1" fill="currentColor"/><circle cx="8" cy="3" r="1" fill="currentColor"/><circle cx="4" cy="6" r="1" fill="currentColor"/><circle cx="8" cy="6" r="1" fill="currentColor"/><circle cx="4" cy="9" r="1" fill="currentColor"/><circle cx="8" cy="9" r="1" fill="currentColor"/></svg>`
	handle.draggable = false

	const wrap = document.createElement('div')
	wrap.className = 'presence-list-inputs'

	inputs.forEach((input, idx) => {
		const el = document.createElement('input')
		const key = `input${idx + 1}`
		el.className = 'presence-list-input'
		el.placeholder = input.placeholder
		el.value = input.value ?? ''
		values[key] = el.value

		el.addEventListener('input', () => {
			values[key] = el.value
			onChange(values as T)
		})

		wrap.appendChild(el)
	})

	const remove = document.createElement('button')
	remove.className = 'presence-list-remove'
	remove.type = 'button'
	remove.setAttribute('aria-label', 'Remove')
	remove.innerHTML = `<svg width="12" height="12" viewBox="0 0 12 12" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M2 2l8 8M10 2L2 10" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>`
	remove.addEventListener('click', e => {
		e.preventDefault()
		onRemove()
	})

	row.appendChild(handle)
	row.appendChild(wrap)
	row.appendChild(remove)
	return row
}

export { createRow }
