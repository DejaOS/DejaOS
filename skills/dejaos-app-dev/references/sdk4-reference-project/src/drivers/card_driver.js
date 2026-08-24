/**
 * @layer    drivers
 * @module   card_driver
 * @fires    CARD_SWIPED
 * @listens  none
 * @depends  dxNfcCard,dxLogger,event_bus,core/events
 */

import dxNfcCard from '../../dxmodules/dxNfcCard.js';
import dxLogger from '../../dxmodules/dxLogger.js';
import eventBus from '../core/event_bus.js';
import events from '../core/events.js';

let config = { enabled: true };
let initialized = false;
let active = false;
let eventScene = 'access';

function assertActive() {
    if (!initialized || !active) {
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
        dxNfcCard.off('card', onCardDetected);
    } catch (e) {
        firstError = e;
    }
    try {
        dxNfcCard.deinit();
    } catch (e) {
        firstError = firstError || e;
    }
    active = false;
    if (firstError) throw firstError;
}

const cardDriver = {
    CARD_TYPE: dxNfcCard.CARD_TYPE,
};

cardDriver.init = async function (nextConfig) {
    if (initialized) {
        return;
    }
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
    try { deactivate(); } finally { initialized = false; }
    eventScene = 'access';
};

export default cardDriver;
