import dxui from '../dxmodules/dxUi.js'
import dxMap from '../dxmodules/dxMap.js'
import log from '../dxmodules/dxLogger.js'
import viewUtils from './view/viewUtils.js'
import i18n from './view/i18n.js'
import pinyin from './view/pinyin/pinyin.js'
import mainView from './view/mainView.js'
import idleView from './view/idleView.js'
import topView from './view/topView.js'
import appView from './view/appView.js'
import pwdView from './view/pwdView.js'
import newPwdView from './view/config/newPwdView.js'
import identityVerificationView from './view/config/identityVerificationView.js'
import configView from './view/config/configView.js'
import doorControlView from './view/config/menu/doorControlView.js'
import helpView from './view/config/menu/helpView.js'
import networkSettingView from './view/config/menu/networkSettingView.js'
import systemSettingView from './view/config/menu/systemSettingView.js'
import deviceInfoView from './view/config/menu/deviceInfoView.js'
import localUserView from './view/config/menu/localUserView.js'
import recordQueryView from './view/config/menu/recordQueryView.js'
import voiceBroadcastView from './view/config/menu/voiceBroadcastView.js'
import localUserAddView from './view/config/menu/localUser/localUserAddView.js'
import faceEnterView from './view/config/menu/localUser/faceEnterView.js'
import displaySettingView from './view/config/menu/systemSetting/displaySettingView.js'
import faceRecognitionSettingView from './view/config/menu/systemSetting/faceRecognitionSettingView.js'
import swipeCardRecognitionSettingView from './view/config/menu/systemSetting/swipeCardRecognitionSettingView.js'
import passLogSettingView from './view/config/menu/systemSetting/passLogSettingView.js'
import passwordOpenDoorSettingView from './view/config/menu/systemSetting/passwordOpenDoorSettingView.js'
import passwordManagementView from './view/config/menu/systemSetting/passwordManagementView.js'
import timeSettingView from './view/config/menu/systemSetting/timeSettingView.js'
import systemInfoView from './view/config/menu/deviceInfo/systemInfoView.js'
import dataCapacityInfoView from './view/config/menu/deviceInfo/dataCapacityInfoView.js'
import recordQueryDetailView from './view/config/menu/recordQuery/recordQueryDetailView.js'
import cloudCertView from './view/config/menu/cloudCertView.js'
import developerView from './view/config/menu/developerView.js'
import capcalView from './view/config/menu/developer/capcalView.js'
import wechatNetView from './view/wechatNetView.js'
import wechatBindView from './view/wechatBindView.js'
import wechatFaceView from './view/wechatFaceView.js'
import std from '../dxmodules/dxStd.js'
import bus from '../dxmodules/dxEventBus.js'
import driver from './driver.js'
import config from '../dxmodules/dxConfig.js'
import dxos from '../dxmodules/dxOs.js'
import configService from './service/configService.js'
import sqliteService from './service/sqliteService.js'
import mqttService from './service/mqttService.js'
import faceService from './service/faceService.js'
import weComService from './service/weComService.js'
import logger from '../dxmodules/dxLogger.js'
import dxDriver from '../dxmodules/dxDriver.js'

const screen = {}

screen.screenSize = {
    width: dxDriver.DISPLAY.WIDTH,
    height: dxDriver.DISPLAY.HEIGHT
}

screen.resourcePath = {
    imagePath: `/app/code/resource/image/${dxDriver.DRIVER.MODEL}/`
}

screen.dropdownSymbol = screen.resourcePath.imagePath + '/down.png'

// ui上下文
const context = {}

// 初始化方法，在main.js中调用，只允许调用一次
screen.init = function () {
    const loadMethod = dxui.loadMain
    dxui.loadMain = function (view) {
        if (screen.screenNow && screen.screenNow.id == view.id) {
            return
        }
        screen.screenNow = view
        pinyin.hide(true)
        loadMethod.call(dxui, view)
    }

    dxui.init({ orientation: dxDriver.DISPLAY.ROTATION }, context);
    // 初始化所有组件
    pinyin.init(screen.screenSize.width, screen.screenSize.width / 2)
    viewUtils.confirmInit()
    mainView.init()
    idleView.init()
    topView.init()
    appView.init()
    pwdView.init()
    newPwdView.init()
    wechatNetView.init()
    wechatBindView.init()
    wechatFaceView.init()
    identityVerificationView.init()
    configView.init()
    cloudCertView.init()
    doorControlView.init()
    helpView.init()
    developerView.init()
    capcalView.init()
    networkSettingView.init()
    systemSettingView.init()
    deviceInfoView.init()
    localUserView.init()
    recordQueryView.init()
    voiceBroadcastView.init()
    localUserAddView.init()
    faceEnterView.init()
    displaySettingView.init()
    faceRecognitionSettingView.init()
    swipeCardRecognitionSettingView.init()
    passLogSettingView.init()
    passwordOpenDoorSettingView.init()
    passwordManagementView.init()
    timeSettingView.init()
    systemInfoView.init()
    dataCapacityInfoView.init()
    recordQueryDetailView.init()
    // 设置语言
    i18n.setLanguage(config.get("base.language"))
    mainView.load()

    // 如果是企业微信模式且未绑定企微，则加载企业微信网络配置和绑定设备页面
    if (weComService.isWeCom() && weComService.getStatus() === 0) {
        dxui.loadMain(wechatNetView.screenMain)
        topView.changeTheme(true)
    }

    // 启动屏保计时器
    idleTimerStart()
    // bus事件
    busEvents()
    // 实时获取点击坐标
    getClickPoint()
    // 隐藏键盘
    hidePinyin()

    driver.display.setBacklight(screen.getConfig()['base.backlight'])

}

