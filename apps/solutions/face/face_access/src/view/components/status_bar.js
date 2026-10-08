/**
 * @layer    view
 * @module   status_bar
 * @fires    none
 * @listens  none
 * @depends  dxUi,dxStd,font,layout,theme,assets,datetime
 *
 * 全局顶栏（TOP 层）：左时钟、右通话中/网络/MQTT 图标。
 * 跨页面常驻，不随 MAIN 层切页销毁。
 * 网络图标按类型切换：以太网 / WiFi / 4G。
 * 右侧图标容器用 flex 排布，隐藏项不占位，可见图标靠右排队。
 * 色调：暗底（预览首页）用白字白标；白底（设置/密码/通话等）用不透明黑字黑标。
 */

import dxui from '../../../dxmodules/dxUi.js';
import dxStd from '../../../dxmodules/dxStd.js';
import font from './font.js';
import layout from './layout.js';
import theme from './theme.js';
import { asset } from '../utils/assets.js';
import { formatDateTime } from '../utils/datetime.js';
import { isLandscape } from '../orientation.js';

/** @typedef {'ethernet'|'wifi'|'cellular'} NetworkIconType */
/** @typedef {'dark'|'light'} StatusTone */

const IMG_NET_WHITE = {
    ethernet: asset('ethernet.png'),
    wifi: asset('wifi-02.png'),
    cellular: asset('mobiledata.png'),
};
const IMG_NET_BLACK = {
    ethernet: asset('ethernet_black.png'),
    wifi: asset('wifi-02_black.png'),
    cellular: asset('mobiledata_black.png'),
};
const IMG_MQTT_WHITE = asset('mqtt.png');
const IMG_MQTT_BLACK = asset('mqtt_black.png');
const IMG_CALL_WHITE = asset('proicons--call.png');
const IMG_CALL_BLACK = asset('proicons--call_black.png');

const landscape = isLandscape();
const BAR_H = landscape ? 52 : 70;
const CLOCK_INTERVAL_MS = 1000;
/** 状态图标素材随 DRIVER.MODEL（VF105/VF201）选包加载 */
const ICON_SIZE = 32;
const ICON_GAP = 10;
/** 时钟与右侧图标同一顶边距 */
const TOP_PAD = landscape ? 10 : 22;
const ICON_RIGHT = 20;
const CLOCK_FONT = landscape ? 20 : 22;
/** 最多 3 个图标的占位宽度，保证靠右对齐 */
const ICON_ROW_W = ICON_SIZE * 3 + ICON_GAP * 2;

let initialized = false;
let root = null;
let clockLabel = null;
let iconRow = null;
let callIcon = null;
let netIcon = null;
let mqttIcon = null;
let clockTimer = null;
/** 当前网络图标类型，避免重复 source */
let paintedNetType = 'ethernet';
/** @type {StatusTone} 当前色调；dark=白标，light=黑标 */
let tone = 'dark';
/** 强制下次 paint 刷新图标 source */
let forceIconSource = true;

/** @type {{ networkConnected: boolean, mqttConnected: boolean, networkType: NetworkIconType, inCall: boolean }} */
const status = {
    networkConnected: false,
    mqttConnected: false,
    networkType: 'ethernet',
    inCall: false,
};

/**
 * @param {*} value
 * @returns {NetworkIconType|null}
 */
function normalizeNetworkType(value) {
    if (value === 'ethernet' || value === 'wifi' || value === 'cellular') {
        return value;
    }
    // 兼容驱动层 NET_TYPE 数值
    if (value === 1) {
        return 'ethernet';
    }
    if (value === 2) {
        return 'wifi';
    }
    if (value === 4) {
        return 'cellular';
    }
    return null;
}

function netIcons() {
    return tone === 'light' ? IMG_NET_BLACK : IMG_NET_WHITE;
}

function mqttIconSrc() {
    return tone === 'light' ? IMG_MQTT_BLACK : IMG_MQTT_WHITE;
}

function callIconSrc() {
    return tone === 'light' ? IMG_CALL_BLACK : IMG_CALL_WHITE;
}

function tickClock() {
    if (clockLabel) {
        clockLabel.text(formatDateTime(new Date()));
    }
}

/**
 * @param {object|null} icon
 * @param {boolean} visible
 */
function setIconVisible(icon, visible) {
    if (!icon) {
        return;
    }
    if (visible) {
        icon.show();
    } else {
        icon.hide();
    }
}

function applyToneStyle() {
    if (!clockLabel) {
        return;
    }
    // 暗底白字；白底主文案黑。
    clockLabel.textColor(tone === 'light' ? theme.textPrimary : theme.textOnDark);
}

function paintIcons() {
    if (!netIcon || !mqttIcon || !callIcon) {
        return;
    }
    const nets = netIcons();
    const type = status.networkType;
    const netSrc = nets[type] || nets.ethernet;
    if (forceIconSource) {
        callIcon.source(callIconSrc());
        mqttIcon.source(mqttIconSrc());
        // 断网时图标虽隐藏，也必须换色调素材；否则之后联网显示会残留上一色调。
        netIcon.source(netSrc);
        paintedNetType = type;
    }
    setIconVisible(callIcon, status.inCall === true);
    if (status.networkConnected) {
        if (forceIconSource || paintedNetType !== type) {
            netIcon.source(netSrc);
            paintedNetType = type;
        }
        setIconVisible(netIcon, true);
    } else {
        setIconVisible(netIcon, false);
    }
    setIconVisible(mqttIcon, status.mqttConnected === true);
    forceIconSource = false;
}

const statusBar = {};

