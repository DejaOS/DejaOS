/**
 * @layer    view
 * @module   home_page
 * @fires    none
 * @listens  none
 * @depends  dxUi,BaseView,font,layout,theme,assets,text_metrics,router,popup,i18n,password_store,system_store,home_store
 *
 * 日常使用主页（透明叠层）：摄像头画面后续作底层，本页只画 UI。
 * - 时钟与网络/MQTT 图标由全局 status_bar（TOP 层）常驻显示
 * - 右侧居中：配置 / 密码 / 通话连成半透明竖条，中间短横线分隔；配置先经身份验证再进设置菜单；密码进入密码通行页；通话进入呼叫列表
 * - 底部黑条：左 SN 按钮（二维码图标 + SN:）、右 IP:
 * - 点击 SN 按钮：弹窗展示内容为 SN:... 的二维码
 */

import dxui from '../../../../dxmodules/dxUi.js';
import BaseView from '../base_view.js';
import font from '../../components/font.js';
import layout from '../../components/layout.js';
import theme from '../../components/theme.js';

import { asset } from '../../utils/assets.js';
import { getTextWidth } from '../../utils/text_metrics.js';
import router from '../../router/core.js';
import popup from '../../components/popup.js';
import { t } from '../../i18n/index.js';
import passwordStore from '../password/password_store.js';
import systemStore from '../system/system_store.js';
import capabilityStore from '../../core/capability_store.js';
import homeStore from './home_store.js';

const IMG_CONFIG = asset('apps.png');
const IMG_PASSWORD = asset('key.png');
const IMG_CALL = asset('call.png');
const IMG_QRCODE = asset('qrcode-outlined.png');

export default class HomePage extends BaseView {
    constructor() {
        super('home');
        this.bottomBar = null;
        this.snButton = null;
        this.snLabel = null;
        this.ipLabel = null;
        this.verifyPanel = null;
        this.verifyLabel = null;
        this.verifySteps = null;
        this.verifyMeta = null;
        this.verifyProgress = null;
        this._verifyStatus = { mode: 0, sequence: [], state: 'idle', completed: 0, nextFactor: '' };
        /** SN 按钮自适应布局参数 */
        this._snFont = null;
        this._snBtnH = 0;
        this._snLabelH = 0;
        this._snIconSize = 16;
        this._snIconTextGap = 0;
        this._snBtnPadH = 0;
        /** SN 二维码弹窗遮罩 / 面板 / 原生 qrcode 句柄 */
        this._snQrMask = null;
        this._snQrPanel = null;
        this._snQrNative = null;
        /** create 前也可能收到推送，先缓存。 */
        this._status = { sn: '', ip: '', connected: false };
        /** 防止连续点击配置入口并发查询、重复导航。 */
        this._settingsOpening = false;
        /** 使离开主页前发起的异步查询失效，避免旧结果覆盖后续页面。 */
        this._settingsRequestId = 0;
        /** 右侧入口面板；sys.pwd 变更时重建。 */
        this._actionPanel = null;
        this._actionPanelGen = 0;
        this._actionPasswordVisible = null;
    }

    onCreate() {
        this.root = dxui.View.build('page_home', dxui.Utils.LAYER.MAIN);
        this.root.setSize(layout.width, layout.height);
        layout.clearStyle(this.root);
        this.root.scroll(false);
        this._applyTransparentBackground();

        this._buildActionButtons();
        this._buildVerifyStatus();
        this._buildBottomInfo();
        this._buildSnQrcodePopup();
        this._paintStatus();
    }

    onEnter() {
        // 切页后再刷一次，避免 loadMain 后主题默认底色盖住透明。
        this._applyTransparentBackground();
        this._refreshBottomInfoFonts();
        // 设置页改完密码开门后返回主页，按最新快照重建入口。
        this.refreshActionButtons();
        this._paintStatus();
        homeStore.startRecognition();
    }

