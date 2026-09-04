import logger from '../dxmodules/dxLogger.js'
import dxstd from '../dxmodules/dxStd.js'
import dxui from '../dxmodules/dxUi.js'
import dxDriver from '../dxmodules/dxDriver.js'

/**
 * dxUi 2.0.6 Canvas API validation demo.
 *
 * Each card focuses on a small group of APIs. All visible and helper canvases
 * are created through dxui.Canvas.build(), so this example also verifies that
 * uiCanvas inherits the common uiBase positioning/invalidation methods.
 */

const SCREEN_WIDTH = 800
const SCREEN_HEIGHT = 1280
const IMAGE_PATH = '/app/code/resource/image/canvas-stamp.png'
const FONT_PATH = '/app/code/resource/font/font.ttf'
const UI_INTERVAL_MS = 5
const ANIMATION_INTERVAL_MS = 120

const COLORS = {
  background: 0x07111f,
  backgroundAlt: 0x0b1a2b,
  card: 0x10243a,
  cardBorder: 0x244563,
  canvas: 0x091725,
  text: 0xf4f9ff,
  muted: 0x8da6bc,
  cyan: 0x38ddff,
  blue: 0x4d8dff,
  purple: 0xa66cff,
  pink: 0xff65b3,
  green: 0x54e0a3,
  amber: 0xffc85a,
  red: 0xff667c,
}

const uiContext = {}
const nativeAlive = []
const passedCases = []
const failedCases = []

let root = null
let Enum = null
let Draw = null
let fontSmall = null
let fontBody = null
let fontTitle = null
let summaryLabel = null
let detailLabel = null
let uiTimer = null
let animationTimer = null
let transformCanvas = null
let transformSource = null
let transformImgDsc = null
let transformArcDsc = null
let transformTextDsc = null
let transformAngle = 0
let transformZoom = 245
let transformZoomDirection = 1

function keep(value) {
  nativeAlive.push(value)
  return value
}

function assert(condition, message) {
  if (!condition) throw new Error(message)
}

function makeView(id, parent, x, y, width, height, color, radius = 18, opacity = 100) {
  const view = dxui.View.build(id, parent)
  view.setSize(width, height)
  view.setPos(x, y)
  view.padAll(0)
  view.scroll(false)
  view.borderWidth(0)
  view.radius(radius)
  view.bgColor(color)
  view.bgOpa(opacity)
  return view
}

function makeLabel(id, parent, text, x, y, width, height, font, color, align = dxui.Utils.TEXT_ALIGN.LEFT) {
  const label = dxui.Label.build(id, parent)
  label.setSize(width, height)
  label.setPos(x, y)
  label.text(text || ' ')
  label.textFont(font)
  label.textColor(color)
  label.textAlign(align)
  return label
}

function makeCard(id, x, y, title, apiText) {
  const card = makeView(`${id}_card`, root, x, y, 360, 285, COLORS.card, 22)
  card.borderWidth(1)
  card.borderColor(COLORS.cardBorder)
  makeLabel(`${id}_title`, card, title, 18, 12, 230, 30, fontBody, COLORS.text)
  makeLabel(`${id}_api`, card, apiText, 18, 42, 324, 22, fontSmall, COLORS.muted)
  const status = makeLabel(`${id}_status`, card, 'RUN', 278, 14, 62, 26, fontSmall, COLORS.amber, dxui.Utils.TEXT_ALIGN.CENTER)
  return { card, status }
}

function createCanvas(id, parent, x, y, width, height, colorFormat) {
  const canvas = dxui.Canvas.build(id, parent)
  if (colorFormat === undefined) canvas.setBuffer(width, height)
  else canvas.setBuffer(width, height, colorFormat)
  canvas.setPos(x, y)
  return canvas
}

function createHiddenCanvas(id, width, height, colorFormat) {
  return createCanvas(id, root, -1200, -1200, width, height, colorFormat)
}

