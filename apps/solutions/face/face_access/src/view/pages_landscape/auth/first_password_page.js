/**
 * @layer    view
 * @module   first_password_page
 * @fires    none
 * @listens  none
 * @depends  dxUi,BaseView,router,font,layout,theme,page_header,keyboard,i18n,popup,system_store
 *
 * 首次设置管理员密码（横屏）：规则提示 + 新密码/确认密码；跳过与保存并排。
 * 密码按产品要求明文显示。保存或跳过都会持久化首次登录状态。
 */

import dxui from '../../../../dxmodules/dxUi.js';
import BaseView from '../../pages/base_view.js';
import router from '../../router/core.js';
import font from '../../components/font.js';
import layout from '../../components/layout.js';
import theme from '../../components/theme.js';
import pageHeader from '../../components/page_header.js';
import keyboard from '../../components/keyboard.js';
import popup from '../../components/popup.js';
import { t } from '../../i18n/index.js';
import systemStore from '../../pages/system/system_store.js';
import { CONTENT_W, ACTION_BTN_BOTTOM } from '../ls_metrics.js';

const COUNTDOWN_SEC = 15;
/** 密码输入行高（略高于通用 ROW_H，避免占位/输入被裁） */
const PWD_ROW_H = 88;
/** 本页底栏按钮高度（双按钮略加高）。 */
const PWD_ACTION_BTN_H = 80;
/** 跳过 / 保存间距 */
const ACTION_BTN_GAP = 24;
/** 规则提示区高度 */
const HINT_H = 150;
/** 提示与首行间距 */
const HINT_GAP = 20;

export default class FirstPasswordPage extends BaseView {
    constructor() {
        super('settings_first_password');
        this._header = null;
        /** @type {object|null} */
        this._hintLbl = null;
        /** @type {object|null} */
        this._newInput = null;
        /** @type {object|null} */
        this._confirmInput = null;
        /** @type {object|null} */
        this._newKb = null;
        /** @type {object|null} */
        this._confirmKb = null;
        /** @type {object|null} */
        this._newFieldLbl = null;
        /** @type {object|null} */
        this._confirmFieldLbl = null;
        /** @type {object|null} */
        this._saveLbl = null;
        /** @type {object|null} */
        this._skipLbl = null;
        /** @type {object|null} */
        this._countdownLbl = null;
        /** @type {number} */
        this._remainSec = COUNTDOWN_SEC;
        /** @type {boolean} */
        this._leaving = false;
        /** 避免状态轮询重入。 */
        this._stateChecking = false;
    }

    onCreate() {
        this.root = dxui.View.build('page_first_password', dxui.Utils.LAYER.MAIN);
        this.root.setSize(layout.width, layout.height);
        layout.clearStyle(this.root);
        this.root.bgColor(theme.pageBg);
        this.root.bgOpa(100);
        this.root.scroll(false);

        const self = this;
        this._header = pageHeader.build(this.root, {
            idPrefix: 'first_pwd',
            titleKey: 'firstPassword.title',
            onBack: function () {
                self._leaveHome();
            },
        });
        this._buildBody();
    }

    onEnter() {
        if (this._header) {
            this._header.refresh();
        }
        this._leaving = false;
        this._setInput(this._newInput, '');
        this._setInput(this._confirmInput, '');
        this._refreshLabels();
        this._startCountdown();
        this._startStatePolling();
    }

    onExit() {
        this._leaving = false;
        if (this._newKb) {
            this._newKb.hide();
        }
        if (this._confirmKb) {
            this._confirmKb.hide();
        }
        keyboard.hideAll();
    }

