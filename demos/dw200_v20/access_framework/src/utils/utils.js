//Some miscellaneous utility functions for cross-thread use
const utils = {}

// Check if it is ""/null/undefined
utils.isEmpty = function (str) {
    return (str === "" || str === null || str === undefined)
}

/**
 * Parse the string into json, note that there can be no " symbol in the value
 * @param {*} inputString 
 * @returns 
 */
utils.parseString = function (inputString) {
    // Get the content between {}
    inputString = inputString.slice(inputString.indexOf("{"), inputString.lastIndexOf("}") + 1)
    // key=value regular expression, key is \w+ (alphanumeric underscore, case sensitive), there can be spaces on both sides of =, value is \w+ or the content between two adjacent " (including ")
    const keyValueRegex = /(\w+)\s*=\s*("[^"]*"|\w+)/g;
    let jsonObject = {};
    let match;
    while ((match = keyValueRegex.exec(inputString)) !== null) {
        let key = match[1];
        let value = match[2]

        if (/^\d+$/.test(value)) {
            // number
            value = parseInt(value)
        } else if (/^\d+\.\d+$/.test(value)) {
            // decimal
            value = parseFloat(value)
        } else if (value == 'true') {
            value = true
        } else if (value == 'false') {
            value = false
        } else {
            // string
            value = value.replace(/"/g, '').trim()
        }
        jsonObject[key] = value;
    }
    return jsonObject;
}

utils.formatUnixTimestamp = function (timestamp) {
    let padZero = (v) => {
        // pad with two zeros
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
        // pad with two zeros
        return v.toString(10).padStart(2, '0')
    }
    return {
        year: t.getFullYear(),//year, e.g. 2024
        month: addZero(t.getMonth() + 1), // month starts from 0, so add 1
        monthTextCh: monthsOfYearCh[t.getMonth()],
        monthTextEn: monthsOfYearEn[t.getMonth()],
        day: addZero(t.getDate()), // Get date
        hours: addZero(t.getHours()),// Get hours
        minutes: addZero(t.getMinutes()),// Get minutes
        seconds: addZero(t.getSeconds()),// Get seconds
        dayTextCh: daysOfWeekCh[t.getDay()],//day of the week (Chinese)
        dayTextEn: daysOfWeekEn[t.getDay()],//day of the week (English)
    }
}

utils.convertTo12HourFormat = function (hours, minutes) {
    let ampm = hours >= 12 ? 'PM' : 'AM'
    hours = hours % 12
    hours = hours ? hours : 12 // Convert 0 o'clock to 12 o'clock
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')} ${ampm}`
}

export default utils
