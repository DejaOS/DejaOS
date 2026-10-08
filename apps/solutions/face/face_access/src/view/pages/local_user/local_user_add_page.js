/**
 * @layer    view
 * @module   local_user_add_page
 * @fires    none
 * @listens  none
 * @depends  dxUi,BaseView,router,font,layout,theme,page_header,keyboard,i18n,popup,confirm,local_user_store
 *
 * 本地用户新增 / 编辑表单页（同布局）。
 * 新增：空表，用户 ID 自动随机生成且不展示；编辑：按 params.id 回填，ID 不可改且不展示。
 * 两页均含凭证删除；底部「删除用户」仅编辑页。
 */

import dxui from '../../../../dxmodules/dxUi.js';
import dxCommonUtils from '../../../../dxmodules/dxCommonUtils.js';
import BaseView from '../base_view.js';
import router from '../../router/core.js';
import font from '../../components/font.js';
import layout from '../../components/layout.js';
import theme from '../../components/theme.js';
import pageHeader from '../../components/page_header.js';
import keyboard from '../../components/keyboard.js';
import popup from '../../components/popup.js';
import confirm from '../../components/confirm.js';
import { t } from '../../i18n/index.js';
import { asset } from '../../utils/assets.js';
import localUserStore from './local_user_store.js';
import capabilityStore from '../../core/capability_store.js';
import systemStore from '../system/system_store.js';
import voucherTypes from '../../../core/voucher_types.js';

/** 普通表单行高 */
const ROW_H = 104;
/** 分段 / 输入框 / 凭证操作按钮高度 */
const SEG_H = 72;
/** 按钮相对容器内边距，避免按下放大/阴影被父级裁切 */
const BTN_INSET = 10;
/** 人脸凭证行高 */
const FACE_ROW_H = 160;
/** 行间距（略留空，按下动效可画到行间灰底上） */
const ROW_GAP = 14;
/** 凭证行删除按钮宽度 */
const CRED_CLEAR_W = 108;
/** 底部主按钮高度 */
const ACTION_BTN_H = 88;
/** 底部主按钮距底边距 */
const ACTION_BTN_BOTTOM = 48;
/** 编辑页删除与保存按钮间距 */
const ACTION_BTN_GAP = 16;
const IMG_DROPDOWN = asset('down.png');
const DETAIL_SECTIONS = ['info', 'credential', 'dualVerify'];
const CREDENTIAL_GROUPS = ['password', 'card', 'code'];

function copyCredentials(items) {
    return (Array.isArray(items) ? items : []).map(function (item) {
        return {
            keyId: String(item.keyId || ''),
            type: String(item.type || ''),
            code: String(item.code || ''),
            extra: item.extra || {},
        };
    });
}

/**
 * 允许子控件绘制超出边界（LVGL 默认裁切，会切掉按钮按下动画）。
 * @param {object} view
 */
function allowOverflow(view) {
    if (!view || !view.obj || typeof view.obj.lvObjAddFlag !== 'function') {
        return;
    }
    const flag = dxui.Utils.ENUM.LV_OBJ_FLAG_OVERFLOW_VISIBLE;
    if (flag == null) {
        return;
    }
    view.obj.lvObjAddFlag(flag);
}

/**
 * 去掉默认阴影（易被行容器裁切，看起来像动效被挡住）。
 * @param {object} btn
 */
function clearBtnShadow(btn) {
    if (!btn) {
        return;
    }
    btn.shadow(0, 0, 0, 0, 0, 0);
    btn.shadow(0, 0, 0, 0, 0, 0, dxui.Utils.STATE.PRESSED);
}

/** 与云端/Web 一致：extra.type 0=普通用户，1=管理员 */
const USER_TYPE_OPTIONS = [
    { id: '0', labelKey: 'localUser.type.normal' },
    { id: '1', labelKey: 'localUser.type.admin' },
];

class LocalUserFormPage extends BaseView {
    /**
     * @param {{ route: string, mode: 'add'|'edit', idPrefix: string, titleKey: string }} options
     */
    constructor(options) {
        super(options.route);
        this._mode = options.mode;
        this._idPrefix = options.idPrefix;
        this._titleKey = options.titleKey;
        /** 编辑时原始用户 ID */
        this._editingId = null;
        /** 身份证号不在设备UI展示，但编辑保存时保留协议端已有值。 */
        this._idCardValue = '';
        this._header = null;
        this._content = null;
        this._saveBtn = null;
        this._saveLbl = null;
        this._deleteBtn = null;
        this._deleteLbl = null;
        /** @type {{ key: string, label: object, required: boolean }[]} */
        this._fieldLabels = [];
        /** @type {object[]} */
        this._kbApis = [];
        /** @type {object|null} */
        this._nameInput = null;
        this._departmentInput = null;
        this._employeeNoInput = null;
        /** @type {string} '0' | '1' */
        this._userType = '0';
        /** @type {Object.<string, { button: object, label: object, labelKey: string }>} */
        this._typeButtons = {};
        this._passwordLength = 6;
        /** 页面仅编辑前三类非生物凭证；原始快照用于生成最小增量。 */
        this._credentials = [];
        this._originalCredentials = [];
        this._credentialValueLabels = {};
        /** @type {object|null} */
        this._facePreviewBtn = null;
        /** @type {object|null} */
        this._facePreviewLbl = null;
        /** @type {object|null} */
        this._facePreviewMask = null;
        /** @type {object|null} */
        this._facePreviewImg = null;
        /** @type {object|null} */
        this._faceEnrollBtn = null;
        /** @type {object|null} */
        this._faceEnrollLbl = null;
        /** @type {object|null} */
        this._faceClearBtn = null;
        /** @type {object|null} */
        this._faceClearLbl = null;
        /** @type {object|null} */
        this._fpStatusLbl = null;
        /** @type {object|null} */
        this._fpEnrollBtn = null;
        /** @type {object|null} */
        this._fpEnrollLbl = null;
        /** @type {object|null} */
        this._fpClearBtn = null;
        /** @type {object|null} */
        this._fpClearLbl = null;
        this._faceEnrolled = false;
        /** true表示沿用已有凭证，对象表示本次抓拍得到的临时数据。 */
        this._faceData = false;
        /** @type {string|null} */
        this._facePhotoPath = null;
        this._fingerprintEnrolled = false;
        /** @type {string|null} 未保存的指纹特征；保存时再写入模组。 */
        this._fingerprintFeature = null;
        /** @type {number|null} 已落库的硬件索引（编辑已有指纹时沿用）。 */
        this._fingerprintIndex = null;
        this._requestToken = 0;
        this._loading = false;
        this._submitting = false;
        this._activeSection = 'info';
        this._sectionRows = { info: [], credential: [], dualVerify: [] };
        this._sectionButtons = {};
        this._dualVerifyMode = 'any';
        this._dualVerifierIds = [];
        this._dualModeDropdown = null;
        this._dualVerifierRow = null;
        this._dualVerifierLabel = null;
        this._dualModeEnabled = false;
        /** 进入页面时的表单快照，用于返回时判断是否有未保存修改。 */
        this._initialSnapshot = '';
    }

    onCreate() {
        this.root = dxui.View.build('page_' + this._idPrefix, dxui.Utils.LAYER.MAIN);
        this.root.setSize(layout.width, layout.height);
        layout.clearStyle(this.root);
        this.root.bgColor(theme.pageBg);
        this.root.bgOpa(100);
        this.root.scroll(false);

        const self = this;
        this._header = pageHeader.build(this.root, {
            idPrefix: this._idPrefix,
            titleKey: this._titleKey,
            onBack: function () { self._requestBack(); },
        });
        this._buildBody();
    }