    /**
     * Web/MQTT/本地改 sys.pwd 后刷新右侧入口；关闭密码开门时不显示按钮。
     */
    refreshActionButtons() {
        if (!this.isCreated) return true;
        let enabled = true;
        try {
            enabled = passwordStore.isEnabled();
        } catch (_e) {
            enabled = true;
        }
        if (this._actionPasswordVisible === enabled && this._actionPanel) return true;
        this._buildActionButtons();
        return true;
    }

    onExit() {
        this._settingsRequestId += 1;
        this._settingsOpening = false;
        this._hideSnQrcode();
        homeStore.pauseRecognition();
    }

    /**
     * 主页透明叠层：不铺底色，透出摄像头等底层画面。
     */
    _applyTransparentBackground() {
        this.root.bgOpa(0);
    }

    /**
     * ui_driver 推送底栏状态。未 create 时只写缓存。
     * @param {{ sn?: string, ip?: string, connected?: boolean, networkConnected?: boolean }} partial
     */
    applyStatus(partial) {
        if (!partial || typeof partial !== 'object') return true;
        if (typeof partial.sn === 'string') this._status.sn = partial.sn;
        if (typeof partial.ip === 'string') this._status.ip = partial.ip;
        if (typeof partial.connected === 'boolean') {
            this._status.connected = partial.connected;
        } else if (typeof partial.networkConnected === 'boolean') {
            this._status.connected = partial.networkConnected;
        }
        if (this.isCreated) this._paintStatus();
        return true;
    }

    /**
     * 进入设置前：未完成首次设密则先进设密页，否则进身份认证。
     */
    async _enterSettingsFlow() {
        if (this._settingsOpening) return;
        this._settingsOpening = true;
        const requestId = ++this._settingsRequestId;
        const navigateIfCurrent = function () {
            if (requestId !== this._settingsRequestId || router.getCurrent() !== this.name) return;
            router.navigate(systemStore.isFirstLoginDone()
                ? 'settings_auth' : 'settings_first_password');
        }.bind(this);
        try {
            // WebServer可能刚完成首次设密，进入前必须刷新SQLite真值，不能只读启动缓存。
            await systemStore.load();
            navigateIfCurrent();
        } catch (_e) {
            // 查询失败时不绕过首次设密，沿用已知缓存做保守分流。
            navigateIfCurrent();
        } finally {
            // 离开再返回主页时可能已经开始新一轮请求，旧任务不能清除新请求的互斥状态。
            if (requestId === this._settingsRequestId) this._settingsOpening = false;
        }
    }

