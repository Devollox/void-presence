const { execSync } = require('child_process')
const fs = require('fs')
const path = require('path')

const { MakerZIP } = require('@electron-forge/maker-zip')
const { MakerDMG } = require('@electron-forge/maker-dmg')
const { MakerDeb } = require('@electron-forge/maker-deb')
const { MakerRpm } = require('@electron-forge/maker-rpm')
const { VitePlugin } = require('@electron-forge/plugin-vite')

const ICON_BASE = './public/favicons/Group'

const MAC_ENTITLEMENTS = path.join(__dirname, 'build', 'entitlements.mac.plist')

const HAS_MAC_IDENTITY = !!process.env.MACOS_SIGNING_IDENTITY

function findAppBundle(dir) {
	if (typeof dir === 'string' && dir.endsWith('.app')) return dir
	if (!dir || !fs.existsSync(dir)) return null
	for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
		if (entry.isDirectory() && entry.name.endsWith('.app')) {
			return path.join(dir, entry.name)
		}
	}
	return null
}

function resignMacAdhoc(appPath) {
	console.log(`\n[macOS adhoc re-sign] ${appPath}`)

	execSync(
		`codesign --force --deep --options runtime --entitlements "${MAC_ENTITLEMENTS}" --sign - "${appPath}"`,
		{ stdio: 'inherit' }
	)

	try {
		execSync(`codesign --verify --deep --strict --verbose=2 "${appPath}"`, {
			stdio: 'inherit',
		})
		console.log('[macOS adhoc re-sign] signature OK')
	} catch (err) {
		console.warn('[macOS adhoc re-sign] WARNING: codesign --verify reported issues')
		console.warn(String(err && err.message ? err.message : err))
	}
}

const forgePlugins = [
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
]

module.exports = {
	packagerConfig: {
		icon: ICON_BASE,
		executableName: process.env.FORGE_EXECUTABLE_NAME || 'Void Presence',
		asar: false,
		...(HAS_MAC_IDENTITY
			? {
					osxSign: {
						identity: process.env.MACOS_SIGNING_IDENTITY,
						'hardened-runtime': true,
						entitlements: MAC_ENTITLEMENTS,
						'entitlements-inherit': MAC_ENTITLEMENTS,
						'gatekeeper-assess': false,
					},
					osxNotarize: {
						appleId: process.env.APPLE_ID,
						appleIdPassword: process.env.APPLE_APP_SPECIFIC_PASSWORD,
						teamId: process.env.APPLE_TEAM_ID,
					},
				}
			: {}),
		ignore(p) {
			const path = p.replace(/\\/g, '/')

			if (path.includes('node_modules/sharp') || path.includes('node_modules/@coooookies')) {
				return false
			}

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
				productName: 'Void Presence',
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
	plugins: forgePlugins,
	hooks: {
		postPackage: async (_forgeConfig, options) => {
			if (options.platform !== 'darwin') return
			if (HAS_MAC_IDENTITY) return
			for (const outPath of options.outputPaths) {
				const app = findAppBundle(outPath)
				if (!app) {
					console.warn(`[macOS adhoc re-sign] no .app found under ${outPath}`)
					continue
				}
				resignMacAdhoc(app)
			}
		},
	},
}
