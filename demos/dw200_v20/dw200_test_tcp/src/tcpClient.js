/**
 * client.test.js
 * Unit tests for dxTcpClient JS modules.
 *
 * Test coverage:
 *  - dxTcpClient: init, connect, send, sendBuffer, isConnected, getRemoteAddress, disconnect, deinit, event callbacks
 *
 * Usage:
 *  Run this file directly with the QuickJS runtime.
 *  All tests are driven by setInterval loops; the process exits after all cases finish.
 *
 * Note:
 *  Make sure no other process is occupying TEST_PORT before running.
 */

import dxTcpClient from '../dxmodules/dxTcpClient.js'
import common from '../dxmodules/dxCommon.js'
import logger from '../dxmodules/dxLogger.js'
import std from '../dxmodules/dxStd.js'

// ============================================================
//  Config
// ============================================================

let TEST_HOST = '127.0.0.1';
const TEST_PORT = 8881;
const state = {
    serverListening:     false,
    serverConnectedId:   null,
    serverReceivedData:  null,
    clientConnected:     false,
    clientReceivedData:  null,
    clientDisconnected:  false,
    serverDisconnectedId: null,
};

// ============================================================
//  Minimal test framework (logger-based)
// ============================================================

let _passed = 0;
let _failed = 0;

function pass(name) {
    _passed++;
    logger.info(`  [PASS] ${name}`);
}

function fail(name, reason) {
    _failed++;
    logger.error(`  [FAIL] ${name}${reason ? ' -- ' + reason : ''}`);
}

function assert(name, condition, reason) {
    if (condition) {
        pass(name);
    } else {
        fail(name, reason || 'assertion failed');
    }
}

function runClientUnitTests(done) {
    logger.info('');
    logger.info('--- Suite 1: dxTcpClient unit tests ---');

    // 1-1: init returns true on first call
    const initResult = dxTcpClient.init();
    assert('client.init() returns true on first call', initResult === true);

    // 1-2: init returns false on second call (already inited)
    const initAgain = dxTcpClient.init();
    assert('client.init() returns false when already initialized', initAgain === false);

    // 1-3: isConnected returns false before any connect
    assert('client.isConnected() is false before connect', dxTcpClient.isConnected() === false);

    // 1-4: getRemoteAddress returns null when not connected
    const addr = dxTcpClient.getRemoteAddress();
    assert('client.getRemoteAddress() is null when not connected', addr === null);

    // 1-5: send throws when not connected
    let sendThrew = false;
    try {
        dxTcpClient.send('test');
    } catch (e) {
        sendThrew = true;
    }
    assert('client.send() throws when not connected', sendThrew);

    // 1-6: sendBuffer throws when not connected
    let sendBufThrew = false;
    try {
        dxTcpClient.sendBuffer(new Uint8Array([0x01]).buffer);
    } catch (e) {
        sendBufThrew = true;
    }
    assert('client.sendBuffer() throws when not connected', sendBufThrew);

    // 1-7: connect to invalid address throws
    let connectThrew = false;
    try {
        dxTcpClient.connect(TEST_HOST, TEST_PORT);
        let bytes = dxTcpClient.send('test123');
        logger.info('client.connect() bytes', bytes);
    } catch (e) {
        connectThrew = true;
    }

    assert('client.connect() throws on invalid IP', connectThrew);

    // 1-8: setCallbacks accepts an object without throwing
    let setCallbacksOk = true;
    try {
        dxTcpClient.setCallbacks({
            onConnected: () => {
                state.clientConnected = true;
                logger.info('  [integration] client: connected');
            },
            onData: (ev) => {
                state.clientReceivedData = ev.data;
                logger.info(`  [integration] client: recv: "${common.arrayBufferToHexString(ev.data)}"`);
            },
            onDisconnected: () => {
                state.clientDisconnected = true;
                logger.info('  [integration] client: disconnected');
            },
            onError: (ev) => {
                logger.error(`  [integration] client error: ${ev.errMsg}`);
            },
        });
    } catch (e) {
        setCallbacksOk = false;
    }
    assert('client.setCallbacks() accepts callback object', setCallbacksOk);

    // 1-9: EVENT_TYPE constants are defined correctly
    assert('client.EVENT_TYPE.CONNECTED === 0',    dxTcpClient.EVENT_TYPE.CONNECTED    === 0);
    assert('client.EVENT_TYPE.DISCONNECTED === 1', dxTcpClient.EVENT_TYPE.DISCONNECTED === 1);
    assert('client.EVENT_TYPE.DATA === 2',         dxTcpClient.EVENT_TYPE.DATA         === 2);
    assert('client.EVENT_TYPE.ERROR === 3',        dxTcpClient.EVENT_TYPE.ERROR        === 3);

    // 1-10: getNative returns a non-null object
    assert('client.getNative() returns non-null object', dxTcpClient.getNative() !== null);

    // // 1-11: deinit returns true
    // const deinitResult = dxTcpClient.deinit();
    // assert('client.deinit() returns true', deinitResult === true);

    // // 1-12: isConnected returns false after deinit
    // assert('client.isConnected() is false after deinit', dxTcpClient.isConnected() === false);

    done();
}


logger.info('  Running Client Unit Tests');
TEST_HOST = '192.168.50.28'
runClientUnitTests(() => {});

std.setInterval(() => {
    let bytes = dxTcpClient.send('hello client');
    logger.info('client.connect() bytes', bytes);
}, 1000);

std.setInterval(() => {
    dxTcpClient.loop();
}, 50);