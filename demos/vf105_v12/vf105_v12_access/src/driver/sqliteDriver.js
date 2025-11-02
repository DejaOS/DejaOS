import std from '../../dxmodules/dxStd.js'
import sqliteService from '../service/sqliteService.js'

const sqliteDriver = {
    init: function () {
        std.ensurePathExists('/app/data/db/app.db')
        sqliteService.init('/app/data/db/app.db')
    }
}

export default sqliteDriver

