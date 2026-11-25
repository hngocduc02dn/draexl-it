import { createServer } from 'node:http'
import { mkdirSync, readFileSync, readdirSync } from 'node:fs'
import { DatabaseSync } from 'node:sqlite'
import { pathToFileURL } from 'node:url'
import worker from './dist/server/index.js'

export function localDb(filename = ':memory:') {
  const sqlite = new DatabaseSync(filename)
  sqlite.exec('CREATE TABLE IF NOT EXISTS local_migrations (name TEXT PRIMARY KEY)')
  const migrations = new URL('./drizzle/',import.meta.url)
  for (const name of readdirSync(migrations).filter(name => name.endsWith('.sql')).sort()) {
    if (sqlite.prepare('SELECT 1 FROM local_migrations WHERE name=?').get(name)) continue
    sqlite.exec('BEGIN')
    try {
      sqlite.exec(readFileSync(new URL(name,migrations),'utf8'))
      sqlite.prepare('INSERT INTO local_migrations VALUES (?)').run(name)
      sqlite.exec('COMMIT')
    } catch (error) {
      sqlite.exec('ROLLBACK')
      throw error
    }
  }
  const db = {
    prepare(sql) {
      return { bind(...args) {
        const query = sqlite.prepare(sql)
        const result = () => query.columns().length
          ? { results: query.all(...args), meta:{changes:sqlite.prepare('SELECT changes() AS total').get().total} }
          : { results:[], meta:query.run(...args) }
        return { first:async()=>query.get(...args), run:async()=>result(), all:async()=>result(), result }
      } }
    },
    async batch(queries) {
      sqlite.exec('BEGIN')
      try {
        const results = queries.map(query=>query.result())
        sqlite.exec('COMMIT')
        return results
      } catch (error) {
        sqlite.exec('ROLLBACK')
        throw error
      }
    },
  }
  return db
}

export function preview(port = 8788, env) {
  const server = createServer(async (request,response) => {
    const chunks = []
    for await (const chunk of request) chunks.push(chunk)
    const url = 'http://' + request.headers.host + request.url
    const result = await worker.fetch(new Request(url,{
      method:request.method,headers:request.headers,
      body:chunks.length ? Buffer.concat(chunks) : undefined,
    }),env)
    response.writeHead(result.status,Object.fromEntries(result.headers))
    response.end(Buffer.from(await result.arrayBuffer()))
  })
  server.listen(port,'127.0.0.1',()=>console.log('Local: http://127.0.0.1:' + server.address().port))
  return server
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  if (!process.env.ADMIN_PASSWORD) throw new Error('Đặt ADMIN_PASSWORD cho phiên chạy thử.')
  mkdirSync('.local',{recursive:true})
  preview(Number(process.env.DRAEXL_PREVIEW_PORT) || 8788,{
    DB:localDb('.local/inventory.sqlite'),ADMIN_PASSWORD:process.env.ADMIN_PASSWORD,
  })
}
