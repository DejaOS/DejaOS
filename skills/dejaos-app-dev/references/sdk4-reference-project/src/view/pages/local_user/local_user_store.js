/**
 * @layer    view
 * @module   local_user_store
 * @depends  event_bus,core/commands
 *
 * UI只负责字段映射；人员、凭证和权限的一致性由Service/Domain保证。
 */

import eventBus from '../../../core/event_bus.js';
import commands from '../../../core/commands.js';

function toLocalUser(person) {
    return {
        id: person.userId,
        name: person.name || '',
        type: Number(person.type) === 1 ? 1 : 0,
        idCard: person.idCard || '',
        department: person.department || '',
        employeeNo: person.employeeNo || '',
        face: !!person.face,
        facePicPath: person.facePicPath || '',
        fingerprint: !!(person.fingerprint || person.finger),
        fingerprintIndex: person.fingerprintIndex != null ? Number(person.fingerprintIndex) : null,
        password: person.password || '',
        card: person.card || '',
        dualVerify: person.dualVerify || { mode: 'any', userIds: [] },
    };
}

const localUserStore = {};

localUserStore.getVerifyMode = async function () {
    const config = await eventBus.execute(commands.GET_CONFIG, ['access']);
    return Number(config && config.access && config.access.verifyMode) || 0;
};

localUserStore.list = async function (page, size, keyword) {
    const result = await eventBus.execute(commands.GET_USER, {
        page: page,
        size: size,
        keyword: String(keyword || '').trim(),
    });
    return {
        users: (result.content || []).map(toLocalUser),
        page: result.page,
        total: result.total,
        totalPage: result.totalPage,
    };
};

localUserStore.get = async function (id) {
    return toLocalUser(await eventBus.execute(commands.GET_USER_PROFILE, {
        userId: String(id || '').trim(),
    }));
};

localUserStore.save = async function (user, create) {
    await eventBus.execute(commands.SAVE_USER_PROFILE, {
        userId: String(user && user.id || '').trim(),
        name: String(user && user.name || '').trim(),
        type: Number(user && user.type) === 1 ? 1 : 0,
        idCard: String(user && user.idCard || '').trim(),
        department: String(user && user.department || '').trim(),
        employeeNo: String(user && user.employeeNo || '').trim(),
        password: String(user && user.password || ''),
        card: String(user && user.card || '').trim(),
        face: user && user.face,
        fingerprint: user && user.fingerprint,
        dualVerify: user && user.dualVerify,
        create: create === true,
    });
    return true;
};

localUserStore.captureCard = function () {
    return eventBus.execute(commands.CAPTURE_CARD, {});
};

localUserStore.cancelCardCapture = function () {
    return eventBus.execute(commands.CANCEL_CARD_CAPTURE, {}).catch(function () {
        return false;
    });
};

/** 人脸录入页只采集临时图片和特征，不提前修改正式特征库。 */
localUserStore.captureFace = async function () {
    const result = await eventBus.execute(commands.CAPTURE_FACE, {
        timeout: 15000,
        keepImage: true,
    });
    return {
        code: result.code,
        feature: result.feature,
        picPath: result.picPath || '',
        qualityScore: result.qualityScore || 0,
        rect: result.rect || null,
    };
};

/** 注册页开启全局四角跟踪框（ENROLL 场景）。 */
localUserStore.startFaceEnroll = function () {
    return eventBus.execute(commands.START_FACE_ENROLL, {}).catch(function () {
        return false;
    });
};

/** 离开注册页关闭跟踪框。 */
localUserStore.pauseFaceEnroll = function () {
    return eventBus.execute(commands.PAUSE_FACE_ENROLL, {}).catch(function () {
        return false;
    });
};

/** 释放尚未保存的UI抓拍临时照片；正式人员照片会被Domain拒绝删除。 */
localUserStore.releaseFacePhoto = async function (path) {
    const picPath = String(path || '').trim();
    if (!picPath) return false;
    try {
        return await eventBus.execute(commands.RELEASE_FACE_CAPTURE, picPath);
    } catch (_e) {
        return false;
    }
};

localUserStore.remove = async function (id) {
    await eventBus.execute(commands.DELETE_USER_PROFILE, {
        userId: String(id || '').trim(),
    });
    return true;
};

/** 批量Domain把单项失败放在detail中，UI优先展示最内层真实原因。 */
localUserStore.errorMessage = function (error) {
    const detail = error && error.detail;
    if (Array.isArray(detail) && detail.length > 0) {
        const item = detail[0];
        if (item && item.errmsg) return String(item.errmsg);
        if (item && item.message) return String(item.message);
    }
    if (detail && detail.errmsg) return String(detail.errmsg);
    if (detail && detail.message) return String(detail.message);
    return error && error.message ? String(error.message) : String(error || '');
};

localUserStore.errorKey = function (error) {
    const message = localUserStore.errorMessage(error);
    if (message.indexOf('already exists') >= 0) return 'duplicate';
    if (message.indexOf('not found') >= 0) return 'notFound';
    if (message.indexOf('卡片凭证已存在') >= 0) return 'cardDuplicate';
    if (message.indexOf('密码凭证已存在') >= 0) return 'passwordDuplicate';
    return 'failed';
};

export default localUserStore;