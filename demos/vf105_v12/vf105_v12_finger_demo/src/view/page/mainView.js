import dxui from '../../../dxmodules/dxUi.js'
import logger from '../../../dxmodules/dxLogger.js'
import dxFingerZaz from '../../../dxmodules/dxFingerZaz.js'
import popWin from '../util/popWin.js'
import screen from '../../screen.js'
import std from '../../../dxmodules/dxStd.js'
import bus from '../../../dxmodules/dxEventBus.js'
let data
let isRegisterMode = false
let isVerifyMode = false

const mainView = {}

mainView.init = function () {
    let main = dxui.View.build('mainView', dxui.Utils.LAYER.MAIN)
    mainView.main = main
    mainView.main.scroll(false)
    mainView.main.bgOpa(0)

    const openDeviceBtn = dxui.Button.build('openDeviceBtn', main)
    openDeviceBtn.setSize(700, 120)
    openDeviceBtn.setPos(50, 50)
    openDeviceBtn.bgColor(0x585858)

    let openDeviceLab = buildLabel('openDeviceLab', openDeviceBtn, 30, "open device")
    openDeviceBtn.update()
    openDeviceLab.width(openDeviceBtn.width() - 20)
    openDeviceLab.longMode(dxui.Utils.LABEL_LONG_MODE.SCROLL_CIRCULAR)
    openDeviceLab.align(dxui.Utils.ALIGN.CENTER, 0, 0);
    openDeviceLab.textColor(0xFFFFFF)

    openDeviceBtn.on(dxui.Utils.EVENT.CLICK, () => {
        // Open device and test connectivity
        logger.info('execute:test')
        let ret = dxFingerZaz.test()
        if (ret) {
            popWin.show("device connected")
        } else {
            popWin.show("device not connected")
        }
    })


    const selectFingerBtn = dxui.Button.build('selectFingerBtn', main)
    selectFingerBtn.setSize(300, 120)
    selectFingerBtn.setPos(50, 200)
    selectFingerBtn.bgColor(0x585858)

    let selectFingerLab = buildLabel('selectFingerLab', selectFingerBtn, 30, "select finger")
    selectFingerBtn.update()
    selectFingerLab.width(selectFingerBtn.width() - 20)
    selectFingerLab.longMode(dxui.Utils.LABEL_LONG_MODE.SCROLL_CIRCULAR)
    selectFingerLab.align(dxui.Utils.ALIGN.CENTER, 0, 0);
    selectFingerLab.textColor(0xFFFFFF)

    selectFingerBtn.on(dxui.Utils.EVENT.CLICK, () => {
        isRegisterMode = false
        isVerifyMode = false
        // Query total number of enrolled fingerprints
        logger.info('execute:selectFinger')

        let ret = dxFingerZaz.getEnrollCount(1, 5000)
        popWin.show("enroll count: " + ret)
    })


    const deleteFingerBtn = dxui.Button.build('deleteFingerBtn', main)
    deleteFingerBtn.setSize(300, 120)
    deleteFingerBtn.setPos(450, 200)
    deleteFingerBtn.bgColor(0x585858)

    let deleteFingerLab = buildLabel('deleteFingerLab', deleteFingerBtn, 30, "delete all finger")
    deleteFingerBtn.update()
    deleteFingerLab.width(deleteFingerBtn.width() - 20)
    deleteFingerLab.longMode(dxui.Utils.LABEL_LONG_MODE.SCROLL_CIRCULAR)
    deleteFingerLab.align(dxui.Utils.ALIGN.CENTER, 0, 0);
    deleteFingerLab.textColor(0xFFFFFF)

    deleteFingerBtn.on(dxui.Utils.EVENT.CLICK, () => {
        isRegisterMode = false
        isVerifyMode = false
        // Delete fingerprint
        logger.info('execute:deleteFinger')

        let ret = dxFingerZaz.delChar(1, 5000)
        if (ret) {
            popWin.show("delete finger success")
        } else {
            popWin.show("delete finger failed")
        }
    })


    const detectFingerBtn = dxui.Button.build('detectFingerBtn', main)
    detectFingerBtn.setSize(300, 120)
    detectFingerBtn.setPos(50, 350)
    detectFingerBtn.bgColor(0x585858)

    let detectFingerLab = buildLabel('detectFingerLab', detectFingerBtn, 30, "detect finger")
    detectFingerBtn.update()
    detectFingerLab.width(detectFingerBtn.width() - 20)
    detectFingerLab.longMode(dxui.Utils.LABEL_LONG_MODE.SCROLL_CIRCULAR)
    detectFingerLab.align(dxui.Utils.ALIGN.CENTER, 0, 0);
    detectFingerLab.textColor(0xFFFFFF)

    detectFingerBtn.on(dxui.Utils.EVENT.CLICK, () => {
        isRegisterMode = false
        isVerifyMode = false

        // Detect fingerprint
        logger.info('execute:detectFinger')

        let ret = dxFingerZaz.fingerDetect()
        if (ret) {
            popWin.show("detect finger success")
        } else {
            popWin.show("detect finger failed")
        }
    })


    const getParamBtn = dxui.Button.build('getParamBtn', main)
    getParamBtn.setSize(300, 120)
    getParamBtn.setPos(450, 350)
    getParamBtn.bgColor(0x585858)

    let getParamLab = buildLabel('getParamLab', getParamBtn, 30, "get param")
    getParamBtn.update()
    getParamLab.width(getParamBtn.width() - 20)
    getParamLab.longMode(dxui.Utils.LABEL_LONG_MODE.SCROLL_CIRCULAR)
    getParamLab.align(dxui.Utils.ALIGN.CENTER, 0, 0);
    getParamLab.textColor(0xFFFFFF)

    getParamBtn.on(dxui.Utils.EVENT.CLICK, () => {
        isRegisterMode = false
        isVerifyMode = false

        // Get parameters
        logger.info('execute:getParam')

        let ret0 = dxFingerZaz.getParam(0)
        let ret1 = dxFingerZaz.getParam(1)
        let ret2 = dxFingerZaz.getParam(2)
        let ret3 = dxFingerZaz.getParam(3)
        let ret4 = dxFingerZaz.getParam(4)
        // 0: Device ID, 1: Security level, 2: Repeat check, 3: Baud rate, 4: Auto learn
        popWin.show("get param success \ndeviceId: " + ret0 + "\nsecurityLevel: " + ret1 + "\nrepeatCheck: " + ret2 + "\nbaudRate: " + ret3 + "\nautoLearn: " + ret4)
    })


    const uploadFingerBtn = dxui.Button.build('uploadFingerBtn', main)
    uploadFingerBtn.setSize(300, 120)
    uploadFingerBtn.setPos(50, 500)
    uploadFingerBtn.bgColor(0x585858)

    let uploadFingerLab = buildLabel('uploadFingerLab', uploadFingerBtn, 30, "upload finger")
    uploadFingerBtn.update()
    uploadFingerLab.width(uploadFingerBtn.width() - 20)
    uploadFingerLab.longMode(dxui.Utils.LABEL_LONG_MODE.SCROLL_CIRCULAR)
    uploadFingerLab.align(dxui.Utils.ALIGN.CENTER, 0, 0);
    uploadFingerLab.textColor(0xFFFFFF)

    uploadFingerBtn.on(dxui.Utils.EVENT.CLICK, () => {
        isRegisterMode = false
        isVerifyMode = false

        // Upload fingerprint template
        logger.info('execute:uploadFinger')

        let bufferNum = 0

        let ret = dxFingerZaz.getImage()
        if (ret) {
            ret = dxFingerZaz.generate(bufferNum)
            if (ret) {
                ret = dxFingerZaz.upChar(bufferNum)
                if (ret) {
                    data = ret
                    popWin.show("upload finger success")
                } else {
                    popWin.show("upload finger failed")
                }
            } else {
                popWin.show("generate failed")
            }
        } else {
            popWin.show("get image failed")
        }
    })


    const downloadFingerBtn = dxui.Button.build('downloadFingerBtn', main)
    downloadFingerBtn.setSize(300, 120)
    downloadFingerBtn.setPos(450, 500)
    downloadFingerBtn.bgColor(0x585858)

    let downloadFingerLab = buildLabel('downloadFingerLab', downloadFingerBtn, 30, "download finger")
    downloadFingerBtn.update()
    downloadFingerLab.width(downloadFingerBtn.width() - 20)
    downloadFingerLab.longMode(dxui.Utils.LABEL_LONG_MODE.SCROLL_CIRCULAR)
    downloadFingerLab.align(dxui.Utils.ALIGN.CENTER, 0, 0);
    downloadFingerLab.textColor(0xFFFFFF)

    downloadFingerBtn.on(dxui.Utils.EVENT.CLICK, () => {
        isRegisterMode = false
        isVerifyMode = false

        // Download fingerprint template
        logger.info('execute:downloadFinger')

        let bufferNum = 0
        let keyId = dxFingerZaz.getEmptyId(1, 5000)

        let ret = dxFingerZaz.downChar(bufferNum, data)
        if (ret) {
            ret = dxFingerZaz.storeChar(keyId, bufferNum)
            popWin.show("download finger success\nkeyId: " + keyId)
        } else {
            popWin.show("download finger failed")
        }
    })


    const getListBtn = dxui.Button.build('getListBtn', main)
    getListBtn.setSize(300, 120)
    getListBtn.setPos(50, 650)
    getListBtn.bgColor(0x585858)

    let getListLab = buildLabel('getListLab', getListBtn, 30, "get list")
    getListBtn.update()
    getListLab.width(getListBtn.width() - 20)
    getListLab.longMode(dxui.Utils.LABEL_LONG_MODE.SCROLL_CIRCULAR)
    getListLab.align(dxui.Utils.ALIGN.CENTER, 0, 0);
    getListLab.textColor(0xFFFFFF)

    getListBtn.on(dxui.Utils.EVENT.CLICK, () => {
        isRegisterMode = false
        isVerifyMode = false

        // Get fingerprint list
        logger.info('execute:getList')

        let ret = dxFingerZaz.getEnrolledIdList()
        if (ret) {
            popWin.show("keyIds: " + ret)
        } else {
            popWin.show("get list failed")
        }
    })


    const getDevInfoBtn = dxui.Button.build('getDevInfoBtn', main)
    getDevInfoBtn.setSize(300, 120)
    getDevInfoBtn.setPos(450, 650)
    getDevInfoBtn.bgColor(0x585858)

    let getDevInfoLab = buildLabel('getDevInfoLab', getDevInfoBtn, 30, "get dev info")
    getDevInfoBtn.update()
    getDevInfoLab.width(getDevInfoBtn.width() - 20)
    getDevInfoLab.longMode(dxui.Utils.LABEL_LONG_MODE.SCROLL_CIRCULAR)
    getDevInfoLab.align(dxui.Utils.ALIGN.CENTER, 0, 0);
    getDevInfoLab.textColor(0xFFFFFF)

    getDevInfoBtn.on(dxui.Utils.EVENT.CLICK, () => {
        isRegisterMode = false
        isVerifyMode = false

        // Get fingerprint module device information
        logger.info('execute:getDevInfo')

        let ret = dxFingerZaz.getDeviceInfo()
        if (ret) {
            popWin.show("get dev info success\n" + ret)
        } else {
            popWin.show("get dev info failed")
        }
    })





    const setVerifyModeBtn = dxui.Button.build('setVerifyModeBtn', main)
    setVerifyModeBtn.setSize(700, 120)
    setVerifyModeBtn.setPos(50, 800)
    setVerifyModeBtn.bgColor(0x585858)

    let setVerifyModeLab = buildLabel('setVerifyModeLab', setVerifyModeBtn, 30, "on/off verify mode")
    setVerifyModeBtn.update()
    setVerifyModeLab.width(setVerifyModeBtn.width() - 20)
    setVerifyModeLab.longMode(dxui.Utils.LABEL_LONG_MODE.SCROLL_CIRCULAR)
    setVerifyModeLab.align(dxui.Utils.ALIGN.CENTER, 0, 0);
    setVerifyModeLab.textColor(0xFFFFFF)

    setVerifyModeBtn.on(dxui.Utils.EVENT.CLICK, () => {
        isRegisterMode = false

        // Turn on/off verify mode
        if (isVerifyMode) {
            isVerifyMode = false
            popWin.show("verify mode off")
        } else {
            isVerifyMode = true
            popWin.show("verify mode on")
        }
    })


    const setRegisterModeBtn = dxui.Button.build('setRegisterModeBtn', main)
    setRegisterModeBtn.setSize(700, 120)
    setRegisterModeBtn.setPos(50, 950)
    setRegisterModeBtn.bgColor(0x585858)

    let setRegisterModeLab = buildLabel('setRegisterModeLab', setRegisterModeBtn, 30, "on/off register mode")
    setRegisterModeBtn.update()
    setRegisterModeLab.width(setRegisterModeBtn.width() - 20)
    setRegisterModeLab.longMode(dxui.Utils.LABEL_LONG_MODE.SCROLL_CIRCULAR)
    setRegisterModeLab.align(dxui.Utils.ALIGN.CENTER, 0, 0);
    setRegisterModeLab.textColor(0xFFFFFF)

    setRegisterModeBtn.on(dxui.Utils.EVENT.CLICK, () => {
        isVerifyMode = false
        // Turn on/off register mode
        if (isRegisterMode) {
            isRegisterMode = false
            popWin.show("register mode off")
        } else {
            isRegisterMode = true
            popWin.show("register mode on")
        }
    })

    const mergeBtn = dxui.Button.build('mergeBtn', main)
    mergeBtn.setSize(700, 120)
    mergeBtn.setPos(50, 1100)
    mergeBtn.bgColor(0x585858)

    let mergeLab = buildLabel('mergeLab', mergeBtn, 30, "merge")
    mergeBtn.update()
    mergeLab.width(mergeBtn.width() - 20)
    mergeLab.longMode(dxui.Utils.LABEL_LONG_MODE.SCROLL_CIRCULAR)
    mergeLab.align(dxui.Utils.ALIGN.CENTER, 0, 0);
    mergeLab.textColor(0xFFFFFF)

    mergeBtn.on(dxui.Utils.EVENT.CLICK, () => {
        isRegisterMode = false
        isVerifyMode = false
        bus.fire("merge")
    })

    // Verify and register
    std.setInterval(() => {
        if (isVerifyMode) {
            logger.info('verify mode')
            let bufferNum = 0

            let ret = dxFingerZaz.getImage()
            if (ret) {
                ret = dxFingerZaz.generate(bufferNum)
                if (ret) {
                    ret = dxFingerZaz.search(bufferNum, 1, 5000)
                    if (ret) {
                        popWin.show("verify finger success\nkeyId: " + ret)
                    } else {
                        popWin.show("verify finger failed")
                    }
                } else {
                    popWin.show("generate failed")
                }
            }
        }



        if (isRegisterMode) {
            logger.info('register')
            let bufferNum = 0
            let keyId = dxFingerZaz.getEmptyId(1, 5000)

            let ret = dxFingerZaz.getImage()
            if (ret) {
                ret = dxFingerZaz.generate(bufferNum)
                if (ret) {
                    ret = dxFingerZaz.storeChar(keyId, bufferNum)
                    popWin.show("registered finger success\nkeyId: " + keyId)
                } else {
                    popWin.show("registered finger failed")
                }
            }
        }
    }, 50)

}



function buildLabel(id, parent, size, text) {
    let label = dxui.Label.build(id, parent)
    let font60 = dxui.Font.build(screen.fontPath, size, dxui.Utils.FONT_STYLE.NORMAL)
    label.textFont(font60)
    label.textColor(0x000000)
    label.text(text)
    label.textAlign(dxui.Utils.TEXT_ALIGN.CENTER)
    return label
}
/**
 * Wait for getImage to succeed or timeout
 * @param {number} timeoutMs Timeout in milliseconds
 * @param {number} intervalMs Interval between attempts in milliseconds
 * @returns {boolean} Returns true on success, false on timeout or failure
 */
function waitForImage(timeoutMs = 10000, intervalMs = 100) {
    const startTime = new Date().getTime();
    let ret = false;

    while (true) {
        ret = dxFingerZaz.getImage();
        if (ret) {
            break;
        }

        // Check if timeout
        if (new Date().getTime() - startTime >= timeoutMs) {
            break;
        }

        std.sleep(intervalMs);
    }

    return ret;
}
export default mainView