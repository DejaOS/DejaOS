import sqliteObj from '../../dxmodules/dxSqlite.js'
import common from '../../dxmodules/dxCommon.js'
import std from '../../dxmodules/dxStd.js'
//-------------------------variable-------------------------

const sqliteService = {}
//-------------------------public-------------------------

// Initialize database
sqliteService.init = function (path) {
    if (!path) {
        throw ("path should not be null or empty")
    }
    let newPath = getLastSegment(path)
    if (newPath) {
        std.mkdir(newPath)
    }

    sqliteObj.init(path)
    let passRecordSql = `CREATE TABLE IF NOT EXISTS d1_pass_record (
        id VARCHAR(128),
        type VARCHAR(128),
        code VARCHAR(128),
        door VARCHAR(10),
        time bigint,
        result bigint,
        extra TEXT,
        message TEXT )`
    let execPassRecordSql = sqliteObj.exec(passRecordSql)
    if (execPassRecordSql != 0) {
        throw ("d1_pass_Record creation exception:" + execPassRecordSql)
    }
    let permissionSql = `CREATE TABLE IF NOT EXISTS d1_permission (
        id VARCHAR(128) PRIMARY KEY,
        type bigint,
        code VARCHAR(128),
        door VARCHAR(10),
        extra TEXT,
        tiemType bigint,
        beginTime bigint,
        endTime bigint,
        repeatBeginTime bigint,
        repeatEndTime bigint,
        period TEXT ) `
    let execpermissionSql = sqliteObj.exec(permissionSql)
    if (execpermissionSql != 0) {
        throw ("Table permissionSql creation exception" + execpermissionSql)
    }
    // Create index
    sqliteObj.exec('CREATE INDEX idx_code ON d1_permission (code)')
    let securitySql = `create table if not exists d1_security(
        id VARCHAR(128) PRIMARY KEY,
        type VARCHAR(128),
        key VARCHAR(128),
        value TEXT,
        startTime bigint,
        endTime bigint )`
    let execSecuritySql = sqliteObj.exec(securitySql)
    if (execSecuritySql != 0) {
        throw ("The securitySql table is not created properly" + execSecuritySql)
    }
}
// Get methods
sqliteService.getFunction = function () {
    return funcs(sqliteObj)
}
function funcs (sqliteObj) {
    const dbFuncs = {}
    // Permission table: query all permissions with pagination
    dbFuncs.permissionFindAll = function (page, size, code, type, id, index) {
        return permissionFindAllPage(page, size, code, type, id, index, sqliteObj)
    }
    // Permission table: conditional query
    dbFuncs.permissionFindAllByCodeAndType = function (code, type, id, index) {
        return selectPermission(sqliteObj, code, type, id, index)
    }
    // Permission table: query total count
    dbFuncs.permissionFindAllCount = function () {
        return sqliteObj.select('SELECT COUNT(*) FROM d1_permission')
    }
    // Permission table: query if access is allowed based on credential value and type
    dbFuncs.permissionVerifyByCodeAndType = function (code, type, index) {
        let permissions = selectPermission(sqliteObj, code)
        // Querying code and type together is slow, query separately then check type
        let filteredData = permissions.filter(obj => obj.type == type);
        if (!filteredData && filteredData.length <= 0) {
            // No permission
            return false
        }
        // Process whether within permission time
        // This would be permission not in time range, need to determine if corresponding text should be returned
        try {
            return judgmentPermission(filteredData)
        } catch (error) {
            console.log('Permission time validation error, error content: ', error.stack);
            return false
        }

    }
    // Permission table: add permission
    dbFuncs.permisisonInsert = function (datas) {
        // Assemble SQL for adding permission
        let sql = insertSql(datas)
        let res = sqliteObj.exec(sql.substring(0, sql.length - 1))
        if (res != 0) {
            // Insert failed
            // 0. Batch query by ids
            let ids = datas.map(obj => obj.id);
            let findAllByIds = sqliteObj.select("select * from d1_permission where id in (" + ids.map(item => `'${item}'`).join(',') + ")")
            if (findAllByIds.length == 0) {
                // No results found, return failure directly
                throw ("Parameter error Please check and try again")
            }

            // Delete
            let deleteIds = findAllByIds.map(obj => obj.id);
            res = sqliteObj.exec("delete from d1_permission where id in (" + deleteIds.map(item => `'${item}'`).join(',') + ")")
            if (res != 0) {
                throw ("Failed to add - Failed to delete permissions in the first step")
            }
            // Add again
            res = sqliteObj.exec(sql.substring(0, sql.length - 1))
            if (res != 0) {
                throw ("Failed to add - Failed to add permissions in step 2")
            }
        }
        return res
    }
    // Permission table: delete permission by id
    dbFuncs.permisisonDeleteByIdIn = function (ids) {
        verifyData({ "ids": ids })
        return sqliteObj.exec("delete from d1_permission where id in (" + ids.map(item => `'${item}'`).join(',') + ")")
    }

    // Permission table: clear permissions
    dbFuncs.permissionClear = function () {
        return sqliteObj.exec('delete FROM d1_permission')
    }
    // Permission table: query total count
    dbFuncs.permissionFindAllCount = function () {
        return sqliteObj.select('SELECT COUNT(*) FROM d1_permission')
    }
    // Access record table: query total count
    dbFuncs.passRecordFindAllCount = function () {
        return sqliteObj.select('SELECT COUNT(*) FROM d1_pass_record')
    }
    // Access record table: query all
    dbFuncs.passRecordFindAll = function () {
        return sqliteObj.select('SELECT * FROM d1_pass_record')
    }
    // Access record table: delete by time
    dbFuncs.passRecordDeleteByTimeIn = function (times) {
        verifyData({ "times": times })
        return sqliteObj.exec("delete from d1_pass_record where time in (" + times.map(item => `${item}`).join(',') + ")")
    }
    // Access record table: delete all
    dbFuncs.passRecordClear = function () {
        return sqliteObj.exec("delete from d1_pass_record ")
    }
    // Access record table: delete record by id
    dbFuncs.passRecordDeleteById = function (id) {
        verifyData({ "id": id })
        return sqliteObj.exec("delete from d1_pass_record where  id = '" + id + "'")
    }

    // Access record table: delete last record
    dbFuncs.passRecordDelLast = function () {
        return sqliteObj.exec("DELETE FROM d1_pass_record WHERE time = (SELECT MIN(time) FROM d1_pass_record LIMIT 1);")
    }
    // Access record table: add
    dbFuncs.passRecordInsert = function (data) {
        verifyData(data, ["id", "type", "code", "time", "result", "extra", "message", "index"])
        return sqliteObj.exec("INSERT INTO d1_pass_record values('" + data.id + "','" + data.type + "','" + data.code + "','" + data.index + "'," + data.time + "," + data.result + ",'" + data.extra + "','" + data.message + "' )")

    }
    // Security key table: conditional query
    dbFuncs.securityFindAllByCodeAndTypeAndTimeAndkey = function (code, type, id, time, key, index) {
        return selectSecurity(sqliteObj, code, type, id, time, key, index)
    }
    // Security key table: query all keys with pagination
    dbFuncs.securityFindAll = function (page, size, key, type, id, index) {
        return securityFindAllPage(page, size, key, type, id, index, sqliteObj)
    }
    // Security key table: add key
    dbFuncs.securityInsert = function (datas) {
        let sql = "INSERT INTO d1_security values"
        for (let data of datas) {
            verifyData(data, ["id", "type", "key", "value", "startTime", "endTime"])
            sql += "('" + data.id + "','" + data.type + "','" + data.key + "','" + data.value + "'," + data.startTime + "," + data.endTime + "),"
        }

        let res = sqliteObj.exec(sql.substring(0, sql.length - 1))
        if (res != 0) {
            throw ("Database insertion error, add failed")
        }
        return res
    }
    // Security key table: delete key by id
    dbFuncs.securityDeleteByIdIn = function (ids) {
        verifyData({ "ids": ids })
        return sqliteObj.exec("delete from d1_security where id in (" + ids.map(item => `'${item}'`).join(',') + ")")
    }

    // Security key table: clear key table
    dbFuncs.securityClear = function () {
        return sqliteObj.exec('delete FROM d1_security')
    }


    return dbFuncs
}

