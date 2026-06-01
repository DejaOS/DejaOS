import dxui from '../../../../../dxmodules/dxUi.js'
import std from '../../../../../dxmodules/dxStd.js'
import viewUtils from "../../../viewUtils.js"
import topView from "../../../topView.js"
import localUserAddView from './localUserAddView.js'
import fingerApplyView from './fingerApplyView.js'
import screen from '../../../../screen.js'
import log from '../../../../../dxmodules/dxLogger.js'
import common from '../../../../../dxmodules/dxCommon.js'
import config from '../../../../../dxmodules/dxConfig.js'
import i18n from '../../../i18n.js'
import * as os from "os"
import mainView from '../../../mainView.js'

const fingerEnterView = {}

// 指纹录入标志，用于判断是否退出指纹录入
fingerEnterView.enterFlag = true
// 指纹录入时，默认要读取3次指纹特征
fingerEnterView.count = 3
// 是否是远程指纹录入
// fingerEnterView.isRemote = false

fingerEnterView.init = function () {
    /**************************************************创建屏幕*****************************************************/
    const screenMain = dxui.View.build('fingerEnterView', dxui.Utils.LAYER.MAIN)
    fingerEnterView.screenMain = screenMain
    screenMain.scroll(false)
    screenMain.bgColor(0xffffff)

    screenMain.on(dxui.Utils.ENUM.LV_EVENT_SCREEN_LOADED, () => {
        screen.driver.finger.stop()
        topView.changeTheme(true)
        if(fingerEnterView.isRemote){
            fingerEnterView.titleBox.backScreen = fingerApplyView.screenMain
        }else{
            fingerEnterView.titleBox.backScreen = localUserAddView.screenMain
        }
        fingerEnterView.enterFlag = true
        uiReset()

        log.info("开始指纹录入")
        // 获取索引，获取第一个可用的索引ID
        let inx = screen.driver.finger.getIndex()
        log.info("搜索到的第一个未使用的索引ID: ", inx)
        // 传入索引ID，开始录入特征
        register(inx)
    })

    screenMain.on(dxui.Utils.ENUM.LV_EVENT_SCREEN_UNLOADED, () => {
        screen.driver.finger.start()
        fingerEnterView.titleBox.backScreen = localUserAddView.screenMain
        // 退出指纹录入流程
        fingerEnterView.enterFlag = false
        // fingerEnterView.isRemote = false
        uiReset()
    })

    const titleBoxBg = dxui.View.build(screenMain.id + 'titleBoxBg', screenMain)
    viewUtils._clearStyle(titleBoxBg)
    titleBoxBg.setSize(screen.screenSize.width * (600 / 600), screen.screenSize.height * (70 / 1024))
    titleBoxBg.align(dxui.Utils.ALIGN.TOP_MID, 0, 0)
    titleBoxBg.bgColor(0xffffff)

    const titleBox = viewUtils.title(screenMain, localUserAddView.screenMain, 'fingerEnterViewTitle', 'fingerEnterView.title', fingerEnterView.backCb)
    titleBox.align(dxui.Utils.ALIGN.TOP_MID, 0, screen.screenSize.height * (70 / 1024))
    fingerEnterView.titleBox = titleBox

    const fingerRecLbl = dxui.Label.build('fingerRecLbl', screenMain)
    fingerRecLbl.align(dxui.Utils.ALIGN.TOP_MID, 0, screen.screenSize.height * (240 / 1024))
    fingerRecLbl.textFont(viewUtils.font(28))
    fingerRecLbl.dataI18n = "fingerEnterView.fingerAdd"

    // 指纹录入框
    const fingerBox = dxui.Image.build('fingerBox', screenMain)
    fingerBox.align(dxui.Utils.ALIGN.TOP_MID, 0, screen.screenSize.height * (500 / 1024))
    fingerBox.source(screen.resourcePath.imagePath + '/fingerBoxS.png')
    fingerEnterView.fingerBox = fingerBox
    
    // 指纹录入进度图片
    const fingerRec = dxui.Image.build('fingerRec', screenMain)
    fingerRec.align(dxui.Utils.ALIGN.TOP_MID, 0, screen.screenSize.height * (525 / 1024))
    fingerRec.source(screen.resourcePath.imagePath + '/fingerRe0.png')
    fingerEnterView.fingerRec = fingerRec

    // 最下方进度计数Label
    const fingerCountLbl = dxui.Label.build('fingerCountLbl', screenMain)
    fingerCountLbl.align(dxui.Utils.ALIGN.TOP_MID, 0, screen.screenSize.height * (900 / 1024))
    fingerCountLbl.textFont(viewUtils.font(28))
    fingerCountLbl.text("1/" + fingerEnterView.count)
    fingerEnterView.fingerCountLbl = fingerCountLbl

    // 最下方录入状态提示Label(录入完成、录入失败、录入超时、重复录入)
    const fingerStatusLbl = dxui.Label.build('fingerStatusLbl', screenMain)
    fingerStatusLbl.align(dxui.Utils.ALIGN.TOP_MID, 0, screen.screenSize.height * (800 / 1024))
    fingerStatusLbl.textFont(viewUtils.font(28))
    fingerStatusLbl.dataI18n = " "
    fingerEnterView.fingerStatusLbl = fingerStatusLbl

    // 重复录入情况下-退出按钮 默认隐藏
    const fingerExitBtn = dxui.Button.build('fingerExitBtn', screenMain)
    fingerExitBtn.setSize(screen.screenSize.width * (210 / 600), screen.screenSize.height * (50 / 1024))
    fingerExitBtn.align(dxui.Utils.ALIGN.TOP_LEFT, screen.screenSize.width * (87 / 600), screen.screenSize.height * (900 / 1024))
    fingerExitBtn.bgColor(0xEAEAEA)
    fingerExitBtn.radius(30)
    fingerExitBtn.on(dxui.Utils.EVENT.CLICK, () => {
        fingerEnterView.enterFlag = false
        std.clearInterval(fingerEnterView.fingerTimer)
        fingerEnterView.fingerTimer = null
        if (fingerEnterView.isRemote) {
            fingerApplyView.backCb()
            dxui.loadMain(mainView.screenMain)
        } else {
            dxui.loadMain(localUserAddView.screenMain)
            fingerEnterView.backCb()
        }
    })
    fingerEnterView.fingerExitBtn = fingerExitBtn

    const fingerExitBtnLbl = dxui.Label.build('fingerExitBtnLbl', fingerExitBtn)
    fingerExitBtnLbl.dataI18n = 'fingerEnterView.exit'
    fingerExitBtnLbl.textFont(viewUtils.font(26))
    fingerExitBtnLbl.align(dxui.Utils.ALIGN.CENTER, 0, 0)
    fingerExitBtnLbl.textColor(0x000000)

    // 重复录入情况下-重新录入按钮 默认隐藏
    const fingerResetBtn = dxui.Button.build('fingerResetBtn', screenMain)
    fingerResetBtn.setSize(screen.screenSize.width * (210 / 600), screen.screenSize.height * (50 / 1024))
    fingerResetBtn.align(dxui.Utils.ALIGN.TOP_RIGHT, -screen.screenSize.width * (76 / 600), screen.screenSize.height * (900 / 1024))
    fingerResetBtn.bgColor(0x000000)
    fingerResetBtn.radius(30)
    fingerResetBtn.on(dxui.Utils.EVENT.CLICK, () => {
        // 重新录入指纹
        fingerEnterView.enterFlag = true
        uiReset()

        log.info("指纹重新录入")
        // 获取索引，获取第一个可用的索引ID
        let inx = screen.driver.finger.getIndex()
        log.info("搜索到的第一个未使用的索引ID: ", inx)
        // 传入索引ID，开始录入特征
        register(inx)
    })
    fingerEnterView.fingerResetBtn = fingerResetBtn

    const fingerResetBtnLbl = dxui.Label.build('fingerResetBtnLbl', fingerResetBtn)
    fingerResetBtnLbl.dataI18n = 'fingerEnterView.reset'
    fingerResetBtnLbl.textFont(viewUtils.font(26))
    fingerResetBtnLbl.align(dxui.Utils.ALIGN.CENTER, 0, 0)

    fingerExitBtn.hide()
    fingerResetBtn.hide()
    fingerStatusLbl.hide()
}

