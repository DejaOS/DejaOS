/**
 * @layer domain
 * @module face_domain
 * @depends storage/config,face_driver,ui_domain,dxCommonUtils,dxStd,dxLogger
 */

import configStorage from '../storage/config/config.js';
import faceDriver from '../drivers/face_driver.js';
import uiDomain from './ui_domain.js';
import dxCommonUtils from '../../dxmodules/dxCommonUtils.js';
import dxStd from '../../dxmodules/dxStd.js';
import dxLogger from '../../dxmodules/dxLogger.js';
import { AppError } from '../core/error.js';

const CAPTURE_PREFIX = '/data/face_app/capture/';
const FACE_TYPE = '300';
let mutationQueue = Promise.resolve();
const SCENE = Object.freeze({
    OFF: 'off',
    ACCESS: 'access',
    CONFIG_AUTH: 'config_auth',
    /** 本地用户人脸注册取景（只画跟踪框，不走通行识别） */
    ENROLL: 'enroll',
});
let scene = SCENE.OFF;
let diagnosticEnabled = false;
let appConfig = {
    similarity: 0.5,
    livenessOff: 1,
    livenessVal: 5,
};

function assertFeature(value) {
    if (typeof value !== 'string' || value.length === 0) {
        throw new AppError('300000', '人脸特征提取失败');
    }
    return value;
}

function assertResult(result, action) {
    if (result !== undefined && result !== 0) {
        throw new AppError('300000', action + '失败，code=' + result);
    }
    return result;
}

function isFace(voucher) {
    return !!voucher && String(voucher.type) === FACE_TYPE;
}

/** 兼容组件不同版本的抓拍结果字段名，Domain对外只暴露统一结构。 */
function normalizeCapture(result) {
    const data = result && typeof result === 'object' ? result : {};
    return {
        feature: typeof data.feature === 'string' ? data.feature : String(data.fea || ''),
        picPath: typeof data.picPath === 'string' && data.picPath
            ? data.picPath : String(data.pic_path || ''),
        qualityScore: Number(data.qualityScore != null ? data.qualityScore : data.quality_score) || 0,
        rect: data.rect || null,
    };
}

const faceDomain = {};
faceDomain.SCENE = SCENE;

// 人脸特征库以userId为键，所有增删改串行执行，避免多入口并发造成状态覆盖。
faceDomain.exclusive = function (work) {
    const task = mutationQueue.then(work, work);
    mutationQueue = task.then(function () {}, function () {});
    return task;
};

/**
 * 切换人脸业务场景。OFF是假停止：算法服务继续运行，仅不分发检测/识别事件。
 * ACCESS 首页通行；CONFIG_AUTH 配置页管理员认证；ENROLL 本地人脸注册取景。
 */
faceDomain.setScene = function (nextScene) {
    if (nextScene !== SCENE.OFF
        && nextScene !== SCENE.ACCESS
        && nextScene !== SCENE.CONFIG_AUTH
        && nextScene !== SCENE.ENROLL) {
        throw new AppError('200000', '未知人脸业务场景');
    }
    if (faceDriver.isInitialized()) {
        if (nextScene !== SCENE.OFF && !faceDriver.isRunning()) {
            faceDriver.setStatus(true);
        }
        faceDriver.setEventScene(nextScene === SCENE.OFF ? '' : nextScene);
    }
    scene = nextScene;
    try {
        const showBoxes = nextScene === SCENE.ACCESS
            || nextScene === SCENE.CONFIG_AUTH
            || nextScene === SCENE.ENROLL;
        uiDomain.setFaceBoxVisible(showBoxes);
        if (!showBoxes) uiDomain.clearFaceBoxes();
    } catch (e) {
        // UI属于附属能力，失败不改变已经生效的人脸场景。
        dxLogger.error('face_domain.setScene faceBox failed: ' + e.message);
    }
    return true;
};

