/**
 * @module language_utils
 * @exports LANGUAGE_CODES,INTL_LANGUAGE_CODES,languageCodeToLocale,localeToLanguageCode,getAvailableLocales,isLanguageAllowed
 */

/** @type {readonly string[]} */
export const LANGUAGE_CODES = ['CN', 'EN', 'ES', 'FR', 'DE', 'RU', 'AR', 'PT', 'KO'];

/** 国际版可选（不含 CN） */
export const INTL_LANGUAGE_CODES = ['EN', 'ES', 'FR', 'DE', 'RU', 'AR', 'PT', 'KO'];

/** 国内版唯一语言 */
export const DOMESTIC_LANGUAGE_CODE = 'CN';

/**
 * base.language → UI locale
 * @param {string} code
 * @returns {string}
 */
export function languageCodeToLocale(code) {
    const normalized = String(code || DOMESTIC_LANGUAGE_CODE).toUpperCase();
    return normalized === 'CN' ? 'zh' : normalized.toLowerCase();
}

/**
 * UI locale → base.language
 * @param {string} locale
 * @returns {string}
 */
export function localeToLanguageCode(locale) {
    const normalized = String(locale || 'zh').toLowerCase();
    return normalized === 'zh' ? 'CN' : normalized.toUpperCase();
}

/**
 * @param {'CN'|'INTL'|string} region
 * @returns {string[]}
 */
export function getAvailableLocales(region) {
    if (region === 'INTL') {
        return INTL_LANGUAGE_CODES.map(languageCodeToLocale);
    }
    return ['zh'];
}

/**
 * @param {'CN'|'INTL'|string} region
 * @param {string} code base.language
 * @returns {boolean}
 */
export function isLanguageAllowed(region, code) {
    const normalized = String(code || '').toUpperCase();
    if (region === 'INTL') {
        return INTL_LANGUAGE_CODES.indexOf(normalized) >= 0;
    }
    return normalized === DOMESTIC_LANGUAGE_CODE;
}

/**
 * TTS 引擎语言类型：0 中文，1 其他。
 * @param {string} code
 * @returns {0|1}
 */
export function ttsTypeForLanguage(code) {
    return String(code || DOMESTIC_LANGUAGE_CODE).toUpperCase() === 'CN' ? 0 : 1;
}

/** 通行 wav 在语言目录下的文件名映射 */
export const ACCESS_WAV_FILES = {
    s: 'recg_s',
    f: 'recg_f',
    register: 'register',
    stranger: 'stranger',
};

/**
 * @param {string} code base.language
 * @param {string} name 逻辑名 s|f|register|stranger|calibration_1s|fingerInput1 等
 * @returns {string}
 */
export function wavPathForLanguage(code, name) {
    const lang = String(code || DOMESTIC_LANGUAGE_CODE).toUpperCase();
    const base = String(name || '').trim();
    const file = ACCESS_WAV_FILES[base] || base;
    return '/app/code/resource/wav/' + lang + '/' + file + '.wav';
}