    /**
     * 右侧居中：配置 / 密码 / 通话连成一条半透明竖条，中间短横线分隔。
     * 按下时加深区为整条的三分之一，贴齐左右与对应上下边。
     * 密码开门关闭时不渲染密码入口。
     */
    _buildActionButtons() {
        const self = this;
        let passwordEnabled = true;
        try {
            passwordEnabled = passwordStore.isEnabled();
        } catch (_e) {
            passwordEnabled = true;
        }
        this._actionPasswordVisible = passwordEnabled;

        const actions = [
            {
                id: 'config',
                icon: IMG_CONFIG,
                onClick: function () {
                    self._enterSettingsFlow();
                },
            },
        ];
        if (passwordEnabled) {
            actions.push({
                id: 'password',
                icon: IMG_PASSWORD,
                onClick: function () {
                    if (!passwordStore.isEnabled()) {
                        self.refreshActionButtons();
                        popup.showError(t('passwordAccess.error.disabled'));
                        return;
                    }
                    router.navigate('password_access');
                },
            });
        }
        if (capabilityStore.hasIntercom()) {
            actions.push({
                id: 'call',
                icon: IMG_CALL,
                onClick: function () {
                    router.navigate('call_list');
                },
            });
        }

        const panelW = 112;
        const segmentH = panelW;
        const panelRadius = 14;
        const panelH = segmentH * actions.length;
        const panelX = 800 - panelW - 24;
        const panelY = Math.round((1280 - panelH) / 2);

        if (this._actionPanel) {
            try {
                dxui.del(this._actionPanel);
            } catch (_e) {
                this._actionPanel.hide();
                this._actionPanel.clickable(false);
            }
            this._actionPanel = null;
        }
        const gen = ++this._actionPanelGen;
        const suffix = '_' + gen;
        const panel = dxui.View.build('home_action_panel' + suffix, this.root);
        layout.clearStyle(panel);
        panel.setSize(layout.x(panelW), layout.y(panelH));
        panel.setPos(layout.x(panelX), layout.y(panelY));
        panel.bgColor(0xffffff);
        panel.bgOpa(45);
        panel.radius(layout.x(panelRadius));
        panel.borderWidth(0);
        panel.scroll(false);
        this._actionPanel = panel;

        for (let i = 0; i < actions.length; i++) {
            const action = actions[i];
            const hit = dxui.View.build('home_action_' + action.id + suffix, panel);
            layout.clearStyle(hit);
            hit.setSize(layout.x(panelW), layout.y(segmentH));
            hit.setPos(0, layout.y(i * segmentH));
            hit.bgColor(0x000000);
            hit.bgOpa(0);
            // 各段按下深色底都带圆角（含中间项）
            hit.radius(layout.x(panelRadius));
            hit.scroll(false);
            hit.clickable(true);
            hit.on(dxui.Utils.EVENT.CLICK, action.onClick);
            hit.on(dxui.Utils.ENUM.LV_EVENT_PRESSED, (function (area) {
                return function () {
                    area.bgOpa(22);
                };
            })(hit));
            hit.on(dxui.Utils.ENUM.LV_EVENT_RELEASED, (function (area) {
                return function () {
                    area.bgOpa(0);
                };
            })(hit));
            if (dxui.Utils.ENUM.LV_EVENT_PRESS_LOST !== undefined) {
                hit.on(dxui.Utils.ENUM.LV_EVENT_PRESS_LOST, (function (area) {
                    return function () {
                        area.bgOpa(0);
                    };
                })(hit));
            }

            const img = dxui.Image.build('home_action_' + action.id + '_img' + suffix, hit);
            img.source(action.icon);
            img.align(dxui.Utils.ALIGN.CENTER, 0, 0);
            img.clickable(false);

            if (i < actions.length - 1) {
                const divider = dxui.View.build('home_action_div_' + (i + 1) + suffix, panel);
                layout.clearStyle(divider);
                divider.setSize(layout.x(22), layout.y(2));
                divider.setPos(
                    layout.x(Math.round((panelW - 22) / 2)),
                    layout.y((i + 1) * segmentH - 1)
                );
                divider.bgColor(0x666666);
                divider.bgOpa(80);
                divider.radius(layout.y(1));
                divider.clickable(false);
            }
        }
    }
    /** 单人多凭证任务卡；普通和多人识别模式均不显示模式横幅。 */
    _buildVerifyStatus() {
        this.verifyPanel = dxui.View.build('home_verify_panel', this.root);
        layout.clearStyle(this.verifyPanel);
        this.verifyPanel.setSize(layout.x(560), layout.y(174));
        this.verifyPanel.align(dxui.Utils.ALIGN.BOTTOM_MID, 0, -layout.y(82));
        this.verifyPanel.bgColor(0x111827);
        this.verifyPanel.bgOpa(88);
        this.verifyPanel.radius(layout.x(20));
        this.verifyPanel.scroll(false);
        this.verifyPanel.clickable(false);

        this.verifyLabel = dxui.Label.build('home_verify_instruction', this.verifyPanel);
        this.verifyLabel.setSize(layout.x(510), layout.y(42));
        this.verifyLabel.align(dxui.Utils.ALIGN.TOP_MID, 0, layout.y(16));
        this.verifyLabel.textFont(font.get(layout.fontSize(30), dxui.Utils.FONT_STYLE.BOLD));
        this.verifyLabel.textColor(0xffffff);
        this.verifyLabel.textAlign(dxui.Utils.TEXT_ALIGN.CENTER);

        this.verifySteps = dxui.Label.build('home_verify_steps', this.verifyPanel);
        this.verifySteps.setSize(layout.x(510), layout.y(34));
        this.verifySteps.align(dxui.Utils.ALIGN.TOP_MID, 0, layout.y(65));
        this.verifySteps.textFont(font.get(layout.fontSize(22)));
        this.verifySteps.textColor(0xd1d5db);
        this.verifySteps.textAlign(dxui.Utils.TEXT_ALIGN.CENTER);

        this.verifyMeta = dxui.Label.build('home_verify_meta', this.verifyPanel);
        this.verifyMeta.setSize(layout.x(510), layout.y(28));
        this.verifyMeta.align(dxui.Utils.ALIGN.TOP_MID, 0, layout.y(105));
        this.verifyMeta.textFont(font.get(layout.fontSize(18)));
        this.verifyMeta.textColor(0x9ca3af);
        this.verifyMeta.textAlign(dxui.Utils.TEXT_ALIGN.CENTER);

        const track = dxui.View.build('home_verify_progress_track', this.verifyPanel);
        layout.clearStyle(track);
        track.setSize(layout.x(480), layout.y(6));
        track.align(dxui.Utils.ALIGN.BOTTOM_MID, 0, -layout.y(18));
        track.bgColor(0x4b5563);
        track.bgOpa(100);
        track.radius(layout.y(3));
        track.scroll(false);
        this.verifyProgress = dxui.View.build('home_verify_progress', track);
        layout.clearStyle(this.verifyProgress);
        this.verifyProgress.setSize(0, layout.y(6));
        this.verifyProgress.align(dxui.Utils.ALIGN.LEFT_MID, 0, 0);
        this.verifyProgress.bgColor(0x22c55e);
        this.verifyProgress.bgOpa(100);
        this.verifyProgress.radius(layout.y(3));
        this.verifyPanel.hide();
    }

