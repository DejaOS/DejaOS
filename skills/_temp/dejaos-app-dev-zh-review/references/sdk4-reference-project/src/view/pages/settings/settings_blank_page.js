/**
 * @layer    view
 * @module   settings_blank_page
 * @fires    none
 * @listens  none
 * @depends  dxUi,BaseView,layout,theme,page_header
 *
 * 设置子页占位：仅标题栏（返回 + 标题），内容区空白，后续再填业务。
 */

import dxui from '../../../../dxmodules/dxUi.js';
import BaseView from '../base_view.js';
import layout from '../../components/layout.js';
import theme from '../../components/theme.js';
import pageHeader from '../../components/page_header.js';

export default class SettingsBlankPage extends BaseView {
    /**
     * @param {string} name 路由名，如 settings_localUser
     * @param {string} titleKey i18n key
     */
    constructor(name, titleKey) {
        super(name);
        this._titleKey = titleKey;
        this._header = null;
    }

    onCreate() {
        this.root = dxui.View.build('page_' + this.name, dxui.Utils.LAYER.MAIN);
        this.root.setSize(layout.width, layout.height);
        layout.clearStyle(this.root);
        this.root.bgColor(theme.pageBg);
        this.root.bgOpa(100);
        this.root.scroll(false);

        this._header = pageHeader.build(this.root, {
            idPrefix: this.name,
            titleKey: this._titleKey,
        });
    }

    onEnter() {
        if (this._header) {
            this._header.refresh();
        }
    }
}
