import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs/promises'
import path from 'node:path'
import vm from 'node:vm'
import { fileURLToPath } from 'node:url'

const testDir = path.dirname(fileURLToPath(import.meta.url))
const templatePath = path.resolve(testDir, '../data/templates/weather-http.js')

function control(initialText = '') {
  let value = initialText
  return {
    text(next) {
      if (arguments.length) value = String(next)
      return value
    },
    show() {},
    hide() {}
  }
}

test('weather mini app renders Open-Meteo response data', async () => {
  const labels = {}
  const buttons = {}
  const code = await fs.readFile(templatePath, 'utf8')
  const runtime = vm.runInNewContext(code)
  const payload = {
    current: {
      time: '2026-07-21T14:30',
      temperature_2m: 29.5,
      relative_humidity_2m: 81,
      apparent_temperature: 35.7,
      precipitation: 0.4,
      weather_code: 96,
      wind_speed_10m: 10.4,
      wind_direction_10m: 225
    },
    daily: {
      time: ['2026-07-21', '2026-07-22', '2026-07-23', '2026-07-24'],
      weather_code: [96, 61, 2, 0],
      temperature_2m_max: [34.1, 32.4, 31.8, 35.2],
      temperature_2m_min: [27.2, 26.8, 25.9, 27.1],
      precipitation_probability_max: [80, 60, 20, 5]
    }
  }
  const ui = {
    Theme: { PAGE: 1, WHITE: 2, INK: 3, MUTED: 4, BRAND: 5 },
    ALIGN: { CENTER: 1 },
    view() { return control() },
    card() { return control() },
    image() { return control() },
    label(id, parent, text) {
      labels[id] = control(text)
      return labels[id]
    },
    button(id, parent, text, x, y, width, height, color, textColor, onClick) {
      buttons[id] = onClick
      return control(text)
    }
  }
  const context = {
    ui,
    root: control(),
    app: { icon: '/tmp/icon.png' },
    http: { getServiceJson: async () => payload },
    toast() {},
    logger: { info() {}, error() {} }
  }

  runtime.mount(context)
  await new Promise((resolve) => setImmediate(resolve))

  assert.equal(labels.source.text(), 'Open-Meteo.com · Updated 14:30')
  assert.equal(labels.degree.text(), '30°')
  assert.equal(labels.state.text(), 'Thunderstorm · Feels 36°')
  assert.equal(labels.details.text(), 'Wind SW 10 km/h   Humidity 81%')
  assert.equal(labels.forecast_temp_0.text(), '34/27°')
  assert.equal(labels.forecast_desc_0.text(), 'Thunderstorm')
  assert.equal(labels.forecast_rain_0.text(), 'Rain 80%')
  assert.match(labels.status.text(), /Live data updated/)
  assert.equal(typeof buttons.refresh, 'function')
})
