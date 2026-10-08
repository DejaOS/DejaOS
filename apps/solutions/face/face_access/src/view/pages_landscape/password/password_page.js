/**
 * @layer    view
 * @module   password_page
 * @fires    CMD_PASSWORD_ACCESS
 * @listens  none
 * @depends  dxUi,BaseView,router,font,layout,theme,page_header,popup,i18n,password_store
 *
 * 密码通行：主页密码入口。仅数字，自绘键盘（3 行 × 4 列）+ 清空 / 0 / 删除，不接键盘组件。
 * 密码位数由sys.passwordLength决定；满位后通过Command进入统一鉴权流程。
 */

import dxui from '../../../../dxmodules/dxUi.js';
import BaseView from '../../pages/base_view.js';
import router from '../../router/core.js';
import font from '../../components/font.js';
import layout from '../../components/layout.js';
import theme from '../../components/theme.js';
import pageHeader from '../../components/page_header.js';
import popup from '../../components/popup.js';
import { t } from '../../i18n/index.js';
import passwordStore from '../../pages/password/password_store.js';

const MAX_PASSWORD_LEN = 8;
const COUNTDOWN_SEC = 60;
/** 排布对齐 landscape/pwdView.js：3 行 × 4 列；clr/del 仍用文字 */
const KEYS = ['1', '2', '3', 'del', '4', '5', '6', '0', '7', '8', '9', 'clr'];

const KEY_W = 250;
const KEY_H = 125;
const KEY_GAP = 32;
const KEY_COLS = 4;
const KEY_ROWS = 3;
const KEY_RADIUS = 12;
const KEY_BG = 0xf1f5f9;
const KEY_BG_PRESSED = 0xe2e8f0;
const KEY_TEXT = 0x1e293b;

export default class PasswordPage extends BaseView {
    constructor() {
        super('password_access');
        this._header = null;
        /** @type {object|null} */
        this._countdownLbl = null;
        this._lengthLbl = null;
        this._dotsBox = null;
        this._passwordLen = 6;
        /** @type {object[]} */
        this._dots = [];
        /** @type {Object.<string, object>} */
        this._keyLabels = {};
        /** @type {string[]} */
        this._digits = [];
        /** @type {number} */
        this._remainSec = COUNTDOWN_SEC;
        /** @type {boolean} */
        this._submitting = false;
    }

    onCreate() {
        this.root = dxui.View.build('page_password_access', dxui.Utils.LAYER.MAIN);
        this.root.setSize(layout.width, layout.height);
        layout.clearStyle(this.root);
        this.root.bgColor(theme.pageBg);
        this.root.bgOpa(100);
        this.root.scroll(false);

        const self = this;
        this._header = pageHeader.build(this.root, {
            idPrefix: 'pwd_access',
            titleKey: 'passwordAccess.title',
            onBack: function () {
                self._leave();
            },
        });
        this._buildBody();
    }

    onEnter() {
        if (this._header) {
            this._header.refresh();
        }
        this._passwordLen = passwordStore.getLength();
        this._refreshKeyLabels();
        this._refreshDotsLayout();
        this._resetInput();
        this._startCountdown();

        const self = this;
        passwordStore.refreshLength().then(function (length) {
            // Router不等待onEnter Promise，返回后必须确认页面仍处于前台。
            if (router.getCurrent() !== self.name || length === self._passwordLen) return;
            self._passwordLen = length;
            self._refreshDotsLayout();
            self._resetInput();
        }).catch(function () {
            // 查询失败时沿用启动阶段缓存；Domain仍会执行最终位数校验。
        });
    }

    onExit() {
        this._submitting = false;
    }

