/**
 * @layer    view
 * @module   call_page
 * @fires    none
 * @listens  none
 * @depends  dxUi,BaseView,router,font,layout,theme,page_header,assets,i18n,call_store
 *
 * 呼叫界面（横屏）：白底居中构图；进入后开始呼叫，可挂断；接通后可禁麦/扬声器并显示时长。
 */

import dxui from '../../../../dxmodules/dxUi.js';
import BaseView from '../../pages/base_view.js';
import router from '../../router/core.js';
import font from '../../components/font.js';
import layout from '../../components/layout.js';
import theme from '../../components/theme.js';
import pageHeader from '../../components/page_header.js';
import { asset } from '../../utils/assets.js';
import { t } from '../../i18n/index.js';
import callStore from '../../pages/call/call_store.js';
import { CONTENT_W } from '../ls_metrics.js';

const IMG_CALL = asset('call.png');
const IMG_MIC_ON = asset('mynaui--microphone.png');
const IMG_MIC_OFF = asset('mynaui--microphone-off.png');
const IMG_SPEAKER_ON = asset('heroicons--speaker-wave.png');
const IMG_SPEAKER_OFF = asset('heroicons--speaker-x-mark.png');
const IMG_HANGUP = asset('streamline--hang-up-1.png');

const AVATAR_SIDE = 200;
const BTN_SIZE = 96;
const STACK_GAP = 16;
const HANGUP_BG = 0xe74c3c;
const CTRL_BG = 0xf0f0f0;
const CTRL_BG_MUTED = 0xe0e0e0;
const AVATAR_BG = 0xf6f6f6;

export default class CallPage extends BaseView {
    constructor() {
        super('call_session');
        this._header = null;
        /** @type {object|null} */
        this._nameLbl = null;
        /** @type {object|null} */
        this._idLbl = null;
        /** @type {object|null} */
        this._statusLbl = null;
        /** @type {object|null} */
        this._durationLbl = null;
        /** @type {object|null} */
        this._avatar = null;
        /** @type {{ button: object, icon: object }|null} */
        this._micBtn = null;
        /** @type {{ button: object, icon: object }|null} */
        this._speakerBtn = null;
        /** @type {{ button: object, icon: object }|null} */
        this._hangupBtn = null;
        /** @type {string} */
        this._contactId = '';
        /** @type {string} */
        this._contactName = '';
        /** @type {boolean} */
        this._leaving = false;
        this._hadSession = false;
        this._durationRunning = false;
        this._durationSec = 0;
        this._durationToken = 0;
    }

    onCreate() {
        this.root = dxui.View.build('page_call_session', dxui.Utils.LAYER.MAIN);
        this.root.setSize(layout.width, layout.height);
        layout.clearStyle(this.root);
        this.root.bgColor(0xffffff);
        this.root.bgOpa(100);
        this.root.scroll(false);

        const self = this;
        this._header = pageHeader.build(this.root, {
            idPrefix: 'call_session',
            titleKey: 'call.session.title',
            onBack: function () {
                self._hangupAndBack();
            },
        });
        this._buildBody();
    }

    /**
     * @param {{ params?: { id?: string, name?: string } }} context
     */
    onEnter(context) {
        if (this._header) {
            this._header.refresh();
        }
        this._leaving = false;
        this._hadSession = false;
        const params = (context && context.params) || {};
        this._contactId = String(params.id || '');
        this._contactName = String(params.name || '');
        if (!this._contactName && this._contactId) {
            const found = callStore.findContact(this._contactId);
            if (found) {
                this._contactName = found.name || '';
            }
        }
        const self = this;
        const unsubscribe = callStore.subscribe(function (state) {
            self._applySession(state);
        });
        this.addCleanup(unsubscribe);
        this._startOutgoing();
    }

    onExit() {
        this._stopDuration();
        if (!this._leaving && callStore.isInCall()) {
            callStore.hangup('ui_page_exit').catch(function () {});
        }
        this._leaving = false;
        this._hadSession = false;
    }