//-------------------------private-------------------------
/**
 * Conditional query
 * @param {*} sqliteObj 
 * @param {*} code 
 * @param {*} type 
 * @param {*} id 
 * @returns 
 */
function selectSecurity (sqliteObj, code, type, id, time, key, index) {
    var query = `SELECT * FROM d1_security WHERE 1=1`
    if (code) {
        query += ` AND code = '${code}'`
    }
    if (type) {
        query += ` AND type = '${type}'`
    }
    if (id) {
        query += ` AND id = '${id}'`
    }
    if (index) {
        query += ` AND door = '${index}'`
    }
    if (key) {
        query += ` AND key = '${key}'`
    }
    if (time) {
        query += ` AND endTime >= '${time}'`
    }
    let result = sqliteObj.select(query)
    result = result.map(record => {
        record.startTime = safeBigInt(record.startTime)
        record.endTime = safeBigInt(record.endTime)
        return record
    })
    return result
}
function securityFindAllPage (page, size, key, type, id, index, sqliteObj) {
    // Build SQL query
    let query = `SELECT * FROM d1_security WHERE 1=1`
    let where = ''
    if (key) {
        where += ` AND key = '${key}'`
    }
    if (type) {
        where += ` AND type = '${type}'`
    }
    if (id) {
        where += ` AND id = '${id}'`
    }
    // Get total record count
    const totalCountQuery = 'SELECT COUNT(*) AS count FROM d1_security WHERE 1=1 ' + where
    const totalCountResult = sqliteObj.select(totalCountQuery)

    const total = totalCountResult[0].count

    // Calculate total pages
    const totalPage = Math.ceil(total / size)

    // Build pagination query
    const offset = (page - 1) * size
    query += where
    query += ` LIMIT ${size} OFFSET ${offset}`

    // Execute query
    const result = sqliteObj.select(query)
    // Build return result
    const content = result.map(record => ({
        id: record.id,
        type: record.type,
        key: record.key,
        key: record.key,
        value: record.value,
        startTime: safeBigInt(record.startTime),
        endTime: safeBigInt(record.endTime)
    }))
    return {
        content: content,
        page: page,
        size: size,
        total: parseInt(total),
        totalPage: totalPage,
        count: content.length
    }
}

