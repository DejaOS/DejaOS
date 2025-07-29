// build : 2024052411
// osdp 输出,只能输出2种状态，高电平/低电平，如果接入继电器，则高电平是开，低电平是关
import { osdpClass } from './libvbar-drv-dxosdp.so'
import std from './dxStd.js'
import * as os from "os"
import dxMap from './dxMap.js'
import dxCommon from './dxCommon.js'
const map = dxMap.get('default')
const osdpObj = new osdpClass();
const osdp = {}


/* -------------------------------------------------------------- */
/*                           CP Methods                           */
/* -------------------------------------------------------------- */

/**
 * OSDP Controller 初始化
 * @param {string} id 句柄ID
 * @param {object} options CP相关参数,必填
 *      @param {string} options.name 当前PD附带的子阅读器上下文中的阅读器编号；这个数字表示那个阅读器的编号。LibOSDP不支持此功能。
 *      @param {number} options.baud_rate Can be one of 9600/19200/38400/57600/115200/230400
 *      @param {number} options.address 7位PD地址。其余的比特被忽略。特殊地址0x7F用于广播。因此，多点通道上可以有2^7-1个设备
 *      @param {number} options.flags 用于修改上下文的设置方式。请参阅`OSDP_FLAG_*`宏。
 *      @param {object} options.id PD在收到“CMD_ID”时向CP报告的静态信息。这些信息必须由PD应用程序填充。
 * 			@param {number} options.id.version 1字节制造商版本号
 * 			@param {number} options.id.model 1字节制造商型号
 * 			@param {number} options.id.vendor_code 3字节IEEE分配的OUI
 * 			@param {number} options.id.serial_number PD的4字节序列号
 * 			@param {number} options.id.firmware_version 3字节版本（主要、次要、内部版本）
 *      @param {object} options.cap 这是一个指向包含PD功能的结构数组的指针。使用｛-1，0，0｝终止数组。这仅用于PD操作模式
 * 			@param {number} options.cap.function_code 能力功能代码。请参阅@ref osdp_pd_cap_function_code_e
 * 			@param {number} options.cap.compliance_level 一个与函数代码相关的数字，指示PD可以使用此功能做什么。
 * 			@param {number} options.cap.num_items PD中此类能力实体的数量
 *      @param {object} options.channel 通信信道操作结构，包含send/recv函数指针
 * 			@param {number} options.channel.data 指向将传递给发送/接收/刷新方法的内存块的指针。这是可选的（可以设置为NULL）
 * 			@param {number} options.channel.id channel_id；在多点网络上，多个PD可以共享同一通道（读/写/刷新指针）。在这种网络上，channel_id用于将PD锁定到信道。在多点网络中，此“id”必须为非零，并且对每条总线都是唯一的。
 * 			@param {function} options.channel.recv 指向用于接收osdp数据包的函数的指针
 * 			@param {function} options.channel.send 指向用于发送osdp数据包的函数的指针
 * 			@param {function} options.channel.flush 指向用于刷新通道的函数的指针（可选）
 *      @param {ArrayBuffer} options.scbk 指向PD的16字节安全通道基本密钥的指针。如果非空，则用于设置安全通道。
 */
osdp.osdpCpSetup = function (id, options) {

	// let pointer = osdpObj.osdpCpSetup()
	// if (pointer === undefined || pointer === null) {
	// 	throw new Error("nfc.init: init failed")
	// }
	// dxCommon.handleId("osdp", id, pointer)

	let pointer = dxCommon.handleId("uart", id)
	return osdpObj.osdpCpSetup(pointer, options);
}

/**
 * 释放osdp资源
 * @param {string} id 句柄ID
 * @returns true/false
 */
osdp.osdpCpRefresh = function (cp_ptr) {
	return osdpObj.osdpCpRefresh(cp_ptr);
}

