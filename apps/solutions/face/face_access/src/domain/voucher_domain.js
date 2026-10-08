/**
 * @layer domain @module voucher_domain
 * @depends storage/data/voucher,storage/data/person,face_domain,finger_domain,dxCommonUtils,dxStd,dxLogger,data_utils
 *
 * 人脸凭证以SQLite为业务索引，以dxFacial特征库为识别数据源；图片源文件统一存放/data。
 */

import dxCommonUtils from '../../dxmodules/dxCommonUtils.js';
import dxStd from '../../dxmodules/dxStd.js';
import dxLogger from '../../dxmodules/dxLogger.js';
import voucherStorage from '../storage/data/voucher.js';
import personStorage from '../storage/data/person.js';
import dataStorage from '../storage/data/data.js';
import configStorage from '../storage/config/config.js';
import faceDomain from './face_domain.js';
import fingerDomain from './finger_domain.js';
import voucherTypes from '../core/voucher_types.js';
import { AppError } from '../core/error.js';
import { isObject, requireId, requireText, requireArray, pageOf, pageResult, runBatch } from '../utils/data_utils.js';

const FACE_TYPE = voucherTypes.FACE;
const FINGER_TYPE = voucherTypes.FINGER;
const LOCAL_EDIT_TYPES = [].concat(
    voucherTypes.GROUPS.code,
    voucherTypes.GROUPS.card,
    voucherTypes.GROUPS.password
);
const PASSWORD_LENGTHS = [4, 6, 8];
const MAX_BASE64_FACE_BYTES = 512 * 1024;

function normalizePasswordLength(value) {
    const length = Number(value);
    return PASSWORD_LENGTHS.indexOf(length) >= 0 ? length : 6;
}

async function getPasswordLength() {
    return normalizePasswordLength(await configStorage.get('sys.passwordLength', 6));
}

async function validatePasswordCode(code, allowEmpty, resolvedLength) {
    if (allowEmpty && code === '') return true;
    // 批量保存位于SQLite事务内，必须复用事务外预读取的配置，禁止嵌套进入同一SQLite队列。
    const length = resolvedLength === undefined
        ? await getPasswordLength()
        : normalizePasswordLength(resolvedLength);
    const pattern = new RegExp('^\\d{' + length + '}$');
    if (!pattern.test(code)) throw new AppError('200000', '密码凭证必须是' + length + '位数字');
    return true;
}

function isFace(voucher) {
    return !!voucher && String(voucher.type) === FACE_TYPE;
}

function isFinger(voucher) {
    return !!voucher && String(voucher.type) === FINGER_TYPE;
}

/** 云端下发的指纹特征为长十六进制串；设备索引为短数字字符串。 */
function isFingerTemplateCode(code) {
    return typeof code === 'string' && /^[0-9a-fA-F]+$/.test(code) && code.length >= 64;
}

function isImageFace(voucher) {
    return isFace(voucher) && voucher.extra && Number(voucher.extra.faceType) === 0;
}

function base64DecodedByteLength(code) {
    if (typeof code !== 'string' || !code) return 0;
    let padding = 0;
    if (code.endsWith('==')) padding = 2;
    else if (code.endsWith('=')) padding = 1;
    return Math.floor((code.length * 3) / 4) - padding;
}

/** 解码前 3 字节校验 JPEG SOI（FF D8 FF）；仅看文件头，不依赖 MIME/扩展名。 */
function isJpegBase64(code) {
    if (typeof code !== 'string' || !code) return false;
    const clean = code.replace(/\s+/g, '');
    if (clean.length < 4) return false;
    try {
        const bytes = new Uint8Array(dxCommonUtils.codec.base64ToArrayBuffer(clean.slice(0, 4)));
        return bytes.length >= 3 && bytes[0] === 0xFF && bytes[1] === 0xD8 && bytes[2] === 0xFF;
    } catch (_error) {
        return false;
    }
}

