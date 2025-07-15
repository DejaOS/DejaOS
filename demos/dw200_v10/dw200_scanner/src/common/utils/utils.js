import common from '../../../dxmodules/dxCommon.js'
import std from '../../../dxmodules/dxStd.js'
const utils = {}

// 判断是否为null/undefined
utils.isEmpty = function (value) {
    return (value === null || value === undefined)
}
//音量百分比转换
utils.getVolume1 = function (volume1) {
    return 60 * (volume1 / 100)
}
//16 进制小端 转 10 进制
utils.hexLEToTimestamp = function (hexLE) {
    // 反转字符串，恢复原始顺序
    var hexString = '';
    for (var i = hexLE.length - 2; i >= 0; i -= 2) {
        hexString += hexLE.substr(i, 2);
    }

    // 如果 hexString 的长度不是偶数，则在前面添加一个 0，以确保每个字节有两个字符
    if (hexString.length % 2 !== 0) {
        hexString = '0' + hexString;
    }

    // 将十六进制字符串转换为时间戳
    var timestamp = parseInt(hexString, 16);

    return timestamp;
}

//10进制转 16 进制小端
utils.timestampToHexLE = function (timestamp, length) {
    // 将时间戳转换为十六进制字符串
    var hexString = timestamp.toString(16);

    // 如果 hexString 的长度不是偶数，则在前面添加一个 0，以确保每个字节有两个字符
    if (hexString.length % 2 !== 0) {
        hexString = '0' + hexString;
    }

    // 反转字符串，以实现小端模式
    var reversedHexString = '';
    for (var i = hexString.length - 2; i >= 0; i -= 2) {
        reversedHexString += hexString.substr(i, 2);
    }

    // 如果十六进制字符串长度不足8位，则在后面补0
    while (reversedHexString.length < length) {
        reversedHexString += '0';
    }

    return reversedHexString;
}

//json 转微光格式{key=1}
utils.jsonObjectToString = function (obj) {
    if (typeof obj !== 'object' || obj === null || Array.isArray(obj)) {
        throw new Error('Input must be a valid JSON object.');
    }

    const entries = Object.entries(obj);
    const keyValuePairs = entries.map(([key, value]) => {
        let formattedValue;
        if (typeof value === 'string') {
            formattedValue = `"${value}"`; // 字符串类型需要加双引号
        } else if (typeof value === 'number') {
            formattedValue = value.toString(); // 数字直接转为字符串
        } else {
            throw new Error('Unsupported value type. Only strings and numbers are supported.');
        }
        return `${key}=${formattedValue}`;
    });

    return `{${keyValuePairs.join(',')}}`;
}

utils.decimalToLittleEndian = function (dec) {
    // 将十进制数转换为十六进制字符串
    let hexString = dec.toString(16);

    // 如果十六进制字符串长度为奇数，则在前面补零
    if (hexString.length % 2 !== 0) {
        hexString = '0' + hexString;
    }

    // 将十六进制字符串按每两个字符一组分割，然后按照小端格式逆序排列
    let littleEndianHexString = hexString.match(/.{1,2}/g).reverse().join('');

    return littleEndianHexString;
}

/**
 * 解析字符串改为 json，注意value内不能有"号
 * @param {*} inputString 
 * @returns 
 */
utils.parseString = function (inputString) {
    // 获取{}及其之间的内容
    inputString = inputString.slice(inputString.indexOf("{"), inputString.lastIndexOf("}") + 1)
    // key=value正则，key是\w+（字母数字下划线，区别大小写），=两边可有空格，value是\w+或相邻两个"之间的内容（包含"）
    const keyValueRegex = /(\w+)\s*=\s*("[^"]*"|-?\d+(\.\d+)?|\w+)/g;
    let jsonObject = {};
    let match;
    while ((match = keyValueRegex.exec(inputString)) !== null) {
        let key = match[1];
        let value = match[2]

        if (/^-?\d+$/.test(value)) {
            // 整数（支持负数）
            value = parseInt(value)
        } else if (/^-?\d+\.\d+$/.test(value)) {
            // 小数（支持负数）
            value = parseFloat(value)
        } else if (value == 'true') {
            value = true
        } else if (value == 'false') {
            value = false
        } else {
            // 字符串
            value = value.replace(/"/g, '')
        }
        jsonObject[key] = value;
    }
    return jsonObject;
}
utils.formatUnixTimestamp = function (timestamp) {
    const date = new Date(timestamp);
    const year = date.getFullYear().toString();
    const month = padZero(date.getMonth() + 1);
    const day = padZero(date.getDate());
    const hours = padZero(date.getHours());
    const minutes = padZero(date.getMinutes());
    const seconds = padZero(date.getSeconds());
    return `${month}${day}${hours}${minutes}${year}`;
}

function padZero(number) {
    return number < 10 ? '0' + number : number.toString();
}
// 获取url文件下载大小（字节数）
utils.getUrlFileSize = function (url) {
    let actualSize = common.systemWithRes(`wget --spider -S ${url} 2>&1 | grep 'Length' | awk '{print $2}'`, 100).match(/\d+/g)
    return actualSize ? parseInt(actualSize) : 0
}

/**
 * 等待下载结果，注意超时时间不得超过喂狗时间，否则下载慢会重启
 * @param {*} update_addr 下载地址
 * @param {*} downloadPath 存储路径
 * @param {*} timeout 超时
 * @param {*} update_md5 md5校验
 * @param {*} fileSize 文件大小
 * @returns 下载结果
 */
utils.waitDownload = function (update_addr, downloadPath, timeout, update_md5, fileSize) {
    // 删除原文件
    common.systemBrief(`rm -rf "${downloadPath}"`)
    if (fileSize == 0) {
        return false
    }
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
            driver.pwm.fail()
            common.systemBrief(`rm -rf "${downloadPath}"`)
            common.asyncReboot(3)
            return false
        }
        std.sleep(100)
    }
}

const daysOfWeekEn = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const daysOfWeekCh = ["周日", "周一", "周二", "周三", "周四", "周五", "周六"];
const monthsOfYearEn = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]
const monthsOfYearCh = ["一月", "二月", "三月", "四月", "五月", "六月", "七月", "八月", "九月", "十月", "十一月", "十二月"]
// 获取格式化时间
utils.getDateTime = function () {
    let t = new Date();
    let addZero = (v) => {
        // 双位补0
        return v.toString(10).padStart(2, '0')
    }
    return {
        year: t.getFullYear(),//年，如：2024
        month: addZero(t.getMonth() + 1), // 月份从0开始，所以要加1
        monthTextCh: monthsOfYearCh[t.getMonth()],
        monthTextEn: monthsOfYearEn[t.getMonth()],
        day: addZero(t.getDate()), // 获取日期
        hours: addZero(t.getHours()),// 获取小时
        minutes: addZero(t.getMinutes()),// 获取分钟
        seconds: addZero(t.getSeconds()),// 获取秒
        dayTextCh: daysOfWeekCh[t.getDay()],//星期(中文)
        dayTextEn: daysOfWeekEn[t.getDay()],//星期(英文)
    }
}

export default utils