    _buildBody() {
        const top = pageHeader.contentTop();
        const contentH = layout.height - top;

        const content = dxui.View.build('pwd_access_content', this.root);
        content.setSize(layout.width, contentH);
        content.setPos(0, top);
        layout.clearStyle(content);
        content.bgColor(theme.pageBg);
        content.bgOpa(100);
        content.scroll(false);

        this._countdownLbl = dxui.Label.build('pwd_access_countdown', content);
        this._countdownLbl.setSize(layout.x(120), layout.y(32));
        this._countdownLbl.align(dxui.Utils.ALIGN.TOP_RIGHT, -layout.x(28), layout.y(4));
        this._countdownLbl.textFont(font.get(layout.fontSize(22)));
        this._countdownLbl.textColor(theme.textSecondary);
        this._countdownLbl.textAlign(dxui.Utils.TEXT_ALIGN.RIGHT);
        this._countdownLbl.text(COUNTDOWN_SEC + 's');

        this._lengthLbl = dxui.Label.build('pwd_access_length', content);
        this._lengthLbl.setSize(layout.x(600), layout.y(32));
        this._lengthLbl.align(dxui.Utils.ALIGN.TOP_MID, 0, layout.y(8));
        this._lengthLbl.textFont(font.get(layout.fontSize(20)));
        this._lengthLbl.textColor(theme.textSecondary);
        this._lengthLbl.textAlign(dxui.Utils.TEXT_ALIGN.CENTER);

        this._buildDots(content);
        this._buildKeypad(content);
    }

    /**
     * 密码圆点：空心未输入，实心已输入；个数由配置位数决定。
     * @param {object} parent
     */
    _buildDots(parent) {
        const dotSize = layout.x(22);
        const gap = layout.x(18);
        const boxW = MAX_PASSWORD_LEN * dotSize + (MAX_PASSWORD_LEN - 1) * gap;

        const box = dxui.View.build('pwd_access_dots', parent);
        this._dotsBox = box;
        layout.clearStyle(box);
        box.setSize(boxW, layout.y(36));
        box.align(dxui.Utils.ALIGN.TOP_MID, 0, layout.y(44));
        box.bgOpa(0);
        box.scroll(false);
        box.flexFlow(dxui.Utils.FLEX_FLOW.ROW);
        box.flexAlign(
            dxui.Utils.FLEX_ALIGN.CENTER,
            dxui.Utils.FLEX_ALIGN.CENTER,
            dxui.Utils.FLEX_ALIGN.CENTER
        );
        box.obj.lvObjSetStylePadGap(gap, dxui.Utils.ENUM._LV_STYLE_STATE_CMP_SAME);

        this._dots = [];
        for (let i = 0; i < MAX_PASSWORD_LEN; i++) {
            const dot = dxui.View.build('pwd_access_dot_' + i, box);
            layout.clearStyle(dot);
            dot.setSize(dotSize, dotSize);
            dot.radius(Math.floor(dotSize / 2));
            dot.borderWidth(2);
            dot.setBorderColor(theme.textPrimary);
            dot.bgColor(theme.textPrimary);
            dot.bgOpa(0);
            dot.clickable(false);
            this._dots.push(dot);
        }
    }

    /**
     * 数字键盘：3 行 × 4 列，排布/尺寸对齐 landscape/pwdView.js；clr/del 用文字。
     * @param {object} parent
     */
    _buildKeypad(parent) {
        const keyW = layout.x(KEY_W);
        const keyH = layout.y(KEY_H);
        const gap = layout.x(KEY_GAP);
        const gridW = KEY_COLS * keyW + (KEY_COLS - 1) * gap;
        const gridH = KEY_ROWS * keyH + (KEY_ROWS - 1) * gap;

        const grid = dxui.View.build('pwd_access_keys', parent);
        layout.clearStyle(grid);
        grid.setSize(gridW, gridH);
        grid.align(dxui.Utils.ALIGN.BOTTOM_MID, 0, -layout.y(40));
        grid.bgOpa(0);
        grid.scroll(false);
        grid.flexFlow(dxui.Utils.FLEX_FLOW.ROW_WRAP);
        grid.flexAlign(
            dxui.Utils.FLEX_ALIGN.CENTER,
            dxui.Utils.FLEX_ALIGN.CENTER,
            dxui.Utils.FLEX_ALIGN.CENTER
        );
        grid.obj.lvObjSetStylePadGap(gap, dxui.Utils.ENUM._LV_STYLE_STATE_CMP_SAME);

        const self = this;
        for (let i = 0; i < KEYS.length; i++) {
            const key = KEYS[i];
            const isSpecial = key === 'clr' || key === 'del';
            const btn = dxui.Button.build('pwd_access_key_' + key, grid);
            btn.setSize(keyW, keyH);
            btn.bgColor(KEY_BG);
            btn.bgOpa(100);
            btn.bgColor(KEY_BG_PRESSED, dxui.Utils.STATE.PRESSED);
            btn.radius(layout.x(KEY_RADIUS));
            btn.borderWidth(0);
            btn.padAll(0);

            const lbl = dxui.Label.build('pwd_access_key_lbl_' + key, btn);
            lbl.textFont(font.get(layout.fontSize(isSpecial ? 24 : 40)));
            lbl.textColor(KEY_TEXT);
            lbl.align(dxui.Utils.ALIGN.CENTER, 0, 0);
            this._keyLabels[key] = lbl;

            btn.on(dxui.Utils.EVENT.CLICK, function () {
                self._onKey(key);
            });
        }
    }

