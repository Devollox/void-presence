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

function createRow<T>(
	index: number,
	{ className, inputs, onChange, onRemove }: RowConfig<T>,
): HTMLDivElement {
	const row = document.createElement('div')
	row.className = className
	row.dataset.index = String(index)
	row.draggable = true

	const inputValues: Record<string, string> = {}
	inputs.forEach((_, idx) => {
		inputValues[`input${idx + 1}`] = ''
	})

	const triggerChange = () => {
		onChange(inputValues as T)
	}

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
		el.value = input.value
		inputValues[key] = el.value

		el.addEventListener('input', () => {
			inputValues[key] = el.value
			triggerChange()
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

	row.appendChild(remove)
	row.appendChild(wrap)
	return row
}

export { createRow }
