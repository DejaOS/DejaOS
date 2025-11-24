const configConst = {}
configConst.setConfig = {
    // mqtt ip + port
    mqttaddr: "mqttInfo.mqttAddr",
    // mqtt username
    mqttusername: "mqttInfo.mqttName",
    // mqtt password
    mqttpassword: "mqttInfo.password",
    // mqtt prefix
    mqttprefix: "mqttInfo.prefix",
    // qos for mqtt
    mqttqos: "mqttInfo.qos",
    // client ID
    mqttclientid: "mqttInfo.clientId",
    // append random number
    clientIdSuffix: "mqttInfo.clientIdSuffix",
    // clean session
    cleanSession: "mqttInfo.cleanSession",
    // NTP time synchronization server address
    ntpAddr: "netInfo.ntpAddr",
    // time synchronization mode
    ntp: "netInfo.ntp",
    // network time synchronization interval (hours)
    ntpHour: "netInfo.ntpHour",
    // network type
    net_type: "netInfo.type",
    // DHCP
    ip_mode: "netInfo.dhcp",
    // IP address
    ip: "netInfo.ip",
    // gateway
    gateway: "netInfo.gateway",
    // DNS
    dns: "netInfo.dns",
    // MAC address
    macaddr: "netInfo.netMac",
    // fixed MAC address enable: 0 for default MAC, 2 for custom MAC
    fixed_macaddr_enable: "netInfo.fixed_macaddr_enable",
    // subnet mask
    mask: "netInfo.subnetMask",
    // device number
    devnum: "sysInfo.deviceNum",
    // company name
    devname: "sysInfo.deviceName",
    // speaker volume
    volume: "sysInfo.volume",
    // button click volume
    volume2: "sysInfo.volume2",
    // buzzer volume
    volume3: "sysInfo.volume3",
    // heartbeat switch
    heart_en: "sysInfo.heart_en",
    // heartbeat interval
    heart_time: "sysInfo.heart_time",
    // heartbeat content
    heart_data: "sysInfo.heart_data",
    // date format: 1 for YYYY/MM/DD, 2 for DD/MM/YYYY
    dateFormat: "sysInfo.dateFormat",
    // time format: 1 for 24-hour, 2 for 12-hour
    timeFormat: "sysInfo.timeFormat",
    // auto restart: -1 to disable, 0-23 for restart at the specified hour
    autoRestart: "sysInfo.autoRestart",
    // SN display: 1 to show, 0 to hide
    sn_show: "uiInfo.sn_show",
    // IP display: 1 to show, 0 to hide
    ip_show: "uiInfo.ip_show",
    // device configuration password
    com_passwd: "sysInfo.com_passwd",
    // language
    language: "sysInfo.language",
    // system time
    time: "sysInfo.time",
    // door opening mode
    openMode: "doorInfo.openMode",
    // door opening duration
    openTime: "doorInfo.openTime",
    // door opening timeout
    openTimeout: "doorInfo.openTimeout",
    // online verification switch: 1 for on, 0 for off
    onlinecheck: "doorInfo.onlinecheck",
    // online verification timeout
    onlineTimeout: "doorInfo.timeout",
    buttonText: "uiInfo.buttonText",
    // show unlock button: 1 to show, 0 to hide
    show_unlocking: "uiInfo.show_unlocking",
    // screen rotation
    rotation: "uiInfo.rotation",
    // timezone
    ntpLocaltime: "netInfo.ntpLocaltime",
    // barcode type
    de_type: "scanInfo.de_type",
    // scan mode: 0 for interval, 1 for single shot
    s_mode: "scanInfo.sMode",
    // interval setting: interval time
    interval: "scanInfo.interval",
    // Wi-Fi SSID
    ssid: "netInfo.ssid",
    // Wi-Fi password
    psk: "netInfo.psk",
    // NFC: 1 for on, 0 for off
    nfc: "nfcInfo.nfc",
    // cloud ID card switch: 3 for cloud ID, 1 for physical card number
    nfc_identity_card_enable: "nfcInfo.nfc_identity_card_enable",
    // card reading method: 1 for physical card number, 2 for fixed sector, 3 for one-card-one-key
    nfcType: "nfcInfo.nfcType",
    // card sector number
    sectorNumber: "nfcInfo.sectorNumber",
    // card block number
    blockNumber: "nfcInfo.blockNumber",
    // card key type: 1 for 0x60, 2 for 0x61
    secretkeyType: "nfcInfo.secretkeyType",
    // card key
    secretkey: "nfcInfo.secretkey",
    // status bar at bottom
    statusBar:"uiInfo.statusBar"
}

// Get value from setConfig by key
configConst.getValueByKey = function (key) {
    return this.setConfig[key] || undefined;
}

export default configConst