/**
 * Навешивает класс `is-overflowing` на элемент, когда его текст
 * не помещается по ширине. CSS-маска применяется только тогда.
 *
 * Следит за изменениями через ResizeObserver:
 * — за самим элементом (контейнер сужается/расширяется)
 * — за текстовым содержимым через MutationObserver (текст меняется)
 */

const OVERFLOW_CLASS = 'is-overflowing'

function checkOverflow(el: HTMLElement): void {
	el.classList.toggle(OVERFLOW_CLASS, el.scrollWidth > el.offsetWidth)
}

function observe(el: HTMLElement): void {
	checkOverflow(el)

	const ro = new ResizeObserver(() => checkOverflow(el))
	ro.observe(el)

	const mo = new MutationObserver(() => checkOverflow(el))
	mo.observe(el, { childList: true, characterData: true, subtree: true })
}

export function setupOverflowMasks(): void {
	const targets: Array<HTMLElement | null> = [
		document.querySelector<HTMLElement>('.workspace-title'),
		document.getElementById('sidebar-account-name'),
	]

	for (const el of targets) {
		if (el) observe(el)
	}
}
