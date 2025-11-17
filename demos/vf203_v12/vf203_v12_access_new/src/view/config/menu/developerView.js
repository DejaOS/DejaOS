import dxui from '../../../../dxmodules/dxUi.js'
import viewUtils from "../../viewUtils.js"
import topView from "../../topView.js"
import configView from '../configView.js'
import i18n from "../../i18n.js"
import screen from '../../../screen.js'
import capcalView from './developer/capcalView.js'

const developerView = {}
developerView.init = function () {
    /**************************************************创建屏幕*****************************************************/
    const screenMain = dxui.View.build('developerView', dxui.Utils.LAYER.MAIN)
    developerView.screenMain = screenMain
    screenMain.scroll(false)
    screenMain.bgColor(0xffffff)
    screenMain.on(dxui.Utils.ENUM.LV_EVENT_SCREEN_LOADED, () => {
        topView.changeTheme(true)
    })

    const titleBox = viewUtils.title(screenMain, configView.screenMain, 'developerViewTitle', 'developerView.title')
    titleBox.align(dxui.Utils.ALIGN.TOP_MID, 0, screen.screenSize.height * (70 / 1024))

    developerView.sysInfo = [
        {
            title: 'developerView.capcal',
            type: 'menu',
            view: capcalView,
            obj: null,
        },
    ]


    const developerBox = dxui.View.build('developerBox', screenMain)
    viewUtils._clearStyle(developerBox)
    developerBox.setSize(screen.screenSize.width, screen.screenSize.height - screen.screenSize.height * (140 / 1024))
    developerBox.align(dxui.Utils.ALIGN.TOP_MID, 0, screen.screenSize.height * (140 / 1024))
    developerBox.bgColor(0xf7f7f7)
    developerBox.flexFlow(dxui.Utils.FLEX_FLOW.ROW_WRAP)
    developerBox.flexAlign(dxui.Utils.FLEX_ALIGN.CENTER, dxui.Utils.FLEX_ALIGN.START, dxui.Utils.FLEX_ALIGN.START)
    developerBox.obj.lvObjSetStylePadGap(screen.screenSize.width * (10 / 600), dxui.Utils.ENUM._LV_STYLE_STATE_CMP_SAME)
    developerBox.padTop(screen.screenSize.height * (10 / 1024))
    developerBox.padBottom(screen.screenSize.height * (10 / 1024))

    developerView.sysInfo.forEach(item => {

        item.obj = dxui.View.build(item.title, developerBox)
        viewUtils._clearStyle(item.obj)
        item.obj.setSize(screen.screenSize.width * (560 / 600), screen.screenSize.height * (76 / 1024))
        item.obj.bgColor(0xffffff)
        item.obj.radius(screen.screenSize.width * (10 / 600))
        item.obj.on(dxui.Utils.ENUM.LV_EVENT_PRESSED, () => {
            item.obj.bgColor(0xEAEAEA)
        })
        item.obj.on(dxui.Utils.ENUM.LV_EVENT_RELEASED, () => {
            item.obj.bgColor(0xffffff)
        })

        const titleLbl = dxui.Label.build(item.title + 'Label', item.obj)
        titleLbl.dataI18n = item.title
        titleLbl.align(dxui.Utils.ALIGN.LEFT_MID, screen.screenSize.width * (20 / 600), 0)
        titleLbl.textFont(viewUtils.font(26))

        const image = dxui.Image.build(item.title + 'Image', item.obj)
        image.align(dxui.Utils.ALIGN.RIGHT_MID, -screen.screenSize.width * (15 / 600), 0)
        image.source(screen.resourcePath.imagePath + '/right.png')
        item.obj.on(dxui.Utils.EVENT.CLICK, () => {
            item.view.screenMain.bgOpa(0)
            dxui.loadMain(item.view.screenMain)
        })
    })

}


export default developerView
