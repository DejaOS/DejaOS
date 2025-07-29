/**
 * Common Module
 * Features:
 * - common.sys     System related methods
 * - common.algo    Algorithm encryption and decryption related methods
 * - common.utils   General tool methods
 * 
 * Usage:
 * - System operation, encryption and decryption operations
 * 
 * Doc/Demo : https://github.com/DejaOS/DejaOS
 */
import { commonClass } from './libvbar-m-dxcommon.so'
import dxMap from './dxMap.js'
import * as std from 'std';
import * as os from "os"

let commonObj = null
const common = {}


/**
 * Common is divided into three major modules
 * Common.sys module - System Information and Command Execution
 *                  Purpose: To provide interfaces for system resource monitoring, command execution, and device status management.
 * Common.algo module - Encryption and Encoding Algorithms
 *                  Purpose: To implement operations such as symmetric encryption, hashing, KBC, Base64, and file conversion.
 * Common.utils module - Data Conversion and Utility Tools
 *                  Purpose: Provide conversion functions between hexadecimal, encoding, byte arrays, and structured data.
 * Attention: Try not to directly call methods under common. Please use the latest comm.module.xxx, as the old methods below will gradually be phased out
 */
// System related functional modules
common.sys = {
    getUptime : common.getUptime,
    getTotalmem : common.getTotalmem,
    getFreemem : common.getFreemem,
    getTotaldisk : common.getTotaldisk,
    getFreedisk : common.getFreedisk,
    getCpuid : common.getCpuid,
    getUuid : common.getUuid,
    getSn : common.getSn,
    getUuid2mac : common.getUuid2mac,
    getFreecpu : common.getFreecpu,
    execute: function (cmd, options) {
		if (options.brief) {
			return common.systemBrief(cmd)
		}else if(options.withRes){
            return common.systemWithRes(cmd)
        }else if(options.blocked){
            return common.systemBlocked(cmd)
        }else{
            return common.system(cmd)
        }
	},
    asyncReboot : common.asyncReboot,
    sync : common.sync,
    setMode : common.setMode,
    getMode : common.getMode,
    handleId : common.handleId,
}

// Encryption, decryption, and algorithm related modules
common.algo = {
    aes : {
        ecbEncrypt : common.aes128EcbEncrypt,
        ecbDecrypt : common.aes128EcbDecrypt,
        ecbPkcs5Encode : common.aes128EcbPkcs5PaddingEncode,
        ecbPkcs5Decode : common.aesEcb128Pkcs5PaddingDecode,
        ecbPkcs5Encrypt : common.aes128EcbPkcs5PaddingEncrypt,
        ecbPkcs5Decrypt : common.aes128EcbPkcs5PaddingDecrypt,
    },
    calculateBcc : common.calculateBcc,
    md5: function(option){
        if(option.isHashFile){
            return common.md5HashFile(option.filePath)
        }else{
            return common.md5Hash(option.arr)
        }
    },
    hmac: function(option){
        if(option.md5Hash){
            return common.hmacMd5Hash(option.data, option.key);
        }else if(option.md5HashFile){
            return common.hmacMd5HashFile(option.filePath, option.key);
        }else{
            return common.hmac(option.data, option.key);
        }
    },
    base64ToBinfile : common.base64_2binfile,
    binfileToBase64 : common.binfile_2base64,
}

// Tool function module
common.utils = {
    arrayBufferRsaDecrypt : common.arrayBufferRsaDecrypt,
    hexToArr : common.hexToArr,
    arrToHex : common.arrToHex,
    hexToString : common.hexToString,
    strToUtf8Hex : common.strToUtf8Hex,
    utf8HexToStr : common.utf8HexToStr,
    stringToHex : common.stringToHex,
    littleEndianToDecimal : common.littleEndianToDecimal,
    decimalToLittleEndianHex : common.decimalToLittleEndianHex,
    hexStringToArrayBuffer : common.hexStringToArrayBuffer,
    hexStringToUint8Array : common.hexStringToUint8Array,
    arrayBufferToHexString : common.arrayBufferToHexString,
    uint8ArrayToHexString : common.uint8ArrayToHexString,
}

/**
 * Initialize the common module
 */
function init() {
    if (!commonObj)
        commonObj = new commonClass();
}
init();

/**
 * Get the running time of system startup (in seconds)
 * @returns {number} Running time
 */
common.getUptime = function () {
    return commonObj.getUptime();
}

/**
 * Get the total memory of the system (in bytes)
 * @returns {number} Total memory
 */
