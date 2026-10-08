/**
 * @layer    view
 * @module   system_page
 * @fires    none
 * @listens  none
 * @depends  dxUi,BaseView,router,font,layout,theme,i18n,page_header,assets,popup,confirm,system_menu,system_store
 *
 * 系统设置入口：各大类列表 + 重启 / 恢复默认 / 重置设备。
 */

import dxui from '../../../../dxmodules/dxUi.js';
import BaseView from '../base_view.js';
import router from '../../router/core.js';
import font from '../../components/font.js';
import layout from '../../components/layout.js';
import theme from '../../components/theme.js';
import pageHeader from '../../components/page_header.js';
import popup from '../../components/popup.js';
import confirm from '../../components/confirm.js';
import { asset } from '../../utils/assets.js';
import { t, setLocale } from '../../i18n/index.js';
import { SYSTEM_MENU_ITEMS, SYSTEM_ACTION_ITEMS } from './system_menu.js';
import systemStore from './system_store.js';
import capabilityStore from '../../core/capability_store.js';

const IMG_ARROW = asset('keyboard-arrow-right.png');
const ROW_H = 96;
const ROW_GAP = 12;
/** 列表行默认底色 */
const ROW_BG = 0xffffff;
/** 列表行按下加深色 */
const ROW_BG_PRESSED = 0xe0e0e0;

export default class SystemPage extends BaseView {
    constructor(options) {
        const opts = options || {};
        super(opts.name || 'settings_maintenance');
        this._titleKey = opts.titleKey || 'settings.menu.maintenance';
        this._menuItems = opts.menuItems || SYSTEM_MENU_ITEMS;
        this._actionItems = opts.actionItems || SYSTEM_ACTION_ITEMS;
        this._header = null;
        /** @type {{ label: object, item: object, row: object }[]} */
        this._rows = [];
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
        const self = this;
        const top = pageHeader.contentTop();
        const listH = layout.height - top;

        const list = dxui.View.build(this.name + '_menu_list', this.root);
        list.setSize(layout.width, listH);
        list.setPos(0, top);
        layout.clearStyle(list);
        list.bgColor(0xf5f5f5);
        list.bgOpa(100);
        list.scroll(true);
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

        for (let i = 0; i < this._menuItems.length; i++) {
            const item = this._menuItems[i];
            if (item.requireNfc && !capabilityStore.hasNfc()) continue;
            if (item.requirePwm && !capabilityStore.hasPwmWhite() && !capabilityStore.hasPwmNir()) continue;
            if (item.requireIntercom && !capabilityStore.hasIntercom()) continue;
            this._rows.push(this._buildRow(list, item, function () {
                router.navigate(item.route);
            }, true));
        }

        for (let j = 0; j < this._actionItems.length; j++) {
            const actionItem = this._actionItems[j];
            this._rows.push(this._buildRow(list, actionItem, function () {
                self._onAction(actionItem.action);
            }, true));
        }
    }

    /**
     * @param {object} list
     * @param {{ id: string, labelKey: string }} item
     * @param {function(): void} onClick
     * @param {boolean} showArrow
     * @returns {{ label: object, item: object, row: object }}
     */
    _buildRow(list, item, onClick, showArrow) {
        const row = dxui.View.build(this.name + '_menu_row_' + item.id, list);
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

        const label = dxui.Label.build(this.name + '_menu_lbl_' + item.id, row);
        label.setSize(layout.x(showArrow ? 560 : 640), layout.y(48));
        label.align(dxui.Utils.ALIGN.LEFT_MID, layout.x(28), 0);
        label.text(t(item.labelKey));
        label.textFont(font.get(layout.fontSize(28)));
        label.textColor(theme.textPrimary);
        label.textAlign(dxui.Utils.TEXT_ALIGN.LEFT);
        label.longMode(dxui.Utils.LABEL_LONG_MODE.CLIP);
        label.clickable(false);

        if (showArrow) {
            const arrow = dxui.Image.build(this.name + '_menu_arrow_' + item.id, row);
            arrow.source(IMG_ARROW);
            arrow.align(dxui.Utils.ALIGN.RIGHT_MID, -layout.x(24), 0);
            arrow.clickable(false);
        }

        return { label: label, item: item, row: row };
    }

    /**
     * @param {'reboot'|'restoreDefaults'|'resetDevice'} action
     */
    _onAction(action) {
        const self = this;
        const prefix = 'system.action.' + action;
        confirm.show({
            title: t(prefix + '.title'),
            message: t(prefix + '.message'),
            confirmText: t(prefix + '.confirm'),
            cancelText: t('system.action.cancel'),
            onConfirm: function () {
                self._runAction(action);
            },
        });
    }

    /**
     * @param {'reboot'|'restoreDefaults'|'resetDevice'} action
     */
    async _runAction(action) {
        if (action === 'reboot') {
            const result = await systemStore.reboot();
            if (!result.ok) {
                popup.showError(t('system.action.reboot.fail'));
                return;
            }
            popup.showSuccess(t('system.action.reboot.success'));
            return;
        }
        if (action === 'restoreDefaults') {
            const result = await systemStore.restoreDefaults();
            if (!result.ok) {
                popup.showError(result.message || t('system.action.restoreDefaults.fail'));
                return;
            }
            setLocale(systemStore.getConfig().language);
            if (this._header) {
                this._header.refresh();
            }
            this._refreshTexts();
            popup.showSuccess(t('system.action.restoreDefaults.success'));
            return;
        }
        if (action === 'resetDevice') {
            const result = await systemStore.resetDevice();
            if (!result.ok) {
                popup.showError(t('system.action.resetDevice.fail'));
                return;
            }
            setLocale(systemStore.getConfig().language);
            if (this._header) {
                this._header.refresh();
            }
            this._refreshTexts();
            popup.showSuccess(t('system.action.resetDevice.success'));
        }
    }

    _refreshTexts() {
        if (this._header) {
            this._header.refresh();
        }
        const rowFont = font.get(layout.fontSize(28));
        for (let i = 0; i < this._rows.length; i++) {
            const cell = this._rows[i];
            cell.label.text(t(cell.item.labelKey));
            cell.label.textFont(rowFont);
            if (cell.item.id === 'resetDevice') {
                cell.label.textColor(theme.errorText);
            } else {
                cell.label.textColor(theme.textPrimary);
            }
        }
    }
}
