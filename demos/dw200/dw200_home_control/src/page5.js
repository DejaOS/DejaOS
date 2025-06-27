import ui from "../dxmodules/dxUi.js";
import page4 from './page4.js';
import page6 from './page6.js';
import viewUtils from './viewUtils.js';

const pageView = {}
const pageID = 'page5'
let theView;
const page5Func = {}

pageView.init = function () {
  // Air conditioner state tracking
  let theState = false

  theView = ui.View.build(pageID, ui.Utils.LAYER.MAIN)
  theView.padAll(0)
  theView.borderWidth(0)
  theView.bgColor(0x000000)
  theView.setPos(0, 0)
  theView.setSize(480, 320)

  // Button styling for AC controls
  let buttonStyle = ui.Style.build()
  buttonStyle.radius(20)
  buttonStyle.bgOpa(100)
  buttonStyle.bgColor(0x666666)
  buttonStyle.textColor(0xffffff)
  buttonStyle.borderWidth(0)

  // Visual states for enabled/disabled controls
  let offStyle = ui.Style.build()
  offStyle.opa(50)
  let onStyle = ui.Style.build()
  onStyle.opa(100)

  let labelStyle = ui.Style.build()
  labelStyle.borderWidth(0)

  // Temperature display (large, centered)
  let label1 = ui.Label.build(pageID + 'label1', theView)
  label1.text("19°")
  label1.setSize(280, 50)
  label1.setPos(100, 20)
  label1.textAlign(2)
  label1.textColor(0xFFFFFF)

  // Status label (shows when AC is off)
  let label3 = ui.Label.build(pageID + 'label3', theView)
  label3.text("状态")
  label3.setSize(280, 50)
  label3.setPos(100, 120)
  label3.textAlign(2)
  label3.textColor(0xFFFFFF)
  label3.addStyle(offStyle)

  // Mode selection button (cooling/heating)
  let button2 = ui.Button.build(pageID + 'button2', theView)
  button2.setSize(180, 40)
  button2.setPos(150, 120)
  button2.padAll(0)
  button2.bgColor(0x000000)
  button2.borderWidth(0)

  // Temperature control buttons
  let button3 = ui.Button.build(pageID + 'button3', theView)  // Increase temperature
  button3.setSize(80, 80)
  button3.setPos(210, 190)
  button3.radius(100)

  let button4 = ui.Button.build(pageID + 'button4', theView)  // Decrease temperature
  button4.setSize(80, 80)
  button4.setPos(340, 190)
  button4.radius(100)

  // AC power toggle button
  let button5 = ui.Button.build(pageID + 'button5', theView)
  button5.setSize(80, 80)
  button5.radius(100)
  button5.setPos(60, 190)
  button5.borderWidth(1)
  button5.radius(100)
  button5.setBorderColor(0xaaaaaa)

  // Back button
  let button6 = ui.Button.build(pageID + 'button6', theView)
  button6.setSize(40, 40)
  button6.setPos(20, 10)
  button6.bgColor(0x000000)

  button3.addStyle(buttonStyle)
  button4.addStyle(buttonStyle)
  button5.addStyle(buttonStyle)

  let label2 = ui.Label.build(pageID + 'button2label', button2)
  label2.text("制冷")
  label2.setPos(80, 0)

  label1.textFont(viewUtils.font58)
  label3.textFont(viewUtils.font28)
  label2.textFont(viewUtils.font24Bold)

  let img1 = ui.Image.build(pageID + 'button2img1', button2)
  img1.source("/app/code/resource/image/cold.png")
  img1.setPos(5, 0)
  let img2 = ui.Image.build(pageID + 'button2img2', button2)
  img2.source("/app/code/resource/image/right.png")
  img2.setPos(150, 0)

  // Temperature adjustment icons
  let img3 = ui.Image.build(pageID + 'button3img', button3)
  img3.source("/app/code/resource/image/jia.png")  // Plus icon
  img3.align(ui.Utils.ALIGN.CENTER, 0, 0)

  let img4 = ui.Image.build(pageID + 'button4img', button4)
  img4.source("/app/code/resource/image/jian.png")  // Minus icon
  img4.align(ui.Utils.ALIGN.CENTER, 0, 0)

  // Power button state icons
  let img5_1 = ui.Image.build(pageID + 'button5img1', button5)
  img5_1.source("/app/code/resource/image/icon_off.png")
  img5_1.align(ui.Utils.ALIGN.CENTER, 0, 0)

  let img5_2 = ui.Image.build(pageID + 'button5img2', button5)
  img5_2.source("/app/code/resource/image/icon_on.png")
  img5_2.align(ui.Utils.ALIGN.CENTER, 0, 0)

  // Back button icon
  let img6 = ui.Image.build(pageID + 'button6img', button6)
  img6.source("/app/code/resource/image/left.png")
  img6.align(ui.Utils.ALIGN.CENTER, 0, 0)

  page5Func.doOff = function () {
    theState = false
    label1.text("已关")
    button2.hide()
    label3.show()
    button3.addStyle(offStyle)
    button4.addStyle(offStyle)
    img5_2.hide()
    img5_1.show()
    button5.setBorderColor(0xaaaaaa)
    button5.bgColor(0x666666)
    button5.bgOpa(100)
  }
  page5Func.doOn = function () {
    theState = true
    label1.text("19°")
    label3.hide()
    button2.show()
    button3.addStyle(onStyle)
    button4.addStyle(onStyle)
    img5_1.hide()
    img5_2.show()
    button5.setBorderColor(0x2AA415)
    button5.bgColor(0x106d00)
    button5.bgOpa(30)
  }
  page5Func.doOff();
  button5.on(ui.Utils.EVENT.CLICK, () => {
    if (theState) {
      page5Func.doOff();
    } else {
      page5Func.doOn();
    }
  })
  button3.on(ui.Utils.EVENT.CLICK, () => {
    if (theState) {
      let nowNum = parseInt(label1.text().split('°')[0])
      if (nowNum < 30) {  // Max temperature limit
        nowNum++;
        label1.text(nowNum + '°')
      }
    }
  })
  button4.on(ui.Utils.EVENT.CLICK, () => {
    if (theState) {
      let nowNum = parseInt(label1.text().split('°')[0])
      if (nowNum > 16) {  // Min temperature limit
        nowNum--;
        label1.text(nowNum + '°')
      }
    }
  })
  button6.on(ui.Utils.EVENT.CLICK, () => {
    page4.load()
  })
  button2.on(ui.Utils.EVENT.CLICK, () => {
    page6.load(5)
  })
}
pageView.load = function (state) {
  // Set AC state based on parameter from previous page
  if (state) {
    page5Func.doOn()
  } else {
    page5Func.doOff()
  }
  ui.loadMain(theView)
}

export default pageView