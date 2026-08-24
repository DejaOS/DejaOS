/**
 * @layer    view
 * @module   loading_spinner
 * @fires    none
 * @listens  none
 * @depends  dxUi,dxStd,layout,theme
 *
 * 复刻 svg-spinners「12-dots-scale-rotate」：
 * - 12 点错峰缩放（Utils.anime + backDuration）
 * - 整组绕圆心公转（另起一条 anime 改轨道角，不依赖 transform）
 */

import dxui from '../../../dxmodules/dxUi.js';
import dxStd from '../../../dxmodules/dxStd.js';
import layout from './layout.js';
import theme from './theme.js';

/** 圆点数量（与 svg-spinners 一致） */
const DOT_COUNT = 12;
/** 单程缩放时长（ms），原 SVG 约 0.6s */
const PULSE_MS = 600;
/** 相邻点启动错峰（ms），原 SVG 约 0.1s */
const STAGGER_MS = 100;
/** 整组旋转一圈（ms），原 SVG 约 6s */
const ROTATE_MS = 6000;
/** LVGL LV_ANIM_REPEAT_INFINITE */
const ANIM_REPEAT_INFINITE = 0xffff;

/**
 * @param {object} dot
 * @param {number} size
 */
function applyDotSize(dot, size) {
    const s = Math.max(1, Math.round(size));
    dot._size = s;
    dot.setSize(s, s);
    dot.radius(Math.floor(s / 2));
    dot.setPos(Math.round(dot._cx - s / 2), Math.round(dot._cy - s / 2));
}

const loadingSpinner = {};

/**
 * 在 parent 上构建加载动画。
 *
 * @param {object} parent
 * @param {object} [options]
 * @param {string} [options.idPrefix='loading_spinner']
 * @param {number} [options.size] 外接正方形边长（屏像素）
 * @param {number} [options.color] 圆点颜色
 * @returns {{ root: object, start: Function, stop: Function, show: Function, hide: Function }}
 */
loadingSpinner.build = function (parent, options) {
    const opts = options || {};
    const idPrefix = opts.idPrefix || 'loading_spinner';
    const size = opts.size || layout.x(96);
    const color = opts.color !== undefined ? opts.color : theme.textSecondary;

    const root = dxui.View.build(idPrefix, parent);
    root.setSize(size, size);
    layout.clearStyle(root);
    root.bgOpa(0);
    root.scroll(false);
    root.clickable(false);

    const cx = size / 2;
    const cy = size / 2;
    /** 轨道半径：对应 24 视口里约 9px */
    const orbit = size * (9 / 24);
    /** 最大点径：对应视口 r≈2，设备上略放大保证可见 */
    const maxDot = Math.max(6, Math.round(size * (4 / 24)));
    const minDot = Math.max(2, Math.round(maxDot * 0.25));

    /** @type {object[]} */
    const dots = [];
    /** @type {object[]} */
    const pulseAnims = [];
    /** @type {object|null} */
    let rotateAnim = null;
    /** @type {any[]} */
    const startTimers = [];
    /** 当前公转角度（度） */
    let rotateDeg = 0;
    let running = false;

    for (let i = 0; i < DOT_COUNT; i++) {
        const dot = dxui.View.build(idPrefix + '_dot_' + i, root);
        layout.clearStyle(dot);
        dot.bgColor(color);
        dot.bgOpa(100);
        dot.borderWidth(0);
        dot.clickable(false);
        dot._baseDeg = (i * 30) - 90;
        dot._cx = cx;
        dot._cy = cy;
        applyDotSize(dot, minDot);
        dots.push(dot);
        pulseAnims.push(null);
    }

    /**
     * 按公转角刷新 12 点圆心，并保持各自当前缩放。
     * @param {number} deg
     */
    function placeDots(deg) {
        rotateDeg = deg;
        for (let i = 0; i < DOT_COUNT; i++) {
            const angle = (dots[i]._baseDeg + deg) * Math.PI / 180;
            dots[i]._cx = cx + orbit * Math.cos(angle);
            dots[i]._cy = cy + orbit * Math.sin(angle);
            applyDotSize(dots[i], dots[i]._size || minDot);
        }
    }

    function clearStartTimers() {
        for (let i = 0; i < startTimers.length; i++) {
            dxStd.clearTimeout(startTimers[i]);
        }
        startTimers.length = 0;
    }

    function clearPulseAnims() {
        for (let i = 0; i < pulseAnims.length; i++) {
            if (pulseAnims[i]) {
                try {
                    pulseAnims[i].lvAnimDel();
                } catch (_e) {}
                pulseAnims[i] = null;
            }
        }
    }

    function clearRotateAnim() {
        if (rotateAnim) {
            try {
                rotateAnim.lvAnimDel();
            } catch (_e) {}
            rotateAnim = null;
        }
    }

    function resetDots() {
        placeDots(0);
        for (let i = 0; i < dots.length; i++) {
            applyDotSize(dots[i], minDot);
        }
    }

    function start() {
        if (running) {
            return;
        }
        running = true;
        root.show();
        clearStartTimers();
        clearPulseAnims();
        clearRotateAnim();
        resetDots();

        // 整组绕圆心逆时针公转（屏坐标 y 向下，角度递减）
        rotateAnim = dxui.Utils.anime(
            { id: idPrefix + '_rotate' },
            0,
            -360,
            function (_obj, v) {
                placeDots(v);
            },
            ROTATE_MS,
            null,
            ANIM_REPEAT_INFINITE,
            'linear'
        );

        for (let i = 0; i < DOT_COUNT; i++) {
            (function (index) {
                const timer = dxStd.setTimeout(function () {
                    if (!running) {
                        return;
                    }
                    if (pulseAnims[index]) {
                        try {
                            pulseAnims[index].lvAnimDel();
                        } catch (_e) {}
                    }
                    pulseAnims[index] = dxui.Utils.anime(
                        dots[index],
                        minDot,
                        maxDot,
                        function (obj, v) {
                            applyDotSize(obj, v);
                        },
                        PULSE_MS,
                        PULSE_MS,
                        ANIM_REPEAT_INFINITE,
                        'ease_in_out'
                    );
                }, STAGGER_MS * index);
                startTimers.push(timer);
            })(i);
        }
    }

    function stop() {
        if (!running) {
            root.hide();
            return;
        }
        running = false;
        clearStartTimers();
        clearPulseAnims();
        clearRotateAnim();
        resetDots();
        root.hide();
    }

    placeDots(0);
    root.hide();

    return {
        root: root,
        start: start,
        stop: stop,
        show: start,
        hide: stop,
    };
};

export default loadingSpinner;
