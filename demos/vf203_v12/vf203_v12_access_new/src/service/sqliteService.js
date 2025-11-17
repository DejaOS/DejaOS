import logger from '../../dxmodules/dxLogger.js'
import sqliteDB from '../../dxmodules/dxSqliteDB.js'
import driver from '../driver.js'

//-------------------------variable-------------------------
const sqliteService = {}
let instance = null;
//-------------------------public-------------------------
//初始化数据库
sqliteService.init = function () {
    // 创建数据库
    instance = sqliteDB.init(driver.sqlite.DB_PATH)
    // 创建表
    createTables()
}
let entities = {
    d1_pass_record: {
        id: "VARCHAR(128) PRIMARY KEY",
        keyId: "VARCHAR(128)",
        permissionId: "VARCHAR(128)",
        userId: "VARCHAR(128)",
        type: "VARCHAR(128)",
        code: "VARCHAR(128)",
        door: "VARCHAR(128)",
        timeStamp: "INTEGER",
        result: "INTEGER",
        extra: "TEXT",
        message: "TEXT",
    },
    d1_permission: {
        permissionId: "VARCHAR(128) PRIMARY KEY",
        door: "VARCHAR(128)",
        extra: "TEXT",
        timeType: "INTEGER",
        beginTime: "INTEGER",
        endTime: "INTEGER",
        period: "TEXT",
    },
    d1_security: {
        securityId: "VARCHAR(128) PRIMARY KEY",
        type: "VARCHAR(128)",
        key: "VARCHAR(128)",
        value: "TEXT",
        startTime: "INTEGER",
        endTime: "INTEGER",
    },
    d1_voucher: {
        keyId: "VARCHAR(128) PRIMARY KEY",
        type: "VARCHAR(128)",
        code: "TEXT",
        userId: "VARCHAR(128)",
        extra: "TEXT",
    },
    d1_person: {
        userId: "VARCHAR(128) PRIMARY KEY",
        name: "VARCHAR(128)",
        extra: "TEXT",
        permissionIds: "TEXT",
    }
}

let sqlType2jsType = (sqlType) => {
    if (sqlType.indexOf("INTEGER") > -1) {
        return 'number'
    } else {
        return 'string'
    }
}

// 创建表
function createTables() {
    for (const tableName in entities) {
        const table = entities[tableName];
        let sql = `CREATE TABLE IF NOT EXISTS ${tableName} (`
        for (const column in table) {
            const type = table[column];
            sql += ` ${column} ${type},`
        }
        sql = sql.slice(0, -1);
        sql += ")"
        let ret = sqliteService.exec(sql)
        if (ret != 0) {
            throw new Error(`table ${tableName} create exception: ${ret}`)
        }
    }
}
// 创建JPA自动生成增删改查方法
let handler = {
    get: function (target, prop, receiver) {
        return (...args) => {
            return createJPA(prop, target.tableName, ...args)
        }
    }
}
sqliteService.d1_pass_record = new Proxy({ tableName: "d1_pass_record" }, handler);
sqliteService.d1_permission = new Proxy({ tableName: "d1_permission" }, handler);
sqliteService.d1_security = new Proxy({ tableName: "d1_security" }, handler);
sqliteService.d1_voucher = new Proxy({ tableName: "d1_voucher" }, handler);
sqliteService.d1_person = new Proxy({ tableName: "d1_person" }, handler);

