import { MakerDeb } from '@electron-forge/maker-deb'
import { MakerRpm } from '@electron-forge/maker-rpm'
import { MakerSquirrel } from '@electron-forge/maker-squirrel'
import { MakerZIP } from '@electron-forge/maker-zip'
import { VitePlugin } from '@electron-forge/plugin-vite'
import type { ForgeConfig } from '@electron-forge/shared-types'

const ICON_BASE = './public/favicons/favicons'

const config: ForgeConfig = {
	packagerConfig: {
		icon: ICON_BASE,
	},
	rebuildConfig: {},
	makers: [
		new MakerSquirrel({
			name: 'richpresences',
			setupIcon: `./public/favicons/favicons.ico`,
			iconUrl: 'https://example.com/favicons.ico',
		}),
		new MakerZIP({}, ['darwin', 'win32']),
		new MakerRpm({
			options: {
				icon: `${ICON_BASE}.ico`,
			},
		}),
		new MakerDeb({
			options: {
				icon: `${ICON_BASE}.ico`,
			},
		}),
	],
	plugins: [
		new VitePlugin({
			build: [
				{
					entry: 'src/main.ts',
					config: 'vite.main.config.ts',
				},
				{
					entry: 'src/preload.ts',
					config: 'vite.preload.config.ts',
				},
			],
			renderer: [
				{
					name: 'main_window',
					config: 'vite.renderer.config.ts',
				},
			],
		}),
	],
}

export default config
