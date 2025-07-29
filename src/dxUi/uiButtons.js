//build：20240314
//按钮组控件
import utils from "./uiUtils.js"
import base from "./uiBase.js"
let buttons = {}

buttons.build = function (id, parent) {
    let temp = utils.validateBuild(buttons.all, id, parent, 'buttons')
    let my = {type: 'buttons'}
    my.obj = new utils.GG.NativeBtnmatrix({ uid: id }, temp)
    my.id = id
    /**
     * 设置button组对应的数据，必须是数组格式，示例如下：表示三行按钮，总共12个按钮
     * ["1", "2", "3", "0", "\n",
     * "4", "5", "6", "取消", "\n",
     *  "7", "8", "9", "确认", ""]
     * @param {array} d 非必填，如果没有填或者不是object类型就是获取数据
     */
    my.data = function (d) {
        if (utils.validateObject(d)) {
            this.obj.lvBtnmatrixSetMap(d)
        } else {
            return this.obj.lvBtnmatrixGetMap()
        }
    }
    /**
     * 点击按钮组里任何一个按钮，调用selectedData来获取点击按钮的id和文本
     * 返回示例: {id:11,text:'取消'}
     */
    my.clickedButton = function () {
        let id = this.obj.lvBtnmatrixGetSelectedBtn();
        if (id == 0xFFFF) {
            // 点击按钮组边界会出现0xFFFF非法值，返回空
            return { id: null, text: null }
        }
        let txt = this.obj.lvBtnmatrixGetBtnText(id);
        return { id: id, text: txt }
    }
    /**
     * 设置按钮组里某一个特定按钮的状态，可以改成选中，不可用之类的
     * @param {number} id 按钮的索引，从0开始从左到右从上到下，也是点击按钮clickedButton返回的id
     * @param {number} state 参考dxui.Utils.BUTTONS_STATE 
     */
    my.setState = function (id, state) {
        this.obj.lvBtnmatrixSetBtnCtrl(id, state)
    }
    /**
     * 清除按钮组里某一个特定按钮的已经设置好的状态
     * @param {number} id 按钮的索引，从0开始从左到右从上到下，也是点击按钮clickedButton返回的id
     * @param {number} state 参考dxui.Utils.BUTTONS_STATE 
     */
    my.clearState = function (id, state) {
        this.obj.lvBtnmatrixClearBtnCtrl(id, state)
    }
    /**
     * 设置按钮组里所有按钮的状态，可以改成选中，不可用之类的
     * @param {number} state 参考dxui.Utils.BUTTONS_STATE 
     */
    my.setAllState = function (state) {
        this.obj.lvBtnmatrixSetBtnCtrlAll(state)
    }
    /**
     * 清除按钮组里所有按钮的已经设置好的状态
     * @param {number} state 参考dxui.Utils.BUTTONS_STATE 
     */
    my.clearAllState = function (state) {
        this.obj.lvBtnmatrixClearBtnCtrlAll(state)
    }
    /**
     * 设置某个id的按钮宽度占用几格
     * @param {number} id 按钮序号，从0开始编号
     * @param {number} width 宽度跨越格子数量
     */
    my.setBtnWidth = function (id, width) {
        this.obj.lvBtnmatrixSetBtnWidth(id, width)
    }
    /**
     * 设置某个id的按钮图标
     * @param {number} id 按钮序号，从0开始编号
     * @param {string} src 图标文件路径
     */
    my.setBtnIcon = function (id, src) {
        this.obj.addEventCb((e) => {
            // 获取绘制控件对象
            let dsc = e.lvEventGetDrawPartDsc()
            // 如果是绘制第id个按钮
            if (dsc.type == utils.ENUM.LV_BTNMATRIX_DRAW_PART_BTN && dsc.id == id) {
                // 获取图片信息
                let header = utils.GG.NativeDraw.lvImgDecoderGetInfo(src)
                // 定义一块区域，居中显示，注意：尺寸转area需要-1，area转尺寸需要+1
                let x1 = dsc.draw_area.x1 + (dsc.draw_area.x2 - dsc.draw_area.x1 + 1 - header.w) / 2;
                let y1 = dsc.draw_area.y1 + (dsc.draw_area.y2 - dsc.draw_area.y1 + 1 - header.h) / 2;
                let x2 = x1 + header.w - 1;
                let y2 = y1 + header.h - 1;
                let area = utils.GG.NativeArea.lvAreaSet(x1, y1, x2, y2)
                // 绘制图片信息
                let img_draw_dsc = utils.GG.NativeDraw.lvDrawImgDscInit()
                // 绘制图片
                utils.GG.NativeDraw.lvDrawImg(dsc.dsc, img_draw_dsc, area, src)
            }
        }, utils.ENUM.LV_EVENT_DRAW_PART_END)
    }
    let comp = Object.assign(my, base);
    utils.setParent(this.all,comp,parent)
    return comp;
}
export default buttons;