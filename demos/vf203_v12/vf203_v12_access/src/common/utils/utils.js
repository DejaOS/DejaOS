import * as os from "os"
import common from '../../../dxmodules/dxCommon.js'
const utils = {}

// 获取url文件下载大小（字节数）
utils.getUrlFileSize = function (url) {
    let actualSize = common.systemWithRes(`wget --spider -S ${url} 2>&1 | grep 'Length' | awk '{print $2}'`, 100).match(/\d+/g)
    return actualSize ? parseInt(actualSize) : 0
}
// 判断是否为""/null/undefined
utils.isEmpty = function (str) {
    return (str === "" || str === null || str === undefined)
}
/**
 * 解析字符串改为 json，注意value内不能有"号
 * @param {string} inputString 
 * @returns 
 */
utils.parseString = function (inputString) {
    // 获取{}及其之间的内容
    inputString = inputString.slice(inputString.indexOf("{"), inputString.lastIndexOf("}") + 1)
    // key=value正则，key是\w+（字母数字下划线，区别大小写），=两边可有空格，value是\w+或相邻两个"之间的内容（包含"）
    const keyValueRegex = /(\w+)\s*=\s*("[^"]*"|\w+)/g;
    let jsonObject = {};
    let match;
    while ((match = keyValueRegex.exec(inputString)) !== null) {
        let key = match[1];
        let value = match[2]

        if (/^\d+$/.test(value)) {
            // 数字
            value = parseInt(value)
        } else if (/^\d+\.\d+$/.test(value)) {
            // 小数
            value = parseFloat(value)
        } else if (value == 'true') {
            value = true
        } else if (value == 'false') {
            value = false
        } else {
            // 字符串
            value = value.replace(/"/g, '').trim()
        }
        jsonObject[key] = value;
    }
    return jsonObject;
}

/**
 * 等待下载结果，注意超时时间不得超过喂狗时间，否则下载慢会重启
 * @param {string} update_addr 下载地址
 * @param {string} downloadPath 存储路径
 * @param {number} timeout 超时
 * @param {string} update_md5 md5校验
 * @param {number} fileSize 文件大小
 * @returns 下载结果(bool)
 */
utils.waitDownload = function (update_addr, downloadPath, timeout, update_md5, fileSize) {
    // 删除原文件
    common.systemBrief(`rm -rf "${downloadPath}"`)
    // 异步下载
    common.systemBrief(`wget -c "${update_addr}" -O "${downloadPath}" &`)
    let startTime = new Date().getTime()
    while (true) {
        // 计算已下载的文件大小
        let size = parseInt(common.systemWithRes(`file="${downloadPath}"; [ -e "$file" ] && wc -c "$file" | awk '{print $1}' || echo "0"`, 100).split(/\s/g)[0])
        // 如果相等，则下载成功
        if (size == fileSize) {
            let ret = common.md5HashFile(downloadPath)
            if (ret) {
                let md5 = ret.map(v => v.toString(16).padStart(2, '0')).join('')
                if (md5 == update_md5) {
                    // md5校验成功返回true
                    return true
                }
            }
            common.systemBrief(`rm -rf "${downloadPath}"`)
            // md5校验失败返回false
            return false
        }
        // 如果下载超时，删除下载的文件并且重启，停止异步继续下载
        if (new Date().getTime() - startTime > timeout) {
            vf203.pwm.fail()
            common.systemBrief(`rm -rf "${downloadPath}"`)
            // 立即重启
            this.restart()
            return false
        }
        os.sleep(100)
    }
}
// 立即重启
utils.restart = function () {
    common.systemBrief("reboot -f")
}

export default utils
