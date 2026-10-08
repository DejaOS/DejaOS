/**
 * @layer    view
 * @module   fingerprint_enroll_page
 * @fires    CMD_ENROLL_FINGER,CMD_INTERRUPT_FINGER
 * @listens  none
 * @depends  dxUi,BaseView,router,font,layout,theme,page_header,popup,i18n,fingerprint_store
 *
 * 指纹录入页（横屏）：进度由 Domain 经 ui_driver.notifyFingerEnroll 下发；本页只展示并收尾导航。
 * 布局：图标/提示/步骤/状态在标题与底栏之间垂直居中，取消钮贴底。
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
import fingerprintStore from '../../pages/fingerprint/fingerprint_store.js';
import { CONTENT_W, ACTION_BTN_BOTTOM } from '../ls_metrics.js';

/** 本页底栏按钮高度 */
const FP_ACTION_BTN_H = 80;

const TOTAL_STEPS = 3;
const LEAVE_MS = 1000;
/** 指纹示意圆直径（设计稿） */
const ICON_SIDE = 160;
/** 步骤圆点直径 */
const DOT_SIZE = 28;
/** 步骤圆点间距 */
const DOT_GAP = 22;
/** 内容栈内部间距 */
const STACK_GAP = 16;

const PHASE = {
    READY: 'ready',
    COLLECTING: 'collecting',
    SUCCESS: 'success',
    FAIL: 'fail',
    TIMEOUT: 'timeout',
    DUPLICATE: 'duplicate',
};

function phaseFromError(error) {
    const msg = error && error.message ? String(error.message) : '';
    if (msg.indexOf('超时') >= 0) return PHASE.TIMEOUT;
    if (msg.indexOf('已存在') >= 0) return PHASE.DUPLICATE;
    if (msg.indexOf('中断') >= 0 || msg.indexOf('取消') >= 0) return PHASE.FAIL;
    return PHASE.FAIL;
}

export default class FingerprintEnrollPage extends BaseView {
    constructor() {
        super('fingerprint_enroll');
        this._header = null;
        /** @type {object|null} */
        this._hintLbl = null;
        /** @type {object|null} */
        this._statusLbl = null;
        /** @type {object|null} */
        this._progressLbl = null;
        /** @type {object[]} */
        this._stepDots = [];
        /** @type {object|null} */
        this._cancelLbl = null;
        /** @type {string} local | remote */
        this._mode = 'local';
        /** @type {string} */
        this._userId = '';
        /** @type {string} */
        this._phase = PHASE.READY;
        /** @type {number} */
        this._step = 0;
        /** @type {number} */
        this._runToken = 0;
        /** @type {boolean} */
        this._leaving = false;
        /** @type {string|null} */
        this._resultFeature = null;
        /** @type {boolean} 采指 Command 尚未 settle（异常离页时需 interrupt）。 */
        this._enrollActive = false;
    }

    onCreate() {
        const self = this;
        this.root = dxui.View.build('page_fingerprint_enroll', dxui.Utils.LAYER.MAIN);
        this.root.setSize(layout.width, layout.height);
        layout.clearStyle(this.root);
        this.root.bgColor(theme.pageBg);
        this.root.bgOpa(100);
        this.root.scroll(false);

        this._header = pageHeader.build(this.root, {
            idPrefix: 'fp_enroll',
            titleKey: 'fingerprint.enroll.title',
            onBack: function () {
                self._interruptAndLeave();
            },
        });
        this._buildBody();
    }

    /**
     * @param {{ params?: { mode?: string, userId?: string } }} context
     */
    onEnter(context) {
        if (this._header) {
            this._header.refresh();
        }
        const params = (context && context.params) || {};
        this._mode = params.mode === 'remote' ? 'remote' : 'local';
        this._userId = String(params.userId || '');
        if (this._mode === 'remote' && !this._userId) {
            const extra = fingerprintStore.getRemoteExtra();
            this._userId = String(extra.userId || '');
        }
        this._leaving = false;
        this._resultFeature = null;
        this._enrollActive = false;
        this._runToken += 1;
        this._step = 0;
        this._phase = PHASE.READY;
        this._refreshLabels();
        this._paintProgress();
        this._bindProgress();
        this._startEnroll();
    }

