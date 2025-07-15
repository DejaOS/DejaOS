import sqliteObj from '../../dxmodules/dxSqlite.js'
import common from '../../dxmodules/dxCommon.js'
import std from '../../dxmodules/dxStd.js'
//-------------------------variable-------------------------

const sqliteService = {}
//-------------------------public-------------------------

//初始化数据库
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
    //创建索引
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
//获取方法
sqliteService.getFunction = function () {
    return funcs(sqliteObj)
}
function funcs (sqliteObj) {
    const dbFuncs = {}
    //权限表：查询所有权限并且分页的方法
    dbFuncs.permissionFindAll = function (page, size, code, type, id, index) {
        return permissionFindAllPage(page, size, code, type, id, index, sqliteObj)
    }
    //权限表：条件查询
    dbFuncs.permissionFindAllByCodeAndType = function (code, type, id, index) {
        return selectPermission(sqliteObj, code, type, id, index)
    }
    //权限表:查询总条数
    dbFuncs.permissionFindAllCount = function () {
        return sqliteObj.select('SELECT COUNT(*) FROM d1_permission')
    }
    //权限表：根据凭证值与类型查询是否可以通行
    dbFuncs.permissionVerifyByCodeAndType = function (code, type, index) {
        let permissions = selectPermission(sqliteObj, code)
        //code和type连插很慢，单独查询后判断 type
        let filteredData = permissions.filter(obj => obj.type == type);
        if (!filteredData && filteredData.length <= 0) {
            //无权限
            return false
        }
        //处理是否在权限时间内
        //这里的会是权限不在时间段， 需要定一下是否需要对应文字返回
        try {
            return judgmentPermission(filteredData)
        } catch (error) {
            console.log('校验权限时间报错，错误内容为', error.stack);
            return false
        }

    }
    //权限表：新增权限
    dbFuncs.permisisonInsert = function (datas) {
        //组装新增权限的 sql
        let sql = insertSql(datas)
        let res = sqliteObj.exec(sql.substring(0, sql.length - 1))
        if (res != 0) {
            //出现新增失败
            //0、根据 ids批量查询出
            let ids = datas.map(obj => obj.id);
            let findAllByIds = sqliteObj.select("select * from d1_permission where id in (" + ids.map(item => `'${item}'`).join(',') + ")")
            if (findAllByIds.length == 0) {
                //没查出来直接返回失败
                throw ("Parameter error Please check and try again")
            }

            //删除
            let deleteIds = findAllByIds.map(obj => obj.id);
            res = sqliteObj.exec("delete from d1_permission where id in (" + deleteIds.map(item => `'${item}'`).join(',') + ")")
            if (res != 0) {
                throw ("Failed to add - Failed to delete permissions in the first step")
            }
            //再次新增
            res = sqliteObj.exec(sql.substring(0, sql.length - 1))
            if (res != 0) {
                throw ("Failed to add - Failed to add permissions in step 2")
            }
        }
        return res
    }
    //权限表：根据 id 删除权限
    dbFuncs.permisisonDeleteByIdIn = function (ids) {
        verifyData({ "ids": ids })
        return sqliteObj.exec("delete from d1_permission where id in (" + ids.map(item => `'${item}'`).join(',') + ")")
    }

    //权限表：清空权限
    dbFuncs.permissionClear = function () {
        return sqliteObj.exec('delete FROM d1_permission')
    }
    //权限表:查询总条数
    dbFuncs.permissionFindAllCount = function () {
        return sqliteObj.select('SELECT COUNT(*) FROM d1_permission')
    }
    //通行记录表:查询总条数
    dbFuncs.passRecordFindAllCount = function () {
        return sqliteObj.select('SELECT COUNT(*) FROM d1_pass_record')
    }
    //通行记录表:查询所有
    dbFuncs.passRecordFindAll = function () {
        return sqliteObj.select('SELECT * FROM d1_pass_record')
    }
    //通行记录表：根据时间删除
    dbFuncs.passRecordDeleteByTimeIn = function (times) {
        verifyData({ "times": times })
        return sqliteObj.exec("delete from d1_pass_record where time in (" + times.map(item => `${item}`).join(',') + ")")
    }
    //通行记录表:删除所有
    dbFuncs.passRecordClear = function () {
        return sqliteObj.exec("delete from d1_pass_record ")
    }
    //通行记录表:根据 id 删除记录
    dbFuncs.passRecordDeleteById = function (id) {
        verifyData({ "id": id })
        return sqliteObj.exec("delete from d1_pass_record where  id = '" + id + "'")
    }

    //通行记录表:删除最后一条记录
    dbFuncs.passRecordDelLast = function () {
        return sqliteObj.exec("DELETE FROM d1_pass_record WHERE time = (SELECT MIN(time) FROM d1_pass_record LIMIT 1);")
    }
    //通行记录表:新增
    dbFuncs.passRecordInsert = function (data) {
        verifyData(data, ["id", "type", "code", "time", "result", "extra", "message", "index"])
        return sqliteObj.exec("INSERT INTO d1_pass_record values('" + data.id + "','" + data.type + "','" + data.code + "','" + data.index + "'," + data.time + "," + data.result + ",'" + data.extra + "','" + data.message + "' )")

    }
    //密钥表：条件查询
    dbFuncs.securityFindAllByCodeAndTypeAndTimeAndkey = function (code, type, id, time, key, index) {
        return selectSecurity(sqliteObj, code, type, id, time, key, index)
    }
    //密钥表:查询所有密钥带分页
    dbFuncs.securityFindAll = function (page, size, key, type, id, index) {
        return securityFindAllPage(page, size, key, type, id, index, sqliteObj)
    }
    //密钥表:新增密钥
    dbFuncs.securityInsert = function (datas) {
        let sql = "INSERT INTO d1_security values"
        for (let data of datas) {
            verifyData(data, ["id", "type", "key", "value", "startTime", "endTime"])
            sql += "('" + data.id + "','" + data.type + "','" + data.key + "','" + data.value + "'," + data.startTime + "," + data.endTime + "),"
        }

        let res = sqliteObj.exec(sql.substring(0, sql.length - 1))
        if (res != 0) {
            throw ("入库错误，新增失败")
        }
        return res
    }
    //密钥表:根据 id 删除密钥
    dbFuncs.securityDeleteByIdIn = function (ids) {
        verifyData({ "ids": ids })
        return sqliteObj.exec("delete from d1_security where id in (" + ids.map(item => `'${item}'`).join(',') + ")")
    }

    //密钥表:清空密钥表
    dbFuncs.securityClear = function () {
        return sqliteObj.exec('delete FROM d1_security')
    }


    return dbFuncs
}

