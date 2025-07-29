//build：20240311
//line控件
import utils from "./uiUtils.js"
import base from "./uiBase.js"
let line = {}

line.build = function (id, parent) {
    let temp = utils.validateBuild(line.all, id, parent, 'line')
    let my = {type: 'line'}
    my.obj = new utils.GG.NativeLine({ uid: id }, temp)
    my.id = id
    /**
     * 设置line的所有点的坐标
     * @param {Array} points 必填，所有的点组成的数组，比如[[x1,y1],[x2,y2]]
     * @param {number} count 必填，要绘制的点的个数，注意这个值可以小于points的长度
     */
    my.setPoints = function (points, count) {
        this.obj.lvLineSetPoints(points, count)
    }
    let comp = Object.assign(my, base);
    utils.setParent(this.all, comp, parent)
    return comp;
}
export default line;