//build:20240524
/**
 * UI的基类，其它控件都会继承，子类不允许修改对应的函数行为,这个js不需要直接引用和使用
 */
import utils from "./uiUtils.js"
import logger from './dxLogger.js'
import * as os from "os"
const uibase = {}
/**
* 修改或获取控件的宽度
* @param {number} w 非必填，如果不填是获取宽度，否则就是修改宽度 
*/
uibase.width = function (w) {
     if (!utils.validateNumber(w)) {
          return this.obj.getWidth()
     }
     this.obj.lvObjSetWidth(w)
}
/**
* 修改或获取控件的高度
* @param {number} h 非必填，如果不填就是获取高度，否则就是修改高度 
*/
uibase.height = function (h) {
     if (!utils.validateNumber(h)) {
          return this.obj.getHeight()
     }
     this.obj.lvObjSetHeight(h)
}
/**
 * 获取去除边框、内边距的宽度
 * @returns 
 */
uibase.contentWidth = function () {
     return this.obj.lvObjGetContentWidth()
}
/**
 * 获取去除边框、内边距的高度
 * @returns 
 */
uibase.contentHeight = function () {
     return this.obj.lvObjGetContentHeight()
}
/**
 * 获取上方滚动距离
 * @returns 
 */
uibase.scrollTop = function () {
     return this.obj.getScrollTop()
}
/**
 * 获取下方滚动距离
 * @returns 
 */
uibase.scrollBottom = function () {
     return this.obj.getScrollBottom()
}
/**
 * 获取左方滚动距离
 * @returns 
 */
uibase.scrollLeft = function () {
     return this.obj.getScrollLeft()
}
/**
 * 获取右方滚动距离
 * @returns 
 */
uibase.scrollRight = function () {
     return this.obj.getScrollRight()
}
/**
* 修改控件的宽度和高度
* @param {number} w 必填 
* @param {number} h 必填 
*/
uibase.setSize = function (w, h) {
     let err = 'dxui.setSize: width or height should not be empty'
     utils.validateNumber(w, err)
     utils.validateNumber(h, err)
     this.obj.lvObjSetSize(w, h)
}
/**
* 修改或获取控件相当于父对象的x坐标
* @param {number} x 非必填，如果不填就是获取x坐标，否则就是修改x坐标 
*/
uibase.x = function (x) {
     if (!utils.validateNumber(x)) {
          return this.obj.getX()
     }
     this.obj.lvObjSetX(x)
}
/**
* 修改或获取控件相当于父对象的x坐标
* @param {number} y 非必填，如果不填就是获取y坐标，否则就是修改y坐标 
*/
uibase.y = function (y) {
     if (!utils.validateNumber(y)) {
          return this.obj.getY()
     }
     this.obj.lvObjSetY(y)
}
/**
* 修改控件相对父对象的x和y坐标
* @param {number} x 必填 
* @param {number} y 必填 
*/
uibase.setPos = function (x, y) {
     let err = 'dxui.setPos: x or y should not be empty'
     utils.validateNumber(x, err)
     utils.validateNumber(y, err)
     this.obj.lvObjSetPos(x, y)
}
/**
 * 把控件移动到最上层，相当于父对象最后一个创建的子控件，会覆盖其它所有子控件
 */
uibase.moveForeground = function () {
     this.obj.moveForeground()
}
/**
 * 把控件移动到最底层，相当于父对象第一个创建的子控件，会被其它所有子控件覆盖
 */
uibase.moveBackground = function () {
     this.obj.moveBackground()
}
/**
 * 订阅事件，支持的事件类型参考utils.EVENT
 * @param {number} type 枚举utils.EVENT,比如点击、长按等
 * @param {function} cb 事件触发的回调函数（不能是匿名函数）
 * @param {object} ud 用户数据
 */
uibase.on = function (type, cb, ud) {
     this.obj.addEventCb(() => {
          if (cb) {
               cb({ target: this, ud: ud })
          }
     }, type)
}
/**
 * 发送事件，比如模拟点击按钮，可以给按钮发送CLICK事件
 * @param {number} type 枚举utils.EVENT,比如点击、长按等
 */
