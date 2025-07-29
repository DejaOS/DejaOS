//build：20240315
//公用的一些函数、常量、枚举等
import { uiClass } from '../dxmodules/libvbar-m-dxui.so'
import logger from './dxLogger.js'
const ui = new uiClass();
// 初始化ui组件
ui.init()

let utils = {}
utils.GG = NativeObject.APP.NativeComponents
utils.ENUM = utils.GG.NativeEnum
utils.LAYER = {
    "MAIN": 0,
    "SYS": 1,
    "TOP": 2
}
utils.EVENT = {
    "CLICK": 7,
    "LONG_PRESSED": 5,
    "SHORT_PRESSED": 4,
    "PRESSING": utils.ENUM.LV_EVENT_PRESSING,
    "FOCUSED": utils.ENUM.LV_EVENT_FOCUSED,
    "DEFOCUSED": utils.ENUM.LV_EVENT_DEFOCUSED,
    "VALUE_CHANGED": utils.ENUM.LV_EVENT_VALUE_CHANGED,
    "INSERT": utils.ENUM.LV_EVENT_INSERT,
    "REFRESH": utils.ENUM.LV_EVENT_REFRESH,
    "READY": utils.ENUM.LV_EVENT_READY,
    "CANCEL": utils.ENUM.LV_EVENT_CANCEL,
}
utils.TEXT_ALIGN = {
    "AUTO": 0,
    "LEFT": 1,
    "CENTER": 2,
    "RIGHT": 3
}
utils.STATE = {
    "DEFAULT": utils.ENUM.LV_STATE_DEFAULT,
    "CHECKED": utils.ENUM.LV_STATE_CHECKED,
    "FOCUSED": utils.ENUM.LV_STATE_FOCUSED,
    "FOCUS_KEY": utils.ENUM.LV_STATE_FOCUS_KEY,
    "EDITED": utils.ENUM.LV_STATE_EDITED,
    "HOVERED": utils.ENUM.LV_STATE_HOVERED,
    "PRESSED": utils.ENUM.LV_STATE_PRESSED,
    "SCROLLED": utils.ENUM.LV_STATE_SCROLLED,
    "DISABLED": utils.ENUM.LV_STATE_DISABLED,
}
utils.OBJ_FLAG = {
    "CLICKABLE": utils.ENUM.LV_OBJ_FLAG_CLICKABLE,
}
utils.ALIGN = {//相对参照对象的位置，带 OUT 的在参照对象的边界外
    "OUT_TOP_LEFT": utils.ENUM.LV_ALIGN_OUT_TOP_LEFT,
    "OUT_TOP_MID": utils.ENUM.LV_ALIGN_OUT_TOP_MID,
    "OUT_TOP_RIGHT": utils.ENUM.LV_ALIGN_OUT_TOP_RIGHT,
    "OUT_BOTTOM_LEFT": utils.ENUM.LV_ALIGN_OUT_BOTTOM_LEFT,
    "OUT_BOTTOM_MID": utils.ENUM.LV_ALIGN_OUT_BOTTOM_MID,
    "OUT_BOTTOM_RIGHT": utils.ENUM.LV_ALIGN_OUT_BOTTOM_RIGHT,
    "OUT_LEFT_TOP": utils.ENUM.LV_ALIGN_OUT_LEFT_TOP,
    "OUT_LEFT_MID": utils.ENUM.LV_ALIGN_OUT_LEFT_MID,
    "OUT_LEFT_BOTTOM": utils.ENUM.LV_ALIGN_OUT_LEFT_BOTTOM,
    "OUT_RIGHT_TOP": utils.ENUM.LV_ALIGN_OUT_RIGHT_TOP,
    "OUT_RIGHT_MID": utils.ENUM.LV_ALIGN_OUT_RIGHT_MID,
    "OUT_RIGHT_BOTTOM": utils.ENUM.LV_ALIGN_OUT_RIGHT_BOTTOM,
    "TOP_LEFT": utils.ENUM.LV_ALIGN_TOP_LEFT,
    "TOP_MID": utils.ENUM.LV_ALIGN_TOP_MID,
    "TOP_RIGHT": utils.ENUM.LV_ALIGN_TOP_RIGHT,
    "BOTTOM_LEFT": utils.ENUM.LV_ALIGN_BOTTOM_LEFT,
    "BOTTOM_MID": utils.ENUM.LV_ALIGN_BOTTOM_MID,
    "BOTTOM_RIGHT": utils.ENUM.LV_ALIGN_BOTTOM_RIGHT,
    "LEFT_MID": utils.ENUM.LV_ALIGN_LEFT_MID,
    "RIGHT_MID": utils.ENUM.LV_ALIGN_RIGHT_MID,
    "CENTER": utils.ENUM.LV_ALIGN_CENTER,
    "DEFAULT": utils.ENUM.LV_ALIGN_DEFAULT
}
utils.FLEX_ALIGN = {//flex布局，对齐方式
    "START": utils.ENUM.LV_FLEX_ALIGN_START,
    "END": utils.ENUM.LV_FLEX_ALIGN_END,
    "CENTER": utils.ENUM.LV_FLEX_ALIGN_CENTER,
    "SPACE_EVENLY": utils.ENUM.LV_FLEX_ALIGN_SPACE_EVENLY,
    "SPACE_AROUND": utils.ENUM.LV_FLEX_ALIGN_SPACE_AROUND,
    "SPACE_BETWEEN": utils.ENUM.LV_FLEX_ALIGN_SPACE_BETWEEN,
}
utils.FLEX_FLOW = {//flex布局，主侧轴
    "ROW": utils.ENUM.LV_FLEX_FLOW_ROW,
    "COLUMN": utils.ENUM.LV_FLEX_FLOW_COLUMN,
    "ROW_WRAP": utils.ENUM.LV_FLEX_FLOW_ROW_WRAP,
    "ROW_REVERSE": utils.ENUM.LV_FLEX_FLOW_ROW_REVERSE,
    "ROW_WRAP_REVERSE": utils.ENUM.LV_FLEX_FLOW_ROW_WRAP_REVERSE,
    "COLUMN_WRAP": utils.ENUM.LV_FLEX_FLOW_COLUMN_WRAP,
    "COLUMN_REVERSE": utils.ENUM.LV_FLEX_FLOW_COLUMN_REVERSE,
    "COLUMN_WRAP_REVERSE": utils.ENUM.LV_FLEX_FLOW_COLUMN_WRAP_REVERSE,
}
utils.GRAD = {//渐变色方向
    "NONE": utils.ENUM.LV_GRAD_DIR_NONE,
    "VER": utils.ENUM.LV_GRAD_DIR_VER,
    "HOR": utils.ENUM.LV_GRAD_DIR_HOR,
}
utils.KEYBOARD = {//键盘模式
    "TEXT_LOWER": utils.ENUM.LV_KEYBOARD_MODE_TEXT_LOWER,
    "TEXT_UPPER": utils.ENUM.LV_KEYBOARD_MODE_TEXT_UPPER,
    "SPECIAL": utils.ENUM.LV_KEYBOARD_MODE_SPECIAL,
    "NUMBER": utils.ENUM.LV_KEYBOARD_MODE_NUMBER,
    "K26": "K26",
    "K9": "K9",
}
utils.FONT_STYLE = {
    "NORMAL": utils.ENUM.FT_FONT_STYLE_NORMAL,
    "ITALIC": utils.ENUM.FT_FONT_STYLE_ITALIC,
    "BOLD": utils.ENUM.FT_FONT_STYLE_BOLD,
}
utils.BUTTONS_STATE = {
    "HIDDEN": utils.ENUM.LV_BTNMATRIX_CTRL_HIDDEN,//按钮矩阵中的某个按钮是否隐藏
    "NO_REPEAT": utils.ENUM.LV_BTNMATRIX_CTRL_NO_REPEAT,//按钮矩阵中的按钮是否可以重复按下,不会重复触发按键事件
    "DISABLED": utils.ENUM.LV_BTNMATRIX_CTRL_DISABLED,//按钮矩阵中的某个按钮是否禁用
    "CHECKABLE": utils.ENUM.LV_BTNMATRIX_CTRL_CHECKABLE,//按钮矩阵中的按钮是否可选中
    "CHECKED": utils.ENUM.LV_BTNMATRIX_CTRL_CHECKED,//按钮矩阵中的某个按钮是否已被选中,在界面上呈现为被选中状态
    "CLICK_TRIG": utils.ENUM.LV_BTNMATRIX_CTRL_CLICK_TRIG,//按钮矩阵中的按钮是否可以通过点击触发
    "POPOVER": utils.ENUM.LV_BTNMATRIX_CTRL_POPOVER,//矩阵中的某个按钮是否弹出,被点击后会显示更多的选项或内容
    "RECOLOR": utils.ENUM.LV_BTNMATRIX_CTRL_RECOLOR//矩阵中的按钮是否可重新着色
}
//样式起作用的部分
utils.STYLE_PART = {
    "MAIN": 0, //对象当前样式起作用
    "ITEMS": 327680//对象内部子项起作用，比如buttonMatrix里的按钮组
}
//文本超出控件显示的模式
utils.LABEL_LONG_MODE = {
    "WRAP": utils.ENUM.LV_LABEL_LONG_WRAP,//文本长的时候换行
    "DOT": utils.ENUM.LV_LABEL_LONG_DOT,//文本长的时候用...替代
    "SCROLL": utils.ENUM.LV_LABEL_LONG_SCROLL,//文本长的时候自动滚动
    "SCROLL_CIRCULAR": utils.ENUM.LV_LABEL_LONG_SCROLL_CIRCULAR,//文本长的时候循环滚动
    "CLIP": utils.ENUM.LV_LABEL_LONG_CLIP,//文本长的时候自动截断
}
// 实现0-100映射为0-255
utils.OPA_MAPPING = function (value) {
    return Math.round((value / 100) * 255);
}
/**
* 校验数字是否为空，是否为number
* @param {number} n 必填
* @param {err} 错误信息，非必填，填了会抛出Error
*/
utils.validateNumber = function (n, err) {
    return _valid(n, 'number', err)
}
/**
* 校验对象是否为空，是否为object
* @param {object} o 必填
* @param {err} 错误信息，非必填，填了会抛出Error
*/
utils.validateObject = function (o, err) {
    return _valid(o, 'object', err)
}
/**
 * 校验ui对象的构建参数
 * @param {array} all 必填,所有对象引用
 * @param {string} id 不能为空，必填
 * @param {object} parent 非必填，缺省是0
 */
