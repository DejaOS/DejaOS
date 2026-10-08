/** @layer domain @module audio_domain @depends audio_driver,storage/config,utils/language_utils */

import audioDriver from '../drivers/audio_driver.js';
import configStorage from '../storage/config/config.js';
import {
    DOMESTIC_LANGUAGE_CODE,
    ttsTypeForLanguage,
    wavPathForLanguage,
} from '../utils/language_utils.js';

const DEFAULT_GREETING = {
    CN: '欢迎光临',
    EN: 'Welcome',
};

async function resolveLanguage() {
    const code = String(await configStorage.get('base.language', DOMESTIC_LANGUAGE_CODE)).toUpperCase();
    return {
        code: code,
        ttsType: ttsTypeForLanguage(code),
    };
}

function playWavPath(path) {
    return audioDriver.playWav(path);
}

function playAccessWav(name, code) {
    return playWavPath(wavPathForLanguage(code, name));
}

function playNamedWav(name, code) {
    return playWavPath(wavPathForLanguage(code, name));
}

function playTts(text, ttsType) {
    return audioDriver.playTts(String(text || ''), { language_type: ttsType });
}

function isFaceType(type) {
    return String(type || '') === '300';
}

function isStrangerResult(input, result) {
    if (!input || !input.code) return true;
    const reason = result && result.reason ? String(result.reason) : '';
    return reason === 'CREDENTIAL_EMPTY'
        || reason === 'VOUCHER_NOT_FOUND'
        || reason === 'PERSON_NOT_FOUND';
}

function greetingForCode(code) {
    return DEFAULT_GREETING[code] || DEFAULT_GREETING.EN;
}

const audioDomain = {};

/**
 * 通行结果语音。按 base.language 区分语种；报警音与业务写死 TTS 不经此入口。
 * @param {{ allowed?: boolean, person?: { name?: string }, reason?: string }|boolean} result
 * @param {{ type?: string, code?: string }=} input
 */
audioDomain.notifyAccess = async function (result, input) {
    const payload = typeof result === 'boolean' ? { allowed: result } : (result || {});
    const allowed = payload.allowed === true;
    const type = input && input.type !== undefined ? input.type : payload.type;
    const lang = await resolveLanguage();

    if (allowed) {
        if (payload.reason === 'DUAL_PERSON_ALLOW' && Array.isArray(payload.participants)) {
            const names = payload.participants.map(function (person) {
                return person && person.name ? String(person.name).trim() : '';
            }).filter(Boolean).slice(0, 2);
            if (names.length === 2) {
                const message = lang.code === 'CN'
                    ? names.join('、') + '，双人核验通过'
                    : names.join(', ') + ', dual-person verification passed';
                return playTts(message, lang.ttsType);
            }
        }
        if (isFaceType(type)) {
            const voiceMode = Number(await configStorage.get('face.voiceMode', 1));
            if (voiceMode === 0) {
                return;
            }
            if (voiceMode === 1) {
                const name = payload.person && payload.person.name;
                if (name) {
                    return playTts(name, lang.ttsType);
                }
                return playAccessWav('s', lang.code);
            }
            if (voiceMode === 2) {
                let greeting = await configStorage.get('face.voiceModeDate', '');
                if (!greeting) {
                    greeting = greetingForCode(lang.code);
                }
                return playTts(greeting, lang.ttsType);
            }
        }
        return playAccessWav('s', lang.code);
    }

    if (isFaceType(type) && isStrangerResult(input, payload)) {
        const stranger = Number(await configStorage.get('face.stranger', 1));
        if (stranger === 0) {
            return;
        }
        if (stranger === 1) {
            return playAccessWav('register', lang.code);
        }
        if (stranger === 2) {
            return playAccessWav('stranger', lang.code);
        }
    }

    return playAccessWav('f', lang.code);
};

/** 通用 TTS（企微绑定成功等业务提示）。 */
audioDomain.playTts = async function (text) {
    const lang = await resolveLanguage();
    return playTts(text, lang.ttsType);
};

/** 按 base.language 播放 resource/wav 下的命名 wav（如 calibration_1s）。 */
audioDomain.playWav = async function (name) {
    const lang = await resolveLanguage();
    return playNamedWav(String(name || ''), lang.code);
};

/**
 * 指纹录入提示音（fingerInput1/fingerS 等）。
 */
audioDomain.playFinger = async function (name) {
    const lang = await resolveLanguage();
    const file = String(name || '').trim();
    if (!file) return false;
    return playWavPath(wavPathForLanguage(lang.code, file));
};

audioDomain.setConfig = async function (values) {
    await configStorage.setGroup('base', values);
    if (Object.prototype.hasOwnProperty.call(values, 'volume')) {
        await audioDriver.updateConfig({ volume: values.volume });
    }
    return await configStorage.getGroup('base');
};

export default audioDomain;
