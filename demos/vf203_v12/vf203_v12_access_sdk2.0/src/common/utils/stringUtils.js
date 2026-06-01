const stringUtils = {};

/**
 * 验证字符串是否为空
 * @param {string} str 
 */
stringUtils.isEmpty = function (str){
    if (str == null) {
        return true
    }
    return str === "" || str.trim() === "" || str.trim() === "null";
}

/**
 * 是否是正确的ip地址
 * @param {string} ipStr 
 * @returns 
 */
stringUtils.isValidIP = function (ipStr){
    return /^(25[0-5]|2[0-4][0-9]|[0-1]?[0-9][0-9]?)\.((25[0-5]|2[0-4][0-9]|[0-1]?[0-9][0-9]?)\.){2}(25[0-5]|2[0-4][0-9]|[0-1]?[0-9][0-9]?)$/.test(ipStr);;
}

/**
 * 验证是否是域名
 * @param {string} str 
 * @returns 
 */
stringUtils.isValidDomain = function (str) {
    // 正则表达式匹配常见的域名格式
    const domainPattern = /^(?:https?:\/\/)?(?:www\.)?([a-zA-Z0-9-]+\.)+[a-zA-Z]{2,}(?:\/[^\s]*)?$/;
    // 输入的字符串是否符合域名格式
    return domainPattern.test(str);
}

/**
 * 验证字符是否为纯数字
 * @param {string} str 
 */
stringUtils.isNumeric = function (str){

    return /^[0-9]+$/.test(str);
}

/**
 * 验证字符是否为纯数字或小数
 * @param {string} str 
 */
stringUtils.isNumericOrDecimal = function(str) {
    // 正则表达式匹配一个负数，一个或多个数字，或一个小数点后面跟着一个或多个数字
    const regex = /^[-+]?(?:\d+(\.\d*)?|\.\d+)$/
    return regex.test(str);
}

/**
 * 
 * @returns 获取唯一数据id
 */
stringUtils.generateUUID = function () {
    const time = Date.now().toString().slice(-9); // 取后9位
    const random = Math.random().toString().slice(2, 8); // 6位随机数
    return parseInt(time + random).toString(); // 例: 163842759123456
}

export default stringUtils;