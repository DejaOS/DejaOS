/** @layer domain @module nfc_domain @depends card_driver,storage/config */

import cardDriver from '../drivers/card_driver.js';
import configStorage from '../storage/config/config.js';

const nfcDomain = {};
nfcDomain.SCENE = Object.freeze({ ACCESS: 'access', CAPTURE: 'capture' });
/** 刷卡通行标识：1=物理卡号（普通 NFC），3=身份证通行（云证）。 */
nfcDomain.IDENTITY = Object.freeze({ PHYSICAL: 1, ID_CARD: 3 });

nfcDomain.isEnabled = async function () {
    const sys = await configStorage.getGroup('sys');
    return sys.nfc === undefined || Number(sys.nfc) === 1;
};

/** @returns {Promise<number>} nfcDomain.IDENTITY.* */
nfcDomain.getIdentityMode = async function () {
    const value = Number(await configStorage.get('sys.nfcIdentityCardEnable', nfcDomain.IDENTITY.PHYSICAL));
    return value === nfcDomain.IDENTITY.ID_CARD
        ? nfcDomain.IDENTITY.ID_CARD
        : nfcDomain.IDENTITY.PHYSICAL;
};

nfcDomain.isIdCardAccess = async function () {
    return (await nfcDomain.getIdentityMode()) === nfcDomain.IDENTITY.ID_CARD;
};

nfcDomain.isActive = function () {
    return cardDriver.isInitialized() && cardDriver.isActive();
};

/** 卡片工作场景由Domain统一切换，Service不直接操作Driver。 */
nfcDomain.setScene = function (scene) {
    if (!nfcDomain.isActive()) {
        throw new Error('刷卡功能未启用');
    }
    if (scene !== nfcDomain.SCENE.ACCESS && scene !== nfcDomain.SCENE.CAPTURE) {
        throw new TypeError('nfc_domain.setScene: unsupported scene');
    }
    cardDriver.setEventScene(scene);
    return scene;
};

nfcDomain.restoreAccessScene = function () {
    if (nfcDomain.isActive()) {
        cardDriver.setEventScene(nfcDomain.SCENE.ACCESS);
    }
};

nfcDomain.setConfig = async function (values) {
    // 配置先落库；没有NFC选配的SKU仍允许保存统一配置，但不触碰不存在的硬件。
    await configStorage.setGroup('sys', values);
    if (cardDriver.isInitialized()) {
        const driverConfig = {};
        if (Object.prototype.hasOwnProperty.call(values, 'nfc')) {
            driverConfig.enabled = Number(values.nfc) === 1;
        }
        await cardDriver.updateConfig(driverConfig);
        if (cardDriver.isActive()) {
            cardDriver.setEventScene(nfcDomain.SCENE.ACCESS);
        }
    }
    return await configStorage.getGroup('sys');
};

export default nfcDomain;
