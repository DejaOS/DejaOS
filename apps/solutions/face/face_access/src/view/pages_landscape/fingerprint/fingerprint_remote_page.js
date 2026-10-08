/**
 * @layer    view
 * @module   fingerprint_remote_page
 * @fires    none
 * @listens  none
 * @depends  dxUi,BaseView,router,font,layout,theme,page_header,popup,i18n,datetime,fingerprint_store
 *
 * 远程指纹申请确认页（横屏）：展示申请人与申请时间；确认后进入真实录入；超时/拒绝取消远程 Promise。
 * 布局：说明 + 信息行在标题与底栏之间垂直居中；拒绝/确认并排贴底。
 */

import dxui from '../../../../dxmodules/dxUi.js';
import BaseView from '../../pages/base_view.js';
import router from '../../router/core.js';
import font from '../../components/font.js';
import layout from '../../components/layout.js';
import theme from '../../components/theme.js';
import pageHeader from '../../components/page_header.js';
import { t } from '../../i18n/index.js';
import { formatDateTime } from '../../utils/datetime.js';
import fingerprintStore from '../../pages/fingerprint/fingerprint_store.js';
import localUserStore from '../../pages/local_user/local_user_store.js';
import popup from '../../components/popup.js';
import { CONTENT_W, ROW_H, ACTION_BTN_BOTTOM } from '../ls_metrics.js';

/** 进入采指页前至少剩余秒数（三次采指 + 两次抬指）。 */
const REMOTE_MIN_ENROLL_SEC = 20;
/** 本页底栏按钮高度 */
const FP_ACTION_BTN_H = 80;
/** 拒绝 / 确认按钮间距 */
const ACTION_BTN_GAP = 24;
/** 说明与信息行间距 */
const STACK_GAP = 20;

export default class FingerprintRemotePage extends BaseView {
    constructor() {
        super('fingerprint_remote');
        this._header = null;
        /** @type {object|null} */
        this._titleLbl = null;
        /** @type {object|null} */
        this._nameValueLbl = null;
        /** @type {object|null} */
        this._timeValueLbl = null;
        /** @type {object|null} */
        this._nameFieldLbl = null;
        /** @type {object|null} */
        this._timeFieldLbl = null;
        /** @type {object|null} */
        this._confirmLbl = null;
        /** @type {object|null} */
        this._rejectLbl = null;
        /** @type {object|null} */
        this._countdownLbl = null;
        /** @type {string} */
        this._applicantName = '';
        /** @type {string} */
        this._userId = '';
        /** @type {string} */
        this._applyTime = '';
        /** @type {number} */
        this._remainSec = 0;
        /** @type {boolean} */
        this._leaving = false;
        /** @type {boolean} */
        this._confirmed = false;
    }

    onCreate() {
        const self = this;
        this.root = dxui.View.build('page_fingerprint_remote', dxui.Utils.LAYER.MAIN);
        this.root.setSize(layout.width, layout.height);
        layout.clearStyle(this.root);
        this.root.bgColor(theme.pageBg);
        this.root.bgOpa(100);
        this.root.scroll(false);

        this._header = pageHeader.build(this.root, {
            idPrefix: 'fp_remote',
            titleKey: 'fingerprint.remote.title',
            onBack: function () {
                self._leaveHome(true);
            },
        });
        this._buildBody();
    }

    /**
     * @param {{ params?: { name?: string, time?: string, userId?: string } }} context
     */
    onEnter(context) {
        if (this._header) {
            this._header.refresh();
        }
        const params = (context && context.params) || {};
        const extra = fingerprintStore.getRemoteExtra();
        this._userId = String(params.userId || extra.userId || '');
        // 接口常只带 userId；对齐旧 fingerApplyView：按 userId 查本地人员姓名。
        const nameFromPayload = String(
            params.name || extra.name || extra.userName || ''
        ).trim();
        this._applicantName = nameFromPayload || (this._userId ? this._userId : 'welcome');
        this._applyTime = String(params.time || formatDateTime(new Date()));
        this._leaving = false;
        this._confirmed = false;
        this._refreshLabels();
        this._startCountdown();
        if (!nameFromPayload && this._userId) {
            this._resolveApplicantNameByUserId();
        }
    }

    /**
     * 旧架构：screen.getUserById(extra.userId) → 展示 user.name，查不到则 welcome。
     */
    _resolveApplicantNameByUserId() {
        const self = this;
        localUserStore.get(this._userId).then(function (user) {
            if (self._leaving) return;
            const name = user && user.name ? String(user.name).trim() : '';
            self._applicantName = name || 'welcome';
            self._refreshLabels();
        }).catch(function () {
            if (self._leaving) return;
            self._applicantName = 'welcome';
            self._refreshLabels();
        });
    }

