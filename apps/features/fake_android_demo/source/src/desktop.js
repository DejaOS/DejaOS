import dxui from '../dxmodules/dxUi.js'
import dxstd from '../dxmodules/dxStd.js'
import { createMusicPlayer } from './musicPlayer.js'
import { createMapPage } from './mapPage.js'
import { createVideoPage } from './videoPage.js'
import { createChatApp } from './chatApp.js'
import { createSettingsPage } from './settingsPage.js'
import { createGalleryPage } from './galleryPage.js'

const WIDTH = 800
const HEIGHT = 1280
const FONT_PATH = '/app/code/resource/font/font.ttf'
const ASSET_ROOT = '/app/code/resource'

const APP_GRID = [
  { id: 'music', label: '云音乐' },
  { id: 'chat', label: '即时通讯' },
  { id: 'maps', label: '智慧地图' },
  { id: 'settings', label: '设置' },
  { id: 'gallery', label: '图库' },
  { id: 'video', label: '视频' },
  { id: 'browser', label: '浏览器' },
  { id: 'weather', label: '天气' },
  { id: 'calendar', label: '日历' },
  { id: 'files', label: '文件' },
  { id: 'store', label: '应用商店' },
  { id: 'clock', label: '时钟' },
  { id: 'health', label: '健康' },
  { id: 'home', label: '智慧家庭' },
  { id: 'calculator', label: '计算器' },
  { id: 'security', label: '安全中心' }
]

const DOCK_APPS = [
  { id: 'phone', label: '电话' },
  { id: 'chat', label: '即时通讯' },
  { id: 'camera', label: '相机' },
  { id: 'world', label: '浏览器' }
]

const DAYS = ['星期日', '星期一', '星期二', '星期三', '星期四', '星期五', '星期六']

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

