/**
 * @layer    view
 * @module   local_user_face_page
 * @fires    CMD_CAPTURE_FACE
 * @listens  none
 * @depends  dxUi,BaseView,router,font,layout,theme,page_header,i18n,popup,local_user_store
 *
 * 人脸录入：顶栏白底；中间透明取景，跟踪框由全局 face_box 绘制（与首页同款四角框）。
 * 3 秒倒计时后只采集临时图片和特征。
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
import localUserStore from '../../pages/local_user/local_user_store.js';

const COUNTDOWN_SEC = 3;
const LEAVE_MS = 800;

const PHASE = {
    COUNTDOWN: 'countdown',
    CAPTURING: 'capturing',
    SUCCESS: 'success',
    FAIL: 'fail',
};

export default class LocalUserFacePage extends BaseView {
    constructor() {
        super('settings_localUser_face');
        this._header = null;
        this._content = null;
        this._countdownLbl = null;
        this._hintLbl = null;
        /** @type {string} */
        this._userId = '';
        /** @type {string} */
        this._phase = PHASE.COUNTDOWN;
        /** @type {number} */
        this._remainSec = COUNTDOWN_SEC;
        /** @type {number} */
        this._runToken = 0;
        /** @type {boolean} */
        this._leaving = false;
    }

    onCreate() {
        this.root = dxui.View.build('page_local_user_face', dxui.Utils.LAYER.MAIN);
        this.root.setSize(layout.width, layout.height);
        layout.clearStyle(this.root);
        this.root.scroll(false);
        this._applyTransparentBackground();

        const topBar = dxui.View.build('local_user_face_top_bar', this.root);
        layout.clearStyle(topBar);
        topBar.setSize(layout.width, pageHeader.contentTop());
        topBar.setPos(0, 0);
        topBar.bgColor(theme.pageBg);
        topBar.bgOpa(100);
        topBar.scroll(false);
        topBar.clickable(false);

        this._header = pageHeader.build(this.root, {
            idPrefix: 'local_user_face',
            titleKey: 'localUser.faceTitle',
        });

        const top = pageHeader.contentTop();
        this._content = dxui.View.build('local_user_face_content', this.root);
        this._content.setSize(layout.width, layout.height - top);
        this._content.setPos(0, top);
        layout.clearStyle(this._content);
        this._content.bgOpa(0);
        this._content.scroll(false);
        this._content.clickable(false);

        this._countdownLbl = dxui.Label.build('local_user_face_count', this._content);
        this._countdownLbl.setSize(layout.x(360), layout.y(120));
        this._countdownLbl.align(dxui.Utils.ALIGN.CENTER, 0, layout.y(-40));
        this._countdownLbl.textFont(font.get(layout.fontSize(96), dxui.Utils.FONT_STYLE.BOLD));
        this._countdownLbl.textColor(theme.textOnDark);
        this._countdownLbl.textAlign(dxui.Utils.TEXT_ALIGN.CENTER);

        this._hintLbl = dxui.Label.build('local_user_face_hint', this._content);
        this._hintLbl.setSize(layout.x(640), layout.y(80));
        this._hintLbl.align(dxui.Utils.ALIGN.CENTER, 0, layout.y(220));
        this._hintLbl.textFont(font.get(layout.fontSize(26)));
        this._hintLbl.textColor(theme.textOnDark);
        this._hintLbl.textAlign(dxui.Utils.TEXT_ALIGN.CENTER);
        this._hintLbl.longMode(dxui.Utils.LABEL_LONG_MODE.WRAP);
    }

    /**
     * @param {{ params?: { userId?: string } }} context
     */
    onEnter(context) {
        this._applyTransparentBackground();
        if (this._header) {
            this._header.refresh();
        }
        const params = (context && context.params) || {};
        this._userId = String(params.userId || '').trim();
        this._leaving = false;
        this._runToken += 1;

        if (!this._userId) {
            popup.showError(t('localUser.faceNeedId'));
            this._leaveFail();
            return;
        }

        localUserStore.startFaceEnroll();
        this._startCountdown();
    }

    onExit() {
        this._runToken += 1;
        this._leaving = false;
        localUserStore.pauseFaceEnroll();
    }

    _applyTransparentBackground() {
        this.root.bgOpa(0);
        if (this._content) {
            this._content.bgOpa(0);
        }
    }

    _startCountdown() {
        this._phase = PHASE.COUNTDOWN;
        this._remainSec = COUNTDOWN_SEC;
        this._paint();
        this._tickCountdown();
    }

    _tickCountdown() {
        const token = this._runToken;
        const self = this;
        if (this._remainSec <= 0) {
            this._startCapture();
            return;
        }
        this._paint();
        this.setTimeout(function () {
            if (token !== self._runToken) {
                return;
            }
            self._remainSec -= 1;
            self._tickCountdown();
        }, 1000);
    }

    _startCapture() {
        const token = this._runToken;
        const self = this;
        this._phase = PHASE.CAPTURING;
        this._paint();

        localUserStore.captureFace().then(function (result) {
            if (token !== self._runToken) {
                // 页面已退出，抓拍结果无人接管，必须立即释放临时文件。
                localUserStore.releaseFacePhoto(result && result.picPath);
                return;
            }
            self._phase = PHASE.SUCCESS;
            self._paint();
            popup.showSuccess(t('localUser.faceSuccess'));
            self.setTimeout(function () {
                if (token !== self._runToken || self._leaving) {
                    return;
                }
                self._leaving = true;
                router.back({
                    faceEnrolled: true,
                    facePhoto: result.picPath || '',
                    faceData: { code: result.code, feature: result.feature },
                });
            }, LEAVE_MS);
        }).catch(function (error) {
            if (token !== self._runToken) {
                return;
            }
            self._phase = PHASE.FAIL;
            self._paint();
            popup.showError(error && error.message ? error.message : t('localUser.faceFail'));
            self.setTimeout(function () {
                if (token !== self._runToken || self._leaving) {
                    return;
                }
                self._leaveFail();
            }, LEAVE_MS);
        });
    }

    _leaveFail() {
        if (this._leaving) {
            return;
        }
        this._leaving = true;
        router.back();
    }

    _paint() {
        if (this._phase === PHASE.COUNTDOWN) {
            if (this._countdownLbl) {
                this._countdownLbl.text(String(this._remainSec));
                this._countdownLbl.show();
            }
            if (this._hintLbl) {
                this._hintLbl.text(t('localUser.faceHint'));
            }
            return;
        }

        if (this._countdownLbl) {
            this._countdownLbl.hide();
        }

        if (this._phase === PHASE.CAPTURING) {
            if (this._hintLbl) {
                this._hintLbl.text(t('localUser.faceCapturing'));
            }
            return;
        }

        if (this._hintLbl) {
            this._hintLbl.text(
                this._phase === PHASE.SUCCESS
                    ? t('localUser.faceSuccess')
                    : t('localUser.faceFail')
            );
        }
    }
}
