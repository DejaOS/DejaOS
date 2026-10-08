/**
 * @layer view
 * @module fault_view
 * @depends dxUi,dxStd,dxDriver,font,layout,theme
 *
 * 启动失败专用最小页面，不依赖Router、Service或配置数据库。
 * 页面保持到硬件看门狗复位，禁止在这里实现业务恢复。
 */

import dxui from '../../dxmodules/dxUi.js';
import dxStd from '../../dxmodules/dxStd.js';
import dxDriver from '../../dxmodules/dxDriver.js';
import font from './components/font.js';
import layout from './components/layout.js';
import theme from './components/theme.js';

const UI_CONTEXT = {};
const HANDLER_INTERVAL_MS = 16;
const MAX_ERROR_LENGTH = 160;

let initialized = false;
let root = null;
let moduleLabel = null;
let errorLabel = null;
let handlerTimer = null;

function cleanText(value, maxLength) {
    const text = String(value || '').replace(/[\r\n\t]+/g, ' ').trim();
    return text.length > maxLength ? text.substring(0, maxLength) + '…' : text;
}

function build() {
    dxui.init({ orientation: dxDriver.DISPLAY.ROTATION }, UI_CONTEXT);
    root = dxui.View.build('bootstrap_fault_root', dxui.Utils.LAYER.SYS);
    root.setSize(layout.width, layout.height);
    root.bgColor(theme.pageBg);
    root.bgOpa(100);
    root.radius(0);
    root.borderWidth(0);
    root.padAll(0);
    layout.disableScroll(root);
    root.clickable(false);

    const title = dxui.Label.build('bootstrap_fault_title', root);
    title.setSize(layout.x(680), layout.y(90));
    title.align(dxui.Utils.ALIGN.TOP_MID, 0, layout.y(280));
    title.text('设备启动异常');
    title.textColor(theme.errorText);
    title.textFont(font.getDefault(layout.fontSize(42), dxui.Utils.FONT_STYLE.BOLD));
    title.textAlign(dxui.Utils.TEXT_ALIGN.CENTER);

    moduleLabel = dxui.Label.build('bootstrap_fault_module', root);
    moduleLabel.setSize(layout.x(680), layout.y(75));
    moduleLabel.align(dxui.Utils.ALIGN.TOP_MID, 0, layout.y(410));
    moduleLabel.textFont(font.getDefault(layout.fontSize(28), dxui.Utils.FONT_STYLE.BOLD));
    moduleLabel.textAlign(dxui.Utils.TEXT_ALIGN.CENTER);

    errorLabel = dxui.Label.build('bootstrap_fault_error', root);
    errorLabel.setSize(layout.x(650), layout.y(210));
    errorLabel.align(dxui.Utils.ALIGN.TOP_MID, 0, layout.y(510));
    errorLabel.textColor(theme.textSecondary);
    errorLabel.textFont(font.getDefault(layout.fontSize(23)));
    errorLabel.textAlign(dxui.Utils.TEXT_ALIGN.CENTER);
    errorLabel.longMode(dxui.Utils.LABEL_LONG_MODE.WRAP);

    const hint = dxui.Label.build('bootstrap_fault_hint', root);
    hint.setSize(layout.x(680), layout.y(120));
    hint.align(dxui.Utils.ALIGN.BOTTOM_MID, 0, layout.y(-260));
    hint.text('系统将由看门狗自动重启\n若多次失败，将进入系统管理模式');
    hint.textColor(theme.textSecondary);
    hint.textFont(font.getDefault(layout.fontSize(24)));
    hint.textAlign(dxui.Utils.TEXT_ALIGN.CENTER);
    hint.longMode(dxui.Utils.LABEL_LONG_MODE.WRAP);

    handlerTimer = dxStd.setInterval(function () {
        dxui.handler();
    }, HANDLER_INTERVAL_MS);
    initialized = true;
}

const faultView = {};

faultView.show = function (details) {
    if (!initialized) build();
    const value = details || {};
    moduleLabel.text('故障模块：' + cleanText(value.module || 'bootstrap', 48));
    errorLabel.text('错误信息：' + cleanText(value.message || 'unknown error', MAX_ERROR_LENGTH));
    root.show();
    // 立即执行一次handler，避免等待首个定时周期才刷新故障页面。
    dxui.handler();
    return true;
};

export default faultView;