    onExit() {
        fingerprintStore.setProgressHandler(null);
        this._runToken += 1;
        // 异常离页（非本页主动收尾）时必须打断采指，否则远程 Promise / 串口锁会挂死。
        if (this._enrollActive) {
            this._enrollActive = false;
            fingerprintStore.interrupt({ userId: this._userId });
        } else if (this._mode === 'remote' && fingerprintStore.hasRemotePending() && !this._leaving) {
            fingerprintStore.cancelRemote();
        }
        this._leaving = false;
    }

    _buildBody() {
        const self = this;
        const top = pageHeader.contentTop();
        const contentH = layout.height - top;
        const btnH = layout.y(FP_ACTION_BTN_H);
        const btnBottom = layout.y(ACTION_BTN_BOTTOM);
        const textW = layout.x(CONTENT_W);

        const content = dxui.View.build('fp_enroll_content', this.root);
        content.setSize(layout.width, contentH);
        content.setPos(0, top);
        layout.clearStyle(content);
        content.bgColor(0xf5f5f5);
        content.bgOpa(100);
        content.scroll(false);

        const cancelBtn = dxui.Button.build('fp_enroll_cancel', content);
        cancelBtn.setSize(textW, btnH);
        cancelBtn.align(dxui.Utils.ALIGN.BOTTOM_MID, 0, -btnBottom);
        cancelBtn.bgColor(theme.pageBg);
        cancelBtn.radius(layout.x(14));
        cancelBtn.borderWidth(layout.x(2));
        cancelBtn.setBorderColor(0xdcdcdc);
        cancelBtn.on(dxui.Utils.EVENT.CLICK, function () {
            self._interruptAndLeave();
        });

        this._cancelLbl = dxui.Label.build('fp_enroll_cancel_lbl', cancelBtn);
        this._cancelLbl.textFont(font.get(layout.fontSize(26)));
        this._cancelLbl.textColor(theme.textMuted);
        this._cancelLbl.align(dxui.Utils.ALIGN.CENTER, 0, 0);

        // 标题栏与底栏之间：图标 + 提示 + 步骤 + 进度 + 状态，整体垂直居中。
        const iconSide = layout.x(ICON_SIDE);
        const gap = layout.y(STACK_GAP);
        const hintH = layout.y(40);
        const dotsH = layout.y(DOT_SIZE + 8);
        const progressH = layout.y(36);
        const statusH = layout.y(48);
        const stackH = iconSide + gap + hintH + gap + dotsH + gap + progressH + gap + statusH;
        const stageH = contentH - btnH - btnBottom - layout.y(16);

        const stage = dxui.View.build('fp_enroll_stage', content);
        layout.clearStyle(stage);
        stage.setSize(layout.width, stageH);
        stage.setPos(0, 0);
        stage.bgOpa(0);
        stage.scroll(false);
        stage.clickable(false);

        const stack = dxui.View.build('fp_enroll_stack', stage);
        layout.clearStyle(stack);
        stack.setSize(textW, stackH);
        stack.align(dxui.Utils.ALIGN.CENTER, 0, 0);
        stack.bgOpa(0);
        stack.scroll(false);
        stack.clickable(false);

        let y = 0;
        const iconBox = dxui.View.build('fp_enroll_icon', stack);
        layout.clearStyle(iconBox);
        iconBox.setSize(iconSide, iconSide);
        iconBox.align(dxui.Utils.ALIGN.TOP_MID, 0, y);
        iconBox.bgColor(theme.pageBg);
        iconBox.bgOpa(100);
        iconBox.radius(Math.floor(iconSide / 2));
        iconBox.borderWidth(layout.x(3));
        iconBox.setBorderColor(theme.accent);
        iconBox.scroll(false);
        iconBox.clickable(false);

        const iconLbl = dxui.Label.build('fp_enroll_icon_lbl', iconBox);
        iconLbl.text('指纹');
        iconLbl.textFont(font.get(layout.fontSize(32), dxui.Utils.FONT_STYLE.BOLD));
        iconLbl.textColor(theme.accent);
        iconLbl.align(dxui.Utils.ALIGN.CENTER, 0, 0);
        iconLbl.clickable(false);
        y += iconSide + gap;

        this._hintLbl = dxui.Label.build('fp_enroll_hint', stack);
        this._hintLbl.setSize(textW, hintH);
        this._hintLbl.align(dxui.Utils.ALIGN.TOP_MID, 0, y);
        this._hintLbl.textFont(font.get(layout.fontSize(24)));
        this._hintLbl.textColor(theme.textPrimary);
        this._hintLbl.textAlign(dxui.Utils.TEXT_ALIGN.CENTER);
        y += hintH + gap;

        this._buildStepDots(stack, y, dotsH);
        y += dotsH + gap;

        this._progressLbl = dxui.Label.build('fp_enroll_progress', stack);
        this._progressLbl.setSize(textW, progressH);
        this._progressLbl.align(dxui.Utils.ALIGN.TOP_MID, 0, y);
        this._progressLbl.textFont(font.get(layout.fontSize(22)));
        this._progressLbl.textColor(theme.textSecondary);
        this._progressLbl.textAlign(dxui.Utils.TEXT_ALIGN.CENTER);
        y += progressH + gap;

        this._statusLbl = dxui.Label.build('fp_enroll_status', stack);
        this._statusLbl.setSize(textW, statusH);
        this._statusLbl.align(dxui.Utils.ALIGN.TOP_MID, 0, y);
        this._statusLbl.textFont(font.get(layout.fontSize(22)));
        this._statusLbl.textColor(theme.textSecondary);
        this._statusLbl.textAlign(dxui.Utils.TEXT_ALIGN.CENTER);
        this._statusLbl.longMode(dxui.Utils.LABEL_LONG_MODE.WRAP);
    }

