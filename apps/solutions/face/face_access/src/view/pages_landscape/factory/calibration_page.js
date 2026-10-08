/**
 * @layer    view
 * @module   calibration_page
 * @fires    CMD_START_CAMERA_CALIBRATION,CMD_STOP_CAMERA_CALIBRATION,CMD_CALCULATE_CAMERA_CALIBRATION,CMD_COMPLETE_CAMERA_CALIBRATION
 * @listens  none
 * @depends  dxUi,dxLogger,BaseView,router,font,layout,theme,page_header,popup,i18n,capcal_store
 *
 * 摄像头双目标定：参考 face_app2 capcalView 流程，透明叠层露出预览，倒计时后循环 calculate。
 */

import dxui from '../../../../dxmodules/dxUi.js';
import dxLogger from '../../../../dxmodules/dxLogger.js';
import BaseView from '../../pages/base_view.js';
import router from '../../router/core.js';
import font from '../../components/font.js';
import layout from '../../components/layout.js';
import theme from '../../components/theme.js';
import pageHeader from '../../components/page_header.js';
import popup from '../../components/popup.js';
import { t } from '../../i18n/index.js';
import capcalStore from '../../pages/factory/capcal_store.js';
const SLOW_THRESHOLD_MS = 3000;
const PREP_FIRST_SEC = 10;
const PREP_SECOND_SEC = 5;
const BORDER_SLOW = theme.faceBoxFailed;
const BORDER_FAST = theme.faceBoxMatched;
const LEAVE_AFTER_DONE_MS = 600;

export default class CalibrationPage extends BaseView {
    constructor() {
        super('settings_factory_calibration');
        this._header = null;
        this._statusWrap = null;
        this._statusLbl = null;
        this._distWrap = null;
        this._distHint = null;
        this._frame0 = null;
        this._frame1 = null;
        this._label0 = null;
        this._label1 = null;
        this._flowToken = 0;
        this._leaving = false;
    }

    onCreate() {
        this.root = dxui.View.build('page_factory_calibration', dxui.Utils.LAYER.MAIN);
        this.root.setSize(layout.width, layout.height);
        layout.clearStyle(this.root);
        this.root.scroll(false);
        this.root.bgOpa(0);

        const topBar = dxui.View.build('factory_cal_top_bar', this.root);
        layout.clearStyle(topBar);
        topBar.setSize(layout.width, pageHeader.contentTop());
        topBar.setPos(0, 0);
        topBar.bgColor(theme.pageBg);
        topBar.bgOpa(100);
        topBar.scroll(false);
        topBar.clickable(false);

        const self = this;
        this._header = pageHeader.build(this.root, {
            idPrefix: 'factory_cal',
            titleKey: 'factory.section.calibration',
            onBack: function () {
                self._leave();
            },
        });

        this._frame0 = this._buildFrame('factory_cal_frame0', 'factory.calibration.first');
        this._frame1 = this._buildFrame('factory_cal_frame1', 'factory.calibration.second');
        this._label0 = this._frame0.label;
        this._label1 = this._frame1.label;
        this._frame0.view.hide();
        this._frame1.view.hide();

        // 横屏框位固定且偏高，提示固定贴底，避免压住红框。
        const statusH = layout.y(44);
        const statusW = layout.x(720);
        const distH = layout.y(44);
        const distW = layout.x(520);
        const gap = layout.y(8);
        const bottomPad = layout.y(20);

        this._statusWrap = dxui.View.build('factory_cal_status_wrap', this.root);
        layout.clearStyle(this._statusWrap);
        this._statusWrap.setSize(statusW, statusH);
        this._statusWrap.align(dxui.Utils.ALIGN.BOTTOM_MID, 0, -(bottomPad + distH + gap));
        this._statusWrap.bgColor(0x1a1a1a);
        this._statusWrap.bgOpa(210);
        this._statusWrap.radius(Math.floor(statusH / 2));
        this._statusWrap.scroll(false);
        this._statusWrap.clickable(false);

        this._statusLbl = dxui.Label.build('factory_cal_status', this._statusWrap);
        this._statusLbl.setSize(statusW - layout.x(32), statusH);
        this._statusLbl.align(dxui.Utils.ALIGN.CENTER, 0, 0);
        this._statusLbl.textFont(font.get(layout.fontSize(28), dxui.Utils.FONT_STYLE.BOLD));
        this._statusLbl.textColor(theme.textOnDark);
        this._statusLbl.textAlign(dxui.Utils.TEXT_ALIGN.CENTER);
        this._statusLbl.longMode(dxui.Utils.LABEL_LONG_MODE.SCROLL_CIRCULAR);

        this._distWrap = dxui.View.build('factory_cal_dist_wrap', this.root);
        layout.clearStyle(this._distWrap);
        this._distWrap.setSize(distW, distH);
        this._distWrap.align(dxui.Utils.ALIGN.BOTTOM_MID, 0, -bottomPad);
        this._distWrap.bgColor(0x1a1a1a);
        this._distWrap.bgOpa(210);
        this._distWrap.radius(Math.floor(distH / 2));
        this._distWrap.scroll(false);
        this._distWrap.clickable(false);

        this._distHint = dxui.Label.build('factory_cal_dist_hint', this._distWrap);
        this._distHint.setSize(distW - layout.x(24), distH);
        this._distHint.align(dxui.Utils.ALIGN.CENTER, 0, 0);
        this._distHint.textFont(font.get(layout.fontSize(24)));
        this._distHint.textColor(theme.textOnDark);
        this._distHint.textAlign(dxui.Utils.TEXT_ALIGN.CENTER);
    }