utils.validateBuild = function (all, id, parent, type) {
    this.validateId(all, id)
    if (parent === 0 || parent === 1 || parent === 2) {
        return parent
    }
    if (!parent || !parent.obj) {
        throw new Error(type + ".build: 'parent' paramter should not be null")
    }
    return parent.obj
}
/**
 * 校验所有ui控件的id，不能重复
 * @param {array} all 
 * @param {string} id 
 */
utils.validateId = function (all, id) {
    this.validateString(id, "The 'id' parameter should not be null.")
    if (all[id]) {
        throw new Error("The id(" + id + ") already exists. Please set a different id value.")
    }
}
/**
* 校验字符串是否为空
* @param {string} s 必填
* @param {err} 错误信息，非必填，填了会抛出Error
*/
utils.validateString = function (s, err) {
    let res = _valid(s, 'string', err)
    if (!res) {
        return false
    }
    if (s.length <= 0) {
        if (err) {
            throw new Error(err)
        }
        return false
    }
    return true
}
/**
 * 解析不同类型的颜色值
 * @param {any} value 支持数字类型：0x34ffaa，字符串类型:'0x34ffaa',字符串类型:'#34ffaa'
 * @returns 
 */
utils.colorParse = function (value) {
    if (typeof value == 'string') {
        value = value.replace('#', '0x')
        value = parseInt(value, 16)
    }
    return value
}
/**
 * 获取触摸点的坐标
 * @returns {x:横坐标,y:纵坐标}
 */
