import dxui from '../dxmodules/dxUi.js'
import dxstd from '../dxmodules/dxStd.js'
import logger from '../dxmodules/dxLogger.js'

const WIDTH = 800
const HEIGHT = 1280
const ASSET_ROOT = '/app/code/resource'

const PHOTOS = [
  { title: '山湖晨光', meta: '自然 · 今天 09:18' },
  { title: '海岸日落', meta: '旅行 · 昨天 18:42' },
  { title: '旧时人像', meta: '人物 · 7月28日' },
  { title: '蒲公英', meta: '花卉 · 7月16日' },
  { title: '城市街景', meta: '城市 · 6月30日' }
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

function addBackButton(id, parent, dark) {
  const touch = dxui.View.build(`${id}Touch`, parent)
  styleContainer(touch, 72, 72, 18, 20, 36, dark ? '#242424' : '#E9EBEF', 100)
  touch.clickable(true)
  const icon = dxui.Image.build(`${id}Icon`, touch)
  icon.source(`${ASSET_ROOT}/music/ui/back.png`)
  icon.setSize(52, 52)
  icon.setPos(10, 10)
  return touch
}

export function createGalleryPage(parent, fonts) {
  let opened = false
  let viewerOpened = false
  let activeIndex = 0
  let hideTimer = null
  const animations = []

  function animateX(target, value) {
    target.x(value)
  }

  function retainAnimation(animation) {
    if (animations.length >= 8) {
      animations.shift()
    }
    animations.push(animation)
  }

  const app = dxui.View.build('galleryApp', parent)
  styleContainer(app, WIDTH, HEIGHT, 0, 0, 0, '#F6F7F9', 100)

  const gridPage = dxui.View.build('galleryGridPage', app)
  styleContainer(gridPage, WIDTH, HEIGHT, 0, 0, 0, '#F6F7F9', 100)

  const header = dxui.View.build('galleryHeader', gridPage)
  styleContainer(header, WIDTH, 112, 0, 0, 0, '#FBFBFC', 100)
  const gridBack = addBackButton('galleryGridBack', header, false)
  const title = dxui.Label.build('galleryTitle', header)
  title.text('图库')
  styleLabel(title, fonts.title, '#17191D', 300, 44, 112, 34, dxui.Utils.TEXT_ALIGN.LEFT)
  const select = dxui.Label.build('gallerySelect', header)
  select.text('选择')
  styleLabel(select, fonts.body, '#246BFD', 100, 40, 666, 36, dxui.Utils.TEXT_ALIGN.CENTER)

  const recentTitle = dxui.Label.build('galleryRecentTitle', gridPage)
  recentTitle.text('最近照片')
  styleLabel(recentTitle, fonts.title, '#17191D', 300, 44, 32, 132, dxui.Utils.TEXT_ALIGN.LEFT)
  const recentMeta = dxui.Label.build('galleryRecentMeta', gridPage)
  recentMeta.text('今天 · 5 张照片')
  styleLabel(recentMeta, fonts.small, '#858B95', 260, 32, 32, 174, dxui.Utils.TEXT_ALIGN.LEFT)

  function openViewer(event) {
    activeIndex = event.ud
    updateViewer()
    viewerPage.x(WIDTH)
    viewerPage.show()
    viewerPage.moveForeground()
    viewerOpened = true
    retainAnimation(dxui.Utils.anime(viewerPage, WIDTH, 0, animateX, 240, 0, 0, 'ease_out'))
    logger.info(`gallery viewer opened: ${activeIndex + 1}`)
  }

  PHOTOS.forEach(function buildPhoto(photo, index) {
    const column = index % 3
    const row = Math.floor(index / 3)
    const tile = dxui.View.build(`galleryTile_${index}`, gridPage)
    styleContainer(tile, 232, 290, 32 + column * 252, 216 + row * 306, 0, '#000000', 0)
    tile.clickable(true)
    tile.on(dxui.Utils.EVENT.CLICK, openViewer, index)

    const frame = dxui.View.build(`galleryFrame_${index}`, tile)
    styleContainer(frame, 232, 232, 0, 0, 22, '#E5E7EB', 100)
    frame.shadow(13, 0, 5, 0, 0x000000, 14)
    frame.clickable(true)
    frame.on(dxui.Utils.EVENT.CLICK, openViewer, index)
    const image = dxui.Image.build(`galleryThumb_${index}`, frame)
    image.source(`${ASSET_ROOT}/gallery/thumbs/0${index + 1}.jpg`)
    image.setSize(232, 232)
    image.setPos(0, 0)
    image.clickable(false)

    const photoTitle = dxui.Label.build(`galleryPhotoTitle_${index}`, tile)
    photoTitle.text(photo.title)
    styleLabel(photoTitle, fonts.body, '#24272C', 232, 36, 0, 244, dxui.Utils.TEXT_ALIGN.LEFT)
  })

  const albumTile = dxui.View.build('galleryAlbumTile', gridPage)
  styleContainer(albumTile, 232, 232, 536, 522, 22, '#E7EEFF', 100)
  albumTile.borderWidth(1)
  albumTile.borderColor('#CAD8FF')
  const albumIcon = dxui.View.build('galleryAlbumIcon', albumTile)
  styleContainer(albumIcon, 68, 68, 82, 42, 20, '#4D7CFE', 100)
  const albumIconText = dxui.Label.build('galleryAlbumIconText', albumIcon)
  albumIconText.text('5')
  styleLabel(albumIconText, fonts.title, '#FFFFFF', 68, 42, 0, 13, dxui.Utils.TEXT_ALIGN.CENTER)
  const albumTitle = dxui.Label.build('galleryAlbumTitle', albumTile)
  albumTitle.text('全部照片')
  styleLabel(albumTitle, fonts.body, '#27304A', 200, 36, 16, 128, dxui.Utils.TEXT_ALIGN.CENTER)
  const albumMeta = dxui.Label.build('galleryAlbumMeta', albumTile)
  albumMeta.text('相机胶卷')
  styleLabel(albumMeta, fonts.small, '#7A849D', 200, 32, 16, 168, dxui.Utils.TEXT_ALIGN.CENTER)

  const memories = dxui.View.build('galleryMemories', gridPage)
  styleContainer(memories, 736, 188, 32, 848, 28, '#FFFFFF', 100)
  memories.shadow(14, 0, 5, 0, 0x000000, 9)
  const memoryAccent = dxui.View.build('galleryMemoryAccent', memories)
  styleContainer(memoryAccent, 8, 116, 24, 36, 4, '#4D7CFE', 100)
  const memoryTitle = dxui.Label.build('galleryMemoryTitle', memories)
  memoryTitle.text('照片回忆')
  styleLabel(memoryTitle, fonts.title, '#202329', 300, 44, 56, 35, dxui.Utils.TEXT_ALIGN.LEFT)
  const memoryText = dxui.Label.build('galleryMemoryText', memories)
  memoryText.text('风景、人物与城市，一起记录生活片段')
  styleLabel(memoryText, fonts.body, '#757C87', 620, 38, 56, 87, dxui.Utils.TEXT_ALIGN.LEFT)
  const memoryChip = dxui.View.build('galleryMemoryChip', memories)
  styleContainer(memoryChip, 132, 44, 56, 128, 22, '#EEF3FF', 100)
  const memoryChipText = dxui.Label.build('galleryMemoryChipText', memoryChip)
  memoryChipText.text('本月精选')
  styleLabel(memoryChipText, fonts.small, '#3E6FE7', 132, 30, 0, 7, dxui.Utils.TEXT_ALIGN.CENTER)

  const gridGesture = dxui.View.build('galleryGridGesture', gridPage)
  styleContainer(gridGesture, 142, 6, 329, 1251, 3, '#24272C', 76)

  const viewerPage = dxui.View.build('galleryViewerPage', app)
  styleContainer(viewerPage, WIDTH, HEIGHT, WIDTH, 0, 0, '#000000', 100)

  const viewerImage = dxui.Image.build('galleryViewerImage', viewerPage)
  viewerImage.source(`${ASSET_ROOT}/gallery/full/01.jpg`)
  viewerImage.setSize(800, 1040)
  viewerImage.setPos(0, 110)

  const viewerTop = dxui.View.build('galleryViewerTop', viewerPage)
  styleContainer(viewerTop, WIDTH, 110, 0, 0, 0, '#000000', 92)
  const viewerBack = addBackButton('galleryViewerBack', viewerTop, true)
  const viewerTitle = dxui.Label.build('galleryViewerTitle', viewerTop)
  viewerTitle.text('山湖晨光')
  styleLabel(viewerTitle, fonts.body, '#FFFFFF', 390, 38, 112, 25, dxui.Utils.TEXT_ALIGN.LEFT)
  const viewerCounter = dxui.Label.build('galleryViewerCounter', viewerTop)
  viewerCounter.text('1 / 5')
  styleLabel(viewerCounter, fonts.small, '#C3C7CF', 120, 34, 648, 28, dxui.Utils.TEXT_ALIGN.RIGHT)

  const viewerBottom = dxui.View.build('galleryViewerBottom', viewerPage)
  styleContainer(viewerBottom, WIDTH, 130, 0, 1150, 0, '#000000', 94)
  const viewerMeta = dxui.Label.build('galleryViewerMeta', viewerBottom)
  viewerMeta.text('自然 · 今天 09:18')
  styleLabel(viewerMeta, fonts.body, '#E1E3E7', 600, 38, 100, 20, dxui.Utils.TEXT_ALIGN.CENTER)
  const viewerHint = dxui.Label.build('galleryViewerHint', viewerBottom)
  viewerHint.text('点击图片左右两侧切换')
  styleLabel(viewerHint, fonts.small, '#7C818A', 600, 32, 100, 60, dxui.Utils.TEXT_ALIGN.CENTER)
  const viewerGesture = dxui.View.build('galleryViewerGesture', viewerBottom)
  styleContainer(viewerGesture, 142, 6, 329, 101, 3, '#FFFFFF', 75)

  const leftZone = dxui.View.build('galleryViewerLeftZone', viewerPage)
  styleContainer(leftZone, 260, 850, 0, 180, 0, '#000000', 0)
  leftZone.clickable(true)
  const leftHint = dxui.View.build('galleryLeftHint', leftZone)
  styleContainer(leftHint, 64, 64, 24, 393, 32, '#111111', 48)
  const leftArrow = dxui.Image.build('galleryLeftArrow', leftHint)
  leftArrow.source(`${ASSET_ROOT}/music/ui/back.png`)
  leftArrow.setSize(52, 52)
  leftArrow.setPos(6, 6)

  const rightZone = dxui.View.build('galleryViewerRightZone', viewerPage)
  styleContainer(rightZone, 260, 850, 540, 180, 0, '#000000', 0)
  rightZone.clickable(true)
  const rightHint = dxui.View.build('galleryRightHint', rightZone)
  styleContainer(rightHint, 64, 64, 172, 393, 32, '#111111', 48)
  const rightArrow = dxui.Image.build('galleryRightArrow', rightHint)
  rightArrow.source(`${ASSET_ROOT}/settings/ui/chevron.png`)
  rightArrow.setSize(24, 24)
  rightArrow.setPos(20, 20)

  function updateViewer() {
    const photo = PHOTOS[activeIndex]
    viewerImage.source(`${ASSET_ROOT}/gallery/full/0${activeIndex + 1}.jpg`)
    viewerTitle.text(photo.title)
    viewerCounter.text(`${activeIndex + 1} / ${PHOTOS.length}`)
    viewerMeta.text(photo.meta)
  }

  function showPrevious() {
    activeIndex = (activeIndex + PHOTOS.length - 1) % PHOTOS.length
    updateViewer()
    logger.info(`gallery photo changed: ${activeIndex + 1}`)
  }

  function showNext() {
    activeIndex = (activeIndex + 1) % PHOTOS.length
    updateViewer()
    logger.info(`gallery photo changed: ${activeIndex + 1}`)
  }

  function closeViewer() {
    if (!viewerOpened) {
      return
    }
    retainAnimation(dxui.Utils.anime(viewerPage, 0, WIDTH, animateX, 220, 0, 0, 'ease_out'))
    hideTimer = dxstd.setTimeout(function hideViewer() {
      viewerPage.hide()
      viewerOpened = false
      hideTimer = null
    }, 230)
  }

  function close() {
    if (!opened) {
      return
    }
    if (hideTimer) {
      dxstd.clearTimeout(hideTimer)
      hideTimer = null
    }
    viewerPage.hide()
    viewerOpened = false
    retainAnimation(dxui.Utils.anime(app, 0, WIDTH, animateX, 220, 0, 0, 'ease_out'))
    hideTimer = dxstd.setTimeout(function hideGallery() {
      app.hide()
      opened = false
      hideTimer = null
    }, 230)
    logger.info('gallery app closed')
  }

  function open() {
    if (opened) {
      return
    }
    if (hideTimer) {
      dxstd.clearTimeout(hideTimer)
      hideTimer = null
    }
    opened = true
    viewerOpened = false
    viewerPage.hide()
    gridPage.show()
    app.x(WIDTH)
    app.show()
    app.moveForeground()
    retainAnimation(dxui.Utils.anime(app, WIDTH, 0, animateX, 260, 0, 0, 'ease_out'))
    logger.info('gallery app opened')
  }

  function destroy() {
    if (hideTimer) {
      dxstd.clearTimeout(hideTimer)
      hideTimer = null
    }
    animations.length = 0
    opened = false
    viewerOpened = false
    app.hide()
  }

  gridBack.on(dxui.Utils.EVENT.CLICK, close)
  viewerBack.on(dxui.Utils.EVENT.CLICK, closeViewer)
  leftZone.on(dxui.Utils.EVENT.CLICK, showPrevious)
  rightZone.on(dxui.Utils.EVENT.CLICK, showNext)

  viewerPage.hide()
  app.hide()
  return { open, close, destroy }
}
