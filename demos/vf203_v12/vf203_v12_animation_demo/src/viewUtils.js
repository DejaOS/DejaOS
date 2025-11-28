import dxui from '../dxmodules/dxUi.js'
import std from '../dxmodules/dxStd.js'

const viewUtils = {}

// Universal wrapper, available for all UI-enabled devices
// Do not recreate font files
const fonts = []
viewUtils.font = function (size, style) {
    const arr = fonts.filter(v => v.size == size && v.style == style)
    if (arr.length > 0) {
        return arr[0].font
    } else {
        size = size || 14
        style = style || dxui.Utils.FONT_STYLE.NORMAL
        const font = dxui.Font.build('/app/code/resource/font/font.ttf', size, style)
        fonts.push({
            size, style, font
        })
        return font
    }
}

// Simplify element creation steps
viewUtils.create = (parent, type) => {
    type = type || "View"
    // LVGL three-layer screen structure
    switch (parent) {
        case "top":
            parent = dxui.Utils.LAYER.TOP
            break;
        case "sys":
            parent = dxui.Utils.LAYER.SYS
            break;
        case "act":
            parent = dxui.Utils.LAYER.MAIN
            break;
    }
    let obj
    switch (type) {
        case "Qrcode":
            obj = {
                side: v => {
                    obj._side = v
                    return obj
                },
                color: (c1, c2) => {
                    obj._c1 = c1
                    obj._c2 = c2
                    return obj
                },
                text: (text) => {
                    if (!obj._obj) {
                        obj._obj = dxui.Utils.GG.NativeBasicComponent.lvQrcodeCreate(parent.obj, obj._side, obj._c1, obj._c2)
                    }
                    dxui.Utils.GG.NativeBasicComponent.lvQrcodeUpdate(obj._obj, text)
                }
            }
            break;
        case "View":
            obj = dxui.View.build(std.genRandomStr(10), parent)
            obj.load = (cb) => obj.on(dxui.Utils.ENUM.LV_EVENT_SCREEN_LOADED, cb)
            obj.unload = (cb) => obj.on(dxui.Utils.ENUM.LV_EVENT_SCREEN_UNLOADED, cb)
            break;
        default:
            obj = dxui[type].build(std.genRandomStr(10), parent)
            break;
    }
    // Chain programming
    obj = viewUtils.chain(obj)

    // Refactor align method
    if (obj.align) {
        Object.keys(dxui.Utils.ALIGN).forEach(key => {
            obj[key.toLowerCase()] = (offsetX, offsetY) => {
                obj.align(dxui.Utils.ALIGN[key], offsetX || 0, offsetY || 0)
            };
        });
    }
    // Refactor alignTo method
    if (obj.alignTo) {
        Object.keys(dxui.Utils.ALIGN).forEach(key => {
            obj[key.toLowerCase() + '_to'] = (target, offsetX, offsetY) => {
                obj.alignTo(target, dxui.Utils.ALIGN[key], offsetX || 0, offsetY || 0)
            };
        });
    }
    // Refactor flexFlow method
    if (obj.flexFlow) {
        obj.flex = (data) => {
            // Main axis direction
            obj.flexFlow(dxui.Utils.FLEX_FLOW[data.flow])
            // Main axis alignment, cross axis alignment, track alignment for multi-row/column
            let align0 = data.align[0]
            let align1 = data.align[1] || align0
            let align2 = data.align[2] || align1
            obj.flexAlign(dxui.Utils.FLEX_ALIGN[align0], dxui.Utils.FLEX_ALIGN[align1], dxui.Utils.FLEX_ALIGN[align2])
        }
    }
    // Refactor event listener method
    if (obj.on) {
        obj.click = (cb) => {
            obj.on(dxui.Utils.EVENT.CLICK, cb)
        }
    }
    // APIs added subsequently
    obj.padGap = (pad) => {
        obj.obj.lvObjSetStylePadGap(pad, dxui.Utils.ENUM._LV_STYLE_STATE_CMP_SAME)
    }
    // Clear some basic styles
    obj.clearStyle = () => {
        obj.radius(0)
        obj.borderWidth(0)
        obj.padAll(0)
    }
    // Quick font setting
    obj.font = (size, style) => {
        obj.textFont(viewUtils.font(size, style))
    }
    return obj
}

// Chain programming
viewUtils.chain = (obj) => {
    // Proxy obj, if the method returns undefined, return obj itself to implement method chaining
    return new Proxy(obj, {
        get(target, prop, receiver) {
            const value = target[prop];
            if (typeof value === 'function') {
                return function (...args) {
                    const result = value.apply(target, args);
                    return result === undefined ? receiver : result;
                }
            }
            return value;
        }
    });
}

export default viewUtils