utils.getTouchPoint = function () {
    let point = NativeObject.APP.NativeComponents.NativeIndev.lvIndevGetPoint()
    return point
}
/**
 * 提供动画
 * @param {object} obj 动画操作对象，可以是任意对象，回调参数获取
 * @param {number} start 区间开始值，一般和end搭配使用，回调参数获取，start在动画过程变化到end
 * @param {number} end 区间结束值
 * @param {function} cb 回调函数(obj, v)=>{},obj即动画操作对象，区间值（start-end）
 * @param {number} duration 动画持续时间，毫秒
 * @param {number} backDuration 可选，动画回放时间，毫秒，缺省不回放
 * @param {number} repeat 可选，动画重复次数，缺省1次
 * @param {string} mode 速率曲线，可选，缺省linear，内置功能：linear,ease_in,ease_out,ease_in_out,overshoot,bounce,step
 *  linear 线性动画
    step 在最后一步更改
    ease_in 开始缓慢
    ease_out 最后缓慢
    ease_in_out 在开始和结束时都很缓慢
    overshoot 超出最终值
    bounce 从最终值反弹一点（比如撞到墙）
 * @returns 动画实例，一定得保存到全局
 */
utils.anime = function (obj, start, end, cb, duration, backDuration, repeat, mode) {
    // 1、初始化动画
    let anim = NativeObject.APP.NativeComponents.NativeAnim.lvAnimInit()
    // 2、设置动画对象
    anim.lvAnimSetVar(obj)
    // 3、设置起始和结束值
    anim.lvAnimSetValues(start, end)
    //4、设置动画回调函数
    anim.lvAnimSetExecCb(cb)
    // 5、设置动画时间
    anim.lvAnimSetTime(duration)
    // 可选，设置动画回放时间，不设置就不回放
    if (backDuration) {
        anim.lvAnimSetPlaybackTime(backDuration)
    }
    // 可选，设置动画重复次数
    if (repeat) {
        anim.lvAnimSetRepeatCount(repeat)
    }
    // 可选，设置动画速率曲线
    if (mode) {
        anim.lvAnimSetPathCb(mode)
    }
    // 6、运行动画
    anim.lvAnimStart()
    return anim
}
//每个对象设置parent和children
utils.setParent = function (all, child, parent) {
    if (!all || parent == null || parent == undefined || !child) {
        return
    }
    if((typeof parent)=='number'){

    }
    const parentId = ((typeof parent)=='number')?'' + parent:parent.id//把0，1，2转成字符串
    if (!all[parentId]) {
        all[parentId] = { id: parentId }//根节点0,1,2
    }
    if (!all[parentId].children) {
        all[parentId].children = []
    }
    all[parentId].children.push(child.id)
    child.parent = parentId
    all[child.id] = child
}
function _valid(n, type, err) {
    if (n === undefined || n === null || (typeof n) != type) {
        if (err) {
            throw new Error(err)
        }
        return false
    }
    return true
}
export default utils