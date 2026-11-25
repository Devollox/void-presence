import { app } from 'electron'
import fs from 'fs'
import path from 'path'

const CLEANUP_NAME_PATTERN = /^Void\.Presence\.(Updates|Installer|Setup)/i

function getCleanupDirectories(): string[] {
	const directories = new Set<string>()

	try {
		directories.add(app.getPath('temp'))
	} catch {}

	try {
		directories.add(app.getPath('appData'))
	} catch {}

	try {
		directories.add(app.getPath('downloads'))
	} catch {}

	return Array.from(directories)
}

async function cleanupMatchingFolders(directory: string): Promise<void> {
	let entries: fs.Dirent[]

	try {
		entries = await fs.promises.readdir(directory, {
			withFileTypes: true,
		})
	} catch {
		return
	}

	for (const entry of entries) {
		if (!entry.isDirectory()) {
			continue
		}

		if (!CLEANUP_NAME_PATTERN.test(entry.name)) {
			continue
		}

		const target = path.join(directory, entry.name)

		try {
			await fs.promises.rm(target, {
				recursive: true,
				force: true,
				maxRetries: 3,
				retryDelay: 100,
			})
		} catch {}
	}
}

export async function cleanupInstallerFolders(): Promise<void> {
	for (const directory of getCleanupDirectories()) {
		await cleanupMatchingFolders(directory)
	}
}
