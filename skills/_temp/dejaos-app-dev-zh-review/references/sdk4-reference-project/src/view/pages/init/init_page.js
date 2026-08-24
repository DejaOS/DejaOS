/**
 * @layer    view
 * @module   init_page
 * @fires    none
 * @listens  none
 * @depends  dxUi,BaseView,router,font,layout,theme,i18n,confirm,popup,event_bus,commands
 *
 * 首次初始化页：选择产品形态（标品 / 企微）与发行区域（国内 / 国际版）。
 * 配色与首页一致（黑白灰）；默认选中标品 + 国内。
 * 本页文案固定中文；确认后按区域 setLocale，后续页面跟当前 locale。
 * 确认时写 /etc/app 标志文件（只能激活一次），再进入对应页面。
 */

import dxui from '../../../../dxmodules/dxUi.js';
import BaseView from '../base_view.js';
import router from '../../router/core.js';
import font from '../../components/font.js';
import layout from '../../components/layout.js';
import theme from '../../components/theme.js';
import confirm from '../../components/confirm.js';
import popup from '../../components/popup.js';
import eventBus from '../../../core/event_bus.js';
import commands from '../../../core/commands.js';
import { t, setLocale, localeFromRegion, LOCALE_ZH } from '../../i18n/index.js';

/** 默认：标品 + 国内 */
const DEFAULT_PRODUCT = 'standard';
const DEFAULT_REGION = 'domestic';

/** 产品形态选项；labelKey 经 i18n 取中文文案 */
const PRODUCT_OPTIONS = [
    { id: 'standard', labelKey: 'product.standard' },
    { id: 'wecom', labelKey: 'product.wecom' },
];

/** 发行区域选项 */
const REGION_OPTIONS = [
    { id: 'domestic', labelKey: 'region.domestic' },
    { id: 'international', labelKey: 'region.international' },
];

/**
 * 初始化页专用：始终取中文，不受当前 locale 影响。
 * @param {string} key
 * @returns {string}
 */
function zh(key) {
    return t(key, LOCALE_ZH);
}

export default class InitPage extends BaseView {
    constructor() {
        super('init');
        /** @type {string} standard | wecom */
        this.productType = DEFAULT_PRODUCT;
        /** @type {string} domestic | international */
        this.region = DEFAULT_REGION;
        /** @type {Object.<string, { button: object, label: object }>} */
        this.productButtons = {};
        /** @type {Object.<string, { button: object, label: object }>} */
        this.regionButtons = {};
        this.confirmButton = null;
        this.confirmLabel = null;
        /** 防止重复点击 */
        this._saving = false;
    }

    onCreate() {
        const self = this;

        this.root = dxui.View.build('page_init', dxui.Utils.LAYER.MAIN);
        this.root.setSize(layout.width, layout.height);
        layout.clearStyle(this.root);
        this.root.bgColor(theme.pageBg);
        this.root.bgOpa(100);
        this.root.scroll(false);

        const title = dxui.Label.build('init_title', this.root);
        title.setSize(layout.x(700), layout.y(80));
        title.setPos(layout.x(50), layout.y(100));
        title.text(zh('init.title'));
        title.textFont(font.get(layout.fontSize(42), dxui.Utils.FONT_STYLE.BOLD));
        title.textColor(theme.textPrimary);
        title.textAlign(dxui.Utils.TEXT_ALIGN.CENTER);

        const subtitle = dxui.Label.build('init_subtitle', this.root);
        subtitle.setSize(layout.x(700), layout.y(50));
        subtitle.setPos(layout.x(50), layout.y(190));
        subtitle.text(zh('init.subtitle'));
        subtitle.textFont(font.get(layout.fontSize(24)));
        subtitle.textColor(theme.textSecondary);
        subtitle.textAlign(dxui.Utils.TEXT_ALIGN.CENTER);

        this._buildSectionTitle('init_product_title', zh('init.product'), 280);
        this.productButtons = this._buildOptionRow(
            'init_product',
            PRODUCT_OPTIONS,
            360,
            function (id) {
                self.productType = id;
                self._refreshOptionStyles(self.productButtons, self.productType);
                self._refreshConfirmState();
            }
        );

        this._buildSectionTitle('init_region_title', zh('init.region'), 520);
        this.regionButtons = this._buildOptionRow(
            'init_region',
            REGION_OPTIONS,
            600,
            function (id) {
                self.region = id;
                self._refreshOptionStyles(self.regionButtons, self.region);
                self._refreshConfirmState();
            }
        );

        this.confirmButton = dxui.Button.build('init_confirm_button', this.root);
        this.confirmButton.setSize(layout.x(520), layout.y(100));
        this.confirmButton.setPos(layout.x(140), layout.y(900));
        this.confirmButton.radius(layout.x(16));
        this.confirmButton.borderWidth(0);
        this.confirmButton.on(dxui.Utils.EVENT.CLICK, function () {
            self._onConfirm();
        });

        this.confirmLabel = dxui.Label.build('init_confirm_label', this.confirmButton);
        this.confirmLabel.text(zh('init.confirm'));
        this.confirmLabel.textFont(font.get(layout.fontSize(28)));
        this.confirmLabel.textColor(0xffffff);
        this.confirmLabel.align(dxui.Utils.ALIGN.CENTER, 0, 0);
        this.confirmLabel.clickable(false);

        this._applyDefaults();
    }

