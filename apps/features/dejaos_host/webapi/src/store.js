import fs from 'node:fs/promises'
import fsSync from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const sourceDir = path.dirname(fileURLToPath(import.meta.url))
const dataDir = path.resolve(sourceDir, '../data')
const RUNTIME = 'load-script-v1'
const MAX_ICON_BYTES = 200 * 1024

const seedDefinitions = [
  {
    id: 'weather-http', name: 'HTTP Weather', description: 'Fetch live Open-Meteo weather through the Host HTTP service',
    visibility: 'private', color: '#286f9d', version: '0.4.0', upgradeBefore: '0.4.0', template: 'weather-http.js', icon: 'weather.png'
  },
  {
    id: 'calendar', name: 'Calendar', description: 'Show the current date and today\'s schedule',
    visibility: 'private', color: '#dc555d', version: '0.2.0', upgradeBefore: '0.2.0', template: 'calendar.js', icon: 'calendar.png'
  },
  {
    id: 'notes', name: 'Notes', description: 'Enter and save simple notes on the device',
    visibility: 'private', color: '#8359b5', version: '0.2.0', upgradeBefore: '0.2.0', template: 'notes.js', icon: 'notes.png'
  }
]

function clone(value) {
  return JSON.parse(JSON.stringify(value))
}

function nowIso() {
  return new Date().toISOString()
}

function templateCode(name) {
  return fsSync.readFileSync(path.join(dataDir, 'templates', name), 'utf8')
}

function iconFileData(name) {
  return fsSync.readFileSync(path.join(dataDir, 'app-icons', name)).toString('base64')
}

function defaultIconData() {
  return iconFileData('default.png')
}

function normalizeIconData(value, fallback) {
  let base64 = String(value || '').trim()
  const prefix = 'data:image/png;base64,'
  if (base64.startsWith(prefix)) base64 = base64.slice(prefix.length)
  if (!base64) {
    if (fallback) return normalizeIconData(fallback)
    throw Object.assign(new Error('Upload a PNG app icon'), { statusCode: 400 })
  }
  if (!/^[A-Za-z0-9+/]+={0,2}$/.test(base64)) {
    throw Object.assign(new Error('The app icon is not valid PNG Base64 data'), { statusCode: 400 })
  }
  const buffer = Buffer.from(base64, 'base64')
  if (buffer.length < 24 || buffer.length > MAX_ICON_BYTES) {
    throw Object.assign(new Error('The app icon is invalid or larger than 200 KB'), { statusCode: 400 })
  }
  const pngSignature = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])
  if (!buffer.subarray(0, 8).equals(pngSignature) || buffer.toString('ascii', 12, 16) !== 'IHDR') {
    throw Object.assign(new Error('The app icon must be a PNG image'), { statusCode: 400 })
  }
  const width = buffer.readUInt32BE(16)
  const height = buffer.readUInt32BE(20)
  if (width !== 40 || height !== 40) {
    throw Object.assign(new Error(`The app icon must be 40×40; current size is ${width}×${height}`), { statusCode: 400 })
  }
  return buffer.toString('base64')
}

function defaultCode(name) {
  return `(function createMiniApp() {\n  let root = null;\n\n  return {\n    mount(context) {\n      root = context.ui.view('root', context.root, 0, 0, 480, 764, context.ui.Theme.PAGE, 0);\n      context.ui.label('title', root, '${name}', 20, 30, 440, 40, 24, context.ui.Theme.INK, true, context.ui.ALIGN.CENTER);\n      context.logger.info('mounted');\n      return root;\n    },\n\n    show() { if (root) root.show(); },\n    hide() { if (root) root.hide(); },\n    unmount() { root = null; }\n  };\n})()`
}

function buildApp(definition) {
  const createdAt = nowIso()
  const iconData = normalizeIconData(iconFileData(definition.icon))
  const manifest = {
    id: definition.id,
    name: definition.name,
    version: definition.version,
    entry: 'app.js',
    type: 'ui',
    minHostVersion: '0.1.0',
    runtime: RUNTIME,
    icon: 'icon.png'
  }
  const draft = { version: definition.version, code: templateCode(definition.template), manifest, iconData }
  return {
    id: definition.id,
    name: definition.name,
    description: definition.description,
    visibility: definition.visibility,
    icon: 'custom',
    iconData,
    color: definition.color,
    ownerId: 'demo-user',
    createdAt,
    updatedAt: createdAt,
    draft,
    published: { ...clone(draft), publishedAt: createdAt }
  }
}

