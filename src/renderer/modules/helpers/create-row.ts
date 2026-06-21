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
	{ className, inputs, onChange, onRemove }: RowConfig<T>
): HTMLDivElement {
	const row = document.createElement('div')
	row.className = className
	row.dataset.index = String(index)

	const values: Record<string, string> = {}

	const handle = document.createElement('div')
	handle.className = 'drag-handle'
	handle.draggable = true

	const wrap = document.createElement('div')
	wrap.className =
		className === 'pair-row'
			? 'pair-inputs'
			: className === 'cycle-row'
				? 'cycle-inputs'
				: className === 'image-row'
					? 'image-inputs'
					: className === 'party-row'
						? 'party-inputs'
						: `${className}-inputs`

	inputs.forEach((input, idx) => {
		const el = document.createElement('input')
		const key = `input${idx + 1}`

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
	remove.className = 'remove-btn'
	remove.type = 'button'
	remove.textContent = '×'
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