    /**
     * @param {{ isBack?: boolean, params?: { id?: string }, result?: { faceEnrolled?: boolean, facePhoto?: string, faceData?: object, fingerprintEnrolled?: boolean } }} [context]
     */
    onEnter(context) {
        if (this._header) {
            this._header.refresh();
        }
        this._applyPasswordLength(systemStore.getConfig().passwordLength);
        const self = this;
        systemStore.load().then(function () {
            if (router.getCurrent() !== self.name) return;
            self._applyPasswordLength(systemStore.getConfig().passwordLength);
        }).catch(function () {
            // 查询失败时沿用启动阶段缓存；保存时Domain仍会执行最终校验。
        });
        // 从人脸/指纹录入返回：保留已填表单，只更新对应凭证态
        if (context && context.isBack) {
            if (context.result && context.result.credentialGroup
                && Array.isArray(context.result.credentials)) {
                const group = context.result.credentialGroup;
                this._credentials = this._credentials.filter(function (item) {
                    return voucherTypes.groupOf(item.type) !== group;
                }).concat(copyCredentials(context.result.credentials));
                this._activeSection = 'credential';
            }
            if (context.result && Array.isArray(context.result.verifierUserIds)) {
                this._dualVerifierIds = context.result.verifierUserIds.slice();
                this._activeSection = 'dualVerify';
            }
            if (context.result && context.result.faceEnrolled) {
                this._faceEnrolled = true;
                this._replaceFacePhoto(context.result.facePhoto || '');
                this._faceData = context.result.faceData || false;
            }
            if (context.result && context.result.fingerprintEnrolled) {
                this._fingerprintEnrolled = true;
                const feature = context.result.fingerprintFeature || '';
                this._fingerprintFeature = feature ? String(feature) : null;
                // 新录入以特征为准，旧索引作废，保存时再写入模组。
                this._fingerprintIndex = null;
            }
            this._refreshLabels();
            this._refreshCredentialRows();
            this._refreshFaceUI();
            this._refreshFingerprintUI();
            this._refreshSections();
            this._loadVerifyMode();
            this._refreshSaveState();
            return;
        }

        this._submitting = false;
        if (this._mode === 'edit') {
            const id = context && context.params ? context.params.id : '';
            this._loadUser(id);
        } else {
            this._loading = false;
            this._resetForm();
        }
        this._refreshLabels();
        this._loadVerifyMode();
        this._refreshSaveState();
    }

    onExit(context) {
        if (!context || (context.to !== 'settings_localUser_face'
            && context.to !== 'settings_localUser_verifiers'
            && context.to !== 'settings_localUser_vouchers')) {
            this._replaceFacePhoto('');
        }
        this._requestToken += 1;
        this._loading = false;
        this._submitting = false;
        this._hideFacePreview();
        keyboard.hideAll();
        confirm.hide();
    }

    _requestBack() {
        if (this._submitting || this._loading) return;
        keyboard.hideAll();
        if (!this._isFormDirty()) {
            router.back();
            return;
        }
        confirm.show({
            title: t('localUser.exitConfirmTitle'),
            message: t('localUser.exitConfirmMessage'),
            confirmText: t('localUser.exitConfirmExit'),
            cancelText: t('localUser.exitConfirmContinue'),
            onConfirm: function () { router.back(); },
        });
    }

    _buildBody() {
        const self = this;
        const p = this._idPrefix;
        const top = pageHeader.contentTop();
        const contentH = layout.height - top;
        const hasDelete = this._mode === 'edit';
        const actionStackH = hasDelete
            ? ACTION_BTN_H * 2 + ACTION_BTN_GAP + ACTION_BTN_BOTTOM
            : ACTION_BTN_H + ACTION_BTN_BOTTOM;
        const actionReserve = layout.y(actionStackH + 24);

        this._content = dxui.View.build(p + '_content', this.root);
        this._content.setSize(layout.width, contentH);
        this._content.setPos(0, top);
        layout.clearStyle(this._content);
        this._content.bgColor(0xf5f5f5);
        this._content.bgOpa(100);
        this._content.scroll(true);
        allowOverflow(this._content);
        this._content.flexFlow(dxui.Utils.FLEX_FLOW.COLUMN);
        this._content.flexAlign(
            dxui.Utils.FLEX_ALIGN.START,
            dxui.Utils.FLEX_ALIGN.CENTER,
            dxui.Utils.FLEX_ALIGN.CENTER
        );
        this._content.padTop(layout.y(12));
        this._content.padBottom(actionReserve);
        this._content.obj.lvObjSetStylePadGap(
            layout.y(ROW_GAP),
            dxui.Utils.ENUM._LV_STYLE_STATE_CMP_SAME
        );

        this._fieldLabels = [];
        this._kbApis = [];
        this._sectionRows = { info: [], credential: [], dualVerify: [] };
        this._buildSectionTabs();
        // 用户 ID 由系统随机生成，表单不展示
        this._nameInput = this._buildTextRow('name', true, keyboard.MODE.PINYIN);
        this._departmentInput = this._buildTextRow('department', false, keyboard.MODE.PINYIN);
        this._employeeNoInput = this._buildTextRow('employeeNo', false, keyboard.MODE.ENGLISH);
        this._typeButtons = this._buildUserTypeRow();
        // 生物凭证保留专用录入；卡、码、密码进入统一的多凭证子页面（按硬件能力显示）。
        this._buildFaceRow();
        const credentialGroups = [];
        if (capabilityStore.hasNfc()) credentialGroups.push('card');
        credentialGroups.push('password');
        if (capabilityStore.hasScanner()) credentialGroups.push('code');
        // 展示顺序：密码、卡、码（与改前一致，仅缺能力时跳过）
        const orderedGroups = ['password', 'card', 'code'].filter(function (g) {
            return credentialGroups.indexOf(g) >= 0;
        });
        for (let c = 0; c < orderedGroups.length; c++) {
            this._buildCredentialGroupRow(orderedGroups[c]);
        }
        if (capabilityStore.hasFinger()) {
            this._buildFingerprintRow();
        }
        this._buildDualVerifyRows();
        this._refreshSections();

        if (hasDelete) {
            this._deleteBtn = dxui.Button.build(p + '_delete', this.root);
            this._deleteBtn.setSize(layout.x(720), layout.y(ACTION_BTN_H));
            this._deleteBtn.align(
                dxui.Utils.ALIGN.BOTTOM_MID,
                0,
                -layout.y(ACTION_BTN_BOTTOM + ACTION_BTN_H + ACTION_BTN_GAP)
            );
            this._deleteBtn.bgColor(theme.pageBg);
            this._deleteBtn.radius(layout.x(14));
            this._deleteBtn.borderWidth(layout.x(2));
            this._deleteBtn.setBorderColor(theme.errorText);
            clearBtnShadow(this._deleteBtn);
            this._deleteBtn.on(dxui.Utils.EVENT.CLICK, function () {
                self._onDelete();
            });

            this._deleteLbl = dxui.Label.build(p + '_delete_lbl', this._deleteBtn);
            this._deleteLbl.textFont(font.get(layout.fontSize(30)));
            this._deleteLbl.textColor(theme.errorText);
            this._deleteLbl.align(dxui.Utils.ALIGN.CENTER, 0, 0);
        }

        this._saveBtn = dxui.Button.build(p + '_save', this.root);
        this._saveBtn.setSize(layout.x(720), layout.y(ACTION_BTN_H));
        this._saveBtn.align(dxui.Utils.ALIGN.BOTTOM_MID, 0, -layout.y(ACTION_BTN_BOTTOM));
        this._saveBtn.radius(layout.x(14));
        this._saveBtn.borderWidth(0);
        clearBtnShadow(this._saveBtn);
        this._saveBtn.on(dxui.Utils.EVENT.CLICK, function () {
            self._onSave();
        });

        this._saveLbl = dxui.Label.build(p + '_save_lbl', this._saveBtn);
        this._saveLbl.textFont(font.get(layout.fontSize(30)));
        this._saveLbl.textColor(theme.textOnDark);
        this._saveLbl.align(dxui.Utils.ALIGN.CENTER, 0, 0);
    }

