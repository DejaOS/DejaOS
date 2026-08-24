/**
 * @layer    view
 * @module   help_page
 * @fires    none
 * @listens  none
 * @depends  dxUi,BaseView,font,layout,theme,page_header,i18n
 *
 * 使用帮助：居中展示官方教程二维码与提示文案。
 */

import dxui from '../../../../dxmodules/dxUi.js';
import BaseView from '../base_view.js';
import font from '../../components/font.js';
import layout from '../../components/layout.js';
import theme from '../../components/theme.js';
import pageHeader from '../../components/page_header.js';
import { t } from '../../i18n/index.js';

/** 官方教程地址（二维码内容） */
const HELP_URL = 'https://dejaos.com/';
/** 二维码边长（设计稿） */
const QR_SIDE = 360;

export default class HelpPage extends BaseView {
    constructor() {
        super('settings_help');
        this._header = null;
        /** @type {object|null} */
        this._qrNative = null;
        /** @type {object|null} */
        this._hintLbl = null;
        /** @type {boolean} */
        this._qrFilled = false;
    }

    onCreate() {
        this.root = dxui.View.build('page_help', dxui.Utils.LAYER.MAIN);
        this.root.setSize(layout.width, layout.height);
        layout.clearStyle(this.root);
        this.root.bgColor(theme.pageBg);
        this.root.bgOpa(100);
        this.root.scroll(false);

        this._header = pageHeader.build(this.root, {
            idPrefix: 'help',
            titleKey: 'settings.menu.help',
        });
        this._buildBody();
    }

    onEnter() {
        if (this._header) {
            this._header.refresh();
        }
        if (this._hintLbl) {
            this._hintLbl.text(t('help.scanHint'));
        }
        if (this._qrNative && !this._qrFilled) {
            dxui.Utils.GG.NativeBasicComponent.lvQrcodeUpdate(this._qrNative, HELP_URL);
            this._qrFilled = true;
        }
    }

    _buildBody() {
        const top = pageHeader.contentTop();
        const contentH = layout.height - top;
        const qrSide = layout.x(QR_SIDE);
        const pad = layout.y(48);
        const hintH = layout.y(48);
        const panelH = qrSide + pad * 2 + hintH + layout.y(20);

        const content = dxui.View.build('help_content', this.root);
        content.setSize(layout.width, contentH);
        content.setPos(0, top);
        layout.clearStyle(content);
        content.bgColor(0xf5f5f5);
        content.bgOpa(100);
        content.scroll(false);

        const panel = dxui.View.build('help_qr_panel', content);
        layout.clearStyle(panel);
        panel.setSize(layout.x(720), panelH);
        panel.align(dxui.Utils.ALIGN.CENTER, 0, 0);
        panel.bgColor(theme.pageBg);
        panel.bgOpa(100);
        panel.radius(layout.x(14));
        panel.scroll(false);
        panel.clickable(false);

        const qrBox = dxui.View.build('help_qr_box', panel);
        layout.clearStyle(qrBox);
        qrBox.setSize(qrSide, qrSide);
        qrBox.align(dxui.Utils.ALIGN.TOP_MID, 0, pad);
        qrBox.bgOpa(0);

        this._qrNative = dxui.Utils.GG.NativeBasicComponent.lvQrcodeCreate(
            qrBox.obj,
            qrSide,
            0x000000,
            0xffffff
        );

        this._hintLbl = dxui.Label.build('help_qr_hint', panel);
        this._hintLbl.setSize(layout.x(680), hintH);
        this._hintLbl.align(dxui.Utils.ALIGN.BOTTOM_MID, 0, -layout.y(24));
        this._hintLbl.textFont(font.get(layout.fontSize(26)));
        this._hintLbl.textColor(theme.textSecondary);
        this._hintLbl.textAlign(dxui.Utils.TEXT_ALIGN.CENTER);
    }
}
