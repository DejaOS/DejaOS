/**
 * @layer    drivers
 * @module   card_driver
 * @fires    CARD_SWIPED
 * @listens  none
 * @depends  dxNfcCard,dxLogger,event_bus,core/events
 *
 * dxNfcCard 按能力在 init 时动态加载，无 NFC 型号不会因静态 import 报错。
 */

import dxLogger from '../../dxmodules/dxLogger.js';
import eventBus from '../core/event_bus.js';
import events from '../core/events.js';

/** @type {object|null} */
let dxNfcCard = null;
let config = { enabled: true };
let initialized = false;
let active = false;
let eventScene = 'access';

function assertActive() {
    if (!initialized || !active || !dxNfcCard) {
        throw new Error('card_driver: NFC is disabled');
    }
}

function onCardDetected(cardInfo) {
    const cardNo = cardInfo && cardInfo.id ? String(cardInfo.id) : '';
    dxLogger.info('card_driver card id=' + (cardNo || '(empty)'));
    eventBus.fire(events.CARD_SWIPED, {
        cardNo: cardNo,
        raw: cardInfo,
        scene: eventScene,
        ts: Date.now(),
    }).catch(function (e) {
        dxLogger.error('card_driver event dispatch failed: ' + e.message);
    });
}

function activate() {
    if (active) return;
    if (!dxNfcCard) {
        throw new Error('card_driver: dxNfcCard is not loaded');
    }
    dxNfcCard.init();
    try {
        dxNfcCard.on('card', onCardDetected);
        active = true;
    } catch (e) {
        dxNfcCard.deinit();
        throw e;
    }
}

function deactivate() {
    if (!active) return;
    let firstError = null;
    try {
        if (dxNfcCard) dxNfcCard.off('card', onCardDetected);
    } catch (e) {
        firstError = e;
    }
    try {
        if (dxNfcCard) dxNfcCard.deinit();
    } catch (e) {
        firstError = firstError || e;
    }
    active = false;
    if (firstError) throw firstError;
}

const cardDriver = {
    CARD_TYPE: null,
};

cardDriver.init = async function (nextConfig) {
    if (initialized) {
        return;
    }
    const mod = await import('../../dxmodules/dxNfcCard.js');
    dxNfcCard = mod.default;
    cardDriver.CARD_TYPE = dxNfcCard.CARD_TYPE;
    config = Object.assign({}, config, nextConfig || {});
    if (config.enabled !== false) activate();
    initialized = true;
};

cardDriver.updateConfig = async function (nextConfig) {
    if (!nextConfig || typeof nextConfig !== 'object' || Array.isArray(nextConfig)) {
        throw new TypeError('card_driver.updateConfig: config must be an object');
    }
    const next = Object.assign({}, config, nextConfig);
    if (initialized && next.enabled !== config.enabled) {
        if (next.enabled === false) {
            deactivate();
        } else {
            activate();
        }
    }
    config = next;
};

cardDriver.getConfig = function () {
    assertActive();
    return dxNfcCard.getConfig();
};

cardDriver.isCardIn = function () {
    assertActive();
    return dxNfcCard.isCardIn();
};

cardDriver.m1ReadBlock = function (blockNumber, key, keyType, taskFlag) {
    assertActive();
    return dxNfcCard.m1ReadBlock(blockNumber, key, keyType, taskFlag);
};

cardDriver.m1WriteBlock = function (blockNumber, data, key, keyType, taskFlag) {
    assertActive();
    return dxNfcCard.m1WriteBlock(blockNumber, data, key, keyType, taskFlag);
};

cardDriver.m1ReadSector = function (sectorNum, logicBlkNum, blkCount, key, keyType, taskFlag) {
    assertActive();
    return dxNfcCard.m1ReadSector(sectorNum, logicBlkNum, blkCount, key, keyType, taskFlag);
};

cardDriver.m1WriteSector = function (sectorNum, logicBlkNum, data, key, keyType, taskFlag) {
    assertActive();
    return dxNfcCard.m1WriteSector(sectorNum, logicBlkNum, data, key, keyType, taskFlag);
};

cardDriver.ntagReadVersion = function () {
    assertActive();
    return dxNfcCard.ntagReadVersion();
};

cardDriver.ntagReadPage = function (pageNum) {
    assertActive();
    return dxNfcCard.ntagReadPage(pageNum);
};

cardDriver.ntagWritePage = function (pageNum, data) {
    assertActive();
    return dxNfcCard.ntagWritePage(pageNum, data);
};

cardDriver.ntagFastReadPage = function (startPage, endPage) {
    assertActive();
    return dxNfcCard.ntagFastReadPage(startPage, endPage);
};

cardDriver.iso14443Apdu = function (command, taskFlag) {
    assertActive();
    return dxNfcCard.iso14443Apdu(command, taskFlag);
};

cardDriver.isInitialized = function () {
    return initialized;
};

/** 设置卡片事件场景；capture场景由授权流程消费，不进入通行。 */
cardDriver.setEventScene = function (scene) {
    assertActive();
    if (scene !== 'access' && scene !== 'capture') {
        throw new TypeError('card_driver.setEventScene: unsupported scene');
    }
    eventScene = scene;
};

cardDriver.getEventScene = function () {
    return eventScene;
};

cardDriver.isActive = function () {
    return active;
};

cardDriver.destroy = async function () {
    if (!initialized) {
        return;
    }
    try { deactivate(); } finally {
        initialized = false;
        dxNfcCard = null;
        cardDriver.CARD_TYPE = null;
    }
    eventScene = 'access';
};

export default cardDriver;