    _registerSectionRow(section, row) {
        if (this._sectionRows[section]) this._sectionRows[section].push(row);
    }

    _buildSectionTabs() {
        const self = this;
        const row = dxui.View.build(this._idPrefix + '_detail_tabs', this._content);
        layout.clearStyle(row);
        row.setSize(layout.x(720), layout.y(80));
        row.bgOpa(0);
        row.scroll(false);
        const gap = layout.x(10);
        const width = Math.floor((layout.x(720) - gap * 2) / 3);
        for (let i = 0; i < DETAIL_SECTIONS.length; i++) {
            const key = DETAIL_SECTIONS[i];
            const button = dxui.Button.build(this._idPrefix + '_tab_' + key, row);
            button.setSize(width, layout.y(64));
            button.setPos(i * (width + gap), layout.y(8));
            button.radius(layout.x(12));
            button.borderWidth(0);
            clearBtnShadow(button);
            button.on(dxui.Utils.EVENT.CLICK, (function (section) {
                return function () {
                    keyboard.hideAll();
                    self._activeSection = section;
                    self._refreshSections();
                };
            })(key));
            const label = dxui.Label.build(this._idPrefix + '_tab_lbl_' + key, button);
            label.textFont(font.get(layout.fontSize(24)));
            label.align(dxui.Utils.ALIGN.CENTER, 0, 0);
            this._sectionButtons[key] = { button: button, label: label };
        }
    }

    _refreshSections() {
        for (let i = 0; i < DETAIL_SECTIONS.length; i++) {
            const section = DETAIL_SECTIONS[i];
            const enabled = section !== 'dualVerify' || this._dualModeEnabled;
            if (!enabled && this._activeSection === section) this._activeSection = 'info';
            const visible = enabled && section === this._activeSection;
            const rows = this._sectionRows[section] || [];
            for (let n = 0; n < rows.length; n++) visible ? rows[n].show() : rows[n].hide();
            const tab = this._sectionButtons[section];
            if (tab) {
                enabled ? tab.button.show() : tab.button.hide();
                tab.button.bgColor(visible ? theme.activeBg : theme.actionBg);
                tab.label.textColor(visible ? theme.textOnDark : theme.textMuted);
                tab.label.text(t('localUser.section.' + section));
            }
        }
        if (this._dualVerifierRow && this._activeSection === 'dualVerify'
            && this._dualVerifyMode !== 'specified') this._dualVerifierRow.hide();
        if (this._dualVerifierLabel) {
            this._dualVerifierLabel.text(t('localUser.dual.selected', { count: this._dualVerifierIds.length }));
        }
        if (this._content && typeof this._content.scrollToY === 'function') this._content.scrollToY(0, false);
    }

    _loadVerifyMode() {
        const self = this;
        const token = this._requestToken;
        localUserStore.getVerifyMode().then(function (mode) {
            if (token !== self._requestToken) return;
            self._dualModeEnabled = Number(mode) === 3;
            self._refreshSections();
        }).catch(function () {
            if (token === self._requestToken) self._dualModeEnabled = false;
        });
    }

    /**
     * 用户类型：普通用户 / 管理员（对应 extra.type 0/1）。
     * @returns {Object.<string, { button: object, label: object, labelKey: string }>}
     */
    _buildUserTypeRow() {
        const self = this;
        const p = this._idPrefix;
        const row = dxui.View.build(p + '_row_userType', this._content);
        layout.clearStyle(row);
        row.setSize(layout.x(720), layout.y(ROW_H));
        row.bgColor(theme.pageBg);
        row.bgOpa(100);
        row.radius(layout.x(14));
        row.scroll(false);
        allowOverflow(row);
        this._registerSectionRow('info', row);

        const label = dxui.Label.build(p + '_lbl_userType', row);
        label.setSize(layout.x(200), layout.y(40));
        label.align(dxui.Utils.ALIGN.LEFT_MID, layout.x(24), 0);
        label.textFont(font.get(layout.fontSize(26)));
        label.textColor(theme.textPrimary);
        label.textAlign(dxui.Utils.TEXT_ALIGN.LEFT);
        this._fieldLabels.push({ key: 'userType', label: label, required: false });

        const seg = dxui.View.build(p + '_seg_userType', row);
        layout.clearStyle(seg);
        // 容器略高于按钮，左右留白，避免按下放大被 seg 裁切
        seg.setSize(layout.x(460), layout.y(SEG_H));
        seg.align(dxui.Utils.ALIGN.RIGHT_MID, -layout.x(20), 0);
        seg.bgOpa(0);
        seg.scroll(false);
        allowOverflow(seg);

        const map = {};
        const count = USER_TYPE_OPTIONS.length;
        const gap = layout.x(10);
        const sidePad = layout.x(BTN_INSET);
        const btnW = Math.floor((layout.x(460) - sidePad * 2 - gap * (count - 1)) / count);
        const btnH = layout.y(SEG_H - BTN_INSET * 2);

        for (let i = 0; i < count; i++) {
            const option = USER_TYPE_OPTIONS[i];
            const button = dxui.Button.build(p + '_type_btn_' + option.id, seg);
            button.setSize(btnW, btnH);
            button.setPos(sidePad + i * (btnW + gap), layout.y(BTN_INSET));
            button.radius(layout.x(10));
            button.borderWidth(0);
            clearBtnShadow(button);
            button.on(dxui.Utils.EVENT.CLICK, (function (id) {
                return function () {
                    if (id === self._userType || self._loading || self._submitting) {
                        return;
                    }
                    keyboard.hideAll();
                    self._userType = id;
                    self._refreshTypeStyles();
                };
            })(option.id));

            const btnLbl = dxui.Label.build(p + '_type_lbl_' + option.id, button);
            btnLbl.textFont(font.get(layout.fontSize(24)));
            btnLbl.align(dxui.Utils.ALIGN.CENTER, 0, 0);
            map[option.id] = { button: button, label: btnLbl, labelKey: option.labelKey };
        }
        return map;
    }

