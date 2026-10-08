/**
 * @layer    core
 * @module   lifecycle
 * @fires    none
 * @listens  none
 * @depends  storage/sqlite,storage/config,storage/data,gpio_driver,os_driver,ota_driver,watchdog_driver,gpiokey_driver,pwm_driver,audio_driver,capturer_driver,ivcore_driver,display_driver,face_driver,time_driver,mqtt_protocol,http_protocol,config_service,login_auth_service,grant_service,access_service,scanner_service(按需),alarm_service,control_service,capcal_service,state_service,network_driver,view
 */

import sqlite from '../storage/sqlite/sqlite.js';
import config from '../storage/config/config.js';
import data from '../storage/data/data.js';
import gpioDriver from '../drivers/gpio_driver.js';
import osDriver from '../drivers/os_driver.js';
import otaDriver from '../drivers/ota_driver.js';
import advertDriver from '../drivers/advert_driver.js';
import watchdogDriver from '../drivers/watchdog_driver.js';
import gpiokeyDriver from '../drivers/gpiokey_driver.js';
import pwmDriver from '../drivers/pwm_driver.js';
import audioDriver from '../drivers/audio_driver.js';
import capturerDriver from '../drivers/capturer_driver.js';
import ivcoreDriver from '../drivers/ivcore_driver.js';
import displayDriver from '../drivers/display_driver.js';
import faceDriver from '../drivers/face_driver.js';
import timeDriver from '../drivers/time_driver.js';
import mqttProtocol from '../protocols/mqtt/mqtt_protocol.js';
import httpProtocol from '../protocols/http/http_protocol.js';
import configService from '../services/config_service.js';
import loginAuthService from '../services/login_auth_service.js';
import grantService from '../services/grant_service.js';
import accessService from '../services/access_service.js';
import alarmService from '../services/alarm_service.js';
import controlService from '../services/control_service.js';
import doorService from '../services/door_service.js';
import advertService from '../services/advert_service.js';
import wecomService from '../services/wecom_service.js';
import stateService from '../services/state_service.js';
import faceService from '../services/face_service.js';
import callService from '../services/call_service.js';
import capcalService from '../services/capcal_service.js';
import diagService from '../services/diag_service.js';
import networkDriver from '../drivers/network_driver.js';
import diagLog from '../utils/diag_log.js';
import { APP_VERSION } from '../version.js';

let bootstrapping = false;
let bootstrapped = false;
let fatalActive = false;
let activeModule = '';
const initializedModules = [];

async function initModule(name, module, options, kind) {
    const startedAt = Date.now();
    const moduleKind = kind || 'resource';
    activeModule = name;
    diagLog.info('lifecycle', 'module_init_start', { module: name, kind: moduleKind });
    try {
        await module.init(options);
        // kind只用于关闭阶段分组；初始化顺序仍严格按本函数调用顺序。
        initializedModules.push({ name: name, module: module, kind: moduleKind });
        diagLog.info('lifecycle', 'module_init_done', {
            module: name, kind: moduleKind, duration_ms: diagLog.duration(startedAt),
        });
        activeModule = '';
    } catch (error) {
        diagLog.error('lifecycle', 'module_init_failed', error, {
            module: name, kind: moduleKind, duration_ms: diagLog.duration(startedAt),
        });
        throw error;
    }
}

function initService(name, module) {
    return initModule(name, module, undefined, 'service');
}

async function quiesceForFatal() {
    for (let i = initializedModules.length - 1; i >= 0; i--) {
        const entry = initializedModules[i];
        if (typeof entry.module.quiesce !== 'function') continue;
        try {
            await entry.module.quiesce();
        } catch (error) {
            diagLog.error('lifecycle', 'fatal_quiesce_failed', error, { module: entry.name });
        }
    }
}

async function showFatalView(moduleName, error) {
    try {
        const faultModule = await import('../view/fault_view.js');
        faultModule.default.show({
            module: moduleName,
            message: error && error.message ? error.message : String(error || 'unknown error'),
        });
        return true;
    } catch (viewError) {
        diagLog.error('lifecycle', 'fatal_view_failed', viewError, { module: moduleName });
        return false;
    }
}

