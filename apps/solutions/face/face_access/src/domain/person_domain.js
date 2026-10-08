/**
 * @layer domain @module person_domain
 * @depends storage/data/person,storage/data/voucher,storage/data/permission,storage/data/data,dxStd,data_utils
 */

import personStorage from '../storage/data/person.js';
import voucherStorage from '../storage/data/voucher.js';
import permissionStorage from '../storage/data/permission.js';
import dataStorage from '../storage/data/data.js';
import voucherDomain from './voucher_domain.js';
import voucherTypes from '../core/voucher_types.js';
import { AppError } from '../core/error.js';
import { isObject, requireId, requireText, pageOf, pageResult, runBatch } from '../utils/data_utils.js';

function normalize(person) {
    if (!isObject(person)) throw new AppError('200000', '人员数据必须是对象');
    const permissionIds = person.permissionIds === undefined ? [] : person.permissionIds;
    if (!Array.isArray(permissionIds)) throw new AppError('200000', 'permissionIds必须是数组');
    const userId = requireId(person.userId, 'userId');
    const extra = Object.assign({}, isObject(person.extra) ? person.extra : {});
    extra.dualVerify = normalizeDualVerify(extra.dualVerify, userId);
    return {
        userId: userId,
        name: requireText(person.name, 'name', 128),
        extra: extra,
        permissionIds: permissionIds.map(function (id) { return requireId(id, 'permissionId'); }),
    };
}

const personDomain = {};

function toProtocol(person) {
    return {
        userId: person.userId,
        name: person.name,
        extra: person.extra,
        permissionIds: person.permissionIds,
    };
}

const FACE_TYPE = voucherTypes.FACE;
const FINGER_TYPE = voucherTypes.FINGER;
const LOCAL_SOURCE = 'local_user';
const LOCAL_EDIT_TYPES = [].concat(
    voucherTypes.GROUPS.code,
    voucherTypes.GROUPS.card,
    voucherTypes.GROUPS.password
);

const DUAL_VERIFY_MODE = {
    ANY: 'any',
    SPECIFIED: 'specified',
    NONE: 'none',
};

/** 双人核验策略跟随人员保存；缺少配置时按“任意其他人员”处理。 */
function normalizeDualVerify(value, selfId) {
    const source = isObject(value) ? value : {};
    const mode = source.mode === DUAL_VERIFY_MODE.SPECIFIED || source.mode === DUAL_VERIFY_MODE.NONE
        ? source.mode : DUAL_VERIFY_MODE.ANY;
    const ids = Array.isArray(source.userIds) ? source.userIds : [];
    const userIds = [];
    for (let i = 0; i < ids.length; i++) {
        const id = requireId(ids[i], 'dualVerify.userId');
        if (id === selfId) throw new AppError('200000', '核验人员不能选择自己');
        if (userIds.indexOf(id) < 0) userIds.push(id);
    }
    if (mode === DUAL_VERIFY_MODE.SPECIFIED && userIds.length === 0) {
        throw new AppError('200000', '指定核验人员不能为空');
    }
    return { mode: mode, userIds: mode === DUAL_VERIFY_MODE.SPECIFIED ? userIds : [] };
}

