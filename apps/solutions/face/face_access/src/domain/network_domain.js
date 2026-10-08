/**
 * @layer domain
 * @module network_domain
 * @depends storage/config,network_driver,dxStd,dxLogger
 */

import configStorage from '../storage/config/config.js';
import networkDriver from '../drivers/network_driver.js';
import dxStd from '../../dxmodules/dxStd.js';
import dxLogger from '../../dxmodules/dxLogger.js';

const networkDomain = {};

function emptyActiveParams() {
    return {
        connected: false,
        netType: 0,
        netStatus: 0,
        ip: '',
        gateway: '',
        mask: '',
        dns: '',
        mac: '',
    };
}

/**
 * 读取当前主接口的运行时参数（含连接态）。未初始化或查询失败时返回离线空值。
 * @returns {{ connected: boolean, netType: number, netStatus: number, ip: string, gateway: string, mask: string, dns: string, mac: string }}
 */
networkDomain.getActiveParams = function () {
    if (!networkDriver.isInitialized()) {
        return emptyActiveParams();
    }
    let state;
    try {
        state = networkDriver.getState();
    } catch (_error) {
        return emptyActiveParams();
    }
    const result = emptyActiveParams();
    result.connected = state.connected === true;
    result.netType = state.netType || 0;
    result.netStatus = state.netStatus || 0;
    // MAC 属于当前主接口属性：接口已启用即可读，不必等路由连通。
    try {
        result.mac = networkDriver.getNetMac() || '';
    } catch (_error) {}
    if (!result.connected) {
        return result;
    }
    try {
        const raw = networkDriver.getNetParam();
        if (raw && typeof raw === 'object') {
            result.ip = raw.ip || '';
            result.gateway = raw.gateway || '';
            result.mask = raw.netmask || raw.mask || '';
            result.dns = raw.dns || '';
        }
    } catch (_error) {}
    return result;
};

networkDomain.getConfig = async function () {
    return await configStorage.getGroup('net');
};

networkDomain.setConfig = async function (values, context) {
    const toWrite = Object.assign({}, values || {});
    if (toWrite.dhcp !== undefined) {
        toWrite.dhcp = Number(toWrite.dhcp);
    }
    if (toWrite.type !== undefined) {
        toWrite.type = Number(toWrite.type);
    }
    // 动态模式：清空旧静态地址再落库，避免设置页读回上一份静态 IP。
    // 真实地址在连上后由 syncActiveParams 写入。
    if (toWrite.dhcp === 2) {
        toWrite.ip = '';
        toWrite.gateway = '';
        toWrite.mask = '';
        toWrite.dns = '';
    }
    await configStorage.setGroup('net', toWrite);
    const full = await configStorage.getGroup('net');
    if (full && full.dhcp !== undefined) {
        full.dhcp = Number(full.dhcp);
    }
    /*
     * 重连会长时间阻塞且可能打断网卡，钩子里只 schedule，绝不 await connect。
     * - 有 afterResponse（HTTP/MQTT）：等协议先回包/publish 再 schedule，避免断网抢在回包前。
     * - 无 afterResponse（本地 UI）：落库后直接延后重连，setConfig 立刻返回。
     */
    const deferApply = function () {
        dxStd.setTimeout(function () {
            try {
                const ret = networkDriver.updateConfig(full);
                if (ret && typeof ret.then === 'function') {
                    ret.catch(function (e) {
                        dxLogger.error('network_domain deferred apply failed: ' + e.message);
                    });
                }
            } catch (e) {
                dxLogger.error('network_domain deferred apply failed: ' + e.message);
            }
        }, 200);
    };
    if (context && typeof context.afterResponse === 'function') {
        context.afterResponse(deferApply);
    } else {
        deferApply();
    }
    return full;
};

/**
 * 将当前已获取的 IP 参数写入配置（不触发重连），供设置页/主页展示。
 * 连上后会短时轮询：静态切 DHCP 时首包常仍是旧地址，需等租约刷新后再落库。
 * @returns {Promise<object>}
 */
networkDomain.syncActiveParams = async function () {
    let active = networkDomain.getActiveParams();
    if (!active.connected) {
        return active;
    }
    let lastWritten = '';
    const deadline = Date.now() + 8000;
    while (Date.now() <= deadline) {
        active = networkDomain.getActiveParams();
        if (!active.connected) {
            return active;
        }
        if (active.ip && active.ip !== lastWritten) {
            await configStorage.setGroup('net', {
                ip: active.ip,
                gateway: active.gateway || '',
                mask: active.mask || '',
                dns: active.dns || '',
            });
            lastWritten = active.ip;
            // 已写入一次后若接近截止仍无变化，视为稳定。
            if (Date.now() + 1200 >= deadline) {
                break;
            }
        } else if (active.ip && lastWritten && Date.now() + 800 >= deadline) {
            break;
        }
        await new Promise(function (resolve) {
            dxStd.setTimeout(resolve, 400);
        });
    }
    return active;
};

networkDomain.getRuntimeConfig = function () {
    const active = networkDomain.getActiveParams();
    return { 'net.mac': active.mac || '' };
};

networkDomain.getState = function () {
    return networkDriver.getState();
};

networkDomain.scanWifi = async function (timeoutMs, intervalMs) {
    return await networkDriver.scanWifi(timeoutMs, intervalMs);
};

export default networkDomain;
