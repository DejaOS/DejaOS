import dxAudio from '../dxmodules/dxAudio.js'
import logger from '../dxmodules/dxLogger.js'

const TRACK_PATH = '/app/code/resource/music/auld-lang-syne.wav'
const TRACK_DURATION_MS = 185000

export function createAudioService() {
  let initialized = false
  let playing = false
  let startedAt = 0

  function init() {
    if (initialized) {
      return
    }
    dxAudio.init()
    dxAudio.setVolume(7)
    initialized = true
    logger.info('audio service initialized')
  }

  function play() {
    if (playing) {
      logger.info('music playback already active')
      return
    }
    if (!initialized) {
      init()
    }
    dxAudio.stop()
    dxAudio.playWav(TRACK_PATH)
    startedAt = Date.now()
    playing = true
    logger.info('music playback started')
  }

  function playPrompt(path) {
    if (typeof path !== 'string' || path.length === 0) {
      throw new Error('navigation prompt path is required')
    }
    if (!initialized) {
      init()
    } else {
      dxAudio.stop()
    }
    playing = false
    startedAt = 0
    dxAudio.playWav(path)
    logger.info(`navigation prompt started: ${path}`)
  }

  function stopPrompt() {
    if (initialized) {
      dxAudio.stop()
    }
    playing = false
    startedAt = 0
    logger.info('navigation prompt stopped')
  }

  function stop() {
    if (!initialized) {
      playing = false
      startedAt = 0
      return
    }
    dxAudio.stop()
    dxAudio.deinit()
    initialized = false
    playing = false
    startedAt = 0
    logger.info('music playback hard-stopped')
  }

  function positionMs() {
    if (!playing) {
      return 0
    }
    const elapsed = Math.max(0, Date.now() - startedAt)
    if (elapsed >= TRACK_DURATION_MS) {
      stop()
      return 0
    }
    return elapsed
  }

  function isPlaying() {
    return playing
  }

  function durationMs() {
    return TRACK_DURATION_MS
  }

  function destroy() {
    if (initialized) {
      dxAudio.stop()
      dxAudio.deinit()
    }
    playing = false
    startedAt = 0
    initialized = false
    logger.info('audio service destroyed')
  }

  return { init, play, playPrompt, stopPrompt, stop, positionMs, isPlaying, durationMs, destroy }
}
