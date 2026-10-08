/**
 * @layer    view
 * @module   system_page
 * @fires    none
 * @listens  none
 * @depends  dxUi,BaseView,router,font,layout,theme,i18n,page_header,assets,popup,confirm,system_menu,system_store
 *
 * 系统设置入口：各大类列表 + 重启 / 恢复默认 / 重置设备。
 * 横屏：一页固定 5 条占位，超出上下翻页。
 */

import dxui from '../../../../dxmodules/dxUi.js';
import BaseView from '../../pages/base_view.js';
import router from '../../router/core.js';
import font from '../../components/font.js';
import layout from '../../components/layout.js';
import theme from '../../components/theme.js';
import pageHeader from '../../components/page_header.js';
import popup from '../../components/popup.js';
import confirm from '../../components/confirm.js';
import { asset } from '../../utils/assets.js';
import { t, setLocale } from '../../i18n/index.js';
import { SYSTEM_MENU_ITEMS, SYSTEM_ACTION_ITEMS } from '../../pages/system/system_menu.js';
import systemStore from '../../pages/system/system_store.js';
import capabilityStore from '../../core/capability_store.js';
import { CONTENT_W } from '../ls_metrics.js';
import {
    SETTING_PAGE_SIZE,
    settingPageRowH,
    attachSettingPager,
    styleSettingRow,
} from '../../components/setting_pager.js';

const IMG_ARROW = asset('keyboard-arrow-right.png');
/** 按下时略加深（行本身透明底 + 底部分割线） */
const ROW_BG_PRESSED = 0xf0f0f0;

export default class SystemPage extends BaseView {
    constructor(options) {
        const opts = options || {};
        super(opts.name || 'settings_maintenance');
        this._titleKey = opts.titleKey || 'settings.menu.maintenance';
        this._menuItems = opts.menuItems || SYSTEM_MENU_ITEMS;
        this._actionItems = opts.actionItems || SYSTEM_ACTION_ITEMS;
        this._header = null;
        this._listContent = null;
        this._listW = 0;
        this._rowH = 0;
        this._pager = null;
        /** @type {{ label: object, item: object, row: object }[]} */
        this._rows = [];
    }

    onCreate() {
        this.root = dxui.View.build('page_' + this.name, dxui.Utils.LAYER.MAIN);
        this.root.setSize(layout.width, layout.height);
        layout.clearStyle(this.root);
        this.root.bgColor(0xffffff);
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
                cell.row.bgOpa(0);
            }
        }
        if (this._pager) {
            this._pager.apply();
        }
    }

    onExit() {
        confirm.hide();
    }

    _buildList() {
        const self = this;
        const top = pageHeader.contentTop();
        const listH = layout.height - top;
        this._listW = layout.x(CONTENT_W);
        this._rowH = settingPageRowH(listH);
        const listX = Math.round((layout.width - this._listW) / 2);

        const list = dxui.View.build(this.name + '_menu_list', this.root);
        list.setSize(layout.width, listH);
        list.setPos(0, top);
        layout.clearStyle(list);
        list.bgColor(0xffffff);
        list.bgOpa(100);
        list.scroll(false);

        this._listContent = dxui.View.build(this.name + '_menu_content', list);
        layout.clearStyle(this._listContent);
        this._listContent.setSize(this._listW, this._rowH * SETTING_PAGE_SIZE);
        this._listContent.setPos(listX, 0);
        this._listContent.bgOpa(0);
        this._listContent.scroll(false);

        this._rows = [];
        for (let i = 0; i < this._menuItems.length; i++) {
            const item = this._menuItems[i];
            if (item.requireNfc && !capabilityStore.hasNfc()) continue;
            if (item.requirePwm && !capabilityStore.hasPwmWhite() && !capabilityStore.hasPwmNir()) continue;
            if (item.requireIntercom && !capabilityStore.hasIntercom()) continue;
            this._rows.push(this._buildRow(item, function () {
                router.navigate(item.route);
            }, true));
        }

        for (let j = 0; j < this._actionItems.length; j++) {
            const actionItem = this._actionItems[j];
            this._rows.push(this._buildRow(actionItem, function () {
                self._onAction(actionItem.action);
            }, true));
        }

        this._pager = attachSettingPager(this.root, {
            idPrefix: this.name,
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
     * @param {{ id: string, labelKey: string }} item
     * @param {function(): void} onClick
     * @param {boolean} showArrow
     * @returns {{ label: object, item: object, row: object }}
     */
    _buildRow(item, onClick, showArrow) {
        const row = dxui.View.build(this.name + '_menu_row_' + item.id, this._listContent);
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
