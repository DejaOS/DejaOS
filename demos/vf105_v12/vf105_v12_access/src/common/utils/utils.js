import * as os from "os"
import common from '../../../dxmodules/dxCommon.js'
import logger from "../../../dxmodules/dxLogger.js"
const utils = {}

// Get URL file download size (bytes)
utils.getUrlFileSize = function (url) {
    let actualSize = common.systemWithRes(`wget --spider -S ${url} 2>&1 | grep 'Length' | awk '{print $2}'`, 100).match(/\d+/g)
    return actualSize ? parseInt(actualSize) : 0
}
// Check if it's ""/null/undefined
utils.isEmpty = function (str) {
    return (str === "" || str === null || str === undefined)
}
/**
 * Parse string to JSON, note that value cannot contain " character
 * @param {string} inputString 
 * @returns 
 */
utils.parseString = function (inputString) {
    // Get {} and content between them
    inputString = inputString.slice(inputString.indexOf("{"), inputString.lastIndexOf("}") + 1)
    // key=value regex, key is \w+ (letters, numbers, underscores, case-sensitive), spaces allowed on both sides of =, value is \w+ or content between two adjacent " (including ")
    const keyValueRegex = /(\w+)\s*=\s*("[^"]*"|\w+(\.\w+)?)/g;
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
 * @param {string} update_addr Download address
 * @param {string} downloadPath Storage path
 * @param {number} timeout Timeout
 * @param {string} update_md5 MD5 verification
 * @param {number} fileSize File size
 * @returns Download result (bool)
 */
utils.waitDownload = function (update_addr, downloadPath, timeout, update_md5, fileSize) {
    // Delete original file
    common.systemBrief(`rm -rf "${downloadPath}"`)
    // Async download
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
                    // MD5 verification successful, return true
                    return true
                }
            }
            common.systemBrief(`rm -rf "${downloadPath}"`)
            // MD5 verification failed, return false
            return false
        }
        // If download timeout, delete downloaded file and restart, stop async download
        if (new Date().getTime() - startTime > timeout) {
            vf203.pwm.fail()
            common.systemBrief(`rm -rf "${downloadPath}"`)
            // Immediately restart
            this.restart()
            return false
        }
        os.sleep(100)
    }
}
// Immediately restart
utils.restart = function () {
    common.systemBrief("reboot -f")
}

export default utils
