/**
 * @layer    view
 * @module   wecom_capture_page
 * @fires    none
 * @listens  none
 * @depends  dxUi,BaseView,router,font,layout,theme,popup,i18n,wecom_store
 *
 * 远程抓拍页：透明叠层 + 大号倒计时 →「抓拍中」→ 成功/失败提示后回主页。
 * 真实抓拍与 MQTT 回包由 wecom_store 承接。
 */

import dxui from '../../../../dxmodules/dxUi.js';
import BaseView from '../base_view.js';
import router from '../../router/core.js';
import font from '../../components/font.js';
import layout from '../../components/layout.js';
import theme from '../../components/theme.js';
import popup from '../../components/popup.js';
import { t } from '../../i18n/index.js';
import wecomStore from './wecom_store.js';

/** 倒计时秒数（进入页后从该值递减到 1，再进入抓拍态） */
const COUNTDOWN_SEC = 3;
/** 结果提示后回主页延迟（ms） */
const RESULT_LEAVE_MS = 1200;

/** @enum {string} */
const PHASE = {
    COUNTDOWN: 'countdown',
    CAPTURING: 'capturing',
    SUCCESS: 'success',
    FAIL: 'fail',
};

export default class WecomCapturePage extends BaseView {
    constructor() {
        super('wecom_capture');
        /** @type {object|null} */
        this._titleLbl = null;
        /** @type {object|null} */
        this._countdownLbl = null;
        /** @type {object|null} */
        this._hintLbl = null;
        /** @type {object|null} */
        this._ring = null;
        /** @type {string} */
        this._phase = PHASE.COUNTDOWN;
        /** @type {number} */
        this._remainSec = COUNTDOWN_SEC;
        /** @type {number} */
        this._runToken = 0;
        /** @type {boolean} */
        this._leaving = false;
        /** @type {boolean} */
        this._settled = false;
        /** @type {{ keyId?: *, type?: * }|null} */
        this._option = null;
    }

    onCreate() {
        this.root = dxui.View.build('page_wecom_capture', dxui.Utils.LAYER.MAIN);
        this.root.setSize(layout.width, layout.height);
        layout.clearStyle(this.root);
        this.root.scroll(false);
        this._applyTransparentBackground();

        const content = dxui.View.build('wecom_capture_content', this.root);
        content.setSize(layout.width, layout.height);
        content.setPos(0, 0);
        layout.clearStyle(content);
        content.bgOpa(0);
        content.scroll(false);
        content.clickable(false);

        this._titleLbl = dxui.Label.build('wecom_capture_title', content);
        this._titleLbl.setSize(layout.x(680), layout.y(50));
        this._titleLbl.align(dxui.Utils.ALIGN.TOP_MID, 0, layout.y(160));
        this._titleLbl.textFont(font.get(layout.fontSize(32), dxui.Utils.FONT_STYLE.BOLD));
        this._titleLbl.textColor(theme.textOnDark);
        this._titleLbl.textAlign(dxui.Utils.TEXT_ALIGN.CENTER);

        const ringSize = layout.x(280);
        this._ring = dxui.View.build('wecom_capture_ring', content);
        layout.clearStyle(this._ring);
        this._ring.setSize(ringSize, ringSize);
        this._ring.align(dxui.Utils.ALIGN.CENTER, 0, layout.y(-40));
        this._ring.bgOpa(0);
        this._ring.radius(Math.floor(ringSize / 2));
        this._ring.borderWidth(layout.x(6));
        this._ring.setBorderColor(theme.textOnDark);
        this._ring.scroll(false);
        this._ring.clickable(false);

        this._countdownLbl = dxui.Label.build('wecom_capture_count', this._ring);
        this._countdownLbl.setSize(ringSize, layout.y(120));
        this._countdownLbl.align(dxui.Utils.ALIGN.CENTER, 0, 0);
        this._countdownLbl.textFont(font.get(layout.fontSize(96), dxui.Utils.FONT_STYLE.BOLD));
        this._countdownLbl.textColor(theme.textOnDark);
        this._countdownLbl.textAlign(dxui.Utils.TEXT_ALIGN.CENTER);

        this._hintLbl = dxui.Label.build('wecom_capture_hint', content);
        this._hintLbl.setSize(layout.x(640), layout.y(80));
        this._hintLbl.align(dxui.Utils.ALIGN.CENTER, 0, layout.y(200));
        this._hintLbl.textFont(font.get(layout.fontSize(26)));
        this._hintLbl.textColor(theme.textOnDark);
        this._hintLbl.textAlign(dxui.Utils.TEXT_ALIGN.CENTER);
        this._hintLbl.longMode(dxui.Utils.LABEL_LONG_MODE.WRAP);
    }

