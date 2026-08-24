/**
 * @layer domain @module voucher_domain
 * @depends storage/data/voucher,storage/data/person,face_domain,dxCommonUtils,dxStd,data_utils
 *
 * 人脸凭证以SQLite为业务索引，以dxFacial特征库为识别数据源；图片源文件统一存放/data。
 */

import dxCommonUtils from '../../dxmodules/dxCommonUtils.js';
import dxStd from '../../dxmodules/dxStd.js';
import voucherStorage from '../storage/data/voucher.js';
import personStorage from '../storage/data/person.js';
import dataStorage from '../storage/data/data.js';
import configStorage from '../storage/config/config.js';
import faceDomain from './face_domain.js';
import fingerDomain from './finger_domain.js';
import { AppError } from '../core/error.js';
import { isObject, requireId, requireText, pageOf, pageResult, runBatch } from '../utils/data_utils.js';

const FACE_TYPE = '300';
const FINGER_TYPE = '500';

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

function normalize(item, current) {
    if (!isObject(item)) throw new AppError('200000', '凭证数据必须是对象');
    const rawType = item.type === undefined && current ? current.type : item.type;
    const type = requireText(typeof rawType === 'string' ? rawType : '', 'type', 32);
    let code = item.code === undefined && current ? current.code : item.code;
    if (typeof code !== 'string' || code.length === 0) throw new AppError('200000', 'code不能为空');
    if (type === '200' || type === '201' || type === '202') code = code.toUpperCase();
    if (type === '400' && !/^\d{6}$/.test(code)) throw new AppError('200000', '密码凭证必须是6位数字');
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
            if (fingerIndexToDelete >= 1 && fingerDomain.isActive()) {
                await fingerDomain.deleteIndex(fingerIndexToDelete);
            }
            oldSource = current;
        } else {
            // insert保持现有upsert语义；modify允许未提交字段沿用当前值。
            let voucher = normalize(item, mustExist ? current : null);
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
                if (Number.isInteger(oldIndex) && oldIndex >= 0 && fingerDomain.isActive()) {
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
        if (fingerIndexToDelete != null && fingerIndexToDelete >= 1 && fingerDomain.isActive()) {
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
            if (Number.isInteger(index) && index >= 1 && fingerDomain.isActive()) {
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

voucherDomain.insert = async function (items) {
    return await runBatch(items, 'keyId', function (item) {
        return faceDomain.exclusive(function () { return save(item, false); });
    });
};

voucherDomain.modify = async function (items) {
    return await runBatch(items, 'keyId', function (item) {
        return faceDomain.exclusive(function () { return save(item, true); });
    });
};

voucherDomain.remove = async function (input) {
    const data = input || {};
    const errors = [];
    const keyIds = Array.isArray(data.keyIds) ? data.keyIds : [];
    const userIds = Array.isArray(data.userIds) ? data.userIds : [];
    if (keyIds.length + userIds.length > 100) {
        throw new AppError('200000', '批量数据不能超过100条');
    }
    for (let i = 0; i < keyIds.length; i++) {
        try {
            const keyId = requireId(keyIds[i], 'keyId');
            await faceDomain.exclusive(async function () {
                const current = await voucherStorage.get(keyId);
                if (!current) throw new AppError('200000', 'voucher not found');
                await removeRows([current], async function () {
                    await dataStorage.transaction(async function (tx) {
                        if (!await voucherStorage.get(keyId, tx)) throw new AppError('200000', 'voucher not found');
                        await voucherStorage.remove(keyId, tx);
                    });
                });
            });
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
            } catch (_e) {}
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
        // 与云端指纹入库同路径：特征先进模组，SQLite 只存索引。
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
    if (!Number.isInteger(Number(fingerprint.index)) || Number(fingerprint.index) < 1) {
        throw new AppError('200000', '指纹采集数据格式错误');
    }
    const index = String(Number(fingerprint.index));
    // 仅改绑索引时合并 extra，避免编辑保存冲掉已有 fingerprint 特征备份。
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

voucherDomain.query = async function (input) {
    const data = input || {};
    const paging = pageOf(data, 100);
    const filters = { keyId: data.keyId, userId: data.userId, type: data.type, code: data.code };
    const total = await voucherStorage.count(filters);
    const rows = await voucherStorage.list(filters, paging.page, paging.size);
    return pageResult(rows.map(toProtocol), paging.page, paging.size, total);
};

voucherDomain.findForAccess = async function (type, code) {
    return type === FACE_TYPE
        ? await voucherStorage.findByUserType(requireId(code, 'userId'), type)
        : await voucherStorage.findByCode(type, code);
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
