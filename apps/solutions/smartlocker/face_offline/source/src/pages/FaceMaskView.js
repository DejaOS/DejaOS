import dxui from '../../dxmodules/dxUi.js';
import dxDriver from '../../dxmodules/dxDriver.js';
import bus from '../../dxmodules/dxEventBus.js';
import dxStd from '../../dxmodules/dxStd.js';
import log from '../../dxmodules/dxLogger.js';
import UIManager from '../pages/UIManager.js';
import { COLORS } from '../constants.js';

const ICONS = {
    circleMask: '/app/code/resource/image/mask_circle.png',
    success: '/app/code/resource/image/icon_success.png',
    error: '/app/code/resource/image/icon_error.png',
    warn: '/app/code/resource/image/icon_warn.png',
    info: '/app/code/resource/image/icon_info.png',
};

const FaceMaskView = {
    id: 'face_mask_view',
    _visible: false,
    _timer: null,
    _countdownInterval: null,
    _onExit: null,
    _countdown: 0,

    init: function () {
        // Fonts (use UIManager cache)
        this._fontTitle = UIManager.font(48, dxui.Utils.FONT_STYLE.BOLD);
        this._fontCountdown = UIManager.font(32, dxui.Utils.FONT_STYLE.BOLD);
        this._fontButton = UIManager.font(28, dxui.Utils.FONT_STYLE.BOLD);
        this._fontHint = UIManager.font(32, dxui.Utils.FONT_STYLE.BOLD);

        // Mask on top layer (visible even when UIManager root is hidden)
        this.root = dxui.View.build(this.id + '_root', dxui.Utils.LAYER.TOP);
        this.root.setSize(dxDriver.DISPLAY.WIDTH, dxDriver.DISPLAY.HEIGHT);
        this.root.setPos(0, 0);
        this.root.bgOpa(0);
        this.root.radius(0);
        this.root.borderWidth(0);
        this.root.padAll(0);
        this.root.scroll(false);
        this.root.hide();

        this.img = dxui.Image.build(this.id + '_img', this.root);
        this.img.source(ICONS.circleMask);
        this.img.setSize(dxDriver.DISPLAY.WIDTH, dxDriver.DISPLAY.HEIGHT);
        this.img.setPos(0, 0);

        // Title: face recognition
        this.titleLabel = dxui.Label.build(this.id + '_title', this.root);
        this.titleLabel.text('Face Recognition');
        this.titleLabel.textFont(this._fontTitle);
        this.titleLabel.textColor(COLORS.white);
        this.titleLabel.align(dxui.Utils.ALIGN.TOP_MID, 0, 60);

        // Countdown
        this.countdownLabel = dxui.Label.build(this.id + '_countdown', this.root);
        this.countdownLabel.text('');
        this.countdownLabel.textFont(this._fontCountdown);
        this.countdownLabel.textColor(COLORS.warning);
        this.countdownLabel.align(dxui.Utils.ALIGN.TOP_MID, 0, 120);

        // Center hint container (hidden by default)
        this.hintContainer = dxui.View.build(this.id + '_hint_cont', this.root);
        this.hintContainer.setSize(600, 80);
        this.hintContainer.bgOpa(0);
        this.hintContainer.radius(0);
        this.hintContainer.borderWidth(0);
        this.hintContainer.align(dxui.Utils.ALIGN.BOTTOM_MID, 0, -340);
        this.hintContainer.scroll(false);
        this.hintContainer.hide();

        this.hintIcon = dxui.Image.build(this.id + '_hint_icon', this.hintContainer);
        this.hintIcon.setSize(64, 64);
        this.hintIcon.align(dxui.Utils.ALIGN.LEFT_MID, 0, 0);

        this.hintLabel = dxui.Label.build(this.id + '_hint_label', this.hintContainer);
        this.hintLabel.text('');
        this.hintLabel.textFont(this._fontHint);
        this.hintLabel.textAlign(dxui.Utils.TEXT_ALIGN.CENTER);
        this.hintLabel.textColor(COLORS.white);
        this.hintLabel.align(dxui.Utils.ALIGN.LEFT_MID, 80, 0);

        // Cancel button
        this.cancelBtn = dxui.Button.build(this.id + '_cancel', this.root);
        this.cancelBtn.setSize(200, 80);
        this.cancelBtn.bgColor(COLORS.danger);
        this.cancelBtn.radius(40);
        this.cancelBtn.align(dxui.Utils.ALIGN.BOTTOM_MID, 0, -180);

        this.cancelLabel = dxui.Label.build(this.id + '_cancel_label', this.cancelBtn);
        this.cancelLabel.text('Cancel');
        this.cancelLabel.textFont(this._fontButton);
        this.cancelLabel.textColor(COLORS.white);
        this.cancelLabel.align(dxui.Utils.ALIGN.CENTER, 0, 0);

        // Cancel to exit
        this.cancelBtn.on(dxui.Utils.EVENT.CLICK, () => {
            if (this._onExit) {
                this._onExit(true);
            }
        });

        return this.root;
    },

    start: function (onExit) {
        this._onExit = onExit;
        this.clearHint();
        this.show();
    },

    setHint: function (type, text) {
        if (!this.hintContainer) return;

        let icon = ICONS.warn;
        let color = COLORS.white;

        if (type === 'success') {
            icon = ICONS.success;
            color = COLORS.success;
        } else if (type === 'error') {
            icon = ICONS.error;
            color = COLORS.danger;
        } else if (type === 'warn') {
            icon = ICONS.warn;
            color = COLORS.warning;
        }else if (type === 'info') {
            icon = ICONS.info;
            color = COLORS.white;
        }

        this.hintIcon.source(icon);
        this.hintLabel.text(text);
        this.hintLabel.textColor(color);
        this.hintContainer.show();
    },

    clearHint: function () {
        if (this.hintContainer) {
            this.hintContainer.hide();
        }
    },

    show: function (timeoutMs = 30000) {
        if (this._visible) return;
        this._visible = true;

        if (this.root) this.root.show();

        this._countdown = Math.floor(timeoutMs / 1000);
        this._updateCountdownText();

        if (this._timer) {
            dxStd.clearTimeout(this._timer);
        }
        if (this._countdownInterval) {
            dxStd.clearInterval(this._countdownInterval);
        }

        if (timeoutMs > 0) {
            this._timer = dxStd.setTimeout(() => {
                if (this._onExit) {
                    this._onExit(true);
                }
            }, timeoutMs);

            this._countdownInterval = dxStd.setInterval(() => {
                this._countdown--;
                if (this._countdown < 0) {
                    dxStd.clearInterval(this._countdownInterval);
                    this._countdownInterval = null;
                } else {
                    this._updateCountdownText();
                }
            }, 1000);
        }
    },

    _updateCountdownText: function () {
        if (this.countdownLabel) {
            this.countdownLabel.text(this._countdown + 's');
        }
    },

    hide: function () {
        if (!this._visible) return;
        this._visible = false;

        if (this._timer) {
            dxStd.clearTimeout(this._timer);
            this._timer = null;
        }
        if (this._countdownInterval) {
            dxStd.clearInterval(this._countdownInterval);
            this._countdownInterval = null;
        }

        if (this.root) this.root.hide();
    },

    isVisible: function () {
        return this._visible;
    }
};

export default FaceMaskView;
