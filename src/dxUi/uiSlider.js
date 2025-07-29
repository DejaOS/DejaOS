//build：20240329
//slider控件
import utils from "./uiUtils.js"
import base from "./uiBase.js"
let slider = {}

slider.build = function (id, parent) {
    let temp = utils.validateBuild(slider.all, id, parent, 'slider')
    let my = {type: 'slider'}
    my.obj = new utils.GG.NativeSlider({ uid: id }, temp)
    my.id = id

    /**
     * 获取/设置值
     * @param {number} v 设置值
     * @param {boolean} en 设置值时是否开启动画，即缓动效果
     * @returns 获取值
     */
    my.value = function (v, en) {
        if (v == null || v == undefined) {
            return this.obj.lvSliderGetValue()
        } else {
            if (!utils.validateNumber(en)) {
                en = false
            }
            this.obj.lvSliderSetValue(v, en)
        }
    }
    /**
     * 设置范围
     * @param {number} min 最小值
     * @param {number} max 最大值
     */
    my.range = function (min, max) {
        this.obj.lvSliderSetRange(min, max)
    }

    let comp = Object.assign(my, base);
    utils.setParent(this.all, comp, parent)
    return comp;
}
export default slider;