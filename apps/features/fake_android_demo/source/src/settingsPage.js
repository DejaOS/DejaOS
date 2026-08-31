import dxui from '../dxmodules/dxUi.js'
import dxstd from '../dxmodules/dxStd.js'
import logger from '../dxmodules/dxLogger.js'

const WIDTH = 800
const HEIGHT = 1280
const ICON_ROOT = '/app/code/resource/settings/ui'

const SETTINGS_ROWS = [
  { id: 'wifi', title: 'WLAN', status: '已连接 DejaOS-Office', icon: 'wifi', enabled: true, first: ['当前网络', 'DejaOS-Office'], second: ['IP 地址', '192.168.8.105'] },
  { id: 'bluetooth', title: '蓝牙', status: '已关闭', icon: 'bluetooth', enabled: false, first: ['设备名称', 'VF105'], second: ['可发现状态', '未开启'] },
  { id: 'brightness', title: '显示与亮度', status: '亮度 78% · 浅色模式', icon: 'brightness', enabled: true, first: ['亮度级别', '78%'], second: ['屏幕休眠', '5 分钟'] },
  { id: 'volume', title: '声音与振动', status: '媒体音量 65%', icon: 'volume_up', enabled: true, first: ['媒体音量', '65%'], second: ['触摸提示音', '开启'] },
  { id: 'palette', title: '壁纸与样式', status: '极光蓝 · 圆角图标', icon: 'palette', enabled: true, first: ['当前壁纸', '极光蓝'], second: ['主题色', '海洋蓝'] },
  { id: 'apps', title: '应用', status: '16 个应用 · 权限与默认应用', icon: 'apps', enabled: true, first: ['已安装应用', '16 个'], second: ['默认应用', '系统推荐'] },
  { id: 'security', title: '安全与隐私', status: '设备保护状态良好', icon: 'security', enabled: true, first: ['安全状态', '未发现风险'], second: ['隐私面板', '今天无访问'] },
  { id: 'storage', title: '存储空间', status: '已使用 3.8 GB / 16 GB', icon: 'storage', enabled: true, first: ['可用空间', '12.2 GB'], second: ['缓存数据', '286 MB'] },
  { id: 'about', title: '关于设备', status: 'VF105 · DejaOS 4.0', icon: 'info', enabled: true, first: ['设备型号', 'VF105_V12'], second: ['系统版本', 'DejaOS 4.0'] }
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

function addBackButton(id, parent) {
  const touch = dxui.View.build(`${id}Touch`, parent)
  styleContainer(touch, 72, 72, 18, 20, 36, '#E9EBEF', 100)
  touch.clickable(true)
  const icon = dxui.Image.build(`${id}Icon`, touch)
  icon.source('/app/code/resource/music/ui/back.png')
  icon.setSize(52, 52)
  icon.setPos(10, 10)
  return touch
}

export function createSettingsPage(parent, fonts) {
  let opened = false
  let hideTimer = null
  let detailItem = SETTINGS_ROWS[0]
  let toggleOn = true
  const activeAnimations = []

  function animateX(target, value) {
    target.x(value)
  }

  function animatePage(target, start, end, duration) {
    if (activeAnimations.length >= 8) {
      activeAnimations.shift()
    }
    activeAnimations.push(dxui.Utils.anime(target, start, end, animateX, duration, 0, 0, 'ease_out'))
  }

  const app = dxui.View.build('settingsApp', parent)
  styleContainer(app, WIDTH, HEIGHT, 0, 0, 0, '#F4F5F7', 100)

  const mainPage = dxui.View.build('settingsMainPage', app)
  styleContainer(mainPage, WIDTH, HEIGHT, 0, 0, 0, '#F4F5F7', 100)

  const mainHeader = dxui.View.build('settingsMainHeader', mainPage)
  styleContainer(mainHeader, WIDTH, 112, 0, 0, 0, '#F8F9FA', 100)
  const mainBack = addBackButton('settingsMainBack', mainHeader)
  const mainTitle = dxui.Label.build('settingsMainTitle', mainHeader)
  mainTitle.text('设置')
  styleLabel(mainTitle, fonts.title, '#16181C', 400, 44, 112, 34, dxui.Utils.TEXT_ALIGN.LEFT)
  const account = dxui.View.build('settingsAccount', mainHeader)
  styleContainer(account, 54, 54, 714, 29, 27, '#4F7DF3', 100)
  const accountText = dxui.Label.build('settingsAccountText', account)
  accountText.text('D')
  styleLabel(accountText, fonts.body, '#FFFFFF', 54, 34, 0, 10, dxui.Utils.TEXT_ALIGN.CENTER)

  const search = dxui.View.build('settingsSearch', mainPage)
  styleContainer(search, 736, 64, 32, 124, 24, '#E8EAEE', 100)
  const searchIcon = dxui.Image.build('settingsSearchIcon', search)
  searchIcon.source('/app/code/resource/chat/ui/search.png')
  searchIcon.setSize(40, 40)
  searchIcon.setPos(20, 12)
  const searchText = dxui.Label.build('settingsSearchText', search)
  searchText.text('搜索设置')
  styleLabel(searchText, fonts.body, '#777D86', 620, 36, 72, 16, dxui.Utils.TEXT_ALIGN.LEFT)

  const deviceCard = dxui.View.build('settingsDeviceCard', mainPage)
  styleContainer(deviceCard, 736, 122, 32, 206, 28, '#FFFFFF', 100)
  deviceCard.shadow(16, 0, 5, 0, 0x000000, 10)
  const deviceIcon = dxui.Image.build('settingsDeviceIcon', deviceCard)
  deviceIcon.source(`${ICON_ROOT}/system_update.png`)
  deviceIcon.setSize(58, 58)
  deviceIcon.setPos(22, 30)
  const deviceName = dxui.Label.build('settingsDeviceName', deviceCard)
  deviceName.text('VF105 智能终端')
  styleLabel(deviceName, fonts.title, '#171A1F', 420, 42, 104, 24, dxui.Utils.TEXT_ALIGN.LEFT)
  const deviceMeta = dxui.Label.build('settingsDeviceMeta', deviceCard)
  deviceMeta.text('DejaOS 4.0 · 在线')
  styleLabel(deviceMeta, fonts.small, '#7B818A', 420, 30, 104, 70, dxui.Utils.TEXT_ALIGN.LEFT)
  const statusChip = dxui.View.build('settingsStatusChip', deviceCard)
  styleContainer(statusChip, 116, 42, 592, 40, 21, '#E7F7ED', 100)
  const statusText = dxui.Label.build('settingsStatusText', statusChip)
  statusText.text('状态良好')
  styleLabel(statusText, fonts.small, '#168447', 116, 28, 0, 7, dxui.Utils.TEXT_ALIGN.CENTER)

  function buildRow(card, item, index, rowHeight) {
    const row = dxui.View.build(`settingsRow_${item.id}`, card)
    styleContainer(row, 736, rowHeight, 0, index * rowHeight, 0, '#FFFFFF', 100)
    row.clickable(true)
    row.on(dxui.Utils.EVENT.CLICK, openDetail, item)

    const icon = dxui.Image.build(`settingsRowIcon_${item.id}`, row)
    icon.source(`${ICON_ROOT}/${item.icon}.png`)
    icon.setSize(58, 58)
    icon.setPos(20, Math.round((rowHeight - 58) / 2))

    const title = dxui.Label.build(`settingsRowTitle_${item.id}`, row)
    title.text(item.title)
    styleLabel(title, fonts.body, '#202328', 420, 36, 102, 17, dxui.Utils.TEXT_ALIGN.LEFT)
    const status = dxui.Label.build(`settingsRowStatus_${item.id}`, row)
    status.text(item.status)
    styleLabel(status, fonts.small, '#848A93', 500, 30, 102, 53, dxui.Utils.TEXT_ALIGN.LEFT)

    const chevron = dxui.Image.build(`settingsRowChevron_${item.id}`, row)
    chevron.source(`${ICON_ROOT}/chevron.png`)
    chevron.setSize(24, 24)
    chevron.setPos(686, Math.round((rowHeight - 24) / 2))

    if (index > 0) {
      const line = dxui.View.build(`settingsRowLine_${item.id}`, row)
      styleContainer(line, 614, 1, 102, 0, 0, '#E7E9EC', 100)
    }
  }

  function buildCard(id, y, items, rowHeight) {
    const card = dxui.View.build(id, mainPage)
    styleContainer(card, 736, items.length * rowHeight, 32, y, 26, '#FFFFFF', 100)
    card.shadow(13, 0, 4, 0, 0x000000, 8)
    items.forEach(function addRow(item, index) {
      buildRow(card, item, index, rowHeight)
    })
  }

  buildCard('settingsConnectionCard', 346, SETTINGS_ROWS.slice(0, 2), 92)
  buildCard('settingsPersonalCard', 548, SETTINGS_ROWS.slice(2, 5), 92)
  buildCard('settingsSystemCard', 842, SETTINGS_ROWS.slice(5, 8), 92)
  buildCard('settingsAboutCard', 1136, SETTINGS_ROWS.slice(8, 9), 84)

  const mainGesture = dxui.View.build('settingsMainGesture', mainPage)
  styleContainer(mainGesture, 142, 6, 329, 1251, 3, '#24272C', 76)

  const detailPage = dxui.View.build('settingsDetailPage', app)
  styleContainer(detailPage, WIDTH, HEIGHT, WIDTH, 0, 0, '#F4F5F7', 100)

  const detailHeader = dxui.View.build('settingsDetailHeader', detailPage)
  styleContainer(detailHeader, WIDTH, 112, 0, 0, 0, '#F8F9FA', 100)
  const detailBack = addBackButton('settingsDetailBack', detailHeader)
  const detailHeaderTitle = dxui.Label.build('settingsDetailHeaderTitle', detailHeader)
  detailHeaderTitle.text('WLAN')
  styleLabel(detailHeaderTitle, fonts.title, '#16181C', 500, 44, 112, 34, dxui.Utils.TEXT_ALIGN.LEFT)

  const hero = dxui.View.build('settingsDetailHero', detailPage)
  styleContainer(hero, 736, 222, 32, 140, 30, '#FFFFFF', 100)
  hero.shadow(16, 0, 5, 0, 0x000000, 10)
  const detailIcon = dxui.Image.build('settingsDetailIcon', hero)
  detailIcon.source(`${ICON_ROOT}/wifi.png`)
  detailIcon.setSize(58, 58)
  detailIcon.setPos(28, 32)
  const detailTitle = dxui.Label.build('settingsDetailTitle', hero)
  detailTitle.text('WLAN')
  styleLabel(detailTitle, fonts.title, '#171A1F', 430, 42, 112, 30, dxui.Utils.TEXT_ALIGN.LEFT)
  const detailStatus = dxui.Label.build('settingsDetailStatus', hero)
  detailStatus.text('已连接 DejaOS-Office')
  styleLabel(detailStatus, fonts.body, '#747A83', 560, 36, 112, 76, dxui.Utils.TEXT_ALIGN.LEFT)
  const toggleLabel = dxui.Label.build('settingsDetailToggleLabel', hero)
  toggleLabel.text('启用此功能')
  styleLabel(toggleLabel, fonts.body, '#30343A', 280, 36, 30, 158, dxui.Utils.TEXT_ALIGN.LEFT)
  const toggle = dxui.View.build('settingsDetailToggle', hero)
  styleContainer(toggle, 102, 54, 604, 147, 27, '#3F7BF3', 100)
  toggle.clickable(true)
  const toggleKnob = dxui.View.build('settingsDetailToggleKnob', toggle)
  styleContainer(toggleKnob, 44, 44, 52, 5, 22, '#FFFFFF', 100)
  toggleKnob.shadow(8, 0, 2, 0, 0x000000, 22)

  const infoCard = dxui.View.build('settingsDetailInfoCard', detailPage)
  styleContainer(infoCard, 736, 206, 32, 386, 28, '#FFFFFF', 100)
  const firstTitle = dxui.Label.build('settingsDetailFirstTitle', infoCard)
  firstTitle.text('当前网络')
  styleLabel(firstTitle, fonts.body, '#25282D', 360, 36, 28, 26, dxui.Utils.TEXT_ALIGN.LEFT)
  const firstValue = dxui.Label.build('settingsDetailFirstValue', infoCard)
  firstValue.text('DejaOS-Office')
  styleLabel(firstValue, fonts.body, '#66707C', 310, 36, 398, 26, dxui.Utils.TEXT_ALIGN.RIGHT)
  const infoLine = dxui.View.build('settingsDetailInfoLine', infoCard)
  styleContainer(infoLine, 680, 1, 28, 102, 0, '#E5E8EC', 100)
  const secondTitle = dxui.Label.build('settingsDetailSecondTitle', infoCard)
  secondTitle.text('IP 地址')
  styleLabel(secondTitle, fonts.body, '#25282D', 360, 36, 28, 130, dxui.Utils.TEXT_ALIGN.LEFT)
  const secondValue = dxui.Label.build('settingsDetailSecondValue', infoCard)
  secondValue.text('192.168.8.105')
  styleLabel(secondValue, fonts.body, '#66707C', 310, 36, 398, 130, dxui.Utils.TEXT_ALIGN.RIGHT)

  const levelCard = dxui.View.build('settingsDetailLevelCard', detailPage)
  styleContainer(levelCard, 736, 156, 32, 616, 28, '#FFFFFF', 100)
  const levelTitle = dxui.Label.build('settingsDetailLevelTitle', levelCard)
  levelTitle.text('强度')
  styleLabel(levelTitle, fonts.body, '#25282D', 260, 36, 28, 24, dxui.Utils.TEXT_ALIGN.LEFT)
  const levelValue = dxui.Label.build('settingsDetailLevelValue', levelCard)
  levelValue.text('78%')
  styleLabel(levelValue, fonts.body, '#3F7BF3', 160, 36, 548, 24, dxui.Utils.TEXT_ALIGN.RIGHT)
  const levelTrack = dxui.View.build('settingsDetailLevelTrack', levelCard)
  styleContainer(levelTrack, 650, 10, 28, 98, 5, '#DCE1E8', 100)
  const levelFill = dxui.View.build('settingsDetailLevelFill', levelTrack)
  styleContainer(levelFill, 480, 10, 0, 0, 5, '#3F7BF3', 100)
  const levelKnob = dxui.View.build('settingsDetailLevelKnob', levelCard)
  styleContainer(levelKnob, 30, 30, 494, 88, 15, '#FFFFFF', 100)
  levelKnob.borderWidth(3)
  levelKnob.borderColor('#3F7BF3')

  const noteCard = dxui.View.build('settingsDetailNoteCard', detailPage)
  styleContainer(noteCard, 736, 148, 32, 796, 28, '#E8F0FF', 100)
  const noteTitle = dxui.Label.build('settingsDetailNoteTitle', noteCard)
  noteTitle.text('系统提示')
  styleLabel(noteTitle, fonts.body, '#2456A6', 620, 36, 28, 23, dxui.Utils.TEXT_ALIGN.LEFT)
  const noteText = dxui.Label.build('settingsDetailNoteText', noteCard)
  noteText.text('更改将在保存后立即生效。')
  styleLabel(noteText, fonts.small, '#54709C', 670, 58, 28, 72, dxui.Utils.TEXT_ALIGN.LEFT)

  const specializedPanels = []
  function buildSpecialPanel(id, height) {
    const panel = dxui.View.build(id, detailPage)
    styleContainer(panel, 736, height, 32, 386, 28, '#FFFFFF', 100)
    panel.shadow(14, 0, 4, 0, 0x000000, 9)
    specializedPanels.push(panel)
    return panel
  }

  function addPanelTitle(id, panel, text, caption) {
    const title = dxui.Label.build(`${id}Title`, panel)
    title.text(text)
    styleLabel(title, fonts.title, '#202328', 650, 42, 28, 24, dxui.Utils.TEXT_ALIGN.LEFT)
    const meta = dxui.Label.build(`${id}Caption`, panel)
    meta.text(caption)
    styleLabel(meta, fonts.small, '#858B94', 650, 30, 28, 70, dxui.Utils.TEXT_ALIGN.LEFT)
  }

  function addTextRow(id, panel, y, titleText, valueText, color) {
    const row = dxui.View.build(id, panel)
    styleContainer(row, 680, 86, 28, y, 20, color || '#F5F6F8', 100)
    const title = dxui.Label.build(`${id}Title`, row)
    title.text(titleText)
    styleLabel(title, fonts.body, '#25282D', 380, 36, 22, 13, dxui.Utils.TEXT_ALIGN.LEFT)
    const value = dxui.Label.build(`${id}Value`, row)
    value.text(valueText)
    styleLabel(value, fonts.small, '#6F7680', 380, 30, 22, 48, dxui.Utils.TEXT_ALIGN.LEFT)
    const arrow = dxui.Image.build(`${id}Arrow`, row)
    arrow.source(`${ICON_ROOT}/chevron.png`)
    arrow.setSize(24, 24)
    arrow.setPos(632, 31)
    return row
  }

  const wifiPanel = buildSpecialPanel('settingsWifiPanel', 570)
  addPanelTitle('settingsWifi', wifiPanel, '当前网络', '已连接 · 信号强')
  const wifiCurrent = dxui.View.build('settingsWifiCurrent', wifiPanel)
  styleContainer(wifiCurrent, 680, 112, 28, 112, 24, '#E8F0FF', 100)
  const wifiCurrentName = dxui.Label.build('settingsWifiCurrentName', wifiCurrent)
  wifiCurrentName.text('DejaOS-Office')
  styleLabel(wifiCurrentName, fonts.title, '#2459B3', 420, 42, 24, 19, dxui.Utils.TEXT_ALIGN.LEFT)
  const wifiCurrentMeta = dxui.Label.build('settingsWifiCurrentMeta', wifiCurrent)
  wifiCurrentMeta.text('已连接 · WPA2 · 5 GHz')
  styleLabel(wifiCurrentMeta, fonts.small, '#54709C', 420, 30, 24, 65, dxui.Utils.TEXT_ALIGN.LEFT)
  const wifiBadge = dxui.View.build('settingsWifiBadge', wifiCurrent)
  styleContainer(wifiBadge, 98, 42, 552, 35, 21, '#3F7BF3', 100)
  const wifiBadgeText = dxui.Label.build('settingsWifiBadgeText', wifiBadge)
  wifiBadgeText.text('已连接')
  styleLabel(wifiBadgeText, fonts.small, '#FFFFFF', 98, 28, 0, 7, dxui.Utils.TEXT_ALIGN.CENTER)
  const wifiAvailable = dxui.Label.build('settingsWifiAvailable', wifiPanel)
  wifiAvailable.text('可用网络')
  styleLabel(wifiAvailable, fonts.body, '#33373D', 300, 36, 28, 246, dxui.Utils.TEXT_ALIGN.LEFT)
  addTextRow('settingsWifiOffice', wifiPanel, 292, 'Office-5G', '信号强 · 需要密码', '#F7F8FA')
  addTextRow('settingsWifiGuest', wifiPanel, 390, 'Guest Network', '信号良好 · 开放网络', '#F7F8FA')
  addTextRow('settingsWifiLab', wifiPanel, 488, 'DejaOS-Lab', '信号一般 · 需要密码', '#F7F8FA')

  const bluetoothPanel = buildSpecialPanel('settingsBluetoothPanel', 570)
  addPanelTitle('settingsBluetooth', bluetoothPanel, '我的设备', '设备名称：VF105')
  const bluetoothScan = dxui.View.build('settingsBluetoothScan', bluetoothPanel)
  styleContainer(bluetoothScan, 680, 118, 28, 112, 24, '#EEF2FF', 100)
  const scanIcon = dxui.Image.build('settingsBluetoothScanIcon', bluetoothScan)
  scanIcon.source(`${ICON_ROOT}/bluetooth.png`)
  scanIcon.setSize(58, 58)
  scanIcon.setPos(24, 30)
  const scanTitle = dxui.Label.build('settingsBluetoothScanTitle', bluetoothScan)
  scanTitle.text('正在查找附近设备')
  styleLabel(scanTitle, fonts.body, '#344B98', 430, 36, 108, 24, dxui.Utils.TEXT_ALIGN.LEFT)
  const scanMeta = dxui.Label.build('settingsBluetoothScanMeta', bluetoothScan)
  scanMeta.text('保持此页面打开以继续搜索')
  styleLabel(scanMeta, fonts.small, '#6978A8', 430, 30, 108, 66, dxui.Utils.TEXT_ALIGN.LEFT)
  addTextRow('settingsBluetoothAudio', bluetoothPanel, 252, 'DejaOS Audio', '已配对 · 未连接', '#F7F8FA')
  addTextRow('settingsBluetoothKeyboard', bluetoothPanel, 350, 'Wireless Keyboard', '可用设备', '#F7F8FA')
  addTextRow('settingsBluetoothPhone', bluetoothPanel, 448, 'Pixel Phone', '可用设备', '#F7F8FA')

  const sliderPanel = buildSpecialPanel('settingsSliderPanel', 570)
  addPanelTitle('settingsSlider', sliderPanel, '亮度', '拖动滑块进行调整')
  const sliderPrimaryLabel = dxui.Label.build('settingsSliderPrimaryLabel', sliderPanel)
  sliderPrimaryLabel.text('屏幕亮度')
  styleLabel(sliderPrimaryLabel, fonts.body, '#30343A', 380, 36, 28, 122, dxui.Utils.TEXT_ALIGN.LEFT)
  const sliderPrimaryValue = dxui.Label.build('settingsSliderPrimaryValue', sliderPanel)
  sliderPrimaryValue.text('78%')
  styleLabel(sliderPrimaryValue, fonts.body, '#3F7BF3', 160, 36, 548, 122, dxui.Utils.TEXT_ALIGN.RIGHT)
  const primarySlider = dxui.Slider.build('settingsPrimarySlider', sliderPanel)
  primarySlider.setSize(650, 34)
  primarySlider.setPos(28, 172)
  primarySlider.range(0, 100)
  primarySlider.value(78)
  const sliderSecondLabel = dxui.Label.build('settingsSliderSecondLabel', sliderPanel)
  sliderSecondLabel.text('自动亮度')
  styleLabel(sliderSecondLabel, fonts.body, '#30343A', 380, 36, 28, 246, dxui.Utils.TEXT_ALIGN.LEFT)
  const sliderSecondValue = dxui.Label.build('settingsSliderSecondValue', sliderPanel)
  sliderSecondValue.text('52%')
  styleLabel(sliderSecondValue, fonts.body, '#3F7BF3', 160, 36, 548, 246, dxui.Utils.TEXT_ALIGN.RIGHT)
  const secondSlider = dxui.Slider.build('settingsSecondSlider', sliderPanel)
  secondSlider.setSize(650, 34)
  secondSlider.setPos(28, 296)
  secondSlider.range(0, 100)
  secondSlider.value(52)
  const sliderThirdGroup = dxui.View.build('settingsSliderThirdGroup', sliderPanel)
  styleContainer(sliderThirdGroup, 680, 160, 28, 374, 22, '#F6F7F9', 100)
  const sliderThirdLabel = dxui.Label.build('settingsSliderThirdLabel', sliderThirdGroup)
  sliderThirdLabel.text('闹钟音量')
  styleLabel(sliderThirdLabel, fonts.body, '#30343A', 360, 36, 20, 18, dxui.Utils.TEXT_ALIGN.LEFT)
  const sliderThirdValue = dxui.Label.build('settingsSliderThirdValue', sliderThirdGroup)
  sliderThirdValue.text('80%')
  styleLabel(sliderThirdValue, fonts.body, '#3F7BF3', 140, 36, 510, 18, dxui.Utils.TEXT_ALIGN.RIGHT)
  const thirdSlider = dxui.Slider.build('settingsThirdSlider', sliderThirdGroup)
  thirdSlider.setSize(620, 34)
  thirdSlider.setPos(20, 82)
  thirdSlider.range(0, 100)
  thirdSlider.value(80)

  const palettePanel = buildSpecialPanel('settingsPalettePanel', 570)
  addPanelTitle('settingsPalette', palettePanel, '壁纸预览', '极光蓝')
  const wallpaperPreview = dxui.View.build('settingsWallpaperPreview', palettePanel)
  styleContainer(wallpaperPreview, 260, 330, 28, 112, 32, '#102A63', 100)
  wallpaperPreview.shadow(16, 0, 5, 0, 0x000000, 18)
  const glowOne = dxui.View.build('settingsWallpaperGlowOne', wallpaperPreview)
  styleContainer(glowOne, 220, 72, -24, 72, 36, '#236BFF', 78)
  const glowTwo = dxui.View.build('settingsWallpaperGlowTwo', wallpaperPreview)
  styleContainer(glowTwo, 190, 62, 82, 188, 31, '#27C7FF', 72)
  const wallpaperClock = dxui.Label.build('settingsWallpaperClock', wallpaperPreview)
  wallpaperClock.text('09:41')
  styleLabel(wallpaperClock, fonts.weather, '#FFFFFF', 220, 60, 20, 24, dxui.Utils.TEXT_ALIGN.CENTER)
  const paletteTitle = dxui.Label.build('settingsPaletteTitleText', palettePanel)
  paletteTitle.text('系统颜色')
  styleLabel(paletteTitle, fonts.body, '#30343A', 300, 36, 324, 124, dxui.Utils.TEXT_ALIGN.LEFT)
  ;['#3F7BF3', '#14B8A6', '#A855F7', '#F97316', '#EF4444'].forEach(function addSwatch(color, index) {
    const swatch = dxui.View.build(`settingsPaletteSwatch_${index}`, palettePanel)
    styleContainer(swatch, 58, 58, 324 + (index % 3) * 84, 180 + Math.floor(index / 3) * 84, 29, color, 100)
    swatch.clickable(true)
  })
  addTextRow('settingsPaletteIcons', palettePanel, 466, '图标形状', '圆角方形', '#F7F8FA')

  const appsPanel = buildSpecialPanel('settingsAppsPanel', 570)
  addPanelTitle('settingsApps', appsPanel, '应用管理', '16 个已安装应用')
  ;[
    ['全部应用', '16', '#E8F0FF', '#3564C7'],
    ['默认应用', '4', '#E8F8EF', '#168447'],
    ['权限管理', '12', '#FFF3E6', '#B95F00'],
    ['后台运行', '3', '#F3EAFE', '#7A3EB1']
  ].forEach(function addAppStat(item, index) {
    const card = dxui.View.build(`settingsAppStat_${index}`, appsPanel)
    styleContainer(card, 326, 132, 28 + (index % 2) * 354, 118 + Math.floor(index / 2) * 154, 24, item[2], 100)
    const value = dxui.Label.build(`settingsAppStatValue_${index}`, card)
    value.text(item[1])
    styleLabel(value, fonts.weather, item[3], 120, 58, 20, 16, dxui.Utils.TEXT_ALIGN.LEFT)
    const label = dxui.Label.build(`settingsAppStatLabel_${index}`, card)
    label.text(item[0])
    styleLabel(label, fonts.body, item[3], 250, 36, 20, 82, dxui.Utils.TEXT_ALIGN.LEFT)
  })
  addTextRow('settingsAppsSpecial', appsPanel, 448, '特殊应用权限', '显示在其他应用上层', '#F7F8FA')

  const securityPanel = buildSpecialPanel('settingsSecurityPanel', 570)
  addPanelTitle('settingsSecurity', securityPanel, '设备安全', '未发现风险')
  const securityHero = dxui.View.build('settingsSecurityHero', securityPanel)
  styleContainer(securityHero, 680, 128, 28, 112, 26, '#E7F8EF', 100)
  const securityIcon = dxui.Image.build('settingsSecurityIcon', securityHero)
  securityIcon.source(`${ICON_ROOT}/security.png`)
  securityIcon.setSize(58, 58)
  securityIcon.setPos(24, 35)
  const securityGood = dxui.Label.build('settingsSecurityGood', securityHero)
  securityGood.text('设备保护状态良好')
  styleLabel(securityGood, fonts.title, '#168447', 480, 42, 108, 24, dxui.Utils.TEXT_ALIGN.LEFT)
  const securityTime = dxui.Label.build('settingsSecurityTime', securityHero)
  securityTime.text('上次检查：今天 09:30')
  styleLabel(securityTime, fonts.small, '#4D8064', 480, 30, 108, 72, dxui.Utils.TEXT_ALIGN.LEFT)
  addTextRow('settingsSecurityLock', securityPanel, 264, '屏幕锁定', '已启用', '#F7F8FA')
  addTextRow('settingsSecurityPrivacy', securityPanel, 362, '隐私面板', '今天无敏感权限访问', '#F7F8FA')
  addTextRow('settingsSecurityUpdate', securityPanel, 460, '安全更新', '2026 年 8 月', '#F7F8FA')

  const storagePanel = buildSpecialPanel('settingsStoragePanel', 570)
  addPanelTitle('settingsStorage', storagePanel, '存储空间', '已使用 3.8 GB / 16 GB')
  const storageBar = dxui.View.build('settingsStorageBar', storagePanel)
  styleContainer(storageBar, 680, 34, 28, 126, 17, '#E4E7EB', 100)
  const storageApps = dxui.View.build('settingsStorageApps', storageBar)
  styleContainer(storageApps, 98, 34, 0, 0, 17, '#3F7BF3', 100)
  const storageMedia = dxui.View.build('settingsStorageMedia', storageBar)
  styleContainer(storageMedia, 44, 34, 98, 0, 0, '#A855F7', 100)
  const storageSystem = dxui.View.build('settingsStorageSystem', storageBar)
  styleContainer(storageSystem, 62, 34, 142, 0, 0, '#14B8A6', 100)
  ;[
    ['应用', '2.3 GB', '#3F7BF3'],
    ['图片和视频', '680 MB', '#A855F7'],
    ['系统', '820 MB', '#14B8A6'],
    ['可用空间', '12.2 GB', '#9AA0A8']
  ].forEach(function addStorageLegend(item, index) {
    const dot = dxui.View.build(`settingsStorageDot_${index}`, storagePanel)
    styleContainer(dot, 18, 18, 32, 210 + index * 74, 9, item[2], 100)
    const title = dxui.Label.build(`settingsStorageLegendTitle_${index}`, storagePanel)
    title.text(item[0])
    styleLabel(title, fonts.body, '#30343A', 360, 36, 66, 199 + index * 74, dxui.Utils.TEXT_ALIGN.LEFT)
    const value = dxui.Label.build(`settingsStorageLegendValue_${index}`, storagePanel)
    value.text(item[1])
    styleLabel(value, fonts.body, '#69707A', 220, 36, 470, 199 + index * 74, dxui.Utils.TEXT_ALIGN.RIGHT)
  })

  const aboutPanel = buildSpecialPanel('settingsAboutPanel', 570)
  addPanelTitle('settingsAbout', aboutPanel, 'VF105 智能终端', '设备信息')
  ;[
    ['设备型号', 'VF105_V12'],
    ['系统版本', 'DejaOS 4.0'],
    ['Android 安全级别', '2026-08'],
    ['内核版本', '5.10.168'],
    ['版本号', 'VF105.20260827']
  ].forEach(function addAboutRow(item, index) {
    const title = dxui.Label.build(`settingsAboutTitle_${index}`, aboutPanel)
    title.text(item[0])
    styleLabel(title, fonts.body, '#30343A', 300, 36, 28, 120 + index * 82, dxui.Utils.TEXT_ALIGN.LEFT)
    const value = dxui.Label.build(`settingsAboutValue_${index}`, aboutPanel)
    value.text(item[1])
    styleLabel(value, fonts.body, '#69707A', 340, 36, 366, 120 + index * 82, dxui.Utils.TEXT_ALIGN.RIGHT)
    if (index > 0) {
      const line = dxui.View.build(`settingsAboutLine_${index}`, aboutPanel)
      styleContainer(line, 680, 1, 28, 105 + index * 82, 0, '#E7E9EC', 100)
    }
  })

  const buildText = dxui.Label.build('settingsBuildText', detailPage)
  buildText.text('VF105_V12  ·  DejaOS 4.0  ·  Build 2026.08')
  styleLabel(buildText, fonts.small, '#9AA0A8', 700, 32, 50, 1110, dxui.Utils.TEXT_ALIGN.CENTER)
  const detailGesture = dxui.View.build('settingsDetailGesture', detailPage)
  styleContainer(detailGesture, 142, 6, 329, 1251, 3, '#24272C', 76)

  function updateToggle() {
    toggle.bgColor(toggleOn ? '#3F7BF3' : '#C9CDD3')
    toggleKnob.x(toggleOn ? 52 : 6)
    detailStatus.text(toggleOn ? detailItem.status : '已关闭')
  }

  function handleToggle() {
    toggleOn = !toggleOn
    updateToggle()
    logger.info(`settings toggle: ${detailItem.id}=${toggleOn}`)
  }

  function handlePrimarySliderChange() {
    sliderPrimaryValue.text(`${primarySlider.value()}%`)
  }

  function handleSecondSliderChange() {
    sliderSecondValue.text(`${secondSlider.value()}%`)
  }

  function handleThirdSliderChange() {
    sliderThirdValue.text(`${thirdSlider.value()}%`)
  }

  function openDetail(event) {
    detailItem = event.ud
    toggleOn = detailItem.enabled
    detailHeaderTitle.text(detailItem.title)
    detailIcon.source(`${ICON_ROOT}/${detailItem.icon}.png`)
    detailTitle.text(detailItem.title)
    firstTitle.text(detailItem.first[0])
    firstValue.text(detailItem.first[1])
    secondTitle.text(detailItem.second[0])
    secondValue.text(detailItem.second[1])
    infoCard.hide()
    levelCard.hide()
    noteCard.hide()
    specializedPanels.forEach(function hidePanel(panel) {
      panel.hide()
      panel.y(386)
    })

    const connectivity = detailItem.id === 'wifi' || detailItem.id === 'bluetooth'
    if (connectivity) {
      hero.show()
      toggleLabel.show()
      toggle.show()
      updateToggle()
    } else {
      hero.hide()
    }

    if (detailItem.id === 'wifi') {
      wifiPanel.show()
    } else if (detailItem.id === 'bluetooth') {
      bluetoothPanel.show()
    } else if (detailItem.id === 'brightness' || detailItem.id === 'volume') {
      sliderPanel.y(140)
      sliderPanel.show()
      if (detailItem.id === 'brightness') {
        dxui.getUi('settingsSliderTitle').text('显示与亮度')
        dxui.getUi('settingsSliderCaption').text('拖动滑块调整屏幕显示')
        sliderPrimaryLabel.text('屏幕亮度')
        sliderSecondLabel.text('色温')
        primarySlider.value(78)
        secondSlider.value(52)
        sliderPrimaryValue.text('78%')
        sliderSecondValue.text('52%')
        sliderThirdGroup.hide()
      } else {
        dxui.getUi('settingsSliderTitle').text('音量控制')
        dxui.getUi('settingsSliderCaption').text('分别调整不同类型的声音')
        sliderPrimaryLabel.text('媒体音量')
        sliderSecondLabel.text('铃声和通知')
        sliderThirdLabel.text('闹钟音量')
        primarySlider.value(65)
        secondSlider.value(48)
        thirdSlider.value(80)
        sliderPrimaryValue.text('65%')
        sliderSecondValue.text('48%')
        sliderThirdValue.text('80%')
        sliderThirdGroup.show()
      }
    } else if (detailItem.id === 'palette') {
      palettePanel.y(140)
      palettePanel.show()
    } else if (detailItem.id === 'apps') {
      appsPanel.y(140)
      appsPanel.show()
    } else if (detailItem.id === 'security') {
      securityPanel.y(140)
      securityPanel.show()
    } else if (detailItem.id === 'storage') {
      storagePanel.y(140)
      storagePanel.show()
    } else if (detailItem.id === 'about') {
      aboutPanel.y(140)
      aboutPanel.show()
    }
    detailPage.x(WIDTH)
    detailPage.show()
    detailPage.moveForeground()
    animatePage(detailPage, WIDTH, 0, 240)
    logger.info(`settings detail opened: ${detailItem.id}`)
  }

  function backToMain() {
    animatePage(detailPage, 0, WIDTH, 220)
    hideTimer = dxstd.setTimeout(function hideDetail() {
      detailPage.hide()
      hideTimer = null
    }, 230)
  }

  function close() {
    if (!opened) {
      return
    }
    if (!detailPage.isHide()) {
      detailPage.hide()
    }
    animatePage(app, 0, WIDTH, 220)
    hideTimer = dxstd.setTimeout(function hideSettings() {
      app.hide()
      opened = false
      hideTimer = null
    }, 230)
    logger.info('settings app closed')
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
    detailPage.hide()
    app.x(WIDTH)
    app.show()
    app.moveForeground()
    animatePage(app, WIDTH, 0, 260)
    logger.info('settings app opened')
  }

  function destroy() {
    if (hideTimer) {
      dxstd.clearTimeout(hideTimer)
      hideTimer = null
    }
    opened = false
    activeAnimations.length = 0
    app.hide()
  }

  mainBack.on(dxui.Utils.EVENT.CLICK, close)
  detailBack.on(dxui.Utils.EVENT.CLICK, backToMain)
  toggle.on(dxui.Utils.EVENT.CLICK, handleToggle)
  primarySlider.on(dxui.Utils.EVENT.VALUE_CHANGED, handlePrimarySliderChange)
  secondSlider.on(dxui.Utils.EVENT.VALUE_CHANGED, handleSecondSliderChange)
  thirdSlider.on(dxui.Utils.EVENT.VALUE_CHANGED, handleThirdSliderChange)

  infoCard.hide()
  levelCard.hide()
  noteCard.hide()
  specializedPanels.forEach(function hideInitialPanel(panel) {
    panel.hide()
  })
  detailPage.hide()
  app.hide()
  return { open, close, destroy }
}
