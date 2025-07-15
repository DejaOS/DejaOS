import ui from "../dxmodules/dxUi.js";
import std from "../dxmodules/dxStd.js";
import page1 from './page1.js'
import page5 from './page5.js'
import { playAudio } from './doplay.js'
import viewUtils from './viewUtils.js'

const pageView = {}
const pageID = 'page4'
let theView;

pageView.init = function () {
  // Air conditioner state tracking
  let airState = false

  theView = ui.View.build(pageID, ui.Utils.LAYER.MAIN)
  theView.padAll(0)
  theView.borderWidth(0)
  theView.bgColor(0x000000)
  theView.setPos(0, 0)
  theView.setSize(480, 320)

  // Styling for device control buttons
  let buttonStyle = ui.Style.build()
  buttonStyle.radius(20)
  buttonStyle.bgOpa(100)
  buttonStyle.bgColor(0x333333)
  buttonStyle.textColor(0xffffff)
  buttonStyle.borderWidth(0)

  let labelStyle = ui.Style.build()
  labelStyle.borderWidth(0)

  // Device control buttons layout
  let button1 = ui.Button.build(pageID + 'button1', theView)  // Welcome home scene
  button1.setSize(180, 80)
  button1.setPos(40, 40)

  let button2 = ui.Button.build(pageID + 'button2', theView)  // Sleep scene
  button2.setSize(180, 80)
  button2.setPos(150, 140)

  let button3 = ui.Button.build(pageID + 'button3', theView)  // Curtain control
  button3.setSize(80, 80)
  button3.setPos(40, 140)

  let button4 = ui.Button.build(pageID + 'button4', theView)  // AC detailed control
  button4.setSize(80, 80)
  button4.setPos(250, 40)

  let button5 = ui.Button.build(pageID + 'button5', theView)  // AC on/off toggle
  button5.setSize(80, 80)
  button5.setPos(360, 40)

  let button6 = ui.Button.build(pageID + 'button6', theView)  // Light brightness control
  button6.setSize(80, 80)
  button6.setPos(360, 140)

  // 将样式绑定到按钮上
  button1.addStyle(buttonStyle)
  button2.addStyle(buttonStyle)
  button3.addStyle(buttonStyle)
  button4.addStyle(buttonStyle)
  button5.addStyle(buttonStyle)
  button6.addStyle(buttonStyle)

  let viewBtn = ui.View.build(pageID + 'viewBtn', theView)
  viewBtn.setSize(200, 10)
  viewBtn.setPos(140, 300)
  viewBtn.bgColor(0x666666)
  viewBtn.borderWidth(0)

  // Text labels for scene buttons
  let label1 = ui.Label.build(pageID + 'button1label', button1)
  label1.text("我回来了")
  label1.setPos(40, 15)

  let label2 = ui.Label.build(pageID + 'button2label', button2)
  label2.text("晚安")
  label2.setPos(40, 15)

  label1.textFont(viewUtils.font24Bold)
  label2.textFont(viewUtils.font24Bold)

  let img1 = ui.Image.build(pageID + 'button1img', button1)
  img1.source("/app/code/resource/image/icon4.png")
  img1.setPos(5, 15)
  let img2 = ui.Image.build(pageID + 'button2img', button2)
  img2.source("/app/code/resource/image/icon1.png")
  img2.setPos(5, 15)

  let img3 = ui.Image.build(pageID + 'button3img', button3)
  img3.source("/app/code/resource/image/icon2.png")
  img3.align(ui.Utils.ALIGN.CENTER, 0, 0)

  let img4 = ui.Image.build(pageID + 'button4img', button4)
  img4.source("/app/code/resource/image/icon5.png")
  img4.align(ui.Utils.ALIGN.CENTER, 0, 0)

  // AC toggle button icons (off/on states)
  let img5_1 = ui.Image.build(pageID + 'button5img1', button5)
  img5_1.source("/app/code/resource/image/icon_off.png")
  img5_1.padAll(15)
  img5_1.borderWidth(2)
  img5_1.radius(100)
  img5_1.setBorderColor(0xFFFFFF)
  img5_1.align(ui.Utils.ALIGN.CENTER, 0, 0)

  let img5_2 = ui.Image.build(pageID + 'button5img2', button5)
  img5_2.source("/app/code/resource/image/icon_on2.png")
  img5_2.padAll(15)
  img5_2.borderWidth(2)
  img5_2.radius(100)
  img5_2.setBorderColor(0x17abe3)
  img5_2.align(ui.Utils.ALIGN.CENTER, 0, 0)
  img5_2.hide()

  // Light control button icons (off/on states)
  let img6 = ui.Image.build(pageID + 'button6img1', button6)
  img6.source("/app/code/resource/image/icon6.png")
  img6.align(ui.Utils.ALIGN.CENTER, 0, 0)

  let img6_1 = ui.Image.build(pageID + 'button6img2', button6)
  img6_1.source("/app/code/resource/image/icon6_1.png")
  img6_1.align(ui.Utils.ALIGN.CENTER, 0, 0)

  img6_1.hide()

  // Light brightness control slider
  let slider = ui.Slider.build(pageID + 'slider', theView)
  slider.setSize(400, 30)
  slider.setPos(40, 240)
  slider.range(0, 100)
  slider.value(0)
  slider.bgColor(0xFFFFFF)


  let plate = ui.View.build(pageID + 'view', theView)
  plate.setSize(480, 320)
  plate.setPos(0, 0)
  plate.bgOpa(0)
  plate.borderWidth(0)

  let plateView = ui.View.build(pageID + 'view1', plate)
  plateView.setSize(300, 180)
  plateView.borderWidth(0)

  plateView.align(ui.Utils.ALIGN.CENTER, 0, 0)

  let plateLabel = ui.Label.build(pageID + 'plateLabel', plateView)
  plateLabel.text("晚安")
  plateLabel.textColor(0xffffff)
  plateLabel.textFont(viewUtils.font28)
  plateLabel.align(ui.Utils.ALIGN.CENTER, 0, 0)

  plate.hide()

  // Device control helper functions
  function airOff() {
    airState = false
    img6_1.hide()
    img6.show()
  }
  function airOn() {
    airState = true
    img6.hide()
    img6_1.show()
  }

  function lampOff() {
    slider.value(0)
    img6_1.hide()
    img6.show()
  }
  function lampOn() {
    slider.value(50)
    img6.hide()
    img6_1.show()
  }

  // Light button toggles brightness between 0 and 50
  button6.on(ui.Utils.EVENT.CLICK, () => {
    if (slider.value() == 0) {
      lampOn();
    } else {
      lampOff();
    }
  })

  // Update light icon based on slider value
  function isOff() {
    if (slider.value() == 0) {
      img6_1.hide()
      img6.show()
    } else {
      img6.hide()
      img6_1.show()
    }
  }
  slider.on(ui.Utils.EVENT.VALUE_CHANGED, isOff)
  slider.on(ui.Utils.EVENT.DEFOCUSED, isOff)

  // Scene button event handlers with visual feedback
  button1.on(ui.Utils.EVENT.CLICK, () => {
    plate.show()
    plateView.bgColor(0xFF9900)
    plateLabel.textColor(0xffffff)
    plateLabel.text('欢迎回家')
    playAudio(5)
    std.setTimeout(() => {
      plate.hide()
    }, 2000)
  })
  button2.on(ui.Utils.EVENT.CLICK, () => {
    plate.show()
    plateView.bgColor(0x000000)
    plateLabel.textColor(0x999999)
    plateLabel.text('晚安')
    playAudio(1)
    std.setTimeout(() => {
      plate.hide()
    }, 2000)
  })
  let clState = false
  button3.on(ui.Utils.EVENT.CLICK, () => {
    clState = !clState
    let ys = clState ? 0xFFFFCC : 0x666699
    plate.show()
    plateView.bgColor(ys)
    plateLabel.textColor(0x999999)
    plateLabel.text(clState ? '窗帘已打开' : '窗帘已关闭')
    if (clState) {
      playAudio(2)
    } else {
      playAudio(3)
    }
    std.setTimeout(() => {
      plate.hide()
    }, 2000)
  })
  button4.on(ui.Utils.EVENT.CLICK, () => {
    page5.load(airState)
  })
  button5.on(ui.Utils.EVENT.CLICK, () => {
    airState = !airState
    if (airState) {
      img5_1.hide()
      img5_2.show()
    } else {
      img5_2.hide()
      img5_1.show()
    }
  })
  viewBtn.on(ui.Utils.EVENT.CLICK, () => {
    page1.load()
  })
}
pageView.load = function () {
  ui.loadMain(theView)
}


export default pageView