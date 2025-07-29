//build：20240329
//list控件
import utils from "./uiUtils.js"
import base from "./uiBase.js"
let list = {}

list.build = function (id, parent) {
    let temp = utils.validateBuild(list.all, id, parent, 'list')
    let my = {type: 'list'}
    my.obj = new utils.GG.NativeList({ uid: id }, temp)
    my.id = id
    /**
     * 添加单个文本项
     * @param {string} text 项的文本内容
     * @returns 项自身的base对象
     */
    my.addText = function (text) {
        let res = {}
        res.obj = this.obj.lvListAddText(text)
        return Object.assign(res, base)
    }
    /**
     * 添加单个按钮项
     * @param {string} src 项前面的图标路径
     * @param {string} text 项的文本内容
     * @returns 项自身的base对象
     */
    my.addBtn = function (src, text) {
        let res = {}
        res.obj = this.obj.lvListAddBtn(src, text)
        return Object.assign(res, base)
    }
    /**
     * 获取按钮项的文本内容
     * @param {string} btn 按钮项
     * @returns 按钮项的文本内容
     */
    my.getBtnText = function (btn) {
        return this.obj.lvListGetBtnText(btn.obj)
    }
    let comp = Object.assign(my, base);
    utils.setParent(this.all, comp, parent)
    return comp;
}
export default list;