async function normalizeProfile(input) {
    if (!isObject(input)) throw new AppError('200000', '人员档案必须是对象');
    const idCard = input.idCard === undefined ? '' : input.idCard;
    const department = input.department === undefined ? '' : input.department;
    const employeeNo = input.employeeNo === undefined ? '' : input.employeeNo;

    const typeRaw = input.type === undefined || input.type === null || input.type === ''
        ? 0
        : Number(input.type);
    if (typeof idCard !== 'string' || idCard.length > 128) throw new AppError('200000', 'idCard格式错误');
    if (typeof department !== 'string' || department.length > 128) throw new AppError('200000', 'department格式错误');
    if (typeof employeeNo !== 'string' || employeeNo.length > 128) throw new AppError('200000', 'employeeNo格式错误');

    if (typeRaw !== 0 && typeRaw !== 1) throw new AppError('200000', 'type必须是0或1');
    const face = input.face === undefined ? undefined : input.face;
    if (face !== undefined && face !== true && face !== false &&
        (!isObject(face) || typeof face.code !== 'string' || !face.code ||
            (face.feature !== undefined && (typeof face.feature !== 'string' || !face.feature)))) {
        throw new AppError('200000', '人脸采集数据格式错误');
    }
    const fingerprint = input.fingerprint === undefined ? undefined : input.fingerprint;
    if (fingerprint !== undefined && fingerprint !== true && fingerprint !== false) {
        if (!isObject(fingerprint)) {
            throw new AppError('200000', '指纹采集数据格式错误');
        }
        // MZ 允许 0，ZAZ 从 1 起；细粒度合法性由 voucher/finger 写入链路校验。
        const idx = fingerprint.index;
        const hasIndex = idx != null && Number.isInteger(Number(idx)) && Number(idx) >= 0;
        const feature = fingerprint.feature != null ? String(fingerprint.feature) : '';
        const hasFeature = /^[0-9a-fA-F]+$/.test(feature) && feature.length >= 64;
        if (!hasIndex && !hasFeature) {
            throw new AppError('200000', '指纹采集数据格式错误');
        }
    }
    const userId = requireId(input.userId, 'userId');
    return {
        userId: userId,
        name: requireText(input.name, 'name', 128),
        idCard: idCard.trim(),
        department: department.trim(),
        employeeNo: employeeNo.trim(),
        credentialChanges: input.credentialChanges === undefined
            ? { upserts: [], removeKeyIds: [] }
            : input.credentialChanges,
        type: typeRaw,
        create: input.create === true,
        face: face,
        fingerprint: fingerprint,
        // 旧客户端不会提交该字段；保留undefined，由修改流程继承已有策略。
        dualVerify: input.dualVerify === undefined
            ? undefined : normalizeDualVerify(input.dualVerify, userId),
    };
}

async function vouchersOf(userId, tx) {
    const total = await voucherStorage.count({ userId: userId }, tx);
    return total ? await voucherStorage.list({ userId: userId }, 0, total, tx) : [];
}

function firstVoucher(vouchers, type) {
    for (let i = 0; i < vouchers.length; i++) {
        if (vouchers[i].type === type) return vouchers[i];
    }
    return null;
}

async function ensurePermanentPermission(userId, tx) {
    const current = await permissionStorage.get(userId, tx);
    if (current) {
        if (current.timeType !== 0) {
            throw new AppError('200000', '默认永久权限ID与现有权限冲突');
        }
        return;
    }
    // 延续2.0本地人员约定：permissionId与userId一致，timeType=0表示永久有效。
    await permissionStorage.insert({
        permissionId: userId,
        door: 0,
        timeType: 0,
        beginTime: 0,
        endTime: 0,
        period: null,
        extra: { source: LOCAL_SOURCE },
    }, tx);
}

function isLocalEditable(voucher) {
    return !!voucher && LOCAL_EDIT_TYPES.indexOf(String(voucher.type)) >= 0;
}

function localCredentials(vouchers) {
    return vouchers.filter(isLocalEditable).map(function (voucher) {
        return {
            keyId: voucher.keyId,
            type: voucher.type,
            code: voucher.code,
            extra: voucher.extra || {},
        };
    });
}

function toProfile(person, vouchers) {
    const type = person.extra && Number(person.extra.type) === 1 ? 1 : 0;
    const face = firstVoucher(vouchers, FACE_TYPE);
    const finger = firstVoucher(vouchers, FINGER_TYPE);
    return {
        userId: person.userId,
        name: person.name,
        type: type,
        idCard: person.extra && person.extra.idCard ? String(person.extra.idCard) : '',
        department: person.extra && person.extra.department ? String(person.extra.department) : '',
        employeeNo: person.extra && person.extra.employeeNo ? String(person.extra.employeeNo) : '',
        credentials: localCredentials(vouchers),
        face: !!face,
        facePicPath: face && face.extra && Number(face.extra.faceType) === 0 ? face.code : '',
        fingerprint: !!finger,
        fingerprintIndex: finger ? Number(finger.code) : null,
        dualVerify: normalizeDualVerify(person.extra && person.extra.dualVerify, person.userId),
    };
}