    /**
     * @param {string} fieldKey
     * @param {boolean} required
     * @param {number} kbMode
     * @param {boolean} [readOnly]
     * @returns {object}
     */
    _buildTextRow(fieldKey, required, kbMode, readOnly) {
        const self = this;
        const p = this._idPrefix;
        const row = dxui.View.build(p + '_row_' + fieldKey, this._content);
        layout.clearStyle(row);
        row.setSize(layout.x(720), layout.y(ROW_H));
        row.bgColor(theme.pageBg);
        row.bgOpa(100);
        row.radius(layout.x(14));
        row.scroll(false);
        allowOverflow(row);
        this._registerSectionRow('info', row);

        const label = dxui.Label.build(p + '_lbl_' + fieldKey, row);
        label.setSize(layout.x(200), layout.y(40));
        label.align(dxui.Utils.ALIGN.LEFT_MID, layout.x(24), 0);
        label.textFont(font.get(layout.fontSize(26)));
        label.textColor(theme.textPrimary);
        label.textAlign(dxui.Utils.TEXT_ALIGN.LEFT);
        this._fieldLabels.push({ key: fieldKey, label: label, required: required });

        const inputBox = dxui.View.build(p + '_box_' + fieldKey, row);
        layout.clearStyle(inputBox);
        inputBox.setSize(layout.x(460), layout.y(SEG_H));
        inputBox.align(dxui.Utils.ALIGN.RIGHT_MID, -layout.x(20), 0);
        inputBox.bgColor(readOnly ? 0xe8e8e8 : 0xf5f5f5);
        inputBox.bgOpa(100);
        inputBox.radius(layout.x(10));
        inputBox.borderWidth(layout.x(2));
        inputBox.setBorderColor(0xdcdcdc);
        inputBox.scroll(false);

        const input = dxui.Textarea.build(p + '_input_' + fieldKey, inputBox);
        layout.clearStyle(input);
        input.setSize(layout.x(420), layout.y(SEG_H - 8));
        input.align(dxui.Utils.ALIGN.CENTER, 0, 0);
        input.bgOpa(0);
        input.padAll(0);
        input.borderWidth(0);
        input.setOneLine(true);
        input.setMaxLength(64);
        input.setCursorClickPos(!readOnly);
        input.textFont(font.get(layout.fontSize(26)));
        input.textColor(readOnly ? theme.textSecondary : theme.textPrimary);
        input.setAlign(dxui.Utils.TEXT_ALIGN.LEFT);
        input.text('');
        if (readOnly) {
            input.clickable(false);
            return input;
        }

        const kb = keyboard.bind(null, input, {
            mode: kbMode,
            placeholder: t('localUser.inputPlaceholder'),
        });
        kb.setContentCb(function () {
            self._refreshSaveState();
        });
        kb.setEnterCb(function () {
            self._refreshSaveState();
        });
        this._kbApis.push({ kb: kb, fieldKey: fieldKey });
        return input;
    }

    _buildCredentialGroupRow(group) {
        const self = this;
        const row = dxui.View.build(this._idPrefix + '_row_voucher_' + group, this._content);
        layout.clearStyle(row);
        row.setSize(layout.x(720), layout.y(ROW_H));
        row.bgColor(theme.pageBg);
        row.bgOpa(100);
        row.radius(layout.x(14));
        row.scroll(false);
        row.clickable(true);
        row.on(dxui.Utils.EVENT.CLICK, function () { self._openCredentialGroup(group); });
        this._registerSectionRow('credential', row);

        const label = dxui.Label.build(this._idPrefix + '_voucher_' + group + '_label', row);
        label.setSize(layout.x(300), layout.y(42));
        label.align(dxui.Utils.ALIGN.LEFT_MID, layout.x(24), 0);
        label.textFont(font.get(layout.fontSize(26)));
        label.textColor(theme.textPrimary);
        label.text(t('localUser.voucher.group.' + group));

        const value = dxui.Label.build(this._idPrefix + '_voucher_' + group + '_value', row);
        value.setSize(layout.x(260), layout.y(42));
        value.align(dxui.Utils.ALIGN.RIGHT_MID, -layout.x(68), 0);
        value.textFont(font.get(layout.fontSize(23)));
        value.textColor(theme.textSecondary);
        value.textAlign(dxui.Utils.TEXT_ALIGN.RIGHT);
        this._credentialValueLabels[group] = value;

        const arrow = dxui.Label.build(this._idPrefix + '_voucher_' + group + '_arrow', row);
        arrow.text('>');
        arrow.textFont(font.get(layout.fontSize(34)));
        arrow.textColor(theme.textSecondary);
        arrow.align(dxui.Utils.ALIGN.RIGHT_MID, -layout.x(24), 0);
        return row;
    }

    _openCredentialGroup(group) {
        keyboard.hideAll();
        router.navigate('settings_localUser_vouchers', {
            group: group,
            credentials: copyCredentials(this._credentials),
            passwordLength: this._passwordLength,
        });
    }

    _refreshCredentialRows() {
        for (let i = 0; i < CREDENTIAL_GROUPS.length; i++) {
            const group = CREDENTIAL_GROUPS[i];
            const total = this._credentials.filter(function (item) {
                return voucherTypes.groupOf(item.type) === group;
            }).length;
            if (this._credentialValueLabels[group]) {
                this._credentialValueLabels[group].text(total > 5
                    ? t('localUser.voucher.summaryOverflow', { total: total })
                    : t('localUser.voucher.summary', { count: total, max: 5 }));
            }
        }
    }
    /**
     * @param {object} parent
     * @param {string} fieldKey
     * @param {Function} onClear
     * @returns {{ btn: object, lbl: object }}
     */
    _buildCredClearBtn(parent, fieldKey, onClear) {
        const self = this;
        const p = this._idPrefix;
        const btn = dxui.Button.build(p + '_clear_' + fieldKey, parent);
        btn.setSize(layout.x(CRED_CLEAR_W), layout.y(SEG_H - BTN_INSET * 2));
        btn.align(dxui.Utils.ALIGN.RIGHT_MID, -layout.x(16 + BTN_INSET), 0);
        btn.bgColor(theme.pageBg);
        btn.radius(layout.x(10));
        btn.borderWidth(layout.x(2));
        btn.setBorderColor(theme.errorText);
        clearBtnShadow(btn);
        btn.hide();
        btn.on(dxui.Utils.EVENT.CLICK, function () {
            self._confirmClearCred(fieldKey, onClear);
        });

        const lbl = dxui.Label.build(p + '_clear_lbl_' + fieldKey, btn);
        lbl.textFont(font.get(layout.fontSize(22)));
        lbl.textColor(theme.errorText);
        lbl.align(dxui.Utils.ALIGN.CENTER, 0, 0);
        return { btn: btn, lbl: lbl };
    }