screen.trackingBox = function (data) {
    try {
        if (data && data.length > 0) {
            data = JSON.parse(data)
            // 最大10个人
            if (data.length <= 10) {
                for (let i = 0; i < data.length; i++) {
                    screen.trackUpdate({
                        w: data[i].rect[2] - data[i].rect[0],
                        h: data[i].rect[3] - data[i].rect[1],
                        x: data[i].rect[0],
                        y: data[i].rect[1]
                    }, data[i].id, (data[i].livingScore > 5))
                }
            }
        }
    } catch (error) {
        log.error("screen.trackingBox:", error)
    }
}

let changedClickPoint
let lastClickPoint = { x: 0, y: 0 }
let clickPoint
// 实时获取点击坐标
function getClickPoint() {
    const indev = NativeObject.APP.NativeComponents.NativeIndev
    std.setInterval(() => {
        if (dxDriver.DRIVER.MODEL == "vf203") {
            clickPoint = {
                x: Math.abs(600 - indev.lvIndevGetPointVg().y),
                y: indev.lvIndevGetPointVg().x
            }
        } else if (dxDriver.DRIVER.MODEL == "vf202") {
            clickPoint = {
                x: indev.lvIndevGetPointVg().x,
                y: indev.lvIndevGetPointVg().y
            }
        } else if (dxDriver.DRIVER.MODEL == "vf114") {
            clickPoint = {
                x: indev.lvIndevGetPointVg().x,
                y: indev.lvIndevGetPointVg().y
            }
        } else if (dxDriver.DRIVER.MODEL == "vf105") {
            clickPoint = {
                x: indev.lvIndevGetPointVg().x,
                y: indev.lvIndevGetPointVg().y
            }
        }

        if (lastClickPoint.x != clickPoint.x || lastClickPoint.y != clickPoint.y) {
            changedClickPoint = clickPoint
        } else {
            changedClickPoint = null
        }

        lastClickPoint = clickPoint
    }, 100)
}

function hidePinyin() {
    let showPoint
    const hideMethod = pinyin.hide
    const showMethod = pinyin.show
    // 加锁
    let lock = false
    pinyin.hide = function (isForce) {
        if (isForce) {
            hideMethod.call(pinyin)
            lock = false
            return
        }
        if (lock) {
            return
        }
        lock = true
        hideMethod.call(pinyin)
        lock = false
    }
    pinyin.show = function (...args) {
        if (lock) {
            return
        }
        lock = true
        showMethod.call(pinyin, ...args)
        showPoint = clickPoint
        lock = false
    }
    std.setInterval(() => {
        if (showPoint && (Math.abs(showPoint.x - clickPoint.x) > 5 && Math.abs(showPoint.y - clickPoint.y) > 5)) {
            if (clickPoint.y < (screen.screenSize.height - (pinyin.getMode() == 1 ? pinyin.container.height() + 70 : pinyin.container.height()))) {
                let defocus = dxMap.get("INPUT_KEYBOARD").get("defocus")
                if (defocus == "defocus") {
                    dxMap.get("INPUT_KEYBOARD").del("defocus")
                    showPoint = null
                    pinyin.hide()
                }
            }
        }
    }, 100)
}

class ScreenManager {
    constructor(callbacks = {}) {
        this.timers = {
            screenSaver: null,
            screenOff: null
        };

        // 默认配置
        this.config = {
            screenSaverDelay: 0, // 屏保延迟（毫秒）
            screenOffDelay: 0    // 熄屏延迟（毫秒）
        };

        // 回调函数
        this.callbacks = {
            onScreenSaverStart: callbacks.onScreenSaverStart || (() => { }),
            onScreenSaverEnd: callbacks.onScreenSaverEnd || (() => { }),
            onScreenOff: callbacks.onScreenOff || (() => { }),
            onScreenOn: callbacks.onScreenOn || (() => { })
        };

        this.resetTimers = this.resetTimers.bind(this);
    }

    // 配置时间
    configure({ screenSaverDelay = 0, screenOffDelay = 0 }) {
        this.config.screenSaverDelay = screenSaverDelay;
        this.config.screenOffDelay = screenOffDelay;
        this.resetTimers();
    }

