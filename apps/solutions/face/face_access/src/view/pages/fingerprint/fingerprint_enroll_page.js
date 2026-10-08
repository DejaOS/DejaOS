/**
 * @layer    view
 * @module   fingerprint_enroll_page
 * @fires    CMD_ENROLL_FINGER,CMD_INTERRUPT_FINGER
 * @listens  none
 * @depends  dxUi,BaseView,router,font,layout,theme,page_header,popup,i18n,fingerprint_store
 *
 * 指纹录入页：进度由 Domain 经 ui_driver.notifyFingerEnroll 下发；本页只展示并收尾导航。
 */

import dxui from '../../../../dxmodules/dxUi.js';
import BaseView from '../base_view.js';
import router from '../../router/core.js';
import font from '../../components/font.js';
import layout from '../../components/layout.js';
import theme from '../../components/theme.js';
import pageHeader from '../../components/page_header.js';
import popup from '../../components/popup.js';
import { t } from '../../i18n/index.js';
import fingerprintStore from './fingerprint_store.js';

const TOTAL_STEPS = 3;
const LEAVE_MS = 1000;

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
        /** @type {number|null} */
        this._resultIndex = null;
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
        this._resultIndex = null;
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

        const content = dxui.View.build('fp_enroll_content', this.root);
        content.setSize(layout.width, contentH);
        content.setPos(0, top);
        layout.clearStyle(content);
        content.bgColor(0xf5f5f5);
        content.bgOpa(100);
        content.scroll(false);

        const iconBox = dxui.View.build('fp_enroll_icon', content);
        layout.clearStyle(iconBox);
        iconBox.setSize(layout.x(200), layout.y(200));
        iconBox.align(dxui.Utils.ALIGN.TOP_MID, 0, layout.y(80));
        iconBox.bgColor(theme.pageBg);
        iconBox.bgOpa(100);
        iconBox.radius(layout.x(100));
        iconBox.borderWidth(layout.x(4));
        iconBox.setBorderColor(theme.accent);
        iconBox.scroll(false);
        iconBox.clickable(false);

        const iconLbl = dxui.Label.build('fp_enroll_icon_lbl', iconBox);
        iconLbl.text('指纹');
        iconLbl.textFont(font.get(layout.fontSize(36), dxui.Utils.FONT_STYLE.BOLD));
        iconLbl.textColor(theme.accent);
        iconLbl.align(dxui.Utils.ALIGN.CENTER, 0, 0);
        iconLbl.clickable(false);

        this._hintLbl = dxui.Label.build('fp_enroll_hint', content);
        this._hintLbl.setSize(layout.x(640), layout.y(48));
        this._hintLbl.align(dxui.Utils.ALIGN.TOP_MID, 0, layout.y(320));
        this._hintLbl.textFont(font.get(layout.fontSize(26)));
        this._hintLbl.textColor(theme.textPrimary);
        this._hintLbl.textAlign(dxui.Utils.TEXT_ALIGN.CENTER);

        this._buildStepDots(content);

        this._progressLbl = dxui.Label.build('fp_enroll_progress', content);
        this._progressLbl.setSize(layout.x(640), layout.y(40));
        this._progressLbl.align(dxui.Utils.ALIGN.TOP_MID, 0, layout.y(480));
        this._progressLbl.textFont(font.get(layout.fontSize(24)));
        this._progressLbl.textColor(theme.textSecondary);
        this._progressLbl.textAlign(dxui.Utils.TEXT_ALIGN.CENTER);

        this._statusLbl = dxui.Label.build('fp_enroll_status', content);
        this._statusLbl.setSize(layout.x(640), layout.y(80));
        this._statusLbl.align(dxui.Utils.ALIGN.TOP_MID, 0, layout.y(540));
        this._statusLbl.textFont(font.get(layout.fontSize(26)));
        this._statusLbl.textColor(theme.textSecondary);
        this._statusLbl.textAlign(dxui.Utils.TEXT_ALIGN.CENTER);
        this._statusLbl.longMode(dxui.Utils.LABEL_LONG_MODE.WRAP);

        const cancelBtn = dxui.Button.build('fp_enroll_cancel', content);
        cancelBtn.setSize(layout.x(720), layout.y(88));
        cancelBtn.align(dxui.Utils.ALIGN.BOTTOM_MID, 0, -layout.y(48));
        cancelBtn.bgColor(theme.pageBg);
        cancelBtn.radius(layout.x(14));
        cancelBtn.borderWidth(layout.x(2));
        cancelBtn.setBorderColor(0xdcdcdc);
        cancelBtn.on(dxui.Utils.EVENT.CLICK, function () {
            self._interruptAndLeave();
        });

        this._cancelLbl = dxui.Label.build('fp_enroll_cancel_lbl', cancelBtn);
        this._cancelLbl.textFont(font.get(layout.fontSize(30)));
        this._cancelLbl.textColor(theme.textMuted);
        this._cancelLbl.align(dxui.Utils.ALIGN.CENTER, 0, 0);
    }

    /**
     * @param {object} parent
     */
    _buildStepDots(parent) {
        const dotSize = layout.x(36);
        const gap = layout.x(28);
        const boxW = TOTAL_STEPS * dotSize + (TOTAL_STEPS - 1) * gap;
        const box = dxui.View.build('fp_enroll_dots', parent);
        layout.clearStyle(box);
        box.setSize(boxW, layout.y(48));
        box.align(dxui.Utils.ALIGN.TOP_MID, 0, layout.y(400));
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
            self._resultIndex = result && typeof result.index === 'number' ? result.index : null;
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
