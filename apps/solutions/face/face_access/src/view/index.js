/**
 * @layer    view
 * @module   view
 * @exports  init,destroy,isInitialized
 * @fires    none
 * @listens  none
 * @depends  dxUi,dxStd,dxDriver,router,routes,popup,result_popup,confirm,restart_required,keyboard,status_bar,face_box,idle_home,screensaver,screen_off,layout,ui_driver,i18n,call_store,wecom_store
 *
 * UI 入口。分辨率取自 dxDriver.DISPLAY，换分辨率需同步 dxDriver 并重启。
 */

import dxui from '../../dxmodules/dxUi.js';
import dxStd from '../../dxmodules/dxStd.js';
import dxDriver from '../../dxmodules/dxDriver.js';
import './components/font.js';
import { setLocale, t, onLocaleChange, setLocaleFromLanguageCode } from './i18n/index.js';
import systemStore from './pages/system/system_store.js';
import router from './router/core.js';
import registerRoutes from './router/routes.js';
import popup from './components/popup.js';
import resultPopup from './components/result_popup.js';
import confirm from './components/confirm.js';
import restartRequired from './components/restart_required.js';
import keyboard from './components/keyboard.js';
import statusBar from './components/status_bar.js';
import faceBox from './components/face_box.js';
import idleHome from './components/idle_home.js';
import screensaver from './components/screensaver.js';
import screenOff from './components/screen_off.js';
import uiDriver from './ui_driver.js';
import networkStore from './pages/network/network_store.js';
import doorStore from './pages/door/door_store.js';
import voiceStore from './pages/voice/voice_store.js';
import callStore from './pages/call/call_store.js';
import wecomStore from './pages/wecom/wecom_store.js';
import fingerprintStore from './pages/fingerprint/fingerprint_store.js';
import capabilityStore from './core/capability_store.js';

const UI_CONTEXT = {};
const HANDLER_INTERVAL_MS = 16;

let handlerTimer = null;
let initialized = false;

/**
 * 通行结果文案：按凭证类型展示刷卡/扫码/人脸/密码成功或失败。
 * @param {{ allowed?: boolean, type?: string }} payload
 * @returns {string}
 */
function accessResultMessage(payload) {
    if (payload && payload.reason === 'SCHEDULE_CLOSED') {
        return t('access.result.scheduleClosed');
    }
    if (payload && payload.reason === 'DUAL_PERSON_ALLOW') {
        return t('access.result.dualPersonSuccess');
    }
    const type = String((payload && payload.type) || '');
    const allowed = !!(payload && payload.allowed);
    // 身份证205独立鉴权，但沿用卡片通行提示文案。
    const displayType = type === '205' ? '200' : type;
    const known = displayType === '100' || displayType === '200' || displayType === '300'
        || displayType === '400' || displayType === '500';
    const key = 'access.result.'
        + (known ? displayType : 'default')
        + (allowed ? '.success' : '.fail');
    return t(key);
}

/**
 * 绑定 domain 可用的 UI 能力。
 */
function bindUiDriver() {
    const home = router.getView('home');
    uiDriver.bind({
        replace: router.replace.bind(router),
        captureFace: wecomStore.runCapture.bind(wecomStore),
        showSuccess: popup.showSuccess.bind(popup),
        showError: popup.showError.bind(popup),
        showAccessResult: function (payload) {
            const message = accessResultMessage(payload);
            const person = payload && payload.allowed ? payload.person : null;
            const participants = payload && Array.isArray(payload.participants) ? payload.participants : [];
            const participantNames = participants.map(function (item) {
                return item && item.name ? item.name : '';
            }).filter(Boolean).slice(0, 2);
            // 按 accessDisplayFields 顺序生成行；姓名不再固定占第一展示位。
            let lines = person && Array.isArray(person.fields)
                ? person.fields.map(function (item) {
                    if (!item || !item.value) return null;
                    if (item.key === 'name') {
                        return { key: 'name', text: String(item.value), emphasis: true };
                    }
                    return {
                        key: item.key,
                        text: t('access.field.' + item.key) + '：' + item.value,
                        emphasis: false,
                    };
                }).filter(Boolean)
                : [];
            if (participantNames.length === 2) {
                const joined = participantNames.join('、');
                let replaced = false;
                lines = lines.map(function (line) {
                    if (line.key !== 'name') return line;
                    replaced = true;
                    return { key: 'name', text: joined, emphasis: true };
                });
                // 双人核验始终展示两位姓名；若配置未勾选姓名，补到最前。
                if (!replaced) lines = [{ key: 'name', text: joined, emphasis: true }].concat(lines);
            }
            return resultPopup.showAccess(payload && payload.allowed ? 'success' : 'fail', {
                title: message,
                lines: lines,
            });
        },
        showAccessBatch: function (summary) {
            const count = Number(summary && summary.passedCount) || 0;
            const names = summary && Array.isArray(summary.names) ? summary.names : [];
            let displayNames = names.join('、');
            if (displayNames && count > names.length) displayNames += t('access.batch.more', { count: count - names.length });
            const message = count
                ? (displayNames || t('access.batch.count', { count: count }))
                : t('access.batch.denied');
            return resultPopup.showAccess(count ? 'success' : 'fail', {
                title: count ? t('access.result.default.success') : message,
                lines: count && message ? [{ key: 'name', text: message, emphasis: true }] : [],
            });
        },
        showVerifyStatus: home.applyVerifyStatus.bind(home),
        showAccessSuccess: resultPopup.showSuccess.bind(resultPopup),
        showAccessFailure: resultPopup.showError.bind(resultPopup),
        applyStatusBar: statusBar.applyStatus.bind(statusBar),
        applyHomePanel: home.applyStatus.bind(home),
        applyWecomPanel: wecomStore.applyDevicePanel.bind(wecomStore),
        applyFaceBoxes: faceBox.applyFaces.bind(faceBox),
        clearFaceBoxes: faceBox.clear.bind(faceBox),
        setFaceBoxVisible: faceBox.setVisible.bind(faceBox),
        applyCallSession: callStore.applySession.bind(callStore),
        setAdvertisements: screensaver.setAdvertisements.bind(screensaver),
        setScreensaverTimeout: screensaver.setTimeoutMinutes.bind(screensaver),
        setScreenOffTimeout: screenOff.setTimeoutMinutes.bind(screenOff),
        notifyActivity: screenOff.notifyActivity.bind(screenOff),
        isIdleOverlayVisible: function () {
            return screenOff.isSleeping() || screensaver.isVisible();
        },
        isHomeRoute: function () {
            return router.isInitialized() && router.getCurrent() === 'home';
        },
        enrollFinger: fingerprintStore.runRemoteEnroll.bind(fingerprintStore),
        notifyFingerEnroll: fingerprintStore.notifyProgress.bind(fingerprintStore),
        // 本机屏幕保存 / 扫码配置需重启时弹确认框；MQTT/Web 不走此入口。
        promptRestartRequired: function () {
            return restartRequired.show();
        },
        applyLanguage: function (languageCode) {
            setLocaleFromLanguageCode(languageCode);
            return true;
        },
        // Web/MQTT 改 SN/IP 或密码开门后：重载快照，刷新底栏显隐与右侧密码入口。
        applySnIpVisibility: function () {
            systemStore.load().then(function () {
                home.applyStatus({});
                if (typeof home.refreshActionButtons === 'function') {
                    home.refreshActionButtons();
                }
            }).catch(function (_e) {});
            return true;
        },
    });
}

