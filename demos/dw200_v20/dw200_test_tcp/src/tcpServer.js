/**
 * server.test.js
 * Unit tests for dxTcpServer JS modules.
 *
 * Test coverage:
 *  - dxTcpServer: init, listen, getClientCount, getClientList, send, broadcast, disconnect, stop, deinit, event callbacks
 *
 * Usage:
 *  Run this file directly with the QuickJS runtime.
 *  All tests are driven by setInterval loops; the process exits after all cases finish.
 *
 * Note:
 *  Make sure no other process is occupying TEST_PORT before running.
 */

import dxTcpServer from '../dxmodules/dxTcpServer.js'
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

function runServerUnitTests(done) {
    logger.info('');
    logger.info('--- Suite 2: dxTcpServer unit tests ---');

    // 2-1: init returns true on first call
    const initResult = dxTcpServer.init();
    assert('server.init() returns true on first call', initResult === true);

    // 2-2: init returns false on second call
    const initAgain = dxTcpServer.init();
    assert('server.init() returns false when already initialized', initAgain === false);

    // 2-3: isListening returns false before listen()
    const listenOk = dxTcpServer.listen(TEST_PORT);
    logger.info('server.listen() returns', listenOk);
    assert('server.listen() returns true', listenOk === true);
    assert('server.isListening() is false before listen()', dxTcpServer.isListening() === false);

    // 2-4: getClientCount returns 0 before any connection
    assert('server.getClientCount() === 0 before any connection', dxTcpServer.getClientCount() === 0);

    // 2-5: getClientList returns empty array before any connection
    const list = dxTcpServer.getClientList();
    assert('server.getClientList() returns [] before any connection',
        Array.isArray(list) && list.length === 0);

    // 2-6: setCallbacks accepts object without throwing
    let setCallbacksOk = true;
    try {
        dxTcpServer.setCallbacks({
            onListening: () => {
                state.serverListening = true;
            },
            onConnect: (ev) => {
                state.serverConnectedId = ev.clientId;
                logger.info(`  [integration] server: client ${ev.clientId} connected from ${ev.ip}:${ev.port}`);
            },
            onData: (ev) => {
                state.serverReceivedData = ev.data;
                logger.info(`  [integration] server: recv from ${ev.clientId}: "${common.arrayBufferToHexString(ev.data)}"`);
                // Echo back with prefix
                try { dxTcpServer.send(ev.clientId, 'echo:' + common.arrayBufferToHexString(ev.data)); } catch (e) {}
            },
            onDisconnect: (ev) => {
                state.serverDisconnectedId = ev.clientId;
                logger.info(`  [integration] server: client ${ev.clientId} disconnected`);
            },
            onError: (ev) => {
                logger.error(`  [integration] server error: ${ev.errMsg}`);
            },
        });
    } catch (e) {
        setCallbacksOk = false;
    }
    assert('server.setCallbacks() accepts callback object', setCallbacksOk);

    // 2-7: EVENT_TYPE constants are defined correctly
    assert('server.EVENT_TYPE.LISTENING === 0',  dxTcpServer.EVENT_TYPE.LISTENING  === 0);
    assert('server.EVENT_TYPE.CONNECT === 1',    dxTcpServer.EVENT_TYPE.CONNECT    === 1);
    assert('server.EVENT_TYPE.DISCONNECT === 2', dxTcpServer.EVENT_TYPE.DISCONNECT === 2);
    assert('server.EVENT_TYPE.DATA === 3',       dxTcpServer.EVENT_TYPE.DATA       === 3);
    assert('server.EVENT_TYPE.ERROR === 4',      dxTcpServer.EVENT_TYPE.ERROR      === 4);

    // 2-8: getNative returns a non-null object
    assert('server.getNative() returns non-null object', dxTcpServer.getNative() !== null);

    // 2-9: deinit returns true
    // zpf
    // const deinitResult = dxTcpServer.deinit();
    // assert('server.deinit() returns true', deinitResult === true);

    // // 2-10: isListening returns false after deinit
    // assert('server.isListening() is false after deinit', dxTcpServer.isListening() === false);

    done();
}

logger.info('  Running Server Unit Tests');
let count = 0;
runServerUnitTests(() => {});
std.setInterval(() => {
    let clients = dxTcpServer.getClientList();
    logger.info('client.getClientList()', clients);
    if(clients.length > 0) {
        count++;
        let bytes = dxTcpServer.send(clients[0].clientId, 'hello server');
        logger.info('server.send() bytes', bytes);
        if(count > 100) {
            dxTcpServer.disconnect(clients[0].clientId);
        }
    }
}, 1000);
std.setInterval(() => {
    dxTcpServer.loop();
}, 50);