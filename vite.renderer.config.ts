import { resolve } from 'path'
import { defineConfig } from 'vite'

export default defineConfig({
	root: '.',
	build: {
		outDir: 'build/renderer',
		rollupOptions: {
			input: {
				renderer: resolve(__dirname, 'src/renderer/index.ts'),
			},
			output: {
				entryFileNames: 'renderer.js',
			},
		},
	},
})