    onEnter() {
        this._saving = false;
        // 每次进入恢复默认：标品 + 国内。
        this._applyDefaults();
    }

    /**
     * 恢复默认选中并刷新按钮态。
     */
    _applyDefaults() {
        this.productType = DEFAULT_PRODUCT;
        this.region = DEFAULT_REGION;
        this._refreshOptionStyles(this.productButtons, this.productType);
        this._refreshOptionStyles(this.regionButtons, this.region);
        this._refreshConfirmState();
    }

    /**
     * 分组标题。
     * @param {string} id
     * @param {string} text
     * @param {number} y 设计稿 Y
     */
    _buildSectionTitle(id, text, y) {
        const label = dxui.Label.build(id, this.root);
        label.setSize(layout.x(700), layout.y(50));
        label.setPos(layout.x(50), layout.y(y));
        label.text(text);
        label.textFont(font.get(layout.fontSize(28), dxui.Utils.FONT_STYLE.BOLD));
        label.textColor(theme.textPrimary);
        label.textAlign(dxui.Utils.TEXT_ALIGN.CENTER);
    }

    /**
     * 横向双选项按钮行；点击后由 onSelect 回写选中 id。
     * @param {string} prefix 控件 id 前缀
     * @param {{ id: string, labelKey: string }[]} options
     * @param {number} y 设计稿 Y
     * @param {function(string): void} onSelect
     * @returns {Object.<string, { button: object, label: object }>}
     */
    _buildOptionRow(prefix, options, y, onSelect) {
        const map = {};
        const gap = 40;
        const btnW = 300;
        const totalW = btnW * options.length + gap * (options.length - 1);
        const startX = Math.round((800 - totalW) / 2);

        for (let i = 0; i < options.length; i++) {
            const option = options[i];
            const button = dxui.Button.build(prefix + '_' + option.id, this.root);
            button.setSize(layout.x(btnW), layout.y(110));
            button.setPos(layout.x(startX + i * (btnW + gap)), layout.y(y));
            button.radius(layout.x(16));
            button.borderWidth(0);
            button.on(dxui.Utils.EVENT.CLICK, function () {
                onSelect(option.id);
            });

            const label = dxui.Label.build(prefix + '_' + option.id + '_label', button);
            label.text(zh(option.labelKey));
            label.textFont(font.get(layout.fontSize(30)));
            label.align(dxui.Utils.ALIGN.CENTER, 0, 0);
            label.clickable(false);

            map[option.id] = { button: button, label: label };
        }
        return map;
    }

    /**
     * 按当前选中 id 刷新一组选项的视觉态。
     * @param {Object.<string, { button: object, label: object }>} buttonMap
     * @param {string|null} selectedId
     */
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

    /**
     * 两项都选齐才允许确认；禁用态仅改颜色，点击在 _onConfirm 内再拦一层。
     */
    _refreshConfirmState() {
        const ready = this.productType !== null && this.region !== null;
        this.confirmButton.bgColor(ready ? theme.activeBg : theme.disabledBg);
    }

    /**
     * 确认：二次确认 → 落盘标志文件 → 进入对应页面。
     */
    _onConfirm() {
        if (this._saving || this.productType === null || this.region === null) {
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

    /** 写标志文件并进入企微网络引导或首页。 */
    async _saveAndEnter() {
        if (this._saving || this.productType === null || this.region === null) {
            return;
        }
        this._saving = true;
        try {
            await eventBus.execute(commands.ACTIVATE_PRODUCT_MODE, {
                productType: this.productType,
                region: this.region === 'international' ? 'INTL' : 'CN',
                language: this.region === 'international' ? 'EN' : 'CN',
            });
            setLocale(localeFromRegion(this.region));
            if (this.productType === 'wecom') {
                // 激活已完成；网络页 ensureActivated 会读到已激活并跳过二次写入。
                router.replace('wecom_network');
                return;
            }
            router.replace('home');
        } catch (e) {
            this._saving = false;
            popup.showError((e && e.message) ? String(e.message) : '保存失败');
        }
    }
}