    // 重置定时器
    resetTimers() {
        // 清除现有定时器
        if (this.timers.screenSaver) {
            std.clearTimeout(this.timers.screenSaver);
        }
        if (this.timers.screenOff) {
            std.clearTimeout(this.timers.screenOff);
        }

        // 退出当前状态
        this.exitScreenStates();

        // 设置新的定时器
        if (this.config.screenOffDelay > 0) {
            this.timers.screenOff = std.setTimeout(() => {
                this.enterScreenOff();
            }, this.config.screenOffDelay);
        }

        // 只有当熄屏时间大于屏保时间时才设置屏保定时器
        if (this.config.screenSaverDelay > 0 &&
            (this.config.screenSaverDelay < this.config.screenOffDelay || this.config.screenOffDelay == 0)) {
            this.timers.screenSaver = std.setTimeout(() => {
                this.enterScreenSaver();
            }, this.config.screenSaverDelay);
        }
    }

    // 进入屏保状态
    enterScreenSaver() {
        const mapUI = dxMap.get("UI")
        if (!mapUI.get("isScreenOff")) {
            mapUI.put("isScreenSaver", true)
            this.callbacks.onScreenSaverStart();
        }
    }

    // 进入熄屏状态
    enterScreenOff() {
        const mapUI = dxMap.get("UI")
        mapUI.put("isScreenOff", true)
        mapUI.put("isScreenSaver", false)
        this.callbacks.onScreenOff();
    }

    // 退出所有屏幕状态
    exitScreenStates() {
        const mapUI = dxMap.get("UI")
        const previousState = { isScreenOff: mapUI.get("isScreenOff"), isScreenSaver: mapUI.get("isScreenSaver") };
        mapUI.put("isScreenOff", false)
        mapUI.put("isScreenSaver", false)
        // 如果状态发生改变，触发相应回调
        if (previousState.isScreenSaver) {
            this.callbacks.onScreenSaverEnd();
        }
        if (previousState.isScreenOff) {
            this.callbacks.onScreenOn();
        }
    }

    // 获取当前状态
    getState() {
        const mapUI = dxMap.get("UI")
        return { isScreenOff: mapUI.get("isScreenOff"), isScreenSaver: mapUI.get("isScreenSaver") };
    }

    // 清理资源
    destroy() {
        if (this.timers.screenSaver) {
            std.clearTimeout(this.timers.screenSaver);
        }
        if (this.timers.screenOff) {
            std.clearTimeout(this.timers.screenOff);
        }
    }
}

let screenManager
function idleTimerStart() {
    // 创建实例，传入回调函数
    screenManager = new ScreenManager({
        onScreenSaverStart: () => {
            screen.enterIdle()
        },
        onScreenSaverEnd: () => {
            screen.exitIdle(true)
        },
        onScreenOff: () => {
            dxMap.get("screenOff").put("status", 1)
            screen.screenNow.hide()
            topView.screenMain.hide()
            driver.display.setBacklight(0)
            screen.enterIdle()
        },
        onScreenOn: () => {
            screen.exitIdle(true)
            std.setTimeout(() => {
                dxMap.get("screenOff").put("status", 0)
                screen.screenNow.show()
                topView.screenMain.show()
                driver.display.setBacklight(screen.getConfig()['base.backlight'])
            }, 100)
        }
    });

    // 配置时间（毫秒）
    screenManager.configure({
        // screenSaverDelay: 10000,  // 屏保
        // screenOffDelay: 5000     // 熄屏
        screenSaverDelay: config.get("base.screensaver") * 60 * 1000,  // 屏保
        screenOffDelay: config.get("base.screenOff") * 60 * 1000     // 熄屏
    });

    // 检测用户触摸
    let touchCount = 0
    std.setInterval(() => {
        let count = dxui.Utils.GG.NativeDisp.lvDispGetInactiveTime()
        if (count < touchCount) {
            screenManager.resetTimers();
        }
        touchCount = count
    }, 100);
}

screen.screenManagerRefresh = function () {
    screenManager.configure({
        screenSaverDelay: config.get("base.screensaver") * 60 * 1000,  // 屏保
        screenOffDelay: config.get("base.screenOff") * 60 * 1000     // 熄屏
    });
    screenManager.resetTimers();
}

let enterIdleTimer
// 进入屏保
screen.enterIdle = function () {
    // 延迟1秒，防止进入屏保和退出屏保同时触发，1秒内没有触发退出屏保，则认为进入屏保
    enterIdleTimer = std.setTimeout(() => {
        if (idleView.screenMain.isHide()) {
            viewUtils.confirmClose()
            mainView.load()
            idleView.screenMain.show()
            topView.changeTheme(false)
        }
    }, 1000)
}

// 退出屏保
screen.exitIdle = function (isSelf) {
    if (enterIdleTimer) {
        std.clearTimeout(enterIdleTimer)
        enterIdleTimer = null
    }
    if (!isSelf) {
        screenManager.resetTimers();
    }
    if (!idleView.screenMain.isHide()) {
        idleView.screenMain.hide()
    }
}

