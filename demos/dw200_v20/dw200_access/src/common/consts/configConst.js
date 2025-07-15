
const configConst = {}
configConst.setConfig = {
    // mqttip+端口
    mqttaddr: "mqttInfo.mqttAddr",
    // mqtt 账号
    mqttusername: "mqttInfo.mqttName",
    //mqtt 密码
    mqttpassword: "mqttInfo.password",
    //mqtt前缀
    mqttprefix: "mqttInfo.prefix",
    //qosmqtt
    mqttqos: "mqttInfo.qos",
    // 客户端ID
    mqttclientid: "mqttInfo.clientId",
    //ntp对时服务地址
    ntpAddr: "netInfo.ntpAddr",
    //对时模式
    ntp: "netInfo.ntp",
    //网络时间同步间隔	
    ntpHour: "netInfo.ntpHour",
    //net_type 
    net_type: "netInfo.type",
    //DHCP 
    ip_mode: "netInfo.dhcp",
    //ip
    ip: "netInfo.ip",
    //网关
    gateway: "netInfo.gateway",
    //dns
    dns: "netInfo.dns",
    //macaddr
    macaddr: "netInfo.netMac",
    // fixed_macaddr_enable 0:默认mac 2:自定义mac
    fixed_macaddr_enable: "netInfo.fixed_macaddr_enable",
    //子网掩码
    mask: "netInfo.subnetMask",
    //设备号
    devnum: "sysInfo.deviceNum",
    //公司名称
    devname: "sysInfo.deviceName",
    //喇叭音量
    volume: "sysInfo.volume",
    //按键音量
    volume2: "sysInfo.volume2",
    //蜂鸣音量
    volume3: "sysInfo.volume3",
    //心跳开关
    heart_en: "sysInfo.heart_en",
    //心跳间隔
    heart_time: "sysInfo.heart_time",
    //心跳内容
    heart_data: "sysInfo.heart_data",
    //设备状态
    dev_sta: "sysInfo.status",
    //云证开关 3:云证获取 1:物理卡号
    nfc_identity_card_enable: "sysInfo.nfc_identity_card_enable",
    //日期格式 1 年/月/日 2 日/月/年
    dateFormat: "sysInfo.dateFormat",
    //时间格式 1 24小时制 2 12小时制
    timeFormat: "sysInfo.timeFormat",
    //-1 关闭自动重启   0-23 整点重启
    autoRestart: "sysInfo.autoRestart",
    //sn是否隐藏 1 显示 0 隐藏
    sn_show: "uiInfo.sn_show",
    //ip是否隐藏 1 显示 0 隐藏
    ip_show: "uiInfo.ip_show",
    //version是否隐藏 1 显示 0 隐藏
    version_show: "sysInfo.version_show",
    //设备配置密码
    com_passwd: "sysInfo.com_passwd",
    //语言
    language: "sysInfo.language",
    //系统时间
    time: "sysInfo.time",
    blhorc: "sysInfo.blhorc", //蓝牙前后缀 1char 2hex
    blpri: "sysInfo.blpri", //蓝牙前缀 
    blpos: "sysInfo.blpos", //蓝牙后缀
    blcr: "sysInfo.blcr", //蓝牙加回车 0不加1加
    blnl: "sysInfo.blnl", //蓝牙加换行  0不加1加
    ble_name: "sysInfo.ble_name", //蓝牙名称
    ble_mac: "sysInfo.ble_mac", //蓝牙 mac
    blft: "sysInfo.blft", //蓝牙输出格式 0直接输出
    //开门模式
    openMode: "doorInfo.openMode",
    //开门时长
    openTime: "doorInfo.openTime",
    //开门超时时间
    openTimeout: "doorInfo.openTimeout",
    //在线验证开关 1开 0 关
    onlinecheck: "doorInfo.onlinecheck",
    //在线验证超时时间
    onlineTimeout: "doorInfo.timeout",
    buttonText: "uiInfo.buttonText",
    // 显示开锁按钮 1 显示 0 隐藏
    show_unlocking: "uiInfo.show_unlocking",
    // 屏幕旋转
    rotation: "uiInfo.rotation",
    rotation0BgImage: "uiInfo.rotation0BgImage",
    rotation1BgImage: "uiInfo.rotation1BgImage",
    rotation2BgImage: "uiInfo.rotation2BgImage",
    rotation3BgImage: "uiInfo.rotation3BgImage",
    //1打开0关闭
    nfc: "sysInfo.nfc",
    // 时区
    ntpLocaltime: "netInfo.ntpLocaltime",
    //
    ntpInterval: "netInfo.ntpInterval",
    // 码制
    de_type: "scanInfo.de_type",
    //扫码模式 0是间隔 1是单次
    s_mode: "scanInfo.sMode",
    //间隔生效  间隔时间
    interval: "scanInfo.interval",
    //wifi用户名
    ssid: "netInfo.ssid",
    //wifi 密码
    psk: "netInfo.psk",
    // 读卡方式 1: 读物理卡号 2: 固定扇区 3: 一卡一密
    nfcType: "nfcInfo.nfcType",
    // 读卡扇区号
    sectorNumber: "nfcInfo.sectorNumber",
    // 读卡块号
    blockNumber: "nfcInfo.blockNumber",
    // 读卡密钥类型 1:0x60 2:0x61
    secretkeyType: "nfcInfo.secretkeyType",
    // 读卡密钥
    secretkey: "nfcInfo.secretkey"
}
//根据 key 获取 setCofig中的 value
configConst.getValueByKey = function (key) {
    return this.setConfig[key] || undefined;
}

export default configConst