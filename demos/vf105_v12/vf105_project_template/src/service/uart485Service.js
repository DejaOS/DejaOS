import logger from '../../dxmodules/dxLogger.js'
import driver from '../driver.js'
import * as os from "os"
const uart485Service = {}


uart485Service.receive = function (data) {
    logger.info("uart485 : " + JSON.stringify(data))
    driver.alsa.play("/app/code/resource/wav/welcome.wav")
    driver.gpio.setValue(driver.gpio.RELAY1, 1)
    os.sleep(2000)
    driver.gpio.setValue(driver.gpio.RELAY1, 0)
}

export default uart485Service
