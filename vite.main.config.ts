import { defineConfig } from 'vite'

export default defineConfig({
	resolve: {
		browserField: false,
		mainFields: ['module', 'jsnext:main', 'jsnext'],
	},
	build: {
		rollupOptions: {
			external: ['sharp', 'bufferutil', 'utf-8-validate', '@coooookies/windows-smtc-monitor'],
		},
	},
})
