import * as os from "os"
import common from '../../../dxmodules/dxCommon.js'
import dxos from "../../../dxmodules/dxOs.js"
import logger from "../../../dxmodules/dxLogger.js"
const utils = {}

// 获取url文件下载大小（字节数）
utils.getUrlFileSize = function (url) {
    let actualSize = dxos.systemWithRes(`wget --spider -S ${url} 2>&1 | grep 'Length' | awk '{print $2}'`, 100).match(/\d+/g)
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
    const keyValueRegex = /(\w+)\s*=\s*("[^"]*"|[+-]?\d+(?:\.\d+)?|\w+)/g;
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
    dxos.systemBrief(`rm -rf "${downloadPath}"`)
    // 异步下载
    dxos.systemBrief(`wget -c "${update_addr}" -O "${downloadPath}" &`)
    let startTime = new Date().getTime()
    while (true) {
        // 计算已下载的文件大小
        let size = parseInt(dxos.systemWithRes(`file="${downloadPath}"; [ -e "$file" ] && wc -c "$file" | awk '{print $1}' || echo "0"`, 100).split(/\s/g)[0])
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
            dxos.systemBrief(`rm -rf "${downloadPath}"`)
            // md5校验失败返回false
            return false
        }
        // 如果下载超时，删除下载的文件并且重启，停止异步继续下载
        if (new Date().getTime() - startTime > timeout) {
            vf203.pwm.fail()
            dxos.systemBrief(`rm -rf "${downloadPath}"`)
            // 立即重启
            this.restart()
            return false
        }
        os.sleep(100)
    }
}
// 立即重启
utils.restart = function () {
    dxos.systemBrief("reboot -f")
}

utils.formatUnixTimestamp = function (timestamp) {
    let padZero = (v) => {
        // 双位补0
        return v.toString(10).padStart(2, '0')
    }
    const date = new Date(timestamp * 1000);
    const year = date.getFullYear().toString();
    const month = padZero(date.getMonth() + 1);
    const day = padZero(date.getDate());
    const hours = padZero(date.getHours());
    const minutes = padZero(date.getMinutes());
    const seconds = padZero(date.getSeconds());
    return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
}

/**
 * 校验字符串是否为合法的域名（不支持 IP 地址）
 * 规则：
 * - 总长度 <= 253 字符
 * - 每个标签（点分隔的部分）长度 1~63 字符
 * - 允许字符：字母 a-z、数字 0-9、连字符 -
 * - 连字符不能位于标签的开头或结尾
 * - 顶级域（TLD）必须为纯字母（至少两个字符）
 * - 支持多级子域名
 *
 * @param {string} domain - 待校验的域名
 * @returns {boolean} - 是否为合法域名
 */
utils.isValidDomain = function (domain) {
    // 1. 基本类型检查
    if (typeof domain !== 'string') return false;
    if (domain.length === 0 || domain.length > 253) return false;

    // 2. 不能以点开头或结尾
    if (domain.startsWith('.') || domain.endsWith('.')) return false;

    // 3. 分割为标签
    const labels = domain.split('.');
    if (labels.length < 2) return false; // 至少需要一个二级域名和一个 TLD

    // 4. 逐个标签校验
    for (let i = 0; i < labels.length; i++) {
        const label = labels[i];
        if (label.length === 0 || label.length > 63) return false;

        // 标签首尾不能是连字符
        if (label.startsWith('-') || label.endsWith('-')) return false;

        // 标签只能包含字母、数字、连字符
        if (!/^[a-zA-Z0-9-]+$/.test(label)) return false;
    }

    // 5. 顶级域（最后一个标签）必须全部是字母（至少两个字符）
    const tld = labels[labels.length - 1];
    if (tld.length < 2) return false;
    if (!/^[a-zA-Z]{2,}$/.test(tld)) return false;

    return true;
}

export default utils
