/**
 * @layer    view
 * @module   wecom_bind_page
 * @fires    none
 * @listens  none
 * @depends  dxUi,BaseView,font,layout,theme,i18n,wecom_footer,wecom_store
 *
 * 企微绑定页：居中展示绑定二维码与扫码提示，底栏 SN/IP。
 * MQTT 拉码与跳转由 wecom_store 承接。
 */

import dxui from '../../../../dxmodules/dxUi.js';
import BaseView from '../../pages/base_view.js';
import font from '../../components/font.js';
import layout from '../../components/layout.js';
import theme from '../../components/theme.js';
import { t } from '../../i18n/index.js';
import { buildWecomFooter, applyWecomPanelStatus } from './wecom_footer.js';
import wecomStore from '../../pages/wecom/wecom_store.js';

/** UI 占位二维码内容；真实绑定码由业务注入后 update */
const PLACEHOLDER_QR = 'wecom-bind-placeholder';
/** 二维码边长（设计稿）；横屏可扫、又压得住 720 高 */
const QR_SIDE = 320;
/** 标题高度 */
const TITLE_H = 40;
/** 扫码提示高度 */
const HINT_H = 56;
/** 标题 / 码 / 提示之间的间距 */
const STACK_GAP = 20;
/** 二维码白底内边距 */
const PANEL_PAD = 24;

export default class WecomBindPage extends BaseView {
    constructor() {
        super('wecom_bind');
        /** @type {object|null} */
        this._titleLbl = null;
        /** @type {object|null} */
        this._hintLbl = null;
        /** @type {object|null} */
        this._loadingLbl = null;
        /** @type {object|null} */
        this._qrBox = null;
        /** @type {object|null} */
        this._qrNative = null;
        /** @type {{ setStatus: Function, paint: Function }|null} */
        this._footer = null;
        /** @type {string} */
        this._qrContent = PLACEHOLDER_QR;
        /** @type {boolean} */
        this._qrReady = false;
        this._status = { sn: '', ip: '' };
    }