    _buildFaceRow() {
        const self = this;
        const p = this._idPrefix;
        const enrollH = layout.y(SEG_H - BTN_INSET * 2);
        const clearH = layout.y(SEG_H - BTN_INSET * 2 - 8);
        const btnGap = layout.y(8);
        const row = dxui.View.build(p + '_row_face', this._content);
        layout.clearStyle(row);
        row.setSize(layout.x(720), layout.y(FACE_ROW_H));
        row.bgColor(theme.pageBg);
        row.bgOpa(100);
        row.radius(layout.x(14));
        row.scroll(false);
        allowOverflow(row);
        this._registerSectionRow('credential', row);

        const label = dxui.Label.build(p + '_lbl_face', row);
        label.setSize(layout.x(160), layout.y(40));
        label.align(dxui.Utils.ALIGN.LEFT_MID, layout.x(24), 0);
        label.textFont(font.get(layout.fontSize(26)));
        label.textColor(theme.textPrimary);
        label.textAlign(dxui.Utils.TEXT_ALIGN.LEFT);
        this._fieldLabels.push({ key: 'face', label: label, required: false });

        // 人脸照片不绘制缩略图，仅由按钮进入原图预览。
        this._facePreviewBtn = dxui.Button.build(p + '_face_preview_btn', row);
        this._facePreviewBtn.setSize(layout.x(180), layout.y(SEG_H));
        this._facePreviewBtn.align(dxui.Utils.ALIGN.LEFT_MID, layout.x(196), 0);
        this._facePreviewBtn.bgColor(theme.activeBg);
        this._facePreviewBtn.radius(layout.x(12));
        this._facePreviewBtn.borderWidth(0);
        clearBtnShadow(this._facePreviewBtn);
        this._facePreviewBtn.hide();
        this._facePreviewBtn.on(dxui.Utils.EVENT.CLICK, function () {
            self._showFacePreview();
        });

        this._facePreviewLbl = dxui.Label.build(p + '_face_preview_lbl', this._facePreviewBtn);
        this._facePreviewLbl.textFont(font.get(layout.fontSize(22)));
        this._facePreviewLbl.textColor(theme.textOnDark);
        this._facePreviewLbl.align(dxui.Utils.ALIGN.CENTER, 0, 0);

        this._buildFacePreviewDialog();

        const stackH = enrollH + btnGap + clearH;
        const stackTop = Math.round((layout.y(FACE_ROW_H) - stackH) / 2);

        this._faceEnrollBtn = dxui.Button.build(p + '_face_btn', row);
        this._faceEnrollBtn.setSize(layout.x(240), enrollH);
        this._faceEnrollBtn.align(dxui.Utils.ALIGN.TOP_RIGHT, -layout.x(20 + BTN_INSET), stackTop);
        this._faceEnrollBtn.bgColor(theme.accent);
        this._faceEnrollBtn.radius(layout.x(12));
        this._faceEnrollBtn.borderWidth(0);
        clearBtnShadow(this._faceEnrollBtn);
        this._faceEnrollBtn.on(dxui.Utils.EVENT.CLICK, function () {
            self._onFaceEnroll();
        });

        this._faceEnrollLbl = dxui.Label.build(p + '_face_btn_lbl', this._faceEnrollBtn);
        this._faceEnrollLbl.textFont(font.get(layout.fontSize(24)));
        this._faceEnrollLbl.textColor(theme.textOnDark);
        this._faceEnrollLbl.align(dxui.Utils.ALIGN.CENTER, 0, 0);

        this._faceClearBtn = dxui.Button.build(p + '_face_clear', row);
        this._faceClearBtn.setSize(layout.x(240), clearH);
        this._faceClearBtn.align(
            dxui.Utils.ALIGN.TOP_RIGHT,
            -layout.x(20 + BTN_INSET),
            stackTop + enrollH + btnGap
        );
        this._faceClearBtn.bgColor(theme.pageBg);
        this._faceClearBtn.radius(layout.x(12));
        this._faceClearBtn.borderWidth(layout.x(2));
        this._faceClearBtn.setBorderColor(theme.errorText);
        clearBtnShadow(this._faceClearBtn);
        this._faceClearBtn.hide();
        this._faceClearBtn.on(dxui.Utils.EVENT.CLICK, function () {
            self._confirmClearCred('face', function () {
                self._clearFaceCred();
            });
        });

        this._faceClearLbl = dxui.Label.build(p + '_face_clear_lbl', this._faceClearBtn);
        this._faceClearLbl.textFont(font.get(layout.fontSize(22)));
        this._faceClearLbl.textColor(theme.errorText);
        this._faceClearLbl.align(dxui.Utils.ALIGN.CENTER, 0, 0);
    }

    /**
     * 原图预览弹层：全屏黑底，图片按实际尺寸居中；点击关闭。
     */
    _buildFacePreviewDialog() {
        const self = this;
        const p = this._idPrefix;
        this._facePreviewMask = dxui.View.build(p + '_face_preview_mask', this.root);
        this._facePreviewMask.setSize(layout.width, layout.height);
        this._facePreviewMask.setPos(0, 0);
        layout.clearStyle(this._facePreviewMask);
        this._facePreviewMask.bgColor(0x000000);
        this._facePreviewMask.bgOpa(100);
        this._facePreviewMask.radius(0);
        this._facePreviewMask.borderWidth(0);
        this._facePreviewMask.padAll(0);
        layout.disableScroll(this._facePreviewMask);
        this._facePreviewMask.clickable(true);
        this._facePreviewMask.hide();
        this._facePreviewMask.on(dxui.Utils.EVENT.CLICK, function () {
            self._hideFacePreview();
        });

        this._facePreviewImg = dxui.Image.build(p + '_face_preview_img', this._facePreviewMask);
        layout.clearStyle(this._facePreviewImg);
        this._facePreviewImg.radius(0);
        this._facePreviewImg.borderWidth(0);
        this._facePreviewImg.clickable(false);
    }

    /**
     * 当前可用的人脸照片路径（注册返回或档案凭证）。
     * @returns {string}
     */
    _facePreviewPath() {
        const path = String(this._facePhotoPath || '').trim();
        return path.charAt(0) === '/' ? path : '';
    }


    _showFacePreview() {
        const path = this._facePreviewPath();
        if (!path || !this._facePreviewMask || !this._facePreviewImg) {
            return;
        }
        keyboard.hideAll();
        // 与2.0保持一致：文件型JPG只设置图片源并显示，不附加缩放或抗锯齿处理。
        this._facePreviewImg.source(path);
        this._facePreviewImg.show();
        this._facePreviewImg.align(dxui.Utils.ALIGN.CENTER, 0, 0);
        this._facePreviewMask.show();
        this._facePreviewMask.moveForeground();
    }

    _hideFacePreview() {
        if (this._facePreviewMask) {
            this._facePreviewMask.hide();
        }
    }

    _onFaceEnroll() {
        keyboard.hideAll();
        const userId = this._editingId || '';
        if (!userId) {
            popup.showError(t('localUser.faceNeedId'));
            return;
        }
        router.navigate('settings_localUser_face', { userId: userId });
    }

    /**
     * 生成本地用户 ID（16 位十六进制）。
     * @returns {string}
     */
    _generateUserId() {
        try {
            const id = String(dxCommonUtils.random.getBytes(8) || '').toLowerCase();
            if (id) {
                return id;
            }
        } catch (_e) {
            // fall through
        }
        return String(Date.now()) + String(Math.floor(Math.random() * 1e6));
    }

    /**
     * 指纹凭证：状态文案 + 录入 / 删除。
     */
    _buildFingerprintRow() {
        const self = this;
        const p = this._idPrefix;
        const row = dxui.View.build(p + '_row_fingerprint', this._content);
        layout.clearStyle(row);
        row.setSize(layout.x(720), layout.y(ROW_H));
        row.bgColor(theme.pageBg);
        row.bgOpa(100);
        row.radius(layout.x(14));
        row.scroll(false);
        allowOverflow(row);
        this._registerSectionRow('credential', row);

        const label = dxui.Label.build(p + '_lbl_fingerprint', row);
        label.setSize(layout.x(180), layout.y(40));
        label.align(dxui.Utils.ALIGN.LEFT_MID, layout.x(24), 0);
        label.textFont(font.get(layout.fontSize(26)));
        label.textColor(theme.textPrimary);
        label.textAlign(dxui.Utils.TEXT_ALIGN.LEFT);
        this._fieldLabels.push({ key: 'fingerprint', label: label, required: false });

        this._fpStatusLbl = dxui.Label.build(p + '_fp_status', row);
        this._fpStatusLbl.setSize(layout.x(160), layout.y(40));
        this._fpStatusLbl.align(dxui.Utils.ALIGN.LEFT_MID, layout.x(220), 0);
        this._fpStatusLbl.textFont(font.get(layout.fontSize(24)));
        this._fpStatusLbl.textColor(theme.textSecondary);
        this._fpStatusLbl.textAlign(dxui.Utils.TEXT_ALIGN.LEFT);

        this._fpClearBtn = dxui.Button.build(p + '_fp_clear', row);
        this._fpClearBtn.setSize(layout.x(CRED_CLEAR_W), layout.y(SEG_H - BTN_INSET * 2));
        this._fpClearBtn.align(dxui.Utils.ALIGN.RIGHT_MID, -layout.x(16 + BTN_INSET), 0);
        this._fpClearBtn.bgColor(theme.pageBg);
        this._fpClearBtn.radius(layout.x(12));
        this._fpClearBtn.borderWidth(layout.x(2));
        this._fpClearBtn.setBorderColor(theme.errorText);
        clearBtnShadow(this._fpClearBtn);
        this._fpClearBtn.on(dxui.Utils.EVENT.CLICK, function () {
            self._confirmClearCred('fingerprint', function () {
                self._clearFingerprintCred();
            });
        });

        this._fpClearLbl = dxui.Label.build(p + '_fp_clear_lbl', this._fpClearBtn);
        this._fpClearLbl.textFont(font.get(layout.fontSize(22)));
        this._fpClearLbl.textColor(theme.errorText);
        this._fpClearLbl.align(dxui.Utils.ALIGN.CENTER, 0, 0);

        this._fpEnrollBtn = dxui.Button.build(p + '_fp_btn', row);
        this._fpEnrollBtn.setSize(layout.x(200), layout.y(SEG_H - BTN_INSET * 2));
        this._fpEnrollBtn.align(dxui.Utils.ALIGN.RIGHT_MID, -layout.x(CRED_CLEAR_W + 28 + BTN_INSET), 0);
        this._fpEnrollBtn.bgColor(theme.accent);
        this._fpEnrollBtn.radius(layout.x(12));
        this._fpEnrollBtn.borderWidth(0);
        clearBtnShadow(this._fpEnrollBtn);
        this._fpEnrollBtn.on(dxui.Utils.EVENT.CLICK, function () {
            self._onFingerprintEnroll();
        });

        this._fpEnrollLbl = dxui.Label.build(p + '_fp_btn_lbl', this._fpEnrollBtn);
        this._fpEnrollLbl.textFont(font.get(layout.fontSize(24)));
        this._fpEnrollLbl.textColor(theme.textOnDark);
        this._fpEnrollLbl.align(dxui.Utils.ALIGN.CENTER, 0, 0);
    }

