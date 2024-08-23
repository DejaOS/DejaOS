import ui from "../dxmodules/dxUi.js";
import std from "../dxmodules/dxStd.js";
import viewUtils from './viewUtils.js'
import page1 from './page1.js'
import page3 from './page3.js'
import page4 from './page4.js'

const pageView = {}
const pageID = 'page2'
let theView;
let timer;

function getTime () {
  const weekArr = ['周日', '周一', '周二', '周三', '周四', '周五', '周六']
  const now = new Date();
  const weekDay = now.getDay()
  const year = now.getFullYear();
  const month = ('0' + (now.getMonth() + 1)).slice(-2);
  const day = ('0' + now.getDate()).slice(-2);
  const hours = ('0' + now.getHours()).slice(-2);
  const minutes = ('0' + now.getMinutes()).slice(-2);
  const seconds = ('0' + now.getSeconds()).slice(-2);
  const milliseconds = ('0' + now.getMilliseconds()).slice(-3);
  // return year + '-' + month + '-' + day + ' ' + hours + ':' + minutes + ':' + seconds + '.' + milliseconds;
  return {
    date: month + '/' + day,
    time: hours + ':' + minutes,
    week: weekArr[weekDay]
  }
}
pageView.init = function () {

  theView = ui.View.build(pageID, ui.Utils.LAYER.MAIN)
  theView.padAll(0)
  theView.borderWidth(0)
  theView.bgColor(0x000000)
  theView.setPos(0, 0)
  theView.setSize(480, 320)

  let img = ui.Image.build(pageID + 'img1', theView)
  img.source("/app/code/resource/image/bg1.png")
  img.setPos(0, 0)

  // 创建文本控件
  let label1 = ui.Label.build(pageID + 'label1', theView)
  let label2 = ui.Label.build(pageID + 'label2', theView)
  // 设置文本内容
  label1.setPos(100, 30)
  label1.setSize(280, 100)
  label1.textColor(0xffffff)
  label1.textAlign(2)
  label2.setPos(100, 140)
  label2.setSize(280, 60)
  label2.textColor(0xffffff)
  label2.textAlign(2)

  // 设置文本字体
  label1.textFont(viewUtils.font88)
  label2.textFont(viewUtils.font28)


  std.setInterval(() => {
    let theTime = getTime()
    label1.text(theTime.time)
    label2.text(theTime.date + " " + theTime.week)
  }, 1000)

  let view1 = ui.View.build(pageID + 'view1', theView)
  view1.setPos(0, 0)
  view1.setSize(240, 320)
  view1.bgOpa(0)
  view1.borderWidth(0)
  let view2 = ui.View.build(pageID + 'view2', theView)
  view2.setPos(240, 0)
  view2.setSize(240, 320)
  view2.bgOpa(0)
  view2.borderWidth(0)

  
  view1.on(ui.Utils.EVENT.CLICK, () => {
    std.clearTimeout(timer)

    page3.load()
  })
  view2.on(ui.Utils.EVENT.CLICK, () => {
    std.clearTimeout(timer)

    page4.load()
  })
}

pageView.load = function () {
  // 加载屏幕
  ui.loadMain(theView)

  timer = std.setTimeout(() => {

    page1.load()

  }, 5000)
}

export default pageView