    onCreate() {
        this.root = dxui.View.build('page_wecom_bind', dxui.Utils.LAYER.MAIN);
        this.root.setSize(layout.width, layout.height);
        layout.clearStyle(this.root);
        this.root.bgColor(theme.pageBg);
        this.root.bgOpa(100);
        this.root.scroll(false);

        this._footer = buildWecomFooter(this.root, 'wecom_bind');
        this._footer.setStatus(this._status);
        const footerH = this._footer.height();

        const content = dxui.View.build('wecom_bind_content', this.root);
        content.setSize(layout.width, layout.height - footerH);
        content.setPos(0, 0);
        layout.clearStyle(content);
        content.bgColor(0xf5f5f5);
        content.bgOpa(100);
        content.scroll(false);
        content.clickable(false);

        const qrSide = layout.x(QR_SIDE);
        const panelPad = layout.y(PANEL_PAD);
        const panelH = qrSide + panelPad * 2;
        const panelW = qrSide + layout.x(PANEL_PAD * 2);
        const titleH = layout.y(TITLE_H);
        const hintH = layout.y(HINT_H);
        const gap = layout.y(STACK_GAP);
        const stackH = titleH + gap + panelH + gap + hintH;

        const stack = dxui.View.build('wecom_bind_stack', content);
        layout.clearStyle(stack);
        stack.setSize(layout.width, stackH);
        stack.align(dxui.Utils.ALIGN.CENTER, 0, 0);
        stack.bgOpa(0);
        stack.scroll(false);
        stack.clickable(false);

        this._titleLbl = dxui.Label.build('wecom_bind_title', stack);
        this._titleLbl.setSize(layout.x(900), titleH);
        this._titleLbl.align(dxui.Utils.ALIGN.TOP_MID, 0, 0);
        this._titleLbl.textFont(font.get(layout.fontSize(28), dxui.Utils.FONT_STYLE.BOLD));
        this._titleLbl.textColor(theme.textPrimary);
        this._titleLbl.textAlign(dxui.Utils.TEXT_ALIGN.CENTER);

        const panel = dxui.View.build('wecom_bind_qr_panel', stack);
        layout.clearStyle(panel);
        panel.setSize(panelW, panelH);
        panel.align(dxui.Utils.ALIGN.TOP_MID, 0, titleH + gap);
        panel.bgColor(theme.pageBg);
        panel.bgOpa(100);
        panel.radius(layout.x(14));
        panel.scroll(false);
        panel.clickable(false);

        this._qrBox = dxui.View.build('wecom_bind_qr_box', panel);
        layout.clearStyle(this._qrBox);
        this._qrBox.setSize(qrSide, qrSide);
        this._qrBox.align(dxui.Utils.ALIGN.CENTER, 0, 0);
        this._qrBox.bgOpa(0);

        this._qrNative = dxui.Utils.GG.NativeBasicComponent.lvQrcodeCreate(
            this._qrBox.obj,
            qrSide,
            0x000000,
            0xffffff
        );

        this._loadingLbl = dxui.Label.build('wecom_bind_loading', panel);
        this._loadingLbl.setSize(layout.x(400), layout.y(40));
        this._loadingLbl.align(dxui.Utils.ALIGN.CENTER, 0, 0);
        this._loadingLbl.textFont(font.get(layout.fontSize(22)));
        this._loadingLbl.textColor(theme.textSecondary);
        this._loadingLbl.textAlign(dxui.Utils.TEXT_ALIGN.CENTER);
        this._loadingLbl.hide();

        this._hintLbl = dxui.Label.build('wecom_bind_hint', stack);
        this._hintLbl.setSize(layout.x(800), hintH);
        this._hintLbl.align(dxui.Utils.ALIGN.TOP_MID, 0, titleH + gap + panelH + gap);
        this._hintLbl.textFont(font.get(layout.fontSize(22)));
        this._hintLbl.textColor(theme.textSecondary);
        this._hintLbl.textAlign(dxui.Utils.TEXT_ALIGN.CENTER);
        this._hintLbl.longMode(dxui.Utils.LABEL_LONG_MODE.WRAP);
    }

    onEnter() {
        this._refreshLabels();
        if (this._footer) {
            this._footer.setStatus(this._status);
        }
        this.showLoading();
        wecomStore.startBindGuide(this);
    }

    onExit() {
        this._qrReady = false;
        wecomStore.stopBindGuide();
    }

    /**
     * ui_driver 推送底栏 SN/IP。
     * @param {{ sn?: string, ip?: string }} partial
     */
    applyStatus(partial) {
        return applyWecomPanelStatus(this, partial);
    }

    /**
     * 展示加载态（业务拉码前可调用）。
     */
    showLoading() {
        this._qrReady = false;
        if (this._qrBox) {
            this._qrBox.hide();
        }
        if (this._loadingLbl) {
            this._loadingLbl.text(t('wecom.bind.loading'));
            this._loadingLbl.show();
        }
    }

    /**
     * 更新并展示绑定二维码内容。
     * @param {string} content
     */
    showQr(content) {
        const text = typeof content === 'string' && content.length > 0
            ? content
            : PLACEHOLDER_QR;
        this._qrContent = text;
        if (this._loadingLbl) {
            this._loadingLbl.hide();
        }
        if (this._qrBox) {
            this._qrBox.show();
        }
        if (this._qrNative) {
            dxui.Utils.GG.NativeBasicComponent.lvQrcodeUpdate(this._qrNative, text);
            this._qrReady = true;
        }
    }

    _refreshLabels() {
        if (this._titleLbl) {
            this._titleLbl.text(t('wecom.bind.title'));
        }
        if (this._hintLbl) {
            this._hintLbl.text(t('wecom.bind.hint'));
        }
        if (this._loadingLbl) {
            this._loadingLbl.text(t('wecom.bind.loading'));
        }
    }
}