/**
 * 通过一次真实暂停/恢复重置组件内部重检计时，再进入指定业务场景。
 * 仅用于登录认证等必须立即重新检测的入口，普通切页继续使用setScene假停止。
 */
faceDomain.restartScene = function (nextScene) {
    if (nextScene === SCENE.OFF) {
        throw new AppError('200000', '重启人脸场景不能是OFF');
    }
    if (!faceDriver.isInitialized()) {
        return faceDomain.setScene(nextScene);
    }
    faceDriver.setEventScene('');
    try {
        if (faceDriver.isRunning()) faceDriver.setStatus(false);
        faceDriver.setStatus(true);
    } catch (e) {
        // 恢复失败时保持假停止，禁止把不确定状态的识别结果交给业务。
        try { faceDomain.setScene(SCENE.OFF); } catch (_sceneError) {}
        throw e;
    }
    return faceDomain.setScene(nextScene);
};

faceDomain.getScene = function () {
    return scene;
};

/** 标定等独占摄像头场景使用真正暂停；普通页面切换禁止调用。 */
faceDomain.suspend = function () {
    let hardwareError = null;
    scene = SCENE.OFF;
    if (faceDriver.isInitialized()) {
        faceDriver.setEventScene('');
        try { faceDriver.setStatus(false); } catch (e) { hardwareError = e; }
    }
    try {
        uiDomain.setFaceBoxVisible(false);
        uiDomain.clearFaceBoxes();
    } catch (e) {
        dxLogger.error('face_domain.suspend faceBox failed: ' + e.message);
    }
    if (hardwareError) throw hardwareError;
    return true;
};

/** 只允许删除组件抓拍目录中的临时文件，不能误删正式人员或通行图片。 */
faceDomain.releaseCapture = function (path) {
    if (typeof path !== 'string' || path.indexOf(CAPTURE_PREFIX) !== 0) return false;
    try {
        if (dxStd.existSync(path)) dxStd.removeSync(path);
        return true;
    } catch (_e) {
        return false;
    }
};

/** 清理未进入通行记录链路的识别抓拍。 */
faceDomain.discardResultImage = function (payload) {
    const data = payload && payload.data ? payload.data : payload;
    const path = data && (data.picPath || data.pic_path);
    faceDomain.releaseCapture(path);
};

faceDomain.getConfig = async function () {
    const values = await configStorage.getGroup('face');
    appConfig = Object.assign({}, appConfig, values || {});
    return values;
};

faceDomain.setConfig = async function (values) {
    await configStorage.setGroup('face', values);
    faceDriver.setConfig(values);
    appConfig = Object.assign({}, appConfig, values || {});
    return await faceDomain.getConfig();
};

/** 供流程层绘制诊断结果使用；不暴露 dxFacial 的运行时字段名。 */
faceDomain.getLivenessPolicy = function () {
    return {
        enabled: Number(appConfig.livenessOff) === 1,
        threshold: Number(appConfig.livenessVal) || 0,
        compareThreshold: Number(appConfig.similarity) || 0,
    };
};

faceDomain.getDiagnosticStatus = function () {
    return { enabled: diagnosticEnabled, runtimeOnly: true };
};

faceDomain.setDiagnosticEnabled = function (enabled) {
    diagnosticEnabled = enabled === true;
    return faceDomain.getDiagnosticStatus();
};

faceDomain.isDiagnosticEnabled = function () {
    return diagnosticEnabled;
};

faceDomain.register = function (userId, featureBase64) {
    return assertResult(faceDriver.addFea(userId, assertFeature(featureBase64)), '人脸注册');
};

faceDomain.update = function (userId, featureBase64) {
    return assertResult(faceDriver.updateFea(userId, assertFeature(featureBase64)), '人脸更新');
};

faceDomain.remove = function (userId) {
    return assertResult(faceDriver.deleteFea(userId), '人脸删除');
};

faceDomain.clear = function () {
    return assertResult(faceDriver.cleanFea(), '人脸清空');
};