    _buildBody() {
        const self = this;
        const top = pageHeader.contentTop();
        const contentH = layout.height - top;
        const textW = layout.x(CONTENT_W);
        const btnSize = layout.x(BTN_SIZE);
        const controlsH = btnSize + layout.y(32);
        const controlsBottom = layout.y(40);

        const content = dxui.View.build('call_session_content', this.root);
        content.setSize(layout.width, contentH);
        content.setPos(0, top);
        layout.clearStyle(content);
        content.bgColor(0xffffff);
        content.bgOpa(100);
        content.scroll(false);

        const controls = dxui.View.build('call_session_controls', content);
        layout.clearStyle(controls);
        controls.setSize(textW, controlsH);
        controls.align(dxui.Utils.ALIGN.BOTTOM_MID, 0, -controlsBottom);
        controls.bgOpa(0);
        controls.scroll(false);

        this._micBtn = this._buildIconBtn(controls, 'mic', -layout.x(180), IMG_MIC_ON, function () {
            self._toggleMic();
        });
        this._hangupBtn = this._buildIconBtn(controls, 'hangup', 0, IMG_HANGUP, function () {
            self._hangupAndBack();
        });
        this._hangupBtn.button.bgColor(HANGUP_BG);
        this._speakerBtn = this._buildIconBtn(controls, 'speaker', layout.x(180), IMG_SPEAKER_ON, function () {
            self._toggleSpeaker();
        });

        const avatarSide = layout.x(AVATAR_SIDE);
        const gap = layout.y(STACK_GAP);
        const nameH = layout.y(48);
        const idH = layout.y(36);
        const statusH = layout.y(40);
        const durationH = layout.y(44);
        const stackH = nameH + gap + idH + gap + avatarSide + gap + statusH + gap + durationH;
        const stageH = contentH - controlsH - controlsBottom - layout.y(12);

        const stage = dxui.View.build('call_session_stage', content);
        layout.clearStyle(stage);
        stage.setSize(layout.width, stageH);
        stage.setPos(0, 0);
        stage.bgOpa(0);
        stage.scroll(false);
        stage.clickable(false);

        const stack = dxui.View.build('call_session_stack', stage);
        layout.clearStyle(stack);
        stack.setSize(textW, stackH);
        stack.align(dxui.Utils.ALIGN.CENTER, 0, 0);
        stack.bgOpa(0);
        stack.scroll(false);
        stack.clickable(false);

        let y = 0;
        this._nameLbl = dxui.Label.build('call_session_name', stack);
        this._nameLbl.setSize(textW, nameH);
        this._nameLbl.align(dxui.Utils.ALIGN.TOP_MID, 0, y);
        this._nameLbl.textFont(font.get(layout.fontSize(34), dxui.Utils.FONT_STYLE.BOLD));
        this._nameLbl.textColor(0x333333);
        this._nameLbl.textAlign(dxui.Utils.TEXT_ALIGN.CENTER);
        y += nameH + gap;

        this._idLbl = dxui.Label.build('call_session_id', stack);
        this._idLbl.setSize(textW, idH);
        this._idLbl.align(dxui.Utils.ALIGN.TOP_MID, 0, y);
        this._idLbl.textFont(font.get(layout.fontSize(22)));
        this._idLbl.textColor(theme.textSecondary);
        this._idLbl.textAlign(dxui.Utils.TEXT_ALIGN.CENTER);
        y += idH + gap;

        this._avatar = dxui.View.build('call_session_avatar', stack);
        layout.clearStyle(this._avatar);
        this._avatar.setSize(avatarSide, avatarSide);
        this._avatar.align(dxui.Utils.ALIGN.TOP_MID, 0, y);
        this._avatar.radius(Math.floor(avatarSide / 2));
        this._avatar.bgColor(AVATAR_BG);
        this._avatar.bgOpa(100);
        this._avatar.borderWidth(0);
        this._avatar.clickable(false);

        const avatarImg = dxui.Image.build('call_session_avatar_img', this._avatar);
        avatarImg.source(IMG_CALL);
        avatarImg.align(dxui.Utils.ALIGN.CENTER, 0, 0);
        avatarImg.clickable(false);
        y += avatarSide + gap;

        this._statusLbl = dxui.Label.build('call_session_status', stack);
        this._statusLbl.setSize(textW, statusH);
        this._statusLbl.align(dxui.Utils.ALIGN.TOP_MID, 0, y);
        this._statusLbl.textFont(font.get(layout.fontSize(26)));
        this._statusLbl.textColor(theme.textSecondary);
        this._statusLbl.textAlign(dxui.Utils.TEXT_ALIGN.CENTER);
        y += statusH + gap;

        this._durationLbl = dxui.Label.build('call_session_duration', stack);
        this._durationLbl.setSize(textW, durationH);
        this._durationLbl.align(dxui.Utils.ALIGN.TOP_MID, 0, y);
        this._durationLbl.textFont(font.get(layout.fontSize(30), dxui.Utils.FONT_STYLE.BOLD));
        this._durationLbl.textColor(0x333333);
        this._durationLbl.textAlign(dxui.Utils.TEXT_ALIGN.CENTER);
        this._durationLbl.hide();
    }

