import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { createHash } from 'node:crypto'
import { fileURLToPath } from 'node:url'
import { build } from 'esbuild'

const {outputFiles:[appBundle]} = await build({
  entryPoints:[fileURLToPath(new URL('./src/app.js',import.meta.url))],
  bundle:true,
  format:'iife',
  minify:true,
  legalComments:'inline',
  write:false,
  target:'safari15',
})
const appBytes = Buffer.from(appBundle.contents)

const assets = {
  '/': ['index.html', 'text/html; charset=utf-8'],
  '/style.css': ['style.css', 'text/css; charset=utf-8'],
  '/app.js': ['app.js', 'text/javascript; charset=utf-8'],
  '/logo.png': ['logo.png', 'image/png'],
}
for (const [url, [file, type]] of Object.entries(assets)) {
  let bytes = file==='app.js' ? appBytes : await readFile(new URL('./src/' + file, import.meta.url))
  if (file === 'index.html') {
    let html = bytes.toString('utf8')
    for (const name of ['style.css','app.js']) {
      const source = name==='app.js' ? appBytes : await readFile(new URL('./src/' + name, import.meta.url))
      const version = createHash('sha256').update(source).digest('hex').slice(0,12)
      html = html.replace('="/' + name + '"', '="/' + name + '?v=' + version + '"')
    }
    bytes = Buffer.from(html)
  }
  assets[url] = [type, bytes.toString('base64')]
}
const worker = await readFile(new URL('./src/worker.js', import.meta.url), 'utf8')
const destination = new URL('./dist/server/', import.meta.url)
await mkdir(destination, { recursive: true })
await writeFile(new URL('index.js', destination), 'const staticAssets = ' + JSON.stringify(assets) + '\n' + worker)
console.log('Cloudflare Worker built')
