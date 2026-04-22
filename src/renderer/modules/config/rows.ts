import {
	ButtonPair,
	CycleEntry,
	ImageCycleEntry,
	PartyCycleEntry,
	TimeCycleEntry,
} from '../../../types/types'

import { createRow } from '../helpers/create-row'

export function createButtonPairRow(
	pair: ButtonPair,
	index: number,
	onChange: (pair: ButtonPair) => void,
	onRemove: () => void,
): HTMLDivElement {
	return createRow(index, {
		className: 'pair-row',
		inputs: [
			{ placeholder: 'Button Name #1', value: pair.label1 || '' },
			{ placeholder: 'URL #1', value: pair.url1 || '' },
			{ placeholder: 'Button Name #2 (optional)', value: pair.label2 || '' },
			{ placeholder: 'URL #2 (optional)', value: pair.url2 || '' },
		],
		onChange: (values: any) =>
			onChange({
				label1: values.input1,
				url1: values.input2,
				label2: values.input3,
				url2: values.input4,
			}),
		onRemove,
	})
}

export function createCycleRow(
	entry: CycleEntry,
	index: number,
	onChange: (entry: CycleEntry) => void,
	onRemove: () => void,
): HTMLDivElement {
	return createRow(index, {
		className: 'cycle-row',
		inputs: [
			{ placeholder: 'Details', value: entry.details || '' },
			{ placeholder: 'State', value: entry.state || '' },
		],
		onChange: (values: any) =>
			onChange({
				details: values.input1,
				state: values.input2,
			}),
		onRemove,
	})
}

export function createTimeRow(
	entry: TimeCycleEntry,
	index: number,
	onChange: (entry: TimeCycleEntry) => void,
	onRemove: () => void,
): HTMLDivElement {
	return createRow(index, {
		className: 'cycle-row',
		inputs: [
			{ placeholder: 'Label (optional)', value: entry.label || '' },
			{
				placeholder: 'Duration (sec)',
				value:
					typeof entry.seconds === 'number'
						? String(entry.seconds)
						: (entry.seconds as string) || '',
			},
		],
		onChange: (values: any) =>
			onChange({
				label: values.input1,
				seconds: values.input2,
			}),
		onRemove,
	})
}

export function createPartyRow(
	party: PartyCycleEntry,
	index: number,
	onChange: (party: PartyCycleEntry) => void,
	onRemove: () => void,
): HTMLDivElement {
	return createRow(index, {
		className: 'party-row',
		inputs: [
			{
				placeholder: 'Current party size (optional)',
				value: party.sizeCurrent?.toString() ?? '',
			},
			{
				placeholder: 'Max party size (optional)',
				value: party.sizeMax?.toString() ?? '',
			},
		],
		onChange: (values: any) =>
			onChange({
				sizeCurrent: values.input1,
				sizeMax: values.input2,
			}),
		onRemove,
	})
}

export function createImageCycleRow(
	entry: ImageCycleEntry,
	index: number,
	onChange: (entry: ImageCycleEntry) => void,
	onRemove: () => void,
): HTMLDivElement {
	return createRow(index, {
		className: 'image-row',
		inputs: [
			{
				placeholder: 'Large image URL(.png/.jpeg/.gif and etc)',
				value: entry.largeImage || '',
			},
			{ placeholder: 'Large hover text', value: entry.largeText || '' },
			{
				placeholder: 'Small image URL(.png/.jpeg/.gif and etc) (optional)',
				value: entry.smallImage || '',
			},
			{
				placeholder: 'Small hover text (optional)',
				value: entry.smallText || '',
			},
		],
		onChange: (values: any) =>
			onChange({
				largeImage: values.input1,
				largeText: values.input2,
				smallImage: values.input3,
				smallText: values.input4,
			}),
		onRemove,
	})
}