    _buildDualVerifyRows() {
        const self = this;
        const p = this._idPrefix;
        const modeRow = dxui.View.build(p + '_row_dual_mode', this._content);
        layout.clearStyle(modeRow);
        modeRow.setSize(layout.x(720), layout.y(ROW_H));
        modeRow.bgColor(theme.pageBg);
        modeRow.bgOpa(100);
        modeRow.radius(layout.x(14));
        modeRow.scroll(false);
        this._registerSectionRow('dualVerify', modeRow);
        const modeLabel = dxui.Label.build(p + '_dual_mode_lbl', modeRow);
        modeLabel.setSize(layout.x(240), layout.y(40));
        modeLabel.align(dxui.Utils.ALIGN.LEFT_MID, layout.x(24), 0);
        modeLabel.textFont(font.get(layout.fontSize(26)));
        modeLabel.textColor(theme.textPrimary);
        modeLabel.text(t('localUser.dual.mode'));
        this._dualModeDropdown = dxui.Dropdown.build(p + '_dual_mode_dropdown', modeRow);
        this._dualModeDropdown.setSize(layout.x(400), layout.y(64));
        this._dualModeDropdown.align(dxui.Utils.ALIGN.RIGHT_MID, -layout.x(20), 0);
        this._dualModeDropdown.setOptions([
            t('localUser.dual.any'), t('localUser.dual.specified'), t('localUser.dual.none'),
        ]);
        this._dualModeDropdown.setSymbol(IMG_DROPDOWN);
        this._dualModeDropdown.textFont(font.get(layout.fontSize(24)));
        this._dualModeDropdown.getList().textFont(font.get(layout.fontSize(24)));
        this._dualModeDropdown.on(dxui.Utils.EVENT.VALUE_CHANGED, function () {
            const values = ['any', 'specified', 'none'];
            self._dualVerifyMode = values[self._dualModeDropdown.getSelected()] || 'any';
            self._refreshSections();
        });

        const verifierRow = dxui.View.build(p + '_row_dual_verifiers', this._content);
        layout.clearStyle(verifierRow);
        verifierRow.setSize(layout.x(720), layout.y(ROW_H));
        verifierRow.bgColor(theme.pageBg);
        verifierRow.bgOpa(100);
        verifierRow.radius(layout.x(14));
        verifierRow.scroll(false);
        verifierRow.clickable(true);
        verifierRow.on(dxui.Utils.EVENT.CLICK, function () {
            router.navigate('settings_localUser_verifiers', {
                excludeId: self._editingId || '', selected: self._dualVerifierIds.slice(),
            });
        });
        this._registerSectionRow('dualVerify', verifierRow);
        this._dualVerifierRow = verifierRow;
        const label = dxui.Label.build(p + '_dual_verifiers_lbl', verifierRow);
        label.setSize(layout.x(260), layout.y(40));
        label.align(dxui.Utils.ALIGN.LEFT_MID, layout.x(24), 0);
        label.textFont(font.get(layout.fontSize(26)));
        label.textColor(theme.textPrimary);
        label.text(t('localUser.dual.verifiers'));
        this._dualVerifierLabel = dxui.Label.build(p + '_dual_verifiers_value', verifierRow);
        this._dualVerifierLabel.setSize(layout.x(360), layout.y(40));
        this._dualVerifierLabel.align(dxui.Utils.ALIGN.RIGHT_MID, -layout.x(28), 0);
        this._dualVerifierLabel.textFont(font.get(layout.fontSize(24)));
        this._dualVerifierLabel.textColor(theme.accent);
        this._dualVerifierLabel.textAlign(dxui.Utils.TEXT_ALIGN.RIGHT);
    }

    _onFingerprintEnroll() {
        keyboard.hideAll();
        router.navigate('fingerprint_enroll', { mode: 'local' });
    }

    /**
     * @param {string} fieldKey
     * @param {Function} onClear
     */
    _confirmClearCred(fieldKey, onClear) {
        keyboard.hideAll();
        confirm.show({
            title: t('localUser.clearCredTitle'),
            message: t('localUser.clearCredMsg.' + fieldKey),
            confirmText: t('localUser.clearCred'),
            cancelText: t('localUser.deleteCancel'),
            onConfirm: function () {
                if (typeof onClear === 'function') {
                    onClear();
                }
            },
        });
    }

    /** 替换预览图片时释放旧的临时抓拍；正式人员图片由Domain保护。 */
    _replaceFacePhoto(path) {
        const next = String(path || '').trim();
        const current = String(this._facePhotoPath || '').trim();
        if (current && current !== next) {
            localUserStore.releaseFacePhoto(current);
        }
        this._facePhotoPath = next || null;
    }

    _clearFaceCred() {
        // 表单内只记录待删除状态，真正删除在点击保存后由Domain统一提交。
        this._faceEnrolled = false;
        this._faceData = false;
        this._replaceFacePhoto('');
        this._refreshFaceUI();
        this._refreshCredClearUI();
    }

    _clearFingerprintCred() {
        this._fingerprintEnrolled = false;
        this._fingerprintFeature = null;
        this._fingerprintIndex = null;
        this._refreshFingerprintUI();
        this._refreshCredentialRows();
        this._refreshCredClearUI();
    }

    /**
     * 凭证删除按钮：有内容可点（红），空内容禁用（灰）。
     * @param {object|null} btn
     * @param {object|null} lbl
     * @param {boolean} enabled
     */
    _setCredClearEnabled(btn, lbl, enabled) {
        if (!btn) {
            return;
        }
        btn.show();
        if (enabled) {
            btn.setBorderColor(theme.errorText);
            btn.clickable(true);
            if (lbl) {
                lbl.textColor(theme.errorText);
            }
        } else {
            btn.setBorderColor(theme.disabledBg);
            btn.clickable(false);
            if (lbl) {
                lbl.textColor(theme.disabledBg);
            }
        }
    }