    _refreshKeyLabels() {
        if (this._keyLabels['clr']) {
            this._keyLabels['clr'].text(t('passwordAccess.key.clear'));
        }
        if (this._keyLabels['del']) {
            this._keyLabels['del'].text(t('passwordAccess.key.delete'));
        }
        for (let i = 0; i < KEYS.length; i++) {
            const key = KEYS[i];
            if (key === 'clr' || key === 'del') {
                continue;
            }
            if (this._keyLabels[key]) {
                this._keyLabels[key].text(key);
            }
        }
    }

    /**
     * @param {string} key
     */
    _onKey(key) {
        if (this._submitting) {
            return;
        }
        this._bumpCountdown();

        if (key === 'clr') {
            this._resetInput();
            return;
        }
        if (key === 'del') {
            if (this._digits.length > 0) {
                this._digits.pop();
                this._paintDots();
            }
            return;
        }
        if (this._digits.length >= this._passwordLen) {
            return;
        }
        this._digits.push(key);
        this._paintDots();
        if (this._digits.length >= this._passwordLen) {
            this._submit();
        }
    }

    _refreshDotsLayout() {
        if (this._lengthLbl) this._lengthLbl.text(t('passwordAccess.lengthHint', { length: this._passwordLen }));
        const dotSize = layout.x(22);
        const gap = layout.x(18);
        if (this._dotsBox) this._dotsBox.setSize(
            this._passwordLen * dotSize + (this._passwordLen - 1) * gap,
            layout.y(36)
        );
        for (let i = 0; i < this._dots.length; i++) {
            if (i < this._passwordLen) this._dots[i].show();
            else this._dots[i].hide();
        }
    }

    _paintDots() {
        const filled = this._digits.length;
        for (let i = 0; i < this._dots.length; i++) {
            if (i < filled) {
                this._dots[i].bgOpa(100);
            } else {
                this._dots[i].bgOpa(0);
            }
        }
    }

    _resetInput() {
        this._digits = [];
        this._paintDots();
    }

    _submit() {
        const pwd = this._digits.join('');
        this._submitting = true;
        const self = this;
        passwordStore.verify(pwd).then(function (result) {
            if (result.ok) {
                // 成功/拒绝提示由 access_service -> ui_domain 统一驱动，页面不重复弹窗。
                self._leave();
                return;
            }
            if (result.error === 'disabled') {
                popup.showError(t('passwordAccess.error.disabled'));
            }
            self._resetInput();
        }).catch(function () {
            popup.showError(t('passwordAccess.fail'));
            self._resetInput();
        }).finally(function () {
            self._submitting = false;
        });
    }
    _startCountdown() {
        this._remainSec = COUNTDOWN_SEC;
        this._paintCountdown();
        const self = this;
        this.setInterval(function () {
            self._remainSec -= 1;
            if (self._remainSec < 0) {
                self._leave();
                return;
            }
            self._paintCountdown();
        }, 1000);
    }

    _bumpCountdown() {
        this._remainSec = COUNTDOWN_SEC;
        this._paintCountdown();
    }

    _paintCountdown() {
        if (this._countdownLbl) {
            this._countdownLbl.text(this._remainSec + 's');
        }
    }

    _leave() {
        router.back();
    }
}