function validateBase64FaceInsertBatch(items, batchLength) {
    let base64FaceCount = 0;
    for (let i = 0; i < items.length; i++) {
        const item = items[i];
        if (!isObject(item) || !isImageFace(item)) continue;
        // 修改时未换图会沿用 /data/... 路径，不走 Base64 预检。
        if (typeof item.code === 'string' && item.code.indexOf('/data/') === 0) continue;
        base64FaceCount++;
        if (!isJpegBase64(item.code)) {
            throw new AppError('200000', '人脸图片只支持jpg格式');
        }
        if (base64DecodedByteLength(item.code) > MAX_BASE64_FACE_BYTES) {
            throw new AppError('200000', '人脸图片base64大小不能超过512KB');
        }
    }
    const size = Number.isInteger(batchLength) ? batchLength : items.length;
    if (base64FaceCount > 0 && size > 1) {
        throw new AppError('200000', 'base64人脸凭证一次只能下发一条');
    }
}

function coerceVoucherType(rawType) {
    if (typeof rawType === 'string') return rawType;
    // 协议/平台常传数字 300；QuickJS JSON 也可能给出可转字符串的数值。
    if (typeof rawType === 'number' && Number.isFinite(rawType)) return String(rawType);
    if (typeof rawType === 'boolean') return rawType ? '1' : '0';
    return '';
}

async function normalize(item, current, passwordLength) {
    if (!isObject(item)) throw new AppError('200000', '凭证数据必须是对象');
    const rawType = item.type === undefined && current ? current.type : item.type;
    const typeText = coerceVoucherType(rawType);
    if (!typeText) {
        dxLogger.error('voucher type invalid: typeof=' + typeof rawType
            + ' value=' + (rawType === undefined ? 'undefined' : JSON.stringify(rawType)));
    }
    const type = requireText(typeText, 'type', 32);
    let code = item.code === undefined && current ? current.code : item.code;
    if (typeof code !== 'string' || code.length === 0) throw new AppError('200000', 'code不能为空');
    if (voucherTypes.isCard(type)) code = code.toUpperCase();
    if (type === voucherTypes.PASSWORD) await validatePasswordCode(code, false, passwordLength);
    const extra = item.extra === undefined && current ? current.extra : (isObject(item.extra) ? item.extra : {});
    if (type === FACE_TYPE && ![0, 1].includes(Number(extra.faceType))) {
        throw new AppError('200000', 'faceType只支持0或1');
    }
    return {
        keyId: requireId(item.keyId, 'keyId'),
        type: type,
        code: code,
        userId: requireId(item.userId === undefined && current ? current.userId : item.userId, 'userId'),
        extra: extra,
    };
}

function facePath(voucher) {
    return '/data/face_app/users/' + voucher.userId + '/' + voucher.keyId + '.jpg';
}

function removeSource(voucher) {
    if (isImageFace(voucher) && voucher.code.indexOf('/data/') === 0 && dxStd.existSync(voucher.code)) {
        dxStd.removeSync(voucher.code);
    }
}

function toProtocol(voucher) {
    const result = Object.assign({}, voucher);
    delete result.createdAt;
    delete result.updatedAt;
    if (isImageFace(result) && result.code.indexOf('/data/') === 0) {
        if (!dxStd.existSync(result.code)) throw new AppError('300000', 'face source file missing');
        result.code = dxCommonUtils.fs.fileToBase64(result.code);
    }
    return result;
}

function faceChanged(item, current, next) {
    if (!isFace(current) && !isFace(next)) return false;
    if (!current || !next || current.type !== next.type || current.userId !== next.userId) return true;
    const oldFaceType = Number(current.extra && current.extra.faceType);
    const nextFaceType = Number(next.extra && next.extra.faceType);
    return oldFaceType !== nextFaceType || Object.prototype.hasOwnProperty.call(item, 'code');
}