/**
 * Query all permissions
 * @param {*} page 
 * @param {*} size 
 * @param {*} code 
 * @param {*} type 
 * @param {*} id 
 * @returns 
 */
function permissionFindAllPage (page, size, code, type, id, index, sqliteObj) {
    // Build SQL query
    let query = `SELECT * FROM d1_permission WHERE 1=1`
    let where = ''
    if (code) {
        where += ` AND code = '${code}'`
    }
    if (type) {
        where += ` AND type = ${type}`
    }
    if (id) {
        where += ` AND id = '${id}'`
    }
    if (index) {
        where += ` AND door = '${index}'`
    }
    // Get total record count
    const totalCountQuery = 'SELECT COUNT(*) AS count FROM d1_permission WHERE 1=1' + where

    const totalCountResult = sqliteObj.select(totalCountQuery)


    const total = totalCountResult[0].count || 0

    // Calculate total pages
    const totalPage = Math.ceil(total / size)

    // Build pagination query
    const offset = page * size
    query += where
    query += ` LIMIT ${size} OFFSET ${offset}`
    // Execute query
    let result = sqliteObj.select(query)
    // Build return result
    let content = result.map(record => ({
        id: record.id,
        type: record.type,
        code: record.code,
        extra: JSON.parse(record.extra),
        time: {
            type: parseInt(record.tiemType),
            beginTime: parseInt(record.timeType) != 2 ? undefined : safeBigInt(record.repeatBeginTime),
            endTime: parseInt(record.timeType) != 2 ? undefined : safeBigInt(record.repeatEndTime),
            range: parseInt(record.tiemType) === 0 ? undefined : { beginTime: safeBigInt(parseInt(record.beginTime)), endTime: safeBigInt(parseInt(record.endTime)) },
            weekPeriodTime: parseInt(record.tiemType) != 3 ? undefined : JSON.parse(record.period)
        }

    }))
    return {
        content: content,
        page: page,
        size: size,
        total: parseInt(total),
        totalPage: totalPage,
        count: content.length
    }
}

/**
 * Conditional query
 * @param {*} sqliteObj 
 * @param {*} code 
 * @param {*} type 
 * @param {*} id 
 * @returns 
 */
function selectPermission (sqliteObj, code, type, id, index) {
    var query = `SELECT * FROM d1_permission WHERE 1=1`
    if (code) {
        query += ` AND code = '${code}'`
    }
    if (type) {
        query += ` AND type = '${type}'`
    }
    if (id) {
        query += ` AND id = '${id}'`
    }
    if (index) {
        query += ` AND door = '${index}'`
    }
    let result = sqliteObj.select(query)
    result = result.map(record => {
        record.beginTime = safeBigInt(record.beginTime)
        record.endTime = safeBigInt(record.endTime)
        record.repeatBeginTime = safeBigInt(record.repeatBeginTime)
        record.repeatEndTime = safeBigInt(record.repeatEndTime)
        return record
    })
    return result
}


// Validate multiple parameters, if second parameter is not provided, iterate through all fields
function verifyData (data, fields) {
    if (!data) {
        throw ("data should not be null or empty")
    }
    if (!fields) {
        fields = Object.keys(data)
    }
    for (let field of fields) {
        if ((typeof data[field]) == 'number') {
            return true
        }
        if (!data[field]) {
            throw (`${field} should not be null or empty`)
        }
    }
}