/**
 * 申请osdp,每个osdp只需要申请一次
 * @param {string} id 句柄ID
 * @param {object} cmd OSDP指挥结构。这是所有单独OSDP命令的包装器。
 * 		@param {number} cmd.id 1字节制造商版本号
 *      @param {object} options.led LED command structure
 * 			@param {number} options.led.reader Reader number. 0 = First Reader, 1 = Second Reader, etc.
 * 			@param {number} options.led.led_number LED number. 0 = first LED, 1 = second LED, etc.
 * 			@param {object} options.led.temporary Ephemeral LED status descriptor.
 * 				Temporary Control Code:
 * 				- 0 - NOP - do not alter this LED's temporary settings.
 * 				- 1 - Cancel any temporary operation and display this LED's
 * 			    permanent state immediately.
 * 				- 2 - Set the temporary state as given and start timer immediately.
 *
 * 				Permanent Control Code:
 * 				- 0 - NOP - do not alter this LED's permanent settings.
 * 				- 1 - Set the permanent state as given.
 * 				@param {number} options.led.temporary.control_code 
 * 				@param {number} options.led.temporary.on_count The ON duration of the flash, in units of 100 ms.
 * 				@param {number} options.led.temporary.off_count The OFF duration of the flash, in units of 100 ms.
 * 				@param {number} options.led.temporary.on_color Color to set during the ON timer (see @ref osdp_led_color_e).
 * 				@param {number} options.led.temporary.off_color Color to set during the OFF timer (see @ref osdp_led_color_e).
 * 				@param {number} options.led.temporary.timer_count Time in units of 100 ms (only for temporary mode).
 * 			@param {object} options.led.permanent Permanent LED status descriptor.
 * 				Temporary Control Code:
 * 				- 0 - NOP - do not alter this LED's temporary settings.
 * 				- 1 - Cancel any temporary operation and display this LED's
 * 			    permanent state immediately.
 * 				- 2 - Set the temporary state as given and start timer immediately.
 *
 * 				Permanent Control Code:
 * 				- 0 - NOP - do not alter this LED's permanent settings.
 * 				- 1 - Set the permanent state as given.
 * 				@param {number} options.led.temporary.control_code 
 * 				@param {number} options.led.temporary.on_count The ON duration of the flash, in units of 100 ms.
 * 				@param {number} options.led.temporary.off_count The OFF duration of the flash, in units of 100 ms.
 * 				@param {number} options.led.temporary.on_color Color to set during the ON timer (see @ref osdp_led_color_e).
 * 				@param {number} options.led.temporary.off_color Color to set during the OFF timer (see @ref osdp_led_color_e).
 * 				@param {number} options.led.temporary.timer_count Time in units of 100 ms (only for temporary mode).
 * 		@param {object} options.buzzer Buzzer command structure
 * 			@param {number} options.buzzer.reader Reader number. 0 = First Reader, 1 = Second Reader, etc.
 * 			@param {number} options.buzzer.control_code 
 * 			 	Control code.
 * 				- 0 - no tone
 * 				- 1 - off
 * 				- 2 - default tone
 * 				- 3+ - TBD
 * 			@param {number} options.buzzer.on_count The ON duration of the sound, in units of 100 ms.
 * 			@param {number} options.buzzer.off_count The OFF duration of the sound, in units of 100 ms.
 * 			@param {number} options.buzzer.rep_count The number of times to repeat the ON/OFF cycle; 0: forever.
 * 		@param {object} options.text Text command structure
 * 			@param {number} options.text.reader Reader number. 0 = First Reader, 1 = Second Reader, etc.
 * 			Control code.
 *	  		- 1 - permanent text, no wrap
 *	  		- 2 - permanent text, with wrap
 *	  		- 3 - temp text, no wrap
 *	  		- 4 - temp text, with wrap
 * 			@param {number} options.text.control_code 
 * 			@param {number} options.text.temp_time Duration to display temporary text, in seconds
 * 			@param {number} options.text.offset_row Row to display the first character (1-indexed)
 * 			@param {number} options.text.offset_col Column to display the first character (1-indexed)
 * 			@param {number} options.text.length Number of characters in the string
 * 			@param {string} options.text.data The string to display
 * 		@param {object} options.output Output command structure
 * 		@param {object} options.comset Comset command structure
 * 			@param {number} options.comset.address Unit ID to which this PD will respond after the change takes effect.
 * 			@param {number} options.comset.baud_rate Baud rate. Valid values: 9600, 19200, 38400, 115200, 230400.
 * 		@param {object} options.keyset Keyset command structure
 * 			@param {number} options.keyset.type Type of keys: - 0x01 – Secure Channel Base Key
 * 			@param {number} options.keyset.length Number of bytes of key data - (Key Length in bits + 7) / 8
 * 			@param {string} options.keyset.data Key data
 * 		@param {object} options.mfg Manufacturer specific command structure
 * 			@param {number} options.mfg.vendor_code 3-byte IEEE assigned OUI. Most Significant 8-bits are unused
 * 			@param {number} options.mfg.command 1-byte manufacturer defined osdp command
 * 			@param {number} options.mfg.length length Length of command data (optional)
 * 			@param {string} options.mfg.data Command data (optional)
 * 		@param {object} options.file_tx File transfer command structure
 * 			@param {number} options.file_tx.id Pre-agreed file ID between CP and PD
 * 			@param {number} options.file_tx.flags Reserved and set to zero by OSDP spec.
 * 				@note: The upper bits are used by libosdp as:
 *    				bit-31 - OSDP_CMD_FILE_TX_FLAG_CANCEL: cancel an ongoing transfer
 * 		@param {object} options.status Status report command structure
 * 			@param {object} options.status.type The kind of event to report see `enum osdp_event_status_type_e`
 * 				OSDP_STATUS_REPORT_INPUT 	0 Status report of the inputs attached the PD
 * 				OSDP_STATUS_REPORT_OUTPUT 	1 Status report of the output attached the PD
 * 				OSDP_STATUS_REPORT_LOCAL	2 Local tamper and power status report Bit-0: tamper Bit-1: power
 * 				OSDP_STATUS_REPORT_REMOTE	3 Remote tamper and power status report Bit-0: tamper Bit-1: power
 * 			@param {number} options.status.nr_entries Number of valid bits in `status`
 * 			@param {number} options.status.mask Status bit mask
 * @returns true/false
 */