async function prepareFace(voucher, trustedFeature) {
    if (!isFace(voucher)) return { voucher: voucher, temp: '' };
    if (!isImageFace(voucher)) {
        voucher.feature = voucher.code;
        return { voucher: voucher, temp: '' };
    }
    const retainFaceImages = await configStorage.get('sys.faceImageRetention', 1) === 1;
    if (voucher.code.indexOf('/data/') === 0) {
        voucher.feature = trustedFeature || await faceDomain.extract(voucher.code);
        if (!retainFaceImages) {
            // 关闭照片留存后，新修改的人脸凭证只持久化特征值；已有未修改凭证保持原状。
            voucher.code = voucher.feature;
            voucher.extra = Object.assign({}, voucher.extra, { faceType: 1 });
        }
        return { voucher: voucher, temp: '' };
    }

    const finalPath = facePath(voucher);
    const tempPath = finalPath + '.tmp.' + dxStd.genRandomStr(8) + '.jpg';
    dxStd.ensurePathExists(tempPath);
    dxCommonUtils.fs.base64ToFile(tempPath, voucher.code);
    try {
        voucher.feature = trustedFeature || await faceDomain.extract(tempPath);
    } catch (e) {
        if (dxStd.existSync(tempPath)) dxStd.removeSync(tempPath);
        throw e;
    }
    if (!retainFaceImages) {
        voucher.code = voucher.feature;
        voucher.extra = Object.assign({}, voucher.extra, { faceType: 1 });
        // 特征已进入内存后原图便失去业务价值，立即删除可缩短隐私图片驻留时间。
        const removed = dxStd.removeSync(tempPath);
        if (removed !== 0) {
            throw new AppError('300000', '临时人脸图片清理失败，code=' + removed);
        }
        return { voucher: voucher, temp: '' };
    }
    voucher.code = finalPath;
    return { voucher: voucher, temp: tempPath };
}

function promoteFile(prepared) {
    if (!prepared.temp) return null;
    const finalPath = prepared.voucher.code;
    const backup = dxStd.existSync(finalPath) ? finalPath + '.bak.' + dxStd.genRandomStr(8) : '';
    if (backup && dxStd.renameSync(finalPath, backup) !== 0) {
        throw new AppError('300000', '人脸原图备份失败');
    }
    if (dxStd.renameSync(prepared.temp, finalPath) !== 0) {
        if (backup) dxStd.renameSync(backup, finalPath);
        throw new AppError('300000', '人脸原图保存失败');
    }
    return { finalPath: finalPath, backup: backup };
}

function rollbackFile(stage) {
    if (!stage) return;
    if (dxStd.existSync(stage.finalPath)) dxStd.removeSync(stage.finalPath);
    if (stage.backup && dxStd.existSync(stage.backup)) {
        dxStd.renameSync(stage.backup, stage.finalPath);
    }
}

function commitFile(stage) {
    if (stage && stage.backup && dxStd.existSync(stage.backup)) {
        dxStd.removeSync(stage.backup);
    }
}

async function compensate(rollback, error) {
    if (!rollback) return;
    try {
        await rollback();
    } catch (rollbackError) {
        if (error && typeof error === 'object') error.faceRollbackError = rollbackError;
    }
}

async function validateReferences(voucher, tx) {
    if (!await personStorage.get(voucher.userId, tx)) throw new AppError('200000', 'person not found');
    const duplicate = await voucherStorage.findByCode(voucher.type, voucher.code, tx);
    if (duplicate && duplicate.keyId !== voucher.keyId) throw new AppError('200000', 'Duplicate vouchers');
    if (voucher.type === FACE_TYPE || voucher.type === FINGER_TYPE) {
        const userVoucher = await voucherStorage.findByUserType(voucher.userId, voucher.type, tx);
        if (userVoucher && userVoucher.keyId !== voucher.keyId) {
            throw new AppError('200000', 'user already has this biometric voucher');
        }
    }
}

function assertUnchanged(before, current) {
    if ((!before && current) || (before && (!current || before.updatedAt !== current.updatedAt))) {
        throw new AppError('100000', 'voucher changed concurrently');
    }
}