    _buildBody() {
        const self = this;
        const top = pageHeader.contentTop();
        const contentH = layout.height - top;
        const formTop = 16 + HINT_H + HINT_GAP;

        const content = dxui.View.build('first_pwd_content', this.root);
        content.setSize(layout.width, contentH);
        content.setPos(0, top);
        layout.clearStyle(content);
        content.bgColor(0xf5f5f5);
        content.bgOpa(100);
        content.scroll(false);

        this._countdownLbl = dxui.Label.build('first_pwd_countdown', content);
        this._countdownLbl.setSize(layout.x(120), layout.y(36));
        this._countdownLbl.align(dxui.Utils.ALIGN.TOP_RIGHT, -layout.x(28), layout.y(8));
        this._countdownLbl.textFont(font.get(layout.fontSize(24)));
        this._countdownLbl.textColor(theme.textSecondary);
        this._countdownLbl.textAlign(dxui.Utils.TEXT_ALIGN.RIGHT);

        this._hintLbl = dxui.Label.build('first_pwd_hint', content);
        this._hintLbl.setSize(layout.x(CONTENT_W), layout.y(HINT_H));
        this._hintLbl.align(dxui.Utils.ALIGN.TOP_MID, 0, layout.y(16));
        this._hintLbl.textFont(font.get(layout.fontSize(18)));
        this._hintLbl.textColor(theme.textSecondary);
        this._hintLbl.textAlign(dxui.Utils.TEXT_ALIGN.LEFT);
        this._hintLbl.longMode(dxui.Utils.LABEL_LONG_MODE.WRAP);

        const newRow = this._buildPasswordRow(content, 'new', layout.y(formTop));
        this._newFieldLbl = newRow.fieldLbl;
        this._newInput = newRow.input;
        this._newKb = newRow.kb;

        const confirmRow = this._buildPasswordRow(
            content,
            'confirm',
            layout.y(formTop + PWD_ROW_H + 14)
        );
        this._confirmFieldLbl = confirmRow.fieldLbl;
        this._confirmInput = confirmRow.input;
        this._confirmKb = confirmRow.kb;

        // 跳过 / 保存并排，避免两个超宽细条
        const btnW = Math.floor((CONTENT_W - ACTION_BTN_GAP) / 2);
        const btnY = -layout.y(ACTION_BTN_BOTTOM);
        const pairW = layout.x(CONTENT_W);
        const leftX = Math.round((layout.width - pairW) / 2);

        const skipBtn = dxui.Button.build('first_pwd_skip', content);
        skipBtn.setSize(layout.x(btnW), layout.y(PWD_ACTION_BTN_H));
        skipBtn.setPos(leftX, contentH + btnY - layout.y(PWD_ACTION_BTN_H));
        skipBtn.bgColor(theme.pageBg);
        skipBtn.radius(layout.x(14));
        skipBtn.borderWidth(layout.x(2));
        skipBtn.setBorderColor(0xdcdcdc);
        skipBtn.on(dxui.Utils.EVENT.CLICK, function () {
            self._onSkip();
        });

        this._skipLbl = dxui.Label.build('first_pwd_skip_lbl', skipBtn);
        this._skipLbl.textFont(font.get(layout.fontSize(28)));
        this._skipLbl.textColor(theme.textMuted);
        this._skipLbl.align(dxui.Utils.ALIGN.CENTER, 0, 0);

        const saveBtn = dxui.Button.build('first_pwd_save', content);
        saveBtn.setSize(layout.x(btnW), layout.y(PWD_ACTION_BTN_H));
        saveBtn.setPos(
            leftX + layout.x(btnW + ACTION_BTN_GAP),
            contentH + btnY - layout.y(PWD_ACTION_BTN_H)
        );
        saveBtn.bgColor(theme.activeBg);
        saveBtn.radius(layout.x(14));
        saveBtn.borderWidth(0);
        saveBtn.on(dxui.Utils.EVENT.CLICK, function () {
            self._onSave();
        });

        this._saveLbl = dxui.Label.build('first_pwd_save_lbl', saveBtn);
        this._saveLbl.textFont(font.get(layout.fontSize(28)));
        this._saveLbl.textColor(theme.textOnDark);
        this._saveLbl.align(dxui.Utils.ALIGN.CENTER, 0, 0);
    }

    /**
     * @param {object} parent
     * @param {string} key
     * @param {number} y
     * @returns {{ fieldLbl: object, input: object, kb: object }}
     */
    _buildPasswordRow(parent, key, y) {
        const self = this;
        const labelW = 280;
        const sidePad = 24;
        const gap = 16;
        const inputBoxW = CONTENT_W - sidePad * 2 - labelW - gap;
        const inputBoxH = 64;
        const inputInnerW = inputBoxW - 32;
        const inputInnerH = 44;

        const row = dxui.View.build('first_pwd_row_' + key, parent);
        layout.clearStyle(row);
        row.setSize(layout.x(CONTENT_W), layout.y(PWD_ROW_H));
        row.align(dxui.Utils.ALIGN.TOP_MID, 0, y);
        row.bgColor(theme.pageBg);
        row.bgOpa(100);
        row.radius(layout.x(14));
        row.scroll(false);

        const fieldLbl = dxui.Label.build('first_pwd_lbl_' + key, row);
        fieldLbl.setSize(layout.x(labelW), layout.y(40));
        fieldLbl.align(dxui.Utils.ALIGN.LEFT_MID, layout.x(sidePad), 0);
        fieldLbl.textFont(font.get(layout.fontSize(26)));
        fieldLbl.textColor(theme.textPrimary);
        fieldLbl.textAlign(dxui.Utils.TEXT_ALIGN.LEFT);

        const inputBox = dxui.View.build('first_pwd_box_' + key, row);
        layout.clearStyle(inputBox);
        inputBox.setSize(layout.x(inputBoxW), layout.y(inputBoxH));
        inputBox.align(dxui.Utils.ALIGN.RIGHT_MID, -layout.x(sidePad), 0);
        inputBox.bgColor(0xf5f5f5);
        inputBox.bgOpa(100);
        inputBox.radius(layout.x(12));
        inputBox.borderWidth(layout.x(2));
        inputBox.setBorderColor(0xdcdcdc);
        inputBox.scroll(false);

        const input = dxui.Textarea.build('first_pwd_input_' + key, inputBox);
        layout.clearStyle(input);
        input.setSize(layout.x(inputInnerW), layout.y(inputInnerH));
        input.align(dxui.Utils.ALIGN.CENTER, 0, 0);
        input.bgOpa(0);
        input.padAll(0);
        input.borderWidth(0);
        input.setOneLine(true);
        input.setMaxLength(64);
        input.setCursorClickPos(true);
        input.textFont(font.get(layout.fontSize(26)));
        input.textColor(theme.textPrimary);
        input.setAlign(dxui.Utils.TEXT_ALIGN.LEFT);
        input.text('');

        const kb = keyboard.bind(null, input, {
            mode: keyboard.MODE.ENGLISH,
            placeholder: t('firstPassword.placeholder'),
        });
        kb.setContentCb(function () {
            self._resetCountdown();
        });

        return { fieldLbl: fieldLbl, input: input, kb: kb };
    }

