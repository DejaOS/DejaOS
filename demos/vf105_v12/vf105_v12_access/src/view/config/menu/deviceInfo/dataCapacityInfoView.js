import dxUi from '../../../../../dxmodules/dxUi.js'
import dxCommon from '../../../../../dxmodules/dxCommon.js'
import viewUtils from "../../../viewUtils.js"
import topView from "../../../topView.js"
import deviceInfoView from '../deviceInfoView.js'
import i18n from "../../../i18n.js"
import sqliteService from '../../../../service/sqliteService.js'
import screen from '../../../../screen.js'
const dataCapacityInfoView = {}
dataCapacityInfoView.init = function () {
    /************************************************** Create Screen *****************************************************/
    const screenMain = dxUi.View.build('dataCapacityInfoView', dxUi.Utils.LAYER.MAIN)
    dataCapacityInfoView.screenMain = screenMain
    screenMain.scroll(false)
    screenMain.bgColor(0xffffff)
    screenMain.on(dxUi.Utils.ENUM.LV_EVENT_SCREEN_LOADED, () => {
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
    titleBox.align(dxUi.Utils.ALIGN.TOP_MID, 0, 70)

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

    const dataCapacityInfoBox = dxUi.View.build('dataCapacityInfoBox', screenMain)
    viewUtils._clearStyle(dataCapacityInfoBox)
    dataCapacityInfoBox.align(dxUi.Utils.ALIGN.TOP_MID, 0, 140)
    dataCapacityInfoBox.setSize(screen.screenSize.width, 700)
    dataCapacityInfoBox.bgOpa(0)
    dataCapacityInfoBox.flexFlow(dxUi.Utils.FLEX_FLOW.ROW_WRAP)
    dataCapacityInfoBox.flexAlign(dxUi.Utils.FLEX_ALIGN.CENTER, dxUi.Utils.FLEX_ALIGN.START, dxUi.Utils.FLEX_ALIGN.START)
    dataCapacityInfoBox.obj.lvObjSetStylePadGap(0, dxUi.Utils.ENUM._LV_STYLE_STATE_CMP_SAME)
    dataCapacityInfoBox.borderWidth(1)
    dataCapacityInfoBox.setBorderColor(0xDEDEDE)
    dataCapacityInfoBox.obj.setStyleBorderSide(dxUi.Utils.ENUM.LV_BORDER_SIDE_TOP, 0)

    dataCapacityInfoView.info.forEach(item => {
        const itemBox = dxUi.View.build(item.title, dataCapacityInfoBox)
        viewUtils._clearStyle(itemBox)
        itemBox.setSize(760, 76)
        itemBox.borderWidth(1)
        itemBox.setBorderColor(0xDEDEDE)
        itemBox.obj.setStyleBorderSide(dxUi.Utils.ENUM.LV_BORDER_SIDE_BOTTOM, 0)

        const itemLabel = dxUi.Label.build(item.title + 'Label', itemBox)
        itemLabel.dataI18n = item.title
        itemLabel.align(dxUi.Utils.ALIGN.LEFT_MID, 0, 0)
        itemLabel.textFont(viewUtils.font(26))

        switch (item.type) {
            case 'label':
                const label = dxUi.Label.build(item.title + 'label', itemBox)
                label.textFont(viewUtils.font(24))
                label.align(dxUi.Utils.ALIGN.RIGHT_MID, 0, 0)
                label.text(item.value)
                label.textColor(0x767676)
                item.label = label
                break;
        }
    })
}

export default dataCapacityInfoView
