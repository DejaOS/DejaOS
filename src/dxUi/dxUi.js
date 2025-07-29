//build:20240724
/**
 * UI 的基础组件，需要先了解一些概念
 * 1. 图层：设备具备2个基本图层，主图层（main）和顶部图层（top）
      其中TOP图层永远在主图层之上，主图层切换页面不会挡住TOP图层，TOP图层用于显示一些状态栏是比较合适的。
      其中主图层可以预先在内存中构造多个页面，然后通过loadMain来加载切换不同的页面。而TOP图层不能切换，只能让ui对象隐藏或删除

 * 2. UI对象：有很多种类的UI对象，其中最基础的是 'view' 对象，主图层和顶部图层的根ui对象必须是 'view'对象，剩下的 ui 对象都是某个 ui 对象的子ui。
      ui对象包括常见的 'button'、'label'、'image'等等，所有对象都有一些通用的属性，也有一些独特的属性
      所有 ui 对象都有全局唯一的 id ，不能重复。通用的属性还包括
      - type：获取ui对象的类型，字符串
      - parent：获取ui对象的父节点，字符串
      - children：获取ui对象的所有子对象的id，字符串数组

 * 3. dxui文件：以.dxui为扩展名的文件是利用可视化拖拽工具生成的 ui 树,工具会自动生成对应的js文件，可以import对应的js文件来操作

 */

import logger from './dxLogger.js'
import utils from './uiUtils.js'
import button from './uiButton.js'
import font from './uiFont.js'
import image from './uiImage.js'
import label from './uiLabel.js'
import line from './uiLine.js'
import list from './uiList.js'
import dropdown from './uiDropdown.js'
import checkbox from './uiCheckbox.js'
import slider from './uiSlider.js'
import _switch from './uiSwitch.js'
import textarea from './uiTextarea.js'
import keyboard from './uiKeyboard.js'
import style from './uiStyle.js'
import view from './uiView.js'
import buttons from './uiButtons.js'

const dxui = {}
dxui.Button = button
dxui.Font = font
dxui.Image = image
dxui.Label = label
dxui.Line = line
dxui.List = list
dxui.Dropdown = dropdown
dxui.Checkbox = checkbox
dxui.Slider = slider
dxui.Switch = _switch
dxui.Textarea = textarea
dxui.Keyboard = keyboard
dxui.Style = style
dxui.View = view
dxui.Utils = utils
dxui.Buttons = buttons
let orientation = 1 //默认横屏
/**
 * 初始化，必须在代码最前面调用
 * @param {object} options 初始化参数
 *        @param {number} options.orientation 屏幕方向 可以为0，1，2，3，分别表示竖屏，屏幕在左；横屏，屏幕在上；竖屏，屏幕在右；横批，屏幕在下
 * @param {object} context 上下文，每个应用都有唯一的一个上下文变量，不同的js可以都引用dxUi.js，但是context必须一致 
*/
dxui.init = function (options, context = {}) {
     this.initContext(context)
     if (options && options.orientation != undefined && options.orientation != null && [0, 1, 2, 3].includes(options.orientation)) {
          orientation = options.orientation
     }
     utils.GG.NativeDisp.lvDispSetRotation(orientation)
}
/**
 * 初始化上下文，每个应用都有唯一的一个上下文变量，不同的js可以都引用dxUi.js，但是context必须一致
 * 在构建ui前需要初始化
 * @param {object} context 初始是一个空对象{}
 */
dxui.initContext = function (context) {
     utils.validateObject(context)
     dxui.all = context
     dxui.Button.all = dxui.all
     dxui.Image.all = dxui.all
     dxui.Label.all = dxui.all
     dxui.Line.all = dxui.all
     dxui.List.all = dxui.all
     dxui.Dropdown.all = dxui.all
     dxui.Checkbox.all = dxui.all
     dxui.Slider.all = dxui.all
     dxui.Switch.all = dxui.all
     dxui.Textarea.all = dxui.all
     dxui.Keyboard.all = dxui.all
     dxui.View.all = dxui.all
     dxui.Buttons.all = dxui.all
}
/**
 * 根据id获取已经构建的ui对象
 * @param {string} id 
 * @returns 
 */
