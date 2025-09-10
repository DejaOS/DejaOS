// Device Worker: Handles the business logic for device-related events received 
// from the Device Controller.
// This includes processing barcode scans, password entries, card swipes, 
// and other access control events.
import bus from '../../dxmodules/dxEventBus.js'
import logger from '../../dxmodules/dxLogger.js'
import config from '../service/config.js'
function init() {
    bus.on(config.events.barcode.BARCODE_DETECTED, function (data) {
        logger.info('barcode detected', data);
    })
    bus.on(config.events.access.PASSWORD_PASS, function (data) {
        logger.info('password pass', data);
    })
    bus.on(config.events.access.CARD_PASS, function (data) {
        logger.info('card pass', JSON.stringify(data));
    })
    bus.on(config.events.access.BLE_PASS, function (data) {
        logger.info('ble pass', JSON.stringify(data));
    })
}

try {
    init()
} catch (error) {
    logger.error('accessworker init error', error);
}

