import dxui from '../../dxmodules/dxUi.js'
import dxstd from '../../dxmodules/dxStd.js'
import viewUtils from './viewUtils.js'
import screen from '../screen.js'
import topView from './topView.js'
import mainView from './mainView.js'
import wechatNetView from '../view/wechatNetView.js'
import config from '../../dxmodules/dxConfig.js'
import i18n from './i18n.js'
const homeView = {}
const VERSION_FILE = '/etc/app/.region'
const INITIAL_FILE = '/etc/app/.initial'
const MODE_FILE = '/etc/app/.weCom'
let flag = false

const mode = {
  label: "选择模式",
  key: "mode",
  options: [
    {
      label: "标品模式",
      value: "prod"
    }, {
      label: "企微模式",
      value: "weCom"
    }
  ]
}
const region = {
  label: "选择版本",
  key: "region",
  options: [
    {
      label: "国内版",
      value: "CN"
    }, {
      label: "国际版",
      value: "INTL"
    }
  ]
}

function buildContentCard(parent, top, titleText, descText) {
  const card = dxui.View.build(parent.id + titleText + 'Card', parent)
  viewUtils._clearStyle(card)
  card.setSize(screen.screenSize.width * (460 / 600), screen.screenSize.height * (250 / 1024))
  card.setPos(screen.screenSize.width * (10 / 600), top)
  card.bgColor(0xffffff)
  card.borderWidth(2)
  card.setBorderColor(0xD2C9BC)
  card.scroll(false)

  const title = dxui.Label.build(card.id + 'title', card)
  title.text(titleText)
  title.textFont(viewUtils.font(24))
  title.setPos(screen.screenSize.width * (10 / 600), screen.screenSize.height * (16 / 1024))
  title.textColor(0x111111)

  const desc = dxui.Label.build(card.id + 'desc', card)
  desc.text(descText)
  desc.width(screen.screenSize.width * (560 / 800))
  desc.longMode(dxui.Utils.LABEL_LONG_MODE.WRAP)
  desc.textFont(viewUtils.font(20))
  desc.setPos(screen.screenSize.width * (10 / 800), screen.screenSize.height * (55 / 1024))
  desc.textColor(0x666666)
  return card
}

function buildDropdown(parent, meta, onChange) {
  const dropdown = dxui.Dropdown.build(parent.id + 'dropdown', parent)
  dropdown.setSize(screen.screenSize.width * (250 / 600), screen.screenSize.height * (55 / 1024))
  dropdown.setPos(screen.screenSize.width * (10 / 600), screen.screenSize.height * (140 / 1024))
  dropdown.setOptions(meta.options.map((item) => item.label))
  dropdown.getList().textFont(viewUtils.font(26))
  dropdown.textFont(viewUtils.font(26))
  dropdown.padTop((screen.screenSize.height * (55 / 1024) - viewUtils.font(26).obj.lvFontGetLineHeight()) / 2)
  dropdown.padBottom(0)
  dropdown.setSymbol(screen.dropdownSymbol)

  let selectedIndex = 0
  dropdown.setSelected(selectedIndex)
  homeView[meta.key] = meta.options[0].value
  dropdown.on(dxui.Utils.EVENT.VALUE_CHANGED, () => {
    const current = meta.options[dropdown.getSelected()]
    onChange(current.value)
  })

  dropdown.update()
}

homeView.init = function () {
  const screenMain = dxui.View.build('homeView', dxui.Utils.LAYER.MAIN)
  viewUtils._clearStyle(screenMain)
  homeView.screenMain = screenMain
  screenMain.scroll(false)
  screenMain.bgColor(0xf7f7f7)

  screenMain.on(dxui.Utils.ENUM.LV_EVENT_SCREEN_LOADED, () => {
    topView.topBox.hide()
  })

  screenMain.on(dxui.Utils.ENUM.LV_EVENT_SCREEN_UNLOADED, () => {
    topView.topBox.show()
  })

  const content = dxui.View.build(screenMain.id + '_content', screenMain)
  content.setSize(screen.screenSize.width * (520 / 600), screen.screenSize.height * (850 / 1024))
  content.setPos(screen.screenSize.width * (40 / 600), screen.screenSize.height * (80 / 1024))
  content.scroll(false)
  content.bgColor(0xF7F5F1)
  content.borderWidth(2)
  content.setBorderColor(0x3B3934)

  let modeCard = buildContentCard(content, screen.screenSize.height * (20 / 1024), "选择模式", "1、标品模式：用于标品定制等生产设备 \n2、企微模式：用于绑定企业微信")
  let regionCard = buildContentCard(content, screen.screenSize.height * (310 / 1024), "选择版本", "1、国内版：语言为中文 \n2、国际版：语言默认为英文，可切换")

  buildDropdown(modeCard, mode, (value) => {
    homeView[mode.key] = value
  })
  buildDropdown(regionCard, region, (value) => {
    homeView[region.key] = value
  })

  const btn = dxui.Button.build(screenMain.id + "Button", screenMain)
  btn.align(dxui.Utils.ALIGN.BOTTOM_MID, 0, -screen.screenSize.height * (124 / 1024))
  btn.bgColor(0x000000)
  btn.setSize(screen.screenSize.width * (480 / 600), screen.screenSize.height * (80 / 1024))
  btn.radius(screen.screenSize.width * (40 / 600))
  const btnLbl = dxui.Label.build(screenMain.id + "Label", btn)
  btnLbl.text("保存")
  btnLbl.textFont(viewUtils.font(28))
  btnLbl.textColor(0xffffff)
  btnLbl.align(dxui.Utils.ALIGN.CENTER, 0, 0)
  btn.on(dxui.Utils.EVENT.CLICK, () => {
    if(flag) return
    flag = true
    viewUtils.confirmOpen('确认保存', '是否确认保存配置？', () => {
      try {
        dxstd.saveFile(VERSION_FILE, homeView[region.key])
        dxstd.saveFile(INITIAL_FILE, "true")
        let language = homeView[region.key] === "CN" ? "CN" : "EN"
        config.setAndSave("base.language", language)
        i18n.setLanguage(language)
        if(homeView[mode.key] === "weCom") {
          dxstd.saveFile(MODE_FILE, "weCom")
          dxui.loadMain(wechatNetView.screenMain)
        } else {
          mainView.load()
        }
      } catch (error) {
        flag = false
        console.error('保存失败:', error)
      } finally {
        if (flag) flag = false; 
      }
    }, () => {
      flag = false
    })
  })
}

homeView.load = () => {
  dxui.loadMain(homeView.screenMain)
}

export default homeView