function rectDsc(config) {
  const dsc = keep(Draw.lvDrawRectDscInit())
  Draw.lvDrawRectReset(dsc, config)
  return dsc
}

function lineDsc(color, width = 2, opacity = Enum.LV_OPA_COVER) {
  const dsc = keep(Draw.lvDrawLineDscInit())
  Draw.lvDrawLineReset(dsc, {
    color,
    width,
    opa: opacity,
    round_start: 1,
    round_end: 1,
    blend_mode: Enum.LV_BLEND_MODE_NORMAL,
  })
  return dsc
}

function arcDsc(color, width = 5, opacity = Enum.LV_OPA_COVER) {
  const dsc = keep(Draw.lvDrawArcDscInit())
  Draw.lvDrawArcReset(dsc, { color, width, opa: opacity, rounded: 1 })
  return dsc
}

function textDsc(color, size = 16, align = Enum.LV_TEXT_ALIGN_LEFT) {
  const dsc = keep(Draw.lvDrawLabelDscInit())
  Draw.lvDrawLabelReset(dsc, {
    color,
    opa: Enum.LV_OPA_COVER,
    font: size,
    align,
    letter_space: 0,
  })
  return dsc
}

function imageDsc(config = {}) {
  const dsc = keep(Draw.lvDrawImgDscInit())
  Draw.lvDrawImgDscReset(dsc, {
    opa: config.opa === undefined ? Enum.LV_OPA_COVER : config.opa,
    zoom: config.zoom === undefined ? 256 : config.zoom,
    angle: config.angle || 0,
    pivot_x: config.pivotX || 0,
    pivot_y: config.pivotY || 0,
    recolor: config.recolor || 0,
    recolor_opa: config.recolorOpa || 0,
    antialias: config.antialias === false ? 0 : 1,
  })
  return dsc
}

function makeRgbaBuffer(width, height, colorA, colorB) {
  const data = new Uint8Array(width * height * 4)
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const color = (((x >> 3) + (y >> 3)) & 1) ? colorA : colorB
      const offset = (y * width + x) * 4
      data[offset] = color & 0xff
      data[offset + 1] = (color >> 8) & 0xff
      data[offset + 2] = (color >> 16) & 0xff
      data[offset + 3] = 255
    }
  }
  return data
}

function markResult(test, name, error) {
  if (error) {
    test.status.text('FAIL')
    test.status.textColor(COLORS.red)
    failedCases.push(name)
    logger.error(`Canvas case failed: ${name}`, error)
  } else {
    test.status.text('PASS')
    test.status.textColor(COLORS.green)
    passedCases.push(name)
    logger.info(`Canvas case passed: ${name}`)
  }
}

function runCase(test, name, callback) {
  try {
    callback()
    markResult(test, name)
  } catch (error) {
    markResult(test, name, error)
  }
}

function buildPrimitivesCase() {
  const test = makeCard('primitives', 30, 112, '01  DRAW PRIMITIVES', 'drawRect · drawLine · polygon · arc · text')
  runCase(test, 'primitives', () => {
    const canvas = createCanvas('primitives_canvas', test.card, 20, 68, 320, 198, Enum.LV_IMG_CF_TRUE_COLOR)
    canvas.fillBg(COLORS.canvas)

    const gradient = rectDsc({
      radius: 12,
      bg_color: COLORS.blue,
      bg_opa: Enum.LV_OPA_COVER,
      bg_grad_dir: Enum.LV_GRAD_DIR_HOR,
      bg_grad_stops: [
        { color: COLORS.blue, frac: 0 },
        { color: COLORS.purple, frac: 255 },
      ],
      border_width: 2,
      border_color: 0xb9dcff,
      border_opa: Enum.LV_OPA_COVER,
    })
    canvas.drawRect(14, 16, 126, 68, gradient)
    canvas.drawPolygon([[176, 18], [230, 42], [214, 88], [158, 74]], rectDsc({
      bg_color: COLORS.green,
      bg_opa: Enum.LV_OPA_COVER,
      border_width: 0,
    }))
    canvas.drawLine([[20, 132], [72, 100], [120, 148], [174, 110], [222, 148]], lineDsc(COLORS.cyan, 5))
    canvas.drawArc(270, 126, 38, 35, 325, arcDsc(COLORS.pink, 8))
    canvas.drawText(18, 166, 284, textDsc(0xd7e8f7, 14, Enum.LV_TEXT_ALIGN_CENTER), 'RECT   LINE   POLYGON   ARC')
    canvas.invalidate()
  })
}

