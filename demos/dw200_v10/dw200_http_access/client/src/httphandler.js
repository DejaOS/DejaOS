//Scan result processing
import logger from '../dxmodules/dxLogger.js'
import http from '../dxmodules/dxHttpClient.js'
import driver from './driver.js'
const vg = {}
const url = 'http://192.168.50.31:3000/api/access'
vg.send = function (type, data) {
    let response = http.get(url + '?type=' + type + '&data=' + data,5000,{"header": "Authorization: Bearer your_token_here"})
    logger.info(response)
    if (response.code == 0) {
        let data = JSON.parse(response.data)
        if (data.success) {
            driver.pwm.success()
            return
        }
    }
    driver.pwm.fail()
    driver.audio.play('mj_f_eng')
}
export default vg