//build: 20240715
//数据通信通道，包括串口（Serial port）、USB（Universal Serial Bus）和韦根（Wiegand）
//依赖组件:dxDriver，dxStd，dxLogger，dxMap，dxEventBus,dxCommon
import { channelClass } from './libvbar-m-dxchannel.so'
import std from './dxStd.js'
import dxMap from './dxMap.js'
import dxCommon from './dxCommon.js'
import bus from './dxEventBus.js'
const uartObj = new channelClass();
const map = dxMap.get('default')
const uart = {}
uart.TYPE = {
	USBKBW: 1,//USB Keyboard Wedge通过USB接口连接键盘，并以韦根协议的形式传输数据
	USBHID: 2,//USB人体接口设备（USB Human Interface Device）通道类型
	UART: 3,//表示UART通道类型，即串口通道
	WIEGAND: 4//韦根（Wiegand）通道类型
}

/* 各类通道 IO 控制操作的设置选项枚举 */
uart.IOC_SET_CMD = {
    /* 设置KBW通道的配置参数 */
    CHANNEL_IOC_SET_KBW_CONFIG      : 1,
    /* 设置KBW通道的上位机参数 */
    CHANNEL_IOC_SET_KBW_UPPER       : 2,
    /* KBW上线时间 */
    CHANNEL_IOC_SET_KBW_UPTIME      : 3,
    /* KBW下线时间 */
    CHANNEL_IOC_SET_KBW_DOWNTIME    : 4,
    /* 设置HID通道的报告长度 */
    CHANNEL_IOC_SET_HID_REPORT_LEN  : 5,
    /* 设置UART通道的参数 */
    CHANNEL_IOC_SET_UART_PARAM      : 6,
    /* 设置韦根通道的工作模式 */
    CHANNEL_IOC_SET_WIEGAND_MODE    : 7,
    /* 设置韦根通道的GPIO配置 */
    CHANNEL_IOC_SET_WIEGAND_GPIO    : 8,
    /* 设置韦根通道的延迟时间 */
    CHANNEL_IOC_SET_WIEGAND_DELAY   : 9,
    /* 设置韦根通道的日志记录功能 */
    CHANNEL_IOC_SET_WIEGAND_LOG     : 10

};

/* 韦根通道的不同工作模式 */
uart.WIEGAND_MODE = {
    /* 韦根模式初始化值 */
    WIEGAND_MODE_INIT      : 0,
    /* 韦根 26 位模式 */
    WIEGAND_MODE_26		  : 1,
    /* 韦根 34 位模式 */
    WIEGAND_MODE_34		  : 2,
    /* 韦根 128 位模式 */
    WIEGAND_MODE_128       : 3,
    /* 韦根 256 位模式 */
    WIEGAND_MODE_256       : 4,
    /* 韦根 2048 位模式 */
    WIEGAND_MODE_2048      : 5,
    /* 自定义的韦根模式, 最大发送 6400 位 */
    WIEGAND_MODE_CUSTOM    : 6
};

/**
 * 打开信道
 * @param {number} type 通道类型，参考枚举 TYPE，必填
 * @param {string} path 不同的设备或同一设备的不同类型通道对应的path不一样，比如DW200的485对应的值是"/dev/ttyS2"，必填
 * @param {string} id 句柄id，非必填（若打开多个实例需要传入唯一id）
 */
uart.open = function (type, path, id) {
	if (type === undefined || type === null) {
		throw new Error("uart.open:'type' should not be null or empty")
	}
	if (path === undefined || path === null) {
		throw new Error("uart.open:'path' should not be null or empty")
	}

	let pointer = uartObj.open(type, path);

	if (pointer === undefined || pointer === null) {
		throw new Error("uart.open: open failed")
	}

	dxCommon.handleId("uart", id, pointer)
}

/**
 * 信道数据发送
 * @param {ArrayBuffer} buffer 要发送的数据，必填
 * @param {string} id 句柄id，非必填（需保持和init中的id一致）
 * @returns true/false
 */
uart.send = function (buffer, id) {
	if (buffer === undefined || buffer === null) {
		throw new Error("uart.send: 'buffer' should not be null or empty")
	}
	let pointer = dxCommon.handleId("uart", id)

	return uartObj.send(pointer, buffer);
}

/**
 * 信道数据发送，使用微光通信协议格式
 * @param {string/object} data 要发送的数据，必填
 * @param {string} id 句柄id，非必填（需保持和init中的id一致）
 * @returns true/false
 */
uart.sendVg = function (data, id) {
	if (!data) {
        return
    }
    if (typeof data === 'string') {
        uart.send(dxCommon.hexStringToArrayBuffer(data), id)
        return
    }
    let pack = '55aa' + data.cmd
    if (data.hasOwnProperty('result')) {
        pack += data.result
    }
    pack += (data.length % 256).toString(16).padStart(2, '0')
    pack += (Math.floor(data.length / 256)).toString(16).padStart(2, '0')
    pack += data.data
    let all = dxCommon.hexToArr(pack)
    let bcc = dxCommon.calculateBcc(all)
    all.push(bcc)
    uart.send(new Uint8Array(all).buffer, id)
}