export function createDesktop(audioService, cameraService) {
  const animations = []
  const scheduledTimers = []
  const appTiles = []
  let musicPlayer = null
  let mapPage = null
  let videoPage = null
  let chatApp = null
  let settingsPage = null
  let galleryPage = null

  function animateX(target, value) {
    target.x(value)
  }

  function animateY(target, value) {
    target.y(value)
  }

  function animateBgOpacity(target, value) {
    target.bgOpa(value)
  }

  function animatePageDot(target, value) {
    target.width(value)
    target.x(Math.round((WIDTH - value) / 2))
  }

  function schedule(delay, callback) {
    const timer = dxstd.setTimeout(callback, delay)
    scheduledTimers.push(timer)
  }

  const fonts = {
    small: dxui.Font.build(FONT_PATH, 19, dxui.Utils.FONT_STYLE.NORMAL),
    body: dxui.Font.build(FONT_PATH, 22, dxui.Utils.FONT_STYLE.NORMAL),
    title: dxui.Font.build(FONT_PATH, 28, dxui.Utils.FONT_STYLE.NORMAL),
    weather: dxui.Font.build(FONT_PATH, 42, dxui.Utils.FONT_STYLE.NORMAL),
    clock: dxui.Font.build(FONT_PATH, 78, dxui.Utils.FONT_STYLE.NORMAL)
  }

  const root = dxui.View.build('desktopRoot', dxui.Utils.LAYER.MAIN)
  styleContainer(root, WIDTH, HEIGHT, 0, 0, 0, '#000000', 0)

  const home = dxui.View.build('desktopHome', root)
  styleContainer(home, WIDTH, HEIGHT, 0, 0, 0, '#061225', 100)

  const wallpaper = dxui.Image.build('wallpaper', home)
  wallpaper.source(`${ASSET_ROOT}/wallpaper/aurora.png`)
  wallpaper.setSize(WIDTH, HEIGHT)
  wallpaper.setPos(0, 0)
  wallpaper.moveBackground()

  const topShade = dxui.View.build('topShade', home)
  styleContainer(topShade, WIDTH, 350, 0, 0, 0, '#020817', 18)

  const statusTime = dxui.Label.build('statusTime', home)
  statusTime.text('09:41')
  styleLabel(statusTime, fonts.small, '#FFFFFF', 120, 32, 32, 15, dxui.Utils.TEXT_ALIGN.LEFT)

  const network = dxui.Label.build('network', home)
  network.text('Wi-Fi  ·  100%')
  styleLabel(network, fonts.small, '#FFFFFF', 190, 32, 574, 15, dxui.Utils.TEXT_ALIGN.RIGHT)

  const time = dxui.Label.build('heroTime', home)
  time.text('09:41')
  styleLabel(time, fonts.clock, '#FFFFFF', 390, 94, 38, 65, dxui.Utils.TEXT_ALIGN.LEFT)

  const date = dxui.Label.build('heroDate', home)
  date.text('8月26日  星期三')
  styleLabel(date, fonts.title, '#D9EAFF', 390, 42, 43, 161, dxui.Utils.TEXT_ALIGN.LEFT)

  const weatherCard = dxui.View.build('weatherCard', home)
  styleContainer(weatherCard, 202, 158, 556, 76, 34, '#07111F', 48)
  weatherCard.borderWidth(1)
  weatherCard.borderColor('#8CC8FF')
  weatherCard.shadow(20, 0, 8, 0, 0x000000, 28)

  const weatherIcon = dxui.Image.build('weatherIcon', weatherCard)
  weatherIcon.source(`${ASSET_ROOT}/icons/weather-small.png`)
  weatherIcon.setSize(64, 64)
  weatherIcon.setPos(18, 19)

  const temperature = dxui.Label.build('temperature', weatherCard)
  temperature.text('26°')
  styleLabel(temperature, fonts.weather, '#FFFFFF', 92, 58, 93, 20, dxui.Utils.TEXT_ALIGN.RIGHT)

  const weatherDesc = dxui.Label.build('weatherDesc', weatherCard)
  weatherDesc.text('上海  晴朗')
  styleLabel(weatherDesc, fonts.body, '#D8EAFE', 164, 34, 19, 91, dxui.Utils.TEXT_ALIGN.LEFT)

  const weatherMeta = dxui.Label.build('weatherMeta', weatherCard)
  weatherMeta.text('演示数据 · 空气优')
  styleLabel(weatherMeta, fonts.small, '#91AFCC', 164, 28, 19, 122, dxui.Utils.TEXT_ALIGN.LEFT)

  const search = dxui.View.build('searchBar', home)
  styleContainer(search, 716, 62, 42, 282, 31, '#07111F', 48)
  search.borderWidth(1)
  search.borderColor('#6FA9E5')
  const searchDot = dxui.View.build('searchDot', search)
  styleContainer(searchDot, 14, 14, 24, 24, 7, '#62D8FF', 100)
  const searchText = dxui.Label.build('searchText', search)
  searchText.text('搜索设备应用')
  styleLabel(searchText, fonts.body, '#BFD4EA', 630, 32, 56, 17, dxui.Utils.TEXT_ALIGN.LEFT)

  const toast = dxui.View.build('appToast', home)
  styleContainer(toast, 520, 72, 140, 354, 26, '#07111F', 90)
  toast.borderWidth(1)
  toast.borderColor('#69B4FF')
  toast.shadow(24, 0, 9, 0, 0x000000, 34)
  const toastText = dxui.Label.build('appToastText', toast)
  toastText.text(' ')
  styleLabel(toastText, fonts.body, '#FFFFFF', 480, 34, 20, 19, dxui.Utils.TEXT_ALIGN.CENTER)
  toast.hide()
  toast.moveForeground()

  let toastTimer = null
  function hideToast() {
    toast.hide()
    toastTimer = null
  }
  function handleAppClick(event) {
    if (toastTimer) {
      dxstd.clearTimeout(toastTimer)
    }
    const app = event.ud
    const currentY = event.target.y()
    animations.push(dxui.Utils.anime(event.target, currentY, currentY - 8, animateY, 110, 110, 0, 'ease_out'))
    if (app.id === 'music') {
      musicPlayer.open()
      return
    }
    if (app.id === 'maps') {
      mapPage.open()
      return
    }
    if (app.id === 'chat') {
      chatApp.open()
      return
    }
    if (app.id === 'video') {
      home.hide()
      videoPage.open()
      return
    }
    if (app.id === 'settings') {
      settingsPage.open()
      return
    }
    if (app.id === 'gallery') {
      galleryPage.open()
      return
    }
    toastText.text(`${app.label} · 即将推出`)
    toast.y(374)
    toast.show()
    toast.moveForeground()
    animations.push(dxui.Utils.anime(toast, 374, 354, animateY, 190, 0, 0, 'ease_out'))
    toastTimer = dxstd.setTimeout(hideToast, 1250)
  }

  function buildAppIcon(app, index) {
    const column = index % 4
    const row = Math.floor(index / 4)
    const tile = dxui.View.build(`app_${app.id}_${index}`, home)
    const finalY = 365 + row * 168
    styleContainer(tile, 170, 156, 30 + column * 190, finalY + 42, 0, '#000000', 0)
    tile.clickable(true)
    tile.on(dxui.Utils.EVENT.CLICK, handleAppClick, app)

    const icon = dxui.Image.build(`appIcon_${app.id}_${index}`, tile)
    icon.source(`${ASSET_ROOT}/icons/${app.id}.png`)
    icon.setSize(112, 112)
    icon.setPos(29, 0)

    const label = dxui.Label.build(`appLabel_${app.id}_${index}`, tile)
    label.text(app.label)
    styleLabel(label, fonts.body, '#FFFFFF', 170, 36, 0, 116, dxui.Utils.TEXT_ALIGN.CENTER)
    appTiles.push({ tile, finalY, index })
  }

  APP_GRID.forEach(buildAppIcon)

  const pageDot = dxui.View.build('pageDot', home)
  styleContainer(pageDot, 34, 8, 383, 1032, 4, '#FFFFFF', 86)

  const dock = dxui.View.build('dock', home)
  styleContainer(dock, 716, 142, 42, 1064, 40, '#06101E', 57)
  dock.borderWidth(1)
  dock.borderColor('#72B8FF')
  dock.shadow(25, 0, 10, 0, 0x000000, 32)

  function buildDockIcon(app, index) {
    const touch = dxui.View.build(`dock_${app.id}_${index}`, dock)
    styleContainer(touch, 144, 122, 31 + index * 170, 10, 0, '#000000', 0)
    touch.clickable(true)
    touch.on(dxui.Utils.EVENT.CLICK, handleAppClick, app)

    const icon = dxui.Image.build(`dockIcon_${app.id}_${index}`, touch)
    icon.source(`${ASSET_ROOT}/icons/${app.id}.png`)
    icon.setSize(112, 112)
    icon.setPos(16, 5)
  }

  DOCK_APPS.forEach(buildDockIcon)

  const gestureBar = dxui.View.build('gestureBar', home)
  styleContainer(gestureBar, 142, 6, 329, 1249, 3, '#FFFFFF', 86)

  musicPlayer = createMusicPlayer(root, fonts, audioService)
  mapPage = createMapPage(root, fonts, audioService)
  videoPage = createVideoPage(root, fonts, cameraService, function showDesktopHome() {
    home.show()
    home.moveForeground()
  })
  chatApp = createChatApp(root, fonts)
  settingsPage = createSettingsPage(root, fonts)
  galleryPage = createGalleryPage(root, fonts)

  function updateClock() {
    const now = new Date()
    const hours = String(now.getHours()).padStart(2, '0')
    const minutes = String(now.getMinutes()).padStart(2, '0')
    const value = `${hours}:${minutes}`
    statusTime.text(value)
    time.text(value)
    date.text(`${now.getMonth() + 1}月${now.getDate()}日  ${DAYS[now.getDay()]}`)
  }

  function destroy() {
    if (toastTimer) {
      dxstd.clearTimeout(toastTimer)
      toastTimer = null
    }
    scheduledTimers.forEach(function clearScheduledTimer(timer) {
      dxstd.clearTimeout(timer)
    })
    scheduledTimers.length = 0
    animations.length = 0
    if (musicPlayer) {
      musicPlayer.destroy()
    }
    if (mapPage) {
      mapPage.destroy()
    }
    if (videoPage) {
      videoPage.destroy()
    }
    if (chatApp) {
      chatApp.destroy()
    }
    if (settingsPage) {
      settingsPage.destroy()
    }
    if (galleryPage) {
      galleryPage.destroy()
    }
  }

  dxui.loadMain(root)
  updateClock()

  time.x(-70)
  date.x(-55)
  search.x(WIDTH + 30)
  dock.y(1215)
  searchDot.bgOpa(45)
  pageDot.width(24)
  pageDot.x(388)

  animations.push(dxui.Utils.anime(time, -70, 38, animateX, 620, 0, 0, 'ease_out'))
  animations.push(dxui.Utils.anime(date, -55, 43, animateX, 700, 0, 0, 'ease_out'))
  animations.push(dxui.Utils.anime(search, WIDTH + 30, 42, animateX, 720, 0, 0, 'ease_out'))
  animations.push(dxui.Utils.anime(dock, 1215, 1064, animateY, 760, 0, 0, 'ease_out'))

  appTiles.forEach(function scheduleTileEntrance(item) {
    schedule(180 + item.index * 52, function startTileEntrance() {
      animations.push(dxui.Utils.anime(item.tile, item.finalY + 42, item.finalY, animateY, 560, 0, 0, 'ease_out'))
    })
  })

  schedule(900, function startAmbientAnimations() {
    animations.push(dxui.Utils.anime(weatherCard, 76, 68, animateY, 1700, 1700, 65535, 'ease_in_out'))
    animations.push(dxui.Utils.anime(searchDot, 45, 100, animateBgOpacity, 900, 900, 65535, 'ease_in_out'))
    animations.push(dxui.Utils.anime(pageDot, 24, 38, animatePageDot, 1200, 1200, 65535, 'ease_in_out'))
  })

  return { updateClock, destroy }
}
