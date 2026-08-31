import dxui from '../dxmodules/dxUi.js'
import dxstd from '../dxmodules/dxStd.js'
import logger from '../dxmodules/dxLogger.js'

const WIDTH = 800
const HEIGHT = 1280
const MAP_WIDTH = 1897
const MAP_HEIGHT = 930
const ASSET_ROOT = '/app/code/resource/maps'
const TICK_MS = 100
const ARRIVAL_TIME_MS = 25500
const SCENARIO_END_MS = 28000

const WAYPOINTS = [
  { time: 0, x: 441, y: 816, mapX: -540, direction: 'north' },
  { time: 6000, x: 404, y: 380, mapX: -540, direction: 'north' },
  { time: 7600, x: 397, y: 331, mapX: -540, direction: 'west' },
  { time: 14500, x: 400, y: 584, mapX: 53, direction: 'west' },
  { time: 16200, x: 395, y: 548, mapX: 53, direction: 'north' },
  { time: 24000, x: 384, y: 220, mapX: 53, direction: 'north' },
  { time: ARRIVAL_TIME_MS, x: 384, y: 205, mapX: 53, direction: 'north' },
  { time: SCENARIO_END_MS, x: 384, y: 205, mapX: 53, direction: 'north' }
]

const INSTRUCTIONS = [
  { start: 0, icon: 'straight', distance: '500米', title: '沿中关村南大街向北', street: '保持当前车道' },
  { start: 5200, icon: 'left', distance: '200米', title: '人民大学路口左转', street: '进入北三环西路' },
  { start: 9000, icon: 'straight', distance: '1.2公里', title: '沿北三环西路直行', street: '前往苏州桥方向' },
  { start: 13800, icon: 'right', distance: '150米', title: '苏州桥右转', street: '进入万泉河路' },
  { start: 19000, icon: 'straight', distance: '300米', title: '目的地在道路右侧', street: '北京市第十九中学' },
  { start: ARRIVAL_TIME_MS, icon: 'arrive', distance: '已到达', title: '北京市第十九中学', street: '导航结束 · 演示路线' }
]

const PROMPTS = [
  { time: 300, file: 'start.wav' },
  { time: 5600, file: 'left.wav' },
  { time: 9800, file: 'continue.wav' },
  { time: 14200, file: 'right.wav' },
  { time: ARRIVAL_TIME_MS, file: 'arrive.wav' }
]

function styleContainer(view, width, height, x, y, radius, color, opacity) {
  view.setSize(width, height)
  view.setPos(x, y)
  view.padAll(0)
  view.scroll(false)
  view.borderWidth(0)
  view.radius(radius)
  view.bgColor(color)
  view.bgOpa(opacity)
}

function styleLabel(label, font, color, width, height, x, y, align) {
  label.setSize(width, height)
  label.setPos(x, y)
  label.textFont(font)
  label.textColor(color)
  label.textAlign(align)
  label.longMode(dxui.Utils.LABEL_LONG_MODE.CLIP)
}

function interpolateRoute(elapsed) {
  for (let index = 0; index < WAYPOINTS.length - 1; index += 1) {
    const current = WAYPOINTS[index]
    const next = WAYPOINTS[index + 1]
    if (elapsed <= next.time) {
      const duration = Math.max(1, next.time - current.time)
      const progress = Math.max(0, Math.min(1, (elapsed - current.time) / duration))
      const eased = progress * progress * (3 - 2 * progress)
      return {
        x: Math.round(current.x + (next.x - current.x) * eased),
        y: Math.round(current.y + (next.y - current.y) * eased),
        mapX: Math.round(current.mapX + (next.mapX - current.mapX) * eased),
        direction: next.direction
      }
    }
  }
  return WAYPOINTS[WAYPOINTS.length - 1]
}

function instructionFor(elapsed) {
  let instruction = INSTRUCTIONS[0]
  for (let index = 1; index < INSTRUCTIONS.length; index += 1) {
    if (elapsed >= INSTRUCTIONS[index].start) {
      instruction = INSTRUCTIONS[index]
    } else {
      break
    }
  }
  return instruction
}

