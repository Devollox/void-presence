export function setupCloudUpload(): void {
	const nameInput = document.getElementById(
		'config-name-input-current'
	) as HTMLInputElement | null

	if (nameInput) nameInput.value = ''
}