async function save(item, mustExist, trustedFeature) {
    const keyId = requireId(item && item.keyId, 'keyId');
    const current = await voucherStorage.get(keyId);
    if (mustExist && !current) throw new AppError('200000', 'voucher not found');

    let oldSource = null;
    let prepared = null;
    let stage = null;
    let rollback = null;
    let fingerIndexToDelete = null;
    try {
        if (mustExist && item.code === '') {
            rollback = await faceDomain.change(current, null);
            if (isFinger(current)) fingerIndexToDelete = Number(current.code);
            await dataStorage.transaction(async function (tx) {
                const fresh = await voucherStorage.get(keyId, tx);
                assertUnchanged(current, fresh);
                await voucherStorage.remove(keyId, tx);
            });
            if (fingerDomain.isActive() && fingerDomain.isValidIndex(fingerIndexToDelete)) {
                await fingerDomain.deleteIndex(fingerIndexToDelete);
            }
            oldSource = current;
        } else {
            // insert保持现有upsert语义；modify允许未提交字段沿用当前值。
            let voucher = await normalize(item, mustExist ? current : null);
            const changed = faceChanged(item, current, voucher);
            if (isImageFace(voucher) && voucher.code.indexOf('/data/') === 0 &&
                (!current || Object.prototype.hasOwnProperty.call(item, 'code'))) {
                throw new AppError('200000', '人脸图片必须使用Base64传入');
            }

            // 指纹：云端特征入库前先写入模组，SQLite 只保存硬件索引。
            if (isFinger(voucher) && isFingerTemplateCode(voucher.code)) {
                if (!fingerDomain.isActive()) {
                    throw new AppError('200000', '指纹功能未启用');
                }
                const hex = voucher.code;
                const index = await fingerDomain.insertTemplate(hex);
                fingerIndexToDelete = index; // SQL 失败时回滚硬件
                voucher = Object.assign({}, voucher, {
                    code: String(index),
                    extra: Object.assign({}, voucher.extra, { fingerprint: hex }),
                });
            }

            if (changed) prepared = await prepareFace(voucher, trustedFeature);
            const next = prepared ? prepared.voucher : voucher;
            await validateReferences(next);
            if (changed) {
                rollback = await faceDomain.change(current, next);
                stage = promoteFile(prepared);
            }

            await dataStorage.transaction(async function (tx) {
                const fresh = await voucherStorage.get(keyId, tx);
                assertUnchanged(current, fresh);
                await validateReferences(next, tx);
                if (fresh) await voucherStorage.update(next, tx);
                else await voucherStorage.insert(next, tx);
            });
            fingerIndexToDelete = null;
            if (current && isFinger(current) && current.code !== next.code) {
                // 索引变更时删除旧模板；新模板已在上面写入。
                const oldIndex = Number(current.code);
                if (fingerDomain.isActive() && fingerDomain.isValidIndex(oldIndex)) {
                    try {
                        await fingerDomain.deleteIndex(oldIndex);
                    } catch (e) {
                        // 旧索引清理失败不回滚已成功的新凭证。
                    }
                }
            }
            if (current && (current.code !== next.code ||
                (isImageFace(current) && !isImageFace(next)))) {
                oldSource = current;
            }
        }
    } catch (e) {
        await compensate(rollback, e);
        rollbackFile(stage);
        if (prepared && prepared.temp && dxStd.existSync(prepared.temp)) dxStd.removeSync(prepared.temp);
        if (fingerIndexToDelete != null && fingerDomain.isActive()
            && fingerDomain.isValidIndex(fingerIndexToDelete)) {
            try {
                await fingerDomain.deleteIndex(fingerIndexToDelete);
            } catch (_e) {}
        }
        throw e;
    }
    commitFile(stage);
    if (oldSource) removeSource(oldSource);
}

async function removeRows(rows, work) {
    const rollbacks = [];
    const fingerRows = [];
    try {
        for (let i = 0; i < rows.length; i++) {
            if (isFace(rows[i])) rollbacks.push(await faceDomain.change(rows[i], null));
            if (isFinger(rows[i])) fingerRows.push(rows[i]);
        }
        await work();
        // SQLite 成功后再删模组，避免库表回滚后硬件索引悬空更难补偿。
        for (let i = 0; i < fingerRows.length; i++) {
            const index = Number(fingerRows[i].code);
            if (fingerDomain.isActive() && fingerDomain.isValidIndex(index)) {
                try {
                    await fingerDomain.deleteIndex(index);
                } catch (e) {
                    // 硬件清理失败不回滚已删除的业务凭证。
                }
            }
        }
    } catch (e) {
        for (let i = rollbacks.length - 1; i >= 0; i--) {
            await compensate(rollbacks[i], e);
        }
        throw e;
    }
    rows.forEach(removeSource);
}

