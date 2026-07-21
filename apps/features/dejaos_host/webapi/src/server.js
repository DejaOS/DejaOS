import http from 'node:http'
import fs from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { AppStore } from './store.js'
import { getWeatherForecast } from './weatherService.js'

const sourceDir = path.dirname(fileURLToPath(import.meta.url))
const defaultDataFile = path.resolve(sourceDir, '../data/apps.json')
const defaultWebRoot = path.resolve(sourceDir, '../../web')

const mimeTypes = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon'
}

function commonHeaders(extra = {}) {
  return {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'GET,POST,PUT,OPTIONS',
    'Cache-Control': 'no-store',
    ...extra
  }
}

function sendJson(response, statusCode, data, extraHeaders) {
  const body = JSON.stringify(data)
  response.writeHead(statusCode, commonHeaders({
    'Content-Type': 'application/json; charset=utf-8',
    'Content-Length': Buffer.byteLength(body),
    ...extraHeaders
  }))
  response.end(body)
}

function sendError(response, error) {
  const statusCode = Number(error.statusCode) || 500
  sendJson(response, statusCode, {
    ok: false,
    error: statusCode === 500 ? 'Internal server error' : error.message
  })
  if (statusCode === 500) console.error(error)
}

async function readJson(request) {
  const chunks = []
  let size = 0
  for await (const chunk of request) {
    size += chunk.length
    if (size > 1024 * 1024) throw Object.assign(new Error('Request body cannot exceed 1 MB'), { statusCode: 413 })
    chunks.push(chunk)
  }
  if (chunks.length === 0) return {}
  try {
    return JSON.parse(Buffer.concat(chunks).toString('utf8'))
  } catch {
    throw Object.assign(new Error('Invalid request JSON'), { statusCode: 400 })
  }
}

function timePayload() {
  const now = new Date()
  const timeZone = 'Asia/Shanghai'
  const displayTime = new Intl.DateTimeFormat('en-GB', {
    timeZone,
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23'
  }).format(now)
  const displayDate = new Intl.DateTimeFormat('zh-CN', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  }).format(now)
  return {
    ok: true,
    epochMs: now.getTime(),
    iso: now.toISOString(),
    timeZone,
    displayTime,
    displayDate
  }
}

async function serveStatic(request, response, pathname, webRoot) {
  if (request.method !== 'GET' && request.method !== 'HEAD') return false
  let relativePath = pathname === '/' ? 'index.html' : decodeURIComponent(pathname.slice(1))
  if (!path.extname(relativePath)) relativePath = path.join(relativePath, 'index.html')
  const filePath = path.resolve(webRoot, relativePath)
  const safeRoot = `${path.resolve(webRoot)}${path.sep}`
  if (filePath !== path.resolve(webRoot, 'index.html') && !filePath.startsWith(safeRoot)) {
    sendJson(response, 403, { ok: false, error: 'Forbidden' })
    return true
  }
  try {
    const content = await fs.readFile(filePath)
    response.writeHead(200, commonHeaders({
      'Content-Type': mimeTypes[path.extname(filePath).toLowerCase()] || 'application/octet-stream',
      'Content-Length': content.length,
      'Cache-Control': 'public, max-age=60'
    }))
    response.end(request.method === 'HEAD' ? undefined : content)
  } catch (error) {
    if (error.code === 'ENOENT') sendJson(response, 404, { ok: false, error: 'Page not found' })
    else throw error
  }
  return true
}

async function handleApi(request, response, url, store, weatherProvider) {
  const { pathname } = url
  if (request.method === 'OPTIONS') {
    response.writeHead(204, commonHeaders())
    response.end()
    return true
  }

  if (request.method === 'GET' && pathname === '/api/health') {
    sendJson(response, 200, { ok: true, service: 'dejaos-host-webapi', version: '0.1.0' })
    return true
  }
  if (request.method === 'GET' && pathname === '/api/time') {
    sendJson(response, 200, timePayload())
    return true
  }
  if (request.method === 'GET' && pathname === '/api/weather') {
    const payload = await weatherProvider({
      latitude: url.searchParams.get('latitude'),
      longitude: url.searchParams.get('longitude'),
      timezone: url.searchParams.get('timezone')
    })
    sendJson(response, 200, payload)
    return true
  }
  if (request.method === 'GET' && pathname === '/api/apps') {
    sendJson(response, 200, { ok: true, items: store.list() })
    return true
  }
  if (request.method === 'POST' && pathname === '/api/apps') {
    const app = await store.create(await readJson(request))
    sendJson(response, 201, { ok: true, app })
    return true
  }
  if (request.method === 'GET' && pathname === '/api/device/apps') {
    sendJson(response, 200, { ok: true, items: store.deviceList() })
    return true
  }

  let match = pathname.match(/^\/api\/(?:device\/)?apps\/([^/]+)\/download$/)
  if (request.method === 'GET' && match) {
    const id = decodeURIComponent(match[1])
    const appPackage = store.package(id)
    if (!appPackage) throw Object.assign(new Error('App is not published or does not exist'), { statusCode: 404 })
    const body = JSON.stringify(appPackage, null, 2)
    const filename = `${id}-${appPackage.manifest.version}.dxapp.json`
    response.writeHead(200, commonHeaders({
      'Content-Type': 'application/json; charset=utf-8',
      'Content-Disposition': `attachment; filename="${filename}"`,
      'Content-Length': Buffer.byteLength(body)
    }))
    response.end(body)
    return true
  }

  match = pathname.match(/^\/api\/apps\/([^/]+)\/publish$/)
  if (request.method === 'POST' && match) {
    const app = await store.publish(decodeURIComponent(match[1]))
    sendJson(response, 200, { ok: true, app })
    return true
  }

  match = pathname.match(/^\/api\/apps\/([^/]+)$/)
  if (match) {
    const id = decodeURIComponent(match[1])
    if (request.method === 'GET') {
      const app = store.get(id)
      if (!app) throw Object.assign(new Error('App not found'), { statusCode: 404 })
      sendJson(response, 200, { ok: true, app })
      return true
    }
    if (request.method === 'PUT') {
      const app = await store.update(id, await readJson(request))
      sendJson(response, 200, { ok: true, app })
      return true
    }
  }

  if (pathname.startsWith('/api/')) {
    sendJson(response, 404, { ok: false, error: 'API endpoint not found' })
    return true
  }
  return false
}

export async function createAppServer(options = {}) {
  const store = new AppStore(options.dataFile || defaultDataFile)
  await store.init()
  const webRoot = options.webRoot || defaultWebRoot
  const weatherProvider = options.weatherProvider || getWeatherForecast
  return http.createServer(async (request, response) => {
    try {
      const url = new URL(request.url, 'http://localhost')
      if (await handleApi(request, response, url, store, weatherProvider)) return
      await serveStatic(request, response, url.pathname, webRoot)
    } catch (error) {
      if (!response.headersSent) sendError(response, error)
      else response.destroy(error)
    }
  })
}

const currentEntry = process.argv[1] ? pathToFileURL(path.resolve(process.argv[1])).href : ''
if (import.meta.url === currentEntry) {
  const port = Number(process.env.PORT || 8080)
  const host = process.env.HOST || '0.0.0.0'
  const server = await createAppServer()
  server.listen(port, host, () => {
    console.log(`DejaOS Host WebAPI: http://${host}:${port}`)
    console.log(`Admin UI: http://localhost:${port}/`)
  })
}
