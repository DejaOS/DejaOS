import std from '../../dxmodules/dxStd.js'
import driver from '../driver.js'
import dxFingerZaz from '../../dxmodules/dxFingerZaz.js'
const mergeService = {}
function chaoshi(timeoutMs = 10000, intervalMs = 300) {
    let ret = false
    let startTime = new Date().getTime();
    while (true) {
        let res=dxFingerZaz.fingerDetect()
        if (res== 0) {
            ret = true
            break;
        }
        // Check if timeout
        if (new Date().getTime() - startTime >= timeoutMs) {
            break;
        }
        std.sleep(intervalMs);
       
    }
    return ret;
}

mergeService.merge = function () {

    driver.screen.popWin("Please press your finger")
    let keyId = dxFingerZaz.getEmptyId(1, 5000)
    let ret
    if (waitForImage()) {
        ret = dxFingerZaz.generate(0)
        if (ret) {

            driver.screen.popWin("The first successful\nPlease press it again")
        } else {
            driver.screen.popWin("generate failed")
            return
        }
    } else {
        driver.screen.popWin("get image failed")
        return
    }
    
    if (!chaoshi()) {
        driver.screen.popWin("5 seconds timeout, please try again")
        return
    }

    if (waitForImage()) {
        ret = dxFingerZaz.generate(1)
        if (ret) {
            driver.screen.popWin("The second successful\nPlease press it again")
        } else {
            driver.screen.popWin("generate failed")
        }
    } else {
        driver.screen.popWin("get image failed")
    }
    if (!chaoshi()) {
        driver.screen.popWin("5 seconds timeout, please try again")
        return
    }
    if (waitForImage()) {
        ret = dxFingerZaz.generate(2)
        if (ret) {
            driver.screen.popWin("The entry is complete and registration is underway")
        } else {
            driver.screen.popWin("generate failed")
        }
    } else {
        driver.screen.popWin("get image failed")
    }

    ret = dxFingerZaz.merge(3, 0)
    if (ret) {
        driver.screen.popWin("merge success")
    } else {
        driver.screen.popWin("merge failed")
    }

    if (ret) {
        ret = dxFingerZaz.storeChar(keyId, 0)
        driver.screen.popWin("registered finger success\nkeyId: " + keyId)
    } else {
        driver.screen.popWin("registered finger failed")
    }
}


/**
 * Wait for getImage to succeed or timeout
 * @param {number} timeoutMs Timeout in milliseconds
 * @param {number} intervalMs Interval between attempts in milliseconds
 * @returns {boolean} Returns true on success, false on timeout or failure
 */
function waitForImage(timeoutMs = 10000, intervalMs = 100) {
    const startTime = new Date().getTime();
    let ret = false;

    while (true) {
        ret = dxFingerZaz.getImage();
        if (ret) {
            break;
        }

        // Check if timeout
        if (new Date().getTime() - startTime >= timeoutMs) {
            break;
        }

        std.sleep(intervalMs);
    }
    return ret;
}
export default mergeService
