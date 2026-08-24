/** @layer drivers @module diag_driver @depends dxOs */

import dxOs from '../../dxmodules/dxOs.js';

const TARGET_PATTERN = /^(?=.{1,253}$)[A-Za-z0-9](?:[A-Za-z0-9.-]*[A-Za-z0-9])?$/;

function assertTarget(target) {
    if (typeof target !== 'string' || !TARGET_PATTERN.test(target)) {
        throw new TypeError('diag_driver: target must be a valid IPv4 address or domain');
    }
}

function parseOutput(target, output, durationMs) {
    const text = String(output || '');
    const codeMatch = /__DX_CODE:(\d+)/.exec(text);
    const addressMatch = /^PING\s+[^\s(]+\s+\((\d{1,3}(?:\.\d{1,3}){3})\)/m.exec(text)
        || /^PING\s+(\d{1,3}(?:\.\d{1,3}){3})/m.exec(text);
    const latencyMatch = /time[=<]([0-9.]+)\s*ms/i.exec(text);
    const lossMatch = /(\d+)%\s*packet loss/i.exec(text);
    const exitCode = codeMatch ? Number(codeMatch[1]) : 1;
    const reachable = exitCode === 0;
    const resolved = !!addressMatch || /^\d{1,3}(?:\.\d{1,3}){3}$/.test(target);
    return {
        target: target,
        success: reachable,
        reachable: reachable,
        resolved: resolved,
        address: addressMatch ? addressMatch[1] : (resolved ? target : ''),
        latencyMs: latencyMatch ? Number(latencyMatch[1]) : null,
        packetLoss: lossMatch ? Number(lossMatch[1]) : (reachable ? 0 : 100),
        durationMs: durationMs,
        message: reachable ? '' : (resolved ? '目标无响应' : '域名解析失败'),
    };
}

const diagDriver = {};

diagDriver.ping = async function (target, count) {
    assertTarget(target);
    const packets = Number.isInteger(count) && count >= 1 && count <= 3 ? count : 1;
    const startedAt = Date.now();
    // target经过严格白名单校验；-W限制单包等待，避免系统任务长期占用。
    const command = 'ping -c ' + packets + ' -W 2 ' + target + ' 2>&1; echo __DX_CODE:$?';
    try {
        const output = await dxOs.systemWithRes(command, 2048);
        return parseOutput(target, output, Date.now() - startedAt);
    } catch (error) {
        return {
            target: target,
            success: false,
            reachable: false,
            resolved: false,
            address: '',
            latencyMs: null,
            packetLoss: 100,
            durationMs: Date.now() - startedAt,
            message: error && error.message ? error.message : 'Ping执行失败',
        };
    }
};

diagDriver.resolve = async function (target) {
    const result = await diagDriver.ping(target, 1);
    return {
        target: result.target,
        success: result.resolved,
        resolved: result.resolved,
        address: result.address,
        durationMs: result.durationMs,
        message: result.resolved ? '' : result.message,
    };
};

diagDriver.init = async function () {};
diagDriver.destroy = async function () {};

export default diagDriver;
