
const configConst = {}
configConst.setConfig = {
    offlineAccessNum: "access.offlineAccessNum",
    relayTime: "access.relayTime",
    fire: "access.fire",
    fireStatus: "access.fireStatus",
    tamper: "access.tamper",
    uploadToCloud: "access.uploadToCloud",
    language: "base.language",
    password: "base.password",
    screenOff: "base.screenOff",
    screensaver: "base.screensaver",
    backlight: "base.backlight",
    brightness: "base.brightness",
    volume: "base.volume",
    showIp: "base.showIp",
    showSn: "base.showSn",
    appMode: "base.appMode",
    similarity: "face.similarity",
    livenessOff: "face.livenessOff",
    livenessVal: "face.livenessVal",
    showNir: "face.showNir",
    stranger: "face.stranger",
    voiceMode: "face.voiceMode",
    voiceModeDate: "face.voiceModeDate",
    recheck: "face.recheck",
    addr: "mqtt.addr",
    username: "mqtt.username",
    mqttpassword: "mqtt.password",
    qos: "mqtt.qos",
    prefix: "mqtt.prefix",
    onlinecheck: "mqtt.onlinecheck",
    timeout: "mqtt.timeout",
    willTopic: "mqtt.willTopic",
    cleanSession: "mqtt.cleanSession",
    type: "net.type",
    ssid: "net.ssid",
    psk: "net.psk",
    dhcp: "net.dhcp",
    ip: "net.ip",
    gateway: "net.gateway",
    mask: "net.mask",
    dns: "net.dns",
    mac: "net.mac",
    server: "ntp.server",
    gmt: "ntp.gmt",
    timeZone: "ntp.timeZone",
    heart_en: "sys.heart_en",//心跳1开 0 关
    heart_time: "sys.heart_time",
    nfc: "sys.nfc",//1开 0 关    刷卡开关
    pwd: "sys.pwd",//1开 0 关    密码开门开关
    strangerImage: "sys.strangerImage",//1开 0 关   陌生人保存图片开关
    // accessImageType: "sys.accessImageType",//1人脸 0 全景   通行图片类型
    nfcIdentityCardEnable: "sys.nfcIdentityCardEnable",
    scanInterval: "sys.scanInterval",
    weComMqttAddr: "sys.weComMqttAddr",
}
//根据 key 获取 setCofig中的 value
configConst.getValueByKey = function (key) {
    return this.setConfig[key] || undefined;
}

export default configConst