common.getTotalmem = function () {
    return commonObj.getTotalmem();
}

/**
 * Retrieve the remaining memory of the system (in bytes)
 * @returns {number} Remaining memory
 */
common.getFreemem = function () {
    return commonObj.getFreemem();
}

/**
 * The principle of converting asynchronous to synchronous is as follows: 
 * the `request` function periodically checks a designated variable in memory for a value. 
 * If the value is found within the timeout period, the result is returned; otherwise, 
 * it is considered a timeout. The `response` function is responsible for storing the result
 *  in the designated variable once the asynchronous request is completed.
 */
common.sync = {
    // 异步转同步小实现
    request: function (topic, timeout) {
        let map = dxMap.get("SYNC");
        map.put(topic + "__request__", topic);
        let count = 0;
        let data = map.get(topic);
        while (utils.isEmpty(data) && count * 10 < timeout) {
            data = map.get(topic);
            std.sleep(10);
            count += 1;
        }
        let res = map.get(topic);
        map.del(topic);
        map.del(topic + "__request__");
        return res;
    },
    response: function (topic, data) {
        let map = dxMap.get("SYNC");
        if (map.get(topic + "__request__") == topic) {
            map.put(topic, data);
        }
    },
};

/**
 * Get the total number of available disks in the system (in bytes)
 * @param {string} path Different disk partition names (not directory names), not mandatory, default is'/'
 * @returns {number} Total number of available disks
 */
common.getTotaldisk = function (path) {
    return commonObj.getTotaldisk(!path ? "/" : path);
}

/**
 * Retrieve the remaining available amount of system disk (in bytes)
 * @param {string} path Different disk partition names (not directory names), not mandatory, default is'/'
 * @returns {number} Total number of available disks
 */
common.getFreedisk = function (path) {
    return commonObj.getFreedisk(!path ? "/" : path);
}

/**
 * Get CPU ID
 * @returns {string} CPU ID
 */
common.getCpuid = function () {
    return commonObj.getCpuid(33);
}

/**
 * Get device uuid
 * @returns {string} Device UUID
 */
common.getUuid = function () {
    return commonObj.getUuid(19);
}

/**
 * Obtain the unique identifier of the device
 * @returns {string} unique identifier of the device
 */
common.getSn = function () {
    let sn = std.loadFile('/etc/.sn')
    if (sn) {
        return sn
    } else {
        return commonObj.getUuid(19);
    }
}

/**
 * Obtain the MAC address calculated through UUID, which can be used to initialize the network card
 * @returns {string} Similar format：b2:a1:63:3f:99:b6
 */
common.getUuid2mac = function () {
    return commonObj.getUuid2mac(19);
}

/**
 * Get CPU usage rate
 * @returns {number} a number not greater than 100
 */
common.getFreecpu = function () {
    return commonObj.getFreecpu();
}

/**
 * RSA decryption (private key encryption public key decryption)
 * @param {ArrayBuffer} data The data to be decrypted is required
 * @param {string} publicKey Public key, required
 * @returns {number} 0 success; other failed
 */
common.arrayBufferRsaDecrypt = function (data, publicKey) {
    if (data === undefined || data === null) {
        throw new Error("dxCommon.arrayBufferRsaDecrypt:'data' parameter should not be null or empty")
    }
    if (publicKey === undefined || publicKey === null || publicKey.length < 1) {
        throw new Error("dxCommon.arrayBufferRsaDecrypt:'publicKey' parameter should not be null or empty")
    }
    return commonObj.arrayBufferRsaDecrypt(data, publicKey)
}

/**
 * @brief  Aes128Ecb encryption
 * @param {array} input Clear text array
 * @param {array} key Secret key
 * @returns {array} Ciphertext array
 */
common.aes128EcbEncrypt = function (input, key) {
    return commonObj.aes128EcbEncrypt(input, key)
}
/**
 * @brief  Aes128Ecb decrypt
 * @param {array} input Ciphertext array
 * @param {array} key Secret key
 * @returns {array} Clear text array
 */
common.aes128EcbDecrypt = function (input, key) {
    return commonObj.aes128EcbDecrypt(input, key)
}

/**
 * Arranguffer ECB 128 bit Pkcs5Padding AES encryption
 * @param {ArrayBuffer} input Plaintext
 * @param {ArrayBuffer} key Secret key
 * @returns {ArrayBuffer} Ciphertext array
*/
common.aes128EcbPkcs5PaddingEncode = function (input, key) {
    return commonObj.aes128Pkcs7PaddingEncode(input, key)
}