uibase.send = function (type) {
     NativeObject.APP.NativeComponents.NativeEvent.lvEventSend(this.obj, type)
}
/**
 * 隐藏ui对象
 */
uibase.hide = function () {
     if (!this.obj.hasFlag(1)) {
          this.obj.lvObjAddFlag(1);
     }
}
/**
 * 判断是否隐藏
 * @returns 
 */
uibase.isHide = function () {
     return this.obj.hasFlag(1);
}
/**
 * 显示已经隐藏的ui对象
 */
uibase.show = function () {
     if (this.obj.hasFlag(1)) {
          this.obj.lvObjClearFlag(1);
     }
}
/**
 * 禁启用对象
 * @param {*} en false/true，true是禁用，false是启用
 */
uibase.disable = function (en) {
     if (en) {
          this.obj.addState(utils.STATE.DISABLED)
     } else {
          this.obj.clearState(utils.STATE.DISABLED)
     }
}
/**
 * 是否可点击对象
 * @param {*} en false/true，true是可点击，false是不可点击
 */
uibase.clickable = function (en) {
     if (en) {
          this.obj.lvObjAddFlag(utils.OBJ_FLAG.CLICKABLE)
     } else {
          this.obj.lvObjClearFlag(utils.OBJ_FLAG.CLICKABLE)
     }
}
/**
 * 判断是否禁启用
 * @returns true是已禁用，false是已启用
 */
uibase.isDisable = function () {
     return this.obj.hasState(utils.STATE.DISABLED)
}
/**
 * 聚焦对象
 * @param {*} en false/true，true是聚焦，false是取消聚焦
 */
uibase.focus = function (en) {
     if (en) {
          this.obj.addState(utils.STATE.FOCUSED)
     } else {
          this.obj.clearState(utils.STATE.FOCUSED)
     }
}
/**
 * 判断是否聚焦
 * @returns true是已聚焦，false是没聚焦
 */
uibase.isFocus = function () {
     return this.obj.hasState(utils.STATE.FOCUSED)
}

/**
 * 设置ui的样式，可以通过一个个样式单独设置，也可以先定义样式对象，然后和ui对象绑定
 * 给ui对象和样式对象绑定，可以绑定到不同的部分或不同的状态
 * @param {object} style  style.js build函数返回的对象
 * @param {number} type  参考utils.STYLE 非必填，缺省是和对象自身绑定
 */
uibase.addStyle = function (style, type) {
     if (!style || !style.obj) {
          throw new Error('dxui.addStyle: style should not be null')
     }
     if (!utils.validateNumber(type)) {
          type = 0
     }
     this.obj.lvObjAddStyle(style.obj, type);
}
/**
* 设置左右上下的内边距都为一个值
* @param {number} pad 边距值
* @param {number} type  参考utils.STYLE 非必填，缺省是和对象自身绑定
*/
uibase.padAll = function (pad, type) {
     if (!utils.validateNumber(type)) {
          type = 0
     }
     this.obj.lvObjSetStylePadAll(pad, type)
}
/**
 * 设置/获取右内边距都为一个值
 * @param {number} pad 边距值
 * @param {number} type  参考utils.STYLE 非必填，缺省是和对象自身绑定
 */
uibase.padRight = function (pad, type) {
     if (!utils.validateNumber(type)) {
          type = 0
     }
     if (!utils.validateNumber(pad)) {
          return this.obj.getStylePadRight(type)
     }
     this.obj.setStylePadRight(pad, type)
}
/**
  * 设置/获取左内边距都为一个值
  * @param {number} pad 边距值
  * @param {number} type  参考utils.STYLE 非必填，缺省是和对象自身绑定
  */
uibase.padLeft = function (pad, type) {
     if (!utils.validateNumber(type)) {
          type = 0
     }
     if (!utils.validateNumber(pad)) {
          return this.obj.getStylePadLeft(type)
     }
     this.obj.setStylePadLeft(pad, type)
}
/**
  * 设置/获取上内边距都为一个值
  * @param {number} pad 边距值
  * @param {number} type  参考utils.STYLE 非必填，缺省是和对象自身绑定
  */
