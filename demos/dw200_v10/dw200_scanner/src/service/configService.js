import bus from '../../dxmodules/dxEventBus.js';
import common from '../../dxmodules/dxCommon.js';
import config from '../../dxmodules/dxConfig.js'
import driver from '../driver.js';
import dxNtp from '../../dxmodules/dxNtp.js'
import utils from '../common/utils/utils.js';
import safeService from '../service/safeService.js'
import log from '../../dxmodules/dxLogger.js'

const configService = {}
// 匹配以点分十进制形式表示的 IP 地址，例如：192.168.0.1。
const ipCheck = v => /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?).){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/.test(v)
// 匹配 192.168.0.1:8080 格式
const ipCheckWithPort = v => /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\:\d{1,5}$/.test(v);
//限制端口 到 65535
const port = v => /^(?:[0-9]|[1-9][0-9]{1,3}|[1-5][0-9]{4}|6[0-4][0-9]{3}|65[0-4][0-9]{2}|655[0-2][0-9]|6553[0-5])$/.test(v)
// 非负整数
const regnCheck = v => /^(0|[1-9]\d*)$/.test(v)
// 所有支持的配置项的检验规则以及设置成功后的回调
const supported = {
    sysInfo: {
        //工作模式
        w_mode: { rule: v => [1, 2].includes(v) },
        //rs232 或 rs485 参数	
        p_uart1: { rule: v => typeof v == 'string' },
        //ttl 参数	
        p_uart2: { rule: v => typeof v == 'string' },
        //韦根忙时时间	
        wiegand_busy_delay: { rule: regnCheck },
        //韦根闲时时间	
        wiegand_free_delay: { rule: regnCheck },
        //普通模式下nfc数据输出端口选择	
        nochannel: { rule: regnCheck },
        //开发模式下nfc数据输出端口选择	
        ndchannel: { rule: regnCheck },
        //普通模式下扫码密码数据输出端口选择	
        ochannel: { rule: regnCheck },
        //开发模式下扫码密码数据输出端口选择	
        dchannel: { rule: regnCheck },
        //普通模式下蓝牙数据输出端口选择	
        blochannel: { rule: regnCheck },
        //开发模式下蓝牙数据输出端口选择
        bldchannel: { rule: regnCheck },
        //http服务器地址	
        haddr: { rule: v => typeof v == 'string' },
        //http超时时间s
        houttime: {
            rule: v => {
                return regnCheck(v) && v <= 5
            }
        },
        //wifi 或者以太网输出端口选择
        owifi: { rule: regnCheck },
        //网络传输成功行为	
        awifi_s: { rule: regnCheck },
        //继电器延迟毫秒
        relayd: { rule: regnCheck, callback: v => safeService.updateRelayd(v) },
        //网络传输失败行为
        awifi_f: { rule: regnCheck },
        //tcp服务地址
        taddr: { rule: ipCheck },
        //tcp端口
        port: { rule: regnCheck },
        //tcp超时时间s
        touttime: {
            rule: v => {
                return regnCheck(v) && v <= 5
            }
        },
        //扫码开关  1开 0关
        codeSwitch: { rule: v => [0, 1].includes(v) },
        ST: { rule: regnCheck },
        A1: { rule: regnCheck },
        B1: { rule: regnCheck },
        C1: { rule: regnCheck },
        D1: { rule: regnCheck },
        E1: { rule: regnCheck },
        F1: { rule: regnCheck },
        G1: { rule: regnCheck },
        H1: { rule: regnCheck },
        I1: { rule: regnCheck },
        J1: { rule: regnCheck },
        K1: { rule: regnCheck },
        //前后缀格式1是char 2是hex
        chorc: { rule: v => [1, 2].includes(v) },
        //前缀
        prefix: { rule: v => typeof v != 'number' },
        //后缀
        postfix: { rule: v => typeof v != 'number' },
        //扫码输出格式
        ft: { rule: regnCheck },
        //加换行   0不加1加
        nl: { rule: v => [0, 1].includes(v) },
        //加回车   0不加1加
        cr: { rule: v => [0, 1].includes(v) },
        //扫码后动作	 bit位控制
        ascan: { rule: regnCheck },
        //蜂鸣器延迟ms
        beepd: {
            rule: (v) => {
                return regnCheck(v) && v <= 1000
            }
        },
        //闪灯延迟
        ledd: { rule: regnCheck },
        //码制选择根据比特位来的 全选64511
        de_type: { rule: regnCheck },
        //扫码模式 0是间隔 1是单次
        s_mode: { rule: v => [0, 1].includes(v) },
        //间隔生效  间隔时间
        interval: { rule: v => /^(500|[5-9]\d{2,}|[1-9]\d{3,})$/.test(v) },
        //检索码的超时时间	
        search_timeout: { rule: regnCheck },
        //解码引擎类型	
        decoder: { rule: regnCheck },
        //解码的超时时间	
        decoder_timeout: { rule: regnCheck },
        //解码引擎对应策略	
        search_mode: { rule: regnCheck },
        //解码引擎特性配置	
        decoder_mode: { rule: regnCheck },
        //qr 码的参数配置	
        qr_mode: { rule: regnCheck },
        //两次解码之间的延时	
        decoder_delay: { rule: regnCheck },
        //ocr 模式	
        ocr_mode: { rule: regnCheck },
        //ocr 识别模板	
        ocr_template: { rule: v => typeof v == 'string' },
        //网络类型  1以太网 0关闭网络
        net_type: { rule: v => [0, 1].includes(v) },
        //mac地址 0默认 2手动设置
        fixed_macaddr_enable: { rule: v => [0, 1, 2].includes(v) },
        //mac地址 手动设置
        macaddr: { rule: v => typeof v == 'string' },
        //0 动态 1 静态
        ip_mode: { rule: v => [0, 1].includes(v) },
        ip: { rule: ipCheck },
        gateway: { rule: ipCheck },
        dns: { rule: v => !v.split(",").some(ip => !ipCheck(ip)) },
        mask: { rule: ipCheck },
        //nfc 1打开0关闭
        nfc: { rule: v => [0, 1].includes(v) },
        //配置是否读取身份证物理卡号0开1关
        nfc_identity_card_enable: { rule: v => [0, 1].includes(v) },
        // NFC 支持的协议bit0: ISO14443-A 106kbps bit1: ISO14443-B 106kbps bit3: ISO15693
        nfc_card_protocol: { rule: regnCheck },
        // 起始位
        st: { rule: regnCheck },
        // 输出长度
        len: { rule: regnCheck },
        // 0：透传（eg:卡号：9384ED18=>93 84 ED 18，四字节），1：转16进制输出(卡号每一位用ascii16进制表示，八字节)，2：转10进制输出（卡号作为数字转10进制数字，数字每一位用ascii16进制表示，字节数不定）
        nft: { rule: regnCheck },
        //刷卡后动作
        anfc: { rule: regnCheck },
        // 前缀，char（每个字符用ascii16进制表示），hex（必须是偶数且每位大小于0-f）
        pri: { rule: v => typeof v != 'number' },
        // 后缀，同前缀
        pos: { rule: v => typeof v != 'number' },
        // 0:字符串，1：16进制
        horc: { rule: v => [0, 1].includes(v) },
        // 输出的 NFC 数据是否添加回车(0D)，在前后缀之后,0:不添加,1:添加
        nnl: { rule: v => [0, 1].includes(v) },
        // 输出的 NFC 数据是否添加换行(0A，在0D之后),0:不添加,1:添加
        ncr: { rule: v => [0, 1].includes(v) },
        // 0: 输出的NFC数据为正序（卡号就是正序），1: 输出的NFC数据为反序，优先判断
        ord: { rule: v => [0, 1].includes(v) },
        // 身份证正反序，暂不支持
        idord: { rule: v => [0, 1].includes(v) },
        //输出信息默认0不输出 其他按照bit位来判断
        nfc_otag: { rule: regnCheck },
        //身份证数据格式0 ASCII 2是JOSN格式
        online_id_format: { rule: regnCheck },
        //蓝牙前后缀 1char 2hex
        blhorc: { rule: v => [1, 2].includes(v) },
        //蓝牙前缀 
        blpri: { rule: v => typeof v != 'number' },
        //蓝牙后缀
        blpos: { rule: v => typeof v != 'number' },
        //蓝牙加回车 0不加1加
        blcr: { rule: v => [0, 1].includes(v) },
        //蓝牙加换行  0不加1加
        blnl: { rule: v => [0, 1].includes(v) },
        //蓝牙名称
        ble_name: { rule: v => typeof v == 'string', callback: v => driver.uartBle.setConfig({ name: v }) },
        //蓝牙 mac
        ble_mac: { rule: v => typeof v == 'string', callback: v => driver.uartBle.setConfig({ mac: v }) },
        //蓝牙输出格式 0直接输出
        blft: { rule: regnCheck },
        //开机提示音 0关闭
        boot_music: { rule: v => [0, 1].includes(v) },
        //语音音量0-60
        volume: { rule: regnCheck, callback: v => driver.audio.volume(Math.floor(v / 10)) },
        //蜂鸣音量
        volume1: { rule: regnCheck },
        //LCD背光亮度
        backlight: {
            rule: (v) => {
                return regnCheck(v) && v <= 100
            }, callback: v => common.systemBrief("echo " + (v <= 0 ? 1 : Math.floor(v * 15 / 100)) + " > /sys/class/backlight/backlight/brightness")
        },
        //白色补光灯亮度
        brightness: { rule: () => true },
        //userId
        userid: { rule: v => typeof v == 'string' },
        //设备号
        devnum: { rule: regnCheck },
        //设备名称
        devname: { rule: v => typeof v == 'string', callback: v => driver.screen.reload() },

        //心跳开关 0 关 1 开
        heart_en: { rule: v => [0, 1].includes(v), callback: v => bus.fire("heartbeat", { heart_en: v }) },
        //心跳内容
        heart_data: { rule: v => typeof v == 'string', callback: v => bus.fire("heartbeat", { heart_data: v }) },
        //心跳间隔时间s
        heart_time: { rule: regnCheck, callback: v => bus.fire("heartbeat", { heart_time: v }) },
        //是否隐藏sn  0隐藏1显示
        sn_show: { rule: v => [0, 1].includes(v), callback: v => driver.screen.reload() },
        //是否隐藏sn  0隐藏1显示
        ip_show: { rule: v => [0, 1].includes(v), callback: v => driver.screen.reload() },
        //屏幕角度
        rotation: { rule: v => [0, 1, 2, 3].includes(v), callback: v => rotation(v) },
        //语言  0中文1英文
        language: { rule: v => [0, 1].includes(v), callback: v => driver.screen.reload() },
        // 背景图片
        rotation0BgImage: { rule: v => typeof v == 'string', callback: v => driver.screen.reload() },
        rotation1BgImage: { rule: v => typeof v == 'string', callback: v => driver.screen.reload() },
        rotation2BgImage: { rule: v => typeof v == 'string', callback: v => driver.screen.reload() },
        rotation3BgImage: { rule: v => typeof v == 'string', callback: v => driver.screen.reload() },
        //配置密码 默认1234567887654321
        com_passwd: { rule: v => typeof v == 'string' },
        //ntp 对时0禁用 1启用
        ntp_en: { rule: v => [0, 1].includes(v) },
        //对时服务器 默认182.92.12.11
        ntp_addr: { rule: ipCheck },
        //端口默认 123
        ntp_port: { rule: port },
        //ntp同步超时时间	默认 5
        ntp_timeout: { rule: regnCheck },
        //ntp同步间隔	默认43200秒
        ntp_interval: { rule: regnCheck },
        //ntp 固定时间同步	定时同步，23 即为每天 23：00 自动同步时间
        ntp_hour: { rule: regnCheck },
        //版本号
        version: { rule: v => typeof v == 'string' },
        version_show: { rule: v => [0, 1].includes(v), callback: v => driver.screen.reload() },
        //配合协议上报走哪个接口使用
        //上报模式:00 代表 上位机轮询 0X30获取扫码器数据、01 代表选用0x30 指令主动上报数据、80 代表上位机轮询0x33获取扫描器数据、0x81 代表 选用 0x33 指令主动上报数据
        report_mode: { rule: v => v == '1' || v == '0' || v == '81' || v == '80' },
        //扫码器数据有效时间默认为 2000ms
        report_timeout: { rule: regnCheck },
        // 密码按钮1开 0 关
        show_unlocking: { rule: v => [0, 1].includes(v), callback: v => driver.screen.reload() },
        // 按钮显示文字
        buttonText: { rule: v => typeof v == 'string' && v.length <= 6, callback: v => driver.screen.reload() },
        // 时区
        ntpLocaltime: { rule: regnCheck, callback: v => dxNtp.updateGmt(v) },
        //安全模块开关
        safe_open: { rule: v => [0, 1, 2].includes(v), callback: v => safeService.updateSafeOpen(v) },

        safe_keytype: { rule: v => [1].includes(v) },
        //安全模块秘钥
        safe_key_pub: { rule: v => typeof v == 'string' },
        //安全模块秘钥IV
        safe_iv_pri: { rule: v => typeof v == 'string' },
        // 日期显示隐藏 1开 0 关
        show_date: { rule: v => [0, 1].includes(v), callback: v => driver.screen.reload() },
        // 设备名称显示隐藏 1开 0 关
        show_devname: { rule: v => [0, 1].includes(v), callback: v => driver.screen.reload() },
        // 自动重启开关 -1 关 
        autoRestart: { rule: v => [-1, 0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23].includes(v) },
        reboot: { rule: () => true }
    }
}
function rotation(rotation) {
    if (rotation == 0) {
        rotation = 1
    } else if (rotation == 1) {
        rotation = 0
    } else if (rotation == 2) {
        rotation = 3
    } else if (rotation == 3) {
        rotation = 2
    }
    config.set("sysInfo.rotation", rotation)
    driver.screen.reload()
}
// 需要重启的配置
const needReboot = ["autoRestart",'owifi', 'w_mode', 'ntpLocaltime', 'codeSwitch', 'nfc', 'taddr', 'port', 'de_type',
    'net_type', 'ip_mode', 'ip', 'gateway', 'dns', 'mask', 'fixed_macaddr_enable', , 'ntp_en', 'ntp_addr', 'ntp_port', 'ochannel']

// 统一用户配置校验方法
configService.configVerifyAndSave = function (data) {
    let isReboot = false
    for (const key in data) {
        if (!supported[key]) {
            return key + " not supported"
        }
        const item = data[key];
        if (typeof item != 'object') {
            // 必须是一个组
            continue
        }
        log.info("-------------" + key)
        for (const subKey in item) {
            let option = supported[key][subKey]
            if (utils.isEmpty(option)) {
                return subKey + " not supported"
            }
            const value = item[subKey];
            if (needReboot.includes(subKey)) {
                isReboot = true
            }
            //安全模块相关的,单独提出来,因为修改秘钥要根据返回值判断是否保存到config中,开关需要特殊判断V=2的时候,保存为1的操作
            if (subKey.includes("safe_")) {
                safeService.updateConfig(subKey, value);

            } else {
                if (!option.rule || option.rule(value)) {
                    // 没有校验规则，或者校验通过
                    config.set(key + "." + subKey, value)
                    if (option.callback) {
                        // 执行配置设置回调
                        option.callback(value)
                    }
                } else {
                    return subKey + ": " + value + " check failure"
                }
            }



        }
    }
    config.save()
    // 检查需要重启的配置，3秒后重启
    if (isReboot) {
        common.asyncReboot(3)
    }
    return true
}
export default configService