const voucherDomain = {};

voucherDomain.getPasswordLength = getPasswordLength;
voucherDomain.validatePasswordCode = validatePasswordCode;

voucherDomain.insert = async function (items) {
    requireArray(items, 'items');
    validateBase64FaceInsertBatch(items);
    return await runBatch(items, 'keyId', function (item) {
        return faceDomain.exclusive(function () { return save(item, false); });
    });
};

voucherDomain.modify = async function (items) {
    requireArray(items, 'items');
    const passwordLength = await getPasswordLength();
    const forFacePrecheck = [];
    for (let i = 0; i < items.length; i++) {
        const item = items[i];
        // 空 code 表示删除凭证，不参与人脸图预检。
        if (!isObject(item) || item.code === '') {
            continue;
        }
        const keyId = item.keyId !== undefined && item.keyId !== null ? String(item.keyId) : '';
        const current = keyId ? await voucherStorage.get(keyId) : null;
        if (!current) {
            // 不存在的 key 留给 runBatch 按项失败，避免预检整批中断。
            forFacePrecheck.push(item);
            continue;
        }
        try {
            forFacePrecheck.push(await normalize(item, current, passwordLength));
        } catch (_e) {
            // 密码/faceType 等错误仍走 runBatch 部分成功语义，此处只为人脸 Base64 预检合并字段。
        }
    }
    validateBase64FaceInsertBatch(forFacePrecheck, items.length);
    return await runBatch(items, 'keyId', function (item) {
        return faceDomain.exclusive(function () { return save(item, true); });
    });
};

async function removeByKeyId(keyId) {
    const id = requireId(keyId, 'keyId');
    await faceDomain.exclusive(async function () {
        const current = await voucherStorage.get(id);
        if (!current) throw new AppError('200000', 'voucher not found');
        await removeRows([current], async function () {
            await dataStorage.transaction(async function (tx) {
                if (!await voucherStorage.get(id, tx)) throw new AppError('200000', 'voucher not found');
                await voucherStorage.remove(id, tx);
            });
        });
    });
}

voucherDomain.remove = async function (input) {
    const data = input || {};
    const errors = [];
    const keyIds = Array.isArray(data.keyIds) ? data.keyIds : [];
    const userIds = Array.isArray(data.userIds) ? data.userIds : [];
    if (keyIds.length + userIds.length > 100) {
        throw new AppError('200000', '批量数据不能超过100条');
    }

    // keyIds 与 userIds 同时提交时：先全部预检，任一失败则整单不删，避免报错后仍按正确项删除。
    const mixed = keyIds.length > 0 && userIds.length > 0;
    if (mixed) {
        for (let i = 0; i < keyIds.length; i++) {
            try {
                const keyId = requireId(keyIds[i], 'keyId');
                if (!await voucherStorage.get(keyId)) {
                    throw new AppError('200000', 'voucher not found');
                }
            } catch (e) {
                errors.push({ keyId: keyIds[i] || 'unknown', errmsg: e.message });
            }
        }
        for (let i = 0; i < userIds.length; i++) {
            try {
                const userId = requireId(userIds[i], 'userId');
                if (!(await voucherStorage.count({ userId: userId }))) {
                    throw new AppError('200000', 'user has no vouchers');
                }
            } catch (e) {
                errors.push({ userId: userIds[i] || 'unknown', errmsg: e.message });
            }
        }
        if (errors.length) {
            throw new AppError('100000', '部分数据处理失败', undefined, errors);
        }
        for (let i = 0; i < keyIds.length; i++) {
            await removeByKeyId(keyIds[i]);
        }
        // 可能与 keyIds 有交集，人员侧不再强制「仍有凭证」。
        for (let i = 0; i < userIds.length; i++) {
            await voucherDomain.removeByUser(userIds[i], false);
        }
        return true;
    }

    for (let i = 0; i < keyIds.length; i++) {
        try {
            await removeByKeyId(keyIds[i]);
        } catch (e) {
            errors.push({ keyId: keyIds[i] || 'unknown', errmsg: e.message });
        }
    }
    for (let i = 0; i < userIds.length; i++) {
        try {
            await voucherDomain.removeByUser(userIds[i], true);
        } catch (e) {
            errors.push({ userId: userIds[i] || 'unknown', errmsg: e.message });
        }
    }
    if (errors.length) throw new AppError('100000', '部分数据处理失败', undefined, errors);
    return true;
};