/**
 * Arranguffer ECB 128 bit Pkcs5Padding AES decrypt
 * @param {ArrayBuffer} input Ciphertext array
 * @param {ArrayBuffer} key Secret key
 * @returns {ArrayBuffer} Plaintext
 */
common.aesEcb128Pkcs5PaddingDecode = function (input, key) {
    return commonObj.aes128Pkcs7PaddingDecode(input, key)
}

/**
 * AES ECB Pkcs5Padding 128 encryption
 * example：common.aes128EcbPkcs5PaddingEncrypt("stamp=202008文&tic", "1234567890123456")
 * result：ef7c3cff9df57b3bcb0951938c574f969e13ffdcc1eadad298ddbd1fb1a4d2f7
 * refer to https://www.devglan.com/online-tools/aes-encryption-decryption
 * @param {string} input  Plaintext(string)
 * @param {string} key    Secret key(16 byte string)
 * @return {string} Ciphertext
 */
common.aes128EcbPkcs5PaddingEncrypt = function (input, key) {
    let data = common.hexStringToArrayBuffer(common.strToUtf8Hex(input))
    key = common.hexStringToArrayBuffer(common.strToUtf8Hex(key))
    // encryption
    let hex = common.arrayBufferToHexString(common.aes128EcbPkcs5PaddingEncode(data, key))
    return hex
}
/**
   * AES ECB Pkcs5Padding 128 decrypt
   * @param {string} input Ciphertext(16 byte string)
   * @param {string} key   Secret key(16 byte string)
   * @return Plaintext(string)
   */
common.aes128EcbPkcs5PaddingDecrypt = function (input, key) {
    key = common.hexStringToArrayBuffer(common.strToUtf8Hex(key))
    let res = common.aesEcb128Pkcs5PaddingDecode(common.hexStringToArrayBuffer(input), key)
    return common.utf8HexToStr(common.arrayBufferToHexString(res))
}

/**
 * Execute commands of the operating system
 * @param {string} cmd Common operating system instructions (supported by the vast majority of Linux instructions)
 * @returns 
 */
common.system = function (cmd) {
    return commonObj.system(cmd)
}

/**
 * Execute commands of the operating system(will output the execution result to the terminal)
 * @param {string} cmd Common operating system instructions (supported by the vast majority of Linux instructions)
 * @returns 
 */
common.systemBrief = function (cmd) {
    return commonObj.systemBrief(cmd)
}

/**
 * Execute command-line commands (will return the execution result to JS)
 * @param {string} cmd Common operating system instructions (supported by the vast majority of Linux instructions)
 * @param {number} resLen The length of the received data is sometimes very large, and this value can be used to return fixed length data
 * @returns {string}
 */
common.systemWithRes = function (cmd, resLen) {
    return commonObj.systemWithRes(cmd, resLen)
}

/**
 * Block execution of operating system commands
 * @param {string} cmd Common operating system instructions (supported by the vast majority of Linux instructions)
 * @returns {number} result
 */
common.systemBlocked = function (cmd) {
    return commonObj.systemBlocked(cmd)
}

/**
 * Asynchronous delayed restart (non blocking execution of sync sleep reboot)
 * @param {number} delay_s Asynchronous Delay Time (seconds)
 * @returns {number} result
 */
common.asyncReboot = function (delay_s) {
    return commonObj.asyncReboot(delay_s)
}

/**
 * BCC verification
 * @param {array} data eg:[49,50,51,52,53,54] The corresponding value is 7
 * @returns {number} result
 */
common.calculateBcc = function (data) {
    return commonObj.calculateBcc(data)
}

/**
 * Calculate MD5 hash, for example, the number array corresponding to '123456' is [49,50,51,52,53,54], and the corresponding md5 is' e10adc3949ba59abbe56e057f20f883e ',
 * But the returned string is not a hexadecimal string, it is an array of numbers, which can be converted using the arrToHex function
 * @param {array} arr Numeric array 
 * @returns {array} Numeric array
 */
common.md5Hash = function (arr) {
    return commonObj.md5Hash(arr)
}

/**
 * Calculate the MD5 hash of a file, for example, if the content of the file is' 123456 ', the corresponding MD5 is' e10adc3949ba59abbe56e057f20f883e'
 * But the returned string is not a hexadecimal string, it is an array of numbers, which can be converted using the arrToHex function
 * @param {string} filePath File path, absolute path, required, usually starting with/app/code
 * @returns {array} Numeric array
 */