//-------------------------private-------------------------
/**
 * 条件查询 
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
    // 构建 SQL 查询
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
    // 获取总记录数
    const totalCountQuery = 'SELECT COUNT(*) AS count FROM d1_security WHERE 1=1 ' + where
    const totalCountResult = sqliteObj.select(totalCountQuery)

    const total = totalCountResult[0].count

    // 计算总页数
    const totalPage = Math.ceil(total / size)

    // 构建分页查询
    const offset = (page - 1) * size
    query += where
    query += ` LIMIT ${size} OFFSET ${offset}`

    // 执行查询
    const result = sqliteObj.select(query)
    // 构建返回结果
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
 * 查询所有权限 
 * @param {*} page 
 * @param {*} size 
 * @param {*} code 
 * @param {*} type 
 * @param {*} id 
 * @returns 
 */
function permissionFindAllPage (page, size, code, type, id, index, sqliteObj) {
    // 构建 SQL 查询
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
    // 获取总记录数
    const totalCountQuery = 'SELECT COUNT(*) AS count FROM d1_permission WHERE 1=1' + where

    const totalCountResult = sqliteObj.select(totalCountQuery)


    const total = totalCountResult[0].count || 0

    // 计算总页数
    const totalPage = Math.ceil(total / size)

    // 构建分页查询
    const offset = page * size
    query += where
    query += ` LIMIT ${size} OFFSET ${offset}`
    // 执行查询
    let result = sqliteObj.select(query)
    // 构建返回结果
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
 * 条件查询 
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


//校验多参数,第二个参数如果不传，则遍历所有field
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
 * 校验权限时间是否可以通行
 * @param {*} permissions 
 * @returns 
 */
function judgmentPermission (permissions) {
    let currentTime = Math.floor(Date.now() / 1000)
    for (let permission of permissions) {
        if (permission.tiemType == '0') {
            //如果是永久权限直接为 true
            return true
        }
        if (permission.tiemType == '1') {
            if (checkTimeValidity(permission, currentTime)) {
                //在时间段内的权限啧可以通行其他 false
                return true
            }
        }
        if (permission.tiemType == '2') {
            if (checkTimeValidity(permission, currentTime)) {
                //确定是在年月日的时间段内了，继续判断是否在每日权限内
                let totalSeconds = secondsSinceMidnight()
                if (parseInt(permission.repeatBeginTime) <= totalSeconds && totalSeconds <= parseInt(permission.repeatEndTime)) {
                    //在秒数时间段内的权限可以通行其他
                    return true
                }
            }
        }
        if (permission.tiemType == '3') {
            if (checkTimeValidity(permission, currentTime)) {
                //判断周期性权限
                let week = (new Date().getDay() + 6) % 7 + 1;
                if (!permission.period) {
                    return false
                }
                let weekPeriodTime = JSON.parse(permission.period)

                if (!weekPeriodTime[week]) {
                    //没有这一天的权限 直接返回
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
 * 获取从 0 点到当前时间的秒数
 * @returns 
 */
function secondsSinceMidnight () {
    // 创建一个表示当前时间的 Date 对象
    const now = new Date();
    // 获取当前时间的小时、分钟和秒数
    const hours = now.getHours();
    const minutes = now.getMinutes();
    const seconds = now.getSeconds();
    // 计算从 0 点到当前时间的总秒数
    const totalSeconds = (hours * 3600) + (minutes * 60) + seconds;
    return totalSeconds;
}

/**
 * 校验当前时间是否在时间段内  周期性权限校验
 * @param {*} timeRangeString 
 * @returns 
 */
function isCurrentTimeInTimeRange (timeRangeString) {
    // 分割开始时间和结束时间
    var [startTime, endTime] = timeRangeString.split('-');
    // 获取当前时间
    var currentTime = new Date();
    // 解析开始时间的小时和分钟
    var [startHour, startMinute] = startTime.split(':');
    // 解析结束时间的小时和分钟
    var [endHour, endMinute] = endTime.split(':');
    // 创建开始时间的日期对象
    var startDate = new Date();
    startDate.setHours(parseInt(startHour, 10));
    startDate.setMinutes(parseInt(startMinute, 10));
    // 创建结束时间的日期对象
    var endDate = new Date();
    endDate.setHours(parseInt(endHour, 10));
    endDate.setMinutes(parseInt(endMinute, 10));

    // 检查当前时间是否在时间范围内
    return currentTime >= startDate && currentTime <= endDate;
}
function checkTimeValidity (permission, currentTime) {
    return parseInt(permission.beginTime) <= currentTime && currentTime <= parseInt(permission.endTime)
}
//获取路径文件夹
function getLastSegment (path) {
    let lastIndex = path.lastIndexOf('/');
    if (lastIndex > 0) { // 如果找到了 `/` 并且不是在字符串的第一个位置
        return path.substring(0, lastIndex);
    } else {
        return undefined; // 如果没有找到 `/` 或者 `/` 在第一个位置，直接返回原始字符串
    }
}
// 将数据库中解析出来的负数（因类型溢出）转回无符号整数
function safeBigInt (val) {
    const num = Number(val);
    const fixed = num < 0 ? num >>> 0 : num;
    return fixed; // 返回普通 Number 类型
}
export default sqliteService