async function clearRows(afterClear) {
    await faceDomain.exclusive(async function () {
        const count = await voucherStorage.count({});
        const rows = count ? await voucherStorage.list({}, 0, count) : [];
        await removeRows(rows, async function () {
            await dataStorage.transaction(async function (tx) {
                await voucherStorage.clear(tx);
                if (afterClear) await afterClear(tx);
            });
        });
        // 清空凭证后顺带清空模组，避免遗留无法关联的模板。
        if (fingerDomain.isActive()) {
            try {
                await fingerDomain.clear();
            } catch (e) {
                // 不回滚已清空的 SQLite；打日志便于排查后续「指纹模板写入失败」。
                dxLogger.error('voucher_domain.clearRows: finger clear failed: '
                    + (e && e.message ? e.message : e));
            }
        }
    });
}

async function removeUserRows(userId, required, afterRemove) {
    const id = requireId(userId, 'userId');
    await faceDomain.exclusive(async function () {
        const count = await voucherStorage.count({ userId: id });
        const rows = count ? await voucherStorage.list({ userId: id }, 0, count) : [];
        if (required && !rows.length) throw new AppError('200000', 'user has no vouchers');
        await removeRows(rows, async function () {
            await dataStorage.transaction(async function (tx) {
                await voucherStorage.removeByUser(id, tx);
                if (afterRemove) await afterRemove(tx);
            });
        });
    });
}

voucherDomain.clear = async function () {
    await clearRows();
    return true;
};

voucherDomain.removeByUser = async function (userId, required) {
    await removeUserRows(userId, required);
};

// 人员删除/清空复用同一SQLite事务，同时保留人脸特征库失败补偿。
voucherDomain.removePersonData = function (userId, afterRemove) {
    return removeUserRows(userId, false, afterRemove);
};

voucherDomain.clearPersonData = function (afterClear) {
    return clearRows(afterClear);
};

voucherDomain.syncLocalFace = async function (userId, face) {
    const id = requireId(userId, 'userId');
    if (face === undefined || face === true) return;
    await faceDomain.exclusive(async function () {
        const current = await voucherStorage.findByUserType(id, FACE_TYPE);
        if (face === false || face === null) {
            if (current) {
                await removeRows([current], function () {
                    return dataStorage.transaction(function (tx) {
                        return voucherStorage.remove(current.keyId, tx);
                    });
                });
            }
            return;
        }
        if (!isObject(face) || typeof face.code !== 'string' || !face.code) {
            throw new AppError('200000', '人脸采集数据格式错误');
        }
        // 只有设备UI抓拍链路可复用可信特征；MQTT/HTTP图片仍必须重新检测。
        await save({
            keyId: current ? current.keyId : dxStd.genRandomStr(32),
            type: FACE_TYPE,
            code: face.code,
            userId: id,
            extra: { faceType: 0, source: 'local_user' },
        }, !!current, face.feature);
    });
};

/**
 * 本地人员档案指纹同步。
 * undefined/true 保持；false 删除；
 * { feature } 保存时写入模组并落索引凭证；{ index } 仅绑定已有硬件索引（合并保留 extra）。
 */