screen.loop = function () {
    return dxui.handler()
}

//云证激活 0 成功 非0失败
screen.nfcIdentityCardActivation = function (code) {
    if (code && code.startsWith("___VBAR_ID_ACTIVE_V")) {
        let activeResute = driver.nfc.eidActive(code);
        if (activeResute === 0) {
            screen.upgrade({ title: "confirm.cloudCertActive", content: "confirm.cloudCertActiveSuccess" })
        } else {
            screen.upgrade({ title: "confirm.cloudCertActive", content: "confirm.cloudCertActiveFail" })
        }
    } else {
        screen.upgrade({ title: "confirm.cloudCertActive", content: "confirm.cloudCertKeyIncorrent" })
    }
}

// 删除人员
screen.deleteUser = function (user) {
    // TODO删除人员
    sqliteService.d1_person.deleteByUserId(user.userId)

    let persons = sqliteService.d1_person.findByUserId(user.userId)
    if (persons.length > 0) {
        if (persons[0].permissionIds) {
            for (let i = 0; i < persons[0].permissionIds.split(',').length; i++) {
                const permissionId = persons[0].permissionIds.split(',')[i];
                sqliteService.d1_permission.deleteByPermissionId(permissionId)
            }
        }
    }
    let vouchers = sqliteService.d1_voucher.findByUserId(user.userId)
    if (vouchers.length > 0) {
        vouchers.forEach(element => {
            sqliteService.d1_voucher.deleteByKeyId(element.keyId)
        });
    }
    let res = driver.face.deleteFea(user.userId)
    return true
}
screen.updateUser = function (user) {
    //修改人员信息
    let res = sqliteService.d1_person.updatenameAndExtraByUserId(user.userId, user.name, JSON.stringify({ type: user.type, idCard: user.idCard }))
    if (res != 0) {
        return false
    }
    //处理凭证
    let ret
    if (user.pwd) {
        //判断库表是否存在这个凭证
        let pwdData = sqliteService.d1_voucher.findByCodeAndType(user.pwd, "400");
        if (pwdData.length > 0 && pwdData[0].userId != user.userId) {
            //存在不能添加返回失败
            log.info("密码重复");
            return "localUserAddView.failPwdRepeat"
        }
        //查询是否有密码凭证有更新没有新增
        let countByuserIdAndType = sqliteService.d1_voucher.findByuserIdAndType(user.userId, "400");
        if (countByuserIdAndType.length > 0) {
            ret = sqliteService.d1_voucher.updatecodeByuserIdAndtype(user.userId, "400", user.pwd)
            if (ret != 0) {
                return false
            }
        } else {
            //新增一个
            ret = sqliteService.d1_voucher.save({ keyId: std.genRandomStr(32), type: "400", code: user.pwd, userId: user.userId })
            if (ret != 0) {
                return false
            }
        }
    } else {
        //没有内容去数据库表删除一下
        sqliteService.d1_voucher.deleteByuserIdAndtype(user.userId, "400")
    }
    if (user.card) {
        user.card = user.card.toUpperCase()
        //判断库表是否存在这个凭证
        let cardData = sqliteService.d1_voucher.findByCodeAndType(user.card, "200");
        if (cardData.length > 0 && cardData[0].userId != user.userId) {
            //存在不能添加返回失败
            log.info("卡重复");
            return "localUserAddView.failCardRepeat"
        }
        //查询是否有密码凭证有更新没有新增
        let countByuserIdAndType = sqliteService.d1_voucher.countByuserIdAndType(user.userId, "200");
        if (countByuserIdAndType > 0) {
            ret = sqliteService.d1_voucher.updatecodeByuserIdAndtype(user.userId, "200", user.card)
            if (ret != 0) {
                return false
            }
        } else {
            //新增一个
            ret = sqliteService.d1_voucher.save({ keyId: std.genRandomStr(32), type: "200", code: user.card, userId: user.userId })

            if (ret != 0) {
                return false
            }
        }
    } else {
        //没有内容去数据库表删除一下
        sqliteService.d1_voucher.deleteByuserIdAndtype(user.userId, "200")
    }
    if (user.face && user.feature) {
        let findByuserIdAndType = sqliteService.d1_voucher.findByuserIdAndType(user.userId, "300");
        if (findByuserIdAndType.length <= 0) {
            let ret = driver.face.updateFea(user.userId, user.feature)
            log.info("2注册人脸,ret:", ret)
            if (typeof ret == 'string') {
                return ret
            }
            if (ret != 0) {
                return faceService.regErrorEnum.picture[ret + '']
            }
            //注册成功后需要吧原来图片移动到 user 对应目录下
            let src = "/data/user/" + user.userId + "/register.jpg"
            std.ensurePathExists(src)
            dxos.systemBrief('mv ' + user.face + " " + src)

            //新增一个
            ret = sqliteService.d1_voucher.save({ keyId: std.genRandomStr(32), type: "300", code: src, userId: user.userId })
            if (ret != 0) {
                return false
            }
        } else {
            //原来有又传入 先删除后新增
            if (findByuserIdAndType[0].code != user.face) {
                //删除老人脸
                driver.face.deleteFea(user.userId)
                //注册新人脸
                let res = driver.face.addFea(user.userId, user.feature)
                log.info("3注册人脸,res:", res)
                if (typeof res == 'string') {
                    return res
                }
                if (res != 0) {
                    return faceService.regErrorEnum.picture[res + '']
                }
                let src = "/data/user/" + user.userId + "/register.jpg"
                std.ensurePathExists(src)
                //把临时目录人脸移动到 user 对应的文件夹中
                dxos.systemBrief('mv ' + user.face + " " + src)
                ret = sqliteService.d1_voucher.updatecodeAndExtraByuserIdAndtype(user.userId, "300", src, JSON.stringify({ faceType: 0 }))
            }
        }
    } else {
        // TODO 没有存储特征值，特征值字段为空，face字段没有值才是真正删除人脸
        if (!user.face) {
            //没有内容去数据库表删除一下
            sqliteService.d1_voucher.deleteByuserIdAndtype(user.userId, "300")
            driver.face.deleteFea(user.userId)
            dxos.systemBrief("rm -rf /data/user/" + user.userId)
        }
    }

    return true
}
// 新增人员
screen.insertUser = async function (user) {
    //开始处理凭证
    const saveVoucher = async (type, code, feature) => {
        if (type == "200") {
            let cardData = sqliteService.d1_voucher.findByCodeAndType(code, "200");
            if (cardData.length > 0 && cardData[0].userId != user.userId) {
                //存在不能添加返回失败
                log.info("卡重复");
                return "localUserAddView.failCardRepeat"
            }
        }
        // 当 type 为 "300" 时，首先调用特定方法检查是否可以继续保存凭证
        if (type === "300") {
            let preCheckResult = await preSaveCheck(code, feature); // 假设这是您提到的需要调用的方法
            if (preCheckResult !== true) { // 如果预检查不通过，则直接返回 false
                return preCheckResult;
            }
            code = "/data/user/" + user.userId + "/register.jpg"
        }
        if (type == "400") {
            let pwdData = sqliteService.d1_voucher.findByCodeAndType(code, "400");
            if (pwdData.length > 0 && pwdData[0].userId != user.userId) {
                //存在不能添加返回失败
                log.info("密码重复");
                return "localUserAddView.failPwdRepeat"
            }
        }
        let keyId = std.genRandomStr(32);
        let extra = type == 300 ? JSON.stringify({ faceType: 0 }) : JSON.stringify({})
        let voucherRet = await sqliteService.d1_voucher.save({
            keyId: keyId,
            type: type,
            code: code,
            userId: user.userId,
            extra: extra
        });

        if (voucherRet != 0) {
            // 如果凭证保存失败，则删除已保存的用户信息及可能已保存的其他凭证
            await sqliteService.d1_person.deleteByUserId(user.userId);
            await sqliteService.d1_voucher.deleteByUserId(user.userId);
            return false;
        }
        return true;
    };
    async function preSaveCheck(code, feature) {
        let ret = driver.face.addFea(user.userId, feature)
        log.info("1注册人脸,ret:", ret)
        if (typeof ret == 'string') {
            return ret
        }
        if (ret != 0) {
            return faceService.regErrorEnum.picture[ret + '']
        }
        //注册成功后需要吧原来图片移动到 user 对应目录下
        let src = "/data/user/" + user.userId + "/register.jpg"
        std.ensurePathExists(src)
        dxos.systemBrief('mv ' + code + " " + src)
        return true;
    }
    let success = true;
    if (success === true && user.face && user.feature && !(success = await saveVoucher("300", user.face, user.feature)));
    if (success === true && user.pwd && !(success = await saveVoucher("400", user.pwd)));
    if (success === true && user.card && !(success = await saveVoucher("200", user.card.toUpperCase())));
    if (success === true) {
        //{"id":"423","userId":"423","name":"微光互联","idCard":"123","pwd":"251574","card":"123"}
        //保存人员信息
        let personRet = await sqliteService.d1_person.save({
            userId: user.userId,
            name: user.name,
            extra: JSON.stringify({ type: user.type == 1 ? 1 : 0, idCard: user.idCard })
        });
        if (personRet != 0) {
            sqliteService.d1_voucher.deleteByUserId(user.userId);
            return "localUserAddView.failRepeat"
        }
        //新增一条永久权限
        sqliteService.d1_permission.save({ permissionId: user.userId, timeType: 0 })
        sqliteService.d1_person.updatePermissionIdsByUserId(user.userId, user.userId)
    } else {
        await sqliteService.d1_voucher.deleteByUserId(user.userId);
    }
    return success;
}

