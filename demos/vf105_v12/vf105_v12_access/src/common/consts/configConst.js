
const configConst = {}
configConst.setConfig = {
    // CN/EN
    language: "base.language",
    // 管理员密码
    password: "base.password",
    // 人脸识别相似度
    similarity: "face.similarity",
    // 活体检测
    livenessOff: "face.livenessOff",
    // 活体检测阈值
    livenessVal: "face.livenessVal",
    showNir: "face.showNir",
    detectMask: "face.detectMask",
    // ["无语音", "播放请先注册", "播放陌生人你好"]
    stranger: "face.stranger",
    // ["无语音", "播放名字", "播放问候语"]
    voiceMode: "face.voiceMode",
    voiceModeDate: "face.voiceModeDate",
    addr: "mqtt.addr",
    mqttclientId: "mqtt.clientId",
    mqttusername: "mqtt.username",
    mqttpassword: "mqtt.password",
    mqttqos: "mqtt.qos",
    mqttprefix: "mqtt.prefix",
    onlinecheck: "mqtt.onlinecheck",
    timeout: "mqtt.timeout",
    willTopic: "mqtt.willTopic",
    type: "net.type",
    ssid: "net.ssid",
    psk: "net.psk",
    dhcp: "net.dhcp",
    ip: "net.ip",
    gateway: "net.gateway",
    mask: "net.mask",
    dns: "net.dns",
    mac: "net.mac",
    ntp: "ntp.ntp",
    server: "ntp.server",
    ntpInterval: "ntp.interval",
    gmt: "ntp.gmt",
    version: "sys.version",
    appVersion: "sys.appVersion",
    releaseTime: "sys.releaseTime",
    heart_en: "sys.heart_en",//心跳1开 0 关
    heart_time: "sys.heart_time",
    nfc: "sys.nfc",//1开 0 关    刷卡开关
    pwd: "sys.pwd",//1开 0 关    密码开门开关
    interval: "sys.interval",
    strangerImage: "sys.strangerImage",//1开 0 关   陌生人保存图片开关
    accessImageType: "sys.accessImageType",//1人脸 0 全景   通行图片类型
    com_passwd: "sys.com_passwd", // 配置码密码校验
    //云证开关 3:云证获取 1:物理卡号
    nfcIdentityCardEnable: "sys.nfcIdentityCardEnable",
    offlineAccessNum: "access.offlineAccessNum",
    relayTime: "access.relayTime",
    tamperAlarm: "access.tamperAlarm",
    // 熄屏时间，单位分钟，0从不
    screenOff: "base.screenOff",
    // 屏幕保护，单位分钟，0从不
    screensaver: "base.screensaver",
    brightness: "base.brightness",
    brightnessAuto: "base.brightnessAuto",
    volume: "base.volume",
    showIp: "base.showIp",
    showSn: "base.showSn",
    showProgramCode: "base.showProgramCode",
    showIdentityCard: "base.showIdentityCard",
    appMode: "base.appMode",
    luminanceWhite: "base.luminanceWhite",
    luminanceNir: "base.luminanceNir"

}
//根据 key 获取 setCofig中的 value
configConst.getValueByKey = function (key) {
    return this.setConfig[key] || undefined;
}

export default configConst