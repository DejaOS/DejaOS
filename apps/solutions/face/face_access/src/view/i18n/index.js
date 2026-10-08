/**
 * @layer    view
 * @module   i18n
 * @exports  LOCALE_ZH,LOCALE_EN,setLocale,getLocale,localeFromRegion,t
 * @fires    none
 * @listens  none
 * @depends  zh,en,languages
 *
 * View 层轻量国际化：内存 locale + 文案表。
 * 本模块只维护UI内存语言；base.language由页面通过配置Command落库。
 */

import zh from './zh.js';
import en from './en.js';
import es from './es.js';
import fr from './fr.js';
import de from './de.js';
import ru from './ru.js';
import ar from './ar.js';
import pt from './pt.js';
import ko from './ko.js';
import { languageCodeToLocale } from './languages.js';

/** 简体中文 */
export const LOCALE_ZH = 'zh';
/** 英文 */
export const LOCALE_EN = 'en';

const PACKS = {};
PACKS[LOCALE_ZH] = zh;
PACKS[LOCALE_EN] = en;
PACKS.es = es;
PACKS.fr = fr;
PACKS.de = de;
PACKS.ru = ru;
PACKS.ar = ar;
PACKS.pt = pt;
PACKS.ko = ko;

/** @type {Function[]} */
const localeListeners = [];

/** 当前 UI 语言；启动默认中文，与首次初始化页固定中文一致 */
let currentLocale = LOCALE_ZH;

export function onLocaleChange(listener) {
    if (typeof listener === 'function') {
        localeListeners.push(listener);
    }
}

/**
 * 切换当前语言。
 * @param {string} locale zh | en | es | fr | de | ru | ar | pt | ko
 * @returns {boolean} 是否生效
 */
export function setLocale(locale) {
    if (!PACKS[locale]) {
        return false;
    }
    if (currentLocale === locale) {
        return true;
    }
    currentLocale = locale;
    for (let i = 0; i < localeListeners.length; i++) {
        try {
            localeListeners[i](currentLocale);
        } catch (_e) {}
    }
    return true;
}

/**
 * @returns {string}
 */
export function getLocale() {
    return currentLocale;
}

/**
 * 发行区域 → 默认 UI 语言。
 * @param {string} region domestic | international
 * @returns {string}
 */
export function localeFromRegion(region) {
    return region === 'international' ? LOCALE_EN : LOCALE_ZH;
}

/**
 * @param {string} languageCode base.language（CN|EN|ES|…）
 * @returns {boolean}
 */
export function setLocaleFromLanguageCode(languageCode) {
    return setLocale(languageCodeToLocale(languageCode));
}

/**
 * 简单占位替换：将 template 中的 {name} 换成 vars.name。
 * @param {string} template
 * @param {Object.<string, string|number>|null|undefined} vars
 * @returns {string}
 */
function applyVars(template, vars) {
    if (!vars) {
        return template;
    }
    return template.replace(/\{(\w+)\}/g, function (_match, name) {
        return vars[name] !== undefined && vars[name] !== null
            ? String(vars[name])
            : '{' + name + '}';
    });
}

function lookupPack(locale, key) {
    const pack = PACKS[locale];
    if (pack && pack[key]) {
        return pack[key];
    }
    if (locale !== LOCALE_EN && PACKS[LOCALE_EN] && PACKS[LOCALE_EN][key]) {
        return PACKS[LOCALE_EN][key];
    }
    if (locale !== LOCALE_ZH && PACKS[LOCALE_ZH] && PACKS[LOCALE_ZH][key]) {
        return PACKS[LOCALE_ZH][key];
    }
    return null;
}

/**
 * 按 key 取文案。
 * 查找顺序：指定 locale → 当前 locale → 英文 → 中文 → key。
 *
 * @param {string} key 语义化 key，如 'init.title'
 * @param {Object.<string, string|number>|string|null} [varsOrLocale]
 * @param {string} [locale]
 * @returns {string}
 */
export function t(key, varsOrLocale, locale) {
    let vars = null;
    let overrideLocale = null;

    if (typeof varsOrLocale === 'string') {
        overrideLocale = varsOrLocale;
    } else if (varsOrLocale && typeof varsOrLocale === 'object') {
        vars = varsOrLocale;
        if (typeof locale === 'string') {
            overrideLocale = locale;
        }
    }

    const tryLocales = [];
    if (overrideLocale && PACKS[overrideLocale]) {
        tryLocales.push(overrideLocale);
    }
    if (tryLocales.indexOf(currentLocale) < 0 && PACKS[currentLocale]) {
        tryLocales.push(currentLocale);
    }
    if (tryLocales.indexOf(LOCALE_EN) < 0) {
        tryLocales.push(LOCALE_EN);
    }
    if (tryLocales.indexOf(LOCALE_ZH) < 0) {
        tryLocales.push(LOCALE_ZH);
    }

    let raw = key;
    for (let i = 0; i < tryLocales.length; i++) {
        const text = lookupPack(tryLocales[i], key);
        if (text) {
            raw = text;
            break;
        }
    }
    return applyVars(raw, vars);
}

const i18n = {
    LOCALE_ZH: LOCALE_ZH,
    LOCALE_EN: LOCALE_EN,
    setLocale: setLocale,
    setLocaleFromLanguageCode: setLocaleFromLanguageCode,
    onLocaleChange: onLocaleChange,
    getLocale: getLocale,
    localeFromRegion: localeFromRegion,
    t: t,
};

export default i18n;