    applyVerifyStatus(status) {
        this._verifyStatus = Object.assign({}, this._verifyStatus, status || {});
        return this._paintVerifyStatus();
    }

    _paintVerifyStatus() {
        const mode = Number(this._verifyStatus.mode);
        if (!this.verifyPanel || (mode !== 2 && mode !== 3)) {
            if (this.verifyPanel) this.verifyPanel.hide();
            return true;
        }
        const value = this._verifyStatus;
        if (mode === 3) {
            const primary = value.primary || {};
            const waiting = value.state === 'pending';
            const reasons = {
                DUAL_PERSON_SAME_PERSON: 'verify.dual.error.same',
                DUAL_PERSON_NOT_SPECIFIED: 'verify.dual.error.notSpecified',
                VOUCHER_NOT_FOUND: 'verify.dual.error.denied',
                PERMISSION_DENIED: 'verify.dual.error.denied',
                PERSON_NOT_FOUND: 'verify.dual.error.denied',
            };
            this.verifyPanel.align(dxui.Utils.ALIGN.TOP_MID, 0, layout.y(140));
            this.verifyLabel.text(waiting ? t('verify.dual.waitVerifier') : t('verify.dual.waitPrimary'));
            this.verifySteps.text(waiting
                ? t('verify.dual.primaryDone', { name: primary.name || primary.userId || '-' })
                    + '   >   ' + t('verify.dual.verifierPending')
                : t('verify.dual.process'));
            const seconds = Math.max(0, Number(value.remainingSeconds) || 0);
            const timeout = Math.max(1, Number(value.timeout) || 1);
            const errorKey = reasons[value.reason];
            this.verifyMeta.text(errorKey ? t(errorKey)
                : (waiting ? t('verify.remaining', { seconds: seconds }) : t('verify.dual.hint')));
            this.verifyProgress.setSize(
                Math.round(layout.x(480) * (waiting ? Math.min(1, seconds / timeout) : 0)), layout.y(6)
            );
            this.verifyPanel.show();
            return true;
        }
        this.verifyPanel.align(dxui.Utils.ALIGN.BOTTOM_MID, 0, -layout.y(82));
        const labels = {
            face: t('verify.factor.face'), card: t('verify.factor.card'), code: t('verify.factor.code'),
            password: t('verify.factor.password'), finger: t('verify.factor.finger'),
        };
        const sequence = Array.isArray(value.sequence) ? value.sequence : [];
        const completed = Math.max(0, Number(value.completed) || 0);
        const next = labels[value.nextFactor] || value.nextFactor || '';
        this.verifyLabel.text(next ? t('verify.next', { factor: next }) : t('verify.idleHint'));
        this.verifySteps.text(sequence.map(function (item, index) {
            const done = index < completed ? ' · ' + t('verify.done') : '';
            return (index + 1) + ' ' + (labels[item] || item) + done;
        }).join('   >   '));

        const total = Math.max(1, sequence.length);
        let ratio = completed / total;
        let meta = t('verify.idleHint');
        if (value.state === 'pending') {
            const seconds = Math.max(0, Number(value.remainingSeconds) || 0);
            const timeout = Math.max(1, Number(value.timeout) || 1);
            ratio = Math.max(0, Math.min(1, seconds / timeout));
            meta = t('verify.progress', { completed: completed, total: total })
                + ' · ' + t('verify.remaining', { seconds: seconds });
        }
        this.verifyMeta.text(meta);
        this.verifyProgress.setSize(Math.round(layout.x(480) * ratio), layout.y(6));
        this.verifyPanel.show();
        return true;
    }

