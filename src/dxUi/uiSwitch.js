//build：20240329
//_switch控件
import utils from "./uiUtils.js"
import base from "./uiBase.js"
let _switch = {}

_switch.build = function (id, parent) {
    let temp = utils.validateBuild(_switch.all, id, parent, '_switch')
    let my = {type: 'switch'}
    my.obj = new utils.GG.NativeSwitch({ uid: id }, temp)
    my.id = id

    /**
     * 获取/设置文字
     * @param {string} text 设置文字
     * @returns 获取文字
     */
    my.text = function (text) {
        if (text == null || text == undefined) {
            return this.obj.getText()
        } else {
            this.obj.setText(text)
        }
    }
    /**
     * 选中或不选中
     * @param {boolean} en true/false
     */
    my.select = function (en) {
        if (en) {
            if (!my.obj.hasState(utils.STATE.CHECKED)) {
                my.obj.addState(utils.STATE.CHECKED)
            }
        } else {
            my.obj.clearState(utils.STATE.CHECKED)
        }
    }
    /**
     * 判断是否选中
     * @returns 返回true/false
     */
    my.isSelect = function () {
        return my.obj.hasState(utils.STATE.CHECKED)
    }
    let comp = Object.assign(my, base);
    utils.setParent(this.all, comp, parent)
    return comp;
}
export default _switch;