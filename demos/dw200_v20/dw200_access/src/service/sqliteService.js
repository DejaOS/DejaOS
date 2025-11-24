import sqliteDB from '../../dxmodules/dxSqliteDB.js'
import common from '../../dxmodules/dxCommon.js'
import std from '../../dxmodules/dxStd.js'
import log from '../../dxmodules/dxLogger.js'
//-------------------------variable-------------------------

const sqliteService = {}
//-------------------------public-------------------------
let sqliteObj = null;
const DB_PATH ='/app/data/db/app.db'
function _instance() {
    if (sqliteObj == null) {
        sqliteObj = sqliteDB.init(DB_PATH)
    }
    return sqliteObj
}
function exec(sql) {
    try {
        _instance().exec(sql)
        return 0;
    } catch (error) {
        log.error('sqliteService exec error', error);
        return -1;
    }
}
function select(sql) {
    try {
        return _instance().select(sql)
    } catch (error) {
        log.error('sqliteService query error', error);
        return -1;
    }
}
// Initialize database
sqliteService.init = function () {
    const path = DB_PATH
    if (!path) {
        throw ("path should not be null or empty")
    }
    let newPath = getLastSegment(path)
    if (newPath) {
        std.mkdir(newPath)
    }

    sqliteObj = sqliteDB.init(path)
    let passRecordSql = `CREATE TABLE IF NOT EXISTS d1_pass_record (
        id VARCHAR(128),
        type VARCHAR(128),
        code VARCHAR(128),
        door VARCHAR(10),
        time bigint,
        result bigint,
        extra TEXT,
        message TEXT )`
    let execPassRecordSql = exec(passRecordSql)
    if (execPassRecordSql != 0) {
        throw ("d1_pass_record creation exception:" + execPassRecordSql)
    }
    exec('CREATE INDEX IF NOT EXISTS idx_passrecord_time ON d1_pass_record(time)')
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
    let execpermissionSql = exec(permissionSql)
    if (execpermissionSql != 0) {
        throw ("Table permissionSql creation exception" + execpermissionSql)
    }
    // Create index
    exec('CREATE INDEX IF NOT EXISTS idx_permission_code_type ON d1_permission (code, type)')
    let securitySql = `create table if not exists d1_security(
        id VARCHAR(128) PRIMARY KEY,
        type VARCHAR(128),
        key VARCHAR(128),
        value TEXT,
        startTime bigint,
        endTime bigint )`
    let execSecuritySql = exec(securitySql)
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
    // Permission table: method to query all permissions with pagination
    dbFuncs.permissionFindAll = function (page, size, code, type, id, index) {
        return permissionFindAllPage(page, size, code, type, id, index, sqliteObj)
    }
    // Permission table: conditional query
    dbFuncs.permissionFindAllByCodeAndType = function (code, type, id, index) {
        return selectPermission(sqliteObj, code, type, id, index)
    }
    // Permission table: query total count
    dbFuncs.permissionFindAllCount = function () {
        return select('SELECT COUNT(*) FROM d1_permission')
    }
    // Permission table: query if access is allowed based on credential value and type
    dbFuncs.permissionVerifyByCodeAndType = function (code, type, index) {
        let permissions = selectPermission(sqliteObj, code)
        // Querying code and type together is slow, so query separately and then filter by type
        let filteredData = permissions.filter(obj => obj.type == type);
        if (!filteredData && filteredData.length <= 0) {
            // No permission
            return false
        }
        // Process whether within permission time period
        // Here would be permission not in time period, need to decide if corresponding text return is needed
        try {
            return judgmentPermission(filteredData)
        } catch (error) {
            log.info('[sqliteService] permissionVerifyByCodeAndType: 校验权限时间报错，错误内容为 ' + error.stack)
            return false
        }

    }
    // Permission table: add permissions
    dbFuncs.permisisonInsert = function (datas) {
        // Assemble SQL for adding permissions
        let sql = insertSql(datas)
        let res = exec(sql.substring(0, sql.length - 1))
        if (res != 0) {
            // Addition failed
            // 0. Batch query based on ids
            let ids = datas.map(obj => obj.id);
            let findAllByIds = select("select * from d1_permission where id in (" + ids.map(item => `'${item}'`).join(',') + ")")
            if (findAllByIds.length == 0) {
                // If nothing found, directly return failure
                throw ("Parameter error Please check and try again")
            }

            // Delete
            let deleteIds = findAllByIds.map(obj => obj.id);
            res = exec("delete from d1_permission where id in (" + deleteIds.map(item => `'${item}'`).join(',') + ")")
            if (res != 0) {
                throw ("Failed to add - Failed to delete permissions in the first step")
            }
            // Add again
            res = exec(sql.substring(0, sql.length - 1))
            if (res != 0) {
                throw ("Failed to add - Failed to add permissions in step 2")
            }
        }
        return res
    }
    // Permission table: delete permissions by id
    dbFuncs.permisisonDeleteByIdIn = function (ids) {
        verifyData({ "ids": ids })
        return exec("delete from d1_permission where id in (" + ids.map(item => `'${item}'`).join(',') + ")")
    }

    // Permission table: clear permissions
    dbFuncs.permissionClear = function () {
        return exec('delete FROM d1_permission')
    }
    // Permission table: query total count
    dbFuncs.permissionFindAllCount = function () {
        return select('SELECT COUNT(*) FROM d1_permission')
    }
    // Pass record table: query total count
    dbFuncs.passRecordFindAllCount = function () {
        return select('SELECT COUNT(*) FROM d1_pass_record')
    }
    // Pass record table: query all
    dbFuncs.passRecordFindAll = function () {
        return select('SELECT * FROM d1_pass_record')
    }
    // Pass record table: query with pagination
    dbFuncs.passRecordFindByPage = function (page, size) {
        return passRecordFindByPage(page, size, sqliteObj)
    }
    // Pass record table: delete by time
    dbFuncs.passRecordDeleteByTimeIn = function (times) {
        verifyData({ "times": times })
        return exec("delete from d1_pass_record where time in (" + times.map(item => `${item}`).join(',') + ")")
    }
    // Pass record table: delete all
    dbFuncs.passRecordClear = function () {
        return exec("delete from d1_pass_record ")
    }
    // Pass record table: delete record by id
    dbFuncs.passRecordDeleteById = function (id) {
        verifyData({ "id": id })
        return exec("delete from d1_pass_record where  id = '" + id + "'")
    }

    // Pass record table: delete last record
    dbFuncs.passRecordDelLast = function () {
        return exec("DELETE FROM d1_pass_record WHERE time = (SELECT MIN(time) FROM d1_pass_record LIMIT 1);")
    }
    // Pass record table: add
    dbFuncs.passRecordInsert = function (data) {
        verifyData(data, ["id", "type", "code", "time", "result", "extra", "message", "index"])
        return exec("INSERT INTO d1_pass_record values('" + data.id + "','" + data.type + "','" + data.code + "','" + data.index + "'," + data.time + "," + data.result + ",'" + data.extra + "','" + data.message + "' )")

    }
    // Security table: conditional query
    dbFuncs.securityFindAllByCodeAndTypeAndTimeAndkey = function (code, type, id, time, key, index) {
        return selectSecurity(sqliteObj, code, type, id, time, key, index)
    }
    // Security table: query all security keys with pagination
    dbFuncs.securityFindAll = function (page, size, key, type, id, index) {
        return securityFindAllPage(page, size, key, type, id, index, sqliteObj)
    }
    // Security table: add security keys
    dbFuncs.securityInsert = function (datas) {
        let sql = "INSERT INTO d1_security values"
        for (let data of datas) {
            verifyData(data, ["id", "type", "key", "value", "startTime", "endTime"])
            sql += "('" + data.id + "','" + data.type + "','" + data.key + "','" + data.value + "'," + data.startTime + "," + data.endTime + "),"
        }

        let res = exec(sql.substring(0, sql.length - 1))
        if (res != 0) {
            // Addition failed
            // 0. Batch query based on ids
            let ids = datas.map(obj => obj.id);
            let findAllByIds = select("select * from d1_security where id in (" + ids.map(item => `'${item}'`).join(',') + ")")
            if (findAllByIds.length == 0) {
                // If nothing found, directly return failure
                throw ("Parameter error Please check and try again")
            }

            // Delete
            let deleteIds = findAllByIds.map(obj => obj.id);
            res = exec("delete from d1_security where id in (" + deleteIds.map(item => `'${item}'`).join(',') + ")")
            if (res != 0) {
                throw ("Failed to add - Failed to delete security in the first step")
            }
            // Add again
            res = exec(sql.substring(0, sql.length - 1))
            if (res != 0) {
                throw ("Failed to add - Failed to add security in step 2")
            }
            // throw ("Database error, addition failed")
        }
        return res
    }
    // Security table: delete security keys by id
    dbFuncs.securityDeleteByIdIn = function (ids) {
        verifyData({ "ids": ids })
        return exec("delete from d1_security where id in (" + ids.map(item => `'${item}'`).join(',') + ")")
    }

    // Security table: clear security table
    dbFuncs.securityClear = function () {
        return exec('delete FROM d1_security')
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
    let result = select(query)
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
    const totalCountQuery = 'SELECT COUNT(*) AS count FROM d1_security WHERE 1=1' + where
    const totalCountResult = select(totalCountQuery)

    const total = totalCountResult[0].count

    // Calculate total pages
    const totalPage = Math.ceil(total / size)

    // Build pagination query
    const offset = (page - 1) * size
    query += where
    query += ` LIMIT ${size} OFFSET ${offset}`

    // Execute query
    const content = select(query)
    // Build return result
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

    const totalCountResult = select(totalCountQuery)

    const total = totalCountResult[0].count || 0

    // Calculate total pages
    const totalPage = Math.ceil(total / size)

    // Build pagination query
    const offset = (page - 1) * size
    query += where
    query += ` LIMIT ${size} OFFSET ${offset}`
    // Execute query
    let result = select(query)
    // Build return result
    let content = result.map(record => ({
        id: record.id,
        type: record.type,
        code: record.code,
        extra: JSON.parse(record.extra),
        time: {
            type: parseInt(record.tiemType),
            beginTime: parseInt(record.timeType) != 2 ? undefined : record.repeatBeginTime,
            endTime: parseInt(record.timeType) != 2 ? undefined : record.repeatEndTime,
            range: parseInt(record.tiemType) === 0 ? undefined : { beginTime: parseInt(record.beginTime), endTime: parseInt(record.endTime) },
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
    let result = select(query)
    return result
}


function passRecordFindByPage (page, size) {
    let query = `SELECT * FROM d1_pass_record WHERE 1=1`
    const offset = (page - 1) * size
    query += ` LIMIT ${size} OFFSET ${offset}`
    return select(query)
}


// Validate multiple parameters, if second parameter not passed, traverse all fields
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
            // If permanent permission, directly true
            return true
        }
        if (permission.tiemType == '1') {
            if (checkTimeValidity(permission, currentTime)) {
                // Permission within time period can access, others false
                return true
            }
        }
        if (permission.tiemType == '2') {
            if (checkTimeValidity(permission, currentTime)) {
                // Confirmed within year-month-day time period, continue to check if within daily permission
                let totalSeconds = secondsSinceMidnight()
                if (parseInt(permission.repeatBeginTime) <= totalSeconds && totalSeconds <= parseInt(permission.repeatEndTime)) {
                    // Permission within second time period can access, others
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
                    // No permission for this day, directly return
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
 * Get seconds from 00:00 to current time
 * @returns 
 */
function secondsSinceMidnight () {
    // Create a Date object representing current time
    const now = new Date();
    // Get current hour, minute, and second
    const hours = now.getHours();
    const minutes = now.getMinutes();
    const seconds = now.getSeconds();
    // Calculate total seconds from 00:00 to current time
    const totalSeconds = (hours * 3600) + (minutes * 60) + seconds;
    return totalSeconds;
}

/**
 * Check if current time is within time period - periodic permission validation
 * @param {*} timeRangeString 
 * @returns 
 */
function isCurrentTimeInTimeRange (timeRangeString) {
    // Split start time and end time
    var [startTime, endTime] = timeRangeString.split('-');
    // Get current time
    var currentTime = new Date();
    // Parse start time hour and minute
    var [startHour, startMinute] = startTime.split(':');
    // Parse end time hour and minute
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
    return currentTime >= startDate && currentTime < endDate;
}
function checkTimeValidity (permission, currentTime) {
    return parseInt(permission.beginTime) <= currentTime && currentTime <= parseInt(permission.endTime)
}
// Get path folder
function getLastSegment (path) {
    let lastIndex = path.lastIndexOf('/');
    if (lastIndex > 0) { // If `/` found and not at first position of string
        return path.substring(0, lastIndex);
    } else {
        return undefined; // If `/` not found or at first position, return original string directly
    }
}

export default sqliteService






