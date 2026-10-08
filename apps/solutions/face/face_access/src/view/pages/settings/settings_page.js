/**
 * @layer    view
 * @module   settings_page
 * @fires    none
 * @listens  none
 * @depends  dxUi,BaseView,router,font,layout,theme,i18n,page_header,confirm,settings_menu
 *
 * 设置菜单页：由身份验证成功后进入。
 * 图标 + 文字宫格，每行 4 项；点击进入对应子页。
 * 返回首页前弹出二次确认。
 */

import dxui from '../../../../dxmodules/dxUi.js';
import BaseView from '../base_view.js';
import router from '../../router/core.js';
import font from '../../components/font.js';
import layout from '../../components/layout.js';
import theme from '../../components/theme.js';
import pageHeader from '../../components/page_header.js';
import confirm from '../../components/confirm.js';
import { t } from '../../i18n/index.js';
import { SETTINGS_MENU_ITEMS } from './settings_menu.js';
import capabilityStore from '../../core/capability_store.js';

/** 每行菜单项数 */
const COLS = 4;
/** 图标底默认色 */
const ICON_BG = 0xf6f6f6;
/** 图标底按下加深色 */
const ICON_BG_PRESSED = 0xd0d0d0;

export default class SettingsPage extends BaseView {
    constructor() {
        super('settings');
        this._header = null;
        /** @type {{ label: object, item: object, bg: object }[]} */
        this._menuCells = [];
    }

    onCreate() {
        const self = this;
        this.root = dxui.View.build('page_settings', dxui.Utils.LAYER.MAIN);
        this.root.setSize(layout.width, layout.height);
        layout.clearStyle(this.root);
        this.root.bgColor(theme.pageBg);
        this.root.bgOpa(100);
        this.root.scroll(false);

        this._header = pageHeader.build(this.root, {
            idPrefix: 'settings',
            titleKey: 'settings.title',
            onBack: function () {
                self._confirmExit();
            },
        });
        this._buildMenuGrid();
    }

    onEnter() {
        this._refreshTexts();
        // 防止按下态在跳转后残留
        for (let i = 0; i < this._menuCells.length; i++) {
            const cell = this._menuCells[i];
            if (cell.bg) {
                cell.bg.bgColor(ICON_BG);
            }
        }
    }

    onExit() {
        confirm.hide();
    }

    /** 退出设置回首页前二次确认。 */
    _confirmExit() {
        confirm.show({
            title: t('settings.exit.title'),
            message: t('settings.exit.message'),
            confirmText: t('settings.exit.confirm'),
            cancelText: t('settings.exit.cancel'),
            onConfirm: function () {
                router.back();
            },
        });
    }

    /**
     * 图标 + 文字宫格，ROW_WRAP，每行 COLS 个。
     */
    _buildMenuGrid() {
        const self = this;
        const top = pageHeader.contentTop();
        const listH = layout.height - top;
        const padX = layout.x(40);
        const gap = layout.x(10);
        const innerW = layout.width - padX * 2;
        const cellW = Math.floor((innerW - gap * (COLS - 1)) / COLS);
        const cellH = layout.y(180);
        const iconBox = layout.x(100);

        const grid = dxui.View.build('settings_menu_grid', this.root);
        grid.setSize(layout.width, listH);
        grid.setPos(0, top);
        layout.clearStyle(grid);
        grid.bgOpa(0);
        grid.scroll(true);
        grid.flexFlow(dxui.Utils.FLEX_FLOW.ROW_WRAP);
        grid.flexAlign(
            dxui.Utils.FLEX_ALIGN.START,
            dxui.Utils.FLEX_ALIGN.START,
            dxui.Utils.FLEX_ALIGN.START
        );
        grid.padTop(layout.y(24));
        grid.padBottom(layout.y(24));
        grid.padLeft(padX);
        grid.padRight(padX);
        grid.obj.lvObjSetStylePadGap(gap, dxui.Utils.ENUM._LV_STYLE_STATE_CMP_SAME);

        this._menuCells = [];
        for (let i = 0; i < SETTINGS_MENU_ITEMS.length; i++) {
            const item = SETTINGS_MENU_ITEMS[i];
            if (item.requireNfc && !capabilityStore.hasNfc()) {
                continue;
            }
            const cell = dxui.View.build('settings_menu_' + item.id, grid);
            layout.clearStyle(cell);
            cell.setSize(cellW, cellH);
            cell.bgOpa(0);
            cell.clickable(true);
            cell.on(dxui.Utils.EVENT.CLICK, function () {
                self._onMenuClick(item);
            });

            const bg = dxui.View.build('settings_menu_' + item.id + '_bg', cell);
            layout.clearStyle(bg);
            bg.setSize(iconBox, iconBox);
            bg.bgColor(ICON_BG);
            bg.bgColor(ICON_BG_PRESSED, dxui.Utils.STATE.PRESSED);
            bg.bgOpa(100);
            bg.radius(layout.x(20));
            bg.align(dxui.Utils.ALIGN.TOP_MID, 0, layout.y(8));
            bg.clickable(false);

            const img = dxui.Image.build('settings_menu_' + item.id + '_img', bg);
            img.source(item.icon);
            img.align(dxui.Utils.ALIGN.CENTER, 0, 0);
            img.clickable(false);

            const labelH = layout.y(60);
            const label = dxui.Label.build('settings_menu_' + item.id + '_lbl', cell);
            label.setSize(cellW, labelH);
            label.align(dxui.Utils.ALIGN.BOTTOM_MID, 0, -layout.y(6));
            label.text(t(item.labelKey));
            label.textFont(font.get(layout.fontSize(20)));
            label.textColor(theme.textSecondary);
            label.textAlign(dxui.Utils.TEXT_ALIGN.CENTER);
            label.longMode(dxui.Utils.LABEL_LONG_MODE.CLIP);
            label.clickable(false);

            // 父级 cell 可点：按下时同步加深图标底（子 View 自身不会进 PRESSED）
            cell.on(dxui.Utils.ENUM.LV_EVENT_PRESSED, (function (iconBg) {
                return function () {
                    iconBg.bgColor(ICON_BG_PRESSED);
                };
            })(bg));
            cell.on(dxui.Utils.ENUM.LV_EVENT_RELEASED, (function (iconBg) {
                return function () {
                    iconBg.bgColor(ICON_BG);
                };
            })(bg));
            if (dxui.Utils.ENUM.LV_EVENT_PRESS_LOST !== undefined) {
                cell.on(dxui.Utils.ENUM.LV_EVENT_PRESS_LOST, (function (iconBg) {
                    return function () {
                        iconBg.bgColor(ICON_BG);
                    };
                })(bg));
            }

            this._menuCells.push({ label: label, item: item, bg: bg });
        }
    }

    /**
     * 按当前 locale 刷新标题与菜单文案。
     */
    _refreshTexts() {
        if (this._header) {
            this._header.refresh();
        }
        const menuFont = font.get(layout.fontSize(20));
        for (let i = 0; i < this._menuCells.length; i++) {
            const cell = this._menuCells[i];
            cell.label.text(t(cell.item.labelKey));
            cell.label.textFont(menuFont);
        }
    }

    /**
     * @param {{ id: string, labelKey: string, icon: string, route: string }} item
     */
    _onMenuClick(item) {
        if (!item || !item.route) {
            return;
        }
        router.navigate(item.route);
    }
}