/**
 * 构建 TOP 层状态栏并启动时钟刷新（全应用只调用一次）。
 */
statusBar.init = function () {
    if (initialized) {
        return;
    }

    root = dxui.View.build('ui_status_bar', dxui.Utils.LAYER.TOP);
    root.setSize(layout.width, layout.y(BAR_H));
    root.setPos(0, 0);
    layout.clearStyle(root);
    root.bgOpa(0);
    root.scroll(false);
    // 顶栏不抢下层点击；本栏控件本身也无需点击。
    root.clickable(false);

    clockLabel = dxui.Label.build('ui_status_clock', root);
    clockLabel.setSize(layout.x(420), layout.y(40));
    clockLabel.setPos(layout.x(20), layout.y(TOP_PAD));
    clockLabel.textFont(font.getDefault(layout.fontSize(CLOCK_FONT)));
    clockLabel.textAlign(dxui.Utils.TEXT_ALIGN.LEFT);
    clockLabel.clickable(false);
    applyToneStyle();
    tickClock();

    // 右侧图标行：flex + END，隐藏后剩余图标靠右排队。
    const baseW = layout.getResolution().baseWidth;
    iconRow = dxui.View.build('ui_status_icons', root);
    layout.clearStyle(iconRow);
    iconRow.setSize(layout.x(ICON_ROW_W), layout.y(ICON_SIZE));
    iconRow.setPos(layout.x(baseW - ICON_RIGHT - ICON_ROW_W), layout.y(TOP_PAD));
    iconRow.bgOpa(0);
    iconRow.scroll(false);
    iconRow.clickable(false);
    iconRow.flexFlow(dxui.Utils.FLEX_FLOW.ROW);
    iconRow.flexAlign(
        dxui.Utils.FLEX_ALIGN.END,
        dxui.Utils.FLEX_ALIGN.CENTER,
        dxui.Utils.FLEX_ALIGN.CENTER
    );
    iconRow.obj.lvObjSetStylePadGap(
        layout.x(ICON_GAP),
        dxui.Utils.ENUM._LV_STYLE_STATE_CMP_SAME
    );

    callIcon = dxui.Image.build('ui_status_call', iconRow);
    callIcon.source(callIconSrc());
    callIcon.setSize(layout.x(ICON_SIZE), layout.y(ICON_SIZE));
    callIcon.clickable(false);
    callIcon.hide();

    paintedNetType = status.networkType;
    netIcon = dxui.Image.build('ui_status_net', iconRow);
    netIcon.source(netIcons()[paintedNetType] || netIcons().ethernet);
    netIcon.setSize(layout.x(ICON_SIZE), layout.y(ICON_SIZE));
    netIcon.clickable(false);
    netIcon.hide();

    mqttIcon = dxui.Image.build('ui_status_mqtt', iconRow);
    mqttIcon.source(mqttIconSrc());
    mqttIcon.setSize(layout.x(ICON_SIZE), layout.y(ICON_SIZE));
    mqttIcon.clickable(false);
    mqttIcon.hide();

    forceIconSource = false;
    paintIcons();

    clockTimer = dxStd.setInterval(function () {
        tickClock();
    }, CLOCK_INTERVAL_MS);

    root.show();
    initialized = true;
};

/**
 * 更新连接态图标显隐与网络类型图标。
 * @param {{ networkConnected?: boolean, mqttConnected?: boolean, networkType?: NetworkIconType|number, inCall?: boolean }} partial
 * @returns {boolean}
 */
statusBar.applyStatus = function (partial) {
    if (!partial || typeof partial !== 'object') {
        return false;
    }
    if (typeof partial.networkConnected === 'boolean') {
        status.networkConnected = partial.networkConnected;
    }
    if (typeof partial.mqttConnected === 'boolean') {
        status.mqttConnected = partial.mqttConnected;
    }
    if (typeof partial.inCall === 'boolean') {
        status.inCall = partial.inCall;
    }
    const nextType = normalizeNetworkType(partial.networkType);
    if (nextType) {
        status.networkType = nextType;
    }
    if (initialized) {
        paintIcons();
    }
    return true;
};

/**
 * 切换顶栏色调。
 * @param {StatusTone} next 'dark' 暗底白标；'light' 白底黑标
 * @returns {boolean}
 */
statusBar.setTone = function (next) {
    const nextTone = next === 'light' ? 'light' : 'dark';
    if (tone === nextTone) {
        return true;
    }
    tone = nextTone;
    forceIconSource = true;
    if (initialized) {
        applyToneStyle();
        paintIcons();
    }
    return true;
};

/**
 * @returns {StatusTone}
 */
statusBar.getTone = function () {
    return tone;
};

/**
 * 通话中指示：右上角显示 / 隐藏通话图标。
 * @param {boolean} inCall
 * @returns {boolean}
 */
statusBar.setInCall = function (inCall) {
    return statusBar.applyStatus({ inCall: !!inCall });
};

/**
 * 顶栏逻辑高度（设计稿像素经 layout.y 后的屏高），供页面避开顶栏布局。
 * @returns {number}
 */
statusBar.height = function () {
    return layout.y(BAR_H);
};

statusBar.destroy = function () {
    if (!initialized) {
        return;
    }
    if (clockTimer) {
        dxStd.clearInterval(clockTimer);
        clockTimer = null;
    }
    dxui.del(root);
    root = null;
    clockLabel = null;
    iconRow = null;
    callIcon = null;
    netIcon = null;
    mqttIcon = null;
    paintedNetType = 'ethernet';
    tone = 'dark';
    forceIconSource = true;
    status.inCall = false;
    initialized = false;
};

export default statusBar;