function uiReset() {
    fingerEnterView.fingerCountLbl.text("1/" + fingerEnterView.count)
    fingerEnterView.fingerBox.source(screen.resourcePath.imagePath + '/fingerBoxS.png')
    fingerEnterView.fingerRec.source(screen.resourcePath.imagePath + '/fingerRe0.png')
    fingerEnterView.fingerExitBtn.hide()
    fingerEnterView.fingerResetBtn.hide()
    fingerEnterView.fingerStatusLbl.hide()
    fingerEnterView.fingerCountLbl.show()
    std.clearInterval(fingerEnterView.fingerTimer)
    fingerEnterView.fingerTimer = null
}

// 注册指纹到指定的索引
function register(index, timeout = 50){
    // 循环生成N个特征、合并这N个特征为指纹模版、存储指纹模版
    // 1，注册用获取图像
    // 2，生成特征
    // 3，合并模版(合并N个特征)
    // 4，存储模版
    let bufferId = 1
    let startTime = Date.now()
    let language = config.get("base.language")||"CN";
    screen.driver.audio.play(`/app/code/resource/wav/${language}/fingerInput1.wav`)
    fingerEnterView.fingerTimer = std.setInterval(() => {

        if(Date.now() - startTime > timeout * 1000){
            log.info("指纹录入失败、录入超时")
            screen.driver.audio.play(`/app/code/resource/wav/${language}/fingerT.wav`)
            std.clearInterval(fingerEnterView.fingerTimer)
            fingerEnterView.fingerTimer = null
            fingerEnterView.enterFlag = false
            fingerEnterView.fingerBox.source(screen.resourcePath.imagePath + '/fingerBoxF.png')
            fingerEnterView.fingerStatusLbl.dataI18n = "fingerEnterView.timeout"
            fingerEnterView.fingerStatusLbl.textColor(0xFF0000)
            i18n.refreshObj(fingerEnterView.fingerStatusLbl)
            fingerEnterView.fingerStatusLbl.show()
            // 超时后退出到主页面
            if(fingerApplyView.timeOut){
                std.clearTimeout(fingerApplyView.timeOut)
            }
            fingerApplyView.timeOut = null
            // fingerEnterView.isRemote = false;
            dxui.loadMain(mainView.screenMain)
            return
        }

        if(!fingerEnterView.enterFlag || bufferId > fingerEnterView.count){
            std.clearInterval(fingerEnterView.fingerTimer)
            fingerEnterView.fingerTimer = null
            return
        }

        // 1，注册用获取图像
        let res = screen.driver.finger.getEnrollImage()
        if(res != 0) {
            log.info("第" + bufferId + "个特征生成失败、请继续录入")
            return
        }

        // 2，生成特征
        res = screen.driver.finger.genChar(bufferId)
        if(res != 0) {
            log.info("第" + bufferId + "个特征生成失败、请继续录入")
            return
        }

        log.info("第" + bufferId + "个特征成功生成")
        // 特征录入成功，更新进度展示图片
        log.info("ppp: ", "/fingerRe" + bufferId + ".png")
        fingerEnterView.fingerRec.source(screen.resourcePath.imagePath + "/fingerRe" + bufferId + ".png")

        // 全部特征生成成功，开始合并特征生成模版
        if(bufferId == fingerEnterView.count){

            fingerEnterView.fingerCountLbl.hide()

            log.info("全部特征生成成功，开始合并特征生成模版")
            let res = screen.driver.finger.regModel()
            if(res != 0) {
                screen.driver.audio.play(`/app/code/resource/wav/${language}/fingerF.wav`)
                log.info("合并特征失败、指纹录入流程失败!")
                fingerEnterView.enterFlag = false
                fingerEnterView.fingerStatusLbl.dataI18n = "fingerEnterView.fail"
                fingerEnterView.fingerBox.source(screen.resourcePath.imagePath + '/fingerBoxF.png')
                fingerEnterView.fingerStatusLbl.textColor(0xFF0000)
                i18n.refreshObj(fingerEnterView.fingerStatusLbl)
                fingerEnterView.fingerStatusLbl.show()
                fingerEnterView.fingerResetBtn.show()
                fingerEnterView.fingerExitBtn.show()
                return
            }

            res = screen.driver.finger.search(bufferId, 0, 1024)
            if(res && res.code == 0){
                screen.driver.audio.play(`/app/code/resource/wav/${language}/fingerR.wav`)
                log.info("搜索到指纹、指纹验证成功、指纹索引：" + res.pageIndex + "，指纹得分: " + res.score)
                fingerEnterView.enterFlag = false
                fingerEnterView.fingerStatusLbl.dataI18n = "fingerEnterView.repeat"
                fingerEnterView.fingerBox.source(screen.resourcePath.imagePath + '/fingerBoxF.png')
                fingerEnterView.fingerStatusLbl.textColor(0xFF0000)
                i18n.refreshObj(fingerEnterView.fingerStatusLbl)
                fingerEnterView.fingerStatusLbl.show()
                fingerEnterView.fingerResetBtn.show()
                fingerEnterView.fingerExitBtn.show()
                return
            }
            
            log.info("模版生成成功、开始存储模版")
            res = screen.driver.finger.storeChar(index, 1)
            if(res != 0) {
                screen.driver.audio.play(`/app/code/resource/wav/${language}/fingerF.wav`)
                log.info("存储模版失败、指纹录入流程失败!")
                fingerEnterView.enterFlag = false
                fingerEnterView.fingerStatusLbl.dataI18n = "fingerEnterView.fail"
                fingerEnterView.fingerBox.source(screen.resourcePath.imagePath + '/fingerBoxF.png')
                fingerEnterView.fingerStatusLbl.textColor(0xFF0000)
                i18n.refreshObj(fingerEnterView.fingerStatusLbl)
                fingerEnterView.fingerStatusLbl.show()
                fingerEnterView.fingerResetBtn.show()
                fingerEnterView.fingerExitBtn.show()
                return
            }

            log.info("指纹录入成功")
            screen.driver.audio.play(`/app/code/resource/wav/${language}/fingerS.wav`)
            fingerEnterView.enterFlag = false
            fingerEnterView.fingerStatusLbl.dataI18n = "fingerEnterView.success"
            fingerEnterView.fingerBox.source(screen.resourcePath.imagePath + '/fingerBoxS.png')
            fingerEnterView.fingerStatusLbl.textColor(0x05AA8D)
            fingerEnterView.fingerStatusLbl.show()
            i18n.refreshObj(fingerEnterView.fingerStatusLbl)

            std.clearInterval(fingerEnterView.fingerTimer)
            fingerEnterView.fingerTimer = null
            std.setTimeout(() => {
                if(!fingerEnterView.isRemote){
                    localUserAddView.nowUser.fingerId = index
                    localUserAddView.addFinger(localUserAddView.nowUser.fingerId)
                    // fingerEnterView.isRemote = false;
                    dxui.loadMain(localUserAddView.screenMain)
                    fingerEnterView.backCb()
                } else {
                    // 主控读取指纹模版
                    // 从flash中获取指纹模版
                    screen.driver.finger.loadChar(index)
                    // 从传感器上获取bufferId默认为1，从flash中获取bufferId默认为2
                    let res = screen.driver.finger.upChar()
                    log.info("模版数据: ", common.arrayBufferToHexString(res))
                    screen.driver.finger.deleteChar(index, 1)
                    if(res == null) {
                        log.info("指纹模版上传失败!")
                        fingerEnterView.fingerReply(null, screen.MQTT_CODE.E_100)
                        if(fingerEnterView.userId){
                            screen.cacheFingerChar(fingerEnterView.userId, null)
                            fingerEnterView.userId = null
                            fingerEnterView.backCb()
                            // fingerEnterView.isRemote = false;
                            dxui.loadMain(fingerApplyView.screenMain)
                        } else {
                            fingerEnterView.fingerReply(null, screen.MQTT_CODE.E_100)
                        }
                        return
                    }
                    log.info("指纹模版上传成功!")
                    if (!fingerEnterView.isRemote || fingerEnterView.payload.data.extra.isRemote === false) {
                        screen.cacheFingerChar(fingerEnterView.userId, common.arrayBufferToHexString(res))
                        fingerEnterView.backCb()
                        // fingerEnterView.isRemote = false;
                        dxui.loadMain(mainView.screenMain)
                    } else {
                        fingerEnterView.fingerReply(common.arrayBufferToHexString(res), screen.MQTT_CODE.S_000)
                    }
                }
            }, 1000);
            
            return
        }
        bufferId++

        // 写这里是因为，指纹录入后可以立马播报，而没有延迟，写到上面就会在2秒的下次循环后才会播报
        screen.driver.audio.play(`/app/code/resource/wav/${language}/fingerInput${bufferId}.wav`)

        // 特征录入成功，更新进度提示
        fingerEnterView.fingerCountLbl.text(bufferId + "/" + fingerEnterView.count)
    }, 2000)
}