function buildPixelsCase() {
  const test = makeCard('pixels', 410, 112, '02  PIXELS & PALETTE', 'setPxColor · setPxOpa · setPalette · getPx')
  runCase(test, 'pixels_palette', () => {
    const pixels = createCanvas('pixels_canvas', test.card, 20, 68, 204, 170, Enum.LV_IMG_CF_TRUE_COLOR_ALPHA)
    pixels.fillBg(COLORS.canvas)
    for (let y = 0; y < 12; y += 1) {
      for (let x = 0; x < 16; x += 1) {
        const red = 30 + x * 12
        const green = 80 + y * 13
        const blue = 220 - x * 7
        const color = (red << 16) | (green << 8) | blue
        const px = 8 + x * 12
        const py = 10 + y * 12
        for (let oy = 0; oy < 7; oy += 1) {
          for (let ox = 0; ox < 7; ox += 1) {
            pixels.setPxColor(px + ox, py + oy, color)
            pixels.setPxOpa(px + ox, py + oy, 80 + x * 10)
          }
        }
      }
    }
    const sampled = pixels.getPx(104, 82)
    assert(typeof sampled === 'number', 'getPx must return a number')

    const indexed = createCanvas('palette_canvas', test.card, 240, 68, 96, 96, Enum.LV_IMG_CF_INDEXED_4BIT)
    const palette = [0x07111f, COLORS.cyan, COLORS.blue, COLORS.purple, COLORS.pink, COLORS.green, COLORS.amber, 0xffffff]
    for (let i = 0; i < palette.length; i += 1) indexed.setPalette(i, palette[i])
    indexed.fillBg(0)
    for (let y = 0; y < 96; y += 1) {
      for (let x = 0; x < 96; x += 1) indexed.setPxColor(x, y, 1 + (((x >> 4) + (y >> 4)) % 7))
    }
    makeLabel('palette_caption', test.card, `indexed 4-bit\npx 0x${(sampled >>> 0).toString(16)}`, 232, 174, 112, 70, fontSmall, COLORS.muted, dxui.Utils.TEXT_ALIGN.CENTER)
    pixels.invalidate()
    indexed.invalidate()
  })
}

function buildCopyImageCase() {
  const test = makeCard('copy_image', 30, 415, '03  COPY & IMAGE', 'copyBuf · drawImg(canvas) · drawImg(path)')
  runCase(test, 'copy_image', () => {
    const stamp = createHiddenCanvas('copy_stamp_source', 64, 64, Enum.LV_IMG_CF_TRUE_COLOR)
    stamp.fillBg(COLORS.purple)
    stamp.drawRect(8, 8, 48, 48, rectDsc({
      radius: 12,
      bg_color: COLORS.cyan,
      bg_opa: Enum.LV_OPA_COVER,
      border_width: 3,
      border_color: 0xffffff,
      border_opa: Enum.LV_OPA_COVER,
    }))

    const canvas = createCanvas('copy_image_canvas', test.card, 20, 68, 320, 198, Enum.LV_IMG_CF_TRUE_COLOR)
    canvas.fillBg(COLORS.canvas)
    canvas.copyBuf(stamp, 20, 24, 64, 64)
    canvas.drawImg(122, 24, stamp, imageDsc({ zoom: 310, angle: 250, pivotX: 32, pivotY: 32 }))
    canvas.drawImg(244, 30, IMAGE_PATH, imageDsc({ zoom: 420, recolor: COLORS.cyan, recolorOpa: Enum.LV_OPA_20 }))
    canvas.drawText(12, 132, 296, textDsc(COLORS.muted, 14, Enum.LV_TEXT_ALIGN_CENTER), 'BUFFER       CANVAS       PNG PATH')
    canvas.invalidate()
  })
}