    /**
     * @param {object} parent
     * @param {number} topY 相对 stack 的顶边距（屏像素）
     * @param {number} boxH 步骤条高度（屏像素）
     */
    _buildStepDots(parent, topY, boxH) {
        const dotSize = layout.x(DOT_SIZE);
        const gap = layout.x(DOT_GAP);
        const boxW = TOTAL_STEPS * dotSize + (TOTAL_STEPS - 1) * gap;
        const box = dxui.View.build('fp_enroll_dots', parent);
        layout.clearStyle(box);
        box.setSize(boxW, boxH);
        box.align(dxui.Utils.ALIGN.TOP_MID, 0, topY);
        box.bgOpa(0);
        box.scroll(false);
        box.flexFlow(dxui.Utils.FLEX_FLOW.ROW);
        box.flexAlign(
            dxui.Utils.FLEX_ALIGN.CENTER,
            dxui.Utils.FLEX_ALIGN.CENTER,
            dxui.Utils.FLEX_ALIGN.CENTER
        );
        box.obj.lvObjSetStylePadGap(gap, dxui.Utils.ENUM._LV_STYLE_STATE_CMP_SAME);

        this._stepDots = [];
        for (let i = 0; i < TOTAL_STEPS; i++) {
            const dot = dxui.View.build('fp_enroll_dot_' + i, box);
            layout.clearStyle(dot);
            dot.setSize(dotSize, dotSize);
            dot.radius(Math.floor(dotSize / 2));
            dot.bgColor(theme.actionBg);
            dot.bgOpa(100);
            dot.borderWidth(0);
            this._stepDots.push(dot);
        }
    }

    _refreshLabels() {
        if (this._hintLbl) {
            this._hintLbl.text(t('fingerprint.enroll.hint'));
        }
        if (this._cancelLbl) {
            this._cancelLbl.text(t('fingerprint.enroll.cancel'));
        }
        this._paintStatus();
    }

    _paintProgress() {
        for (let i = 0; i < this._stepDots.length; i++) {
            const done = i < this._step;
            this._stepDots[i].bgColor(done ? theme.successText : theme.actionBg);
        }
        if (this._progressLbl) {
            this._progressLbl.text(
                t('fingerprint.enroll.progress', {
                    current: Math.min(this._step, TOTAL_STEPS),
                    total: TOTAL_STEPS,
                })
            );
        }
        this._paintStatus();
    }

    _paintStatus() {
        if (!this._statusLbl) {
            return;
        }
        let key = 'fingerprint.enroll.status.ready';
        let color = theme.textSecondary;
        if (this._phase === PHASE.COLLECTING) {
            key = 'fingerprint.enroll.status.collecting';
        } else if (this._phase === PHASE.SUCCESS) {
            key = 'fingerprint.enroll.status.success';
            color = theme.successText;
        } else if (this._phase === PHASE.FAIL) {
            key = 'fingerprint.enroll.status.fail';
            color = theme.errorText;
        } else if (this._phase === PHASE.TIMEOUT) {
            key = 'fingerprint.enroll.status.timeout';
            color = theme.errorText;
        } else if (this._phase === PHASE.DUPLICATE) {
            key = 'fingerprint.enroll.status.duplicate';
            color = theme.errorText;
        }
        this._statusLbl.text(t(key));
        this._statusLbl.textColor(color);
    }