dxui.getUi = function (id) {
     return dxui.all[id]
}
/**
 * 外部循环需要调用此方法
 */
dxui.handler = function () {
     return utils.GG.NativeTimer.lvTimerHandler()
}
/**
 * 获取屏幕方向，不同的屏幕方向可能要加载不同的ui或不同的处理逻辑
 * @returns 可以为0，1，2，3，分别表示竖屏，屏幕在左；横屏，屏幕在上；竖屏，屏幕在右；横批，屏幕在下
 */
dxui.getOrientation = function () {
     return orientation;
}
/**
 * 创建一个定时器，每隔ms毫秒执行一次回调函数，主要用于定时刷新某个ui对象的值
 * 可以在回调函数里删除定时器(clearInterval)来实现setTimeout的效果
 * @param {string} id 定时器的唯一标识 必填
 * @param {function} callback 回调函数（可以是匿名函数）
 * @param {number} ms 毫秒数
 * @param {object} user_data 用户数据，传递给回调参数
 * @returns 定时器句柄 
 */
dxui.setInterval = function (id, callback, ms, user_data) {
     if (utils.validateId(dxui.all, id))
          if (!callback || (typeof callback != 'function') || !callback.name || callback.name === '') {
               throw new Error('The callback should not be null and should be named function')
          }
     if (!ms || (typeof ms != 'number')) {
          throw new Error('The interval should not be empty, and should be number')
     }
     if (!this.all.__interval) {
          this.all.__interval = {}
     }
     this.all.__interval[id] = utils.GG.NativeTimer.lvTimerCreate(callback, ms, user_data)
}
/**
 * 定时器不再需要后，可以删除这个定时器
 * @param {string} id 定时器id 
 */
dxui.clearInterval = function (id) {
     if (!dxui.all[id]) {
          return
     }
     utils.GG.NativeTimer.lvTimerDel(dxui.all[id])
     delete dxui.all.__interval[id]
}
/**
 * 获取ui对象的父对象
 * @param {Object} ui 
 */
dxui.getParent = function (ui) {
     if (ui.parent) {
          return dxui.getUi(ui.parent)
     }
     return null
}
/**
 * 删除当前自身ui对象
 */
dxui.del = function (ui) {
     function recursiveDelete(ui) {
          // 如果对象不存在，直接返回
          if (!dxui.all[ui.id]) {
               return;
          }

          // 先递归删除所有子对象
          if (ui.children && Array.isArray(ui.children)) {
               // 倒序遍历子节点
               for (let i = ui.children.length - 1; i >= 0; i--) {
                    const childId = ui.children[i];
                    if (dxui.all[childId]) {
                         recursiveDelete(dxui.all[childId]);
                    }
               }
          }
          // 从父对象中移除当前对象
          if (ui.parent && dxui.all[ui.parent] && Array.isArray(dxui.all[ui.parent].children)) {
               const children = dxui.all[ui.parent].children
               let index = children.indexOf(ui.id);
               if (index !== -1) {
                    children.splice(index, 1);
               }
          }

          // 删除当前对象
          ui.obj.lvObjDel();
          delete dxui.all[ui.id];
     }

     // 开始递归删除
     recursiveDelete(ui);
}
/**
 * 在主图层加载（切换）已经构建好的 ui 对象，
 * @param {object} ui 使用build函数构建的 ui 对象
 */
dxui.loadMain = function (ui) {
     if (!ui || !ui.obj) {
          throw new Error("dxui.loadMain:'ui' paramter should not be null")
     }
     // 加载主屏幕
     utils.GG.NativeDisp.lvScrLoad(ui.obj)
}
/**
 * 从最后一个用户活动显示(如点击)经过的时间
 * @returns 返回从最后一个活动开始的经过时间(毫秒)
 */
dxui.getIdleDuration = function () {
     return utils.GG.NativeDisp.lvDispGetInactiveTime()
}
/**
 * 重置用户活动显示(如点击)经过的时间
 */
dxui.trigActivity = function () {
     utils.GG.NativeDisp.lvDispTrigActivity()
}

export default dxui;