osdp.osdpCpSendCommand = function (cp_ptr, command) {
	return osdpObj.osdpCpSendCommand(cp_ptr, command);
}

/**
 * 设置事件回调函数
 * @param {number} osdp的标识，不同的设备不同的标识，必填
 * @returns true/false
 */
osdp.osdpCpSetEventCallback = function (cp_ptr, func) {
	return osdpObj.osdpCpSetEventCallback(cp_ptr, func);
}

/**
 * 清空命令队列
 * @param {number} osdp的标识，不同的设备不同的标识，必填
 * @returns true/false
 */
osdp.osdpCpTeardown = function (cp_ptr) {
	return osdpObj.osdpCpTeardown(cp_ptr);
}

/**
 * 刷新命令队列
 * @param {number} osdp的标识，不同的设备不同的标识，必填
 * @returns true/false
 */
osdp.osdpCpFlushCommands = function (cp_ptr) {
	return osdpObj.osdpCpFlushCommands(cp_ptr);
}

/**
 * 获取PD ID信息
 * @param {number} osdp的标识，不同的设备不同的标识，必填
 * @param {number} pd_num 设备地址
 * @returns true/false
 */
osdp.osdpCpGetPdId = function (cp_ptr, pd_num) {
	return osdpObj.osdpCpGetPdId(cp_ptr, pd_num);
}

/**
 * 释放指定osdp
 * @param {number} osdp的标识，不同的设备不同的标识，必填
 * @param {number} pd_num 设备地址
 * @param {number} function_code 功能号
 * 		具体功能参数查看osdp.h enum osdp_pd_cap_function_code_e结构体
 * @returns true/false
 */
osdp.osdpCpGetCapability = function (cp_ptr, pd_num, function_code) {
	return osdpObj.osdpCpGetCapability(cp_ptr, pd_num, function_code);
}

/**
 * 修改PD的flag
 * @param {number} cp_ptr 设备指针
 * @param {number} pd ，不同的设备不同的标识，必填
 * @param {number} flags 设备模式 OSDP_FLAG_ENFORCE_SECURE 0x00010000 0； 建议在生产环境中使用此标志 OSDP_FLAG_INSTALL_MODE 0x00020000 1； OSDP_FLAG_IGN_UNSOLICITED 0x00040000 2；

#define 
 * @param {number} osdp的标识，不同的设备不同的标识，必填
 * @returns true/false
 */
osdp.osdpCpModifyFlag = function (cp_ptr, pd, flags, do_set) {
	return osdpObj.osdpCpModifyFlag(cp_ptr, pd, flags, do_set);
}

/* -------------------------------------------------------------- */
/*                           PD Methods                           */
/* -------------------------------------------------------------- */

/**
 * 指定osdp输出高/低电平
 * @param {number} osdp的标识，不同的设备不同的标识，必填
 * @param {number} value 只能是1和0，1表示高电平，0表示低电平，缺省是高电平，必填
 * @returns true/false
 */
osdp.osdpPdSetup = function (id, options) {
	let pointer = dxCommon.handleId("uart", id)
	return osdpObj.osdpPdSetup(pointer, options);
}

/**
 * 获取指定osdp当前的输出 ：高/低电平
 * @param {number} osdp的标识，不同的设备不同的标识，必填
 * @returns 1和0，1表示高电平，0表示低电平
 */
osdp.osdpPdRefresh = function (pd_ptr) {
	return osdpObj.osdpPdRefresh(pd_ptr);
}

/**
 * 设置回调函数
 * @param {number} osdp的标识，不同的设备不同的标识，必填
 * @param {number} state 上拉状态，必填
 * @returns true/false
 */
osdp.osdpPdSetCommandCallback = function (pd_ptr, func) {
	return osdpObj.osdpPdSetCommandCallback(pd_ptr, func);
}

/**
 * 发送给CP事件
 * @param {number} osdp的标识，不同的设备不同的标识，必填
 * @param {number} state 上拉状态，必填
 * @returns true/false
 */