uibase.padTop = function (pad, type) {
     if (!utils.validateNumber(type)) {
          type = 0
     }
     if (!utils.validateNumber(pad)) {
          return this.obj.getStylePadTop(type)
     }
     this.obj.setStylePadTop(pad, type)
}
/**
  * 设置/获取下内边距都为一个值
  * @param {number} pad 边距值
  * @param {number} type  参考utils.STYLE 非必填，缺省是和对象自身绑定
  */
uibase.padBottom = function (pad, type) {
     if (!utils.validateNumber(type)) {
          type = 0
     }
     if (!utils.validateNumber(pad)) {
          return this.obj.getStylePadBottom(type)
     }
     this.obj.setStylePadBottom(pad, type)
}
/**
 * 设置/获取边框宽度
 * @param {number} w 
 * @param {number} type  参考utils.STYLE 非必填，缺省是和对象自身绑定
 */
uibase.borderWidth = function (w, type) {
     if (!utils.validateNumber(type)) {
          type = 0
     }
     if (!utils.validateNumber(w)) {
          return this.obj.lvObjGetStyleBorderWidth(type)
     }
     this.obj.lvObjSetStyleBorderWidth(w, type)
}
/**
 * 设置边框颜色
 * @param {number} color  支持数字类型：比如0x34ffaa；字符串类型(#开头),比如:'#34ffaa'
 * @param {number} type  参考utils.STYLE 非必填，缺省是和对象自身绑定
 */
uibase.setBorderColor = function (color, type) {
     if (!utils.validateNumber(type)) {
          type = 0
     }
     this.obj.setStyleBorderColor(utils.colorParse(color), type)
}
/**
 * 设置边圆角
 * @param {number} r 
 * @param {number} type  参考utils.STYLE 非必填，缺省是和对象自身绑定
 */
uibase.radius = function (r, type) {
     if (!utils.validateNumber(type)) {
          type = 0
     }
     this.obj.lvObjSetStyleRadius(r, type)
}
/**
 * 设置背景透明度，值范围是0-100，值越小越好
 * @param {number} opa 必须是0-100
 * @param {number} type  参考utils.STYLE 非必填，缺省是和对象自身绑定
 */
uibase.bgOpa = function (opa, type) {
     if (!utils.validateNumber(type)) {
          type = 0
     }
     this.obj.lvObjSetStyleBgOpa(utils.OPA_MAPPING(opa), type)
}
/**
 * 设置背景颜色
 * @param {any} color 支持数字类型：比如0x34ffaa；字符串类型(#开头),比如:'#34ffaa'
 * @param {number} type  参考utils.STYLE 非必填，缺省是和对象自身绑定
 */
uibase.bgColor = function (color, type) {
     if (!utils.validateNumber(type)) {
          type = 0
     }
     this.obj.lvObjSetStyleBgColor(utils.colorParse(color), type)
}
/**
 * 设置阴影
 * @param {number} width 阴影宽度
 * @param {number} x 水平偏移
 * @param {number} y 垂直偏移
 * @param {number} spread 扩散距离
 * @param {number} color 颜色
 * @param {number} opa 透明度，必须是0-100
 * @param {number} type 参考utils.STYLE 非必填，缺省是和对象自身绑定
 */
uibase.shadow = function (width, x, y, spread, color, opa, type) {
     if (!utils.validateNumber(type)) {
          type = 0
     }
     this.obj.lvObjSetStyleShadowWidth(width, type)
     this.obj.lvObjSetStyleShadowOfsX(x, type)
     this.obj.lvObjSetStyleShadowOfsY(y, type)
     this.obj.lvObjSetStyleShadowSpread(spread, type)
     this.obj.setStyleShadowColor(color, type)
     this.obj.setStyleShadowOpa(utils.OPA_MAPPING(opa), type)
}
/**
 * 设置文本颜色
 * @param {any} color  支持数字类型：比如0x34ffaa；字符串类型(#开头),比如:'#34ffaa'
 * @param {number} type  参考utils.STYLE 非必填，缺省是和对象自身绑定
 */
