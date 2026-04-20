import { defineConfig } from 'vite'

export default defineConfig({
	resolve: {
		browserField: false,
		mainFields: ['module', 'jsnext:main', 'jsnext'],
	},
})
