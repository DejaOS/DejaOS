import dxui from '../dxmodules/dxUi.js'
import dxstd from '../dxmodules/dxStd.js'
import logger from '../dxmodules/dxLogger.js'

const WIDTH = 800
const HEIGHT = 1280
const ASSET_ROOT = '/app/code/resource/music'
const LRC_PATH = '/app/code/resource/music/auld-lang-syne.lrc'
const FRAME_COUNT = 16
const TONEARM_FRAME_COUNT = 9
const PLAYER_TICK_MS = 120

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

function parseLyrics() {
  const content = dxstd.loadFileSync(LRC_PATH)
  const lines = []
  const pattern = /^\[(\d+):(\d+(?:\.\d+)?)\](.*)$/
  content.split('\n').forEach(function parseLine(rawLine) {
    const match = rawLine.trim().match(pattern)
    if (!match) {
      return
    }
    const minutes = Number(match[1])
    const seconds = Number(match[2])
    const text = match[3].trim()
    if (!text) {
      return
    }
    lines.push({ timeMs: Math.round((minutes * 60 + seconds) * 1000), text })
  })
  if (lines.length === 0) {
    throw new Error('music lyrics are empty')
  }
  return lines
}

function formatTime(milliseconds) {
  const seconds = Math.max(0, Math.floor(milliseconds / 1000))
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`
}

function framePath(frame) {
  return `${ASSET_ROOT}/ui/record-${String(frame).padStart(2, '0')}.png`
}

function tonearmFramePath(frame) {
  return `${ASSET_ROOT}/ui/tonearm-${String(frame).padStart(2, '0')}.png`
}

export function createMusicPlayer(parent, fonts, audioService) {
  const lyrics = parseLyrics()
  let timer = null
  let currentLyricIndex = -1
  let currentFrame = -1
  let currentTonearmFrame = 0
  let opened = false

  const page = dxui.View.build('musicPage', parent)
  styleContainer(page, WIDTH, HEIGHT, 0, 0, 0, '#070A12', 100)

  const background = dxui.Image.build('musicBackground', page)
  background.source(`${ASSET_ROOT}/ui/music-bg.png`)
  background.setSize(WIDTH, HEIGHT)
  background.setPos(0, 0)
  background.moveBackground()

  const backTouch = dxui.View.build('musicBackTouch', page)
  styleContainer(backTouch, 76, 76, 22, 17, 38, '#0A1220', 20)
  backTouch.clickable(true)
  const backIcon = dxui.Image.build('musicBackIcon', backTouch)
  backIcon.source(`${ASSET_ROOT}/ui/back.png`)
  backIcon.setSize(54, 54)
  backIcon.setPos(11, 11)

  const header = dxui.Label.build('musicHeader', page)
  header.text('正在播放')
  styleLabel(header, fonts.title, '#FFFFFF', 360, 42, 220, 34, dxui.Utils.TEXT_ALIGN.CENTER)

  const moreTouch = dxui.View.build('musicMoreTouch', page)
  styleContainer(moreTouch, 76, 76, 702, 17, 38, '#0A1220', 20)
  const moreIcon = dxui.Image.build('musicMoreIcon', moreTouch)
  moreIcon.source(`${ASSET_ROOT}/ui/more.png`)
  moreIcon.setSize(54, 54)
  moreIcon.setPos(11, 11)

  const recordGlow = dxui.View.build('recordGlow', page)
  styleContainer(recordGlow, 382, 382, 209, 104, 191, '#396BFF', 18)
  recordGlow.shadow(32, 0, 10, 0, 0x315CFF, 38)

  const record = dxui.Image.build('musicRecord', page)
  record.source(framePath(0))
  record.setSize(360, 360)
  record.setPos(220, 110)

  const tonearm = dxui.Image.build('musicTonearm', page)
  tonearm.source(tonearmFramePath(0))
  tonearm.setSize(420, 360)
  tonearm.setPos(220, 110)

  const trackTitle = dxui.Label.build('musicTrackTitle', page)
  trackTitle.text('Auld Lang Syne')
  styleLabel(trackTitle, fonts.weather, '#FFFFFF', 680, 58, 60, 488, dxui.Utils.TEXT_ALIGN.CENTER)

  const trackArtist = dxui.Label.build('musicTrackArtist', page)
  trackArtist.text('Old Home Singers · 1918')
  styleLabel(trackArtist, fonts.body, '#AFC0D5', 680, 34, 60, 550, dxui.Utils.TEXT_ALIGN.CENTER)

  const status = dxui.Label.build('musicStatus', page)
  status.text('正在播放 · PCM WAV')
  styleLabel(status, fonts.small, '#FF7892', 680, 30, 60, 588, dxui.Utils.TEXT_ALIGN.CENTER)

  const progressTrack = dxui.View.build('musicProgressTrack', page)
  styleContainer(progressTrack, 640, 8, 80, 636, 4, '#8A96AA', 38)
  const progressFill = dxui.View.build('musicProgressFill', page)
  styleContainer(progressFill, 4, 8, 80, 636, 4, '#FF4D6D', 100)

  const currentTime = dxui.Label.build('musicCurrentTime', page)
  currentTime.text('0:00')
  styleLabel(currentTime, fonts.small, '#AFC0D5', 100, 28, 80, 652, dxui.Utils.TEXT_ALIGN.LEFT)
  const totalTime = dxui.Label.build('musicTotalTime', page)
  totalTime.text(formatTime(audioService.durationMs()))
  styleLabel(totalTime, fonts.small, '#AFC0D5', 100, 28, 620, 652, dxui.Utils.TEXT_ALIGN.RIGHT)

  const lyricsCard = dxui.View.build('lyricsCard', page)
  styleContainer(lyricsCard, 700, 316, 50, 692, 34, '#07101C', 62)
  lyricsCard.borderWidth(1)
  lyricsCard.borderColor('#5B6E8A')

  const lyricLabels = []
  const lyricPositions = [24, 80, 136, 192, 248]
  lyricPositions.forEach(function buildLyricLabel(y, index) {
    const label = dxui.Label.build(`lyricLine${index}`, lyricsCard)
    label.text(' ')
    styleLabel(
      label,
      index === 2 ? fonts.title : fonts.body,
      index === 2 ? '#FFFFFF' : '#7F90A8',
      650,
      42,
      25,
      y,
      dxui.Utils.TEXT_ALIGN.CENTER
    )
    label.longMode(index === 2 ? dxui.Utils.LABEL_LONG_MODE.SCROLL_CIRCULAR : dxui.Utils.LABEL_LONG_MODE.CLIP)
    lyricLabels.push(label)
  })

  const controlSpecs = [
    { id: 'shuffle', x: 56, y: 1086, size: 54, action: 'display' },
    { id: 'previous', x: 160, y: 1082, size: 62, action: 'display' },
    { id: 'play', x: 270, y: 1068, size: 88, action: 'play' },
    { id: 'stop', x: 405, y: 1077, size: 70, action: 'stop' },
    { id: 'next', x: 530, y: 1082, size: 62, action: 'display' },
    { id: 'favorite', x: 676, y: 1086, size: 54, action: 'display' }
  ]

  function updateLyrics(positionMs) {
    let nextIndex = 0
    for (let index = 0; index < lyrics.length; index += 1) {
      if (lyrics[index].timeMs <= positionMs) {
        nextIndex = index
      } else {
        break
      }
    }
    if (nextIndex === currentLyricIndex) {
      return
    }
    currentLyricIndex = nextIndex
    lyricLabels.forEach(function updateLyricLabel(label, slot) {
      const line = lyrics[currentLyricIndex + slot - 2]
      label.text(line ? line.text : '')
    })
  }

  function resetVisuals() {
    currentFrame = 0
    currentLyricIndex = -1
    record.source(framePath(0))
    progressFill.width(4)
    currentTime.text('0:00')
    updateLyrics(0)
  }

  function updateTonearm(playing) {
    const targetFrame = playing ? TONEARM_FRAME_COUNT - 1 : 0
    if (currentTonearmFrame < targetFrame) {
      currentTonearmFrame += 1
    } else if (currentTonearmFrame > targetFrame) {
      currentTonearmFrame -= 1
    } else {
      return
    }
    tonearm.source(tonearmFramePath(currentTonearmFrame))
  }

  function tick() {
    if (!opened) {
      return
    }
    const playing = audioService.isPlaying()
    const position = audioService.positionMs()
    status.text(playing ? '正在播放 · PCM WAV' : '已停止 · 点击播放重新开始')
    updateTonearm(playing)
    if (!playing) {
      return
    }

    const frame = Math.floor(position / PLAYER_TICK_MS) % FRAME_COUNT
    if (frame !== currentFrame) {
      currentFrame = frame
      record.source(framePath(frame))
    }

    const width = Math.max(4, Math.round(640 * position / audioService.durationMs()))
    progressFill.width(width)
    currentTime.text(formatTime(position))
    updateLyrics(position)
  }

  function handlePlay() {
    try {
      audioService.play()
      resetVisuals()
      tick()
    } catch (error) {
      logger.error('music play failed', error)
      status.text('播放失败，请查看设备日志')
    }
  }

  function handleStop() {
    try {
      logger.info('music stop button clicked')
      audioService.stop()
      resetVisuals()
      tick()
    } catch (error) {
      logger.error('music stop failed', error)
      status.text('停止失败，请查看设备日志')
    }
  }

  controlSpecs.forEach(function buildControl(spec) {
    const touch = dxui.View.build(`musicControl_${spec.id}`, page)
    const touchPadding = spec.action === 'stop' ? 22 : 10
    styleContainer(
      touch,
      spec.size + touchPadding * 2,
      spec.size + touchPadding * 2,
      spec.x - touchPadding,
      spec.y - touchPadding,
      0,
      '#000000',
      0
    )
    touch.clickable(spec.action !== 'display')
    const image = dxui.Image.build(`musicControlIcon_${spec.id}`, touch)
    image.source(`${ASSET_ROOT}/ui/${spec.id}.png`)
    image.setSize(spec.size, spec.size)
    image.setPos(touchPadding, touchPadding)
    if (spec.action === 'play') {
      touch.on(dxui.Utils.EVENT.CLICK, handlePlay)
    } else if (spec.action === 'stop') {
      touch.on(dxui.Utils.EVENT.CLICK, handleStop)
    }
  })

  const playCaption = dxui.Label.build('musicPlayCaption', page)
  playCaption.text('播放')
  styleLabel(playCaption, fonts.small, '#DDE7F3', 100, 30, 264, 1181, dxui.Utils.TEXT_ALIGN.CENTER)
  const stopCaption = dxui.Label.build('musicStopCaption', page)
  stopCaption.text('停止')
  styleLabel(stopCaption, fonts.small, '#DDE7F3', 100, 30, 390, 1181, dxui.Utils.TEXT_ALIGN.CENTER)

  const gestureBar = dxui.View.build('musicGestureBar', page)
  styleContainer(gestureBar, 142, 6, 329, 1249, 3, '#FFFFFF', 82)

  function close() {
    if (!opened) {
      return
    }
    audioService.stop()
    if (timer) {
      dxstd.clearInterval(timer)
      timer = null
    }
    opened = false
    currentTonearmFrame = 0
    tonearm.source(tonearmFramePath(0))
    page.hide()
  }

  function handleBack() {
    close()
  }
  backTouch.on(dxui.Utils.EVENT.CLICK, handleBack)

  function open() {
    if (opened) {
      return
    }
    opened = true
    currentTonearmFrame = 0
    tonearm.source(tonearmFramePath(0))
    page.show()
    page.moveForeground()
    resetVisuals()
    handlePlay()
    timer = dxstd.setInterval(tick, PLAYER_TICK_MS, true)
  }

  function destroy() {
    close()
  }

  page.hide()
  return { open, close, destroy }
}