osdp.osdpPdNotifyEvent = function (pd_ptr, event) {
	return osdpObj.osdpPdNotifyEvent(pd_ptr, event);
}

/**
 * 清除所有事件
 * @param {number} osdp的标识，不同的设备不同的标识，必填
 * @param {number} state 上拉状态，必填
 * @returns true/false
 */
osdp.osdpPdTeardown = function (pd_ptr) {
	return osdpObj.osdpPdTeardown(pd_ptr);
}

/**
 * 刷新事件
 * @param {number} osdp的标识，不同的设备不同的标识，必填
 * @param {number} state 上拉状态，必填
 * @returns true/false
 */
osdp.osdpPdFlushEvents = function (pd_ptr, event) {
	return osdpObj.osdpPdFlushEvents(pd_ptr, event);
}

/**
 * 设置功能
 * @param {number} osdp的标识，不同的设备不同的标识，必填
 * @param {object array} capConfigArray 设备能力功能数组列表
 * 		具体功能参数查看osdp.h enum osdp_pd_cap_function_code_e结构体
 * 		capConfigArray[0].function_code 	功能类型
 *      capConfigArray[0].compliance_level 	功能层级
 *      capConfigArray[0].num_items 		功能数量
 * 		......
 * @returns true/false
 */
osdp.osdpPdSetCapabilities = function (pd_ptr, capConfigArray) {
	return osdpObj.osdpPdSetCapabilities(pd_ptr, capConfigArray);
}

/* -------------------------------------------------------------- */
/*                         Common Methods                         */
/* -------------------------------------------------------------- */
/**
 * 初始化日志
 * @param {number} osdp的标识，不同的设备不同的标识，必填
 * @param {number} state 上拉状态，必填
 * @returns true/false
 */
osdp.osdpLoggerInit = function (pd_ptr) {
	return osdpObj.osdpLoggerInit(pd_ptr);
}

/**
 * 设置日志回调
 * @param {number} osdp的标识，不同的设备不同的标识，必填
 * @param {number} state 上拉状态，必填
 * @returns true/false
 */
osdp.osdpSetLogCallback = function (pd_ptr) {
	return osdpObj.osdpSetLogCallback(pd_ptr);
}

/**
 * 获取版本号
 * @param {number} osdp的标识，不同的设备不同的标识，必填
 * @param {number} state 上拉状态，必填
 * @returns true/false
 */
osdp.osdpGetVersion = function (pd_ptr) {
	return osdpObj.osdpGetVersion(pd_ptr);
}

/**
 * 获取信息
 * @param {number} osdp的标识，不同的设备不同的标识，必填
 * @param {number} state 上拉状态，必填
 * @returns true/false
 */
osdp.osdpGetSourceInfo = function (pd_ptr) {
	return osdpObj.osdpGetSourceInfo(pd_ptr);
}

/**
 * 获取mask
 * @param {number} osdp的标识，不同的设备不同的标识，必填
 * @param {number} state 上拉状态，必填
 * @returns true/false
 */
osdp.osdpGetStatusMask = function (pd_ptr) {
	return osdpObj.osdpGetStatusMask(pd_ptr);
}

/**
 * 获取sc mask
 * @param {number} osdp的标识，不同的设备不同的标识，必填
 * @param {number} state 上拉状态，必填
 * @returns true/false
 */
osdp.osdpGetScStatusMask = function (pd_ptr) {
	return osdpObj.osdpGetScStatusMask(pd_ptr);
}

/**
 * 注册文件操作方法
 * @param {number} osdp的标识，不同的设备不同的标识，必填
 * @param {number} state 上拉状态，必填
 * @returns true/false
 */
osdp.osdpFileRegisterOps = function (pd_ptr) {
	return osdpObj.osdpFileRegisterOps(pd_ptr);
}

/**
 * 获取文件传输状态
 * @param {number} osdp的标识，不同的设备不同的标识，必填
 * @param {number} state 上拉状态，必填
 * @returns true/false
 */
osdp.osdpGetFileTxStatus = function (pd_ptr) {
	return osdpObj.osdpGetFileTxStatus(pd_ptr);
}


/**
 * 判断osdp消息队列是否为空
 * @returns true/false
 */
osdp.msgIsEmpty = function () {
	return osdpObj.msgIsEmpty()
}

/**
 * 从osdp消息队列中读取数据
 * @returns json
 */
osdp.msgReceive = function () {
	return JSON.parse(osdpObj.msgReceive());
}

/**
 * 获取osdp队列大小
 * @returns num
 */
osdp.msgSize = function () {
	return osdpObj.msgSize();
}

export default osdp;
