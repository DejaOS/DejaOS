import logger from '../dxmodules/dxLogger.js'
import dxstd from '../dxmodules/dxStd.js'
import dxui from '../dxmodules/dxUi.js'
import { createDesktop } from './desktop.js'
import { createAudioService } from './audioService.js'
import { createCameraService } from './cameraService.js'

const uiContext = {}
let uiTimer = null
let clockTimer = null
let desktop = null
const audioService = createAudioService()
const cameraService = createCameraService()

function handleUi() {
  dxui.handler()
}

function updateClock() {
  if (desktop) {
    desktop.updateClock()
  }
}

function shutdown() {
  if (clockTimer) {
    dxstd.clearInterval(clockTimer)
    clockTimer = null
  }
  if (uiTimer) {
    dxstd.clearInterval(uiTimer)
    uiTimer = null
  }
  if (desktop) {
    desktop.destroy()
    desktop = null
  }
  audioService.destroy()
  cameraService.destroy()
}

try {
  dxui.init({}, uiContext)
  audioService.init()
  desktop = createDesktop(audioService, cameraService)
  uiTimer = dxstd.setInterval(handleUi, 5)
  clockTimer = dxstd.setInterval(updateClock, 30000)
  logger.info('dejaos desktop demo ready')
} catch (error) {
  shutdown()
  logger.error('dejaos desktop demo startup failed', error)
  throw error
}