function buildTransformCase() {
  const test = makeCard('transform', 410, 415, '04  TRANSFORM', 'transform · source Canvas · angle · zoom')
  runCase(test, 'transform', () => {
    transformSource = createHiddenCanvas('transform_source', 72, 72, Enum.LV_IMG_CF_TRUE_COLOR)
    transformSource.fillBg(0x000000)
    // LVGL's canvas polygon rasterizer requires a convex point sequence.
    transformSource.drawPolygon([[36, 4], [68, 36], [36, 68], [4, 36]], rectDsc({
      bg_color: COLORS.amber,
      bg_opa: Enum.LV_OPA_COVER,
      border_width: 2,
      border_color: 0xffffff,
      border_opa: Enum.LV_OPA_COVER,
    }))
    transformSource.drawArc(36, 33, 16, 0, 359, arcDsc(COLORS.pink, 6))

    transformCanvas = createCanvas('transform_canvas', test.card, 20, 68, 320, 198, Enum.LV_IMG_CF_TRUE_COLOR)
    transformImgDsc = lineDsc(0x25506d, 1, Enum.LV_OPA_40)
    transformArcDsc = arcDsc(COLORS.cyan, 4)
    transformTextDsc = textDsc(COLORS.muted, 14, Enum.LV_TEXT_ALIGN_CENTER)
    renderTransform()
  })
}

function renderTransform() {
  if (!transformCanvas || !transformSource) return
  transformCanvas.fillBg(COLORS.canvas)
  transformCanvas.drawLine([[18, 99], [302, 99]], transformImgDsc)
  transformCanvas.drawLine([[160, 14], [160, 184]], transformImgDsc)
  transformCanvas.transform(transformSource, transformAngle, transformZoom, 124, 63, 36, 36, true)
  transformCanvas.drawArc(160, 99, 74, 270, Math.max(271, 270 + Math.floor(transformAngle / 10)), transformArcDsc)
  transformCanvas.drawText(12, 170, 296, transformTextDsc, `angle ${Math.floor(transformAngle / 10)}°   zoom ${transformZoom}`)
  transformCanvas.invalidate()
}

function buildBlurCase() {
  const test = makeCard('blur', 30, 718, '05  BLUR FILTERS', 'blurHor(region) · blurVer(region) · full blur')
  runCase(test, 'blur', () => {
    const source = createHiddenCanvas('blur_source', 320, 198, Enum.LV_IMG_CF_TRUE_COLOR)
    source.fillBg(0x081522)
    const colors = [COLORS.pink, COLORS.purple, COLORS.blue, COLORS.cyan, COLORS.green]
    for (let i = 0; i < colors.length; i += 1) {
      source.drawRect(12 + i * 58, 34 + (i % 2) * 42, 52, 92, rectDsc({
        radius: 12,
        bg_color: colors[i],
        bg_opa: Enum.LV_OPA_COVER,
        border_width: 0,
      }))
    }

    const canvas = createCanvas('blur_canvas', test.card, 20, 68, 320, 198, Enum.LV_IMG_CF_TRUE_COLOR)
    canvas.copyBuf(source, 0, 0, 320, 198)
    canvas.blurHor(0, 0, 158, 197, 7)
    canvas.blurVer(161, 0, 319, 197, 7)
    canvas.drawText(14, 12, 130, textDsc(0xffffff, 14, Enum.LV_TEXT_ALIGN_CENTER), 'HORIZONTAL')
    canvas.drawText(176, 12, 130, textDsc(0xffffff, 14, Enum.LV_TEXT_ALIGN_CENTER), 'VERTICAL')

    const full = createCanvas('full_blur_canvas', test.card, 256, 184, 70, 54, Enum.LV_IMG_CF_TRUE_COLOR)
    full.copyBuf(source, 0, 0, 70, 54)
    full.blurHor(3)
    full.blurVer(3)
    canvas.invalidate()
    full.invalidate()
  })
}

