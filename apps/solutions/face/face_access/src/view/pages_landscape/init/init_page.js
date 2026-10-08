/**
 * @layer    view
 * @module   init_page
 * @fires    none
 * @listens  none
 * @depends  dxUi,BaseView,router,font,layout,theme,i18n,confirm,popup,event_bus,commands
 *
 */

import dxui from '../../../../dxmodules/dxUi.js';
import BaseView from '../../pages/base_view.js';
import router from '../../router/core.js';
import font from '../../components/font.js';
import layout from '../../components/layout.js';
import theme from '../../components/theme.js';
import confirm from '../../components/confirm.js';
import popup from '../../components/popup.js';
import eventBus from '../../../core/event_bus.js';
import commands from '../../../core/commands.js';
import { t, setLocale, localeFromRegion, LOCALE_ZH } from '../../i18n/index.js';
import { ACTION_BTN_BOTTOM } from '../ls_metrics.js';

const CONFIRM_BTN_H = 88;

const DEFAULT_PRODUCT = 'standard';
const DEFAULT_REGION = 'domestic';

const PRODUCT_OPTIONS = [
    { id: 'standard', labelKey: 'product.standard' },
    { id: 'wecom', labelKey: 'product.wecom' },
];

const REGION_OPTIONS = [
    { id: 'domestic', labelKey: 'region.domestic' },
    { id: 'international', labelKey: 'region.international' },
];

function zh(key) {
    return t(key, LOCALE_ZH);
}

export default class InitPage extends BaseView {
    constructor() {
        super('init');
        this.productType = DEFAULT_PRODUCT;
        this.region = DEFAULT_REGION;
        this.productButtons = {};
        this.regionButtons = {};
        this.confirmButton = null;
        this.confirmLabel = null;
    }

    onCreate() {
        const self = this;
        const designW = layout.getResolution().baseWidth;

        this.root = dxui.View.build('page_init', dxui.Utils.LAYER.MAIN);
        this.root.setSize(layout.width, layout.height);
        layout.clearStyle(this.root);
        this.root.bgColor(theme.pageBg);
        this.root.bgOpa(100);
        this.root.scroll(false);

        const title = dxui.Label.build('init_title', this.root);
        title.setSize(layout.x(designW - 80), layout.y(48));
        title.setPos(layout.x(40), layout.y(36));
        title.text(zh('init.title'));
        title.textFont(font.get(layout.fontSize(34), dxui.Utils.FONT_STYLE.BOLD));
        title.textColor(theme.textPrimary);
        title.textAlign(dxui.Utils.TEXT_ALIGN.CENTER);

        const subtitle = dxui.Label.build('init_subtitle', this.root);
        subtitle.setSize(layout.x(designW - 80), layout.y(36));
        subtitle.setPos(layout.x(40), layout.y(88));
        subtitle.text(zh('init.subtitle'));
        subtitle.textFont(font.get(layout.fontSize(20)));
        subtitle.textColor(theme.textSecondary);
        subtitle.textAlign(dxui.Utils.TEXT_ALIGN.CENTER);

        // 两组各一行横排选项：产品 / 区域
        const rowW = 880;
        const rowStartX = Math.round((designW - rowW) / 2);
        const productTop = 160;
        const regionTop = 340;

        this._buildRow(
            'init_product',
            zh('init.product'),
            PRODUCT_OPTIONS,
            rowStartX,
            productTop,
            rowW,
            function (id) {
                self.productType = id;
                self._refreshOptionStyles(self.productButtons, self.productType);
                self._refreshConfirmState();
            },
            function (map) { self.productButtons = map; }
        );

        this._buildRow(
            'init_region',
            zh('init.region'),
            REGION_OPTIONS,
            rowStartX,
            regionTop,
            rowW,
            function (id) {
                self.region = id;
                self._refreshOptionStyles(self.regionButtons, self.region);
                self._refreshConfirmState();
            },
            function (map) { self.regionButtons = map; }
        );

        this.confirmButton = dxui.Button.build('init_confirm_button', this.root);
        this.confirmButton.setSize(layout.x(480), layout.y(CONFIRM_BTN_H));
        this.confirmButton.align(dxui.Utils.ALIGN.BOTTOM_MID, 0, -layout.y(ACTION_BTN_BOTTOM));
        this.confirmButton.radius(layout.x(14));
        this.confirmButton.borderWidth(0);
        this.confirmButton.on(dxui.Utils.EVENT.CLICK, function () {
            self._onConfirm();
        });

        this.confirmLabel = dxui.Label.build('init_confirm_label', this.confirmButton);
        this.confirmLabel.text(zh('init.confirm'));
        this.confirmLabel.textFont(font.get(layout.fontSize(26)));
        this.confirmLabel.textColor(0xffffff);
        this.confirmLabel.align(dxui.Utils.ALIGN.CENTER, 0, 0);
        this.confirmLabel.clickable(false);

        this._applyDefaults();
    }