voucherDomain.syncLocalFinger = async function (userId, fingerprint) {
    const id = requireId(userId, 'userId');
    if (fingerprint === undefined || fingerprint === true) return;
    const current = await voucherStorage.findByUserType(id, FINGER_TYPE);
    if (fingerprint === false || fingerprint === null) {
        if (current) {
            await removeRows([current], function () {
                return dataStorage.transaction(function (tx) {
                    return voucherStorage.remove(current.keyId, tx);
                });
            });
        }
        return;
    }
    if (!isObject(fingerprint)) {
        throw new AppError('200000', '指纹采集数据格式错误');
    }
    const feature = fingerprint.feature != null ? String(fingerprint.feature) : '';
    const hasFeature = /^[0-9a-fA-F]+$/.test(feature) && feature.length >= 64;
    if (hasFeature) {
        // 特征先进模组，SQLite 只存索引（本地保存 / 云端下发同路径）。
        await save({
            keyId: current ? current.keyId : dxStd.genRandomStr(32),
            type: FINGER_TYPE,
            code: feature,
            userId: id,
            extra: Object.assign({}, current && current.extra ? current.extra : {}, {
                source: 'local_user',
            }),
        }, !!current);
        return;
    }
    if (!fingerDomain.isValidIndex(fingerprint.index)) {
        throw new AppError('200000', '指纹采集数据格式错误');
    }
    const index = String(Number(fingerprint.index));
    if (current && String(current.code) === index) {
        return;
    }
    await save({
        keyId: current ? current.keyId : dxStd.genRandomStr(32),
        type: FINGER_TYPE,
        code: index,
        userId: id,
        extra: Object.assign({}, current && current.extra ? current.extra : {}, {
            source: 'local_user',
        }),
    }, !!current);
};

/**
 * 设备 UI 保存人员时使用的非生物凭证增量接口。
 * 只处理显式提交的新增、修改和删除，避免覆盖 MQTT 下发但页面未展示的凭证。
 */
voucherDomain.applyLocalChanges = async function (userId, changes, tx, passwordLength) {
    if (passwordLength === undefined) {
        throw new TypeError('applyLocalChanges: passwordLength must be resolved before transaction');
    }
    const ownerId = requireId(userId, 'userId');
    const source = isObject(changes) ? changes : {};
    const removeKeyIds = Array.isArray(source.removeKeyIds) ? source.removeKeyIds : [];
    const upserts = Array.isArray(source.upserts) ? source.upserts : [];

    for (let i = 0; i < removeKeyIds.length; i++) {
        const keyId = requireId(removeKeyIds[i], 'keyId');
        const current = await voucherStorage.get(keyId, tx);
        if (!current || current.userId !== ownerId || LOCAL_EDIT_TYPES.indexOf(current.type) < 0) {
            throw new AppError('200000', '本地凭证不存在或不属于当前人员');
        }
        await voucherStorage.remove(keyId, tx);
    }

    const prepared = [];
    for (let i = 0; i < upserts.length; i++) {
        const input = Object.assign({}, upserts[i], { userId: ownerId });
        if (!input.keyId) input.keyId = dxStd.genRandomStr(32);
        const current = await voucherStorage.get(input.keyId, tx);
        if (current && (current.userId !== ownerId || LOCAL_EDIT_TYPES.indexOf(current.type) < 0)) {
            throw new AppError('200000', '不能修改其他人员或生物凭证');
        }
        const next = await normalize(input, current, passwordLength);
        if (LOCAL_EDIT_TYPES.indexOf(next.type) < 0) {
            throw new AppError('200000', '本地人员页面不支持该凭证类型');
        }
        if (!current) next.extra = Object.assign({ source: 'local_user' }, next.extra || {});
        prepared.push({ current: current, next: next });
    }

    // 先移除本批次待修改项，再统一校验并写回，支持两个凭证值互换且仍受同一事务保护。
    for (let i = 0; i < prepared.length; i++) {
        if (prepared[i].current) await voucherStorage.remove(prepared[i].current.keyId, tx);
    }
    for (let i = 0; i < prepared.length; i++) {
        await validateReferences(prepared[i].next, tx);
        await voucherStorage.insert(prepared[i].next, tx);
    }
    return true;
};