function buildBufferCase() {
  const test = makeCard('buffer', 410, 718, '06  BUFFER & INFO', 'setBuffer · getImg · raw buffer variants')
  runCase(test, 'buffer_info', () => {
    const canvas = createCanvas('buffer_canvas', test.card, 20, 68, 280, 160, Enum.LV_IMG_CF_TRUE_COLOR_ALPHA)
    canvas.fillBg(COLORS.red)
    canvas.setBuffer(320, 198, Enum.LV_IMG_CF_TRUE_COLOR)
    canvas.fillBg(COLORS.canvas)

    const a = makeRgbaBuffer(48, 48, COLORS.cyan, COLORS.blue)
    const b = makeRgbaBuffer(48, 48, COLORS.pink, COLORS.purple)
    const c = makeRgbaBuffer(48, 48, COLORS.green, COLORS.amber)
    canvas.copyBuf(a.buffer, 28, 30, 48, 48)
    canvas.copyBuf(b, 104, 30, 48, 48)
    canvas.copyBuf({ data: c }, 180, 30, 48, 48)

    const info = canvas.getImg()
    const sampled = canvas.getPx(116, 42)
    assert(info.w === 320 && info.h === 198, `unexpected image size ${info.w}x${info.h}`)
    canvas.drawText(18, 96, 284, textDsc(COLORS.text, 14, Enum.LV_TEXT_ALIGN_CENTER), 'ArrayBuffer   TypedArray   { data }')
    canvas.drawText(18, 130, 284, textDsc(COLORS.muted, 14, Enum.LV_TEXT_ALIGN_CENTER), `${info.w}×${info.h}  cf=${info.cf}  bytes=${info.data_size}`)
    canvas.drawText(18, 156, 284, textDsc(COLORS.muted, 14, Enum.LV_TEXT_ALIGN_CENTER), `getPx = 0x${(sampled >>> 0).toString(16)}`)
    canvas.invalidate()
  })
}

function updateSummary(drawApi) {
  const total = passedCases.length + failedCases.length
  summaryLabel.text(`${passedCases.length}/${total} TEST GROUPS PASSED`)
  summaryLabel.textColor(failedCases.length ? COLORS.red : COLORS.green)
  detailLabel.text(failedCases.length
    ? `NativeDraw API ${drawApi}  ·  failed: ${failedCases.join(', ')}`
    : `dxUi 2.0.6  ·  NativeDraw API ${drawApi}  ·  Canvas wrapper ready`)
}

function animateTransform() {
  try {
    transformAngle = (transformAngle + 80) % 3600
    transformZoom += transformZoomDirection * 5
    if (transformZoom >= 315) transformZoomDirection = -1
    else if (transformZoom <= 210) transformZoomDirection = 1
    renderTransform()
  } catch (error) {
    if (animationTimer) dxstd.clearInterval(animationTimer)
    animationTimer = null
    logger.error('Canvas transform animation failed', error)
  }
}