common.md5HashFile = function (filePath) {
    if (filePath === undefined || filePath === null || typeof (filePath) != "string") {
        return null
    }
    return commonObj.md5HashFile(filePath)
}

/**
 * Calculate the HMAC MD5 encryption, for example, if the encrypted data is' 123456 'and the key is' 654321', the corresponding result is' 357cbe6d81a8ec770799879dc8629a53 '
 * But both the parameters and the returned value are in the form of an ArrayBuffer
 * @param {ArrayBuffer} data Content that requires encryption
 * @param {ArrayBuffer} key Secret key
 * @returns {ArrayBuffer} ArrayBuffer
 */
common.hmacMd5Hash = function (data, key) {
    return commonObj.hmacMd5Hash(data, key)
}

/**
 * Calculate the HMAC MD5 encryption, for example, if the encrypted data is' 123456 'and the key is' 654321', the corresponding result is' 357cbe6d81a8ec770799879dc8629a53 '
 * @param {string} data Content that requires encryption
 * @param {string} key Secret key
 * @returns {ArrayBuffer} ArrayBuffer
 */
common.hmac = function (data, key) {
    return commonObj.hmac(data, key)
}

/**
 * The file calculation is based on HMAC MD5 encryption. For example, if the content of the file is' 123456 'and the key is' 654321', the corresponding result is' 357cbe6d81a8ec770799879dc8629a53 '
 * @param {string} filePath The file path for storing encrypted content, absolute path, required, usually starting with/app/code
 * @param {array} key Key, numerical array
 * @returns {array} Numeric array
 */
common.hmacMd5HashFile = function (filePath, key) {
    return commonObj.hmacMd5HashFile(filePath, key)
}


/**
 * Convert base64 to bin file
 * @param {string} file_path File Path
 * @param {string} base64Data Base64 data
 * @returns {number} result
 */
common.base64_2binfile = function (file_path, base64Data) {
    return commonObj.base64_2binfile(file_path, base64Data);
}

/**
 * Convert bin file to base64
 * @param {string} file_path File Path
 * @returns {string} base64 Data
 */
common.binfile_2base64 = function (file_path) {
    return commonObj.binfile_2base64(file_path);
}

/**
 * Switch device mode
 * @description After switching modes, the device will restart and enter the specified mode. When using it, it is necessary to fully maintain the logic of mutual switching. After switching to business mode, IDE functions cannot be used
 * @param {number} mode Attention: Switching between old version modes (1, 2, 3) and new version modes (dev, test, prod, safe)
 * @returns {boolean} true false
 */
common.setMode = function (mode) {
    // Attention: Switching between old version modes (1, 2, 3)
    if (mode == 1) {
        // Production mode
        commonObj.systemWithRes(`echo 'app' > /etc/.mode`, 2)
        // Delete factory detection after switching to other modes in version 1.0 (adjustments may be made in subsequent versions)
        commonObj.systemWithRes(`rm -rf /test`, 2)
    } else if (mode == 2) {
        // Debug Mode
        commonObj.systemWithRes(`echo 'debug' > /etc/.mode`, 2)
        // Delete factory detection after switching to other modes in version 1.0 (adjustments may be made in subsequent versions)
        commonObj.systemWithRes(`rm -rf /test`, 2)
    } else if (mode == 3) {
        // 试产模式
        commonObj.systemWithRes(`echo 'pp' > /etc/.mode`, 2)
    }

    // Attention: New version mode switching uses (dev, test, prod, safe)
    else if (mode == "dev") {
        // Development mode
        commonObj.systemWithRes(`echo 'dev' > /etc/.mode_v1`, 2)
    } else if (mode == "test") {
        // Test mode (trial production mode)
        commonObj.systemWithRes(`echo 'test' > /etc/.mode_v1`, 2)
    } else if (mode == "prod") {
        // Production mode
        commonObj.systemWithRes(`echo 'prod' > /etc/.mode_v1`, 2)
    } else if (mode == "safe") {
        // Safe mode
        commonObj.systemWithRes(`echo 'safe' > /etc/.mode_v1`, 2)
    } else {
        return false
    }
    commonObj.systemWithRes(`sync`, 2)
    commonObj.asyncReboot(2)
    return true
}

/**
 * Query device mode
 * @description Get the current mode of the device
 * @returns {number} Business mode: 1, Development mode: 2, Factory mode: 28, Exception mode: -1
 */