    onEnter() {
        this.root.bgOpa(0);
        if (this._header) {
            this._header.refresh();
        }
        this._refreshStaticTexts();
        this._leaving = false;
        this._flowToken += 1;
        const token = this._flowToken;
        const self = this;

        capcalStore.begin().then(function (boxes) {
            if (token !== self._flowToken) {
                return;
            }
            self._applyBox(self._frame0.view, boxes && boxes.box0);
            self._applyBox(self._frame1.view, boxes && boxes.box1);
            self._setDistanceHint(0);
            self._frame0.view.setBorderColor(BORDER_SLOW);
            self._frame1.view.setBorderColor(BORDER_SLOW);
            self._frame0.view.show();
            self._frame1.view.hide();
            return self._runFlow(token);
        }).catch(function (e) {
            dxLogger.error('calibration_page begin failed: ' + (e && e.message ? e.message : e));
            if (token === self._flowToken) {
                self._leave();
            }
        });
    }

    onExit() {
        this._flowToken += 1;
        this._leaving = true;
        this._frame0.view.hide();
        this._frame1.view.hide();
        capcalStore.stop().catch(function (e) {
            dxLogger.error('calibration_page stop failed: ' + (e && e.message ? e.message : e));
        });
    }

    _buildFrame(id, labelKey) {
        const view = dxui.View.build(id, this.root);
        layout.clearStyle(view);
        view.bgOpa(0);
        view.borderWidth(layout.x(5));
        view.setBorderColor(BORDER_SLOW);
        view.scroll(false);
        view.clickable(false);
        view.hide();

        const label = dxui.Label.build(id + '_lbl', view);
        label.align(dxui.Utils.ALIGN.BOTTOM_MID, 0, 0);
        label.textFont(font.get(layout.fontSize(26)));
        label.textColor(theme.textOnDark);
        label.textAlign(dxui.Utils.TEXT_ALIGN.CENTER);
        label.clickable(false);

        return { view: view, label: label, labelKey: labelKey };
    }

    _applyBox(view, box) {
        if (!view || !box) {
            return;
        }
        const w = Math.max(1, Number(box.w) || 0);
        const h = Math.max(1, Number(box.h) || 0);
        const x = Number(box.x) || 0;
        const y = Number(box.y) || 0;
        view.setSize(w, h);
        view.setPos(x, y);
    }

    _refreshStaticTexts() {
        if (this._label0) {
            this._label0.text(t('factory.calibration.first'));
        }
        if (this._label1) {
            this._label1.text(t('factory.calibration.second'));
        }
    }

    _setDistanceHint(stage) {
        if (!this._distHint) {
            return;
        }
        this._distHint.text(t(stage >= 1
            ? 'factory.calibration.distHint2'
            : 'factory.calibration.distHint1'));
    }

