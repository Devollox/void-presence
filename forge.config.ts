import { MakerDeb } from '@electron-forge/maker-deb'
import { MakerRpm } from '@electron-forge/maker-rpm'
import { MakerZIP } from '@electron-forge/maker-zip'
import { VitePlugin } from '@electron-forge/plugin-vite'
import type { ForgeConfig } from '@electron-forge/shared-types'

const ICON_BASE = './public/favicons/favicon'

const config: ForgeConfig = {
	packagerConfig: {
		icon: ICON_BASE,
	},
	rebuildConfig: {},
	makers: [
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
		{
			name: '@electron-addons/electron-forge-maker-nsis',
			config: {
				build: {
					win: {
						target: ['nsis'],
						icon: './public/favicons/favicon.ico',
					},
					nsis: {
						installerIcon: './public/favicons/favicon.ico',
						uninstallerIcon: './public/favicons/favicon.ico',
						installerHeaderIcon: './public/favicons/favicon.ico',
					},
				},
				updater: {
					url: 'https://raw.githubusercontent.com/Devollox/void-presence/main/updates',
					channel: 'latest',
				},
			},
		},
	],
	plugins: [
		new VitePlugin({
			build: [
				{ entry: 'src/main.ts', config: 'vite.main.config.ts' },
				{ entry: 'src/preload.ts', config: 'vite.preload.config.ts' },
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
