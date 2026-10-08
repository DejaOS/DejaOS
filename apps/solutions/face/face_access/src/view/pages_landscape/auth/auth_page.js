/**
 * @layer    view
 * @module   auth_page
 * @fires    none
 * @listens  none
 * @depends  dxUi,BaseView,router,font,layout,theme,page_header,keyboard,i18n,popup,auth_store
 *
 * 进入设置前的身份验证：上方密码登录，下方人脸取景（透明叠层 + 全局四角跟踪框）。
 * 验证成功后 replace 到设置页，避免返回再次落到验证页。
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
import authStore from '../../pages/auth/auth_store.js';
import { CONTENT_W, ROW_H } from '../ls_metrics.js';
const LOGIN_BTN_W = 140;

export default class AuthPage extends BaseView {
    constructor() {
        super('settings_auth');
        this._header = null;
        this._content = null;
        /** @type {object|null} */
        this._topBar = null;
        /** @type {object|null} */
        this._passwordInput = null;
        /** @type {object|null} */
        this._passwordKb = null;
        /** @type {object|null} */
        this._passwordFieldLbl = null;
        /** @type {object|null} */
        this._loginBtn = null;
        /** @type {object|null} */
        this._loginLbl = null;
        /** @type {object|null} */
        this._faceHintLbl = null;
        this._faceAuthToken = 0;
        this._leaving = false;
    }

    onCreate() {
        this.root = dxui.View.build('page_auth', dxui.Utils.LAYER.MAIN);
        this.root.setSize(layout.width, layout.height);
        layout.clearStyle(this.root);
        this.root.scroll(false);
        this._applyTransparentBackground();

        // 状态栏 + 标题栏整段白底（状态栏本身在 TOP 层透明，由本页垫白）
        this._topBar = dxui.View.build('auth_top_bar', this.root);
        layout.clearStyle(this._topBar);
        this._topBar.setSize(layout.width, pageHeader.contentTop());
        this._topBar.setPos(0, 0);
        this._topBar.bgColor(theme.pageBg);
        this._topBar.bgOpa(100);
        this._topBar.scroll(false);
        this._topBar.clickable(false);

        this._header = pageHeader.build(this.root, {
            idPrefix: 'auth',
            titleKey: 'auth.title',
        });
        this._buildBody();
    }

    onEnter() {
        this._applyTransparentBackground();
        if (this._header) {
            this._header.refresh();
        }
        this._setInput(this._passwordInput, '');
        this._refreshLabels();
        this._leaving = false;
        const token = ++this._faceAuthToken;
        this._startFaceAuth(token);
    }

    onExit() {
        this._leaving = true;
        this._faceAuthToken += 1;
        authStore.cancelFaceAuth();
        if (this._passwordKb) {
            this._passwordKb.hide();
        }
        keyboard.hideAll();
    }

    /**
     * 透明叠层：透出摄像头底层画面，避免整页底色遮挡人脸取景。
     */
    _applyTransparentBackground() {
        this.root.bgOpa(0);
        if (this._content) {
            this._content.bgOpa(0);
        }
    }

    _buildBody() {
        const self = this;
        const top = pageHeader.contentTop();
        const contentH = layout.height - top;
        // 白底密码区：上边距 + 输入行 + 下边距（登录按钮在输入框右侧）
        const pwdPanelH = layout.y(16 + ROW_H + 16);

        this._content = dxui.View.build('auth_content', this.root);
        this._content.setSize(layout.width, contentH);
        this._content.setPos(0, top);
        layout.clearStyle(this._content);
        this._content.bgOpa(0);
        this._content.scroll(false);

        const pwdPanel = dxui.View.build('auth_pwd_panel', this._content);
        layout.clearStyle(pwdPanel);
        pwdPanel.setSize(layout.width, pwdPanelH);
        pwdPanel.setPos(0, 0);
        pwdPanel.bgColor(theme.pageBg);
        pwdPanel.bgOpa(100);
        pwdPanel.scroll(false);

        this._buildPasswordSection(pwdPanel);
        this._buildFaceSection(contentH, pwdPanelH);
    }

    /**
     * 上方：密码标签 + 输入框 + 右侧登录按钮。
     * @param {object} parent
     */
    _buildPasswordSection(parent) {
        const self = this;
        const row = dxui.View.build('auth_pwd_row', parent);
        layout.clearStyle(row);
        row.setSize(layout.x(CONTENT_W), layout.y(ROW_H));
        row.align(dxui.Utils.ALIGN.TOP_MID, 0, layout.y(16));
        row.bgColor(0xf5f5f5);
        row.bgOpa(100);
        row.radius(layout.x(14));
        row.scroll(false);

        this._passwordFieldLbl = dxui.Label.build('auth_pwd_lbl', row);
        this._passwordFieldLbl.setSize(layout.x(120), layout.y(36));
        this._passwordFieldLbl.align(dxui.Utils.ALIGN.LEFT_MID, layout.x(24), 0);
        this._passwordFieldLbl.textFont(font.get(layout.fontSize(24)));
        this._passwordFieldLbl.textColor(theme.textPrimary);
        this._passwordFieldLbl.textAlign(dxui.Utils.TEXT_ALIGN.LEFT);

        this._loginBtn = dxui.Button.build('auth_login_btn', row);
        this._loginBtn.setSize(layout.x(LOGIN_BTN_W), layout.y(52));
        this._loginBtn.align(dxui.Utils.ALIGN.RIGHT_MID, -layout.x(16), 0);
        this._loginBtn.bgColor(theme.activeBg);
        this._loginBtn.radius(layout.x(12));
        this._loginBtn.borderWidth(0);
        this._loginBtn.on(dxui.Utils.EVENT.CLICK, function () {
            self._onPasswordLogin();
        });

        this._loginLbl = dxui.Label.build('auth_login_lbl', this._loginBtn);
        this._loginLbl.textFont(font.get(layout.fontSize(24)));
        this._loginLbl.textColor(theme.textOnDark);
        this._loginLbl.align(dxui.Utils.ALIGN.CENTER, 0, 0);

        const inputBox = dxui.View.build('auth_pwd_box', row);
        layout.clearStyle(inputBox);
        inputBox.setSize(layout.x(760), layout.y(52));
        inputBox.align(dxui.Utils.ALIGN.LEFT_MID, layout.x(150), 0);
        inputBox.bgColor(theme.pageBg);
        inputBox.bgOpa(100);
        inputBox.radius(layout.x(12));
        inputBox.borderWidth(layout.x(2));
        inputBox.setBorderColor(0xdcdcdc);
        inputBox.scroll(false);

        this._passwordInput = dxui.Textarea.build('auth_pwd_input', inputBox);
        layout.clearStyle(this._passwordInput);
        this._passwordInput.setSize(layout.x(720), layout.y(40));
        this._passwordInput.align(dxui.Utils.ALIGN.CENTER, 0, 0);
        this._passwordInput.bgOpa(0);
        this._passwordInput.padAll(0);
        this._passwordInput.borderWidth(0);
        this._passwordInput.setOneLine(true);
        this._passwordInput.setMaxLength(64);
        this._passwordInput.setCursorClickPos(true);
        this._passwordInput.textFont(font.get(layout.fontSize(24)));
        this._passwordInput.textColor(theme.textPrimary);
        this._passwordInput.setAlign(dxui.Utils.TEXT_ALIGN.LEFT);
        this._passwordInput.text('');

        this._passwordKb = keyboard.bind(null, this._passwordInput, {
            mode: keyboard.MODE.ENGLISH,
            placeholder: t('auth.passwordPlaceholder'),
        });
    }

    /**
     * 下方：人脸认证取景区（全透明，跟踪框由全局 face_box 绘制，与首页同款）。
     * @param {number} contentH
     * @param {number} pwdPanelH
     */
    _buildFaceSection(contentH, pwdPanelH) {
        const faceAreaH = Math.max(layout.y(160), contentH - pwdPanelH);

        const faceArea = dxui.View.build('auth_face_area', this._content);
        layout.clearStyle(faceArea);
        faceArea.setSize(layout.width, faceAreaH);
        faceArea.setPos(0, pwdPanelH);
        faceArea.bgOpa(0);
        faceArea.scroll(false);
        faceArea.clickable(true);

        this._faceHintLbl = dxui.Label.build('auth_face_hint', faceArea);
        this._faceHintLbl.setSize(layout.x(800), layout.y(40));
        this._faceHintLbl.align(dxui.Utils.ALIGN.BOTTOM_MID, 0, -layout.y(24));
        this._faceHintLbl.textFont(font.get(layout.fontSize(22)));
        this._faceHintLbl.textColor(theme.textOnDark);
        this._faceHintLbl.textAlign(dxui.Utils.TEXT_ALIGN.CENTER);
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
        const labelFont = font.get(layout.fontSize(28));
        const fieldFont = font.get(layout.fontSize(26));
        const hintFont = font.get(layout.fontSize(24));
        if (this._faceHintLbl) {
            this._faceHintLbl.text(t('auth.faceHint'));
            this._faceHintLbl.textFont(hintFont);
        }
        if (this._passwordFieldLbl) {
            this._passwordFieldLbl.text(t('auth.field.password'));
            this._passwordFieldLbl.textFont(fieldFont);
        }
        if (this._passwordInput) {
            this._passwordInput.textFont(fieldFont);
        }
        if (this._passwordKb) {
            this._passwordKb.setPlaceholder(t('auth.passwordPlaceholder'));
        }
        if (this._loginLbl) {
            this._loginLbl.text(t('auth.login'));
            this._loginLbl.textFont(labelFont);
        }
    }

    async _startFaceAuth(token) {
        const result = await authStore.startFaceAuth();
        if (this._leaving || token !== this._faceAuthToken) return;
        if (result && result.ok) {
            this._onFaceLogin();
            return;
        }
        if (result && result.cancelled) return;
        popup.showError(t('auth.error.faceFail'));
        const self = this;
        this.setTimeout(function () {
            if (!self._leaving && token === self._faceAuthToken) self._startFaceAuth(token);
        }, 500);
    }

    _enterSettings() {
        if (this._leaving) return;
        this._leaving = true;
        this._faceAuthToken += 1;
        authStore.cancelFaceAuth();
        keyboard.hideAll();
        router.replace('settings');
    }

    _onPasswordLogin() {
        keyboard.hideAll();
        const result = authStore.verifyPassword(this._readInput(this._passwordInput));
        if (!result.ok) {
            if (result.error === 'passwordRequired') {
                popup.showError(t('auth.error.passwordRequired'));
                return;
            }
            popup.showError(t('auth.error.passwordWrong'));
            return;
        }
        this._enterSettings();
    }

    /** 管理员人脸认证成功入口。 */
    _onFaceLogin() {
        if (this._passwordKb) this._passwordKb.hide();
        keyboard.hideAll();
        this._enterSettings();
    }
}
