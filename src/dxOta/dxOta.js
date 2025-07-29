/**
 * OTA Module
 * Features:
 * - HTTP online and local file upgrades
 * - Automatic MD5 integrity verification
 * - Pre-upgrade disk space validation
 
 * Usage:
  1. Build code into an app package. Click `Package` in VSCode DejaOS Plugin to generate a .dpk file in .temp folder.
  2. Upload the .dpk file (zip format) to a web server and get the download URL.
  3. Send the download URL and MD5 checksum to the device app.
   - Encode URL and MD5 as QR code for device scanning,
   - Or use other methods (Bluetooth, MQTT, RS485, etc.).
  4. Device downloads and verifies package integrity using MD5.
  5. Extract package to stable directory and reboot device.
  6. After reboot, DejaOS extracts package and overwrites existing code.
 * Doc/Demo: https://github.com/DejaOS/DejaOS
 */
import log from './dxLogger.js'
import com from './dxCommon.js'
import http from './dxHttpClient.js'
import * as os from 'os';

const ota = {}
ota.UPGRADE_TARGET = '/upgrades.zip'
ota.UPGRADE_TEMP = '/upgrades.temp'
ota.DF_CMD = `df -k / | awk 'NR==2 {print $4}'`
/**
 * Download upgrade package via HTTP
 * @param {string} url Required. HTTP URL for downloading the upgrade package
 * @param {string} md5 Required. MD5 hash for integrity verification (32-char lowercase hex)
 * @param {number} timeout Optional. Download timeout in seconds (default: 60)
 * @param {number} size Optional. Package size in KB for disk space validation
 * @param {Object} [httpOpts] Additional request opts
 */
ota.updateHttp = function (url, md5, timeout = 60, size, httpOpts) {
    if (!url || !md5) {
        throw new Error("'url' and 'md5' parameters are required")
    }
    if (size && (typeof size != 'number')) {
        throw new Error("'size' parameter must be a number")
    }
    // 1. Check available disk space
    checkDiskSpace(size)
    // 2. Download file to temporary directory
    com.systemBrief(`rm -rf ${ota.UPGRADE_TARGET} && rm -rf ${ota.UPGRADE_TEMP} `) // Clean up existing files
    log.info("download url:" + url)
    let downloadRet = http.download(url, ota.UPGRADE_TEMP, timeout * 1000, httpOpts)
    log.info("download result:" + JSON.stringify(downloadRet))

    let fileExist = (os.stat(ota.UPGRADE_TEMP)[1] === 0)
    if (!fileExist) {
        com.systemBrief(`rm -rf ${ota.UPGRADE_TARGET} && rm -rf ${ota.UPGRADE_TEMP} `)
        throw new Error('Download failed. Please check the URL: ' + url)
    }
    // 3. Verify MD5 checksum
    if (!verifyMD5(ota.UPGRADE_TEMP, md5)) {
        com.systemBrief(`rm -rf ${ota.UPGRADE_TARGET} && rm -rf ${ota.UPGRADE_TEMP} `)
        throw new Error('MD5 verification failed')
    }
    // 4. Move verified package to upgrade directory
    com.systemBrief(`mv ${ota.UPGRADE_TEMP} ${ota.UPGRADE_TARGET} `)
    com.systemBrief(`sync`)
}


/**
 * Upgrade from local file
 * Use this when you've already downloaded the package via custom methods.
 * @param {string} path Required. Path to the upgrade package
 * @param {string} md5 Required. MD5 hash for integrity verification (32-char lowercase hex)
 * @param {number} size Optional. Package size in KB for disk space validation
 */
ota.updateFile = function (path, md5, size) {
    if (!path || !md5) {
        throw new Error("'path' and 'md5' parameters are required")
    }
    if (size && (typeof size != 'number')) {
        throw new Error("'size' parameter must be a number")
    }
    let fileExist = (os.stat(path)[1] === 0)
    if (!fileExist) {
        throw new Error('File not found: ' + path)
    }
    // 1. Check available disk space
    checkDiskSpace(size)

    // 2. Verify MD5 checksum
    if (!verifyMD5(path, md5)) {
        throw new Error('MD5 verification failed')
    }

    // 3. Move package to upgrade directory
    com.systemBrief(`mv ${path} ${ota.UPGRADE_TARGET} `)
    com.systemBrief(`sync`)
}