    /**
     * @param {object|null} input
     * @param {string} value
     */
    _setInput(input, value) {
        if (!input) {
            return;
        }
        input.text(value == null ? '' : String(value));
    }

    /**
     * @param {object|null} input
     * @returns {string}
     */
    _readInput(input) {
        if (!input) {
            return '';
        }
        try {
            return String(input.text() || '');
        } catch (_e) {
            return '';
        }
    }

    _refreshLabels() {
        if (this._hintLbl) {
            this._hintLbl.text(t('firstPassword.hint'));
        }
        if (this._newFieldLbl) {
            this._newFieldLbl.text(t('firstPassword.newPassword'));
        }
        if (this._confirmFieldLbl) {
            this._confirmFieldLbl.text(t('firstPassword.confirmPassword'));
        }
        if (this._newKb) {
            this._newKb.setPlaceholder(t('firstPassword.placeholder'));
        }
        if (this._confirmKb) {
            this._confirmKb.setPlaceholder(t('firstPassword.placeholder'));
        }
        if (this._saveLbl) {
            this._saveLbl.text(t('firstPassword.save'));
        }
        if (this._skipLbl) {
            this._skipLbl.text(t('firstPassword.skip'));
        }
        if (this._countdownLbl) {
            this._countdownLbl.text(this._remainSec + 's');
        }
    }

    _startStatePolling() {
        const self = this;
        const check = function () {
            if (self._leaving || self._stateChecking || router.getCurrent() !== self.name) return;
            self._stateChecking = true;
            systemStore.load().then(function () {
                // WebServer完成首次设密后，正在显示的设备页面也要立即退出首次设密流程。
                if (!self._leaving && router.getCurrent() === self.name
                    && systemStore.isFirstLoginDone()) self._goAuth();
            }).catch(function () {
                // 短暂查询失败不打断本地设密，下一轮继续读取。
            }).finally(function () {
                self._stateChecking = false;
            });
        };
        check();
        this.setInterval(check, 2000);
    }

    _startCountdown() {
        this._remainSec = COUNTDOWN_SEC;
        this._paintCountdown();
        const self = this;
        this.setInterval(function () {
            if (self._leaving) {
                return;
            }
            self._remainSec -= 1;
            if (self._remainSec <= 0) {
                self._leaveHome();
                return;
            }
            self._paintCountdown();
        }, 1000);
    }

    _resetCountdown() {
        this._remainSec = COUNTDOWN_SEC;
        this._paintCountdown();
    }

    _paintCountdown() {
        if (this._countdownLbl) {
            this._countdownLbl.text(this._remainSec + 's');
        }
    }

    _goAuth() {
        if (this._leaving) {
            return;
        }
        this._leaving = true;
        keyboard.hideAll();
        router.replace('settings_auth');
    }

    _leaveHome() {
        if (this._leaving) {
            return;
        }
        this._leaving = true;
        keyboard.hideAll();
        const stack = router.getStack();
        if (stack.indexOf('home') >= 0) {
            router.backTo('home');
        } else {
            router.replace('home');
        }
    }

    async _onSkip() {
        const result = await systemStore.completeFirstLogin();
        if (!result.ok) {
            popup.showError(result.message || t('firstPassword.error.service'));
            this._resetCountdown();
            return;
        }
        this._goAuth();
    }

    async _onSave() {
        keyboard.hideAll();
        const pwd = this._readInput(this._newInput);
        const confirm = this._readInput(this._confirmInput);
        if (!pwd || !confirm) {
            popup.showError(t('firstPassword.error.required'));
            this._resetCountdown();
            return;
        }

        if (pwd !== confirm) {
            popup.showError(t('firstPassword.error.mismatch'));
            this._resetCountdown();
            return;
        }
        const result = await systemStore.completeFirstLogin(pwd);
        if (!result.ok) {
            popup.showError(result.message || t('firstPassword.error.service'));
            this._resetCountdown();
            return;
        }
        popup.showSuccess(t('firstPassword.success'));
        this._goAuth();
    }
}
