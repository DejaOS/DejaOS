
const configConst = {}
configConst.setConfig = {
    // MQTT IP + port
    mqttaddr: "mqttInfo.mqttAddr",
    // MQTT account
    mqttusername: "mqttInfo.mqttName",
    // MQTT password
    mqttpassword: "mqttInfo.password",
    // MQTT prefix
    mqttprefix: "mqttInfo.prefix",
    // MQTT QoS
    mqttqos: "mqttInfo.qos",
    // Client ID
    mqttclientid: "mqttInfo.clientId",
    // NTP time synchronization service address
    ntpAddr: "netInfo.ntpAddr",
    // Network type
    net_type: "netInfo.type",
    // DHCP
    ip_mode: "netInfo.dhcp",
    // IP
    ip: "netInfo.ip",
    // Gateway
    gateway: "netInfo.gateway",
    // DNS
    dns: "netInfo.dns",
    // MAC address
    macaddr: "netInfo.netMac",
    // fixed_macaddr_enable 0: default MAC 2: custom MAC
    fixed_macaddr_enable: "netInfo.fixed_macaddr_enable",
    // Subnet mask
    mask: "netInfo.subnetMask",
    // Device number
    devnum: "sysInfo.deviceNum",
    // Company name
    devname: "sysInfo.deviceName",
    // Speaker volume
    volume: "sysInfo.volume",
    // Key press volume
    volume2: "sysInfo.volume2",
    // Buzzer volume
    volume3: "sysInfo.volume3",
    // Heartbeat switch
    heart_en: "sysInfo.heart_en",
    // Heartbeat interval
    heart_time: "sysInfo.heart_time",
    // Heartbeat content
    heart_data: "sysInfo.heart_data",
    // Device status
    dev_sta: "sysInfo.status",
    // Cloud certificate switch 3: cloud certificate 1: physical card number
    nfc_identity_card_enable: "sysInfo.nfc_identity_card_enable",
    // SN visibility 1: show 0: hide
    sn_show: "uiInfo.sn_show",
    // IP visibility 1: show 0: hide
    ip_show: "uiInfo.ip_show",
    // Version visibility 1: show 0: hide
    version_show: "sysInfo.version_show",
    // Device configuration password
    com_passwd: "sysInfo.com_passwd",
    // Language
    language: "sysInfo.language",
    // Door opening mode
    openMode: "doorInfo.openMode",
    // Door opening duration
    openTime: "doorInfo.openTime",
    // Door opening timeout
    openTimeout: "doorInfo.openTimeout",
    // Online verification switch 1: on 0: off
    onlinecheck: "doorInfo.onlinecheck",
    // Online verification timeout
    onlineTimeout: "doorInfo.timeout",
    // buttonText: "uiInfo.buttonText",
    show_date: "uiInfo.show_date",
    show_devname: "uiInfo.show_devname",
    // Show unlock button 1: show 0: hide
    show_unlocking: "uiInfo.show_unlocking",
    // Screen rotation
    rotation: "uiInfo.rotation",
    // 1: enable 0: disable
    nfc: "sysInfo.nfc",
    // Timezone
    ntpLocaltime: "netInfo.ntpLocaltime",
    // Code type
    de_type: "scanInfo.deType",
    // Scan mode 0: interval 1: single
    s_mode: "scanInfo.sMode",
    // Interval effective, interval time
    interval: "scanInfo.interval",
    // Online verification error message switch 0: off 1: on
    onlinecheckErrorMsg: "sysInfo.onlinecheckErrorMsg",
    // -1: disable auto restart, 0-23: restart at the hour
    autoRestart: "sysInfo.autoRestart",
    setSn: "sysInfo.setSn",
}
// Get value from setConfig by key
configConst.getValueByKey = function (key) {
    return this.setConfig[key] || undefined;
}

export default configConst