async function enterFatalState(moduleName, error) {
    if (fatalActive) return;
    fatalActive = true;
    bootstrapped = false;

    // 先尽量把故障模块显示出来，再停止喂狗，给屏幕留出完整的看门狗超时窗口。
    const displayed = await showFatalView(moduleName, error);
    let watchdogArmed = false;
    try {
        watchdogArmed = watchdogDriver.stopFeeding();
    } catch (watchdogError) {
        diagLog.error('lifecycle', 'watchdog_feed_stop_failed', watchdogError, { module: moduleName });
    }
    diagLog.error('lifecycle', 'fatal_wait_reset', error, {
        module: moduleName,
        displayed: displayed,
        watchdog_armed: watchdogArmed,
    });

    // 仅关闭外部入口，不能执行完整shutdown；shutdown会停止硬件看门狗并破坏复位链路。
    await quiesceForFatal();
    if (!watchdogArmed) {
        // 看门狗自身初始化失败时无法等待硬件复位，退回系统异步重启，仍不主动销毁进程。
        try {
            await osDriver.reboot(3);
        } catch (rebootError) {
            diagLog.error('lifecycle', 'fatal_fallback_reboot_failed', rebootError, { module: moduleName });
        }
    }
}

const lifecycle = {};

lifecycle.bootstrap = async function () {
    if (bootstrapped) {
        return;
    }
    if (bootstrapping) {
        throw new Error('lifecycle.bootstrap: bootstrap already in progress');
    }

    bootstrapping = true;
    const startedAt = Date.now();
    diagLog.info('lifecycle', 'bootstrap_start', {});
    try {
        // 先放宽内存 overcommit，避免后续模块 fork/system 因虚拟内存不足失败。
        osDriver.applyEarlyTuning();
        // 看门狗必须先于存储和业务模块启动，才能覆盖早期初始化故障。
        await initModule('watchdog', watchdogDriver);
        await initModule('sqlite', sqlite);
        await initModule('config', config);
        await initModule('data', data);

        // 每次启动补齐新增默认项；模块初始化和运行期查询统一读取SQLite。
        activeModule = 'configuration';
        const watchdogConfig = await config.getGroup('watchdog');
        const networkConfig = await config.getGroup('net');
        const ntpConfig = await config.getGroup('ntp');
        const mqttConfig = await config.getGroup('mqtt');
        const intercomConfig = await config.getGroup('intercom');
        const sysConfig = Object.assign({}, await config.getGroup('sys'), { appVersion: APP_VERSION });
        const faceConfig = await config.getGroup('face');
        const accessConfig = await config.getGroup('access');
        const volume = await config.get('base.volume', 10);
        const backlight = await config.get('base.backlight', 70);
        const brightness = await config.get('base.brightness', 70);
        const nirBrightness = await config.get('base.nirBrightness', 80);
        activeModule = 'watchdog';
        await watchdogDriver.updateConfig(watchdogConfig);
        activeModule = '';
        await initModule('gpio', gpioDriver);
        await initModule('os', osDriver);
        // 条件初始化只读 Driver 能力标志，不经 Domain（lifecycle 禁止业务处理）。
        const caps = osDriver.getCapabilities();
        await initModule('ota', otaDriver);
        await initModule('advert', advertDriver, { model: sysConfig.model });
        await initModule('time', timeDriver, ntpConfig);
        // gpioKey 设备路径与回调上限取自 dxDriver.GPIO_KEY，不经配置系统。
        await initModule('gpioKey', gpiokeyDriver);
        if (caps.pwm.enabled) {
            await initModule('pwm', pwmDriver, {
                brightness: brightness,
                nirBrightness: nirBrightness,
                channels: caps.pwm.content || 'all',
            });
        }
        await initModule('audio', audioDriver, { volume: volume });
        await initModule('capturer', capturerDriver);
        await initModule('ivcore', ivcoreDriver);
        await initModule('display', displayDriver, { backlight: backlight });
        // 多人模型仅在设备以多人模式启动时加载；运行中切换模式由配置流程要求重启。
        await initModule('face', faceDriver, Object.assign({}, faceConfig, {
            multiFace: Number(accessConfig.verifyMode) === 1,
        }));
        if (caps.nfc.enabled && Number(sysConfig.nfc) === 1) {
            // 机型能力组件按需动态加载，避免无该硬件的型号因静态 import 报错。
            activeModule = 'card';
            const cardModule = await import('../drivers/card_driver.js');
            await initModule('card', cardModule.default);
            if (caps.cloudService.enabled) {
                activeModule = 'eid';
                const eidModule = await import('../drivers/eid_driver.js');
                await initModule('eid', eidModule.default);
            }
        }
        if (caps.finger.enabled) {
            activeModule = 'finger';
            const fingerModule = await import('../drivers/finger_driver.js');
            await initModule('finger', fingerModule.default, { model: caps.finger.content });
        }
        if (caps.scanner.enabled) {
            activeModule = 'scanner';
            const scannerModule = await import('../drivers/scanner_driver.js');
            await initModule('scanner', scannerModule.default, { model: caps.scanner.content });
            // 无扫码能力时不加载 scanner_service / dxQrRule。
            activeModule = 'scannerService';
            const scannerServiceModule = await import('../services/scanner_service.js');
            await initService('scannerService', scannerServiceModule.default);
        }
        // MQTT先完成被动初始化，State先注册监听，再启动Network，避免遗漏首次网络状态。
        await initModule('mqtt', mqttProtocol, {
            mqtt: mqttConfig,
            sys: sysConfig,
            net: networkConfig,
            intercomSerno: caps.intercom.enabled ? caps.intercom.content : '',
        });
        await initService('configService', configService);
        await initService('loginAuthService', loginAuthService);
        await initService('grantService', grantService);
        await initService('accessService', accessService);
        await initService('alarmService', alarmService);
        await initService('controlService', controlService);
        await initService('doorService', doorService);
        await initService('advertService', advertService);
        await initService('callService', callService);
        await initService('capcalService', capcalService);
        await initService('diagService', diagService);
        await initService('wecomService', wecomService);
        await initService('faceService', faceService);
        await initService('stateService', stateService);
        // Command handler注册完毕后再开放Topic；Network连接成功时会自动完成订阅。
        activeModule = 'mqttRouting';
        await mqttProtocol.startRouting();
        activeModule = '';
        await initModule('network', networkDriver, networkConfig);
        // HTTP在Service注册和网络驱动完成后启动，静态页面与/api共用8080端口。
        await initModule('http', httpProtocol);
        if (caps.intercom.enabled) {
            activeModule = 'intercom';
            const intercomModule = await import('../drivers/intercom_driver.js');
            await initModule('intercom', intercomModule.default, intercomConfig);
        }
        // dxUi在模块加载时会初始化原生UI，动态import才能保证UI真实地最后启动。
        activeModule = 'view';
        const viewModule = await import('../view/index.js');
        await initModule('view', viewModule.default);
        bootstrapped = true;
        diagLog.info('lifecycle', 'bootstrap_done', {
            module_count: initializedModules.length,
            duration_ms: diagLog.duration(startedAt),
        });
    } catch (e) {
        const failedModule = activeModule || 'bootstrap';
        diagLog.error('lifecycle', 'bootstrap_failed', e, {
            module: failedModule,
            duration_ms: diagLog.duration(startedAt),
        });
        await enterFatalState(failedModule, e);
        throw e;
    } finally {
        activeModule = '';
        bootstrapping = false;
    }
};