fingerEnterView.enrollFinger = function(payload) {
    fingerEnterView.isRemote = true
    fingerEnterView.payload = payload
}

fingerEnterView.fingerReply = function(fingerChar, code){
    if(!fingerEnterView.payload){
        return
    }
    let data = {
        serialNo: fingerEnterView.payload.serialNo,
        fingerChar: fingerChar,
        code: code
    }
    screen.fingerReply(data)
    fingerEnterView.payload = null
    // fingerEnterView.isRemote = false
    // 隐藏该页面
    dxui.loadMain(mainView.screenMain)
}

fingerEnterView.fingerRegister = function() {
    // 重新录入指纹
    fingerEnterView.enterFlag = true
    uiReset()

    log.info("指纹重新录入")
    // 获取索引，获取第一个可用的索引ID
    let inx = screen.driver.finger.getIndex()
    log.info("搜索到的第一个未使用的索引ID: ", inx)
    // 传入索引ID，开始录入特征
    register(inx)
}

fingerEnterView.backCb = function () {
    log.info("remote: ", fingerEnterView.isRemote)
    if(!fingerEnterView.isRemote){
        if (!localUserAddView.nowUser) {
            return
        }
        if (localUserAddView.nowUser.id) {
        }
        localUserAddView.addID(localUserAddView.nowUser.id)
        if (localUserAddView.nowUser.name) {
            localUserAddView.addName(localUserAddView.nowUser.name)
        }
        if (localUserAddView.nowUser.idCard) {
            localUserAddView.addIDCard(localUserAddView.nowUser.idCard)
        }
        if (localUserAddView.nowUser.face) {
            localUserAddView.addFace(localUserAddView.nowUser.face, localUserAddView.nowUser.feature)
        }
        if (localUserAddView.nowUser.pwd) {
            localUserAddView.addPwd(localUserAddView.nowUser.pwd)
        }
        if (localUserAddView.nowUser.card) {
            localUserAddView.addCard(localUserAddView.nowUser.card)
        }
        localUserAddView.addType(localUserAddView.nowUser.type)
    } else {
        // fingerEnterView.isRemote = false;
        screen.driver.finger.start()
    }
}

export default fingerEnterView