    _refreshCredClearUI() {

        this._setCredClearEnabled(
            this._faceClearBtn,
            this._faceClearLbl,
            !!this._faceEnrolled
        );
        this._setCredClearEnabled(
            this._fpClearBtn,
            this._fpClearLbl,
            !!this._fingerprintEnrolled
        );
    }

    _loadUser(id) {
        const self = this;
        const token = ++this._requestToken;
        this._loading = true;
        this._refreshSaveState();
        localUserStore.get(id).then(function (user) {
            if (token !== self._requestToken) return;
            self._fillUser(user);
        }).catch(function () {
            if (token !== self._requestToken) return;
            self._editingId = null;
            popup.showError(t('localUser.editNotFound'));
            router.back();
        }).finally(function () {
            if (token !== self._requestToken) return;
            self._loading = false;
            self._refreshSaveState();
        });
    }

    /** 只负责把后端人员档案投影到表单，不在View层缓存业务数据。 */
    _fillUser(user) {
        this._editingId = user.id;
        this._idCardValue = String(user.idCard || '');
        if (this._nameInput) {
            this._nameInput.text(user.name || '');
        }
        if (this._departmentInput) this._departmentInput.text(user.department || '');
        if (this._employeeNoInput) this._employeeNoInput.text(user.employeeNo || '');
        this._userType = Number(user.type) === 1 ? '1' : '0';
        this._refreshTypeStyles();
        this._credentials = copyCredentials(user.credentials);
        this._originalCredentials = copyCredentials(user.credentials);
        this._refreshCredentialRows();
        this._faceEnrolled = !!user.face;
        this._faceData = user.face ? true : false;
        this._replaceFacePhoto(user.facePicPath || '');
        this._fingerprintEnrolled = !!user.fingerprint;
        this._fingerprintFeature = null;
        this._fingerprintIndex = user.fingerprintIndex != null && Number(user.fingerprintIndex) >= 1
            ? Number(user.fingerprintIndex)
            : null;
        const dual = user.dualVerify || { mode: 'any', userIds: [] };
        this._dualVerifyMode = ['any', 'specified', 'none'].indexOf(dual.mode) >= 0 ? dual.mode : 'any';
        this._dualVerifierIds = Array.isArray(dual.userIds) ? dual.userIds.slice() : [];
        if (this._dualModeDropdown) this._dualModeDropdown.setSelected(['any', 'specified', 'none'].indexOf(this._dualVerifyMode));
        this._refreshFaceUI();
        this._refreshFingerprintUI();
        this._refreshCredentialRows();
        this._refreshCredClearUI();
        if (this._dualModeDropdown) {
            const index = ['any', 'specified', 'none'].indexOf(this._dualVerifyMode);
            this._dualModeDropdown.setOptions([
                t('localUser.dual.any'), t('localUser.dual.specified'), t('localUser.dual.none'),
            ]);
            this._dualModeDropdown.setSelected(Math.max(0, index));
        }
        this._refreshSections();
        this._updateFormSnapshot();
    }

    _refreshLabels() {
        for (let i = 0; i < this._fieldLabels.length; i++) {
            const item = this._fieldLabels[i];
            const base = t('localUser.field.' + item.key);
            item.label.text(item.required ? base + ' *' : base);
        }
        const typeIds = Object.keys(this._typeButtons);
        for (let n = 0; n < typeIds.length; n++) {
            const entry = this._typeButtons[typeIds[n]];
            entry.label.text(t(entry.labelKey));
        }
        this._refreshTypeStyles();
        for (let j = 0; j < this._kbApis.length; j++) {
            const item = this._kbApis[j];
            item.kb.setPlaceholder(t('localUser.inputPlaceholder'));

        }
        this._refreshFaceUI();
        this._refreshFingerprintUI();
        this._refreshCredentialRows();
        this._refreshCredClearUI();
        if (this._saveLbl) {
            this._saveLbl.text(t('localUser.savePerson'));
        }
        if (this._deleteLbl) {
            this._deleteLbl.text(t('localUser.delete'));
        }

        if (this._faceClearLbl) {
            this._faceClearLbl.text(t('localUser.clearFaceCred'));
        }
        if (this._facePreviewLbl) {
            this._facePreviewLbl.text(t('localUser.facePreview'));
        }
        if (this._fpClearLbl) {
            this._fpClearLbl.text(t('localUser.clearFingerprintCred'));
        }
    }

    _refreshTypeStyles() {
        const ids = Object.keys(this._typeButtons);
        for (let i = 0; i < ids.length; i++) {
            const id = ids[i];
            const entry = this._typeButtons[id];
            const active = id === this._userType;
            entry.button.bgColor(active ? theme.activeBg : theme.actionBg);
            entry.label.textColor(active ? theme.textOnDark : theme.textMuted);
        }
    }

    _refreshFaceUI() {
        const enrollH = layout.y(SEG_H - BTN_INSET * 2);
        const clearH = layout.y(SEG_H - BTN_INSET * 2 - 8);
        const btnGap = layout.y(8);
        if (this._faceEnrollBtn) {
            const stackH = enrollH + btnGap + clearH;
            const stackTop = Math.round((layout.y(FACE_ROW_H) - stackH) / 2);
            this._faceEnrollBtn.align(dxui.Utils.ALIGN.TOP_RIGHT, -layout.x(20 + BTN_INSET), stackTop);
            if (this._faceClearBtn) {
                this._faceClearBtn.align(
                    dxui.Utils.ALIGN.TOP_RIGHT,
                    -layout.x(20 + BTN_INSET),
                    stackTop + enrollH + btnGap
                );
            }
        }
        if (this._facePreviewBtn) {
            if (this._facePreviewPath()) {
                this._facePreviewBtn.show();
            } else {
                this._facePreviewBtn.hide();
            }
        }
        if (this._faceEnrollLbl) {
            this._faceEnrollLbl.text(
                this._faceEnrolled
                    ? t('localUser.faceReEnroll')
                    : t('localUser.faceEnroll')
            );
        }
        this._refreshCredClearUI();
    }

    _refreshFingerprintUI() {
        if (this._fpStatusLbl) {
            this._fpStatusLbl.text(
                this._fingerprintEnrolled
                    ? t('localUser.cred.enrolled')
                    : t('localUser.cred.empty')
            );
            this._fpStatusLbl.textColor(
                this._fingerprintEnrolled ? theme.successText : theme.textSecondary
            );
        }
        if (this._fpEnrollLbl) {
            this._fpEnrollLbl.text(
                this._fingerprintEnrolled
                    ? t('localUser.fingerprintReEnroll')
                    : t('localUser.fingerprintEnroll')
            );
        }
        this._refreshCredClearUI();
    }

    _resetForm() {
        this._editingId = this._generateUserId();
        this._idCardValue = '';
        this._faceEnrolled = false;
        this._faceData = false;
        this._replaceFacePhoto('');
        this._fingerprintEnrolled = false;
        this._fingerprintFeature = null;
        this._fingerprintIndex = null;
        this._credentials = [];
        this._originalCredentials = [];
        this._dualVerifyMode = 'any';
        this._dualVerifierIds = [];
        if (this._dualModeDropdown) this._dualModeDropdown.setSelected(0);
        this._activeSection = 'info';
        this._userType = '0';
        this._refreshTypeStyles();
        const inputs = [
            this._nameInput,
            this._departmentInput,
            this._employeeNoInput,
        ];
        for (let i = 0; i < inputs.length; i++) {
            if (inputs[i]) inputs[i].text('');
        }
        this._refreshFaceUI();
        this._refreshFingerprintUI();
        this._refreshCredentialRows();
        this._refreshCredClearUI();
        this._refreshSections();
        this._updateFormSnapshot();
    }