function buildScreen(drawApi) {
  root = dxui.View.build('canvas_api_root', dxui.Utils.LAYER.MAIN)
  root.setSize(SCREEN_WIDTH, SCREEN_HEIGHT)
  root.setPos(0, 0)
  root.padAll(0)
  root.scroll(false)
  root.radius(0)
  root.borderWidth(0)
  root.bgColor(COLORS.background)

  makeView('header_glow', root, 0, 0, SCREEN_WIDTH, 92, COLORS.backgroundAlt, 0)
  makeLabel('page_title', root, 'CANVAS API VALIDATION', 30, 18, 560, 44, fontTitle, COLORS.text)
  makeLabel('page_version', root, 'dxUi 2.0.6', 604, 24, 166, 34, fontBody, COLORS.cyan, dxui.Utils.TEXT_ALIGN.RIGHT)
  makeLabel('page_subtitle', root, 'Six focused examples · one-page reference', 32, 70, 540, 26, fontSmall, COLORS.muted)

  buildPrimitivesCase()
  buildPixelsCase()
  buildCopyImageCase()
  buildTransformCase()
  buildBlurCase()
  buildBufferCase()

  const footer = makeView('summary_card', root, 30, 1024, 740, 220, COLORS.backgroundAlt, 24)
  footer.borderWidth(1)
  footer.borderColor(COLORS.cardBorder)
  makeLabel('coverage_title', footer, 'PUBLIC METHODS COVERED', 24, 18, 692, 30, fontBody, COLORS.text)
  makeLabel('coverage_one', footer, 'setBuffer  fillBg  setPxColor  setPxOpa  setPalette  getPx  getImg', 24, 56, 692, 28, fontSmall, COLORS.muted)
  makeLabel('coverage_two', footer, 'copyBuf  transform  blurHor  blurVer  drawRect  drawText  drawImg', 24, 86, 692, 28, fontSmall, COLORS.muted)
  makeLabel('coverage_three', footer, 'drawLine  drawPolygon  drawArc  + inherited setPos / invalidate', 24, 116, 692, 28, fontSmall, COLORS.muted)
  summaryLabel = makeLabel('summary_label', footer, 'RUNNING TESTS', 24, 154, 330, 38, fontBody, COLORS.amber)
  detailLabel = makeLabel('summary_detail', footer, ' ', 350, 158, 366, 32, fontSmall, COLORS.muted, dxui.Utils.TEXT_ALIGN.RIGHT)
  updateSummary(drawApi)

  dxui.loadMain(root)
}

function shutdown() {
  if (animationTimer) {
    dxstd.clearInterval(animationTimer)
    animationTimer = null
  }
  if (uiTimer) {
    dxstd.clearInterval(uiTimer)
    uiTimer = null
  }
}

try {
  dxui.init({}, uiContext)
  Enum = dxui.Utils.ENUM
  Draw = dxui.Utils.GG.NativeDraw
  assert(dxui.Canvas && typeof dxui.Canvas.build === 'function', 'dxui.Canvas.build is unavailable')
  assert(Draw && typeof Draw.lvDrawApiVersion === 'function', 'NativeDraw API is unavailable')
  const drawApi = Draw.lvDrawApiVersion()
  assert(drawApi >= 8, `NativeDraw API ${drawApi} is too old; version 8 or newer is required`)

  fontSmall = dxui.Font.build(FONT_PATH, 14, dxui.Utils.FONT_STYLE.NORMAL)
  fontBody = dxui.Font.build(FONT_PATH, 18, dxui.Utils.FONT_STYLE.BOLD)
  fontTitle = dxui.Font.build(FONT_PATH, 32, dxui.Utils.FONT_STYLE.BOLD)

  buildScreen(drawApi)
  uiTimer = dxstd.setInterval(() => dxui.handler(), UI_INTERVAL_MS)
  if (transformCanvas) animationTimer = dxstd.setInterval(animateTransform, ANIMATION_INTERVAL_MS, true)

  logger.info('Canvas API validation demo ready', {
    width: dxDriver.DISPLAY.WIDTH,
    height: dxDriver.DISPLAY.HEIGHT,
    dxUi: '2.0.6',
    drawApi,
    passed: passedCases,
    failed: failedCases,
  })
} catch (error) {
  shutdown()
  logger.error('Canvas API validation demo failed', error)
  throw error
}
