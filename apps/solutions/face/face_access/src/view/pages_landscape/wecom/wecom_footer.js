/**
 * @layer    view
 * @module   wecom_footer
 * @fires    none
 * @listens  none
 * @depends  dxUi,font,layout,theme
 *
 * 企微引导/绑定页共用底栏：左 SN:、右 IP:（纯展示，无点击）。
 * SN/IP 与标品首页同源，由 ui_driver 推送。
 */

import dxui from '../../../../dxmodules/dxUi.js';
import font from '../../components/font.js';
import layout from '../../components/layout.js';
import theme from '../../components/theme.js';

/** 底栏初始为空，由 ui_driver 与首页同源推送 SN/IP */
const EMPTY_SN = '';
const EMPTY_IP = '';

const BAR_H = 48;
const LABEL_H = 28;

/**
 * 企微页共用：缓存 SN/IP，有底栏则下发（create 前也可写缓存）。
 * @param {{ _status?: { sn: string, ip: string }, _footer?: { setStatus: Function }|null }} page
 * @param {{ sn?: string, ip?: string }} partial
 * @returns {boolean}
 */
export function applyWecomPanelStatus(page, partial) {
    if (!page._status) {
        page._status = { sn: EMPTY_SN, ip: EMPTY_IP };
    }
    if (!partial || typeof partial !== 'object') {
        return true;
    }
    if (typeof partial.sn === 'string') {
        page._status.sn = partial.sn;
    }
    if (typeof partial.ip === 'string') {
        page._status.ip = partial.ip;
    }
    if (page._footer) {
        page._footer.setStatus(page._status);
    }
    return true;
}

/**
 * @param {object} parent
 * @param {string} idPrefix
 * @returns {{
 *   bar: object,
 *   snLabel: object,
 *   ipLabel: object,
 *   setStatus: function({ sn?: string, ip?: string }): void,
 *   paint: function(): void,
 *   height: function(): number
 * }}
 */
export function buildWecomFooter(parent, idPrefix) {
    const status = {
        sn: EMPTY_SN,
        ip: EMPTY_IP,
    };

    const bar = dxui.View.build(idPrefix + '_bottom_bar', parent);
    bar.setSize(layout.width, layout.y(BAR_H));
    bar.align(dxui.Utils.ALIGN.BOTTOM_MID, 0, 0);
    layout.clearStyle(bar);
    bar.bgColor(0x000000);
    bar.bgOpa(100);
    bar.scroll(false);
    bar.clickable(false);

    const snLabel = dxui.Label.build(idPrefix + '_sn', bar);
    layout.clearStyle(snLabel);
    snLabel.setSize(layout.x(560), layout.y(LABEL_H));
    snLabel.align(dxui.Utils.ALIGN.LEFT_MID, layout.x(20), 0);
    snLabel.textFont(font.getDefault(layout.fontSize(18)));
    snLabel.textColor(theme.textOnDark);
    snLabel.textAlign(dxui.Utils.TEXT_ALIGN.LEFT);
    snLabel.longMode(dxui.Utils.LABEL_LONG_MODE.SCROLL_CIRCULAR);

    const ipLabel = dxui.Label.build(idPrefix + '_ip', bar);
    layout.clearStyle(ipLabel);
    ipLabel.setSize(layout.x(400), layout.y(LABEL_H));
    ipLabel.align(dxui.Utils.ALIGN.RIGHT_MID, -layout.x(20), 0);
    ipLabel.textFont(font.getDefault(layout.fontSize(18)));
    ipLabel.textColor(theme.textOnDark);
    ipLabel.textAlign(dxui.Utils.TEXT_ALIGN.RIGHT);
    ipLabel.longMode(dxui.Utils.LABEL_LONG_MODE.SCROLL_CIRCULAR);

    function paint() {
        snLabel.text('SN:' + (status.sn || ''));
        ipLabel.text('IP:' + (status.ip || ''));
    }

    /**
     * @param {{ sn?: string, ip?: string }} partial
     */
    function setStatus(partial) {
        if (!partial || typeof partial !== 'object') {
            return;
        }
        if (typeof partial.sn === 'string') {
            status.sn = partial.sn;
        }
        if (typeof partial.ip === 'string') {
            status.ip = partial.ip;
        }
        paint();
    }

    paint();

    return {
        bar: bar,
        snLabel: snLabel,
        ipLabel: ipLabel,
        setStatus: setStatus,
        paint: paint,
        height: function () {
            return layout.y(BAR_H);
        },
    };
}