    /**
     * @param {{ params?: { keyId?: *, type?: * } }} context
     */
    onEnter(context) {
        this._applyTransparentBackground();
        this._leaving = false;
        this._settled = false;
        this._runToken += 1;
        const params = (context && context.params) || {};
        this._option = { keyId: params.keyId, type: params.type };
        this._startCountdown();
    }

    onExit() {
        this._runToken += 1;
        this._leaving = false;
        if (!this._settled) {
            wecomStore.cancelCapture();
        }
        this._option = null;
    }

    /**
     * 透明叠层：透出摄像头底层画面。
     */
    _applyTransparentBackground() {
        this.root.bgOpa(0);
    }

    _startCountdown() {
        this._phase = PHASE.COUNTDOWN;
        this._remainSec = COUNTDOWN_SEC;
        this._paintPhase();
        this._tickCountdown();
    }

    _tickCountdown() {
        const token = this._runToken;
        const self = this;
        if (this._remainSec <= 0) {
            this._enterCapturing();
            return;
        }
        this._paintPhase();
        this.setTimeout(function () {
            if (token !== self._runToken) {
                return;
            }
            self._remainSec -= 1;
            self._tickCountdown();
        }, 1000);
    }

    async _enterCapturing() {
        const token = this._runToken;
        this._phase = PHASE.CAPTURING;
        this._paintPhase();

        const result = await wecomStore.captureForReply(this._option || {});
        if (token !== this._runToken) {
            return;
        }
        if (result.ok) {
            this._settled = true;
            wecomStore.finishCapture(result.payload);
            this._enterSuccess();
        } else {
            this._settled = true;
            wecomStore.failCapture(result.error || 'capture_failed');
            this._enterFail();
        }
    }

    _enterSuccess() {
        const token = this._runToken;
        const self = this;
        this._phase = PHASE.SUCCESS;
        this._paintPhase();
        popup.showSuccess(t('wecom.capture.success'));
        this.setTimeout(function () {
            if (token !== self._runToken) {
                return;
            }
            self._leaveHome();
        }, RESULT_LEAVE_MS);
    }

    _enterFail() {
        const token = this._runToken;
        const self = this;
        this._phase = PHASE.FAIL;
        this._paintPhase();
        popup.showError(t('wecom.capture.fail'));
        this.setTimeout(function () {
            if (token !== self._runToken) {
                return;
            }
            self._leaveHome();
        }, RESULT_LEAVE_MS);
    }

    _leaveHome() {
        if (this._leaving) {
            return;
        }
        this._leaving = true;
        const stack = router.getStack();
        if (stack.indexOf('home') >= 0) {
            router.backTo('home');
        } else {
            router.replace('home');
        }
    }

    _paintPhase() {
        if (this._titleLbl) {
            this._titleLbl.text(t('wecom.capture.title'));
        }

        if (this._phase === PHASE.COUNTDOWN) {
            if (this._ring) {
                this._ring.setBorderColor(theme.textOnDark);
                this._ring.show();
            }
            if (this._countdownLbl) {
                this._countdownLbl.text(String(this._remainSec));
                this._countdownLbl.show();
            }
            if (this._hintLbl) {
                this._hintLbl.text(t('wecom.capture.hint'));
            }
            return;
        }

        if (this._phase === PHASE.CAPTURING) {
            if (this._countdownLbl) {
                this._countdownLbl.hide();
            }
            if (this._ring) {
                this._ring.setBorderColor(theme.accent);
                this._ring.show();
            }
            if (this._hintLbl) {
                this._hintLbl.text(t('wecom.capture.capturing'));
            }
            return;
        }

        if (this._countdownLbl) {
            this._countdownLbl.hide();
        }
        if (this._ring) {
            this._ring.setBorderColor(
                this._phase === PHASE.SUCCESS ? theme.successText : theme.errorText
            );
        }
        if (this._hintLbl) {
            this._hintLbl.text(
                this._phase === PHASE.SUCCESS
                    ? t('wecom.capture.success')
                    : t('wecom.capture.fail')
            );
        }
    }
}
