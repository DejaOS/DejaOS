import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { createAppServer } from '../src/server.js'

const testDir = path.dirname(fileURLToPath(import.meta.url))
const webRoot = path.resolve(testDir, '../../web')

test('WebAPI prototype end-to-end flow', async (context) => {
  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'dejaos-host-webapi-'))
  const weatherFixture = {
    current: { time: '2026-07-21T14:30', temperature_2m: 29.5, weather_code: 96 },
    daily: { time: ['2026-07-21'], temperature_2m_max: [34.1], temperature_2m_min: [27.2] }
  }
  const server = await createAppServer({
    dataFile: path.join(tempDir, 'apps.json'),
    webRoot,
    weatherProvider: async () => weatherFixture
  })
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve))
  context.after(async () => {
    await new Promise((resolve) => server.close(resolve))
    await fs.rm(tempDir, { recursive: true, force: true })
  })
  const address = server.address()
  const baseUrl = `http://127.0.0.1:${address.port}`

  const page = await fetch(`${baseUrl}/`)
  assert.equal(page.status, 200)
  assert.match(await page.text(), /DejaOS Studio/)

  const time = await fetch(`${baseUrl}/api/time`).then((response) => response.json())
  assert.match(time.displayTime, /^\d{2}:\d{2}$/)
  assert.equal(time.timeZone, 'Asia/Shanghai')

  const weather = await fetch(`${baseUrl}/api/weather?latitude=30.2741&longitude=120.1551&timezone=Asia%2FShanghai`).then((response) => response.json())
  assert.deepEqual(weather, weatherFixture)

  const initialApps = await fetch(`${baseUrl}/api/apps`).then((response) => response.json())
  assert.equal(initialApps.items.length, 3)
  assert.deepEqual(initialApps.items.map((app) => app.id).sort(), ['calendar', 'notes', 'weather-http'])
  assert.ok(initialApps.items.every((app) => app.icon === 'custom' && app.iconData.length > 100))
  const weatherApp = initialApps.items.find((app) => app.id === 'weather-http')
  assert.equal(weatherApp.publishedVersion, '0.4.0')
  assert.match(weatherApp.published.code, /\/weather\?latitude=/)
  assert.match(weatherApp.published.code, /contextRef\.http\.getServiceJson/)
  const deviceApps = await fetch(`${baseUrl}/api/device/apps`).then((response) => response.json())
  assert.equal(deviceApps.items.length, 3)
  assert.ok(deviceApps.items.some((app) => app.id === 'weather-http'))

  const createdResponse = await fetch(`${baseUrl}/api/apps`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ id: 'inspection', name: 'Device Inspection', icon: 'tools', color: '#336699' })
  })
  assert.equal(createdResponse.status, 201)
  const created = await createdResponse.json()
  assert.equal(created.app.status, 'draft')
  assert.equal(created.app.icon, 'custom')

  const invalidSize = Buffer.from(created.app.iconData, 'base64')
  invalidSize.writeUInt32BE(41, 16)
  const invalidIconResponse = await fetch(`${baseUrl}/api/apps/inspection`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ iconData: invalidSize.toString('base64') })
  })
  assert.equal(invalidIconResponse.status, 400)

  const published = await fetch(`${baseUrl}/api/apps/inspection/publish`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: '{}'
  }).then((response) => response.json())
  assert.equal(published.app.publishedVersion, '0.1.0')

  const originalPublishedIcon = published.app.published.iconData
  const alternateIcon = initialApps.items.find((app) => app.id === 'calendar').iconData
  const iconDraft = await fetch(`${baseUrl}/api/apps/inspection`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ iconData: alternateIcon })
  }).then((response) => response.json())
  assert.equal(iconDraft.app.status, 'draft')
  assert.equal(iconDraft.app.iconData, alternateIcon)

  const download = await fetch(`${baseUrl}/api/device/apps/inspection/download`)
  assert.equal(download.status, 200)
  assert.match(download.headers.get('content-disposition'), /inspection-0.1.0\.dxapp\.json/)
  const appPackage = await download.json()
  assert.equal(appPackage.format, 'dejaos-host-mini-app')
  assert.equal(appPackage.manifest.id, 'inspection')
  assert.equal(appPackage.manifest.icon, 'icon.png')
  assert.equal(appPackage.resources[0].path, 'icon.png')
  assert.equal(appPackage.resources[0].encoding, 'base64')
  assert.ok(appPackage.resources[0].content.length > 100)
  const packagedIcon = Buffer.from(appPackage.resources[0].content, 'base64')
  assert.equal(packagedIcon.readUInt32BE(16), 40)
  assert.equal(packagedIcon.readUInt32BE(20), 40)
  assert.equal(appPackage.resources[0].content, originalPublishedIcon)

  await fetch(`${baseUrl}/api/apps/inspection/publish`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: '{}'
  })
  const republishedPackage = await fetch(`${baseUrl}/api/device/apps/inspection/download`).then((response) => response.json())
  assert.equal(republishedPackage.resources[0].content, alternateIcon)
})
