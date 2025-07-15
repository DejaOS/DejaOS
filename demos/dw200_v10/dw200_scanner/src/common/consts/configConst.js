
const configConst = {}
configConst.setConfig = {
    "w_mode": "sysInfo.w_mode", //1透传 2协议  
    "p_uart1": "sysInfo.p_uart1", //RS232 RS485参数 默认115200-8-O-1 
    "p_uart2": "sysInfo.p_uart2", //TTL参数 默认115200-8-O-1 
    "wiegand_busy_delay": "sysInfo.wiegand_busy_delay", //韦根忙时时间	
    "wiegand_free_delay": "sysInfo.wiegand_free_delay", //韦根闲时时间	
    //刷卡输出通道
    "nochannel": "sysInfo.nochannel", //输出通道  bit位为1代表一种 RS485输出:bit第一位()为 1 就是==2  网络输出比如 tpc是第 3、6、9位为1 =584 如果 485tcp 都开就是586  默认1 usb
    "ndchannel": "sysInfo.ndchannel", //协议模式输出通道 微光协议是64  一托 4 是 32  默认1 usb
    //扫码和心跳和密码输出通道
    "ochannel": "sysInfo.ochannel", //输出通道  bit位为1代表一种 RS485输出:bit第一位()为 1 就是==2  网络输出比如 tpc是第 3、6、9位为1 =584 如果 485tcp 都开就是586  默认1 usb
    "dchannel": "sysInfo.dchannel", //协议模式输出通道 微光协议是64  一托 4 是 32  默认1 usb
    //蓝牙输出通道
    "blochannel": "sysInfo.blochannel", //输出通道  bit位为1代表一种 RS485输出:bit第一位()为 1 就是==2  网络输出比如 tpc是第 3、6、9位为1 =584 如果 485tcp 都开就是586  默认1 usb
    "bldchannel": "sysInfo.bldchannel", //协议模式输出通道 微光协议是64  一托 4 是 32  默认1 usb
    "haddr": "sysInfo.haddr", //http地址
    "houttime": "sysInfo.houttime", //http超时时间，暂不支持
    "owifi": "sysInfo.owifi", //wifi 或者以太网输出端口选择
    "awifi_s": "sysInfo.awifi_s", //网络传输成功行为	
    "relayd": "sysInfo.relayd", //继电器延迟毫秒
    "awifi_f": "sysInfo.awifi_f", //网络传输失败行为
    "taddr": "sysInfo.taddr", //tcp服务地址
    "port": "sysInfo.port", //tcp端口
    "touttime": "sysInfo.touttime", //tcp超时时间
    "codeSwitch": "sysInfo.codeSwitch", //扫码开关  1开 0关
    "ST": "sysInfo.ST",
    "A1": "sysInfo.A1",
    "B1": "sysInfo.B1",
    "C1": "sysInfo.C1",
    "D1": "sysInfo.D1",
    "E1": "sysInfo.E1",
    "F1": "sysInfo.F1",
    "G1": "sysInfo.G1",
    "H1": "sysInfo.H1",
    "I1": "sysInfo.I1",
    "J1": "sysInfo.J1",
    "K1": "sysInfo.K1",
    "chorc": "sysInfo.chorc", //前后缀格式1是char 2是hex
    "prefix": "sysInfo.prefix", //前缀
    "postfix": "sysInfo.postfix", //后缀
    "ft": "sysInfo.ft", //扫码输出格式
    "nl": "sysInfo.nl", //加回车   0不加1加
    "cr": "sysInfo.cr", //加换行   0不加1加
    "ascan": "sysInfo.ascan", //扫码后动作	 bit位控制
    "beepd": "sysInfo.beepd", //蜂鸣器延迟
    "ledd": "sysInfo.ledd", //闪灯延迟
    "de_type": "sysInfo.de_type", //码制选择根据比特位来的 全选64511
    "s_mode": "sysInfo.s_mode", //扫码模式 0是间隔 1是单词
    "interval": "sysInfo.interval", //间隔生效  间隔时间
    "search_timeout": "sysInfo.search_timeout",
    "decoder": "sysInfo.decoder",
    "decoder_timeout": "sysInfo.decoder_timeout",
    "search_mode": "sysInfo.search_mode",
    "decoder_mode": "sysInfo.decoder_mode",
    "qr_mode": "sysInfo.qr_mode",
    "decoder_delay": "sysInfo.decoder_delay",
    "ocr_mode": "sysInfo.ocr_mode",
    "ocr_template": "sysInfo.ocr_template",
    "net_type": "sysInfo.net_type", //网络类型  1以太网 0关闭网络
    "fixed_macaddr_enable": "sysInfo.fixed_macaddr_enable", //mac地址 0默认 2手动设置
    "macaddr": "sysInfo.macaddr", //mac地址 手动设置
    "ip_mode": "sysInfo.ip_mode", //0 动态 1 静态
    "ip": "sysInfo.ip",
    "gateway": "sysInfo.gateway",
    "dns": "sysInfo.dns",
    "mask": "sysInfo.mask",
    "nfc": "sysInfo.nfc", //nfc 1打开0关闭
    "nfcReport": "sysInfo.nfcReport", //nfc 上报开关 1 开 0 关
    "nfc_identity_card_enable": "sysInfo.nfc_identity_card_enable", //配置是否读取身份证物理卡号0开1关
    "nfc_card_protocol": "sysInfo.nfc_card_protocol", // NFC 支持的协议bit0: ISO14443-A 106kbps bit1: ISO14443-B 106kbps bit3: ISO15693
    "st": "sysInfo.st", // 起始位
    "len": "sysInfo.len", // 输出长度
    "nft": "sysInfo.nft", // 0：透传（eg:卡号：9384ED18=>93 84 ED 18，四字节），1：转16进制输出(卡号每一位用ascii16进制表示，八字节)，2：转10进制输出（卡号作为数字转10进制数字，数字每一位用ascii16进制表示，字节数不定）
    "anfc": "sysInfo.anfc", //刷卡后动作
    "pri": "sysInfo.pri", // 前缀，char（每个字符用ascii16进制表示），hex（必须是偶数且每位大小于0-f）
    "pos": "sysInfo.pos", // 后缀，同前缀
    "horc": "sysInfo.horc", // 0:字符串，1：16进制
    "nnl": "sysInfo.nnl", // 输出的 NFC 数据是否添加回车(0D)，在前后缀之后,0:不添加,1:添加
    "ncr": "sysInfo.ncr", // 输出的 NFC 数据是否添加换行(0A，在0D之后),0:不添加,1:添加
    "ord": "sysInfo.ord", // 0: 输出的NFC数据为正序（卡号就是正序），1: 输出的NFC数据为反序，优先判断
    "nfc_otag": "sysInfo.nfc_otag", //输出信息默认0不输出 其他按照bit位来判断
    "online_id_format": "sysInfo.online_id_format", //身份证数据格式0 ASCII 2是JOSN格式
    "blhorc": "sysInfo.blhorc", //蓝牙前后缀 1char 2hex
    "blpri": "sysInfo.blpri", //蓝牙前缀 
    "blpos": "sysInfo.blpos", //蓝牙后缀
    "blcr": "sysInfo.blcr", //蓝牙加回车 0不加1加
    "blnl": "sysInfo.blnl", //蓝牙加换行  0不加1加
    "ble_name": "sysInfo.ble_name", //蓝牙名称
    "ble_mac": "sysInfo.ble_mac", //蓝牙 mac
    "blft": "sysInfo.blft", //蓝牙输出格式 0直接输出
    "boot_music": "sysInfo.boot_music", //开机提示音 0关闭
    "volume": "sysInfo.volume", //音量0-60，语音
    "volume1": "sysInfo.volume1", //音量0-100，蜂鸣
    "backlight": "sysInfo.backlight", //LCD背光亮度
    "brightness": "sysInfo.brightness", //白色补光灯亮度
    "userid": "sysInfo.userid", //userId
    "devnum": "sysInfo.devnum", //设备号
    "devname": "sysInfo.devname", //设备名称
    "heart_en": "sysInfo.heart_en", //心跳开关 0 关 1 开
    "heart_data": "sysInfo.heart_data", //心跳内容
    "heart_time": "sysInfo.heart_time", //心跳间隔时间，秒
    "sn": "sysInfo.sn", //sn 只读
    "uuid": "sysInfo.uuid", //uuid 只读
    "sn_show": "sysInfo.sn_show", //是否隐藏sn  0隐藏1显示
    "ip_show": "sysInfo.ip_show", //是否隐藏ip  0隐藏1显示
    "rotation": "sysInfo.rotation", //屏幕角度
    "language": "sysInfo.language", //语言  0中文1英文
    "com_passwd": "sysInfo.com_passwd", //配置密码 默认1234567887654321
    "ntp_en": "sysInfo.ntp_en", //ntp 对时0禁用 1启用
    "ntp_addr": "sysInfo.ntp_addr", //对时服务器 默认182.92.12.11
    "ntp_port": "sysInfo.ntp_port", //端口默认 123，暂不支持
    "ntp_timeout": "sysInfo.ntp_timeout", //ntp同步超时时间	默认 5，暂不支持
    "ntp_interval": "sysInfo.ntp_interval", //ntp同步间隔	默认43200秒，即12小时
    "ntp_hour": "sysInfo.ntp_hour", //ntp 固定时间同步	定时同步，23 即为每天 23：00 自动同步时间
    "version": "sysInfo.version", //版本号
    "version_show": "sysInfo.version_show", //版本显示/隐藏
    //配合协议上报走哪个接口使用
    //上报模式:00 代表 上位机轮询 0X30获取扫码器数据、01 代表选用0x30 指令主动上报数据、80 代表上位机轮询0x33获取扫描器数据、0x81 代表 选用 0x33 指令主动上报数据
    "report_mode": "sysInfo.report_mode",
    //扫码器数据有效时间默认为 2000ms
    "report_timeout": "sysInfo.report_timeout",
    // 密码按钮1开 0 关
    "show_unlocking": "sysInfo.show_unlocking",
    // 日期显示隐藏 1开 0 关
    "show_date": "sysInfo.show_date",
    // 设备名称显示隐藏 1开 0 关
    "show_devname": "sysInfo.show_devname",
    "buttonText": "sysInfo.buttonText",
    // 设置背景图片
    "rotation0BgImage": "sysInfo.rotation0BgImage",
    "rotation1BgImage": "sysInfo.rotation1BgImage",
    "rotation2BgImage": "sysInfo.rotation2BgImage",
    "rotation3BgImage": "sysInfo.rotation3BgImage",
    // 时区
    "ntpLocaltime": "sysInfo.ntpLocaltime",
    //安全模块，0是关，1是开 2是重置秘钥
    "safe_open": "sysInfo.safe_open",
    "safe_keytype": "sysInfo.safe_keytype",
    "safe_key_pub": "sysInfo.safe_key_pub",
    "safe_iv_pri": "sysInfo.safe_iv_pri",
    // 自动重启功能
    "autoRestart": "sysInfo.autoRestart",
    
}
//根据 key 获取 setCofig中的 value
configConst.getValueByKey = function (key) {
    return this.setConfig[key] || undefined;
}

export default configConst