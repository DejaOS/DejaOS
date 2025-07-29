//build：20240311
//label控件
import utils from "./uiUtils.js"
import base from "./uiBase.js"
let label = {}

label.build = function (id, parent) {
    let temp = utils.validateBuild(label.all, id, parent, 'label')
    let my = {type: 'label'}
    my.obj = new utils.GG.NativeLabel({ uid: id }, temp)
    my.id = id
    /**
     * 设置label的文本或获取文本内容
     * @param {string} t 非必填，如果没有填或者不是string类型就是获取文本
     */
    my.text = function (t) {
        if (utils.validateString(t)) {
            this.obj.lvLabelSetText(t)
        } else {
            return this.obj.lvLabelGetText()
        }
    }
    /**
     * 设置文本超长后显示的模式，比如滚动显示或截断或...等
     * @param {number} mode 枚举参考utils.LABEL_LONG_MODE 
     */
    my.longMode = function (mode) {
        this.obj.lvLabelSetLongMode(mode)
    }
    let comp = Object.assign(my, base);
    utils.setParent(this.all, comp, parent)
    return comp;
}
export default label;