// 获取本地人员信息
screen.getVoucher = function (userId) {

    let person = sqliteService.d1_person.find({ userId: userId });

    if (person.length < 0) {
        return
    }
    let pwd_voucher = sqliteService.d1_voucher.find({ userId: userId, type: "400" })[0] || undefined
    let card_voucher = sqliteService.d1_voucher.find({ userId: userId, type: "200" })[0] || undefined
    let face_voucher = sqliteService.d1_voucher.find({ userId: userId, type: "300" })[0] || undefined
    let idCard_voucher
    try {
        idCard_voucher = JSON.parse(person[0].extra).idCard
    } catch (error) {
    }
    return {
        id: userId,
        idCard: idCard_voucher ? idCard_voucher : undefined,
        card: card_voucher ? card_voucher.code : undefined,
        pwd: pwd_voucher ? pwd_voucher.code : undefined,
        face: face_voucher ? face_voucher.code : undefined,
        type: JSON.parse(person[0].extra).type
    }

}
screen.getUsers = function (page = 0, size = 6, name) {
    if (name) {
        // 用户姓名可能重复，改为模糊查询
        let users = sqliteService.findPersonsByNameLike(name)
        if (users && users.length > 0) {
            users.map(v => {
                v.id = v.userId
            })
            function chunkArray(arr, size) {
                // 如果数组为空或者大小为零，返回空数组
                if (arr.length === 0 || size <= 0) {
                    return [];
                }
                const result = [];
                // 使用循环遍历数组，并按照大小切割
                for (let i = 0; i < arr.length; i += size) {
                    result.push(arr.slice(i, i + size));  // slice 截取指定范围的元素
                }
                return result;
            }
            const chunkedArray = chunkArray(users, size);
            return { data: chunkedArray[page], totalPage: Math.ceil(users.length / size), totalSize: users.length, currentPage: page + 1 }
        }
        return { data: [], totalPage: 0, totalSize: 0, currentPage: 1 }
    }
    let userCount = sqliteService.d1_person.count()
    let users = sqliteService.d1_person.findOrderByUserIdAsc({ page, size })
    if (users.length > 0) {
        users.forEach(element => { element.id = element.userId });
    }
    // 总页数
    let totalPage = Math.ceil(userCount / size)
    return { data: users, totalPage: totalPage, totalSize: userCount, currentPage: page + 1 }
}

