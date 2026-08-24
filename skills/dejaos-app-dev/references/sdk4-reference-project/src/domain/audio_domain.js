/** @layer domain @module audio_domain @depends audio_driver,storage/config */

import audioDriver from '../drivers/audio_driver.js';
import configStorage from '../storage/config/config.js';

const WAV_ROOT = '/app/code/resource/wav/';
const DEFAULT_GREETING = {
    CN: '欢迎光临',
    EN: 'Welcome',
};

async function resolveLanguage() {
    const language = String(await configStorage.get('base.language', 'CN')).toUpperCase();
    const isCn = language === 'CN';
    return {
        code: isCn ? 'CN' : 'EN',
        suffix: isCn ? '' : '_eng',
        ttsType: isCn ? 0 : 1,
    };
}

function playWav(name, suffix) {
    return audioDriver.playWav(WAV_ROOT + name + suffix + '.wav');
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

const audioDomain = {};

/**
 * 通行结果语音。按 base.language 区分中英文；报警音与业务写死 TTS 不经此入口。
 * 人脸成功叠加 face.voiceMode；人脸陌生人叠加 face.stranger。
 * @param {{ allowed?: boolean, person?: { name?: string }, reason?: string }|boolean} result
 * @param {{ type?: string, code?: string }=} input
 */
audioDomain.notifyAccess = async function (result, input) {
    const payload = typeof result === 'boolean' ? { allowed: result } : (result || {});
    const allowed = payload.allowed === true;
    const type = input && input.type !== undefined ? input.type : payload.type;
    const lang = await resolveLanguage();

    if (allowed) {
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
                return playWav('s', lang.suffix);
            }
            if (voiceMode === 2) {
                let greeting = await configStorage.get('face.voiceModeDate', '');
                if (!greeting) {
                    greeting = DEFAULT_GREETING[lang.code];
                }
                return playTts(greeting, lang.ttsType);
            }
        }
        return playWav('s', lang.suffix);
    }

    if (isFaceType(type) && isStrangerResult(input, payload)) {
        const stranger = Number(await configStorage.get('face.stranger', 1));
        if (stranger === 0) {
            return;
        }
        if (stranger === 1) {
            return playWav('register', lang.suffix);
        }
        if (stranger === 2) {
            return playWav('stranger', lang.suffix);
        }
    }

    return playWav('f', lang.suffix);
};

/** 通用 TTS（企微绑定成功等业务提示）。 */
audioDomain.playTts = async function (text) {
    const lang = await resolveLanguage();
    return playTts(text, lang.ttsType);
};

/** 按 base.language 播放 resource/wav 下的命名 wav（如 calibration_1s）。 */
audioDomain.playWav = async function (name) {
    const lang = await resolveLanguage();
    return playWav(String(name || ''), lang.suffix);
};

/**
 * 指纹录入提示音（fingerInput1/fingerS 等）。
 * 旧架构文件在 wav 根目录、无 _eng 后缀，与通行音 s/f 不同。
 */
audioDomain.playFinger = async function (name) {
    const file = String(name || '').trim();
    if (!file) return false;
    return audioDriver.playWav(WAV_ROOT + file + '.wav');
};

audioDomain.setConfig = async function (values) {
    await configStorage.setGroup('base', values);
    if (Object.prototype.hasOwnProperty.call(values, 'volume')) {
        await audioDriver.updateConfig({ volume: values.volume });
    }
    return await configStorage.getGroup('base');
};

export default audioDomain;
