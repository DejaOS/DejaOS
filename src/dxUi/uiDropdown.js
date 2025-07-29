//build：20240329
//dropdown控件
import utils from "./uiUtils.js"
import base from "./uiBase.js"
let dropdown = {}

dropdown.build = function (id, parent) {
    let temp = utils.validateBuild(dropdown.all, id, parent, 'dropdown')
    let my = {type: 'dropdown'}
    my.obj = new utils.GG.NativeDropdown({ uid: id }, temp)
    my.id = id
    /**
     * 设置下拉选项内容
     * @param {array} arr 选项内容，是个字符串数组，每一项为一个选项
     */
    my.setOptions = function (arr) {
        this.obj.setOptions(arr.join('\n'))
    }
    /**
     * 获取下拉选项列表
     * @returns 返回列表对象，是一个基类对象，可以单独设置它的字体
     */
    my.getList = function () {
        let res = {}
        res.obj = this.obj.getList()
        return Object.assign(res, base)
    }
    /**
     * 设置选中项，默认会选中这个
     * @param {number} index 选中项索引
     */
    my.setSelected = function (index) {
        this.obj.setSelected(index)
    }
    /**
     * 获取选中项索引
     * @returns 返回当前选中的索引
     */
    my.getSelected = function () {
        return this.obj.getSelected()
    }
    /**
     * 设置下拉框附属图标，默认是个朝下的箭头
     * @param {string} icon 图标地址
     */
    my.setSymbol = function (icon) {
        this.obj.setSymbol(icon)
    }
    let comp = Object.assign(my, base);
    utils.setParent(this.all, comp, parent)
    return comp;
}
export default dropdown;