faceDomain.extract = async function (filePath) {
    if (typeof filePath !== 'string' || filePath.indexOf('/data/') !== 0 || !dxStd.existSync(filePath)) {
        throw new AppError('200000', '人脸图片文件不存在');
    }
    const result = await faceDriver.getFeaByFile(filePath);
    return assertFeature(result && result.feature);
};

faceDomain.capture = async function (timeout, options) {
    const keepImage = !!(options && options.keepImage === true);
    const initialized = faceDriver.isInitialized();
    const wasRunning = faceDriver.isRunning();
    const previousEventScene = initialized ? faceDriver.getEventScene() : '';
    let result;
    try {
        if (initialized) {
            // 暂停再恢复会清空组件重检计时，确保拍照页不受静默期识别结果影响。
            faceDriver.setEventScene('');
            if (wasRunning) faceDriver.setStatus(false);
            faceDriver.setStatus(true);
        }
        result = normalizeCapture(await faceDriver.getFeaByCap(timeout || 15000));
    } finally {
        if (initialized && faceDriver.isInitialized()) {
            try {
                if (faceDriver.isRunning() !== wasRunning) {
                    faceDriver.setStatus(wasRunning);
                }
            } catch (e) {
                dxLogger.error('face_domain.capture restore status failed: ' + e.message);
            }
            try {
                faceDriver.setEventScene(previousEventScene);
            } catch (e) {
                dxLogger.error('face_domain.capture restore scene failed: ' + e.message);
            }
        }
    }

    let code = '';
    try {
        assertFeature(result.feature);
        if (result.picPath.indexOf(CAPTURE_PREFIX) !== 0 || !dxStd.existSync(result.picPath)) {
            throw new AppError('300000', '人脸抓拍图片不存在');
        }
        code = dxCommonUtils.fs.fileToBase64(result.picPath);
    } catch (e) {
        if (result && result.picPath) faceDomain.releaseCapture(result.picPath);
        throw e;
    }

    const picPath = keepImage ? result.picPath : '';
    if (!keepImage) faceDomain.releaseCapture(result.picPath);
    return {
        code: code,
        feature: result.feature,
        picPath: picPath,
        qualityScore: result.qualityScore,
        rect: result.rect,
    };
};

faceDomain.featureOf = async function (voucher) {
    if (!isFace(voucher)) return '';
    if (voucher.feature) return assertFeature(voucher.feature);
    const faceType = Number(voucher.extra && voucher.extra.faceType);
    return faceType === 0 ? await faceDomain.extract(voucher.code) : assertFeature(voucher.code);
};

/*
 * SQLite、图片文件和人脸特征库无法组成同一个原子事务。
 * 调用方先执行change，再提交SQLite；SQLite失败时必须调用返回的rollback补偿特征库。
 */
faceDomain.change = async function (current, next) {
    const oldFace = isFace(current);
    const newFace = isFace(next);
    if (!oldFace && !newFace) return async function () {};

    const oldFeature = oldFace ? await faceDomain.featureOf(current) : '';
    const newFeature = newFace ? await faceDomain.featureOf(next) : '';
    if (!oldFace) {
        faceDomain.register(next.userId, newFeature);
        return async function () { faceDomain.remove(next.userId); };
    }
    if (!newFace) {
        faceDomain.remove(current.userId);
        return async function () { faceDomain.register(current.userId, oldFeature); };
    }
    if (current.userId === next.userId) {
        faceDomain.update(next.userId, newFeature);
        return async function () { faceDomain.update(current.userId, oldFeature); };
    }

    faceDomain.remove(current.userId);
    try {
        faceDomain.register(next.userId, newFeature);
    } catch (e) {
        faceDomain.register(current.userId, oldFeature);
        throw e;
    }
    return async function () {
        faceDomain.remove(next.userId);
        faceDomain.register(current.userId, oldFeature);
    };
};

export default faceDomain;
