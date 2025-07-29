import { fingerClass } from './libvbar-p-dxfinger.so'

const fingerObj = new fingerClass();

const finger = {

	/**
	 * finger 初始化
	 * @returns 0:成功,undefined:失败
	 */
	init: function () {
		let handle = fingerObj.init()
		if(!handle){
            throw("finger初始化失败")
        }
		return {
			/**
			 * finger 取消初始化
			 * @returns undefined
			 */
			deinit: function () {
				return fingerObj.deinit(handle)
			},

			/**
			 * finger 回调方法注册
			* @returns 0:成功
			*/
			cbRegister: function () {
				return fingerObj.fingerRegisterCallback(handle, "fingerCallback")
			},

			/**
			 * finger 取消回调方法注册
			 * @returns 0:成功
			 */
			cbUnregister: function () {
				return fingerObj.fingerUnregisterCallback(handle, "fingerCallback")
			},
			/**
			 * 指令操作 
			 * @param buffer 指令Arraybuffer
			 * @returns Arraybuffer
			 */
			fingerOps: function (buffer) {
				return fingerObj.fingerOps(handle, buffer)
			},
			/**
			 * 判断finger消息队列是否为空
			 * @returns bool
			 */
			msgIsEmpty: function () {
				return fingerObj.msgIsEmpty()
			},

			/**
			 * 从finger消息队列中读取数据
			 * @returns json消息对象
			 */
			msgReceive: function () {
				return fingerObj.msgReceive()
			}
		}
	}
}

export default finger;