personDomain.getProfile = async function (input) {
    const userId = requireId(typeof input === 'string' ? input : input && input.userId, 'userId');
    const person = await personStorage.get(userId);
    if (!person) throw new AppError('200000', 'person not found');
    return toProfile(person, await vouchersOf(userId));
};

async function restoreLocalCredentials(userId, vouchers, tx) {
    const current = await vouchersOf(userId, tx);
    for (let i = 0; i < current.length; i++) {
        if (isLocalEditable(current[i])) await voucherStorage.remove(current[i].keyId, tx);
    }
    for (let i = 0; i < vouchers.length; i++) await voucherStorage.insert(vouchers[i], tx);
}

async function restoreProfile(profile, snapshot) {
    await dataStorage.transaction(async function (tx) {
        if (snapshot) {
            await personStorage.update(snapshot.person, tx);
            await restoreLocalCredentials(profile.userId, snapshot.credentials, tx);
            // 保存前不存在的本地永久权限也属于本次操作，失败时一并回滚。
            if (!snapshot.permission) {
                const permission = await permissionStorage.get(profile.userId, tx);
                if (permission && permission.extra && permission.extra.source === LOCAL_SOURCE) {
                    await permissionStorage.remove(profile.userId, tx);
                }
            }
            return;
        }
        await voucherStorage.removeByUser(profile.userId, tx);
        await personStorage.remove(profile.userId, tx);
        const permission = await permissionStorage.get(profile.userId, tx);
        if (permission && permission.extra && permission.extra.source === LOCAL_SOURCE) {
            await permissionStorage.remove(profile.userId, tx);
        }
    });
}
personDomain.saveProfile = async function (input) {
    const profile = await normalizeProfile(input);
    const beforePerson = await personStorage.get(profile.userId);
    const beforeVouchers = beforePerson ? await vouchersOf(profile.userId) : [];
    const snapshot = beforePerson ? {
        person: beforePerson,
        credentials: beforeVouchers.filter(isLocalEditable),
        permission: await permissionStorage.get(profile.userId),
    } : null;
    // credentialChanges在人员事务内执行，密码策略必须提前读取，避免嵌套SQLite队列自锁。
    const passwordLength = await voucherDomain.getPasswordLength();

    await dataStorage.transaction(async function (tx) {
        const current = await personStorage.get(profile.userId, tx);
        if (profile.create && current) throw new AppError('200000', 'person already exists');
        if (!profile.create && !current) throw new AppError('200000', 'person not found');
        const dualVerify = profile.dualVerify === undefined
            ? normalizeDualVerify(current && current.extra ? current.extra.dualVerify : null, profile.userId)
            : profile.dualVerify;

        await ensurePermanentPermission(profile.userId, tx);
        const permissionIds = current ? current.permissionIds.slice() : [];
        if (permissionIds.indexOf(profile.userId) < 0) permissionIds.push(profile.userId);
        const person = {
            userId: profile.userId,
            name: profile.name,
            extra: Object.assign({}, current ? current.extra : {}, {
                idCard: profile.idCard,
                type: profile.type,
                department: profile.department,
                employeeNo: profile.employeeNo,
                dualVerify: dualVerify,
            }),
            permissionIds: permissionIds,
        };
        if (current) await personStorage.update(person, tx);
        else await personStorage.insert(person, tx);
        await voucherDomain.applyLocalChanges(profile.userId, profile.credentialChanges, tx, passwordLength);
    });

    try {
        await voucherDomain.syncLocalFace(profile.userId, profile.face);
        await voucherDomain.syncLocalFinger(profile.userId, profile.fingerprint);
    } catch (e) {
        // 人脸/指纹硬件不属于SQLite事务；失败时恢复本次已提交的人员和非生物凭证修改。
        try {
            await restoreProfile(profile, snapshot);
        } catch (rollbackError) {
            e.profileRollbackError = rollbackError;
        }
        throw e;
    }
    return true;
};