/**
 * 按产品形态 + 企微绑定态分流。
 */
async function enterInitialRoute() {
    const resolved = await wecomStore.resolveDefaultRoute();
    const status = resolved.status;
    if (status.productType !== 'none') {
        setLocale(systemStore.getConfig().language);
    }
    router.replace(resolved.route);
}

/**
 * 构建路由与全局浮层（不含 dxui.init / handler 定时器）。
 */
async function buildUiLayers() {
    router.init();
    registerRoutes();
    // TOP 层人脸框先于状态栏，避免挡住时钟与连接图标。
    faceBox.init();
    // TOP 层状态栏：任意 MAIN 页之上常驻时钟与连接图标。
    statusBar.init();
    // SYS 屏保：在 toast / 确认框之下，避免盖住交互提示。
    await screensaver.init();
    // 息屏遮罩晚于屏保创建，息屏后始终处在最前并吞掉第一次唤醒触摸。
    screenOff.init();
    popup.init();
    // 通行结果底部渐变条，与设置 toast 分离。
    resultPopup.init();
    // 在 popup 之后 init，同属 SYS 层时确认框盖在 toast 之上。
    confirm.init();
    // 预热软键盘 TOP 层面板，避免首次点击输入框时卡顿。
    keyboard.init();
    // 非主页无操作超时回主页（通话中豁免）。
    idleHome.init();
    await enterInitialRoute();
    onLocaleChange(function () {
        router.refreshCurrent();
    });
    bindUiDriver();
}

/**
 * 销毁路由与全局浮层（不含 handler 定时器、不改 initialized）。
 */
function teardownUiLayers() {
    try {
        idleHome.destroy();
    } catch (_e) {}
    try {
        keyboard.destroy();
    } catch (_e) {}
    try {
        confirm.destroy();
    } catch (_e) {}
    try {
        resultPopup.destroy();
    } catch (_e) {}
    try {
        popup.destroy();
    } catch (_e) {}
    try {
        screenOff.destroy();
    } catch (_e) {}
    try {
        screensaver.destroy();
    } catch (_e) {}
    try {
        faceBox.destroy();
    } catch (_e) {}
    try {
        statusBar.destroy();
    } catch (_e) {}
    try {
        router.destroy();
    } catch (_e) {}
    uiDriver.unbind();
}

const view = {};

view.init = async function () {
    if (initialized) {
        return;
    }

    // UI页面只读取真实配置；在构建页面前先建立SQLite配置快照。
    await Promise.all([
        networkStore.load(),
        doorStore.load(),
        voiceStore.load(),
        systemStore.load(),
        capabilityStore.load(),
    ]);
    // 本文件由lifecycle最后动态import，避免dxUi的模块加载副作用提前初始化原生UI。
    dxui.init({ orientation: dxDriver.DISPLAY.ROTATION }, UI_CONTEXT);
    try {
        await buildUiLayers();
        handlerTimer = dxStd.setInterval(function () {
            dxui.handler();
        }, HANDLER_INTERVAL_MS);
        initialized = true;
    } catch (e) {
        teardownUiLayers();
        throw e;
    }
};

view.destroy = async function () {
    if (!initialized) {
        return;
    }
    if (handlerTimer) {
        dxStd.clearInterval(handlerTimer);
        handlerTimer = null;
    }

    let firstError = null;
    try {
        teardownUiLayers();
    } catch (e) {
        firstError = e;
    }
    initialized = false;
    if (firstError) {
        throw firstError;
    }
};

/** 停止阶段先拆除UI入口；底层Service排空后再次destroy为幂等空操作。 */
view.quiesce = async function () {
    await view.destroy();
};
view.isInitialized = function () {
    return initialized;
};

export default view;