function seedApps() {
  return seedDefinitions.map(buildApp)
}

function validateId(id) {
  return typeof id === 'string' && /^[a-z][a-z0-9._-]{1,63}$/.test(id)
}

function isCompatible(app) {
  return app && app.draft && app.draft.manifest && app.draft.manifest.runtime === RUNTIME
}

function compareVersions(left, right) {
  const a = String(left || '').split('.').map((part) => Number(part) || 0)
  const b = String(right || '').split('.').map((part) => Number(part) || 0)
  const length = Math.max(a.length, b.length)
  for (let index = 0; index < length; index += 1) {
    const difference = (a[index] || 0) - (b[index] || 0)
    if (difference !== 0) return difference
  }
  return 0
}

function upgradeSeedApp(app, definition) {
  if (!definition.upgradeBefore || compareVersions(app.draft.version, definition.upgradeBefore) >= 0) return
  const updatedAt = nowIso()
  const iconData = normalizeIconData(app.iconData, iconFileData(definition.icon))
  const manifest = {
    ...clone(app.draft.manifest),
    id: definition.id,
    name: definition.name,
    version: definition.version,
    entry: 'app.js',
    type: 'ui',
    minHostVersion: '0.1.0',
    runtime: RUNTIME,
    icon: 'icon.png'
  }
  const draft = {
    version: definition.version,
    code: templateCode(definition.template),
    manifest,
    iconData
  }
  app.name = definition.name
  app.description = definition.description
  app.color = definition.color
  app.iconData = iconData
  app.updatedAt = updatedAt
  app.draft = draft
  app.published = { ...clone(draft), publishedAt: updatedAt }
}

function normalizeAppIcon(app, fallback) {
  app.icon = 'custom'
  app.iconData = normalizeIconData(app.iconData, fallback || defaultIconData())
  app.draft.iconData = normalizeIconData(app.draft.iconData, app.iconData)
  app.draft.manifest.icon = 'icon.png'
  app.draft.manifest.runtime = RUNTIME
  if (app.published && app.published.manifest) {
    app.published.iconData = normalizeIconData(app.published.iconData, app.iconData)
    app.published.manifest.icon = 'icon.png'
    app.published.manifest.runtime = RUNTIME
  }
}

function publicApp(app) {
  const hasPublished = !!app.published
  const hasDraftChanges = !hasPublished || JSON.stringify(app.draft) !== JSON.stringify({
    version: app.published.version,
    code: app.published.code,
    manifest: app.published.manifest,
    iconData: app.published.iconData
  })
  return {
    ...clone(app),
    status: hasDraftChanges ? 'draft' : 'published',
    publishedVersion: hasPublished ? app.published.version : null
  }
}

export class AppStore {
  constructor(dataFile) {
    this.dataFile = dataFile
    this.apps = []
  }

  async init() {
    await fs.mkdir(path.dirname(this.dataFile), { recursive: true })
    try {
      const content = await fs.readFile(this.dataFile, 'utf8')
      this.apps = JSON.parse(content)
      if (!Array.isArray(this.apps)) throw new Error('apps data must be an array')
    } catch (error) {
      if (error.code !== 'ENOENT') throw error
      this.apps = []
    }
    if (this.migrate()) await this.save()
  }

  migrate() {
    const before = JSON.stringify(this.apps)
    this.apps = this.apps.filter(isCompatible)
    const byId = {}
    this.apps.forEach((app) => { byId[app.id] = app })
    seedDefinitions.forEach((definition) => {
      let app = byId[definition.id]
      if (!app) {
        app = buildApp(definition)
        this.apps.push(app)
        byId[app.id] = app
      }
      upgradeSeedApp(app, definition)
      normalizeAppIcon(app, iconFileData(definition.icon))
    })
    this.apps.forEach((app) => normalizeAppIcon(app))
    return before !== JSON.stringify(this.apps)
  }

  async save() {
    const tempFile = `${this.dataFile}.tmp`
    await fs.writeFile(tempFile, JSON.stringify(this.apps, null, 2), 'utf8')
    await fs.rename(tempFile, this.dataFile)
  }

  list() {
    return this.apps.map(publicApp)
  }

  get(id) {
    const app = this.apps.find((item) => item.id === id)
    return app ? publicApp(app) : null
  }

