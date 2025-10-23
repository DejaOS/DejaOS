
const configConst = {}

configConst.setConfig = {
    // CN/EN
    language: "base.language",
    // Administrator password
    password: "base.password",
    // Face recognition similarity
    similarity: "face.similarity",
    // Liveness detection
    livenessOff: "face.livenessOff",
    // Liveness detection threshold
    livenessVal: "face.livenessVal",
    showNir: "face.showNir",
    detectMask: "face.detectMask",
    // ["No voice", "Play please register first", "Play hello stranger"]
    stranger: "face.stranger",
    // ["No voice", "Play name", "Play greeting"]
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
    heart_en: "sys.heart_en", // Heartbeat 1 on 0 off
    heart_time: "sys.heart_time",
    nfc: "sys.nfc", // 1 on 0 off    Card swipe switch
    pwd: "sys.pwd", // 1 on 0 off    Password door open switch
    interval: "sys.interval",
    strangerImage: "sys.strangerImage", // 1 on 0 off   Stranger save image switch
    accessImageType: "sys.accessImageType", // 1 face 0 panorama   Access image type
    com_passwd: "sys.com_passwd", // Config code password verification
    // Cloud certificate switch 3: Cloud certificate get 1: Physical card number
    nfcIdentityCardEnable: "sys.nfcIdentityCardEnable",
    offlineAccessNum: "access.offlineAccessNum",
    relayTime: "access.relayTime",
    tamperAlarm: "access.tamperAlarm",
    // Screen off time, unit minutes, 0 never
    screenOff: "base.screenOff",
    // Screensaver, unit minutes, 0 never
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
// Get value in setConfig by key
configConst.getValueByKey = function (key) {
    return this.setConfig[key] || undefined;
}

export default configConst