    onExit() {
        // 未确认离开时取消远程等待；已确认进入录入页则保留 Promise。
        if (!this._confirmed && !this._leaving && fingerprintStore.hasRemotePending()) {
            fingerprintStore.cancelRemote();
        }
        this._leaving = false;
        this._confirmed = false;
    }

    _buildBody() {
        const self = this;
        const top = pageHeader.contentTop();
        const contentH = layout.height - top;
        const textW = layout.x(CONTENT_W);
        const btnH = layout.y(FP_ACTION_BTN_H);
        const btnBottom = layout.y(ACTION_BTN_BOTTOM);
        const btnGap = layout.x(ACTION_BTN_GAP);
        const rowH = layout.y(ROW_H);
        const rowGap = layout.y(16);
        const stackGap = layout.y(STACK_GAP);

        const content = dxui.View.build('fp_remote_content', this.root);
        content.setSize(layout.width, contentH);
        content.setPos(0, top);
        layout.clearStyle(content);
        content.bgColor(0xf5f5f5);
        content.bgOpa(100);
        content.scroll(false);

        this._countdownLbl = dxui.Label.build('fp_remote_countdown', content);
        this._countdownLbl.setSize(layout.x(120), layout.y(36));
        this._countdownLbl.align(dxui.Utils.ALIGN.TOP_RIGHT, -layout.x(28), layout.y(8));
        this._countdownLbl.textFont(font.get(layout.fontSize(22)));
        this._countdownLbl.textColor(theme.textSecondary);
        this._countdownLbl.textAlign(dxui.Utils.TEXT_ALIGN.RIGHT);

        // 拒绝 / 确认并排贴底，避免竖向双条占高。
        const btnW = Math.floor((CONTENT_W - ACTION_BTN_GAP) / 2);
        const pairW = textW;
        const leftX = Math.round((layout.width - pairW) / 2);
        const btnY = contentH - btnBottom - btnH;

        const rejectBtn = dxui.Button.build('fp_remote_reject', content);
        rejectBtn.setSize(layout.x(btnW), btnH);
        rejectBtn.setPos(leftX, btnY);
        rejectBtn.bgColor(theme.pageBg);
        rejectBtn.radius(layout.x(14));
        rejectBtn.borderWidth(layout.x(2));
        rejectBtn.setBorderColor(0xdcdcdc);
        rejectBtn.on(dxui.Utils.EVENT.CLICK, function () {
            self._leaveHome(true);
        });

        this._rejectLbl = dxui.Label.build('fp_remote_reject_lbl', rejectBtn);
        this._rejectLbl.textFont(font.get(layout.fontSize(26)));
        this._rejectLbl.textColor(theme.textMuted);
        this._rejectLbl.align(dxui.Utils.ALIGN.CENTER, 0, 0);

        const confirmBtn = dxui.Button.build('fp_remote_confirm', content);
        confirmBtn.setSize(layout.x(btnW), btnH);
        confirmBtn.setPos(leftX + layout.x(btnW) + btnGap, btnY);
        confirmBtn.bgColor(theme.activeBg);
        confirmBtn.radius(layout.x(14));
        confirmBtn.borderWidth(0);
        confirmBtn.on(dxui.Utils.EVENT.CLICK, function () {
            self._onConfirm();
        });

        this._confirmLbl = dxui.Label.build('fp_remote_confirm_lbl', confirmBtn);
        this._confirmLbl.textFont(font.get(layout.fontSize(26)));
        this._confirmLbl.textColor(theme.textOnDark);
        this._confirmLbl.align(dxui.Utils.ALIGN.CENTER, 0, 0);

        const titleH = layout.y(56);
        const stackH = titleH + stackGap + rowH + rowGap + rowH;
        const stageH = btnY - layout.y(12);

        const stage = dxui.View.build('fp_remote_stage', content);
        layout.clearStyle(stage);
        stage.setSize(layout.width, stageH);
        stage.setPos(0, 0);
        stage.bgOpa(0);
        stage.scroll(false);
        stage.clickable(false);

        const stack = dxui.View.build('fp_remote_stack', stage);
        layout.clearStyle(stack);
        stack.setSize(textW, stackH);
        stack.align(dxui.Utils.ALIGN.CENTER, 0, 0);
        stack.bgOpa(0);
        stack.scroll(false);
        stack.clickable(false);

        this._titleLbl = dxui.Label.build('fp_remote_desc', stack);
        this._titleLbl.setSize(textW, titleH);
        this._titleLbl.align(dxui.Utils.ALIGN.TOP_MID, 0, 0);
        this._titleLbl.textFont(font.get(layout.fontSize(26)));
        this._titleLbl.textColor(theme.textPrimary);
        this._titleLbl.textAlign(dxui.Utils.TEXT_ALIGN.CENTER);
        this._titleLbl.longMode(dxui.Utils.LABEL_LONG_MODE.WRAP);

        const nameRow = this._buildInfoRow(stack, 'name', titleH + stackGap);
        this._nameFieldLbl = nameRow.fieldLbl;
        this._nameValueLbl = nameRow.valueLbl;

        const timeRow = this._buildInfoRow(stack, 'time', titleH + stackGap + rowH + rowGap);
        this._timeFieldLbl = timeRow.fieldLbl;
        this._timeValueLbl = timeRow.valueLbl;
    }

