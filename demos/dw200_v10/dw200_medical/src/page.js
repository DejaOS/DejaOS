import ui from "../dxmodules/dxUi.js"
import viewUtils from './viewUtils.js'
import std from "../dxmodules/dxStd.js";

const pageView = {}
let theView;

pageView.init = function () {

  theView = ui.View.build('pageMain', ui.Utils.LAYER.MAIN)
  theView.padAll(0)
  theView.borderWidth(0)
  theView.bgColor(0x000000)
  theView.setPos(0, 0)
  theView.setSize(480, 320)

  // Heart rate
  let theT = ui.View.build('view1', theView)
  theT.setSize(242, 110)
  theT.setPos(0, 0)
  theT.bgOpa(0)
  theT.borderWidth(0)
  theT.padAll(0)
  theT.radius(0)

  // Blood pressure
  let theC = ui.View.build('view2', theView)
  theC.setSize(242, 105)
  theC.setPos(0, 110)
  theC.bgOpa(0)
  theC.borderWidth(0)
  theC.padAll(0)
  theC.radius(0)

  // Respiratory rate
  let theB = ui.View.build('view3', theView)
  theB.setSize(242, 105)
  theB.setPos(0, 215)
  theB.bgOpa(0)
  theB.borderWidth(0)
  theB.padAll(0)
  theB.radius(0)

  let line1 = ui.Line.build('Line1', theT)
  line1.lineColor(0x3F85FF)
  line1.lineWidth(2)

  let points1 = [
    [0, 80], [10, 70], [20, 80], [30, 90], [40, 90],
    [50, 90], [60, 90], [70, 80], [80, 90], [90, 93],
    [100, 30], [110, 100], [120, 90], [130, 80], [140, 80],
    [150, 90], [160, 90], [170, 90], [180, 80], [190, 70],
    [200, 80], [210, 90], [220, 93], [230, 30], [240, 100]
  ];

  line1.setPoints(points1, points1.length);

  let line3 = ui.Line.build('Line3', theB)
  line3.lineColor(0xFFCC99)
  line3.lineWidth(2)

  let points3 = [
    [0, 60], [10, 40], [20, 50], [30, 70], [40, 80],
    [50, 60], [60, 40], [70, 50], [80, 70], [90, 80],
    [100, 60], [110, 40], [120, 50], [130, 70], [140, 80],
    [150, 60], [160, 40], [170, 50], [180, 70], [190, 80],
    [200, 60], [210, 40], [220, 50], [230, 70], [240, 80]
  ];

  line3.setPoints(points3, points3.length);


  let line4 = ui.Line.build('Line4', theC)
  line4.lineColor(0x99CCCC)
  line4.lineWidth(2)

  let points4 = [
    [0, 60], [10, 40], [20, 50], [30, 70], [40, 80],
    [50, 60], [60, 40], [70, 50], [80, 70], [90, 80],
    [100, 60], [110, 40], [120, 50], [130, 70], [140, 80],
    [150, 60], [160, 40], [170, 50], [180, 70], [190, 80],
    [200, 60], [210, 40], [220, 50], [230, 70], [240, 80]
  ];
  points4.forEach(ele => {
    ele[1] = Math.floor(Math.random() * (50 - 30 + 1)) + 30;
  })

  line4.setPoints(points4, points4.length);

  let line5 = ui.Line.build('Line5', theC)
  line5.lineColor(0x99CCCC)
  line5.lineWidth(2)

  let points5 = [
    [0, 60], [10, 40], [20, 50], [30, 70], [40, 80],
    [50, 60], [60, 40], [70, 50], [80, 70], [90, 80],
    [100, 60], [110, 40], [120, 50], [130, 70], [140, 80],
    [150, 60], [160, 40], [170, 50], [180, 70], [190, 80],
    [200, 60], [210, 40], [220, 50], [230, 70], [240, 80]
  ];
  points5.forEach(ele => {
    ele[1] = Math.floor(Math.random() * (90 - 70 + 1)) + 70;
  })

  line5.setPoints(points5, points5.length);


  function doChange1(points, type) {
    let theNewArr = []
    let theLastNum = type == 'High' ? Math.floor(Math.random() * (90 - 70 + 1)) + 70 : Math.floor(Math.random() * (50 - 30 + 1)) + 30;
    points.forEach((ele, index) => {
      if (index + 1 === points.length) {
        theNewArr[index] = [ele[0], theLastNum]
      } else {
        theNewArr[index] = [ele[0], points[index + 1][1]]
      }
    })
    return theNewArr
  }

  function doChange2(points) {
    let theNewArr = []
    points.forEach((ele, index) => {
      if (index + 1 === points.length) {
        theNewArr[index] = [ele[0], points[0][1]]
      } else {
        theNewArr[index] = [ele[0], points[index + 1][1]]
      }
    })
    return theNewArr
  }
  function run1() {
    points1 = doChange2(points1)
    line1.setPoints(points1, points1.length);
    std.setTimeout(() => {
      run1()
    }, 500)
  }
  function run2() {
    points4 = doChange1(points4, 'Low')
    line4.setPoints(points4, points4.length);

    points5 = doChange1(points5, 'High')
    line5.setPoints(points5, points5.length);
    std.setTimeout(() => {
      run2()
    }, 800)
  }
  function run3() {
    points3 = doChange2(points3)
    line3.setPoints(points3, points3.length);
    std.setTimeout(() => {
      run3()
    }, 1500)
  }
  run1();
  run2();
  run3();

  let view4 = ui.View.build('view4', theView)
  view4.setSize(240, 110)
  view4.setPos(240, 0)
  view4.bgOpa(0)
  view4.borderWidth(0)
  view4.padAll(0)
  view4.radius(0)

  // Create text control
  let view4Label1 = ui.Label.build('view4Label1', view4);
  // 
  view4Label1.text("60");
  view4Label1.textColor(0x4BC031)
  view4Label1.setPos(50, 35)
  view4Label1.textFont(viewUtils.font52)
  // Create text control
  let view4Label2 = ui.Label.build('view4Label2', view4);
  // 
  view4Label2.text("98");
  view4Label2.textColor(0x44DFE1)
  view4Label2.setPos(150, 35)
  view4Label2.textFont(viewUtils.font52)

  // Create text control
  let view4Label3 = ui.Label.build('view4Label3', view4);
  // 
  view4Label3.text("心率/bmp");
  view4Label3.textColor(0x4BC031)
  view4Label3.setPos(50, 15)
  view4Label3.textFont(viewUtils.font16)

  // Create text control
  let view4Label4 = ui.Label.build('view4Label4', view4);
  // 
  view4Label4.text("血氧/%");
  view4Label4.textColor(0x44DFE1)
  view4Label4.setPos(150, 15)
  view4Label4.textFont(viewUtils.font16)

  let view4view1 = ui.View.build('view4view1', view4)
  view4view1.setSize(120, 105)
  view4view1.setPos(0, 0)
  view4view1.bgOpa(0)
  view4view1.borderWidth(0)
  view4view1.padAll(0)
  view4view1.radius(0)

  let view4view2 = ui.View.build('view4view2', view4)
  view4view2.setSize(120, 105)
  view4view2.setPos(120, 0)
  view4view2.bgOpa(0)
  view4view2.borderWidth(0)
  view4view2.padAll(0)
  view4view2.radius(0)


  let view5 = ui.View.build('view5', theView)
  view5.setSize(240, 105)
  view5.setPos(240, 105)
  view5.bgOpa(0)
  view5.borderWidth(0)
  view5.padAll(0)
  view5.radius(0)

  // Create text control
  let view5Label1 = ui.Label.build('view5Label1', view5);
  // 
  view5Label1.text("120/80");
  view5Label1.textColor(0xDA42CB)
  // Element is centered relative to parent element
  view5Label1.align(ui.Utils.ALIGN.CENTER, 0, 15);
  view5Label1.textFont(viewUtils.font52)


  // Create text control
  let view5Label2 = ui.Label.build('view5Label2', view5);
  // 
  view5Label2.text("血压/mmHg");
  view5Label2.textColor(0xDA42CB)
  view5Label2.setPos(50, 15)
  view5Label2.textFont(viewUtils.font16)

  let view5view1 = ui.View.build('view5view1', view5)
  view5view1.setSize(240, 105)
  view5view1.setPos(0, 0)
  view5view1.bgOpa(0)
  view5view1.borderWidth(0)
  view5view1.padAll(0)
  view5view1.radius(0)

  let view6 = ui.View.build('view6', theView)
  view6.setSize(240, 105)
  view6.setPos(240, 215)
  view6.bgOpa(0)
  view6.borderWidth(0)
  view6.padAll(0)
  view6.radius(0)

  // Create text control
  let view6Label1 = ui.Label.build('view6Label1', view6);
  // 
  view6Label1.text("25");
  view6Label1.textColor(0xE7C86D)
  view6Label1.setPos(50, 30)
  view6Label1.textFont(viewUtils.font52)
  // Create text control
  let view6Label2 = ui.Label.build('view6Label2', view6);
  // 
  view6Label2.text("36");
  view6Label2.textColor(0x54A0D4)
  view6Label2.setPos(150, 30)
  view6Label2.textFont(viewUtils.font52)

  // Create text control
  let view6Label3 = ui.Label.build('view6Label3', view6);
  // 
  view6Label3.text("呼吸/RR");
  view6Label3.textColor(0xE7C86D)
  view6Label3.setPos(50, 10)
  view6Label3.textFont(viewUtils.font16)

  // Create text control
  let view6Label4 = ui.Label.build('view6Label4', view6);
  // 
  view6Label4.text("体温/℃");
  view6Label4.textColor(0x54A0D4)
  view6Label4.setPos(150, 10)
  view6Label4.textFont(viewUtils.font16)

  let view6view1 = ui.View.build('view6view1', view6)
  view6view1.setSize(120, 105)
  view6view1.setPos(0, 0)
  view6view1.bgOpa(0)
  view6view1.borderWidth(0)
  view6view1.padAll(0)
  view6view1.radius(0)

  let view6view2 = ui.View.build('view6view2', view6)
  view6view2.setSize(120, 105)
  view6view2.setPos(120, 0)
  view6view2.bgOpa(0)
  view6view2.borderWidth(0)
  view6view2.padAll(0)
  view6view2.radius(0)

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
  plateView.bgColor(0xFFFFCC)
  plateView.padAll(0)

  let plateLabel1 = ui.Label.build('plateLabel1', plateView)
  // 
  plateLabel1.text("报警设置")
  plateLabel1.textFont(viewUtils.font36)
  plateLabel1.setSize(380, 30)
  plateLabel1.setPos(0, 0)
  plateLabel1.textAlign(2)

  let theData = {
    xinlvHigh: 120,
    xinlvLow: 50,
    xueyangHigh: 100,
    xueyangLow: 90,
    gaoyaHigh: 140,
    gaoyaLow: 80,
    diyaHigh: 90,
    diyaLow: 60,
    huxiHigh: 40,
    huxiLow: 10,
    tiwenHigh: 38,
    tiwenLow: 35,
  }
  let theType = 'xinlv'

  let plateLabel2 = ui.Label.build('plateLabel2', plateView)
  // 
  plateLabel2.text("上限")
  plateLabel2.textFont(viewUtils.font24)
  plateLabel2.setSize(190, 30)
  plateLabel2.setPos(0, 40)
  plateLabel2.textAlign(2)


  let plateLabel4 = ui.Label.build('plateLabel4', plateView)
  // 
  plateLabel4.text(theData.xinlvHigh + "")
  plateLabel4.textFont(viewUtils.font58)
  plateLabel4.textColor(0xCC0033)
  plateLabel4.setSize(190, 70)
  plateLabel4.setPos(0, 70)
  plateLabel4.textAlign(2)

  let plateLabel3 = ui.Label.build('plateLabel3', plateView)
  // 
  plateLabel3.text("下限")
  plateLabel3.textFont(viewUtils.font24)
  plateLabel3.setSize(190, 30)
  plateLabel3.setPos(190, 40)
  plateLabel3.textAlign(2)

  let plateLabel5 = ui.Label.build('plateLabel5', plateView)
  // 
  plateLabel5.text(theData.xinlvLow + "")
  plateLabel5.textFont(viewUtils.font58)
  plateLabel5.textColor(0xFF6600)
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
  // Element is centered relative to parent element
  wendujian.align(ui.Utils.ALIGN.CENTER, 0, 0)

  // Create button control
  let plateBtn2 = ui.Button.build('plateBtn2', plate)
  plateBtn2.setSize(45, 45)
  plateBtn2.radius(100)
  plateBtn2.setPos(150, 190)
  plateBtn2.bgColor(0xFF0000)

  let wendujia = ui.Image.build('wendujia', plateBtn2)
  wendujia.source("/app/code/resource/image/jia.png")
  // Element is centered relative to parent element
  wendujia.align(ui.Utils.ALIGN.CENTER, 0, 0)

  // Create button control
  let plateBtn3 = ui.Button.build('plateBtn3', plate)
  plateBtn3.setSize(45, 45)
  plateBtn3.radius(100)
  plateBtn3.setPos(260, 190)
  plateBtn3.bgColor(0xFF9933)

  let shijianjian = ui.Image.build('shijianjian', plateBtn3)
  shijianjian.source("/app/code/resource/image/jian.png")
  // Element is centered relative to parent element
  shijianjian.align(ui.Utils.ALIGN.CENTER, 0, 0)

  // Create button control
  let plateBtn4 = ui.Button.build('plateBtn4', plate)
  plateBtn4.setSize(45, 45)
  plateBtn4.radius(100)
  plateBtn4.setPos(340, 190)
  plateBtn4.bgColor(0xFF9933)

  let shijianjia = ui.Image.build('shijianjia', plateBtn4)
  shijianjia.source("/app/code/resource/image/jia.png")
  // Element is centered relative to parent element
  shijianjia.align(ui.Utils.ALIGN.CENTER, 0, 0)

  plate.hide()

  // Create button control
  let closeBtn = ui.Button.build('closeBtn', plate)
  closeBtn.setSize(30, 30)
  closeBtn.radius(100)
  closeBtn.setPos(402, 28)
  closeBtn.bgColor(0xFF0000)

  let closeimg = ui.Image.build('closeimg', closeBtn)
  closeimg.source("/app/code/resource/image/close.png")
  // Element is centered relative to parent element
  closeimg.align(ui.Utils.ALIGN.CENTER, 0, 0)
  closeBtn.on(ui.Utils.EVENT.CLICK, () => {
    plate.hide()
  })

  view4view1.on(ui.Utils.EVENT.CLICK, () => {
    plateLabel1.text("心率报警")
    theType = "xinlv"
    plateLabel4.text(theData.xinlvHigh + "")
    plateLabel5.text(theData.xinlvLow + "")
    plate.show()
  })
  view4view2.on(ui.Utils.EVENT.CLICK, () => {
    plateLabel1.text("血氧报警")
    theType = "xueyang"
    plateLabel4.text(theData.xueyangHigh + "")
    plateLabel5.text(theData.xueyangLow + "")
    plate.show()
  })
  view5view1.on(ui.Utils.EVENT.CLICK, () => {
    plateLabel1.text("血压报警")
    theType = "xueya"
    plateLabel4.text(theData.gaoyaHigh + "")
    plateLabel5.text(theData.gaoyaLow + "")
    plate.show()
  })
  view6view1.on(ui.Utils.EVENT.CLICK, () => {
    plateLabel1.text("呼吸报警")
    theType = "huxi"
    plateLabel4.text(theData.huxiHigh + "")
    plateLabel5.text(theData.huxiLow + "")
    plate.show()
  })
  view6view2.on(ui.Utils.EVENT.CLICK, () => {
    plateLabel1.text("体温报警")
    theType = "tiwen"
    plateLabel4.text(theData.tiwenHigh + "")
    plateLabel5.text(theData.tiwenLow + "")
    plate.show()
  })

  plateBtn1.on(ui.Utils.EVENT.CLICK, () => {
    theData[theType + 'High']--
    plateLabel4.text(theData[theType + 'High'] + "")
  })
  plateBtn2.on(ui.Utils.EVENT.CLICK, () => {
    theData[theType + 'High']++
    plateLabel4.text(theData[theType + 'High'] + "")
  })
  plateBtn3.on(ui.Utils.EVENT.CLICK, () => {
    theData[theType + 'Low']--
    plateLabel5.text(theData[theType + 'Low'] + "")
  })
  plateBtn4.on(ui.Utils.EVENT.CLICK, () => {
    theData[theType + 'Low']++
    plateLabel5.text(theData[theType + 'Low'] + "")
  })
}
pageView.load = function () {
  // Load screen
  ui.loadMain(theView)
}

export default pageView