    _bindProgress() {
        const token = this._runToken;
        const self = this;
        fingerprintStore.setProgressHandler(function (payload) {
            if (token !== self._runToken || self._leaving) {
                return;
            }
            const phase = String((payload && payload.phase) || '');
            if (phase === 'collecting') {
                self._phase = PHASE.COLLECTING;
                self._step = Number(payload.step) || 0;
                self._paintProgress();
                return;
            }
            if (phase === 'success' || phase === 'fail' || phase === 'timeout' || phase === 'duplicate') {
                // 终态由 enroll Promise 统一收尾，避免与 popup 重复弹两次。
                self._step = Number(payload.step) || self._step;
                if (phase === 'success') {
                    self._phase = PHASE.SUCCESS;
                } else if (phase === 'timeout') {
                    self._phase = PHASE.TIMEOUT;
                } else if (phase === 'duplicate') {
                    self._phase = PHASE.DUPLICATE;
                } else {
                    self._phase = PHASE.FAIL;
                }
                self._paintProgress();
                // 云端中断由 store 统一回主页，这里作废本页收尾，避免重复导航。
                if (phase === 'fail' && payload.mode === 'interrupt') {
                    self._leaving = true;
                    self._runToken += 1;
                }
            }
        });
    }

    _startEnroll() {
        const token = this._runToken;
        const self = this;
        this._phase = PHASE.COLLECTING;
        this._enrollActive = true;
        this._paintProgress();

        const enrollOption = {
            mode: this._mode,
            userId: this._userId,
        };
        if (this._mode === 'remote') {
            const remainSec = fingerprintStore.getRemoteRemainSec();
            if (remainSec > 0) {
                enrollOption.timeout = remainSec;
            }
        }
        fingerprintStore.enroll(enrollOption).then(function (result) {
            if (token !== self._runToken) {
                return;
            }
            self._resultFeature = result && result.fingerFeature
                ? String(result.fingerFeature)
                : null;
            self._finish(PHASE.SUCCESS);
        }).catch(function (error) {
            if (token !== self._runToken) {
                return;
            }
            self._finish(phaseFromError(error), error);
        }).finally(function () {
            self._enrollActive = false;
        });
    }

    /**
     * @param {string} phase
     * @param {Error=} error
     */
    _finish(phase) {
        const token = this._runToken;
        const self = this;
        this._phase = phase;
        this._paintProgress();
        if (phase === PHASE.SUCCESS) {
            popup.showSuccess(t('fingerprint.enroll.status.success'));
        } else if (phase !== PHASE.FAIL || !this._leaving) {
            popup.showError(t('fingerprint.enroll.status.' + (
                phase === PHASE.TIMEOUT ? 'timeout'
                    : phase === PHASE.DUPLICATE ? 'duplicate'
                        : 'fail'
            )));
        }
        this.setTimeout(function () {
            if (token !== self._runToken) {
                return;
            }
            self._leave(phase === PHASE.SUCCESS);
        }, LEAVE_MS);
    }

    /**
     * @param {boolean} success
     */
    _leave(success) {
        if (this._leaving) {
            return;
        }
        this._leaving = true;
        this._runToken += 1;
        this._enrollActive = false;
        fingerprintStore.setProgressHandler(null);

        if (this._mode === 'remote') {
            if (success && this._resultFeature) {
                fingerprintStore.finishRemote({
                    fingerFeature: this._resultFeature,
                });
            } else if (fingerprintStore.hasRemotePending()) {
                fingerprintStore.failRemote(
                    success ? '指纹特征为空' : t('fingerprint.enroll.status.fail')
                );
            }
            fingerprintStore.goHomeDeferred();
            return;
        }

        if (success) {
            router.back({
                fingerprintEnrolled: true,
                fingerprintFeature: this._resultFeature,
            });
            return;
        }
        router.back({ fingerprintEnrolled: false });
    }

    _interruptAndLeave() {
        if (this._leaving) {
            return;
        }
        const self = this;
        this._leaving = true;
        this._runToken += 1;
        this._enrollActive = false;
        fingerprintStore.setProgressHandler(null);
        fingerprintStore.interrupt({ userId: this._userId }).finally(function () {
            if (self._mode === 'remote') {
                fingerprintStore.cancelRemote();
                fingerprintStore.goHomeDeferred();
                return;
            }
            router.back({ fingerprintEnrolled: false, interrupted: true });
        });
    }
}
