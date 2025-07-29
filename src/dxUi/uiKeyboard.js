//build：20240329
//keyboard控件
import utils from "./uiUtils.js"
import base from "./uiBase.js"
let keyboard = {}

keyboard.build = function (id, parent) {
    let temp = utils.validateBuild(keyboard.all, id, parent, 'keyboard')
    let my = {type: 'keyboard'}
    my.obj = new utils.GG.NativeKeyboard({ uid: id }, temp)

    // 拼音输入法会获得一个新对象，与当前键盘绑定，以增强键盘功能，如9键等，用户使用时不用关心，只要操作最初创建的那个键盘对象
    let pinyin = {}
    pinyin.obj = my.obj.lvImePinyinCreate()
    my.obj.lvImePinyinSetKeyboard(pinyin.obj)
    my["__obj"] = Object.assign(pinyin, base)
    my.__mode = "K26"

    my.id = id
    /**
     * 设置关联文本框，键盘输出的内容会显示在这里
     * @param {object} textarea 文本框控件对象
     */
    my.setTextarea = function (textarea) {
        this.obj.lvKeyboardSetTextarea(textarea.obj)
        my.textarea = textarea
    }
    /**
     * 设置/获取模式，纯数字键盘或其他模式
     * @param {any} mode 模式，参照枚举
     * @returns 返回当前模式
     */
    my.mode = function (mode) {
        if (!mode) {
            return my.__mode
        }
        if (mode == "K26" || mode == "K9") {
            this.obj.lvImePinyinSetMode(my["__obj"].obj, mode == "K26" ? 0 : 1)
        } else {
            if (mode == utils.KEYBOARD.NUMBER) {
                this.obj.lvImePinyinSetMode(my["__obj"].obj, 2)
            }
            this.obj.lvKeyboardSetMode(mode)
        }
        my.__mode = mode
    }
    /**
     * 设置拼音字体，和键盘不同，这里设置的是候选字字体
     * @param {object} font font.js里build返回的对象 
     * @param {number} type  参考utils.STYLE 非必填，缺省是和对象自身绑定
     */
    my.chFont = function (font, type) {
        if (!utils.validateNumber(type)) {
            type = 0
        }
        if (!font || !font.obj) {
            throw new Error("dxui.textFont: 'font' parameter should not be null")
        }
        my.obj.lvImePinyinGetCandPanel(my["__obj"].obj).lvObjSetStyleTextFont(font.obj, type)
    }
    /**
     * 按下时在弹出窗口中显示按钮标题，即辅助显示的上位框。
     * @param {boolean} en true/false
     */
    my.setPopovers = function (en) {
        this.obj.lvKeyboardSetPopovers(en)
    }
    /**
     * 设置词库
     * @param {object} dict 词库，格式如：{"a": "啊", "ai": "爱",...,"zu":"组"},26个字母都要有，没有候选字就写""
     * @returns 
     */
    my.dict = function (dict) {
        if (!dict) {
            return my.obj.lvImePinyinGetDict(my["__obj"].obj)
        } else {
            my.obj.lvImePinyinSetDict(my["__obj"].obj, dict)
        }
    }
    let comp = Object.assign(my, base);
    // 重写方法
    // 保留原始的方法
    const super_hide = my.hide;
    const super_show = my.show;
    my.hide = function () {
        super_hide.call(this)
        my.obj.lvImePinyinGetCandPanel(my["__obj"].obj).lvObjAddFlag(1);
        if (my.textarea.text() && my.textarea.text().length > 0) {
            my.obj.lvImePinyinClearData(my["__obj"].obj)
        }
    }
    my.show = function () {
        super_show.call(this)
        if (my.obj.lvImePinyinGetCandNum(my["__obj"].obj) > 0) {
            my.obj.lvImePinyinGetCandPanel(my["__obj"].obj).lvObjClearFlag(1);
        }
        my.obj.lvImePinyinGetCandPanel(my["__obj"].obj).lvObjAlignTo(my.obj, utils.ALIGN.OUT_TOP_MID, 0, 0)
    }
    utils.setParent(this.all, comp, parent)
    return comp;
}
export default keyboard;