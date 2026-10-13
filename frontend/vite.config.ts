import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { defineConfig } from 'vite'
import { readFile, readdir, writeFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { createHash } from 'node:crypto'
export default defineConfig({
  plugins: [react(), tailwindcss(), {
    name: 'khalendara-pwa',
    apply: 'build',
    async closeBundle() {
      const output = resolve('dist')
      const files = ['/index.html', '/manifest.webmanifest',
        ...(await readdir(resolve(output, 'assets'))).map(name => `/assets/${name}`),
        ...(await readdir(resolve(output, 'icons'))).map(name => `/icons/${name}`)]
      const hash = createHash('sha256')
      for (const file of files) hash.update(await readFile(resolve(output, `.${file}`)))
      const template = await readFile(resolve('pwa/sw.js'), 'utf8')
      await writeFile(resolve(output, 'sw.js'), template
        .replace('__VERSION__', hash.digest('hex').slice(0, 16))
        .replace('__FILES__', JSON.stringify(files)))
    },
  }],
  server: { proxy: { '/auth': 'http://localhost:8080', '/users': 'http://localhost:8080', '/events': 'http://localhost:8080' } },
  preview: { proxy: { '/auth': 'http://localhost:8080', '/users': 'http://localhost:8080', '/events': 'http://localhost:8080' } },
})

