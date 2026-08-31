import dxui from '../dxmodules/dxUi.js'
import dxstd from '../dxmodules/dxStd.js'
import logger from '../dxmodules/dxLogger.js'

const WIDTH = 800
const HEIGHT = 1280

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

function formatDuration(milliseconds) {
  const seconds = Math.floor(milliseconds / 1000)
  const minutes = String(Math.floor(seconds / 60)).padStart(2, '0')
  const remain = String(seconds % 60).padStart(2, '0')
  return `${minutes}:${remain}`
}

export function createVideoPage(parent, fonts, cameraService, onLeave) {
  let opened = false
  let startedAt = 0
  let clockTimer = null

  const page = dxui.View.build('videoPage', parent)
  styleContainer(page, WIDTH, HEIGHT, 0, 0, 0, '#000000', 0)

  const topBar = dxui.View.build('videoTopBar', page)
  styleContainer(topBar, WIDTH, 116, 0, 0, 0, '#06111D', 72)

  const backTouch = dxui.View.build('videoBackTouch', topBar)
  styleContainer(backTouch, 76, 76, 20, 20, 38, '#071521', 76)
  backTouch.borderWidth(1)
  backTouch.borderColor('#91BAD0')
  backTouch.clickable(true)
  const backIcon = dxui.Image.build('videoBackIcon', backTouch)
  backIcon.source('/app/code/resource/music/ui/back.png')
  backIcon.setSize(54, 54)
  backIcon.setPos(11, 11)

  const title = dxui.Label.build('videoTitle', topBar)
  title.text('实时视频')
  styleLabel(title, fonts.title, '#FFFFFF', 280, 42, 118, 35, dxui.Utils.TEXT_ALIGN.LEFT)

  const liveChip = dxui.View.build('videoLiveChip', topBar)
  styleContainer(liveChip, 146, 50, 624, 31, 25, '#641527', 92)
  liveChip.borderWidth(1)
  liveChip.borderColor('#FF7891')
  const liveDot = dxui.View.build('videoLiveDot', liveChip)
  styleContainer(liveDot, 12, 12, 18, 19, 6, '#FF4969', 100)
  const liveText = dxui.Label.build('videoLiveText', liveChip)
  liveText.text('LIVE  00:00')
  styleLabel(liveText, fonts.small, '#FFE9EE', 104, 28, 35, 11, dxui.Utils.TEXT_ALIGN.LEFT)

  const guide = dxui.View.build('videoCompositionFrame', page)
  styleContainer(guide, 560, 360, 120, 300, 24, '#000000', 0)
  guide.borderWidth(2)
  guide.borderColor('#E5F5FF')

  const guideText = dxui.Label.build('videoGuideText', page)
  guideText.text('实时画面预览')
  styleLabel(guideText, fonts.body, '#E8FAFF', 520, 40, 140, 856, dxui.Utils.TEXT_ALIGN.CENTER)

  const statusChip = dxui.View.build('videoStatusChip', page)
  styleContainer(statusChip, 286, 54, 257, 914, 27, '#071521', 76)
  statusChip.borderWidth(1)
  statusChip.borderColor('#48DFAD')
  const statusDot = dxui.View.build('videoStatusDot', statusChip)
  styleContainer(statusDot, 12, 12, 20, 21, 6, '#48E3AD', 100)
  const statusText = dxui.Label.build('videoStatusText', statusChip)
  statusText.text('摄像头已连接')
  styleLabel(statusText, fonts.small, '#D9FFF2', 230, 30, 42, 12, dxui.Utils.TEXT_ALIGN.LEFT)

  const bottomPanel = dxui.View.build('videoBottomPanel', page)
  styleContainer(bottomPanel, 740, 218, 30, 1018, 42, '#06111D', 82)
  bottomPanel.borderWidth(1)
  bottomPanel.borderColor('#5A8DAA')

  const cameraButton = dxui.View.build('videoCameraButton', bottomPanel)
  styleContainer(cameraButton, 96, 96, 322, 32, 48, '#FFFFFF', 96)
  cameraButton.borderWidth(7)
  cameraButton.borderColor('#94DFFF')
  const cameraCore = dxui.View.build('videoCameraCore', cameraButton)
  styleContainer(cameraCore, 62, 62, 10, 10, 31, '#168CFF', 100)

  const leftMode = dxui.Label.build('videoLeftMode', bottomPanel)
  leftMode.text('自动')
  styleLabel(leftMode, fonts.body, '#FFFFFF', 140, 40, 76, 59, dxui.Utils.TEXT_ALIGN.CENTER)
  const rightMode = dxui.Label.build('videoRightMode', bottomPanel)
  rightMode.text('高清')
  styleLabel(rightMode, fonts.body, '#FFFFFF', 180, 40, 484, 59, dxui.Utils.TEXT_ALIGN.CENTER)
  const privacy = dxui.Label.build('videoPrivacy', bottomPanel)
  privacy.text('本地实时画面 · 不保存视频')
  styleLabel(privacy, fonts.small, '#91AFC3', 620, 30, 60, 164, dxui.Utils.TEXT_ALIGN.CENTER)

  const gestureBar = dxui.View.build('videoGestureBar', page)
  styleContainer(gestureBar, 142, 6, 329, 1251, 3, '#FFFFFF', 82)

  function updateClock() {
    if (opened) {
      liveText.text(`LIVE  ${formatDuration(Date.now() - startedAt)}`)
    }
  }

  function close() {
    if (!opened) {
      return
    }
    if (clockTimer) {
      dxstd.clearInterval(clockTimer)
      clockTimer = null
    }
    cameraService.pause()
    opened = false
    page.hide()
    onLeave()
    logger.info('live video page closed')
  }

  function open() {
    if (opened) {
      return
    }
    opened = true
    startedAt = Date.now()
    liveText.text('LIVE  00:00')
    statusText.text('正在连接摄像头')
    page.show()
    page.moveForeground()
    try {
      cameraService.start()
      statusText.text('摄像头已连接')
      clockTimer = dxstd.setInterval(updateClock, 1000, true)
      logger.info('live video page opened')
    } catch (error) {
      statusText.text('摄像头启动失败')
      logger.error('live video page open failed', error)
    }
  }

  function destroy() {
    if (clockTimer) {
      dxstd.clearInterval(clockTimer)
      clockTimer = null
    }
    opened = false
    page.hide()
  }

  backTouch.on(dxui.Utils.EVENT.CLICK, close)
  dxui.Utils.anime(liveDot, 35, 100, function pulseLiveDot(target, value) {
    target.bgOpa(value)
  }, 680, 680, 65535, 'ease_in_out')
  page.hide()

  return { open, close, destroy }
}