// 获取通行记录
screen.getPassRecord = function (page = 0, size = 3) {
    let passCount = sqliteService.d1_pass_record.count()
    let datas = sqliteService.d1_pass_record.findOrderByTimeStampDesc({ page, size })
    // 总页数
    let totalPage = Math.ceil(passCount / size)
    return { data: datas, totalPage: totalPage, totalSize: passCount, currentPage: page + 1 }
}

// 人脸录入开始，UI控制
screen.faceEnterStart = function () {
    bus.fire("getFeaByCapStart", 10000)
}

// 获取卡号UI控制
screen.getCardStart = function () {
    dxMap.get("UI").put("getCardStart", true)
}
// 获取卡号结束UI控制
screen.endCardEnd = function () {
    dxMap.get("UI").del("getCardStart")
}
// 开启人脸识别
screen.faceRecgStart = function () {
    try {
        driver.face.status(1)
    } catch (error) {
    }
}

// 人脸识别暂停
screen.faceRecgPause = function () {
    driver.face.status(0)
}

// 人脸录入结果
screen.faceEnterResult = function (facePic, feature) {
    if (facePic) {
        faceEnterView.successFlag = true
        // 成功，显示人脸照片
        localUserAddView.addFace(facePic, feature)
        dxui.loadMain(localUserAddView.screenMain)
        faceEnterView.backCb()
    }
}

//  非识别页面人脸认证开始，UI控制
screen.faceAuthStart = function () {
    dxMap.get("UI").put("faceAuthStart", "Y")
    driver.face.status(1)
}

// 非识别页面人脸认证结束，UI控制
screen.faceAuthEnd = function () {
    dxMap.get("UI").del("faceAuthStart")
    driver.face.status(0)
}

// 非识别页面人脸认证结果
screen.faceAuthResult = function (bool) {
    if (bool) {
        // 成功，进入设置菜单
        driver.audio.play(`/app/code/resource/${config.get("base.language") == "CN" ? "CN" : "EN"}/wav/recg_s.wav`)
        dxui.loadMain(configView.screenMain)
    } else {
        driver.audio.play(`/app/code/resource/${config.get("base.language") == "CN" ? "CN" : "EN"}/wav/recg_f.wav`)
        // 失败，报错
        identityVerificationView.statusPanel.fail("identityVerificationView.fail")
    }
}

// 保存配置
screen.saveConfig = function (configAll) {
    if (configAll && configAll.net) {
        // 检查 ssid 和 psk 是否都存在
        if (configAll.net.ssid || configAll.net.psk) {
            // 在这里添加你的额外操作
            bus.fire("setConfig", configAll)
            return true
        }
    }
    return configService.configVerifyAndSave(configAll)
}