/**
 * Validate if permission time allows access
 * @param {*} permissions 
 * @returns 
 */
function judgmentPermission (permissions) {
    let currentTime = Math.floor(Date.now() / 1000)
    for (let permission of permissions) {
        if (permission.tiemType == '0') {
            // If permanent permission, return true directly
            return true
        }
        if (permission.tiemType == '1') {
            if (checkTimeValidity(permission, currentTime)) {
                // Permissions within time range can pass, others false
                return true
            }
        }
        if (permission.tiemType == '2') {
            if (checkTimeValidity(permission, currentTime)) {
                // Confirmed within year-month-day time range, continue to check if within daily permission
                let totalSeconds = secondsSinceMidnight()
                if (parseInt(permission.repeatBeginTime) <= totalSeconds && totalSeconds <= parseInt(permission.repeatEndTime)) {
                    // Permissions within second time range can pass, others false
                    return true
                }
            }
        }
        if (permission.tiemType == '3') {
            if (checkTimeValidity(permission, currentTime)) {
                // Check periodic permission
                let week = (new Date().getDay() + 6) % 7 + 1;
                if (!permission.period) {
                    return false
                }
                let weekPeriodTime = JSON.parse(permission.period)

                if (!weekPeriodTime[week]) {
                    // No permission for this day, return directly
                    return false
                }
                let times = weekPeriodTime[week].split("|");
                for (var i = 0; i < times.length; i++) {
                    if (isCurrentTimeInTimeRange(times[i])) {
                        return true
                    }
                }
            }
        }
    }
    return false
}
function insertSql (permssionss) {
    let sql = "INSERT INTO d1_permission values"
    for (let permssions of permssionss) {
        if (permssions.type !== 200 && permssions.type !== 203 && permssions.type !== 400 && permssions.type !== 101 && permssions.type !== 600 && permssions.type !== 103 && permssions.type !== 100) {
            throw ("Unsupported certificate type")
        }
        verifyData(permssions, ["id", "type", "code", "extra", "timeType", "beginTime", "endTime", "repeatBeginTime", "repeatEndTime", "period", "index"])
        sql += "('" + permssions.id + "'," + permssions.type + ",'" + permssions.code + "','" + permssions.index + "','" + permssions.extra + "'," + permssions.timeType + "," + permssions.beginTime + "," + permssions.endTime + "," + permssions.repeatBeginTime + "," + permssions.repeatEndTime + ",'" + permssions.period + "'),"
    }
    return sql
}

/**
 * Get seconds from 0:00 to current time
 * @returns 
 */
function secondsSinceMidnight () {
    // Create a Date object representing current time
    const now = new Date();
    // Get current time hours, minutes and seconds
    const hours = now.getHours();
    const minutes = now.getMinutes();
    const seconds = now.getSeconds();
    // Calculate total seconds from 0:00 to current time
    const totalSeconds = (hours * 3600) + (minutes * 60) + seconds;
    return totalSeconds;
}

/**
 * Validate if current time is within time range - periodic permission validation
 * @param {*} timeRangeString 
 * @returns 
 */
function isCurrentTimeInTimeRange (timeRangeString) {
    // Split start time and end time
    var [startTime, endTime] = timeRangeString.split('-');
    // Get current time
    var currentTime = new Date();
    // Parse start time hours and minutes
    var [startHour, startMinute] = startTime.split(':');
    // Parse end time hours and minutes
    var [endHour, endMinute] = endTime.split(':');
    // Create start time date object
    var startDate = new Date();
    startDate.setHours(parseInt(startHour, 10));
    startDate.setMinutes(parseInt(startMinute, 10));
    // Create end time date object
    var endDate = new Date();
    endDate.setHours(parseInt(endHour, 10));
    endDate.setMinutes(parseInt(endMinute, 10));

    // Check if current time is within time range
    return currentTime >= startDate && currentTime <= endDate;
}
function checkTimeValidity (permission, currentTime) {
    return parseInt(permission.beginTime) <= currentTime && currentTime <= parseInt(permission.endTime)
}
// Get path folder
function getLastSegment (path) {
    let lastIndex = path.lastIndexOf('/');
    if (lastIndex > 0) { // If `/` is found and not at the first position of the string
        return path.substring(0, lastIndex);
    } else {
        return undefined; // If `/` is not found or is at the first position, return undefined
    }
}
// Convert negative numbers parsed from database (due to type overflow) back to unsigned integers
function safeBigInt (val) {
    const num = Number(val);
    const fixed = num < 0 ? num >>> 0 : num;
    return fixed; // Return normal Number type
}
export default sqliteService






