
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
    // buttonText: "uiInfo.buttonText",
    show_date: "uiInfo.show_date",
    show_devname: "uiInfo.show_devname",
    // 显示开锁按钮 1 显示 0 隐藏
    show_unlocking: "uiInfo.show_unlocking",
    // 屏幕旋转
    rotation: "uiInfo.rotation",
    //1打开0关闭
    nfc: "sysInfo.nfc",
    // 时区
    ntpLocaltime: "netInfo.ntpLocaltime",
    // 码制
    de_type: "scanInfo.deType",
    //扫码模式 0是间隔 1是单次
    s_mode: "scanInfo.sMode",
    //间隔生效  间隔时间
    interval: "scanInfo.interval",
    //在线验证错误提示 开关 0 关闭 1 开启
    onlinecheckErrorMsg: "sysInfo.onlinecheckErrorMsg",
    //-1 关闭自动重启   0-23 整点重启
    autoRestart: "sysInfo.autoRestart",
    setSn: "sysInfo.setSn",
}
//根据 key 获取 setCofig中的 value
configConst.getValueByKey = function (key) {
    return this.setConfig[key] || undefined;
}

export default configConst