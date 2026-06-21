import { t } from 'i18next'
import {
	ButtonPair,
	CycleEntry,
	ImageCycleEntry,
	PartyCycleEntry,
	StatusCycleEntry,
	TimeCycleEntry,
} from '../../../types/types'
import { createRow } from '../helpers/create-row'

export function createButtonPairRow(
	pair: ButtonPair,
	index: number,
	onChange: (pair: ButtonPair) => void,
	onRemove: () => void
): HTMLDivElement {
	return createRow(index, {
		className: 'pair-row',
		inputs: [
			{ placeholder: t('buttonName1'), value: pair.label1 || '' },
			{ placeholder: t('url1'), value: pair.url1 || '' },
			{ placeholder: t('buttonName2Optional'), value: pair.label2 || '' },
			{ placeholder: t('url2Optional'), value: pair.url2 || '' },
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
	onRemove: () => void
): HTMLDivElement {
	return createRow(index, {
		className: 'cycle-row',
		inputs: [
			{ placeholder: t('detailsPlaceholder'), value: entry.details || '' },
			{ placeholder: t('stateOptional'), value: entry.state || '' },
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
	onRemove: () => void
): HTMLDivElement {
	return createRow(index, {
		className: 'cycle-row',
		inputs: [
			{ placeholder: t('labelOptional'), value: entry.label || '' },
			{
				placeholder: t('durationSec'),
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
	onRemove: () => void
): HTMLDivElement {
	return createRow(index, {
		className: 'party-row',
		inputs: [
			{
				placeholder: t('current_party_size_optional'),
				value: party.sizeCurrent?.toString() ?? '',
			},
			{
				placeholder: t('max_party_size_optional'),
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
	onRemove: () => void
): HTMLDivElement {
	return createRow(index, {
		className: 'image-row',
		inputs: [
			{
				placeholder: t('large_image_url'),
				value: entry.largeImage || '',
			},
			{
				placeholder: t('large_hover_text_optional'),
				value: entry.largeText || '',
			},
			{
				placeholder: t('small_image_url_optional'),
				value: entry.smallImage || '',
			},
			{
				placeholder: t('small_hover_text_optional'),
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

export function createStatusRow(
	entry: StatusCycleEntry,
	index: number,
	onChange: (entry: StatusCycleEntry) => void,
	onRemove: () => void
): HTMLDivElement {
	return createRow(index, {
		className: 'cycle-row',
		inputs: [
			{ placeholder: t('text'), value: entry.text || '' },
			{ placeholder: t('emoji_optional'), value: entry.emoji || '' },
		],
		onChange: (values: any) =>
			onChange({
				text: values.input1,
				emoji: values.input2 || null,
			}),
		onRemove,
	})
}
