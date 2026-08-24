/**
 * @layer    view
 * @module   factory_page
 * @fires    none
 * @listens  none
 * @depends  dxUi,BaseView,router,font,layout,theme,i18n,page_header,assets,factory_menu
 *
 * 工厂测试入口：子项列表，进入各自子页。
 */

import dxui from '../../../../dxmodules/dxUi.js';
import BaseView from '../base_view.js';
import router from '../../router/core.js';
import font from '../../components/font.js';
import layout from '../../components/layout.js';
import theme from '../../components/theme.js';
import pageHeader from '../../components/page_header.js';
import { asset } from '../../utils/assets.js';
import { t } from '../../i18n/index.js';
import { FACTORY_MENU_ITEMS } from './factory_menu.js';

const IMG_ARROW = asset('1x/keyboard-arrow-right.png');
const ROW_H = 96;
const ROW_GAP = 12;
const ROW_BG = 0xffffff;
const ROW_BG_PRESSED = 0xe0e0e0;

export default class FactoryPage extends BaseView {
    constructor() {
        super('settings_factory');
        this._header = null;
        /** @type {{ label: object, item: object, row: object }[]} */
        this._rows = [];
    }

    onCreate() {
        this.root = dxui.View.build('page_factory', dxui.Utils.LAYER.MAIN);
        this.root.setSize(layout.width, layout.height);
        layout.clearStyle(this.root);
        this.root.bgColor(theme.pageBg);
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
            const cell = this._rows[i];
            if (cell.row) {
                cell.row.bgColor(ROW_BG);
            }
        }
    }

    _buildList() {
        const top = pageHeader.contentTop();
        const listH = layout.height - top;

        const list = dxui.View.build('factory_menu_list', this.root);
        list.setSize(layout.width, listH);
        list.setPos(0, top);
        layout.clearStyle(list);
        list.bgColor(0xf5f5f5);
        list.bgOpa(100);
        list.scroll(false);
        list.flexFlow(dxui.Utils.FLEX_FLOW.COLUMN);
        list.flexAlign(
            dxui.Utils.FLEX_ALIGN.START,
            dxui.Utils.FLEX_ALIGN.CENTER,
            dxui.Utils.FLEX_ALIGN.CENTER
        );
        list.padTop(layout.y(16));
        list.padBottom(layout.y(24));
        list.obj.lvObjSetStylePadGap(
            layout.y(ROW_GAP),
            dxui.Utils.ENUM._LV_STYLE_STATE_CMP_SAME
        );

        this._rows = [];
        for (let i = 0; i < FACTORY_MENU_ITEMS.length; i++) {
            const item = FACTORY_MENU_ITEMS[i];
            this._rows.push(this._buildRow(list, item, function () {
                router.navigate(item.route);
            }));
        }
    }

    /**
     * @param {object} list
     * @param {{ id: string, labelKey: string, route: string }} item
     * @param {function(): void} onClick
     * @returns {{ label: object, item: object, row: object }}
     */
    _buildRow(list, item, onClick) {
        const row = dxui.View.build('factory_menu_row_' + item.id, list);
        layout.clearStyle(row);
        row.setSize(layout.x(720), layout.y(ROW_H));
        row.bgColor(ROW_BG);
        row.bgColor(ROW_BG_PRESSED, dxui.Utils.STATE.PRESSED);
        row.bgOpa(100);
        row.radius(layout.x(14));
        row.scroll(false);
        row.clickable(true);
        row.on(dxui.Utils.EVENT.CLICK, onClick);

        row.on(dxui.Utils.ENUM.LV_EVENT_PRESSED, (function (r) {
            return function () {
                r.bgColor(ROW_BG_PRESSED);
            };
        })(row));
        row.on(dxui.Utils.ENUM.LV_EVENT_RELEASED, (function (r) {
            return function () {
                r.bgColor(ROW_BG);
            };
        })(row));
        if (dxui.Utils.ENUM.LV_EVENT_PRESS_LOST !== undefined) {
            row.on(dxui.Utils.ENUM.LV_EVENT_PRESS_LOST, (function (r) {
                return function () {
                    r.bgColor(ROW_BG);
                };
            })(row));
        }

        const label = dxui.Label.build('factory_menu_lbl_' + item.id, row);
        label.setSize(layout.x(560), layout.y(40));
        label.align(dxui.Utils.ALIGN.LEFT_MID, layout.x(28), 0);
        label.textFont(font.get(layout.fontSize(28)));
        label.textColor(theme.textPrimary);
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
            cell.label.textColor(theme.textPrimary);
        }
    }
}
