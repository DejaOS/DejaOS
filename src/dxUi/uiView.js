//build：20240314
//基础矩形对象 类似div可以加载任何其它控件
import utils from "./uiUtils.js"
import base from "./uiBase.js"
let view = {}
/**
 * 创建一个view加载在父控件对象上
 * @param {string} id 控件id，必填
 * @param {object} parent 父对象
 * @returns 创建完的view对象
 */
view.build = function (id, parent) {
    let temp = utils.validateBuild(view.all, id, parent, 'view')
    let my = {type: 'view'}
    if (temp === 0 || temp === 1 || temp === 2) {
        my.obj = new utils.GG.NativeBasicComponent({ uid: id }, null, temp)
    }
    else {
        my.obj = new utils.GG.NativeBasicComponent({ uid: id }, temp)
    }
    my.id = id
    let comp = Object.assign(my, base);
    utils.setParent(this.all,comp,parent)
    return comp;
}

export default view;