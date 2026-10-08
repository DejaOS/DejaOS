/**
 * @layer    view
 * @module   factory_page
 * @fires    none
 * @listens  none
 * @depends  dxUi,BaseView,router,font,layout,theme,i18n,page_header,assets,factory_menu,setting_pager
 *
 * 工厂测试入口：子项列表，进入各自子页。
 * 横屏：透明分割线行 + 一页 5 条行高。
 */

import dxui from '../../../../dxmodules/dxUi.js';
import BaseView from '../../pages/base_view.js';
import router from '../../router/core.js';
import font from '../../components/font.js';
import layout from '../../components/layout.js';
import pageHeader from '../../components/page_header.js';
import { asset } from '../../utils/assets.js';
import { t } from '../../i18n/index.js';
import { FACTORY_MENU_ITEMS } from '../../pages/factory/factory_menu.js';
import { CONTENT_W } from '../ls_metrics.js';
import {
    SETTING_PAGE_SIZE,
    settingPageRowH,
    attachSettingPager,
    styleSettingRow,
} from '../../components/setting_pager.js';

const IMG_ARROW = asset('keyboard-arrow-right.png');
const ROW_BG_PRESSED = 0xf0f0f0;

export default class FactoryPage extends BaseView {
    constructor() {
        super('settings_factory');
        this._header = null;
        this._listContent = null;
        this._listW = 0;
        this._rowH = 0;
        this._pager = null;
        /** @type {{ label: object, item: object, row: object }[]} */
        this._rows = [];
    }

    onCreate() {
        this.root = dxui.View.build('page_factory', dxui.Utils.LAYER.MAIN);
        this.root.setSize(layout.width, layout.height);
        layout.clearStyle(this.root);
        this.root.bgColor(0xffffff);
        this.root.bgOpa(100);
        this.root.scroll(false);

        this._header = pageHeader.build(this.root, {
            idPrefix: 'factory',
            titleKey: 'settings.menu.factory',
        });
        this._buildList();
    }

    onEnter() {
        this._refreshTexts();
        for (let i = 0; i < this._rows.length; i++) {
            if (this._rows[i].row) {
                this._rows[i].row.bgOpa(0);
            }
        }
        if (this._pager) {
            this._pager.apply();
        }
    }

    _buildList() {
        const self = this;
        const top = pageHeader.contentTop();
        const listH = layout.height - top;
        this._listW = layout.x(CONTENT_W);
        this._rowH = settingPageRowH(listH);
        const listX = Math.round((layout.width - this._listW) / 2);

        const list = dxui.View.build('factory_menu_list', this.root);
        list.setSize(layout.width, listH);
        list.setPos(0, top);
        layout.clearStyle(list);
        list.bgColor(0xffffff);
        list.bgOpa(100);
        list.scroll(false);

        this._listContent = dxui.View.build('factory_menu_content', list);
        layout.clearStyle(this._listContent);
        this._listContent.setSize(this._listW, this._rowH * SETTING_PAGE_SIZE);
        this._listContent.setPos(listX, 0);
        this._listContent.bgOpa(0);
        this._listContent.scroll(false);

        this._rows = [];
        for (let i = 0; i < FACTORY_MENU_ITEMS.length; i++) {
            const item = FACTORY_MENU_ITEMS[i];
            this._rows.push(this._buildRow(item, function () {
                router.navigate(item.route);
            }));
        }

        this._pager = attachSettingPager(this.root, {
            idPrefix: 'factory',
            rowH: this._rowH,
            getRows: function () {
                const out = [];
                for (let i = 0; i < self._rows.length; i++) {
                    out.push(self._rows[i].row);
                }
                return out;
            },
        });
    }

    /**
     * @param {{ id: string, labelKey: string, route: string }} item
     * @param {function(): void} onClick
     * @returns {{ label: object, item: object, row: object }}
     */
    _buildRow(item, onClick) {
        const row = dxui.View.build('factory_menu_row_' + item.id, this._listContent);
        layout.clearStyle(row);
        row.setSize(this._listW, this._rowH);
        row.scroll(false);
        styleSettingRow(row);
        row.clickable(true);
        row.on(dxui.Utils.EVENT.CLICK, onClick);

        row.on(dxui.Utils.ENUM.LV_EVENT_PRESSED, (function (r) {
            return function () {
                r.bgColor(ROW_BG_PRESSED);
                r.bgOpa(100);
            };
        })(row));
        row.on(dxui.Utils.ENUM.LV_EVENT_RELEASED, (function (r) {
            return function () {
                r.bgOpa(0);
            };
        })(row));
        if (dxui.Utils.ENUM.LV_EVENT_PRESS_LOST !== undefined) {
            row.on(dxui.Utils.ENUM.LV_EVENT_PRESS_LOST, (function (r) {
                return function () {
                    r.bgOpa(0);
                };
            })(row));
        }

        const label = dxui.Label.build('factory_menu_lbl_' + item.id, row);
        label.setSize(layout.x(560), layout.y(40));
        label.align(dxui.Utils.ALIGN.LEFT_MID, layout.x(28), 0);
        label.textFont(font.get(layout.fontSize(28)));
        label.textColor(0x333333);
        label.textAlign(dxui.Utils.TEXT_ALIGN.LEFT);
        label.clickable(false);

        const arrow = dxui.Image.build('factory_menu_arrow_' + item.id, row);
        arrow.source(IMG_ARROW);
        arrow.align(dxui.Utils.ALIGN.RIGHT_MID, -layout.x(24), 0);
        arrow.clickable(false);

        return { label: label, item: item, row: row };
    }

    _refreshTexts() {
        if (this._header) {
            this._header.refresh();
        }
        for (let i = 0; i < this._rows.length; i++) {
            const cell = this._rows[i];
            cell.label.text(t(cell.item.labelKey));
            cell.label.textColor(0x333333);
        }
    }
}
