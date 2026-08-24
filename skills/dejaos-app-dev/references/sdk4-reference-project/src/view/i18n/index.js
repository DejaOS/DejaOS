/**
 * @layer    view
 * @module   i18n
 * @exports  LOCALE_ZH,LOCALE_EN,setLocale,getLocale,localeFromRegion,t
 * @fires    none
 * @listens  none
 * @depends  zh,en
 *
 * View 层轻量国际化：内存 locale + 文案表。
 * 本模块只维护UI内存语言；base.language由页面通过配置Command落库。
 */

import zh from './zh.js';
import en from './en.js';

/** 简体中文 */
export const LOCALE_ZH = 'zh';
/** 英文（国际版默认） */
export const LOCALE_EN = 'en';

const PACKS = {};
PACKS[LOCALE_ZH] = zh;
PACKS[LOCALE_EN] = en;

/** 当前 UI 语言；启动默认中文，与首次初始化页固定中文一致 */
let currentLocale = LOCALE_ZH;

/**
 * 切换当前语言。未注册 locale 时忽略，保持原值。
 * @param {string} locale LOCALE_ZH | LOCALE_EN
 * @returns {boolean} 是否生效
 */
export function setLocale(locale) {
    if (!PACKS[locale]) {
        return false;
    }
    currentLocale = locale;
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
 * 国内固定中文；国际版默认英文（后续可再扩多语言）。
 * @param {string} region domestic | international
 * @returns {string}
 */
export function localeFromRegion(region) {
    return region === 'international' ? LOCALE_EN : LOCALE_ZH;
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

/**
 * 按 key 取文案。
 * 查找顺序：指定 locale（若有）→ 当前 locale → 中文回退 → 返回 key 本身，避免空白。
 *
 * @param {string} key 语义化 key，如 'init.title'
 * @param {Object.<string, string|number>|string|null} [varsOrLocale]
 *        传对象做占位替换；传 locale 字符串则临时用该语言（如初始化页强制中文）。
 * @param {string} [locale] 当第二参为 vars 时，可再指定临时 locale
 * @returns {string}
 *
 * @example
 * t('init.title')
 * t('init.title', LOCALE_ZH)           // 强制中文
 * t('home.summary', { product: '标品', region: '国内' })
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

    const pack = (overrideLocale && PACKS[overrideLocale])
        || PACKS[currentLocale]
        || PACKS[LOCALE_ZH];
    const fallback = PACKS[LOCALE_ZH];
    const raw = (pack && pack[key]) || (fallback && fallback[key]) || key;
    return applyVars(raw, vars);
}

const i18n = {
    LOCALE_ZH: LOCALE_ZH,
    LOCALE_EN: LOCALE_EN,
    setLocale: setLocale,
    getLocale: getLocale,
    localeFromRegion: localeFromRegion,
    t: t,
};

export default i18n;