async function permissionUsedByOtherPerson(permissionId, userId, tx) {
    const total = await personStorage.count({}, tx);
    if (!total) return false;
    const persons = await personStorage.list({}, 0, total, tx);
    return persons.some(function (person) {
        return person.userId !== userId && person.permissionIds.indexOf(permissionId) >= 0;
    });
}

personDomain.removeProfile = async function (input) {
    const userId = requireId(typeof input === 'string' ? input : input && input.userId, 'userId');
    if (!await personStorage.get(userId)) throw new AppError('200000', 'person not found');
    // 先由voucher_domain同步删除特征库、凭证和图片，再删除人员，避免遗留可识别孤儿特征。
    await voucherDomain.removePersonData(userId, async function (tx) {
        await personStorage.remove(userId, tx);
        const permission = await permissionStorage.get(userId, tx);
        if (permission && permission.timeType === 0 && permission.extra &&
            permission.extra.source === LOCAL_SOURCE &&
            !await permissionUsedByOtherPerson(userId, userId, tx)) {
            await permissionStorage.remove(userId, tx);
        }
    });
    return true;
};

personDomain.insert = async function (items) {
    return await runBatch(items, 'userId', async function (item) {
        const person = normalize(item);
        const current = await personStorage.get(person.userId);
        if (current) await personStorage.update(person);
        else await personStorage.insert(person);
    });
};

personDomain.modify = async function (items) {
    return await runBatch(items, 'userId', async function (item) {
        const userId = requireId(item && item.userId, 'userId');
        const current = await personStorage.get(userId);
        if (!current) throw new AppError('200000', 'person not found');
        // 协议旧版本只提交已知字段；合并extra可避免新增策略被旧请求静默覆盖。
        const person = normalize(Object.assign({}, item, {
            extra: Object.assign({}, current.extra || {}, isObject(item.extra) ? item.extra : {}),
        }));
        await personStorage.update(person);
    });
};

personDomain.remove = async function (userIds) {
    return await runBatch(userIds, 'userId', async function (item) {
        const userId = requireId(typeof item === 'string' ? item : item.userId, 'userId');
        if (!await personStorage.get(userId)) throw new AppError('200000', 'person not found');
        await voucherDomain.removePersonData(userId, function (tx) {
            return personStorage.remove(userId, tx);
        });
    });
};

personDomain.clear = async function () {
    await voucherDomain.clearPersonData(function (tx) {
        return personStorage.clear(tx);
    });
    return true;
};

personDomain.query = async function (input) {
    const data = input || {};
    const paging = pageOf(data, 100);
    const filters = { userId: data.userId, name: data.name, keyword: data.keyword };
    const total = await personStorage.count(filters);
    const content = (await personStorage.list(filters, paging.page, paging.size)).map(toProtocol);
    return pageResult(content, paging.page, paging.size, total);
};

personDomain.get = async function (userId) {
    return await personStorage.get(requireId(userId, 'userId'));
};

personDomain.DUAL_VERIFY_MODE = DUAL_VERIFY_MODE;

/** 给组合核验Domain提供稳定语义，调用方不需要理解人员extra结构。 */
personDomain.getDualVerifyPolicy = function (person) {
    if (!person || !person.userId) return normalizeDualVerify(null, '');
    return normalizeDualVerify(person.extra && person.extra.dualVerify, String(person.userId));
};

personDomain.count = async function () {
    return Number(await personStorage.count({})) || 0;
};

export default personDomain;