common.getMode = function () {
    let ret = commonObj.systemWithRes(`test -e "/etc/.mode" && echo "OK" || echo "NO"`, 2)
    if (ret.includes('NO')) {
        return 28
    }
    let mode = commonObj.systemWithRes(`cat "/etc/.mode"`, 10)
    if (mode.includes('app')) {
        return 1
    } else if (mode.includes('debug')) {
        return 2
    } else {
        return -1
    }
}
/**
 * Hexadecimal to byte array eg: 313233616263->[49,50,51,97,98,99]
 * @param {string} str A hexadecimal string in lowercase with no space in between
 * @returns {number} Digital numbers
 */
common.hexToArr = function (str) {
    if (str === undefined || str === null || (typeof str) != 'string' || str.length < 1) {
        throw new Error("dxCommon.hexToArr:'str' parameter should not be empty")
    }
    let regex = /.{2}/g;
    let arr = str.match(regex);
    return arr.map(item => parseInt(item, 16));
}
/**
 * Byte array to hexadecimal eg: [49,50,51,97,98,99] ->313233616263
 * @param {array}numbers Numeric array
 * @returns {string} A hexadecimal string in lowercase with no space in between
 */
common.arrToHex = function (numbers) {
    const hexArray = numbers.map(num => num.toString(16).padStart(2, '0').toLowerCase());
    const hexString = hexArray.join('');
    return hexString;
}
/**
 * Hexadecimal to string conversion eg: 313233616263->123abc
 * Note that if the hexadecimal string is converted from Chinese, there will be garbled characters when it is converted back to a Chinese string, as it is a byte by byte conversion
 * @param {string} str The hexadecimal string to be converted
 * @returns {string} The real string
 */
common.hexToString = function (str) {
    let regex = /.{2}/g;
    let arr = str.match(regex);
    arr = arr.map(item => String.fromCharCode(parseInt(item, 16)));
    return arr.join("");
}
// Convert a string to a UTF-8 encoded hexadecimal string
common.strToUtf8Hex = function (str) {
    const bytes = [];
    for (let i = 0; i < str.length; i++) {
        let code = str.charCodeAt(i);
        if (code < 0x80) {
            bytes.push(code);
        } else if (code < 0x800) {
            bytes.push(0xc0 | (code >> 6), 0x80 | (code & 0x3f));
        } else if (code < 0xd800 || code >= 0xe000) {
            bytes.push(0xe0 | (code >> 12), 0x80 | ((code >> 6) & 0x3f), 0x80 | (code & 0x3f));
        } else {
            // Processing Unicode Encoding
            i++;
            code = 0x10000 + (((code & 0x3ff) << 10) | (str.charCodeAt(i) & 0x3ff));
            bytes.push(
                0xf0 | (code >> 18),
                0x80 | ((code >> 12) & 0x3f),
                0x80 | ((code >> 6) & 0x3f),
                0x80 | (code & 0x3f)
            );
        }
    }
    return this.arrToHex(bytes);
}
/**
 * Convert the hexadecimal string of utf-8 passed over to a string
 * @param {string} hex Hexadecimal string
 * @returns {string} The real string
 */
common.utf8HexToStr = function (hex) {
    let array = this.hexToArr(hex)
    var out, i, len, c;
    var char2, char3;

    out = "";
    len = array.length;
    i = 0;
    while (i < len) {
        c = array[i++];
        switch (c >> 4) {
            case 0: case 1: case 2: case 3: case 4: case 5: case 6: case 7:
                // 0xxxxxxx
                out += String.fromCharCode(c);
                break;
            case 12: case 13:
                // 110x xxxx   10xx xxxx
                char2 = array[i++];
                out += String.fromCharCode(((c & 0x1F) << 6) | (char2 & 0x3F));
                break;
            case 14:
                // 1110 xxxx  10xx xxxx  10xx xxxx
                char2 = array[i++];
                char3 = array[i++];
                out += String.fromCharCode(((c & 0x0F) << 12) |
                    ((char2 & 0x3F) << 6) |
                    ((char3 & 0x3F) << 0));
                break;
        }
    }

    return out;
}
/**
 * Convert string to hexadecimal eg: 123abc ->313233616263
 * @param {string} str The string to be converted
 * @returns {string} Hexadecimal string
 */
common.stringToHex = function (str) {
    if (str === undefined || str === null || typeof (str) != "string") {
        return null
    }
    let val = "";
    for (let i = 0; i < str.length; i++) {
        val += str.charCodeAt(i).toString(16)
    }
    return val
}

