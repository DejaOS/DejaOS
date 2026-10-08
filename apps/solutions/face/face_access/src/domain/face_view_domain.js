/**
 * @layer domain
 * @module face_view_domain
 * @depends os_driver,view/ui_driver
 *
 * 人脸框展示模型：保存短时检测/识别结果并生成UI模型。Service只转交事实事件，
 * 不长期保存人脸列表、识别分数或展示状态。
 */

import osDriver from '../drivers/os_driver.js';
import uiDriver from '../view/ui_driver.js';

const RESULT_HOLD_MS = 1500;
const SCORE_HOLD_MS = 2000;
let lastFaces = [];
const resultById = new Map();
const compareById = new Map();
let fallbackResult = null;

function toFaceList(payload) {
    const data = payload && Object.prototype.hasOwnProperty.call(payload, 'data')
        ? payload.data : payload;
    if (data == null) return [];
    if (Array.isArray(data)) return data;
    if (typeof data !== 'object') return [];
    if (Array.isArray(data.rect) && data.rect.length >= 4 && typeof data.rect[0] === 'number') {
        return [data];
    }
    if (Array.isArray(data.rect)) return data.rect;
    if (data.rect && typeof data.rect === 'object') return [data];
    if (Array.isArray(data.faces)) return data.faces;
    if (data.x != null || data.w != null || data.width != null) return [data];
    return [];
}

function faceId(item) {
    if (!item || item.id === undefined || item.id === null) return '';
    return String(item.id);
}

function prune() {
    const now = osDriver.getUptimeMs();
    resultById.forEach(function (value, key) {
        if (!value || value.until <= now) resultById.delete(key);
    });
    compareById.forEach(function (value, key) {
        if (!value || value.until <= now) compareById.delete(key);
    });
    if (fallbackResult && fallbackResult.until <= now) fallbackResult = null;
}

function stateOf(item, policy) {
    prune();
    const id = faceId(item);
    const result = (id && resultById.get(id)) || fallbackResult;
    if (result) return result.state;
    const score = Number(item && item.livingScore);
    if (policy.enabled && Number.isFinite(score) && score >= policy.threshold) return 'live';
    return 'detecting';
}

/** 框旁算法分与通行上报共用：活体分来自检测脸，比对分来自识别缓存。 */
function scoresOf(item) {
    prune();
    const id = faceId(item);
    const livingScore = Number(item && item.livingScore);
    const compare = id ? compareById.get(id) : null;
    return {
        livingScore: Number.isFinite(livingScore) ? livingScore : null,
        compareScore: compare && Number.isFinite(Number(compare.score)) ? Number(compare.score) : null,
    };
}

function diagnosticOf(item, options) {
    if (!options.diagnosticEnabled) return null;
    const policy = options.policy;
    const scores = scoresOf(item);
    return {
        livenessEnabled: policy.enabled,
        livenessScore: scores.livingScore,
        livenessThreshold: policy.threshold,
        compareScore: scores.compareScore,
        compareThreshold: policy.compareThreshold,
    };
}

function paint(list, options, forceState) {
    const faces = [];
    for (let i = 0; i < list.length; i++) {
        const item = list[i];
        if (!item || typeof item !== 'object') continue;
        faces.push(Object.assign({}, item, {
            state: forceState || stateOf(item, options.policy),
            primaryText: item.primaryText || item.label || item.name || '',
            diagnostic: diagnosticOf(item, options),
        }));
    }
    if (!faces.length) {
        lastFaces = [];
        uiDriver.clearFaceBoxes();
        return false;
    }
    lastFaces = list.slice();
    uiDriver.showFaceBoxes(faces);
    return true;
}

const faceViewDomain = {};

faceViewDomain.showDetected = function (payload, options) {
    const list = toFaceList(payload);
    if (!list.length) {
        faceViewDomain.clear();
        return false;
    }
    return paint(list, options);
};

faceViewDomain.showRecognized = function (payload, options) {
    const face = payload && payload.data ? payload.data : {};
    const failed = face.isCompare === false || !face.userId;
    const id = faceId(face);
    const now = osDriver.getUptimeMs();
    const compareScore = Number(face.compareScore);
    if (id && Number.isFinite(compareScore)) {
        compareById.set(id, { score: compareScore, until: now + SCORE_HOLD_MS });
    }
    const result = { state: failed ? 'failed' : 'matched', until: now + RESULT_HOLD_MS };
    if (id) resultById.set(id, result);
    else fallbackResult = result;
    if (lastFaces.length) return paint(lastFaces, options, id ? undefined : result.state);
    if (face.rect) return paint([face], options, result.state);
    return false;
};

/** 按人脸 id 取与框旁相同的分数（最近检测帧 + 识别缓存）。 */
faceViewDomain.scoresOf = function (id) {
    const key = id === undefined || id === null ? '' : String(id);
    for (let i = 0; i < lastFaces.length; i++) {
        const item = lastFaces[i];
        if (item && (!key || faceId(item) === key)) return scoresOf(item);
    }
    return scoresOf(key ? { id: key } : null);
};

faceViewDomain.clear = function () {
    lastFaces = [];
    resultById.clear();
    compareById.clear();
    fallbackResult = null;
    return uiDriver.clearFaceBoxes();
};

faceViewDomain.destroy = function () {
    faceViewDomain.clear();
};

export default faceViewDomain;