// 获取配置
screen.getConfig = function () {
    let config1 = config.getAll()

    return config1
}

//  密码通行
screen.pwdAccess = function (pwd) {
    // TODO完善通行逻辑
    bus.fire("access", { data: { type: "400", code: pwd } })
}

//获取 wifi 列表
screen.netGetWifiSsidList = function () {
    bus.fire(driver.net.SCAN_WIFI)
}

screen.netWifiSsidList = function (data) {
    log.info('screen.netWifiSsidList', data)
    if (networkSettingView.wifiListData && networkSettingView.wifiListData.length > 0) {
        const combined = [...networkSettingView.wifiListData, ...data]
        const unique = [...new Set(combined)]
        networkSettingView.wifiListData = unique
    } else {
        networkSettingView.wifiListData = data
    }
    networkSettingView.wifiList.refresh()
}

//获取卡号
screen.getCard = function (card) {
    localUserAddView.cardBoxInput.text(card)
}

// bus事件
function busEvents() {
    // 网络状态
    bus.on(driver.net.CONNECTED_CHANGED, (data) => {
        screen.updateNetStatus(data)
    })

    // mqtt连接状态
    bus.on('mqttStatus', (data) => {
        if (data == "connected") {
            topView.mqttConnectState(true)
        } else {
            topView.mqttConnectState(false)
        }
    })
    bus.on("exitIdle", screen.exitIdle)
    bus.on("getCard", screen.getCard)
    bus.on("faceAuthResult", screen.faceAuthResult)
    bus.on("accessRes", screen.accessRes)
    bus.on("hideSn", screen.hideSn)
    bus.on("hideIp", screen.hideIp)
    bus.on("changeLanguage", screen.changeLanguage)
    bus.on("screenManagerRefresh", screen.screenManagerRefresh)
    bus.on(driver.net.WIFI_LIST, screen.netWifiSsidList)
    bus.on("appMode", screen.appMode)
    bus.on("upgrade", screen.upgrade)
    bus.on("trackResult", screen.trackResult)
    bus.on("trackingBox", screen.trackingBox)
    bus.on("getFeaByCapEnd", screen.getFeaByCapEnd)
    bus.on('reload', screen.reload)
    bus.on("weComTackFace", screen.weComTackFace)
}
screen.updateNetStatus = function (data) {
    let type = config.get("net.type")
    let param = driver.net.getNetParam()

    if (data == "connected" && param) {
        config.setAndSave("net.ip", param.ip)
        config.setAndSave("net.gateway", param.gateway)
        config.setAndSave("net.mask", param.netmask)
        config.setAndSave('net.dns', param.dns)
        config.setAndSave('net.mac', screen.getNetMac())
        topView.ethConnectState(true, type)
        networkSettingView.netInfo[10].label.dataI18n = "networkSettingView.networkConnected"
        mainView.ipLbl.text("IP:" + param.ip)
        wechatBindView.wechatIpLbl.text("IP: " + param.ip)
        wechatNetView.wechatIpLbl.text("IP: " + param.ip)
    } else {
        topView.ethConnectState(false, type)
        networkSettingView.netInfo[10].label.dataI18n = "networkSettingView.networkUnconnected"
        mainView.ipLbl.text("IP:")
        wechatBindView.wechatIpLbl.text("IP: ")
        wechatNetView.wechatIpLbl.text("IP: ")
    }
    i18n.refreshObj(networkSettingView.netInfo[10].label)
    networkSettingView.refresh()
    networkSettingView.changeNetType(type)
}
// 开始注册人脸
screen.getFeaByCapEnd = function (data) {
    if (faceEnterView.screenMain.isHide()) {
        return
    }
    if (!data.picPath) {
        return screen.faceEnterResult()
    }

    driver.audio.play(`/app/code/resource/${config.get("base.language") == "CN" ? "CN" : "EN"}/wav/recognition_s.wav`)
    faceEnterView.statusPanel.success("faceEnterView.recogSuccess")
    // 保存图片到本地   
    let src = `/data/user/register.jpg`
    dxos.systemBrief(`mv ${data.picPath} ${src}`)
    dxos.systemBrief(`rm -rf /data/user/temp/*`)

    screen.faceEnterResult(src, data.feature)
}
// 抓拍人脸
screen.tackFace = function () {
    driver.face.status(1)
    let res = driver.face.getFeaByCap(10000)
    driver.face.status(0)
    return res
}
// 接收企业微信抓拍人脸事件
screen.weComTackFace = function (data) {
    driver.face.status(0)
    wechatFaceView.weComTackFace(data)
    // 加载到抓拍人脸页面
    dxui.loadMain(wechatFaceView.screenMain)
}

// 通行成功/失败
screen.accessRes = function (bool) {
    if (bool) {
        mainView.statusPanel.success()
    } else {
        mainView.statusPanel.fail()
    }
}

