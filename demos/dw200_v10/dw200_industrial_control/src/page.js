import ui from "../dxmodules/dxUi.js";
import viewUtils from './viewUtils.js'

const pageView = {}
let theView;


pageView.init = function () {
  let wendu = 200;
  let shijian = 20;

  theView = ui.View.build('pageMain', ui.Utils.LAYER.MAIN)
  theView.padAll(0)
  theView.borderWidth(0)
  theView.bgColor(0x000000)
  theView.setPos(0, 0)
  theView.setSize(480, 320)

  // Page header
  let theTop = ui.View.build('viewTop', theView)
  theTop.setSize(480, 60)
  theTop.setPos(0, 0)
  theTop.bgColor(0x4f4f84)
  theTop.borderWidth(0)
  theTop.padAll(0)
  theTop.radius(0)

  // Create text control
  let label1 = ui.Label.build('topTitle', theTop);
  // Set text content
  label1.text("智能烘干控制系统");
  label1.textColor(0xFFFFFF)
  // Center element relative to parent element
  label1.align(ui.Utils.ALIGN.CENTER, -40, 0);

  let label2 = ui.Label.build('topTime', theTop)
  // Set text content
  label2.text("2021-11-25\n10:09:49")
  label2.textColor(0xFFFFFF)
  label2.textAlign(2)
  // Center element relative to parent element
  label2.align(ui.Utils.ALIGN.CENTER, 180, 0);

  // // Set text font
  label1.textFont(viewUtils.font28Bold)
  label2.textFont(viewUtils.font16)

  // Main content
  let theMain = ui.View.build('viewMain', theView)
  theMain.setSize(480, 260)
  theMain.setPos(0, 60)
  theMain.bgColor(0xFFFFCC)
  theMain.borderWidth(0)
  theMain.padAll(0)
  theMain.radius(0)

  let label3 = ui.Label.build('mainLabel1', theMain)
  // Set text content
  label3.text("当前状态:设备正常")
  label3.textColor(0x6699FF)
  label3.textAlign(2)
  label3.setSize(480, 30)
  label3.setPos(0, 0)
  label3.textFont(viewUtils.font20)

  // Create style collection
  let iconStyle = ui.Style.build()
  iconStyle.bgColor(0x009933)
  iconStyle.padAll(0)
  iconStyle.borderWidth(0)
  iconStyle.radius(100)

  let fengjiIcon = ui.View.build('mainIcon1', theMain)
  fengjiIcon.setSize(20, 20)
  fengjiIcon.setPos(40, 40)
  fengjiIcon.addStyle(iconStyle)

  let type1 = ui.Label.build('mainType1', theMain)
  // Set text content
  type1.text("循环风机")
  type1.setPos(65, 40)
  type1.textFont(viewUtils.font16)

  let jiareIcon = ui.View.build('mainIcon2', theMain)
  jiareIcon.setSize(20, 20)
  jiareIcon.setPos(140, 40)
  jiareIcon.addStyle(iconStyle)

  let type2 = ui.Label.build('mainType2', theMain)
  // Set text content
  type2.text("加热输出")
  type2.setPos(165, 40)
  type2.textFont(viewUtils.font16)

  let paishiIcon = ui.View.build('mainIcon3', theMain)
  paishiIcon.setSize(20, 20)
  paishiIcon.setPos(240, 40)
  paishiIcon.addStyle(iconStyle)

  let type3 = ui.Label.build('mainType3', theMain)
  // Set text content
  type3.text("除湿风机")
  type3.setPos(265, 40)
  type3.textFont(viewUtils.font16)



  let theTable1 = ui.View.build('mainTable1', theMain)
  theTable1.setSize(350, 90)
  theTable1.setPos(20, 80)
  theTable1.padAll(0)

  let theTable2 = ui.View.build('mainTable2', theMain)
  theTable2.setSize(350, 70)
  theTable2.setPos(20, 172)
  theTable2.padAll(0)

  let theTable3 = ui.View.build('mainTable3', theMain)
  theTable3.setSize(350, 90)
  theTable3.setPos(20, 80)
  theTable3.padAll(0)

  let theTable4 = ui.View.build('mainTable4', theMain)
  theTable4.setSize(350, 70)
  theTable4.setPos(20, 172)
  theTable4.padAll(0)


  let table1Label1 = ui.Label.build('table1Label1', theTable1)
  // Set text content
  table1Label1.text("200.0")
  table1Label1.setPos(30, 5)
  table1Label1.textFont(viewUtils.font32)
  table1Label1.textColor(0xff0000)
  let table1Label2 = ui.Label.build('table1Label2', theTable1)
  // 
  table1Label2.text("℃")
  table1Label2.setPos(130, 20)
  table1Label2.textFont(viewUtils.font16)
  table1Label2.textColor(0xff0000)
  let table1Label3 = ui.Label.build('table1Label3', theTable1)
  // 
  table1Label3.text("测量温度")
  table1Label3.setPos(60, 40)
  table1Label3.textFont(viewUtils.font16)
  let table1Label4 = ui.Label.build('table1Label4', theTable1)
  // 
  table1Label4.text(wendu + '')
  table1Label4.setPos(200, 10)
  table1Label4.textFont(viewUtils.font32)
  let table1Label5 = ui.Label.build('table1Label5', theTable1)
  // 
  table1Label5.text("℃")
  table1Label5.setPos(260, 20)
  table1Label5.textFont(viewUtils.font20)
  let table1Label6 = ui.Label.build('table1Label6', theTable1)
  // 
  table1Label6.text("设定温度")
  table1Label6.setPos(210, 55)
  table1Label6.textFont(viewUtils.font16)

  let table2Label1 = ui.Label.build('table2Label1', theTable2)
  // 
  table2Label1.text("2")
  table2Label1.setPos(30, 5)
  table2Label1.textFont(viewUtils.font32)

  let table2Label2 = ui.Label.build('table2Label2', theTable2)
  // 
  table2Label2.text("Min")
  table2Label2.setPos(70, 20)
  table2Label2.textFont(viewUtils.font20)

  let table2Label3 = ui.Label.build('table2Label3', theTable2)
  // 
  table2Label3.text("12")
  table2Label3.setPos(120, 5)
  table2Label3.textFont(viewUtils.font32)

  let table2Label4 = ui.Label.build('table2Label4', theTable2)
  // 
  table2Label4.text("S")
  table2Label4.setPos(160, 20)
  table2Label4.textFont(viewUtils.font20)


  let table2Label5 = ui.Label.build('table2Label5', theTable2)
  // 
  table2Label5.text(shijian + '')
  table2Label5.setPos(230, 5)
  table2Label5.textFont(viewUtils.font32)

  let table2Label6 = ui.Label.build('table2Label6', theTable2)
  // 
  table2Label6.text("Min")
  table2Label6.setPos(270, 20)
  table2Label6.textFont(viewUtils.font20)

  let table2Label7 = ui.Label.build('table2Label7', theTable2)
  // 
  table2Label7.text("已用时间")
  table2Label7.setPos(70, 40)
  table2Label7.textFont(viewUtils.font16)

  let table2Label8 = ui.Label.build('table2Label8', theTable2)
  // 
  table2Label8.text("保温时间")
  table2Label8.setPos(240, 40)
  table2Label8.textFont(viewUtils.font16)

  // Create style collection
  let buttonStyle = ui.Style.build()
  // Add properties to collection
  buttonStyle.radius(10)
  buttonStyle.bgOpa(100)
  buttonStyle.bgColor(0xdddddd)
  buttonStyle.textColor(0x000000)
  buttonStyle.borderWidth(0)

  // Create button control
  let button1 = ui.Button.build('button1', theMain)
  button1.setSize(85, 40)
  button1.setPos(383, 10)
  button1.bgColor(0x009966)

  let button1Label = ui.Label.build('button1Label', button1)
  // Set text content
  button1Label.text("启动")
  button1Label.textFont(viewUtils.font16)
  // Center element relative to parent element
  button1Label.align(ui.Utils.ALIGN.CENTER, 0, 0)
  button1Label.textColor(0xffffff)

  // Create button control
  let button2 = ui.Button.build('button2', theMain)
  button2.setSize(85, 40)
  button2.setPos(383, 60)
  button2.bgColor(0xCC0033)

  let button2Label = ui.Label.build('button2Label', button2)
  // Set text content
  button2Label.text("停止")
  button2Label.textFont(viewUtils.font16)
  // Center element relative to parent element
  button2Label.align(ui.Utils.ALIGN.CENTER, 0, 0)
  button2Label.textColor(0xffffff)

  // Create button control
  let button3 = ui.Button.build('button3', theMain)
  button3.setSize(85, 40)
  button3.setPos(383, 110)

  let button3Label = ui.Label.build('button3Label', button3)
  // 
  button3Label.text("功能设置")
  button3Label.textFont(viewUtils.font16)
  // Element centered relative to parent element
  button3Label.align(ui.Utils.ALIGN.CENTER, 0, 0)

  // Create button control
  let button4 = ui.Button.build('button4', theMain)
  button4.setSize(85, 40)
  button4.setPos(383, 160)

  let button4Label = ui.Label.build('button4Label', button4)
  // 
  button4Label.text("温度曲线")
  button4Label.textFont(viewUtils.font16)
  // Element centered relative to parent element
  button4Label.align(ui.Utils.ALIGN.CENTER, 0, 0)

  // Create button control
  let button5 = ui.Button.build('button5', theMain)
  button5.setSize(85, 40)
  button5.setPos(383, 210)

  let button5Label = ui.Label.build('button5Label', button5)
  // 
  button5Label.text("报警画面")
  button5Label.textFont(viewUtils.font16)
  // Element centered relative to parent element
  button5Label.align(ui.Utils.ALIGN.CENTER, 0, 0)

  // Bind style to buttons
  button1.addStyle(buttonStyle)
  button2.addStyle(buttonStyle)
  button3.addStyle(buttonStyle)
  button4.addStyle(buttonStyle)
  button5.addStyle(buttonStyle)


  // Create button control
  let viewBtn1 = ui.View.build('viewBtn1', theMain)
  viewBtn1.setSize(85, 40)
  viewBtn1.setPos(383, 10)
  viewBtn1.bgColor(0x66CC99)
  viewBtn1.radius(10)

  let viewBtn11Label = ui.Label.build('viewBtn11Label', viewBtn1)
  // Set text content
  viewBtn11Label.text("启动")
  viewBtn11Label.textFont(viewUtils.font16)
  // Center element relative to parent element
  viewBtn11Label.align(ui.Utils.ALIGN.CENTER, 0, 0)
  viewBtn11Label.textColor(0xffffff)

  // Create button control
  let viewBtn2 = ui.View.build('viewBtn2', theMain)
  viewBtn2.setSize(85, 40)
  viewBtn2.setPos(383, 60)
  viewBtn2.bgColor(0xFFCCCC)
  viewBtn2.radius(10)

  let viewBtn2Label = ui.Label.build('viewBtn2Label', viewBtn2)
  // Set text content
  viewBtn2Label.text("停止")
  viewBtn2Label.textFont(viewUtils.font16)
  // Center element relative to parent element
  viewBtn2Label.align(ui.Utils.ALIGN.CENTER, 0, 0)
  viewBtn2Label.textColor(0xffffff)

  function doOpen() {
    label3.text("当前状态:设备正常")
    label3.textColor(0x6699FF)
    fengjiIcon.bgColor(0x009933)
    paishiIcon.bgColor(0x009933)
    jiareIcon.bgColor(0x009933)
    theTable1.show()
    theTable2.show()
    theTable3.hide()
    theTable4.hide()
    button1.hide()
    viewBtn2.hide()
    button2.show()
    viewBtn1.show()
  }
  function doClose() {
    label3.text("设备已经关闭")
    label3.textColor(0xFF0000)
    fengjiIcon.bgColor(0xdddddd)
    paishiIcon.bgColor(0xdddddd)
    jiareIcon.bgColor(0xdddddd)
    theTable1.hide()
    theTable2.hide()
    theTable3.show()
    theTable4.show()
    button2.hide()
    viewBtn1.hide()
    button1.show()
    viewBtn2.show()
  }

  doClose()

  let plate = ui.View.build('plateView', theView)
  plate.setSize(480, 320)
  plate.setPos(0, 0)
  plate.bgOpa(80)
  plate.borderWidth(0)
  plate.radius(0)
  plate.bgColor(0x000000)

  let plateView = ui.View.build('plateView1', plate)
  plateView.setSize(380, 200)
  plateView.borderWidth(0)
  plateView.align(ui.Utils.ALIGN.CENTER, 0, 0)
  plateView.padAll(0)


  let plateLabel1 = ui.Label.build('plateLabel1', plateView)
  // 
  plateLabel1.text("设置")
  plateLabel1.textFont(viewUtils.font36)
  plateLabel1.setSize(380, 30)
  plateLabel1.setPos(0, 0)
  plateLabel1.textAlign(2)

  let plateLabel2 = ui.Label.build('plateLabel2', plateView)
  // 
  plateLabel2.text("温度")
  plateLabel2.textFont(viewUtils.font24)
  plateLabel2.setSize(190, 30)
  plateLabel2.setPos(0, 40)
  plateLabel2.textAlign(2)


  let plateLabel4 = ui.Label.build('plateLabel4', plateView)
  // 
  plateLabel4.text(wendu + "")
  plateLabel4.textFont(viewUtils.font58)
  plateLabel4.textColor(0xCC0033)
  plateLabel4.setSize(190, 70)
  plateLabel4.setPos(0, 70)
  plateLabel4.textAlign(2)

  let plateLabel3 = ui.Label.build('plateLabel3', plateView)
  // 
  plateLabel3.text("时间")
  plateLabel3.textFont(viewUtils.font24)
  plateLabel3.setSize(190, 30)
  plateLabel3.setPos(190, 40)
  plateLabel3.textAlign(2)

  let plateLabel5 = ui.Label.build('plateLabel5', plateView)
  // 
  plateLabel5.text(shijian + "")
  plateLabel5.textFont(viewUtils.font58)
  plateLabel5.textColor(0x009966)
  plateLabel5.setSize(190, 70)
  plateLabel5.setPos(190, 70)
  plateLabel5.textAlign(2)

  // Create button control
  let plateBtn1 = ui.Button.build('plateBtn1', plate)
  plateBtn1.setSize(45, 45)
  plateBtn1.radius(100)
  plateBtn1.setPos(70, 190)
  plateBtn1.bgColor(0xFF0000)

  let wendujian = ui.Image.build('wendujian', plateBtn1)
  wendujian.source("/app/code/resource/image/jian.png")
  // Element centered relative to parent element
  wendujian.align(ui.Utils.ALIGN.CENTER, 0, 0)

  // Create button control
  let plateBtn2 = ui.Button.build('plateBtn2', plate)
  plateBtn2.setSize(45, 45)
  plateBtn2.radius(100)
  plateBtn2.setPos(150, 190)
  plateBtn2.bgColor(0xFF0000)

  let wendujia = ui.Image.build('wendujia', plateBtn2)
  wendujia.source("/app/code/resource/image/jia.png")
  // Element centered relative to parent element
  wendujia.align(ui.Utils.ALIGN.CENTER, 0, 0)

  // Create button control
  let plateBtn3 = ui.Button.build('plateBtn3', plate)
  plateBtn3.setSize(45, 45)
  plateBtn3.radius(100)
  plateBtn3.setPos(260, 190)

  let shijianjian = ui.Image.build('shijianjian', plateBtn3)
  shijianjian.source("/app/code/resource/image/jian.png")
  // Element centered relative to parent element
  shijianjian.align(ui.Utils.ALIGN.CENTER, 0, 0)
  // Create button control
  let plateBtn4 = ui.Button.build('plateBtn4', plate)
  plateBtn4.setSize(45, 45)
  plateBtn4.radius(100)
  plateBtn4.setPos(340, 190)

  let shijianjia = ui.Image.build('shijianjia', plateBtn4)
  shijianjia.source("/app/code/resource/image/jia.png")
  // Element centered relative to parent element
  shijianjia.align(ui.Utils.ALIGN.CENTER, 0, 0)


  // Create button control
  let closeBtn = ui.Button.build('closeBtn', plate)
  closeBtn.setSize(30, 30)
  closeBtn.radius(100)
  closeBtn.setPos(402, 28)
  closeBtn.bgColor(0xFF0000)

  let closeimg = ui.Image.build('closeimg', closeBtn)
  closeimg.source("/app/code/resource/image/close.png")
  // Element centered relative to parent element
  closeimg.align(ui.Utils.ALIGN.CENTER, 0, 0)

  plate.hide()

  button1.on(ui.Utils.EVENT.CLICK, () => {
    doOpen()
  })
  button2.on(ui.Utils.EVENT.CLICK, () => {
    doClose()
  })
  button3.on(ui.Utils.EVENT.CLICK, () => {
    plate.show()
  })
  closeBtn.on(ui.Utils.EVENT.CLICK, () => {
    table1Label4.text(wendu + '')
    table2Label5.text(shijian + '')
    plate.hide()
  })
  plateBtn1.on(ui.Utils.EVENT.CLICK, () => {
    wendu = wendu - 5
    plateLabel4.text(wendu + "")
  })
  plateBtn2.on(ui.Utils.EVENT.CLICK, () => {
    wendu = wendu + 5
    plateLabel4.text(wendu + "")
  })
  plateBtn3.on(ui.Utils.EVENT.CLICK, () => {
    shijian--
    plateLabel5.text(shijian + "")
  })
  plateBtn4.on(ui.Utils.EVENT.CLICK, () => {
    shijian++
    plateLabel5.text(shijian + "")
  })

}
pageView.load = function () {
  // Load screen
  ui.loadMain(theView)
}

export default pageView