/**
 * Convert small format to decimal eg: 001001->69632
 * @param {string} hexString A hexadecimal string in lowercase with no space in between
 * @returns {number} Decimal number
 */
common.littleEndianToDecimal = function (hexString) {
    // Invert hexadecimal strings in small format
    let reversedHexString = hexString
        .match(/.{2}/g)  // Separate every two characters
        .reverse()  // Reverse array
        .join("");  // Merge into a string

    // Convert the inverted hexadecimal string to a decimal number
    let decimal = parseInt(reversedHexString, 16);
    return decimal;
}


/**
 * Convert decimal numbers to hexadecimal small format strings
 * eg:300->2c01
 * eg:230->e600
 * @param {number} decimalNumber Decimal digit
 * @param {number} byteSize Generate the number of bytes, if it exceeds the actual number of bytes, it will be padded with 0 on the right, and if it is lower, it will be truncated. It is not required and defaults to 2
 * @returns {string} Hexadecimal small format string
 */
common.decimalToLittleEndianHex = function (decimalNumber, byteSize) {
    if (decimalNumber === undefined || decimalNumber === null || (typeof decimalNumber) != 'number') {
        throw new Error("dxCommon.decimalToLittleEndianHex:'decimalNumber' parameter should be number")
    }
    if (byteSize === undefined || byteSize === null || (typeof byteSize) != 'number' || byteSize <= 0) {
        byteSize = 2
    }
    const littleEndianBytes = [];
    for (let i = 0; i < byteSize; i++) {
        littleEndianBytes.push(decimalNumber & 0xFF);
        decimalNumber >>= 8; // Equivalent to dividing by 256
    }
    const littleEndianHex = littleEndianBytes
        .map((byte) => byte.toString(16).padStart(2, '0'))
        .join('');
    return littleEndianHex;
}

/**
 * Convert a hexadecimal string to an ArrayBuffer
 * @param {*} hexString The hexadecimal string to be converted
 * @returns {ArrayBuffer} Converted ArrayBuffer
 */
common.hexStringToArrayBuffer = function (hexString) {
    return this.hexStringToUint8Array(hexString).buffer;
}

/**
 * Convert hexadecimal string to Uint8Array
 * @param {string} hexString The hexadecimal string to be converted is a lowercase hexadecimal string with no space in between
 * @returns {ArrayBuffer} Uint8Array object
 */
common.hexStringToUint8Array = function (hexString) {
    if (hexString === undefined || hexString === null || (typeof hexString) != 'string' || hexString.length <= 0) {
        throw new Error("dxCommon.hexStringToUint8Array:'hexString' parameter should not be empty")
    }
    let byteString = hexString.match(/.{1,2}/g);
    let byteArray = byteString.map(function (byte) {
        return parseInt(byte, 16);
    });
    let buffer = new Uint8Array(byteArray);
    return buffer;
}

/**
 * Convert ArrayBuffer to hexadecimal string format
 * @param {ArrayBuffer} buffer 
 * @returns {string} A hexadecimal string in lowercase with no space in between
 */
common.arrayBufferToHexString = function (buffer) {
    return this.uint8ArrayToHexString(new Uint8Array(buffer))
}
/**
 * Convert Uint8Array to hexadecimal string format
 * @param {Uint8Array} array 
 * @returns {string} A hexadecimal string in lowercase with no space in between
 */
common.uint8ArrayToHexString = function (array) {
    let hexString = '';
    for (let i = 0; i < array.length; i++) {
        const byte = array[i].toString(16).padStart(2, '0');
        hexString += byte;
    }
    return hexString
}
/**
 * General method for setting/obtaining component handle id
 * @param {string} name Component name, required
 * @param {string} id Handle ID, not required
 * @param {number} pointer Handle pointer number, not required
 * @returns {string} Component handle ID
 */
common.handleId = function (name, id, pointer) {
    // Component name cannot be empty
    if (name === undefined || name === null || name === "" || typeof name !== 'string') {
        return
    }
    let map = dxMap.get('handleIds')
    // Handle ID
    if (id === undefined || id === null || id === "" || typeof id !== 'string') {
        id = "__" + name + "_default"
    }
    if (pointer === undefined || pointer === null || typeof pointer !== 'number') {
        // If the pointer is empty, it is obtained
        return map.get(id)
    } else {
        // If the pointer is not empty, it is set
        let isExist = map.get(id)
        if (isExist) {
            // Handle already exists
            return
        }
        map.put(id, pointer)
    }
}


export default common