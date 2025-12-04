import pool from '../dxmodules/dxWorkerPool.js'
import mergeService from './service/mergeService.js'
import logger from '../dxmodules/dxLogger.js'

pool.callback((data) => {
    let topic = data.topic
    let msg = data.data
    switch (topic) {
     
        case "merge":
            mergeService.merge()
            break;
        default:
            logger.error("No such topic ", topic)
            break;
    }
})
