import dxui from '../../../../../dxmodules/dxUi.js'
import dxCommon from '../../../../../dxmodules/dxCommon.js'
import viewUtils from "../../../viewUtils.js"
import topView from "../../../topView.js"
import deviceInfoView from '../deviceInfoView.js'
import i18n from "../../../i18n.js"
import sqliteService from '../../../../service/sqliteService.js'
const dataCapacityInfoView = {}
dataCapacityInfoView.init = function () {
    /**************************************************创建屏幕*****************************************************/
    const screenMain = dxui.View.build('dataCapacityInfoView', dxui.Utils.LAYER.MAIN)
    dataCapacityInfoView.screenMain = screenMain
    screenMain.scroll(false)
    screenMain.bgColor(0xffffff)
    screenMain.on(dxui.Utils.ENUM.LV_EVENT_SCREEN_LOADED, () => {
        topView.changeTheme(true)

        dataCapacityInfoView.info[0].label.text(Math.floor(dxCommon.getTotaldisk() / 1024 / 1024) + ' M')
        dataCapacityInfoView.info[1].label.text(Math.floor((dxCommon.getTotaldisk() - dxCommon.getFreedisk()) / 1024 / 1024) + ' M')
        dataCapacityInfoView.info[2].label.text(Math.floor(dxCommon.getFreedisk() / 1024 / 1024) + ' M')
        dataCapacityInfoView.info[3].label.text(sqliteService.d1_person.count() + '')
        dataCapacityInfoView.info[4].label.text(sqliteService.d1_voucher.countByType(300) + '')
        dataCapacityInfoView.info[5].label.text(sqliteService.d1_voucher.countByType(400) + '')
        dataCapacityInfoView.info[6].label.text(sqliteService.d1_voucher.countByType(200) + '')
        dataCapacityInfoView.info[7].label.text(sqliteService.d1_pass_record.count() + '')
    })

    const titleBox = viewUtils.title(screenMain, deviceInfoView.screenMain, 'dataCapacityInfoViewTitle', 'deviceInfoView.dataCapacityInfo')
    titleBox.align(dxui.Utils.ALIGN.TOP_MID, 0, 70)

    dataCapacityInfoView.info = [
        {
            title: "deviceInfoView.deviceTotalSpace",
            type: 'label',
            value: '5918 M',
        },
        {
            title: "deviceInfoView.deviceUsedSpace",
            type: 'label',
            value: '344 M',
        },
        // {
        //     title: "deviceInfoView.deviceFreeSpace",
        //     type: 'label',
        //     value: '5574 M',
        // },
        {
            title: "deviceInfoView.deviceRemainingSpace",
            type: 'label',
            value: '3',
        },
        {
            title: "deviceInfoView.registeredPersonNum",
            type: 'label',
            value: '3',
        },
        {
            title: "deviceInfoView.localFaceWhiteListNum",
            type: 'label',
            value: '3',
        },
        {
            title: "deviceInfoView.localPasswordWhiteListNum",
            type: 'label',
            value: '3',
        },
        {
            title: "deviceInfoView.localSwipeCardWhiteListNum",
            type: 'label',
            value: '3',
        },
        {
            title: "deviceInfoView.passLogTotalNum",
            type: 'label',
            value: '3',
        }
    ]

    const dataCapacityInfoBox = dxui.View.build('dataCapacityInfoBox', screenMain)
    viewUtils._clearStyle(dataCapacityInfoBox)
    dataCapacityInfoBox.align(dxui.Utils.ALIGN.TOP_MID, 0, 140)
    dataCapacityInfoBox.setSize(600, 700)
    dataCapacityInfoBox.bgOpa(0)
    dataCapacityInfoBox.flexFlow(dxui.Utils.FLEX_FLOW.ROW_WRAP)
    dataCapacityInfoBox.flexAlign(dxui.Utils.FLEX_ALIGN.CENTER, dxui.Utils.FLEX_ALIGN.START, dxui.Utils.FLEX_ALIGN.START)
    dataCapacityInfoBox.obj.lvObjSetStylePadGap(0, dxui.Utils.ENUM._LV_STYLE_STATE_CMP_SAME)
    dataCapacityInfoBox.borderWidth(1)
    dataCapacityInfoBox.setBorderColor(0xDEDEDE)
    dataCapacityInfoBox.obj.setStyleBorderSide(dxui.Utils.ENUM.LV_BORDER_SIDE_TOP, 0)

    dataCapacityInfoView.info.forEach(item => {
        const itemBox = dxui.View.build(item.title, dataCapacityInfoBox)
        viewUtils._clearStyle(itemBox)
        itemBox.setSize(560, 76)
        itemBox.borderWidth(1)
        itemBox.setBorderColor(0xDEDEDE)
        itemBox.obj.setStyleBorderSide(dxui.Utils.ENUM.LV_BORDER_SIDE_BOTTOM, 0)

        const itemLabel = dxui.Label.build(item.title + 'Label', itemBox)
        itemLabel.dataI18n = item.title
        itemLabel.align(dxui.Utils.ALIGN.LEFT_MID, 0, 0)
        itemLabel.textFont(viewUtils.font(26))

        switch (item.type) {
            case 'label':
                const label = dxui.Label.build(item.title + 'label', itemBox)
                label.textFont(viewUtils.font(24))
                label.align(dxui.Utils.ALIGN.RIGHT_MID, 0, 0)
                label.text(item.value)
                label.textColor(0x767676)
                item.label = label
                break;
        }
    })
}

export default dataCapacityInfoView