// 切换app模式
screen.appMode = function (mode) {
    if (mode == 0) {
        // 切换到标准
        mainView.menuBtnBox.show()
        if (config.get("base.showProgramCode") == 1) {
            //mainView.appBtnBox.show()暂时隐藏小程序按钮
            //deviceInfoView.sysInfo[3].obj.show()
        } else {
            mainView.appBtnBox.hide()
            deviceInfoView.sysInfo[3].obj.hide()
        }
        if (config.get("sys.pwd") == 1) {
            mainView.pwdBtnBox.show()
        } else {
            mainView.pwdBtnBox.hide()
        }
        mainView.miniBkgBox.hide()
    } else if (mode == 1) {
        // 切换到简洁模式
        mainView.miniBkgBox.show()
        if (config.get("base.showProgramCode") == 1) {
            // mainView.minAppBtnImg.show()暂时隐藏小程序按钮
            // deviceInfoView.sysInfo[3].obj.show()
        } else {
            // mainView.minAppBtnImg.hide()
            // deviceInfoView.sysInfo[3].obj.hide()
        }
        if (config.get("sys.pwd") == 1) {
            mainView.minPwdBtnImg.show()
        } else {
            mainView.minPwdBtnImg.hide()
        }
        mainView.menuBtnBox.hide()
    }
}

/**
 * 
 * @param {object} data 坐标信息
 * @param {number} id face_id，用于关联识别姓名用
 * @param {bool} isLiving 是否活体
 */
screen.trackUpdate = function (data, id, isLiving) {
    let item = mainView.trackFaces[0]
    for (let i = 0; i < 10; i++) {
        let ele = mainView.trackFaces[i]
        if (ele.face_id == id) {
            item = ele
            break
        }
        if (ele.face_id === undefined) {
            item = ele
        }
    }
    item.face_id = id

    if (item && item.timer) {
        std.clearTimeout(item.timer)
        item.timer = null
    }

    item.timer = std.setTimeout(() => {
        item.trackFace.hide()
        if (item.timer) {
            std.clearTimeout(item.timer)
            item.timer = null
        }
    }, 300)

    let edge = data.w > data.h ? data.w : data.h
    let offset = Math.abs(data.w - data.h) / 2
    item.trackFace.show()
    item.trackFace.setSize(edge, edge)
    item.trackFace.radius(edge / 2)
    if (data.w > data.h) {
        item.trackFace.setPos(data.x, data.y - offset)
    } else {
        item.trackFace.setPos(data.x - offset, data.y)
    }
    item.trackFaceName.text(" ")
    if (item.result && item.result.result === true && item.result.id == id) {
        item.trackFace.setBorderColor(viewUtils.color.success)
        let user = sqliteService.d1_person.findByUserId(item.result.userId)[0]
        item.trackFaceName.text(user ? user.name : "")
    } else if (item.result && item.result.result === false && item.result.id == id) {
        item.trackFace.setBorderColor(viewUtils.color.fail)
    } else if (isLiving) {
        item.trackFace.setBorderColor(0xf3e139)
    } else {
        item.trackFace.setBorderColor(0xffffff)
    }
}

// 认证结果
screen.trackResult = function (data) {
    for (let i = 0; i < 10; i++) {
        let ele = mainView.trackFaces[i]
        if (ele.face_id == data.id) {
            ele.result = data
            return
        }
    }
}

screen.hideSn = function (bool) {
    if (bool) {
        mainView.bottomSnBtn.show()
    } else {
        mainView.bottomSnBtn.hide()
    }
}

screen.hideIp = function (bool) {
    if (bool) {
        mainView.ipLbl.show()
    } else {
        mainView.ipLbl.hide()

    }
}
screen.hideBottomBox = function (bool) {
    if (bool) {
        mainView.bottomBox.hide()
    } else {
        mainView.bottomBox.show()
    }
}

screen.changeLanguage = function () {
    i18n.setLanguage(screen.getConfig()['base.language'])
}

screen.upgrade = function (data) {
    const { title, content } = data
    viewUtils.confirmOpen(title, content)
}

screen.netReconnect = function () {
    driver.net.reconnect()
}

screen.getSqliteService = function () {
    return sqliteService
}

screen.updateFaceConfig = function (config) {
    driver.face.setConfig(config)
}

screen.getCapcal = function () {
    return driver.capcal
}

screen.mqttReply = function (serialNo, data, code) {
    return mqttService.mqttReply(serialNo, data, code)
}

screen.MQTT_CODE = mqttService.CODE

// 删除凭证、人员、权限、人脸
screen.deleteAll = function () {
    sqliteService.d1_pass_record.deleteAll()
    sqliteService.d1_permission.deleteAll()
    sqliteService.d1_voucher.deleteAll()
    sqliteService.d1_person.deleteAll()
}

screen.getNetMac = function () {
    return driver.net.getNetMac()
}

screen.reload = function () {
    screen.screenNow.send(dxui.Utils.ENUM.LV_EVENT_SCREEN_LOADED)
}

screen.driver = driver
screen.weCom = weComService
screen.dxDriver = dxDriver

export default screen