// 按姓名模糊查询人员
sqliteService.findPersonsByNameLike = function (name) {
    if (name === undefined || name === null) {
        return []
    }
    // 转义单引号，避免SQL语法错误
    const safeName = String(name).replace(/'/g, "''")
    const sql = `SELECT * FROM d1_person WHERE name LIKE '%${safeName}%' ;`
    return sqliteService.select(sql)
}

// 开始事务，事务不提交数据库重启后，数据会还原，所以transaction后一定要commit，但是如果在一个事务尚未提交或回滚的情况下执行另一个 BEGIN TRANSACTION，SQLite 会自动将新的事务嵌套在之前的事务内部，而不是覆盖之前的事务。
sqliteService.transaction = function () {
    sqliteService.exec("BEGIN TRANSACTION;")
}

// 回滚事务
sqliteService.rollback = function () {
    sqliteService.exec("ROLLBACK;")
}

// 提交事务，并无法回滚，数据无法还原
sqliteService.commit = function () {
    sqliteService.exec("COMMIT;")
}

sqliteService.exec = function (sql) {
    try {
        _instance().exec(sql)
        return 0;
    } catch (error) {
        logger.error('sqliteService exec error', error);
        return -1;
    }
}
sqliteService.select = function (sql) {
    try {
        return _instance().select(sql)
    } catch (error) {
        logger.error('sqliteService select error', error);
        return -1;
    }
}

function _instance() {
    if (instance == null) {
        instance = sqliteDB.init(driver.sqlite.DB_PATH)
    }

    return instance
}

/**
 * 自动创建jpa常用增删改查sql方法，
 * 支持的规则：findByAAndBAndC,findAll,findAllOrderByADescBAsc,deleteByAAndBAndC,deleteAll,deleteInBatch,deleteByIdInBatch,updateAByBAndCAndD,save,saveAll,count,countBy
 * 条件分页查询，eg：findByAAndBAndC(x,x,x,{ page: 0, size: 200, 其他条件, id:"123456" })
 * 批量删除，eg：deleteInBatch([{ a: 1, b: 2, c: "3" }, { a: 2 }])
 * 条件删除，eg：deleteAll({ a: 1, b: 2, c: "3" })
 * 单条件批量删除，eg：deleteByIdInBatch([1,2,3,4,5,6])
 * 更多示例可参考下面测试方法
 * @param {string} methodName 方法名
 * @param {string} tableName 表名
 * @param  {...any} nums 方法参数
 * @returns sqlite执行结果
 */
function createJPA(methodName, tableName, ...nums) {
    let sql
    let isFind = false
    let isCount = false
    let noPageable = false
    let hasOrderBy = false
    if (methodName.startsWith("save")) {
        // 增
        if (methodName.startsWith("saveAll")) {
            // 批量
            nums = nums[0]
            sql = `INSERT INTO ${tableName} VALUES `
            for (let i = 0; i < nums.length; i++) {
                const record = nums[i];
                sql += `(`
                for (const column in entities[tableName]) {
                    const item = record[column];
                    if (sqlType2jsType(entities[tableName][column]) == 'string') {
                        sql += `'${isEmpty(item) ? "" : item}',`
                    } else {
                        sql += `${isEmpty(item) ? 0 : item},`
                    }
                }
                sql = sql.slice(0, -1);
                sql += `)`
                if (i != nums.length - 1) {
                    sql += `, `
                }
            }
        } else {
            // 单条
            let record = nums[0]
            sql = `INSERT INTO ${tableName} VALUES (`
            for (const column in entities[tableName]) {
                const item = record[column];
                if (sqlType2jsType(entities[tableName][column]) == 'string') {
                    sql += `'${isEmpty(item) ? "" : item}',`
                } else {
                    sql += `${isEmpty(item) ? 0 : item},`
                }
            }
            sql = sql.slice(0, -1);
            sql += `)`
        }
        methodName = ""
        noPageable = true
    } else if (methodName.startsWith("delete")) {
        // 删
        if (methodName.startsWith("deleteAll")) {
            // 清空表
            sql = `DELETE FROM ${tableName} `
            methodName = ""
        } else if (methodName.endsWith("InBatch")) {
            if (nums.length != 1) {
                logger.error("[JPA]:", "缺少参数")
                return
            }
            sql = `DELETE FROM ${tableName} WHERE `
            if (methodName.indexOf("By") > -1) {
                methodName = methodName.split("By")[1].split("InBatch")[0]
                sql += `${firstLower(methodName)} IN `
                let whereClauses = ""
                for (let i = 0; i < nums[0].length; i++) {
                    const value = nums[0][i];
                    if (typeof value == 'string') {
                        whereClauses += `'${value}'`
                    } else {
                        whereClauses += `${value} `
                    }
                    if (i != nums[0].length - 1) {
                        whereClauses += ","
                    }
                }
                sql += `(${whereClauses})`
            } else {
                for (let i = 0; i < nums[0].length; i++) {
                    let whereClauses = ""
                    const record = nums[0][i];
                    for (const column in record) {
                        const value = record[column];
                        if (typeof value == 'string') {
                            whereClauses += `${column} = '${value}'`
                        } else {
                            whereClauses += `${column} = ${value}`
                        }
                        whereClauses += ` AND `
                    }
                    whereClauses = whereClauses.slice(0, " AND ".length * (-1))
                    sql += `(${whereClauses})`
                    if (i != nums[0].length - 1) {
                        sql += ` OR `
                    }
                }
            }
            methodName = ""
            noPageable = true
        } else {
            sql = `DELETE FROM ${tableName} `
            methodName = methodName.substring("delete".length)
        }
    } else if (methodName.startsWith("update")) {
        // 改
        sql = `UPDATE ${tableName} SET`
        methodName = methodName.substring("update".length)
        // 新增：支持通用更新方法 updateAllBy
        if (methodName.startsWith("AllBy")) {
            // 通用更新方法：updateAllBy{条件字段}(record, conditionValue)
            let conditionField = methodName.substring("AllBy".length)
            if (nums.length < 2) {
                logger.error("[JPA]:", "需要两个参数：更新记录和条件值")
                return -1
            }
            let record = nums[0]
            let conditionValue = nums[1]
            // 构建 SET 子句
            let setClauses = ""
            for (const column in record) {
                if (column === conditionField) continue // 跳过条件字段本身
                const value = record[column]
                if (sqlType2jsType(entities[tableName][column]) == 'string') {
                    setClauses += `${column} = '${isEmpty(value) ? "" : value}',`
                } else {
                    setClauses += `${column} = ${isEmpty(value) ? 0 : value},`
                }
            }
            setClauses = setClauses.slice(0, -1)
            // 构建 WHERE 子句
            let whereClause = ""
            if (typeof conditionValue == 'string') {
                whereClause = `${conditionField} = '${conditionValue}'`
            } else {
                whereClause = `${conditionField} = ${conditionValue}`
            }
            sql += ` ${setClauses} WHERE ${whereClause} `
            methodName = ""
        }
    } else if (methodName.startsWith("find")) {
        // 查
        isFind = true
        sql = `SELECT * FROM ${tableName} `
        if (methodName.startsWith("findAll")) {
            methodName = methodName.substring("findAll".length)
        } else {
            methodName = methodName.substring("find".length)
        }
        let index = methodName.indexOf("OrderBy")
        if (index > -1) {
            hasOrderBy = methodName.substring(index + "OrderBy".length).match(/\w+?(Desc|Asc)/g)
            methodName = methodName.substring(0, index)
        }
    } else if (methodName.startsWith("count")) {
        // 统计
        isFind = true
        isCount = true
        sql = `SELECT COUNT(*) FROM ${tableName} `
        methodName = methodName.substring("count".length)
    } else {
        logger.error("[JPA]:", "不支持的方法")
        return
    }
    // where条件构建
    let index = methodName.indexOf("By")
    let whereClauses = ""
    if (index > -1) {
        let count = 0
        let conditionsPart = methodName.substring(index + 2)
        if (conditionsPart.indexOf("And") > -1) {
            conditionsPart = conditionsPart.split("And")
            if (nums.length < conditionsPart.length) {
                logger.error("[JPA]:", "缺少参数")
                return
            }
            for (let i = 0; i < conditionsPart.length; i++) {
                const field = conditionsPart[i];
                if (typeof nums[i] == 'string') {
                    whereClauses += `${firstLower(field)} = '${nums[i]}'`
                } else {
                    whereClauses += `${firstLower(field)} = ${nums[i]}`
                }
                if (i != conditionsPart.length - 1) {
                    whereClauses += ` AND `
                }
                count = i
            }
        } else if (conditionsPart.indexOf("Or") > -1) {
            conditionsPart = conditionsPart.split("Or")
            if (nums.length < conditionsPart.length) {
                logger.error("[JPA]:", "缺少参数")
                return
            }
            for (let i = 0; i < conditionsPart.length; i++) {
                const field = conditionsPart[i];
                if (typeof nums[i] == 'string') {
                    whereClauses += `${firstLower(field)} = '${nums[i]}'`
                } else {
                    whereClauses += `${firstLower(field)} = ${nums[i]}`
                }
                if (i != conditionsPart.length - 1) {
                    whereClauses += ` OR `
                }
                count = i
            }
        } else {
            if (nums.length < 1) {
                logger.error("[JPA]:", "缺少参数")
                return
            }
            if (typeof nums[0] == 'string') {
                whereClauses = `${firstLower(conditionsPart)} = '${nums[0]}' `
            } else {
                whereClauses = `${firstLower(conditionsPart)} = ${nums[0]} `
            }
        }
        count++
        // update的set项构建
        let setClauses = ""
        let prefix = methodName.substring(0, index);
        if (prefix.length > 0) {
            prefix = prefix.split("And")
            if ((nums.length - count) < prefix.length) {
                logger.error("[JPA]:", "缺少参数")
                return
            }
            for (let i = 0; i < prefix.length; i++) {
                const field = prefix[i];
                if (typeof nums[i + count] == 'string') {
                    setClauses += `${firstLower(field)} = '${nums[i + count]}',`
                } else {
                    setClauses += `${firstLower(field)} = ${nums[i + count]},`
                }
            }
            setClauses = setClauses.slice(0, -1)
            sql += ` ${setClauses} `
        }
        sql += `WHERE ${whereClauses} `
    }
    // order排序
    let orderByClauses = ""
    if (hasOrderBy) {
        orderByClauses = "ORDER BY "
        let conditionsPart = hasOrderBy
        for (let i = 0; i < conditionsPart.length; i++) {
            const orderItem = conditionsPart[i];
            let isDesc = orderItem.indexOf("Desc")
            let isAsc = orderItem.indexOf("Asc")
            if (isDesc > -1) {
                orderByClauses += `${firstLower(orderItem.substring(0, isDesc))} DESC,`
            }
            if (isAsc > -1) {
                orderByClauses += `${firstLower(orderItem.substring(0, isAsc))} ASC,`
            }
        }
        orderByClauses = orderByClauses.slice(0, -1)
    }
    // 判断分页条件查询
    let pageable = nums[nums.length - 1]
    if (typeof pageable == 'object' && !noPageable) {
        let clauses = ""
        for (const key in pageable) {
            const condition = pageable[key];
            if (key == "page" || key == "size") {
                continue
            }
            if (typeof condition == 'string') {
                clauses += `${firstLower(key)} = '${condition}'`
            } else {
                clauses += `${firstLower(key)} = ${condition}`
            }
            clauses += ` AND `
        }
        if (clauses.length > 0) {
            clauses = clauses.slice(0, " AND ".length * (-1))
            if (sql.indexOf("WHERE") > -1) {
                sql += `AND ${clauses} `
            } else {
                sql += `WHERE ${clauses} `
            }
        }
        sql += `${orderByClauses} `
        if (isFind && !isCount && !isEmpty(pageable.page) && !isEmpty(pageable.size)) {
            sql += `LIMIT ${pageable.size} OFFSET ${pageable.page * pageable.size} `
        }
    } else {
        sql += `${orderByClauses} `
    }
    sql += `;`;
    // logger.info("[JPA]:", sql)
    let ret
    if (isFind) {
        ret = sqliteService.select(sql)
        if (isCount) {
            if (ret[0] && ret[0]["COUNT(*)"]) {
                return ret[0]["COUNT(*)"]
            } else {
                return 0
            }
        }
    } else {
        ret = sqliteService.exec(sql)
    }
    return ret
}

// 判空
function isEmpty(value) {
    return value === undefined || value === null
}

// 首字母小写
function firstLower(str) {
    return str.charAt(0).toLowerCase() + str.slice(1);
}
// JPA测试
sqliteService.testJPA = function () {
    // 查询
    // SELECT * FROM d1_pass_record ;
    sqliteService.d1_pass_record.find()
    // SELECT * FROM d1_pass_record WHERE a = 1 AND b = 2 ;
    sqliteService.d1_pass_record.find({ a: 1, b: 2 })
    // SELECT * FROM d1_pass_record WHERE a = 1 AND b = 2 ;
    sqliteService.d1_pass_record.find({ a: 1, b: 2, page: 1 })
    // SELECT * FROM d1_pass_record WHERE a = 1 AND b = 2 LIMIT 1 OFFSET 1 ;
    sqliteService.d1_pass_record.find({ a: 1, b: 2, page: 1, size: 1 })
    // SELECT * FROM d1_pass_record WHERE a = 1 AND b = 2 AND c = 3 ;
    sqliteService.d1_pass_record.findByAAndBAndC(1, 2, 3)
    // SELECT * FROM d1_pass_record WHERE a = 1 AND b = 2 AND c = 3 AND a = 1 AND b = 2 ;
    sqliteService.d1_pass_record.findByAAndBAndC(1, 2, 3, { a: 1, b: 2 })
    // SELECT * FROM d1_pass_record WHERE a = 1 AND b = 2 AND c = 3 AND a = 1 AND b = 2 LIMIT 1 OFFSET 1 ;
    sqliteService.d1_pass_record.findByAAndBAndC(1, 2, 3, { a: 1, b: 2, page: 1, size: 1 })
    // SELECT * FROM d1_pass_record ;
    sqliteService.d1_pass_record.findAll()
    // SELECT * FROM d1_pass_record WHERE a = 1 AND b = 2 ;
    sqliteService.d1_pass_record.findAll({ a: 1, b: 2 })
    // SELECT * FROM d1_pass_record WHERE a = 1 AND b = 2 ;
    sqliteService.d1_pass_record.findAll({ a: 1, b: 2, page: 1 })
    // SELECT * FROM d1_pass_record WHERE a = 1 AND b = 2 LIMIT 1 OFFSET 1 ;
    sqliteService.d1_pass_record.findAll({ a: 1, b: 2, page: 1, size: 1 })
    // SELECT * FROM d1_pass_record WHERE a = 1 AND b = 2 AND c = 3 ;
    sqliteService.d1_pass_record.findAllByAAndBAndC(1, 2, 3)
    // SELECT * FROM d1_pass_record WHERE a = 1 AND b = 2 AND c = 3 AND a = 1 AND b = 2 ;
    sqliteService.d1_pass_record.findAllByAAndBAndC(1, 2, 3, { a: 1, b: 2 })
    // SELECT * FROM d1_pass_record WHERE a = 1 AND b = 2 AND c = 3 AND a = 1 AND b = 2 LIMIT 1 OFFSET 1 ;
    sqliteService.d1_pass_record.findAllByAAndBAndC(1, 2, 3, { a: 1, b: 2, page: 1, size: 1 })
    // SELECT * FROM d1_pass_record WHERE a = 1 AND b = 2 AND c = 3 AND a = 1 AND b = 2 ORDER BY a DESC,b ASC,c ASC LIMIT 1 OFFSET 1 ;
    sqliteService.d1_pass_record.findAllByAAndBAndCOrderByADescBAscCAsc(1, 2, 3, { a: 1, b: 2, page: 1, size: 1 })
    // 删除
    // DELETE FROM d1_pass_record ;
    sqliteService.d1_pass_record.delete()
    // DELETE FROM d1_pass_record WHERE a = 1 AND b = 2 ;
    sqliteService.d1_pass_record.delete({ a: 1, b: 2 })
    // DELETE FROM d1_pass_record WHERE a = 1 AND b = 2 ;
    sqliteService.d1_pass_record.delete({ a: 1, b: 2, page: 1 })
    // DELETE FROM d1_pass_record WHERE a = 1 AND b = 2 ;
    sqliteService.d1_pass_record.delete({ a: 1, b: 2, page: 1, size: 1 })
    // DELETE FROM d1_pass_record WHERE a = 1 AND b = 2 AND c = 3 ;
    sqliteService.d1_pass_record.deleteByAAndBAndC(1, 2, 3)
    // DELETE FROM d1_pass_record WHERE a = 1 AND b = 2 AND c = 3 AND a = 1 AND b = 2 ;
    sqliteService.d1_pass_record.deleteByAAndBAndC(1, 2, 3, { a: 1, b: 2 })
    // DELETE FROM d1_pass_record WHERE a = 1 AND b = 2 AND c = 3 AND a = 1 AND b = 2 ;
    sqliteService.d1_pass_record.deleteByAAndBAndC(1, 2, 3, { a: 1, b: 2, page: 1, size: 1 })
    // DELETE FROM d1_pass_record ;
    sqliteService.d1_pass_record.deleteAll()
    // DELETE FROM d1_pass_record WHERE a = 1 AND b = 2 ;
    sqliteService.d1_pass_record.deleteAll({ a: 1, b: 2 })
    // DELETE FROM d1_pass_record WHERE a = 1 AND b = 2 ;
    sqliteService.d1_pass_record.deleteAll({ a: 1, b: 2, page: 1 })
    // DELETE FROM d1_pass_record WHERE a = 1 AND b = 2 ;
    sqliteService.d1_pass_record.deleteAll({ a: 1, b: 2, page: 1, size: 1 })
    // DELETE FROM d1_pass_record ;
    sqliteService.d1_pass_record.deleteAllByAAndBAndC(1, 2, 3)
    // DELETE FROM d1_pass_record WHERE a = 1 AND b = 2 ;
    sqliteService.d1_pass_record.deleteAllByAAndBAndC(1, 2, 3, { a: 1, b: 2 })
    // DELETE FROM d1_pass_record WHERE a = 1 AND b = 2 ;
    sqliteService.d1_pass_record.deleteAllByAAndBAndC(1, 2, 3, { a: 1, b: 2, page: 1, size: 1 })
    // DELETE FROM d1_pass_record WHERE (a = 1 AND b = 2) OR (a = 1 AND b = 2 AND page = 1) OR (a = 1 AND b = 2 AND page = 1 AND size = 1);
    sqliteService.d1_pass_record.deleteInBatch([{ a: 1, b: 2 }, { a: 1, b: 2, page: 1 }, { a: 1, b: 2, page: 1, size: 1 }])
    // DELETE FROM d1_pass_record WHERE id IN (1 ,2 ,3 );
    sqliteService.d1_pass_record.deleteByIdInBatch([1, 2, 3])
    // 更新
    // UPDATE d1_pass_record SET a = 4 WHERE b = 1 AND c = 2 AND d = 3 ;
    sqliteService.d1_pass_record.updateAByBAndCAndD(1, 2, 3, 4)
    // UPDATE d1_pass_record SET a = 4,b = 5,c = 6 WHERE d = 1 AND e = 2 AND f = 3 ;
    sqliteService.d1_pass_record.updateAAndBAndCByDAndEAndF(1, 2, 3, 4, 5, 6)
    // 添加
    // INSERT INTO d1_pass_record VALUES (,,,,,,,0,0,,);
    sqliteService.d1_pass_record.save({ a: 1, b: 2 })
    // INSERT INTO d1_pass_record VALUES (,,,,,,,0,0,,), (,,,,,,,0,0,,);
    sqliteService.d1_pass_record.saveAll([{ a: 1, b: 2 }, { a: 1, b: 2 }])
    // 聚合
    // SELECT COUNT(*) FROM d1_pass_record ;
    sqliteService.d1_pass_record.count();
    // SELECT COUNT(*) FROM d1_pass_record WHERE a = 1 AND b = 2 AND c = 3 ;
    sqliteService.d1_pass_record.countByAAndBAndC(1, 2, 3);
}
export default sqliteService