/**
 * 接收数据，需要在线程里轮询去获取,返回Uint8Array类型
 * 如果接收到的数据没有达到size长度，会继续等待直到接收到size长度，但是如果timeout很短，就会有可能没收完就结束这一次操作
 * @param {number} size 接收数据的字节数，必填
 * @param {number} timeout 超时时间（毫秒）这个函数会阻塞等待最多这个时间就结束，如果提前接收到了size个数据也会结束，非必填，缺省是10ms
 * @param {string} id 句柄id，非必填（需保持和init中的id一致）
 * @returns Uint8Array,返回值的byteLength表示接收到的长度，如果为0表示没有接收到任何数据
 */
uart.receive = function (size, timeout, id) {
	if (size === undefined || size === null) {
		throw new Error("uart.receive:'size' should not be null or empty")
	}

	if (timeout === undefined || timeout === null) {
		timeout = 10
	}

	let pointer = dxCommon.handleId("uart", id)

	let res = uartObj.receive(pointer, size, timeout)
	if (res === null) {
		return null
	}
	return new Uint8Array(res)
}

/**
 * 调用信道特殊IO接口
 * @param {*} request 
 * @param {*} arg 
 * @param {string} id 句柄id，非必填（需保持和init中的id一致）
 * @returns true/false
 */
uart.ioctl = function (request, arg, id) {
	let pointer = dxCommon.handleId("uart", id)

	return uartObj.ioctl(pointer, request, arg)
}

/**
 * 关闭信道
 * @param {string} id 句柄id，非必填（需保持和init中的id一致）
 * @returns true/false
 */
uart.close = function (id) {
	let pointer = dxCommon.handleId("uart", id)

	return uartObj.close(pointer)
}


/**
 * 刷新信道
 * @param {number} queue_selector 必填
 * @param {string} id 句柄id，非必填（需保持和init中的id一致）
 * @returns true/false
 */
uart.flush = function (queue_selector, id) {
	if (queue_selector == null) {
		throw new Error("queue_selector should not be null or empty")
	}
	let pointer = dxCommon.handleId("uart", id)

	return uartObj.flush(pointer, queue_selector);
}


uart.VG = {
	RECEIVE_MSG: '__uartvg__MsgReceive',
}

/**
 * 简化微光通信协议的使用，
 * 1. 接受数据：把TLV的二进制的数据接受到后解析成对象，并以eventbus的event发送出去(uart.VG.RECEIVE_MSG+options.id)
 * 返回的对象格式：{cmd:"2a",result:"01",length:7,data:"0a1acc320fee32",bcc:true}
 * cmd: 1个字节的命令字，16进制字符串
 * result:1个字节的标识字，表示数据处理的结果，成功或失败或其他状态。只有反馈数据才有标识字，16进制字符串
 * length：数据的长度，在TLV里用2个字节来定义，这里直接转成10进制的数字
 * data：多个字节的数据域，16进制字符串
 * bcc: bcc校验成功或失败
 * 2. 发送数据：把对象转成TLV格式的二进制数据再发送出去，可以通过uart.sendVg('要发送的数据',id)，数据格式如下
 * 发送的数据格式有二种 1.对象格式 ：{cmd:"2a",result:"01",length:7,data:"0a1acc320fee32"} 2. 完整的16进制字符串'55AA09000000F6'
 * 3. 同样的id，多次调用runvg也只会执行一次
 * 
 * @param {object} options 启动的参数
 *			@param {number} options.type 通道类型，参考枚举 TYPE，必填  （兼容USBHID块传输，默认1024每块）
 *			@param {string} options.path 不同的设备或同一设备的不同类型通道对应的path不一样，比如DW200的485对应的值是"/dev/ttyS2"，必填
 *			@param {number} options.result 0和1(缺省是0)，标识是接收的数据还是发送的数据包含标识字节，0表示接受的数据不包括标识字，发送的数据包括，1是反之
 *			@param {number} options.passThrough passThrough为true则接收的数据使用透传模式，非必填
 *          @param {string} options.id  句柄id，非必填（若初始化多个实例需要传入唯一id）
 */
uart.runvg = function (options) {
	if (options === undefined || options.length === 0) {
		throw new Error("dxuart.runvg:'options' parameter should not be null or empty")
	}
	if (options.id === undefined || options.id === null || typeof options.id !== 'string') {
        // 句柄id
        options.id = ""
    }
	if (options.type === undefined || options.type === null) {
		throw new Error("dxuart.runvg:'type' should not be null or empty")
	}
	if (options.path === undefined || options.path === null) {
		throw new Error("dxuart.runvg:'path' should not be null or empty")
	}
	let oldfilepre = '/app/code/dxmodules/vgUartWorker'
	let content = std.loadFile(oldfilepre + '.js').replace("{{id}}", options.id)
	let newfile = oldfilepre + options.id + '.js'
	std.saveFile(newfile, content)
	let init = map.get("__vguart__run_init" + options.id)
	if (!init) {//确保只初始化一次
		map.put("__vguart__run_init" + options.id, options)
		bus.newWorker(options.id || "__uart",newfile)
	}
}
export default uart;