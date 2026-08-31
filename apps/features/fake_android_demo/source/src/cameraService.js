import dxCapturer from '../dxmodules/dxCapturer.js'
import dxIvcore from '../dxmodules/dxIvcore.js'
import dxDisplay from '../dxmodules/dxDisplay.js'
import dxFacial from '../dxmodules/dxFacial.js'
import logger from '../dxmodules/dxLogger.js'

export function createCameraService() {
  let capturerReady = false
  let ivcoreReady = false
  let displayReady = false
  let facialReady = false
  let running = false

  function init() {
    if (facialReady) {
      return
    }
    try {
      dxCapturer.init()
      capturerReady = true
      dxIvcore.init()
      ivcoreReady = true
      dxDisplay.init()
      displayReady = true
      dxFacial.init()
      facialReady = true
      logger.info('camera preview pipeline initialized')
    } catch (error) {
      destroy()
      logger.error('camera preview pipeline initialization failed', error)
      throw error
    }
  }

  function start() {
    if (!facialReady) {
      init()
    }
    if (!running) {
      dxFacial.setStatus(true)
      running = true
      logger.info('camera preview started')
    }
  }

  function pause() {
    if (facialReady && running) {
      dxFacial.setStatus(false)
      running = false
      logger.info('camera preview paused')
    }
  }

  function destroy() {
    if (facialReady) {
      try {
        dxFacial.setStatus(false)
      } catch (error) {
        logger.error('camera facial stop failed', error)
      }
      try {
        dxFacial.deinit()
      } catch (error) {
        logger.error('camera facial deinit failed', error)
      }
      facialReady = false
    }
    running = false
    if (displayReady) {
      try {
        dxDisplay.deinit()
      } catch (error) {
        logger.error('camera display deinit failed', error)
      }
      displayReady = false
    }
    if (ivcoreReady) {
      try {
        dxIvcore.deinit()
      } catch (error) {
        logger.error('camera ivcore deinit failed', error)
      }
      ivcoreReady = false
    }
    if (capturerReady) {
      try {
        dxCapturer.deinit()
      } catch (error) {
        logger.error('camera capturer deinit failed', error)
      }
      capturerReady = false
    }
    logger.info('camera preview pipeline destroyed')
  }

  function isRunning() {
    return running
  }

  return { start, pause, destroy, isRunning }
}