    /**
     * 底部黑条：左 SN 按钮（二维码图标 + SN:xxx）、右 IP:xxx。
     * SN 按钮宽度按文案像素宽自适应（见 _resizeSnButton）。
     */
    _buildBottomInfo() {
        const barH = 56;
        const btnH = 40;
        const fontSize = 18;
        // Label 与按钮同高，避免高度不足时 SCROLL_CIRCULAR 上下滚；
        // 文字在 Label 内顶对齐，用 padTop 把行视觉推到中间。
        const labelH = btnH;
        const labelPadTop = Math.max(0, Math.floor((btnH - fontSize) / 2) - 2);
        const iconSize = 16;
        const iconTextGap = layout.x(8);
        const btnPadH = layout.x(18);

        this._snFont = font.getDefault(layout.fontSize(fontSize));
        this._snBtnH = layout.y(btnH);
        this._snLabelH = layout.y(labelH);
        this._snLabelPadTop = layout.y(labelPadTop);
        this._snIconSize = iconSize;
        this._snIconTextGap = iconTextGap;
        this._snBtnPadH = btnPadH;

        this.bottomBar = dxui.View.build('home_bottom_bar', this.root);
        this.bottomBar.setSize(layout.width, layout.y(barH));
        this.bottomBar.align(dxui.Utils.ALIGN.BOTTOM_MID, 0, 0);
        layout.clearStyle(this.bottomBar);
        this.bottomBar.bgColor(0x000000);
        this.bottomBar.bgOpa(100);
        this.bottomBar.scroll(false);

        // SN 浅灰半透明按钮；flex 居中图标 + 文案；宽度随内容变。
        this.snButton = dxui.Button.build('home_sn_btn', this.bottomBar);
        this.snButton.setSize(layout.x(120), this._snBtnH);
        this.snButton.align(dxui.Utils.ALIGN.LEFT_MID, layout.x(12), 0);
        this.snButton.bgColor(theme.actionBg);
        this.snButton.bgOpa(30);
        this.snButton.radius(layout.x(8));
        this.snButton.borderWidth(0);
        this.snButton.padAll(0);
        this.snButton.padTop(0);
        this.snButton.padBottom(0);
        this.snButton.padLeft(btnPadH);
        this.snButton.padRight(btnPadH);
        this.snButton.flexFlow(dxui.Utils.FLEX_FLOW.ROW);
        this.snButton.flexAlign(
            dxui.Utils.FLEX_ALIGN.CENTER,
            dxui.Utils.FLEX_ALIGN.CENTER,
            dxui.Utils.FLEX_ALIGN.CENTER
        );
        this.snButton.obj.lvObjSetStylePadGap(
            iconTextGap,
            dxui.Utils.ENUM._LV_STYLE_STATE_CMP_SAME
        );
        const self = this;
        this.snButton.on(dxui.Utils.EVENT.CLICK, function () {
            self._showSnQrcode();
        });

        const snQrIcon = dxui.Image.build('home_sn_qr', this.snButton);
        snQrIcon.source(IMG_QRCODE);

        this.snLabel = dxui.Label.build('home_sn', this.snButton);
        layout.clearStyle(this.snLabel);
        this.snLabel.setSize(layout.x(80), this._snLabelH);
        this.snLabel.padTop(this._snLabelPadTop);
        this.snLabel.padBottom(0);
        this.snLabel.textFont(this._snFont);
        this.snLabel.textColor(theme.textOnDark);
        this.snLabel.textAlign(dxui.Utils.TEXT_ALIGN.LEFT);
        this.snLabel.longMode(dxui.Utils.LABEL_LONG_MODE.SCROLL_CIRCULAR);

        this.ipLabel = dxui.Label.build('home_ip', this.bottomBar);
        layout.clearStyle(this.ipLabel);
        this.ipLabel.setSize(layout.x(280), layout.y(labelH));
        this.ipLabel.padTop(this._snLabelPadTop);
        this.ipLabel.padBottom(0);
        this.ipLabel.align(dxui.Utils.ALIGN.RIGHT_MID, -layout.x(20), 0);
        this.ipLabel.textFont(font.getDefault(layout.fontSize(fontSize)));
        this.ipLabel.textColor(theme.textOnDark);
        this.ipLabel.textAlign(dxui.Utils.TEXT_ALIGN.RIGHT);
        this.ipLabel.longMode(dxui.Utils.LABEL_LONG_MODE.SCROLL_CIRCULAR);
    }