    onEnter() {
        this._applyDefaults();
    }

    _applyDefaults() {
        this.productType = DEFAULT_PRODUCT;
        this.region = DEFAULT_REGION;
        this._refreshOptionStyles(this.productButtons, this.productType);
        this._refreshOptionStyles(this.regionButtons, this.region);
        this._refreshConfirmState();
    }

    /**
     * @param {string} prefix
     * @param {string} titleText
     * @param {{ id: string, labelKey: string }[]} options
     * @param {number} x 设计稿 X
     * @param {number} y 设计稿 Y
     * @param {number} rowW 设计稿行宽
     * @param {function(string): void} onSelect
     * @param {function(Object): void} onMap
     */
    _buildRow(prefix, titleText, options, x, y, rowW, onSelect, onMap) {
        const title = dxui.Label.build(prefix + '_title', this.root);
        title.setSize(layout.x(rowW), layout.y(40));
        title.setPos(layout.x(x), layout.y(y));
        title.text(titleText);
        title.textFont(font.get(layout.fontSize(24), dxui.Utils.FONT_STYLE.BOLD));
        title.textColor(theme.textPrimary);
        title.textAlign(dxui.Utils.TEXT_ALIGN.CENTER);

        const map = {};
        const btnH = 96;
        const gap = 32;
        const count = options.length;
        const btnW = Math.floor((rowW - gap * (count - 1)) / count);
        const btnY = y + 52;
        for (let i = 0; i < count; i++) {
            const option = options[i];
            const button = dxui.Button.build(prefix + '_' + option.id, this.root);
            button.setSize(layout.x(btnW), layout.y(btnH));
            button.setPos(layout.x(x + i * (btnW + gap)), layout.y(btnY));
            button.radius(layout.x(14));
            button.borderWidth(0);
            button.on(dxui.Utils.EVENT.CLICK, function () {
                onSelect(option.id);
            });

            const label = dxui.Label.build(prefix + '_' + option.id + '_label', button);
            label.text(zh(option.labelKey));
            label.textFont(font.get(layout.fontSize(26)));
            label.align(dxui.Utils.ALIGN.CENTER, 0, 0);
            label.clickable(false);

            map[option.id] = { button: button, label: label };
        }
        onMap(map);
    }

    _refreshOptionStyles(buttonMap, selectedId) {
        const ids = Object.keys(buttonMap);
        for (let i = 0; i < ids.length; i++) {
            const id = ids[i];
            const entry = buttonMap[id];
            const active = id === selectedId;
            entry.button.bgColor(active ? theme.activeBg : theme.actionBg);
            entry.label.textColor(active ? theme.textOnDark : theme.textMuted);
        }
    }

    _refreshConfirmState() {
        const ready = this.productType !== null && this.region !== null;
        this.confirmButton.bgColor(ready ? theme.activeBg : theme.disabledBg);
    }

    _onConfirm() {
        if (this.productType === null || this.region === null) {
            return;
        }
        const self = this;
        confirm.show({
            title: '确认保存',
            message: '是否确认保存配置？',
            onConfirm: function () {
                self._saveAndEnter();
            },
        });
    }

    async _saveAndEnter() {
        if (this.productType === null || this.region === null) {
            return;
        }
        try {
            await eventBus.execute(commands.ACTIVATE_PRODUCT_MODE, {
                productType: this.productType,
                region: this.region === 'international' ? 'INTL' : 'CN',
                language: this.region === 'international' ? 'EN' : 'CN',
            });
            setLocale(localeFromRegion(this.region));
            if (this.productType === 'wecom') {
                router.replace('wecom_network');
                return;
            }
            router.replace('home');
        } catch (e) {
            popup.showError((e && e.message) ? String(e.message) : '保存失败');
        }
    }
}