uibase.textColor = function (color, type) {
     if (!utils.validateNumber(type)) {
          type = 0
     }
     this.obj.lvObjSetStyleTextColor(utils.colorParse(color), type)
}
/**
 * 设置文本对齐方式
 * @param {number} align  参考utils.TEXT_ALIGN
 * @param {number} type  参考utils.STYLE 非必填，缺省是和对象自身绑定
 */
uibase.textAlign = function (align, type) {
     if (!utils.validateNumber(type)) {
          type = 0
     }
     this.obj.lvObjSetStyleTextAlign(align, type)
}
/**
 * 设置文本字体
 * @param {object} font font.js里build返回的对象 
 * @param {number} type  参考utils.STYLE 非必填，缺省是和对象自身绑定
 */
uibase.textFont = function (font, type) {
     if (!utils.validateNumber(type)) {
          type = 0
     }
     if (!font || !font.obj) {
          throw new Error("dxui.textFont: 'font' parameter should not be null")
     }
     this.obj.lvObjSetStyleTextFont(font.obj, type)
}
/**
 * 设置线对象(line)颜色
 * @param {any} color  支持数字类型：比如0x34ffaa；字符串类型(#开头),比如:'#34ffaa'
 * @param {number} type  参考utils.STYLE 非必填，缺省是和对象自身绑定
 */
uibase.lineColor = function (color, type) {
     if (!utils.validateNumber(type)) {
          type = 0
     }
     this.obj.lvObjSetStyleLineColor(utils.colorParse(color), type)
}
/**
 * 设置线对象(line)宽度
 * @param {number} w 
 * @param {number} type  参考utils.STYLE 非必填，缺省是和对象自身绑定
 */
uibase.lineWidth = function (w, type) {
     if (!utils.validateNumber(type)) {
          type = 0
     }
     this.obj.lvObjSetStyleLineWidth(w, type)
}
/**
 * 设置线对象(line)圆角
 * @param {boolean} enable true/false
 */
uibase.lineRound = function (enable) {
     this.obj.lvObjSetStyleLineRounded(enable)
}
/**
 * 设置ui对象的滚动条显示方式
 * @param {boolean} state ture/false 
 */
uibase.scrollbarMode = function (state) {
     this.obj.lvObjSetScrollbarMode(state)
}
/**
 * 设置ui对象是否支持滚动
 * @param {boolean} state 
 */
uibase.scroll = function (state) {
     if (state) {
          this.obj.lvObjAddFlag(16)
     } else {
          this.obj.lvObjClearFlag(16)
     }
}
/**
 * 将对象与其它参照对象对齐
 * @param {object} ref 参照对象
 * @param {number} type 对齐的方向，参考dxui.Utils.ALIGN枚举
 * @param {number} x 偏移的x
 * @param {number} y 偏移的y
 */
uibase.alignTo = function (ref, type, x, y) {
     if (!ref || !ref.obj) {
          throw new Error("dxui.alignto: 'ref' parameter should not be null")
     }
     this.obj.lvObjAlignTo(ref.obj, type, x, y)
}
/**
 * 将对象与父对象对齐
 * @param {number} type 对齐的方向，参考dxui.Utils.ALIGN枚举
 * @param {number} x 偏移的x
 * @param {number} y 偏移的y
 */
uibase.align = function (type, x, y) {
     this.obj.lvObjAlign(type, x, y)
}
/**
 * 伸缩盒布局，可以更加灵活得定位、排列和分布元素，使得创建响应式和可伸缩的布局变得更加容易。
 * 它基于一个容器，和内部的一些弹性项目，下面是使用这种布局的一些概念：
 * 1、容器：容器包含了内部的弹性项目，可以使里面项目从左向右或从右向左等规则排列。
 * 2、主轴和侧轴：主轴，是容器中项目的主要排列方式，通常是水平方向或垂直方向，可以让项目们水平排列或纵向排列。
 *   侧轴，与主轴垂直的轴向，可以规定项目们在侧轴上的排列方式。
 *   主轴和侧轴由flexFlow()设置，主要有ROW（水平方向）、COLUMN（垂直方向）两种，带有WRAP后缀的在项目们超出容器时自动换行，带有REVERSE后缀的与默认排列方向相反，即为从右到左排列（若主轴是垂直方向则为从下到上排列）。
 * 3、主轴对齐方式：START（默认主轴顺序）、END（默认主轴顺序相反）、CENTER（在主轴方向上居中）、SPACE_EVENLY（在主轴上均匀分布，两两之间距离相等）、SPACE_AROUND（在主轴上均匀分布，每个项目平分主轴上的距离）、SPACE_BETWEEN（两端顶格，中间均分），由flexAlign()设置。
 * 4、侧轴对齐方式：将每一行或每一列看作一个项目，在侧轴方向上对齐，对齐方式同主轴，由flexAlign()设置。
 * 5、整体对齐方式：将容器内所有项目看作一个整体，在容器中对齐，对齐方式同主轴，由flexAlign()设置。
 * @param {number} type 主轴和侧轴的设置
 */