async function localGroupCounts(userId, tx) {
    const result = {};
    const groups = Object.keys(voucherTypes.GROUPS);
    for (let g = 0; g < groups.length; g++) {
        const group = groups[g];
        const types = voucherTypes.GROUPS[group];
        let count = 0;
        for (let t = 0; t < types.length; t++) {
            count += Number(await voucherStorage.count({ userId: userId, type: types[t] }, tx)) || 0;
        }
        result[group] = count;
    }
    return result;
}

/**
 * WebServer/设备UI普通凭证批量保存入口：删除、修改、新增和每类5条限制处于同一事务。
 * MQTT仍使用原始增删改Command，不受页面数量限制。
 */
voucherDomain.saveLocalChanges = async function (input) {
    const data = isObject(input) ? input : {};
    const userId = requireId(data.userId, 'userId');
    const removeKeyIds = Array.isArray(data.removeKeyIds) ? data.removeKeyIds : [];
    const upserts = Array.isArray(data.upserts) ? data.upserts : [];
    if (removeKeyIds.length + upserts.length > 100) {
        throw new AppError('200000', '批量数据不能超过100条');
    }
    // 配置表与业务表共用SQLite队列，所有配置读取必须在开启业务事务前完成。
    const passwordLength = await getPasswordLength();
    return await dataStorage.transaction(async function (tx) {
        const before = await localGroupCounts(userId, tx);
        await voucherDomain.applyLocalChanges(userId, { removeKeyIds: removeKeyIds, upserts: upserts }, tx, passwordLength);
        const after = await localGroupCounts(userId, tx);
        const groups = Object.keys(voucherTypes.GROUPS);
        for (let i = 0; i < groups.length; i++) {
            const group = groups[i];
            // MQTT已下发的超限凭证允许原组内修改或减少，但Web/设备UI不能继续增加。
            if (after[group] > 5 && after[group] > before[group]) {
                throw new AppError('200000', group + '凭证最多5条');
            }
        }
        return true;
    });
};
function normalizeAccessLookup(type, code) {
    const value = requireText(
        coerceVoucherType(type),
        'type',
        32
    );
    if (value === FACE_TYPE) {
        return { type: value, code: requireId(code, 'userId') };
    }
    let normalizedCode = requireText(code, 'code');
    if (voucherTypes.isCard(value)) normalizedCode = normalizedCode.toUpperCase();
    return { type: value, code: normalizedCode };
}

function hasQueryValue(value) {
    return value !== undefined && value !== null && String(value) !== '';
}

voucherDomain.query = async function (input) {
    const data = input || {};
    const hasCode = hasQueryValue(data.code);
    const hasType = hasQueryValue(data.type);
    // 严格模式：按 code 查询必须同时指定 type，避免跨类型命中。
    if (hasCode && !hasType) {
        throw new AppError('200000', '查询凭证必须指定type');
    }
    const paging = pageOf(data, 100);
    const filters = {
        keyId: data.keyId,
        userId: data.userId,
    };
    if (hasType) filters.type = String(data.type);
    if (hasCode) {
        let code = String(data.code);
        if (hasType && voucherTypes.isCard(filters.type)) code = code.toUpperCase();
        filters.code = code;
    }
    const total = await voucherStorage.count(filters);
    const rows = await voucherStorage.list(filters, paging.page, paging.size);
    return pageResult(rows.map(toProtocol), paging.page, paging.size, total);
};

voucherDomain.findForAccess = async function (type, code) {
    const lookup = normalizeAccessLookup(type, code);
    if (lookup.type === FACE_TYPE) {
        return await voucherStorage.findByUserType(lookup.code, lookup.type);
    }
    // 严格模式：仅匹配请求的 type+code；200/205、100/101/103 等类型互不兜底。
    return await voucherStorage.findByCode(lookup.type, lookup.code);
};

voucherDomain.countByType = async function (type) {
    return Number(await voucherStorage.count({ type: String(type) })) || 0;
};

voucherDomain.countByTypes = async function (types) {
    const list = Array.isArray(types) ? types : [];
    let total = 0;
    for (let i = 0; i < list.length; i++) {
        total += await voucherDomain.countByType(list[i]);
    }
    return total;
};

export default voucherDomain;
