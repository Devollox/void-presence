const { MakerZIP } = require('@electron-forge/maker-zip')
const { VitePlugin } = require('@electron-forge/plugin-vite')

const ICON_BASE = './public/favicons/favicon'

module.exports = {
	packagerConfig: {
		icon: ICON_BASE,
		ignore(p) {
			const path = p.replace(/\\/g, '/')

			if (path.startsWith('/.git') || path.startsWith('.git')) return true
			if (path.endsWith('.eslintrc') || path.endsWith('.hintrc')) return true
			if (path.endsWith('forge.config.ts')) return true
			if (path.endsWith('tsconfig.json')) return true
			if (path.endsWith('vite.main.config.ts')) return true
			if (path.endsWith('vite.preload.config.ts')) return true
			if (path.endsWith('vite.renderer.config.ts')) return true
			if (path.endsWith('README.md')) return true
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

			if (path.includes('/node_modules/typescript')) return true
			if (path.includes('/node_modules/@types')) return true
			if (path.includes('/node_modules/eslint')) return true
			if (path.includes('/node_modules/@eslint')) return true
			if (path.includes('/node_modules/vite')) return true
			if (path.includes('/node_modules/@vite')) return true

			if (path.endsWith('.map')) return true

			return false
		},
	},
	rebuildConfig: {
		skipPrebuild: true,
	},
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
						icon: './public/favicons/favicon256.ico',
						publish: [],
					},
					nsis: {
						installerIcon: './public/favicons/favicon256.ico',
						uninstallerIcon: './public/favicons/favicon256.ico',
						installerHeaderIcon: './public/favicons/favicon256.ico',
						oneClick: true,
						perMachine: false,
					},
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