uibase.flexFlow = function (type) {
     this.obj.lvObjSetFlexFlow(type)
}
/**
 * 
 * @param {number} main 子元素按主轴方向的对齐方式
 * @param {number} cross 子元素按侧轴方向的对齐方式
 * @param {number} track 所有子元素对于容器的对齐方式
 */
uibase.flexAlign = function (main, cross, track) {
     this.obj.lvObjSetFlexAlign(main, cross, track)
}
/**
 * 更新一个控件的尺寸，当获取一个控件的尺寸为0时可以先调用，相当于更新显示缓存。
 */
uibase.update = function () {
     this.obj.lvObjUpdateLayout()
}
/**
 * 添加一个控件的状态
 * @param {number} state 状态枚举
 */
uibase.addState = function (state) {
     this.obj.addState(state)
}
/**
 * 删除一个控件的状态，如果想让一个聚焦输入框失焦，可以调用此方法删除FOCUSED状态
 * @param {number} state 状态枚举
 */
uibase.clearState = function (state) {
     this.obj.clearState(state)
}
/**
 * 判断一个控件是否拥有状态，想判断一个输入框是否被聚焦了，可以使用此方法并传入FOCUSED参数
 * @param {number} state 状态枚举
 * @returns true/false
 */
uibase.hasState = function (state) {
     return this.obj.hasState(state)
}
/**
 * 重绘一个控件，强制刷新控件的缓存，可以强制解决花屏的问题，但是如果死循环中调用会降低性能
 */
uibase.invalidate = function () {
     this.obj.invalidate()
}
/**
 * 滚动某个子控件直至显示出来，如果想将一个被滚动至容器外导致看不见的项目滚动至能被看见的位置，调用此方法。
 * @param {boolean} en 是否开启动画，开启会缓慢滚动出来，关闭则直接跳出。
 * @param {boolean} notRecursive 默认递归，适用于一般滚动和滚动嵌套控件
 */
uibase.scrollToView = function (en, isRecursive) {
     if (isRecursive) {
          this.obj.scrollToView(en)
     } else {
          this.obj.scrollToViewRecursive(en)
     }
}
/**
 * 滚动一个控件的x方向
 * @param {number} x 滚动x轴距离
 * @param {boolean} en 是否开启动画
 */
uibase.scrollToX = function (x, en) {
     this.obj.scrollToX(x, en)
}
/**
 * 滚动一个控件的y方向
 * @param {number} y 滚动y轴距离
 * @param {boolean} en 是否开启动画
 */
uibase.scrollToY = function (y, en) {
     this.obj.scrollToY(y, en)
}
/**
 * 元素快照（其实就是截图，如果想保存全屏截图，可以对屏幕对象使用此方法）
 * @param {string} fileName 必填，保存快照的文件名（注意后缀应与格式对应）
 * @param {number} type 非必填，缺省png，快照格式 0:bmp/1:png/2:jpg(jpeg)
 * @param {number} cf 非必填，一种RGB颜色存储格式
 */
uibase.snapshot = function (fileName, type = 1, cf = NativeObject.APP.NativeComponents.NativeEnum.LV_IMG_CF_TRUE_COLOR_ALPHA) {
     if (!fileName) {
          return
     }
     // 默认存储在/app/data/snapshot位置
     os.mkdir("/app/data/snapshot/")
     this.obj.lvSnapshotTake(cf, "/app/data/snapshot/" + fileName, type)
}
export default uibase;