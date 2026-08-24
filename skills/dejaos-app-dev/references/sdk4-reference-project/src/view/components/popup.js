/**
 * @layer    view
 * @module   popup
 * @fires    none
 * @listens  none
 * @depends  dxUi,dxStd,font,layout,theme,i18n
 */

import dxui from '../../../dxmodules/dxUi.js';
import dxStd from '../../../dxmodules/dxStd.js';
import font from './font.js';
import layout from './layout.js';
import theme from './theme.js';
import { t } from '../i18n/index.js';

let initialized = false;
let root = null;
let card = null;
let titleLabel = null;
let messageLabel = null;
let hideTimer = null;

function clearTimer() {
    if (hideTimer) {
        dxStd.clearTimeout(hideTimer);
        hideTimer = null;
    }
}

const popup = {};

popup.init = function () {
    if (initialized) {
        return;
    }

    // SYS 层始终位于普通页面上方，适合全局提示。
    root = dxui.View.build('ui_popup_root', dxui.Utils.LAYER.SYS);
    root.setSize(layout.width, layout.height);
    root.bgOpa(0);
    root.radius(0);
    root.borderWidth(0);
    root.padAll(0);
    layout.disableScroll(root);
    root.clickable(false);

    card = dxui.View.build('ui_popup_card', root);
    card.setSize(layout.x(560), layout.y(240));
    card.align(dxui.Utils.ALIGN.CENTER, 0, layout.y(-60));
    card.bgColor(theme.pageBg);
    card.bgOpa(100);
    card.radius(layout.x(20));
    card.borderWidth(0);
    card.padAll(0);
    layout.disableScroll(card);

    titleLabel = dxui.Label.build('ui_popup_title', card);
    titleLabel.setSize(layout.x(500), layout.y(55));
    titleLabel.setPos(layout.x(30), layout.y(35));
    titleLabel.text(t('popup.title'));
    titleLabel.textFont(font.get(layout.fontSize(28), dxui.Utils.FONT_STYLE.BOLD));
    titleLabel.textAlign(dxui.Utils.TEXT_ALIGN.CENTER);

    messageLabel = dxui.Label.build('ui_popup_message', card);
    messageLabel.setSize(layout.x(500), layout.y(100));
    messageLabel.setPos(layout.x(30), layout.y(105));
    messageLabel.text('');
    messageLabel.textFont(font.get(layout.fontSize(24)));
    messageLabel.textAlign(dxui.Utils.TEXT_ALIGN.CENTER);
    messageLabel.longMode(dxui.Utils.LABEL_LONG_MODE.WRAP);

    root.hide();
    initialized = true;
};

popup.show = function (options) {
    if (!initialized) {
        return false;
    }
    const next = options || {};
    clearTimer();

    titleLabel.text(next.title || t('popup.title'));
    messageLabel.text(next.message || '');
    card.bgColor(next.backgroundColor === undefined ? theme.pageBg : next.backgroundColor);
    titleLabel.textColor(next.textColor === undefined ? theme.textPrimary : next.textColor);
    messageLabel.textColor(next.textColor === undefined ? theme.textPrimary : next.textColor);
    root.show();

    const duration = next.duration === undefined ? 2000 : next.duration;
    if (duration > 0) {
        hideTimer = dxStd.setTimeout(function () {
            popup.hide();
        }, duration);
    }
    return true;
};

popup.showSuccess = function (message, options) {
    return popup.show(Object.assign({
        title: t('popup.success'),
        message: message,
        backgroundColor: theme.successBg,
        textColor: theme.successText,
    }, options || {}));
};

popup.showError = function (message, options) {
    return popup.show(Object.assign({
        title: t('popup.error'),
        message: message,
        backgroundColor: theme.errorBg,
        textColor: theme.errorText,
    }, options || {}));
};

popup.hide = function () {
    clearTimer();
    if (!initialized) {
        return false;
    }
    root.hide();
    return true;
};

popup.destroy = function () {
    if (!initialized) {
        return;
    }
    clearTimer();
    dxui.del(root);
    root = null;
    card = null;
    titleLabel = null;
    messageLabel = null;
    initialized = false;
};

export default popup;
