const { MakerZIP } = require('@electron-forge/maker-zip')
const { MakerDMG } = require('@electron-forge/maker-dmg')
const { MakerDeb } = require('@electron-forge/maker-deb')
const { MakerRpm } = require('@electron-forge/maker-rpm')
const { VitePlugin } = require('@electron-forge/plugin-vite')
const { AutoUnpackNativesPlugin } = require('@electron-forge/plugin-auto-unpack-natives')

const ICON_BASE = './public/favicons/Group'
const isWindows = process.platform === 'win32'

module.exports = {
	packagerConfig: {
		icon: ICON_BASE,
		executableName: isWindows ? 'Void Presence' : 'voidpresence',
		asar: true,
		ignore(p) {
			const path = p.replace(/\\/g, '/')

			if (path.startsWith('/.git') || path.startsWith('.git')) return true
			if (path.endsWith('.eslintrc') || path.endsWith('.hintrc')) return true
			if (path.endsWith('forge.config.ts')) return true
			if (path.endsWith('.env')) return true
			if (path.endsWith('tsconfig.json')) return true
			if (path.endsWith('vite.main.config.ts')) return true
			if (path.endsWith('vite.preload.config.ts')) return true
			if (path.endsWith('vite.renderer.config.ts')) return true
			if (path.endsWith('vite.win.config.ts')) return true
			if (path.endsWith('RELEASE_NOTES.md')) return true
			if (path.endsWith('README.md')) return true
			if (path.endsWith('.prettierrc')) return true
			if (path.endsWith('LICENSE')) return true
			if (path.endsWith('package-lock.json')) return true

			if (path.includes('/src/discord/modules')) return true
			if (path.includes('/src/discord/index.ts')) return true
			if (path.includes('/src/main')) return true
			if (path.includes('/src/types')) return true
			if (path.includes('/src/renderer/modules')) return true
			if (path.includes('/src/renderer/index.ts')) return true
			if (path.includes('/src/main.ts')) return true
			if (path.includes('/src/preload.ts')) return true

			if (path.includes('/dist')) return true

			if (path.includes('/node_modules/typescript')) return true
			if (path.includes('/node_modules/@types')) return true
			if (path.includes('/node_modules/eslint')) return true
			if (path.includes('/node_modules/@eslint')) return true
			if (path.includes('/node_modules/vite')) return true
			if (path.includes('/node_modules/@vite')) return true

			if (/\/node_modules\/\.bin($|\/)/.test(path)) return true

			if (path.endsWith('.map')) return true

			return false
		},
	},
	rebuildConfig: {},
	makers: [
		{
			name: '@electron-forge/maker-zip',
			platforms: ['win32'],
		},
		{
			name: '@electron-addons/electron-forge-maker-nsis',
			config: {
				productName: 'Void.Presence.Setup',
				build: {
					win: {
						target: ['nsis'],
						icon: './public/favicons/Group.ico',
						publish: [],
					},
					nsis: {
						installerIcon: './public/favicons/Group.ico',
						uninstallerIcon: './public/favicons/Group.ico',
						installerHeaderIcon: './public/favicons/Group.ico',
						oneClick: true,
						perMachine: false,
					},
				},
			},
		},
		{
			name: '@electron-forge/maker-dmg',
			platforms: ['darwin'],
			config: {
				name: 'Void Presence',
				icon: './public/favicons/logo.png',
				format: 'ULFO',
			},
		},
		{
			name: '@electron-forge/maker-zip',
			platforms: ['darwin'],
		},
		{
			name: '@electron-forge/maker-deb',
			platforms: ['linux'],
			config: {
				options: {
					name: 'voidpresence',
					productName: 'Void Presence',
					icon: './public/favicons/logo.png',
					categories: ['Utility'],
					maintainer: 'Devollox',
					homepage: 'https://github.com/Devollox/void-presence',
				},
			},
		},
		{
			name: '@electron-forge/maker-rpm',
			platforms: ['linux'],
			config: {
				options: {
					name: 'voidpresence',
					productName: 'Void Presence',
					icon: './public/favicons/logo.png',
					categories: ['Utility'],
					homepage: 'https://github.com/Devollox/void-presence',
				},
			},
		},
		{
			name: '@electron-forge/maker-zip',
			platforms: ['linux'],
		},
	],
	plugins: [
		new AutoUnpackNativesPlugin({}),
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
