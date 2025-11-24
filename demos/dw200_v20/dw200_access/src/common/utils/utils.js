import common from '../../../dxmodules/dxCommon.js'
import std from '../../../dxmodules/dxStd.js'
import config from '../../../dxmodules/dxConfig.js'
import driver from '../../driver.js'
const utils = {}

// Generate random string of specified length with letters and numbers combination
utils.genRandomStr = function (length) {
    let serialNo = config.get("sysInfo.serialNo") || 0
    if (serialNo == 100) {
        serialNo = 0
    }
    let result = "serialNo" + serialNo
    config.set("sysInfo.serialNo", serialNo + 1)
    // const charset = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    // let result = '';

    // for (let i = 0; i < length; i++) {
    //     const randomIndex = Math.floor(Math.random() * charset.length);
    //     result += charset.charAt(randomIndex);
    // }

    return result;
}

// Get URL file download size (in bytes)
utils.getUrlFileSize = function (url) {
    let actualSize = common.systemWithRes(`wget --spider -S ${url} 2>&1 | grep 'Length' | awk '{print $2}'`, 100).match(/\d+/g)
    return actualSize ? parseInt(actualSize) : 0
}

// Volume percentage conversion
utils.getVolume1 = function (volume1) {
    return 60 * (volume1 / 100)
}

// Check if it's ""/null/undefined
utils.isEmpty = function (str) {
    return (str === "" || str === null || str === undefined)
}

/**
 * Parse string to JSON, note that value cannot contain " character
 * @param {*} inputString 
 * @returns 
 */
utils.parseString = function (inputString) {
    // Get {} and content between them
    inputString = inputString.slice(inputString.indexOf("{"), inputString.lastIndexOf("}") + 1)
    // key=value regex, key is \w+ (alphanumeric underscore, case sensitive), = can have spaces on both sides, value is \w+ or content between two adjacent " (including ")
    const keyValueRegex = /(\w+)\s*=\s*("[^"]*"|\w+)/g;
    let jsonObject = {};
    let match;
    while ((match = keyValueRegex.exec(inputString)) !== null) {
        let key = match[1];
        let value = match[2]

        if (/^\d+$/.test(value)) {
            // Number
            value = parseInt(value)
        } else if (/^\d+\.\d+$/.test(value)) {
            // Decimal
            value = parseFloat(value)
        } else if (value == 'true') {
            value = true
        } else if (value == 'false') {
            value = false
        } else {
            // String
            value = value.replace(/"/g, '').trim()
        }
        jsonObject[key] = value;
    }
    return jsonObject;
}

/**
 * Wait for download result, note that timeout should not exceed watchdog time, otherwise slow download will cause restart
 * @param {*} update_addr Download address
 * @param {*} downloadPath Storage path
 * @param {*} timeout Timeout
 * @param {*} update_md5 MD5 verification
 * @param {*} fileSize File size
 * @returns Download result
 */
utils.waitDownload = function (update_addr, downloadPath, timeout, update_md5, fileSize) {
    // Delete original file
    common.systemBrief(`rm -rf "${downloadPath}"`)
    if (fileSize == 0) {
        return false
    }
    // Asynchronous download
    common.systemBrief(`wget -c "${update_addr}" -O "${downloadPath}" &`)
    let startTime = new Date().getTime()
    while (true) {
        // Calculate downloaded file size
        let size = parseInt(common.systemWithRes(`file="${downloadPath}"; [ -e "$file" ] && wc -c "$file" | awk '{print $1}' || echo "0"`, 100).split(/\s/g)[0])
        // If equal, download successful
        if (size == fileSize) {
            let ret = common.md5HashFile(downloadPath)
            if (ret) {
                let md5 = ret.map(v => v.toString(16).padStart(2, '0')).join('')
                if (md5 == update_md5) {
                    // MD5 verification successful return true
                    return true
                }
            }
            common.systemBrief(`rm -rf "${downloadPath}"`)
            // MD5 verification failed return false
            return false
        }
        // If download timeout, delete downloaded file and restart, stop asynchronous download
        if (new Date().getTime() - startTime > timeout) {
            driver.pwm.fail()
            common.systemBrief(`rm -rf "${downloadPath}"`)
            common.asyncReboot(3)
            return false
        }
        std.sleep(100)
    }
}

utils.formatUnixTimestamp = function (timestamp) {
    let padZero = (v) => {
        // Double digit zero padding
        return v.toString(10).padStart(2, '0')
    }
    const date = new Date(timestamp * 1000);
    const year = date.getFullYear().toString();
    const month = padZero(date.getMonth() + 1);
    const day = padZero(date.getDate());
    const hours = padZero(date.getHours());
    const minutes = padZero(date.getMinutes());
    const seconds = padZero(date.getSeconds());
    return `${month}${day}${hours}${minutes}${year}`;
}

const daysOfWeekEn = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const daysOfWeekCh = ["周日", "周一", "周二", "周三", "周四", "周五", "周六"];
const monthsOfYearEn = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]
const monthsOfYearCh = ["一月", "二月", "三月", "四月", "五月", "六月", "七月", "八月", "九月", "十月", "十一月", "十二月"]
// Get formatted time
utils.getDateTime = function () {
    let t = new Date();
    let addZero = (v) => {
        // Double digit zero padding
        return v.toString(10).padStart(2, '0')
    }
    return {
        year: t.getFullYear(),// Year, e.g.: 2024
        month: addZero(t.getMonth() + 1), // Month starts from 0, so add 1
        monthTextCh: monthsOfYearCh[t.getMonth()],
        monthTextEn: monthsOfYearEn[t.getMonth()],
        day: addZero(t.getDate()), // Get date
        hours: addZero(t.getHours()),// Get hour
        minutes: addZero(t.getMinutes()),// Get minute
        seconds: addZero(t.getSeconds()),// Get second
        dayTextCh: daysOfWeekCh[t.getDay()],// Weekday (Chinese)
        dayTextEn: daysOfWeekEn[t.getDay()],// Weekday (English)
    }
}

utils.convertTo12HourFormat = function (hours, minutes) {
    let ampm = hours >= 12 ? 'PM' : 'AM'
    hours = hours % 12
    hours = hours ? hours : 12 // Convert 0 hour to 12 hour
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')} ${ampm}`
}

export default utils