function checkDiskSpace(requiredKb) {
    if (requiredKb) {
        const df = parseInt(com.systemWithRes(ota.DF_CMD, 1000))
        if (df < 3 * requiredKb) {
            throw new Error('Insufficient disk space for upgrade')
        }
    }
}

function verifyMD5(filePath, expectedMD5) {
    const hash = com.md5HashFile(filePath)
    const actualMD5 = hash.map(v => v.toString(16).padStart(2, '0')).join('')
    return actualMD5 === expectedMD5
}
/**
 * Trigger device reboot
 * Call this after successful upgrade to apply changes.
 */
ota.reboot = function () {
    com.asyncReboot(2)
}
//-------------------------DEPRECATED-------------------
ota.OTA_ROOT = '/ota'
ota.OTA_RUN = ota.OTA_ROOT + '/run.sh'

/**
 * @deprecated Use updateHttp() instead
 * Legacy upgrade method with custom script support.
 * Downloads, extracts, and executes custom upgrade scripts.
 * @param {string} url Required. HTTP URL for downloading the upgrade package
 * @param {string} md5 Required. MD5 hash for integrity verification (32-char lowercase hex)
 * @param {number} size Optional. Package size in KB for disk space validation
 * @param {string} shell Optional. Custom upgrade script content
 * @param {number} timeout Optional. Connection timeout in seconds (default: 3)
 */
ota.update = function (url, md5, size, shell, timeout = 3) {
    if (!url || !md5) {
        throw new Error("'url' and 'md5' parameters are required")
    }
    if (size && (typeof size != 'number')) {
        throw new Error("'size' parameter must be a number")
    }
    // 1. Check available disk space
    let df = parseInt(com.systemWithRes(ota.DF_CMD, 1000))
    if (size) {
        if (df < (3 * size)) { // Require 3x package size for extraction
            throw new Error('Insufficient disk space for upgrade')
        }
    }
    // 2. Download to specific directory
    const firmware = ota.OTA_ROOT + '/download.zip'
    const temp = ota.OTA_ROOT + '/temp'
    com.systemBrief(`rm -rf ${ota.OTA_ROOT} && mkdir ${ota.OTA_ROOT} `) // Clean and create directory
    let download = `wget --no-check-certificate --timeout=${timeout} -c "${url}" -O ${firmware} 2>&1`
    com.systemBrief(download, 1000)
    let fileExist = (os.stat(firmware)[1] === 0)
    let downloadRet
    if (!fileExist) {
        downloadRet = http.download(url, firmware, timeout * 1000)
    }
    fileExist = (os.stat(firmware)[1] === 0)
    if (!fileExist) {
        log.error("download result" + downloadRet)
        throw new Error('Download failed. Please check the URL: ' + url)
    }
    // 3. Verify MD5 checksum
    let md5Hash = com.md5HashFile(firmware)
    md5Hash = md5Hash.map(v => v.toString(16).padStart(2, 0)).join('')
    if (md5Hash != md5) {
        log.error("download result" + downloadRet)
        throw new Error('MD5 verification failed')
    }
    // 4. Extract package
    com.systemBrief(`mkdir ${temp} && unzip -o ${firmware} -d ${temp}`)
    // 5. Execute custom upgrade script if present
    const custom_update = temp + '/custom_update.sh'
    if (os.stat(custom_update)[1] === 0) {
        com.systemBrief(`chmod +x ${custom_update}`)
        com.systemWithRes(`${custom_update}`)
    }
    // 6. Create upgrade script
    if (!shell) {
        // Default: copy files and clean up
        shell = `cp -r ${temp}/* /app/code \n rm -rf ${ota.OTA_ROOT}`
    }

    com.systemBrief(`echo "${shell}" > ${ota.OTA_RUN} && chmod +x ${ota.OTA_RUN}`)
    fileExist = (os.stat(ota.OTA_RUN)[1] === 0)
    if (!fileExist) {
        throw new Error('Failed to create upgrade script')
    }
    com.systemWithRes(`${ota.OTA_RUN}`)
}