    /**
     * @param {object} parent
     * @param {string} id
     * @param {number} offsetX
     * @param {string} iconSrc
     * @param {Function} onClick
     * @returns {{ button: object, icon: object }}
     */
    _buildIconBtn(parent, id, offsetX, iconSrc, onClick) {
        const size = layout.x(BTN_SIZE);
        const button = dxui.Button.build('call_session_btn_' + id, parent);
        button.setSize(size, size);
        button.align(dxui.Utils.ALIGN.CENTER, offsetX, 0);
        button.bgColor(CTRL_BG);
        button.bgOpa(100);
        button.radius(Math.floor(size / 2));
        button.borderWidth(0);
        button.padAll(0);
        if (typeof button.obj.lvObjSetStyleShadowWidth === 'function') {
            button.obj.lvObjSetStyleShadowWidth(0, 0);
        }
        button.on(dxui.Utils.EVENT.CLICK, onClick);

        const icon = dxui.Image.build('call_session_btn_icon_' + id, button);
        icon.source(iconSrc);
        icon.align(dxui.Utils.ALIGN.CENTER, 0, 0);
        icon.clickable(false);

        return { button: button, icon: icon };
    }

    _startOutgoing() {
        this._stopDuration();
        this._nameLbl.text(this._contactName || t('call.session.unknown'));
        this._idLbl.text(this._contactId || '');
        this._statusLbl.text(t('call.session.calling'));
        this._durationLbl.hide();
        this._setControlsVisible(false, true);
        this._refreshControlIcons();
        const self = this;
        callStore.startCall({
            id: this._contactId,
            name: this._contactName,
        }).catch(function (e) {
            if (!self._leaving) {
                self._statusLbl.text(e && e.message ? e.message : t('call.session.failed'));
                self._setControlsVisible(false, true);
            }
        });
    }

    _applySession(sess) {
        if (!sess || this._leaving) {
            return;
        }
        if (sess.contact) {
            this._contactId = sess.contact.id || this._contactId;
            this._contactName = sess.contact.name || this._contactName;
        }
        this._nameLbl.text(this._contactName || t('call.session.unknown'));
        this._idLbl.text(this._contactId || '');
        if (sess.state === 'idle') {
            if (this._hadSession) {
                this._leaving = true;
                this._stopDuration();
                router.back();
            }
            return;
        }
        this._hadSession = true;
        this._refreshControlIcons();
        if (sess.state === 'active') {
            this._statusLbl.text(t('call.session.connected'));
            this._setControlsVisible(true, true);
            this._startDuration(sess.startedAt);
            return;
        }
        this._stopDuration();
        if (sess.state === 'failed') {
            this._statusLbl.text(sess.error || t('call.session.failed'));
            this._setControlsVisible(false, true);
            return;
        }
        if (sess.state === 'ending') {
            this._statusLbl.text(sess.error || t('call.session.ended'));
            this._setControlsVisible(false, false);
            return;
        }
        this._statusLbl.text(t('call.session.calling'));
        this._setControlsVisible(false, true);
    }