  async create(input) {
    const id = String(input.id || '').trim().toLowerCase()
    const name = String(input.name || '').trim()
    if (!validateId(id)) throw Object.assign(new Error('App ID may contain lowercase letters, numbers, dots, hyphens, or underscores'), { statusCode: 400 })
    if (!name) throw Object.assign(new Error('App name is required'), { statusCode: 400 })
    if (this.apps.some((item) => item.id === id)) throw Object.assign(new Error('App ID already exists'), { statusCode: 409 })

    const createdAt = nowIso()
    const version = String(input.version || '0.1.0')
    const iconData = normalizeIconData(input.iconData, defaultIconData())
    const manifest = { id, name, version, entry: 'app.js', type: 'ui', minHostVersion: '0.1.0', runtime: RUNTIME, icon: 'icon.png' }
    const app = {
      id,
      name,
      description: String(input.description || 'New Host micro app'),
      visibility: input.visibility === 'official' ? 'official' : 'private',
      icon: 'custom',
      iconData,
      color: /^#[0-9a-f]{6}$/i.test(String(input.color || '')) ? String(input.color) : '#17796e',
      ownerId: 'demo-user',
      createdAt,
      updatedAt: createdAt,
      draft: { version, code: defaultCode(name), manifest, iconData },
      published: null
    }
    this.apps.unshift(app)
    await this.save()
    return publicApp(app)
  }

  async update(id, input) {
    const app = this.apps.find((item) => item.id === id)
    if (!app) throw Object.assign(new Error('App not found'), { statusCode: 404 })
    if (input.name !== undefined) app.name = String(input.name).trim() || app.name
    if (input.description !== undefined) app.description = String(input.description)
    if (input.visibility !== undefined) app.visibility = input.visibility === 'official' ? 'official' : 'private'
    if (input.iconData !== undefined) {
      app.iconData = normalizeIconData(input.iconData)
      app.draft.iconData = app.iconData
    }
    if (input.color !== undefined && /^#[0-9a-f]{6}$/i.test(String(input.color))) app.color = String(input.color)
    if (input.draft && typeof input.draft === 'object') {
      if (input.draft.version !== undefined) app.draft.version = String(input.draft.version)
      if (input.draft.code !== undefined) app.draft.code = String(input.draft.code)
      if (input.draft.manifest && typeof input.draft.manifest === 'object') {
        app.draft.manifest = { ...clone(input.draft.manifest), id: app.id, name: app.name, version: app.draft.version }
      }
    }
    app.icon = 'custom'
    app.draft.manifest.id = app.id
    app.draft.manifest.name = app.name
    app.draft.manifest.version = app.draft.version
    app.draft.manifest.runtime = RUNTIME
    app.draft.manifest.icon = 'icon.png'
    app.updatedAt = nowIso()
    await this.save()
    return publicApp(app)
  }

  async publish(id) {
    const app = this.apps.find((item) => item.id === id)
    if (!app) throw Object.assign(new Error('App not found'), { statusCode: 404 })
    app.iconData = normalizeIconData(app.iconData)
    app.draft.iconData = app.iconData
    app.published = { ...clone(app.draft), publishedAt: nowIso() }
    app.updatedAt = app.published.publishedAt
    await this.save()
    return publicApp(app)
  }

  deviceList() {
    return this.apps.filter((app) => app.published && app.published.manifest.runtime === RUNTIME).map((app) => ({
      id: app.id,
      name: app.name,
      description: app.description,
      visibility: app.visibility,
      icon: 'custom',
      color: app.color,
      version: app.published.version,
      minHostVersion: app.published.manifest.minHostVersion || '0.1.0',
      publishedAt: app.published.publishedAt,
      downloadUrl: `/api/device/apps/${encodeURIComponent(app.id)}/download`
    }))
  }

  package(id) {
    const app = this.apps.find((item) => item.id === id)
    if (!app || !app.published) return null
    const iconContent = normalizeIconData(app.published.iconData, app.iconData)
    return {
      format: 'dejaos-host-mini-app',
      formatVersion: 1,
      manifest: {
        ...clone(app.published.manifest),
        icon: 'icon.png',
        color: app.color,
        owner: app.visibility === 'official' ? 'Official' : 'My Apps',
        description: app.description
      },
      files: { 'app.js': app.published.code },
      resources: [{ path: 'icon.png', encoding: 'base64', content: iconContent }],
      publishedAt: app.published.publishedAt
    }
  }
}

export { seedApps, normalizeIconData }
