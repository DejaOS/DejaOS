//Responsible for database reading and writing
import sqliteDB from '../../dxmodules/dxSqliteDB.js'

const sqliteService = {}
let instance = null;
const DB_PATH = '/app/data/db/app.db';
sqliteService.init = function () {
    instance = sqliteDB.init(DB_PATH)
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
sqliteService.query = function (sql) {
    try {
        return _instance().query(sql)
    } catch (error) {
        logger.error('sqliteService query error', error);
        return -1;
    }
}

function _instance() {
    if (instance == null) {
        instance = sqliteDB.init(DB_PATH)
    }
    return instance
}

export default sqliteService