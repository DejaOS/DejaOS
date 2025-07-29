/**
 * dxLogger module
 * To replace the `console.log` function, allowing logs to be viewed in the corresponding VSCode plugin during debugging, 
 * with support for three levels of logging: `debug`,`info`, and `error`.
 * Supports printing various data types in JavaScript.
 */
import dxCommon from './dxCommon.js'
const logger = {}

logger.config = {
    level: 0, // default is all,if<0,no print
}
logger.debug = function (...data) {
    if (this.config.level === 0) {
        log("DEBUG ", data)
    }
}
logger.info = function (...data) {
    if ([0, 1].includes(this.config.level)) {
        log("INFO ", data)
    }
}
logger.error = function (...data) {
    if ([0, 1, 2].includes(this.config.level)) {
        log("ERROR ", data)
    }
}
//-----------------------------------private----------------------
function log(level, messages) {
    let message = messages.map(msg => getContent(msg)).join(' ');
    let content = `[${level}${getTime()}]: ${message}`
    dxCommon.systemBrief(`echo '${content}'`)
}
function getContent(message) {
    if (message === undefined) {
        return 'undefined'
    } else if (message === null) {
        return 'null'
    }
    if ((typeof message) == 'object') {
        if (Object.prototype.toString.call(message) === '[object Error]') {
            return message.message + '\n' + message.stack
        }
        return JSON.stringify(message)
    }
    return message
}
function getTime() {
    const now = new Date();
    const year = now.getFullYear();
    const month = ('0' + (now.getMonth() + 1)).slice(-2);
    const day = ('0' + now.getDate()).slice(-2);
    const hours = ('0' + now.getHours()).slice(-2);
    const minutes = ('0' + now.getMinutes()).slice(-2);
    const seconds = ('0' + now.getSeconds()).slice(-2);
    const milliseconds = ('0' + now.getMilliseconds()).slice(-3);
    return year + '-' + month + '-' + day + ' ' + hours + ':' + minutes + ':' + seconds + '.' + milliseconds;
}
export default logger