    /**
     * @param {boolean} showAudio
     * @param {boolean} showHangup
     */
    _setControlsVisible(showAudio, showHangup) {
        if (this._micBtn) {
            if (showAudio) {
                this._micBtn.button.show();
            } else {
                this._micBtn.button.hide();
            }
        }
        if (this._speakerBtn) {
            if (showAudio) {
                this._speakerBtn.button.show();
            } else {
                this._speakerBtn.button.hide();
            }
        }
        if (this._hangupBtn) {
            if (showHangup) {
                this._hangupBtn.button.show();
            } else {
                this._hangupBtn.button.hide();
            }
        }
    }

    _refreshControlIcons() {
        const sess = callStore.getSession();
        if (this._micBtn) {
            if (sess.micMuted) {
                this._micBtn.icon.source(IMG_MIC_OFF);
                this._micBtn.button.bgColor(CTRL_BG_MUTED);
            } else {
                this._micBtn.icon.source(IMG_MIC_ON);
                this._micBtn.button.bgColor(CTRL_BG);
            }
        }
        if (this._speakerBtn) {
            if (sess.speakerMuted) {
                this._speakerBtn.icon.source(IMG_SPEAKER_OFF);
                this._speakerBtn.button.bgColor(CTRL_BG_MUTED);
            } else {
                this._speakerBtn.icon.source(IMG_SPEAKER_ON);
                this._speakerBtn.button.bgColor(CTRL_BG);
            }
        }
        if (this._hangupBtn) {
            this._hangupBtn.icon.source(IMG_HANGUP);
            this._hangupBtn.button.bgColor(HANGUP_BG);
        }
    }

    _startDuration(startedAt) {
        if (this._durationRunning) {
            return;
        }
        this._durationRunning = true;
        this._durationSec = Math.max(0, Math.floor((Date.now() - Number(startedAt || Date.now())) / 1000));
        this._paintDuration();
        if (this._durationLbl) {
            this._durationLbl.show();
        }
        const self = this;
        const token = ++this._durationToken;
        this.setInterval(function () {
            if (token !== self._durationToken || self._leaving) {
                return;
            }
            self._durationSec += 1;
            self._paintDuration();
        }, 1000);
    }

    _stopDuration() {
        this._durationToken += 1;
        this._durationRunning = false;
        this._durationSec = 0;
        if (this._durationLbl) {
            this._durationLbl.hide();
        }
    }

    _paintDuration() {
        if (!this._durationLbl) {
            return;
        }
        const total = this._durationSec;
        const hours = Math.floor(total / 3600);
        const mins = Math.floor((total % 3600) / 60);
        const secs = total % 60;
        const mm = mins < 10 ? '0' + mins : String(mins);
        const ss = secs < 10 ? '0' + secs : String(secs);
        if (hours > 0) {
            const hh = hours < 10 ? '0' + hours : String(hours);
            this._durationLbl.text(hh + ':' + mm + ':' + ss);
        } else {
            this._durationLbl.text(mm + ':' + ss);
        }
    }

    _toggleMic() {
        const sess = callStore.getSession();
        if (sess.state !== 'active') {
            return;
        }
        const self = this;
        callStore.setMicMuted(!sess.micMuted).catch(function (e) {
            self._statusLbl.text(e && e.message ? e.message : t('call.session.failed'));
        });
    }

    _toggleSpeaker() {
        const sess = callStore.getSession();
        if (sess.state !== 'active') {
            return;
        }
        const self = this;
        callStore.setSpeakerMuted(!sess.speakerMuted).catch(function (e) {
            self._statusLbl.text(e && e.message ? e.message : t('call.session.failed'));
        });
    }

    async _hangupAndBack() {
        if (this._leaving) {
            return;
        }
        this._leaving = true;
        this._stopDuration();
        if (this._statusLbl) {
            this._statusLbl.text(t('call.session.ended'));
        }
        this._setControlsVisible(false, false);
        try {
            await callStore.hangup('ui_hangup');
        } catch (_e) {
            // 页面可以退出，但会话仍由Service等待组件callEnd完成最终释放。
        } finally {
            router.back();
        }
    }
}