    /**
     * @param {object} parent
     * @param {string} key
     * @param {number} y 相对 parent 顶边距（屏像素）
     * @returns {{ fieldLbl: object, valueLbl: object }}
     */
    _buildInfoRow(parent, key, y) {
        const row = dxui.View.build('fp_remote_row_' + key, parent);
        layout.clearStyle(row);
        row.setSize(layout.x(CONTENT_W), layout.y(ROW_H));
        row.align(dxui.Utils.ALIGN.TOP_MID, 0, y);
        row.bgColor(theme.pageBg);
        row.bgOpa(100);
        row.radius(layout.x(14));
        row.scroll(false);

        const fieldW = layout.x(240);
        const valueW = layout.x(CONTENT_W - 240 - 48 - 24);

        const fieldLbl = dxui.Label.build('fp_remote_field_' + key, row);
        fieldLbl.setSize(fieldW, layout.y(40));
        fieldLbl.align(dxui.Utils.ALIGN.LEFT_MID, layout.x(24), 0);
        fieldLbl.textFont(font.get(layout.fontSize(24)));
        fieldLbl.textColor(theme.textPrimary);
        fieldLbl.textAlign(dxui.Utils.TEXT_ALIGN.LEFT);

        const valueLbl = dxui.Label.build('fp_remote_value_' + key, row);
        valueLbl.setSize(valueW, layout.y(40));
        valueLbl.align(dxui.Utils.ALIGN.RIGHT_MID, -layout.x(24), 0);
        valueLbl.textFont(font.get(layout.fontSize(24)));
        valueLbl.textColor(theme.textSecondary);
        valueLbl.textAlign(dxui.Utils.TEXT_ALIGN.RIGHT);
        valueLbl.longMode(dxui.Utils.LABEL_LONG_MODE.SCROLL_CIRCULAR);

        return { fieldLbl: fieldLbl, valueLbl: valueLbl };
    }

    _refreshLabels() {
        if (this._titleLbl) {
            this._titleLbl.text(t('fingerprint.remote.desc'));
        }
        if (this._nameFieldLbl) {
            this._nameFieldLbl.text(t('fingerprint.remote.name'));
        }
        if (this._timeFieldLbl) {
            this._timeFieldLbl.text(t('fingerprint.remote.time'));
        }
        if (this._nameValueLbl) {
            this._nameValueLbl.text(this._applicantName || '—');
        }
        if (this._timeValueLbl) {
            this._timeValueLbl.text(this._applyTime || '—');
        }
        if (this._confirmLbl) {
            this._confirmLbl.text(t('fingerprint.remote.confirm'));
        }
        if (this._rejectLbl) {
            this._rejectLbl.text(t('fingerprint.remote.reject'));
        }
        if (this._countdownLbl) {
            this._countdownLbl.text(this._remainSec + 's');
        }
    }

    _startCountdown() {
        this._remainSec = fingerprintStore.getRemoteRemainSec();
        this._paintCountdown();
        const self = this;
        this.setInterval(function () {
            if (self._leaving || self._confirmed) {
                return;
            }
            self._remainSec = fingerprintStore.getRemoteRemainSec();
            if (self._remainSec <= 0) {
                self._leaveHome(true);
                return;
            }
            self._paintCountdown();
        }, 1000);
    }

    _paintCountdown() {
        if (this._countdownLbl) {
            this._countdownLbl.text(this._remainSec + 's');
        }
    }

    _onConfirm() {
        if (this._leaving || this._confirmed) {
            return;
        }
        if (fingerprintStore.getRemoteRemainSec() < REMOTE_MIN_ENROLL_SEC) {
            popup.showError(t('fingerprint.remote.timeout'));
            this._leaveHome(true);
            return;
        }
        this._confirmed = true;
        this._leaving = true;
        router.replace('fingerprint_enroll', {
            mode: 'remote',
            userId: this._userId,
            name: this._applicantName,
        });
    }

    /**
     * @param {boolean} cancelPending
     */
    _leaveHome(cancelPending) {
        if (this._leaving) {
            return;
        }
        this._leaving = true;
        if (cancelPending) {
            fingerprintStore.cancelRemote();
        }
        fingerprintStore.goHomeDeferred();
    }
}
