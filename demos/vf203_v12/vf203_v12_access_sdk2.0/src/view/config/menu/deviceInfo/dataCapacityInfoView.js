import dxui from '../../../../../dxmodules/dxUi.js'
import viewUtils from "../../../viewUtils.js"
import topView from "../../../topView.js"
import deviceInfoView from '../deviceInfoView.js'
import dxCommonUtils from '../../../../../dxmodules/dxCommonUtils.js'
import screen from '../../../../screen.js'
import driver from '../../../../driver.js'
const dataCapacityInfoView = {}
dataCapacityInfoView.init = function () {
    /**************************************************创建屏幕*****************************************************/
    const screenMain = dxui.View.build('dataCapacityInfoView', dxui.Utils.LAYER.MAIN)
    dataCapacityInfoView.screenMain = screenMain
    screenMain.scroll(false)
    screenMain.bgColor(0xffffff)
    screenMain.on(dxui.Utils.ENUM.LV_EVENT_SCREEN_LOADED, () => {
        topView.changeTheme(true)

        const diskStats = dxCommonUtils.getDiskStats()
        const sqlite = screen.getSqliteService()
        const info = dataCapacityInfoView.info

        info.deviceTotalSpace.label.text(diskStats.total + ' M')
        info.deviceUsedSpace.label.text(diskStats.used + ' M')
        info.deviceRemainingSpace.label.text(diskStats.free + ' M')
        info.registeredPersonNum.label.text(sqlite.d1_person.count() + '')
        info.localFaceWhiteListNum.label.text(sqlite.d1_voucher.countByType(300) + '')
        info.localPasswordWhiteListNum.label.text(sqlite.d1_voucher.countByType(400) + '')
        info.localSwipeCardWhiteListNum.label.text(sqlite.d1_voucher.countByType(200) + '')
        if (driver.device.finger) {
            dataCapacityInfoView.fingerBox.show()
            info.localFingerWhiteListNum.label.text(sqlite.d1_voucher.countByType(500) + '')
            // info.localFingerWhiteListNum.label.text(driver.finger.getEnrollCount() + '')
        } else {
            dataCapacityInfoView.fingerBox.hide()
        }
        info.passLogTotalNum.label.text(sqlite.d1_pass_record.count() + '')
    })

    const titleBox = viewUtils.title(screenMain, deviceInfoView.screenMain, 'dataCapacityInfoViewTitle', 'deviceInfoView.dataCapacityInfo')
    titleBox.align(dxui.Utils.ALIGN.TOP_MID, 0, screen.screenSize.height * (70 / 1024))

    dataCapacityInfoView.info = {
        deviceTotalSpace: {
            title: "deviceInfoView.deviceTotalSpace",
            type: 'label',
            value: '5918 M',
        },
        deviceUsedSpace: {
            title: "deviceInfoView.deviceUsedSpace",
            type: 'label',
            value: '344 M',
        },
        deviceRemainingSpace: {
            title: "deviceInfoView.deviceRemainingSpace",
            type: 'label',
            value: '3',
        },
        registeredPersonNum: {
            title: "deviceInfoView.registeredPersonNum",
            type: 'label',
            value: '3',
        },
        localFaceWhiteListNum: {
            title: "deviceInfoView.localFaceWhiteListNum",
            type: 'label',
            value: '3',
        },
        localPasswordWhiteListNum: {
            title: "deviceInfoView.localPasswordWhiteListNum",
            type: 'label',
            value: '3',
        },
        localSwipeCardWhiteListNum: {
            title: "deviceInfoView.localSwipeCardWhiteListNum",
            type: 'label',
            value: '3',
        },
        localFingerWhiteListNum: {
            title: "deviceInfoView.localFingerWhiteListNum",
            type: 'label',
            value: '0',
        },
        passLogTotalNum: {
            title: "deviceInfoView.passLogTotalNum",
            type: 'label',
            value: '3',
        }
    }

    const dataCapacityInfoBox = dxui.View.build('dataCapacityInfoBox', screenMain)
    viewUtils._clearStyle(dataCapacityInfoBox)
    dataCapacityInfoBox.align(dxui.Utils.ALIGN.TOP_MID, 0, screen.screenSize.height * (140 / 1024))
    dataCapacityInfoBox.setSize(screen.screenSize.width * (600 / 600), screen.screenSize.height * (700 / 1024))
    dataCapacityInfoBox.bgOpa(0)
    dataCapacityInfoBox.flexFlow(dxui.Utils.FLEX_FLOW.ROW_WRAP)
    dataCapacityInfoBox.flexAlign(dxui.Utils.FLEX_ALIGN.CENTER, dxui.Utils.FLEX_ALIGN.START, dxui.Utils.FLEX_ALIGN.START)
    dataCapacityInfoBox.obj.lvObjSetStylePadGap(screen.screenSize.width * (0 / 600), dxui.Utils.ENUM._LV_STYLE_STATE_CMP_SAME)
    dataCapacityInfoBox.borderWidth(screen.screenSize.width * (1 / 600))
    dataCapacityInfoBox.setBorderColor(0xDEDEDE)
    dataCapacityInfoBox.obj.setStyleBorderSide(dxui.Utils.ENUM.LV_BORDER_SIDE_TOP, 0)

    Object.values(dataCapacityInfoView.info).forEach(item => {
        const itemBox = dxui.View.build(item.title, dataCapacityInfoBox)
        viewUtils._clearStyle(itemBox)
        itemBox.setSize(screen.screenSize.width * (560 / 600), screen.screenSize.height * (76 / 1024))
        itemBox.borderWidth(screen.screenSize.width * (1 / 600))
        itemBox.setBorderColor(0xDEDEDE)
        itemBox.obj.setStyleBorderSide(dxui.Utils.ENUM.LV_BORDER_SIDE_BOTTOM, 0)

        const itemLabel = dxui.Label.build(item.title + 'Label', itemBox)
        itemLabel.dataI18n = item.title
        itemLabel.align(dxui.Utils.ALIGN.LEFT_MID, 0, 0)
        itemLabel.textFont(viewUtils.font(26))

        switch (item.title) {
            case 'deviceInfoView.localFingerWhiteListNum':
                dataCapacityInfoView.fingerBox = itemBox
            break;
        }

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