/**
 * @deprecated Use updateHttp() instead
 * Legacy resource upgrade for tar.xz packages.
 * Specialized for upgrading resource files only.
 * @param {string} url Required. HTTP URL for downloading the upgrade package
 * @param {string} md5 Required. MD5 hash for integrity verification (32-char lowercase hex)
 * @param {number} size Optional. Package size in KB for disk space validation
 * @param {string} shell Optional. Custom upgrade script content
 * @param {number} timeout Optional. Connection timeout in seconds (default: 3)
 */
ota.updateResource = function (url, md5, size, shell, timeout = 3) {
    if (!url || !md5) {
        throw new Error("'url' and 'md5' parameters are required")
    }
    if (size && (typeof size != 'number')) {
        throw new Error("'size' parameter must be a number")
    }
    // 1. Check available disk space
    let df = parseInt(com.systemWithRes(ota.DF_CMD, 1000))
    if (size) {
        if (df < (3 * size)) { // Require 3x package size for extraction
            throw new Error('Insufficient disk space for upgrade')
        }
    }
    // 2. Download to specific directory
    const firmware = ota.OTA_ROOT + '/download.tar.xz'
    const temp = ota.OTA_ROOT + '/temp'
    com.systemBrief(`rm -rf ${ota.OTA_ROOT} && mkdir ${ota.OTA_ROOT} `) // Clean and create directory
    let download = `wget --no-check-certificate --timeout=${timeout} -c "${url}" -O ${firmware} 2>&1`
    com.systemBrief(download, 1000)
    let fileExist = (os.stat(firmware)[1] === 0)
    if (!fileExist) {
        http.download(url, firmware, timeout * 1000)
    }
    fileExist = (os.stat(firmware)[1] === 0)
    if (!fileExist) {
        throw new Error('Download failed. Please check the URL: ' + url)
    }

    // 3. Verify MD5 checksum
    let md5Hash = com.md5HashFile(firmware)
    md5Hash = md5Hash.map(v => v.toString(16).padStart(2, 0)).join('')
    if (md5Hash != md5) {
        throw new Error('MD5 verification failed')
    }
    // 4. Extract tar.xz package
    com.systemBrief(`mkdir ${temp} && tar -xJvf ${firmware} -C ${temp}`)
    // 5. Create resource upgrade script
    if (!shell) {
        shell = `
        source=${temp}/vgapp/res/image/bk.png
        target=/app/code/resource/image/bg.png
        if test -e "\\$source"; then
            cp "\\$source" "\\$target"
        fi
        source=${temp}/vgapp/res/image/bk_90.png
        target=/app/code/resource/image/bg_90.png
        if test -e "\\$source"; then
            cp "\\$source" "\\$target"
        fi
        source=${temp}/vgapp/res/font/AlibabaPuHuiTi-2-65-Medium.ttf
        target=/app/code/resource/font.ttf
        if test -e "\\$source"; then
            cp "\\$source" "\\$target"
        fi
        source=${temp}/vgapp/wav/*.wav
        target=/app/code/resource/wav/
        cp "\\$source" "\\$target"
        rm -rf ${ota.OTA_ROOT}
        `
    }

    com.systemBrief(`echo "${shell}" > ${ota.OTA_RUN} && chmod +x ${ota.OTA_RUN}`)
    fileExist = (os.stat(ota.OTA_RUN)[1] === 0)
    if (!fileExist) {
        throw new Error('Failed to create upgrade script')
    }
    com.systemWithRes(`${ota.OTA_RUN}`)
}

export default ota