import { VoidPresenceCtx } from 'src/types/types'
import { pushLiveStateFromCtx } from '../config/live'

type ListKey =
	| 'buttonPairs'
	| 'cycles'
	| 'imageCycles'
	| 'party'
	| 'timeCycles'
	| 'statusCycles'

type ListConfig<T> = {
	listId: string
	addBtnId: string
	storageKey: ListKey
	createRowFn: (
		item: T,
		idx: number,
		onUpdate: (val: T) => void,
		onDelete: () => void,
	) => HTMLElement
	getDefaultItem: () => T
}

export function createListManager<T>(
	ctx: VoidPresenceCtx,
	showBlocksToast: () => void,
	cfg: ListConfig<T>,
): () => void {
	const listEl = document.getElementById(cfg.listId) as HTMLElement | null
	const addBtn = document.getElementById(
		cfg.addBtnId,
	) as HTMLButtonElement | null

	const getList = () => (ctx as any)[cfg.storageKey] as T[]

	const save = () => {
		const list = getList()
		if (!list.length) {
			localStorage.removeItem(cfg.storageKey)
		} else {
			localStorage.setItem(cfg.storageKey, JSON.stringify(list))
		}
	}

	const render = (): void => {
		if (!listEl) return
		listEl.innerHTML = ''
		getList().forEach((item, idx) => {
			const row = cfg.createRowFn(
				item,
				idx,
				updated => {
					getList()[idx] = updated
					save()
					void pushLiveStateFromCtx(ctx)
					showBlocksToast()
				},
				() => {
					getList().splice(idx, 1)
					save()
					render()
					void pushLiveStateFromCtx(ctx)
					showBlocksToast()
				},
			)
			listEl.appendChild(row)
		})
	}

	addBtn?.addEventListener('click', e => {
		e.preventDefault()
		getList().push(cfg.getDefaultItem())
		save()
		render()
		void pushLiveStateFromCtx(ctx)
		showBlocksToast()
	})

	return render
}
