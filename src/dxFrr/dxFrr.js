import { frrClass } from './libvbar-p-finger-recognizer.so'

const frrObj = new frrClass();

const frr = {

	/**
	 * frr 初始化
	 * @returns 0:成功,undefined:失败
	 */
	init: function (maxUser) {
		let handle = frrObj.init(maxUser)
		if(!handle){
            throw("frr初始化失败")
        }
		return {
			/**
			 * frr 指纹识别信息创建
			 * 
			 * id – 数据库唯一标识 字符串
			 * data – 指纹数据     Arraybuffer
			 * @returns undefined
			 */
			frrInfoCreate: function (id, data) {
				return frrObj.frrInfoCreate(handle, id, data)
			},

			/**
			 * frr 指纹识别信息销毁
			 * 指纹信息 JS对象
			 * @returns undefined
			 */
			frrDestory: function (frrInfo) {
				return frrObj.frrDestory(handle, frrInfo)
			},

			/**
			 * frr 回调方法注册
			 * @param {*}  type – 加载方式
			 * @param {*} 	part_count – 部分加载的一页人数
			 * @returns 0:成功
			*/
			cbRegister: function (type, part_count) {
				return frrObj.frrRegisterCallback(handle, type, part_count)
			},

			/**
			 * frr 刷新特征值
			 * @returns 0:成功
			 */
			frrUsersRefresh: function () {
				return frrObj.frrUsersRefresh(handle)
			},

			/**
			 * frr 指纹识别
			 * @param data 指纹数据 Arraybuffer
			 * @returns info 识别结果 JS对象
			 */
			frrRecognizer: function (data) {
				return frrObj.frrRecognizer(handle, data)
			},

			/**
			 * frr 获取已加载的用户数据
			 *  @param offset 索引序号
			 * @returns info 用户数据 JS对象
			 */
			frrUserGetInfo: function (offset) {
				return frrObj.frrUserGetInfo(handle, offset)
			},

			/**
			 * 判断frr消息队列是否为空
			 * @returns bool
			 */
			msgIsEmpty: function () {
				return frrObj.msgIsEmpty()
			},

			/**
			 * 从frr消息队列中读取数据
			 * @returns json消息对象
			 */
			msgReceive: function () {
				return frrObj.msgReceive()
			}
		}
	}
}

export default frr;