    /** 语言切换后重绑 SN/IP 默认字体（避免 ar/ko 字体导致滚动/错位）。 */
    _refreshBottomInfoFonts() {
        if (!this.snLabel) {
            return;
        }
        const fontSize = layout.fontSize(18);
        this._snFont = font.getDefault(fontSize);
        this.snLabel.textFont(this._snFont);
        this.snLabel.padTop(this._snLabelPadTop);
        if (this.ipLabel) {
            this.ipLabel.textFont(font.getDefault(fontSize));
            this.ipLabel.padTop(this._snLabelPadTop);
        }
    }

    /**
     * 按 SN 文案像素宽重设按钮与标签宽度，避免过宽挤到右侧 IP。
     * @param {string} text
     */
    _resizeSnButton(text) {
        if (!this.snButton || !this.snLabel || !this._snFont) {
            return;
        }
        const textW = getTextWidth(text || '', this._snFont);
        const chromeW = this._snBtnPadH * 2 + this._snIconSize + this._snIconTextGap;
        const maxBtnW = Math.floor(layout.width / 2) - layout.x(24);
        const minBtnW = chromeW + layout.x(40);
        let btnW = chromeW + textW;
        if (btnW < minBtnW) {
            btnW = minBtnW;
        }
        if (btnW > maxBtnW) {
            btnW = maxBtnW;
        }
        const labelW = Math.max(layout.x(40), btnW - chromeW);
        this.snLabel.setSize(labelW, this._snLabelH);
        this.snButton.setSize(btnW, this._snBtnH);
    }