export function createMapPage(parent, fonts, audioService) {
  let opened = false
  let timer = null
  let startedAt = 0
  let lastDirection = ''
  let lastInstructionIcon = ''
  let playedPromptCount = 0
  let scenarioCompleted = false

  const page = dxui.View.build('mapPage', parent)
  styleContainer(page, WIDTH, HEIGHT, 0, 0, 0, '#06111D', 100)

  const map = dxui.Image.build('mapBackground', page)
  map.source(`${ASSET_ROOT}/map-bg.png`)
  map.setSize(MAP_WIDTH, MAP_HEIGHT)
  map.setPos(WAYPOINTS[0].mapX, 0)

  const carHalo = dxui.View.build('mapCarHalo', page)
  styleContainer(carHalo, 82, 82, 519, 764, 41, '#37C7FF', 22)
  carHalo.borderWidth(2)
  carHalo.borderColor('#8BEAFF')

  const car = dxui.Image.build('mapCar', page)
  car.source(`${ASSET_ROOT}/car-north.png`)
  car.setSize(64, 64)
  car.setPos(528, 773)

  const backTouch = dxui.View.build('mapBackTouch', page)
  styleContainer(backTouch, 76, 76, 20, 20, 38, '#071521', 82)
  backTouch.borderWidth(1)
  backTouch.borderColor('#6697B8')
  backTouch.clickable(true)
  const backIcon = dxui.Image.build('mapBackIcon', backTouch)
  backIcon.source('/app/code/resource/music/ui/back.png')
  backIcon.setSize(54, 54)
  backIcon.setPos(11, 11)

  const instructionCard = dxui.View.build('mapInstructionCard', page)
  styleContainer(instructionCard, 656, 148, 112, 20, 34, '#071521', 92)
  instructionCard.borderWidth(1)
  instructionCard.borderColor('#54C7F4')
  instructionCard.shadow(24, 0, 10, 0, 0x000000, 35)

  const maneuver = dxui.Image.build('mapManeuver', instructionCard)
  maneuver.source(`${ASSET_ROOT}/maneuver-straight.png`)
  maneuver.setSize(84, 84)
  maneuver.setPos(20, 31)

  const instructionDistance = dxui.Label.build('mapInstructionDistance', instructionCard)
  instructionDistance.text('500米')
  styleLabel(instructionDistance, fonts.weather, '#FFFFFF', 190, 52, 124, 25, dxui.Utils.TEXT_ALIGN.LEFT)

  const instructionTitle = dxui.Label.build('mapInstructionTitle', instructionCard)
  instructionTitle.text('沿中关村南大街向北')
  styleLabel(instructionTitle, fonts.title, '#DDF6FF', 480, 40, 124, 78, dxui.Utils.TEXT_ALIGN.LEFT)

  const instructionStreet = dxui.Label.build('mapInstructionStreet', instructionCard)
  instructionStreet.text('保持当前车道')
  styleLabel(instructionStreet, fonts.small, '#88AFC4', 480, 28, 124, 116, dxui.Utils.TEXT_ALIGN.LEFT)

  const gpsBadge = dxui.View.build('mapGpsBadge', page)
  styleContainer(gpsBadge, 128, 42, 638, 184, 21, '#092333', 80)
  gpsBadge.borderWidth(1)
  gpsBadge.borderColor('#3FCF9B')
  const gpsDot = dxui.View.build('mapGpsDot', gpsBadge)
  styleContainer(gpsDot, 10, 10, 14, 16, 5, '#3FE3A2', 100)
  const gpsText = dxui.Label.build('mapGpsText', gpsBadge)
  gpsText.text('GPS 良好')
  styleLabel(gpsText, fonts.small, '#BCEEDC', 92, 28, 30, 8, dxui.Utils.TEXT_ALIGN.LEFT)

  const speedCard = dxui.View.build('mapSpeedCard', page)
  styleContainer(speedCard, 92, 92, 28, 792, 46, '#071521', 88)
  speedCard.borderWidth(2)
  speedCard.borderColor('#91A9B9')
  const speedValue = dxui.Label.build('mapSpeedValue', speedCard)
  speedValue.text('42')
  styleLabel(speedValue, fonts.title, '#FFFFFF', 82, 38, 5, 16, dxui.Utils.TEXT_ALIGN.CENTER)
  const speedUnit = dxui.Label.build('mapSpeedUnit', speedCard)
  speedUnit.text('km/h')
  styleLabel(speedUnit, fonts.small, '#8DA9BC', 82, 28, 5, 53, dxui.Utils.TEXT_ALIGN.CENTER)

  const locationButton = dxui.View.build('mapLocationButton', page)
  styleContainer(locationButton, 72, 72, 696, 790, 36, '#071521', 88)
  locationButton.borderWidth(1)
  locationButton.borderColor('#70BDE1')
  const locationMark = dxui.Label.build('mapLocationMark', locationButton)
  locationMark.text('◎')
  styleLabel(locationMark, fonts.weather, '#BDEEFF', 62, 54, 5, 8, dxui.Utils.TEXT_ALIGN.CENTER)

  const bottomCard = dxui.View.build('mapBottomCard', page)
  styleContainer(bottomCard, WIDTH, 370, 0, 910, 38, '#07111F', 98)
  bottomCard.borderWidth(1)
  bottomCard.borderColor('#345A73')
  bottomCard.shadow(28, 0, -10, 0, 0x000000, 45)

  const sheetHandle = dxui.View.build('mapSheetHandle', bottomCard)
  styleContainer(sheetHandle, 74, 6, 363, 14, 3, '#7E9BAE', 65)

  const destinationTitle = dxui.Label.build('mapDestinationTitle', bottomCard)
  destinationTitle.text('北京市第十九中学')
  styleLabel(destinationTitle, fonts.title, '#FFFFFF', 500, 42, 34, 36, dxui.Utils.TEXT_ALIGN.LEFT)

  const destinationMeta = dxui.Label.build('mapDestinationMeta', bottomCard)
  destinationMeta.text('演示路线 · 路况畅通')
  styleLabel(destinationMeta, fonts.small, '#54DFA8', 420, 30, 34, 80, dxui.Utils.TEXT_ALIGN.LEFT)

  const arrivalTime = dxui.Label.build('mapArrivalTime', bottomCard)
  arrivalTime.text('18:12')
  styleLabel(arrivalTime, fonts.title, '#FFFFFF', 180, 40, 34, 130, dxui.Utils.TEXT_ALIGN.CENTER)
  const arrivalCaption = dxui.Label.build('mapArrivalCaption', bottomCard)
  arrivalCaption.text('预计到达')
  styleLabel(arrivalCaption, fonts.small, '#819CAF', 180, 28, 34, 170, dxui.Utils.TEXT_ALIGN.CENTER)

  const remainingDistance = dxui.Label.build('mapRemainingDistance', bottomCard)
  remainingDistance.text('2.8 km')
  styleLabel(remainingDistance, fonts.title, '#FFFFFF', 180, 40, 310, 130, dxui.Utils.TEXT_ALIGN.CENTER)
  const distanceCaption = dxui.Label.build('mapDistanceCaption', bottomCard)
  distanceCaption.text('剩余距离')
  styleLabel(distanceCaption, fonts.small, '#819CAF', 180, 28, 310, 170, dxui.Utils.TEXT_ALIGN.CENTER)

  const remainingTime = dxui.Label.build('mapRemainingTime', bottomCard)
  remainingTime.text('6 分钟')
  styleLabel(remainingTime, fonts.title, '#FFFFFF', 180, 40, 586, 130, dxui.Utils.TEXT_ALIGN.CENTER)
  const timeCaption = dxui.Label.build('mapTimeCaption', bottomCard)
  timeCaption.text('预计用时')
  styleLabel(timeCaption, fonts.small, '#819CAF', 180, 28, 586, 170, dxui.Utils.TEXT_ALIGN.CENTER)

  const progressTrack = dxui.View.build('mapProgressTrack', bottomCard)
  styleContainer(progressTrack, 732, 8, 34, 220, 4, '#5E7180', 45)
  const progressFill = dxui.View.build('mapProgressFill', bottomCard)
  styleContainer(progressFill, 4, 8, 34, 220, 4, '#42D5FF', 100)

  const soundChip = dxui.View.build('mapSoundChip', bottomCard)
  styleContainer(soundChip, 170, 72, 34, 252, 30, '#0A2434', 85)
  soundChip.borderWidth(1)
  soundChip.borderColor('#3C7897')
  const soundText = dxui.Label.build('mapSoundText', soundChip)
  soundText.text('语音播报  开')
  styleLabel(soundText, fonts.body, '#CDEEFF', 150, 34, 10, 19, dxui.Utils.TEXT_ALIGN.CENTER)

  const routeChip = dxui.View.build('mapRouteChip', bottomCard)
  styleContainer(routeChip, 170, 72, 222, 252, 30, '#0A2434', 85)
  routeChip.borderWidth(1)
  routeChip.borderColor('#3C7897')
  const routeText = dxui.Label.build('mapRouteText', routeChip)
  routeText.text('路线总览')
  styleLabel(routeText, fonts.body, '#CDEEFF', 150, 34, 10, 19, dxui.Utils.TEXT_ALIGN.CENTER)

  const restartTouch = dxui.View.build('mapRestartTouch', bottomCard)
  styleContainer(restartTouch, 340, 72, 426, 252, 30, '#167DFF', 100)
  restartTouch.borderWidth(1)
  restartTouch.borderColor('#87D6FF')
  restartTouch.clickable(true)
  const restartText = dxui.Label.build('mapRestartText', restartTouch)
  restartText.text('重新导航')
  styleLabel(restartText, fonts.body, '#FFFFFF', 320, 34, 10, 19, dxui.Utils.TEXT_ALIGN.CENTER)

  const gestureBar = dxui.View.build('mapGestureBar', page)
  styleContainer(gestureBar, 142, 6, 329, 1249, 3, '#FFFFFF', 82)

  function playPrompt(prompt) {
    try {
      audioService.playPrompt(`${ASSET_ROOT}/audio/${prompt.file}`)
    } catch (error) {
      logger.error('navigation prompt failed', error)
    }
  }

  function updateInstruction(elapsed) {
    const instruction = instructionFor(elapsed)
    if (instruction.icon !== lastInstructionIcon) {
      lastInstructionIcon = instruction.icon
      maneuver.source(`${ASSET_ROOT}/maneuver-${instruction.icon}.png`)
    }
    instructionDistance.text(instruction.distance)
    instructionTitle.text(instruction.title)
    instructionStreet.text(instruction.street)
  }

  function updateNavigation() {
    if (!opened) {
      return
    }
    const elapsed = Math.min(SCENARIO_END_MS, Math.max(0, Date.now() - startedAt))
    const route = interpolateRoute(elapsed)
    map.setPos(route.mapX, 0)
    car.setPos(route.x - 32, route.y - 32)
    carHalo.setPos(route.x - 41, route.y - 41)
    carHalo.bgOpa(18 + Math.round(15 * (0.5 + 0.5 * Math.sin(elapsed / 260))))
    if (route.direction !== lastDirection) {
      lastDirection = route.direction
      car.source(`${ASSET_ROOT}/car-${route.direction}.png`)
    }

    updateInstruction(elapsed)
    const progress = Math.min(1, elapsed / ARRIVAL_TIME_MS)
    const distance = Math.max(0, 2.8 * (1 - progress))
    const minutes = Math.max(0, Math.ceil(6 * (1 - progress)))
    remainingDistance.text(`${distance.toFixed(1)} km`)
    remainingTime.text(minutes === 0 ? '已到达' : `${minutes} 分钟`)
    progressFill.width(Math.max(4, Math.round(732 * progress)))
    speedValue.text(elapsed >= ARRIVAL_TIME_MS ? '0' : String(39 + Math.round(8 * Math.sin(elapsed / 1150))))
    restartText.text(elapsed >= ARRIVAL_TIME_MS ? '再次演示' : '重新导航')

    while (playedPromptCount < PROMPTS.length && elapsed >= PROMPTS[playedPromptCount].time) {
      playPrompt(PROMPTS[playedPromptCount])
      playedPromptCount += 1
    }

    if (elapsed >= SCENARIO_END_MS && !scenarioCompleted) {
      scenarioCompleted = true
      if (timer) {
        dxstd.clearInterval(timer)
        timer = null
      }
      logger.info('navigation demo completed; animation timer stopped')
    }
  }

  function startScenario() {
    if (timer) {
      dxstd.clearInterval(timer)
      timer = null
    }
    audioService.stopPrompt()
    startedAt = Date.now()
    lastDirection = ''
    lastInstructionIcon = ''
    playedPromptCount = 0
    scenarioCompleted = false
    progressFill.width(4)
    timer = dxstd.setInterval(updateNavigation, TICK_MS, true)
    logger.info('navigation demo started')
  }

  function close() {
    if (!opened) {
      return
    }
    if (timer) {
      dxstd.clearInterval(timer)
      timer = null
    }
    audioService.stopPrompt()
    opened = false
    page.hide()
    logger.info('navigation demo closed')
  }

  function open() {
    if (opened) {
      return
    }
    opened = true
    page.show()
    page.moveForeground()
    startScenario()
  }

  function destroy() {
    close()
  }

  backTouch.on(dxui.Utils.EVENT.CLICK, close)
  restartTouch.on(dxui.Utils.EVENT.CLICK, startScenario)
  page.hide()
  return { open, close, destroy }
}