    /** @returns {object} 当前表单状态（不含自动生成的用户 ID）。 */
    _captureFormState() {
        return {
            name: this._readInput(this._nameInput),
            department: this._readInput(this._departmentInput),
            employeeNo: this._readInput(this._employeeNoInput),
            userType: this._userType,
            idCard: this._idCardValue,
            credentials: copyCredentials(this._credentials),
            faceEnrolled: this._faceEnrolled,
            faceData: this._faceEnrolled ? this._faceData : false,
            facePhotoPath: this._faceEnrolled ? String(this._facePhotoPath || '') : '',
            fingerprintEnrolled: this._fingerprintEnrolled,
            fingerprintFeature: this._fingerprintFeature,
            fingerprintIndex: this._fingerprintIndex,
            dualVerifyMode: this._dualVerifyMode,
            dualVerifierIds: this._dualVerifierIds.slice(),
        };
    }

    _currentFormSnapshot() {
        return JSON.stringify(this._captureFormState());
    }

    _updateFormSnapshot() {
        this._initialSnapshot = this._currentFormSnapshot();
    }

    _isFormDirty() {
        return this._currentFormSnapshot() !== this._initialSnapshot;
    }

    _collectCredentialChanges() {
        const originalById = {};
        const currentById = {};
        const upserts = [];
        const removeKeyIds = [];
        for (let i = 0; i < this._originalCredentials.length; i++) {
            const item = this._originalCredentials[i];
            if (item.keyId) originalById[item.keyId] = item;
        }
        for (let i = 0; i < this._credentials.length; i++) {
            const item = this._credentials[i];
            if (item.keyId) currentById[item.keyId] = item;
            const before = item.keyId ? originalById[item.keyId] : null;
            if (!before || before.type !== item.type || before.code !== item.code) {
                upserts.push({ keyId: item.keyId || '', type: item.type, code: item.code, extra: item.extra || {} });
            }
        }
        const ids = Object.keys(originalById);
        for (let n = 0; n < ids.length; n++) {
            if (!currentById[ids[n]]) removeKeyIds.push(ids[n]);
        }
        return { upserts: upserts, removeKeyIds: removeKeyIds };
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
            return String(input.text() || '').trim();
        } catch (_e) {
            return '';
        }
    }

    _refreshSaveState() {
        const ok = !this._loading && !this._submitting
            && !!this._editingId
            && this._readInput(this._nameInput).length > 0;
        if (!this._saveBtn) {
            return;
        }
        if (ok) {
            this._saveBtn.bgColor(theme.activeBg);
            this._saveBtn.clickable(true);
        } else {
            this._saveBtn.bgColor(theme.disabledBg);
            this._saveBtn.clickable(false);
        }
    }

    /** 应用最新密码位数，并同步输入长度和键盘提示。 */
    _applyPasswordLength(value) {
        const configuredLength = Number(value);
        this._passwordLength = [4, 6, 8].indexOf(configuredLength) >= 0 ? configuredLength : 6;
    }

    _collectPayload() {
        return {
            id: this._editingId || '',
            name: this._readInput(this._nameInput),
            department: this._readInput(this._departmentInput).substring(0, 128),
            employeeNo: this._readInput(this._employeeNoInput).substring(0, 128),
            idCard: this._idCardValue,
            type: this._userType === '1' ? 1 : 0,
            face: this._faceEnrolled ? (this._faceData || true) : false,
            // 新录入传 { feature }；已有未重录传 true 保持（避免编辑保存冲掉凭证 extra）。
            fingerprint: this._fingerprintEnrolled
                ? (this._fingerprintFeature
                    ? { feature: this._fingerprintFeature }
                    : true)
                : false,
            dualVerify: {
                mode: this._dualVerifyMode,
                userIds: this._dualVerifyMode === 'specified' ? this._dualVerifierIds.slice() : [],
            },
            credentialChanges: this._collectCredentialChanges(),
        };
    }

    _onSave() {
        if (this._submitting) return;
        keyboard.hideAll();
        const payload = this._collectPayload();
        if (!payload.id || !payload.name) {
            popup.showError(t('localUser.addRequired'));
            this._refreshSaveState();
            return;
        }
        const invalidPassword = this._credentials.some((function (length) {
            return function (item) {
                return item.type === voucherTypes.PASSWORD
                    && !new RegExp('^\\d{' + length + '}$').test(item.code);
            };
        })(this._passwordLength));
        if (invalidPassword) {
            popup.showError(t('localUser.passwordLengthError', { length: this._passwordLength }));
            this._activeSection = 'credential';
            this._refreshSections();
            return;
        }
        if (payload.dualVerify.mode === 'specified' && payload.dualVerify.userIds.length === 0) {
            popup.showError(t('localUser.dual.required'));
            this._activeSection = 'dualVerify';
            this._refreshSections();
            return;
        }
        if (this._fingerprintEnrolled
            && !this._fingerprintFeature
            && this._fingerprintIndex == null) {
            popup.showError(t('fingerprint.enroll.status.fail'));
            this._refreshSaveState();
            return;
        }

        const self = this;
        this._submitting = true;
        this._refreshSaveState();
        localUserStore.save(payload, this._mode !== 'edit').then(function () {
            popup.showSuccess(
                self._mode === 'edit' ? t('localUser.editSuccess') : t('localUser.addSuccess')
            );
            router.back();
        }).catch(function (error) {
            self._showStoreError(error, 'localUser.saveFailed');
        }).finally(function () {
            self._submitting = false;
            self._refreshSaveState();
        });
    }

    _showStoreError(error, fallbackKey) {
        const key = localUserStore.errorKey(error);
        const keys = {
            duplicate: 'localUser.addDuplicate',
            notFound: 'localUser.editNotFound',
            cardDuplicate: 'localUser.cardDuplicate',
            passwordDuplicate: 'localUser.passwordDuplicate',
            fingerDuplicate: 'fingerprint.enroll.status.duplicate',
        };
        // 已知业务错误使用本地化文案，其余错误直接显示组件或Domain的准确原因。
        popup.showError(keys[key]
            ? t(keys[key])
            : (localUserStore.errorMessage(error) || t(fallbackKey)));
    }

    _onDelete() {
        const self = this;
        keyboard.hideAll();
        if (!this._editingId) {
            popup.showError(t('localUser.editNotFound'));
            return;
        }
        confirm.show({
            title: t('localUser.deleteConfirmTitle'),
            message: t('localUser.deleteConfirmMsg'),
            confirmText: t('localUser.delete'),
            cancelText: t('localUser.deleteCancel'),
            onConfirm: function () {
                self._doDelete();
            },
        });
    }

    _doDelete() {
        if (this._submitting) return;
        const self = this;
        this._submitting = true;
        this._refreshSaveState();
        localUserStore.remove(this._editingId).then(function () {
            popup.showSuccess(t('localUser.deleteSuccess'));
            router.back();
        }).catch(function (error) {
            self._showStoreError(error, 'localUser.deleteFailed');
        }).finally(function () {
            self._submitting = false;
            self._refreshSaveState();
        });
    }
}

/** 新增用户 */
export default class LocalUserAddPage extends LocalUserFormPage {
    constructor() {
        super({
            route: 'settings_localUser_add',
            mode: 'add',
            idPrefix: 'local_user_add',
            titleKey: 'localUser.addTitle',
        });
    }
}

/** 编辑用户 */
export class LocalUserEditPage extends LocalUserFormPage {
    constructor() {
        super({
            route: 'settings_localUser_edit',
            mode: 'edit',
            idPrefix: 'local_user_edit',
            titleKey: 'localUser.editTitle',
        });
    }
}
