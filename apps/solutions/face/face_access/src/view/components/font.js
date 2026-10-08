/**
 * @layer    view
 * @module   font
 * @fires    none
 * @listens  none
 * @depends  dxUi,i18n
 */

import dxui from '../../../dxmodules/dxUi.js';
import { getLocale, onLocaleChange } from '../i18n/index.js';

const FONT_DEFAULT = '/app/code/resource/font/AlibabaPuHuiTi-3-65-Medium.ttf';
const FONT_AR = '/app/code/resource/font/Arabic.ttf';
const FONT_KO = '/app/code/resource/font/Korean.ttf';
/** 固定默认字体，不随 locale 切换（SN/IP/时钟等 ASCII 内容） */
const LOCALE_DEFAULT = '__default__';

const cache = new Map();
/** @type {object[]} */
const bindings = [];

function fontPathForLocale(locale) {
    if (locale === LOCALE_DEFAULT) {
        return FONT_DEFAULT;
    }
    if (locale === 'ar') {
        return FONT_AR;
    }
    if (locale === 'ko') {
        return FONT_KO;
    }
    return FONT_DEFAULT;
}

function trackWidget(widget, binding) {
    if (!widget || !binding) {
        return;
    }
    widget.__fontBinding = binding;
    if (bindings.indexOf(widget) < 0) {
        bindings.push(widget);
    }
}

function patchTextFont(widget) {
    if (!widget || widget.__fontHooked || typeof widget.textFont !== 'function') {
        return;
    }
    widget.__fontHooked = true;
    const original = widget.textFont.bind(widget);
    widget.textFont = function (fontObj) {
        if (fontObj && fontObj._fontBinding) {
            trackWidget(widget, fontObj._fontBinding);
        }
        return original(fontObj);
    };
}

function patchGetList(widget) {
    if (!widget || widget.__fontListHooked || typeof widget.getList !== 'function') {
        return;
    }
    widget.__fontListHooked = true;
    const originalGetList = widget.getList.bind(widget);
    widget.getList = function () {
        const list = originalGetList();
        patchTextFont(list);
        return list;
    };
}

function installWidgetHooks() {
    if (installWidgetHooks.done) {
        return;
    }
    installWidgetHooks.done = true;

    ['Label', 'Textarea', 'Dropdown'].forEach(function (type) {
        if (!dxui[type] || typeof dxui[type].build !== 'function') {
            return;
        }
        const originalBuild = dxui[type].build.bind(dxui[type]);
        dxui[type].build = function (id, parent) {
            const widget = originalBuild(id, parent);
            patchTextFont(widget);
            patchGetList(widget);
            return widget;
        };
    });
}

installWidgetHooks();

const font = {};

function resolveBinding(size, style, locale) {
    return {
        size: size === undefined ? 24 : size,
        style: style === undefined ? dxui.Utils.FONT_STYLE.NORMAL : style,
        locale: locale || null,
    };
}

function buildFont(binding) {
    const locale = binding.locale || getLocale();
    const path = fontPathForLocale(binding.locale || locale);
    // Arabic/Korean 字体通常无粗体子集，强制 NORMAL 避免乱码
    let style = binding.style;
    if (path === FONT_AR || path === FONT_KO) {
        style = dxui.Utils.FONT_STYLE.NORMAL;
    }
    const key = path + ':' + binding.size + ':' + style;
    if (!cache.has(key)) {
        const built = dxui.Font.build(path, binding.size, style);
        built._fontBinding = {
            size: binding.size,
            style: binding.style,
            locale: binding.locale,
        };
        cache.set(key, built);
    }
    return cache.get(key);
}

font.get = function (size, style) {
    return buildFont(resolveBinding(size, style, null));
};

/**
 * 始终使用默认字体，不随语言切换 ar/ko 专用字体。
 * 用于 SN、IP、时钟、页码等 ASCII/数字标签，避免行高变化导致滚动或错位。
 */
font.getDefault = function (size, style) {
    return buildFont(resolveBinding(size, style, LOCALE_DEFAULT));
};

/** 指定 locale 的字体（语言列表等场景：每项用各自字体渲染） */
font.getForLocale = function (locale, size, style) {
    return buildFont(resolveBinding(size, style, locale));
};

/**
 * 对单个控件重新绑定当前 locale 字体（切语言后除 refreshAll 外可显式调用）。
 */
font.apply = function (widget, size, style) {
    if (!widget || typeof widget.textFont !== 'function') {
        return;
    }
    widget.textFont(font.get(size, style));
};

font.refreshAll = function () {
    cache.clear();
    for (let i = 0; i < bindings.length; i++) {
        const widget = bindings[i];
        const binding = widget.__fontBinding;
        if (!binding || typeof widget.textFont !== 'function') {
            continue;
        }
        try {
            let next;
            if (binding.locale === LOCALE_DEFAULT) {
                next = font.getDefault(binding.size, binding.style);
            } else if (binding.locale) {
                next = font.getForLocale(binding.locale, binding.size, binding.style);
            } else {
                next = font.get(binding.size, binding.style);
            }
            widget.textFont(next);
        } catch (_e) {}
    }
};

onLocaleChange(function () {
    font.refreshAll();
});

export default font;
