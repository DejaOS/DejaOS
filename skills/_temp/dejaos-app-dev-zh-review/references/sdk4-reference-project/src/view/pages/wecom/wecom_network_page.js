/**
 * @layer    view
 * @module   wecom_network_page
 * @fires    none
 * @listens  none
 * @depends  dxUi,BaseView,router,font,layout,theme,assets,i18n,wecom_footer,wecom_store
 *
 * 企微网络引导页：提示先联网；「网络配置」进入网络设置。
 * 联网检测与自动跳转由 wecom_store 承接。
 */

import dxui from '../../../../dxmodules/dxUi.js';
import BaseView from '../base_view.js';
import router from '../../router/core.js';
import font from '../../components/font.js';
import layout from '../../components/layout.js';
import theme from '../../components/theme.js';
import { asset } from '../../utils/assets.js';
import { t } from '../../i18n/index.js';
import { buildWecomFooter, applyWecomPanelStatus } from './wecom_footer.js';
import wecomStore from './wecom_store.js';

const IMG_NETWORK = asset('1x/network.png');

export default class WecomNetworkPage extends BaseView {
    constructor() {
        super('wecom_network');
        /** @type {object|null} */
        this._titleLbl = null;
        /** @type {object|null} */
        this._hintLbl = null;
        /** @type {object|null} */
        this._btnLbl = null;
        /** @type {{ setStatus: Function, paint: Function }|null} */
        this._footer = null;
        this._status = { sn: '', ip: '' };
    }

    onCreate() {
        this.root = dxui.View.build('page_wecom_network', dxui.Utils.LAYER.MAIN);
        this.root.setSize(layout.width, layout.height);
        layout.clearStyle(this.root);
        this.root.bgColor(theme.pageBg);
        this.root.bgOpa(100);
        this.root.scroll(false);

        this._footer = buildWecomFooter(this.root, 'wecom_network');
        this._footer.setStatus(this._status);
        const footerH = this._footer.height();

        const content = dxui.View.build('wecom_network_content', this.root);
        content.setSize(layout.width, layout.height - footerH);
        content.setPos(0, 0);
        layout.clearStyle(content);
        content.bgOpa(0);
        content.scroll(false);

        const iconBox = dxui.View.build('wecom_network_icon_box', content);
        layout.clearStyle(iconBox);
        iconBox.setSize(layout.x(160), layout.y(160));
        iconBox.align(dxui.Utils.ALIGN.TOP_MID, 0, layout.y(280));
        iconBox.bgColor(theme.actionBg);
        iconBox.bgOpa(100);
        iconBox.radius(layout.x(80));
        iconBox.scroll(false);
        iconBox.clickable(false);

        const icon = dxui.Image.build('wecom_network_icon', iconBox);
        icon.source(IMG_NETWORK);
        icon.align(dxui.Utils.ALIGN.CENTER, 0, 0);
        icon.clickable(false);

        this._titleLbl = dxui.Label.build('wecom_network_title', content);
        this._titleLbl.setSize(layout.x(680), layout.y(56));
        this._titleLbl.align(dxui.Utils.ALIGN.TOP_MID, 0, layout.y(480));
        this._titleLbl.textFont(font.get(layout.fontSize(36), dxui.Utils.FONT_STYLE.BOLD));
        this._titleLbl.textColor(theme.textPrimary);
        this._titleLbl.textAlign(dxui.Utils.TEXT_ALIGN.CENTER);

        this._hintLbl = dxui.Label.build('wecom_network_hint', content);
        this._hintLbl.setSize(layout.x(640), layout.y(80));
        this._hintLbl.align(dxui.Utils.ALIGN.TOP_MID, 0, layout.y(550));
        this._hintLbl.textFont(font.get(layout.fontSize(24)));
        this._hintLbl.textColor(theme.textSecondary);
        this._hintLbl.textAlign(dxui.Utils.TEXT_ALIGN.CENTER);
        this._hintLbl.longMode(dxui.Utils.LABEL_LONG_MODE.WRAP);

        const btn = dxui.Button.build('wecom_network_cfg_btn', content);
        btn.setSize(layout.x(520), layout.y(100));
        btn.align(dxui.Utils.ALIGN.BOTTOM_MID, 0, -layout.y(100));
        btn.bgColor(theme.activeBg);
        btn.radius(layout.x(16));
        btn.borderWidth(0);
        btn.on(dxui.Utils.EVENT.CLICK, function () {
            router.navigate('settings_network');
        });

        this._btnLbl = dxui.Label.build('wecom_network_cfg_lbl', btn);
        this._btnLbl.textFont(font.get(layout.fontSize(28)));
        this._btnLbl.textColor(theme.textOnDark);
        this._btnLbl.align(dxui.Utils.ALIGN.CENTER, 0, 0);
    }

    async onEnter(context) {
        this._refreshLabels();
        if (this._footer) {
            this._footer.setStatus(this._status);
        }
        const result = await wecomStore.ensureActivated((context && context.params) || {});
        if (!result.ok) {
            this.setHint(result.error || t('wecom.network.hint'));
            return;
        }
        wecomStore.startNetworkGuide(this);
    }

    onExit() {
        wecomStore.stopNetworkGuide();
    }

    /**
     * ui_driver 推送底栏 SN/IP。
     * @param {{ sn?: string, ip?: string }} partial
     */
    applyStatus(partial) {
        return applyWecomPanelStatus(this, partial);
    }

    /** @param {string} text */
    setHint(text) {
        if (this._hintLbl) {
            this._hintLbl.text(text || '');
        }
    }

    _refreshLabels() {
        if (this._titleLbl) {
            this._titleLbl.text(t('wecom.network.title'));
        }
        if (this._hintLbl) {
            this._hintLbl.text(t('wecom.network.hint'));
        }
        if (this._btnLbl) {
            this._btnLbl.text(t('wecom.network.config'));
        }
    }
}