    /**
     * SN 二维码弹窗：半透明遮罩 + 居中白卡片 + 原生 lvQrcode。
     * 点遮罩或关闭钮收起；二维码内容为当前 SN 文案（含 SN: 前缀）。
     */
    _buildSnQrcodePopup() {
        const self = this;
        // 与参考一致：二维码边长 ≈ 屏宽 * 320/600
        const qrSide = Math.round(layout.width * 320 / 600);
        const panelPad = layout.x(40);
        const closeSize = layout.x(60);
        const panelW = qrSide + panelPad * 2;
        const panelH = qrSide + panelPad * 2 + layout.y(20);

        this._snQrMask = dxui.View.build('home_sn_qr_mask', this.root);
        this._snQrMask.setSize(layout.width, layout.height);
        this._snQrMask.align(dxui.Utils.ALIGN.TOP_LEFT, 0, 0);
        layout.clearStyle(this._snQrMask);
        this._snQrMask.bgColor(0x000000);
        this._snQrMask.bgOpa(theme.maskOpa);
        this._snQrMask.scroll(false);
        this._snQrMask.clickable(true);
        this._snQrMask.on(dxui.Utils.EVENT.CLICK, function () {
            self._hideSnQrcode();
        });
        this._snQrMask.hide();

        this._snQrPanel = dxui.View.build('home_sn_qr_panel', this._snQrMask);
        this._snQrPanel.setSize(panelW, panelH);
        this._snQrPanel.align(dxui.Utils.ALIGN.CENTER, 0, 0);
        layout.clearStyle(this._snQrPanel);
        this._snQrPanel.bgColor(theme.pageBg);
        this._snQrPanel.bgOpa(100);
        this._snQrPanel.radius(layout.x(20));
        this._snQrPanel.scroll(false);
        // 挡住点击，避免点到卡片区域也关掉弹窗。
        this._snQrPanel.clickable(true);

        const closeBox = dxui.View.build('home_sn_qr_close', this._snQrPanel);
        closeBox.setSize(closeSize, closeSize);
        layout.clearStyle(closeBox);
        closeBox.align(dxui.Utils.ALIGN.TOP_RIGHT, 0, 0);
        closeBox.bgOpa(0);
        closeBox.clickable(true);
        closeBox.on(dxui.Utils.EVENT.CLICK, function () {
            self._hideSnQrcode();
        });

        const closeLabel = dxui.Label.build('home_sn_qr_close_lbl', closeBox);
        closeLabel.text('×');
        closeLabel.textFont(font.get(layout.fontSize(36)));
        closeLabel.textColor(theme.textPrimary);
        closeLabel.align(dxui.Utils.ALIGN.CENTER, 0, 0);

        const qrcodeBox = dxui.View.build('home_sn_qr_box', this._snQrPanel);
        layout.clearStyle(qrcodeBox);
        qrcodeBox.setSize(qrSide, qrSide);
        qrcodeBox.align(dxui.Utils.ALIGN.CENTER, 0, 0);
        qrcodeBox.bgOpa(0);

        this._snQrNative = dxui.Utils.GG.NativeBasicComponent.lvQrcodeCreate(
            qrcodeBox.obj,
            qrSide,
            0x000000,
            0xffffff
        );
    }

    /**
     * 刷新二维码内容并显示弹窗。
     */
    _showSnQrcode() {
        if (!this._snQrMask || !this._snQrNative || !this.snLabel) {
            return;
        }
        const text = this.snLabel.text() || ('SN:' + (this._status.sn || ''));
        dxui.Utils.GG.NativeBasicComponent.lvQrcodeUpdate(this._snQrNative, text);
        this._snQrMask.show();
        if (typeof this._snQrMask.moveForeground === 'function') {
            this._snQrMask.moveForeground();
        }
        this._snQrPanel.show();
    }

    /**
     * 隐藏 SN 二维码弹窗。
     */
    _hideSnQrcode() {
        if (this._snQrPanel) {
            this._snQrPanel.hide();
        }
        if (this._snQrMask) {
            this._snQrMask.hide();
        }
    }

    /** 按配置与联网态绘制 SN/IP；断网或无 IP 时隐藏 IP。 */
    _paintStatus() {
        if (!this.snLabel || !this.ipLabel) return;

        let showSn = true;
        let showIpCfg = true;
        try {
            const cfg = systemStore.getConfig();
            showSn = cfg.showSn !== false;
            showIpCfg = cfg.showIp !== false;
        } catch (_e) {}

        if (this.snButton) {
            if (showSn) {
                const snText = 'SN:' + (this._status.sn || '');
                this.snLabel.text(snText);
                this._resizeSnButton(snText);
                this.snButton.show();
            } else {
                this.snButton.hide();
            }
        }

        const showIp = showIpCfg && this._status.connected && !!this._status.ip;
        if (showIp) {
            this.ipLabel.text('IP:' + this._status.ip);
            this.ipLabel.show();
        } else {
            this.ipLabel.hide();
        }
    }
}