    _setStatus(text, color) {
        if (!this._statusLbl) {
            return;
        }
        this._statusLbl.text(String(text || ''));
        this._statusLbl.textColor(color == null ? theme.textOnDark : color);
    }

    _isAlive(token) {
        return token === this._flowToken && !this._leaving;
    }

    _leave() {
        if (this._leaving) {
            return;
        }
        this._leaving = true;
        this._flowToken += 1;
        router.back();
    }

    /**
     * @param {number} token
     * @param {number} seconds
     * @param {function(number): string} formatMessage
     * @returns {Promise<boolean>}
     */
    _runPrepCountdown(token, seconds, formatMessage) {
        const self = this;
        return new Promise(function (resolve) {
            let left = seconds;

            function tick() {
                if (!self._isAlive(token)) {
                    resolve(false);
                    return;
                }
                if (left <= 0) {
                    resolve(true);
                    return;
                }
                self._setStatus(formatMessage(left), theme.textOnDark);
                left -= 1;
                self.setTimeout(function () {
                    tick();
                }, 1000);
            }

            tick();
        });
    }

    _updateHint(durationMs, activeView) {
        if (durationMs > SLOW_THRESHOLD_MS) {
            this._setStatus(t('factory.calibration.putPaper'), BORDER_SLOW);
            if (activeView) {
                activeView.setBorderColor(BORDER_SLOW);
            }
            return;
        }
        this._setStatus(t('factory.calibration.holdOn'), BORDER_FAST);
        if (activeView) {
            activeView.setBorderColor(BORDER_FAST);
        }
    }

    /**
     * @param {number} token
     */
    async _runFlow(token) {
        const self = this;
        if (!(await this._runPrepCountdown(token, PREP_FIRST_SEC, function (s) {
            return s + t('factory.calibration.prepFirst');
        }))) {
            return;
        }
        if (!this._isAlive(token)) {
            return;
        }

        this._setStatus(t('factory.calibration.putPaper'), BORDER_SLOW);

        let stage = 0;
        let stage0Done = false;

        while (this._isAlive(token)) {
            const activeView = stage >= 1 ? this._frame1.view : this._frame0.view;
            let result = { ok: false, durationMs: 0 };
            try {
                result = await capcalStore.calculate(stage);
            } catch (e) {
                dxLogger.error('calibration_page calculate failed: ' + (e && e.message ? e.message : e));
                result = { ok: false, durationMs: SLOW_THRESHOLD_MS + 1 };
            }
            if (!this._isAlive(token)) {
                return;
            }

            this._updateHint(result.durationMs, activeView);
            dxLogger.info(
                '[calibration] stage=' + (stage + 1)
                + ' duration=' + result.durationMs
                + 'ms ok=' + result.ok
            );

            if (!result.ok) {
                continue;
            }

            if (stage >= 1) {
                try {
                    await capcalStore.complete();
                } catch (e) {
                    dxLogger.error('calibration_page complete failed: ' + (e && e.message ? e.message : e));
                    if (this._isAlive(token)) {
                        this._setStatus(t('factory.calibration.completeFail'), BORDER_SLOW);
                        popup.showError(t('factory.calibration.completeFail'));
                    }
                    return;
                }
                if (!this._isAlive(token)) {
                    return;
                }
                this.setTimeout(function () {
                    if (self._isAlive(token)) {
                        self._leave();
                    }
                }, LEAVE_AFTER_DONE_MS);
                return;
            }

            if (stage0Done) {
                continue;
            }
            stage0Done = true;

            try {
                await capcalStore.playStageOneDone();
            } catch (e) {
                dxLogger.error('calibration_page stage audio failed: ' + (e && e.message ? e.message : e));
            }

            this._frame0.view.hide();
            this._setDistanceHint(1);
            this._frame1.view.setBorderColor(BORDER_SLOW);
            this._frame1.view.show();

            if (!(await this._runPrepCountdown(token, PREP_SECOND_SEC, function (s) {
                return s + t('factory.calibration.prepSecond');
            }))) {
                return;
            }
            if (!this._isAlive(token)) {
                return;
            }

            this._setStatus(t('factory.calibration.putPaper'), BORDER_SLOW);
            stage = 1;
        }
    }
}
