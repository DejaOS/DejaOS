/**
 * @layer    storage
 * @module   sqlite
 * @fires    none
 * @listens  none
 * @depends  dxSqliteDB,dxStd
 */

import dxSqliteDB from '../../../dxmodules/dxSqliteDB.js';
import dxStd from '../../../dxmodules/dxStd.js';
import diagLog from '../../utils/diag_log.js';

// 数据库属于运行时持久数据，固定放在/data，应用升级时不会覆盖/app/code。
const DEFAULT_DB_PATH = '/data/face_app/app.db';

let opened = false;
let dbPath = DEFAULT_DB_PATH;
let operationQueue = Promise.resolve();

function assertOpened() {
    if (!opened) {
        throw new Error('sqlite: database is not initialized');
    }
}

const sqlite = {
    DEFAULT_DB_PATH: DEFAULT_DB_PATH,
};

/*
 * dxSqliteDB的每次调用都会启动独立原生任务。这里统一排队，既保证普通
 * SQL按调用顺序执行，也保证事务期间不会混入其他请求。
 */
function enqueue(operation) {
    const task = operationQueue.then(operation, operation);
    operationQueue = task.then(function () {}, function () {});
    return task;
}

sqlite.init = async function (options) {
    const nextPath = options && options.path ? options.path : DEFAULT_DB_PATH;
    if (opened) {
        if (nextPath !== dbPath) {
            throw new Error('sqlite.init: database already opened with another path');
        }
        return;
    }

    // 组件接收的是数据库文件路径，ensurePathExists负责补齐其父目录。
    dxStd.ensurePathExists(nextPath);
    const startedAt = Date.now();
    await dxSqliteDB.open(nextPath);
    dbPath = nextPath;
    opened = true;
    diagLog.info('sqlite', 'opened', { path: nextPath, duration_ms: diagLog.duration(startedAt) });
};

sqlite.execute = async function (sql) {
    assertOpened();
    return await enqueue(function () { return dxSqliteDB.execute(sql); });
};

sqlite.query = async function (sql) {
    assertOpened();
    return await enqueue(function () { return dxSqliteDB.query(sql); });
};

sqlite.transaction = async function (work) {
    assertOpened();
    if (typeof work !== 'function') {
        throw new TypeError('sqlite.transaction: work must be a function');
    }
    return await enqueue(async function () {
        await dxSqliteDB.execute('BEGIN IMMEDIATE');
        const tx = {
            execute: function (sql) { return dxSqliteDB.execute(sql); },
            query: function (sql) { return dxSqliteDB.query(sql); },
        };
        try {
            const result = await work(tx);
            await dxSqliteDB.execute('COMMIT');
            return result;
        } catch (e) {
            diagLog.error('sqlite', 'transaction_rollback', e, {});
            try {
                await dxSqliteDB.execute('ROLLBACK');
            } catch (rollbackError) {
                if (e && typeof e === 'object') e.rollbackError = rollbackError;
            }
            throw e;
        }
    });
};

sqlite.isInitialized = function () {
    return opened;
};

sqlite.getPath = function () {
    return dbPath;
};

sqlite.destroy = async function () {
    if (!opened) {
        return;
    }
    await enqueue(function () { return dxSqliteDB.close(); });
    opened = false;
    diagLog.info('sqlite', 'closed', { path: dbPath });
};

export default sqlite;