lifecycle.shutdown = async function () {
    const startedAt = Date.now();
    diagLog.info('lifecycle', 'shutdown_start', {
        module_count: initializedModules.length,
    });
    let firstError = null;
    function remember(entry, stage, error) {
        diagLog.error('lifecycle', 'module_shutdown_failed', error, { module: entry.name, stage: stage });
        if (!firstError) {
            firstError = new Error(
                'lifecycle.shutdown: ' + entry.name + ' ' + stage + ' failed: ' + error.message
            );
        }
    }

    /*
     * 第一阶段仅关闭外部请求和Driver事件出口，底层句柄仍保留。
     * Service在不接收新事务的前提下排空队列，并继续完成必要的收尾调用。
     */
    for (let i = initializedModules.length - 1; i >= 0; i--) {
        const entry = initializedModules[i];
        if (typeof entry.module.quiesce !== 'function') continue;
        try { await entry.module.quiesce(); } catch (e) { remember(entry, 'quiesce', e); }
    }

    // 第二阶段先销毁Service；每个Service负责注销入口、停止定时器并等待任务排空。
    for (let i = initializedModules.length - 1; i >= 0; i--) {
        const entry = initializedModules[i];
        if (entry.kind !== 'service') continue;
        try { await entry.module.destroy(); } catch (e) { remember(entry, 'destroy', e); }
        initializedModules.splice(i, 1);
    }

    // 第三阶段再按逆序释放View、Protocol、Driver和Storage。
    for (let i = initializedModules.length - 1; i >= 0; i--) {
        const entry = initializedModules[i];
        try { await entry.module.destroy(); } catch (e) { remember(entry, 'destroy', e); }
    }
    initializedModules.length = 0;
    bootstrapped = false;
    if (firstError) throw firstError;
    diagLog.info('lifecycle', 'shutdown_done', {
        duration_ms: diagLog.duration(startedAt),
    });
};

lifecycle.isBootstrapped = function () {
    return bootstrapped;
};

export default lifecycle;
