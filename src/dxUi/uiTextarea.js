//build：20240330
//textarea控件
import utils from "./uiUtils.js"
import base from "./uiBase.js"
let textarea = {}

textarea.build = function (id, parent) {
    let temp = utils.validateBuild(textarea.all, id, parent, 'textarea')
    let my = {type: 'textarea'}
    my.obj = new utils.GG.NativeTextarea({ uid: id }, temp)
    my.id = id
    /**
     * 设置单行模式，不能换行
     * @param {boolean} en true/false
     */
    my.setOneLine = function (en) {
        this.obj.lvTextareaSetOneLine(en)
    }
    /**
     * 设置密码模式，内容显示为·号
     * @param {boolean} en true/false
     */
    my.setPasswordMode = function (en) {
        this.obj.lvTextareaSetPasswordMode(en)
    }
    /**
     * 设置内容对齐方式，居中靠左靠右等
     * @param {number} align 对齐方式枚举
     */
    my.setAlign = function (align) {
        this.obj.lvTextareaSetAlign(align)
    }
    /**
     * 设置内容最大长度，字符数限制
     * @param {number} length 长度
     */
    my.setMaxLength = function (length) {
        this.obj.lvTextareaSetMaxLength(length)
    }
    /**
     * 设置是否启用光标定位，是否显示|
     * @param {boolean} en true/false
     */
    my.setCursorClickPos = function (en) {
        this.obj.lvTextareaSetCursorClickPos(en)
    }
    /**
     * 在当前光标位置插入文本
     * @param {string} txt 文本内容
     */
    my.lvTextareaAddText = function (txt) {
        this.obj.lvTextareaAddText(txt)
    }
    /**
     * 从当前光标位置删除左边的字符
     */
    my.lvTextareaDelChar = function () {
        this.obj.lvTextareaDelChar()
    }
    /**
     * 获取/设置文本内容
     * @param {string} text 设置文本内容
     * @returns 获取文本内容
     */
    my.text = function (text) {
        if (text == null || text == undefined) {
            return this.obj.lvTextareaGetText()
        } else {
            this.obj.lvTextareaSetText(text)
        }
    }
    let comp = Object.assign(my, base);
    utils.setParent(this.all, comp, parent)
    return comp;
}
export default textarea;