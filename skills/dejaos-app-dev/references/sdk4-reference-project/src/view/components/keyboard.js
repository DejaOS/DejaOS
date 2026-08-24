/**
 * @layer    view
 * @module   keyboard
 * @fires    none
 * @listens  none
 * @depends  dxUi,pinyin
 *
 * 全局软键盘门面：封装 ./pinyin/pinyin.js，为 dxui.Textarea 绑定输入。
 * placeholder 走原生 lvTextareaSetPlaceholderText（dxUi 未封装，经 input.obj 调用）。
 *
 * 键盘弹出后：
 * - 点空白遮罩 → 收起
 * - 点当前输入框（热区）→ 不变化
 * - 点同页其它已绑定且可见的输入框 → 切换焦点与对应键盘，不收起
 * - 其它页面遗留的绑定不铺热区（避免旧页数字框抢走「点外面收起」）
 * - exclusive: true 时仅当前输入有热区，适合弹层内输入
 *
 * 典型用法：
 *   const kb = keyboard.bind(null, textarea, { mode: 1, lockMode: true })
 *   kb.setEnterCb(() => { ... })
 *   keyboard.hideAll()
 */

import dxui from '../../../dxmodules/dxUi.js'
import pinyin from './pinyin/pinyin.js'

const MODE = {
    ENGLISH: 0,
    PINYIN: 1,
    NUMBER: 2,
    SYMBOL: 3,
}

/** 锁定某一模式时的默认 placeholder 提示 */
const LOCK_PLACEHOLDER = {}
LOCK_PLACEHOLDER[MODE.ENGLISH] = '只能输入英文'
LOCK_PLACEHOLDER[MODE.PINYIN] = '只能输入中文'
LOCK_PLACEHOLDER[MODE.NUMBER] = '只能输入数字'
LOCK_PLACEHOLDER[MODE.SYMBOL] = '只能输入符号'

const keyboard = {
    /** 合法模式常量，页面可用 keyboard.MODE.PINYIN 代替魔法数字 */
    MODE: MODE,
}

/** 所有 bind 注册的 binding，用于 hideExcept 互斥 */
keyboard.bindings = []
/** 当前已弹出键盘的那一项 */
let activeBinding = null
/**
 * 键盘打开时盖在 dismissMask 之上的输入框热区。
 * TOP 层遮罩会挡住 MAIN 层输入框，热区用于切换焦点而不必先关掉键盘。
 */
let inputHitAreas = []

/**
 * 通过原生 API 设置 Textarea placeholder（dxUi 未封装）。
 * @param {object} input dxui.Textarea
 * @param {string} text
 */
function setNativePlaceholder(input, text) {
    if (!input || !input.obj || typeof input.obj.lvTextareaSetPlaceholderText !== 'function') {
        return
    }
    try {
        input.obj.lvTextareaSetPlaceholderText(text || '')
    } catch (_e) {}
}

/**
 * 锁定模式下优先「只能输入xxx」；否则用业务自定义 placeholder。
 * @param {object} binding
 * @returns {string}
 */
function resolvePlaceholder(binding) {
    if (binding.locked) {
        if (binding.lockedPlaceholder) {
            return binding.lockedPlaceholder
        }
        const hint = LOCK_PLACEHOLDER[binding.mode]
        if (hint) {
            return hint
        }
    }
    return binding.placeholder || ''
}

/**
 * 按当前锁定态刷新原生 placeholder。
 * @param {object} binding
 */
function applyPlaceholder(binding) {
    if (!binding || !binding.input) {
        return
    }
    setNativePlaceholder(binding.input, resolvePlaceholder(binding))
}

/**
 * 把按键结果写入 Textarea：字符 / 退格 / 回车。
 * @param {object} binding
 * @param {string|{cmd:string}} data
 */
function applyInputData(binding, data) {
    const input = binding.input
    if (!input) {
        return
    }
    if (typeof data === 'string') {
        if (data.length > 0) {
            input.lvTextareaAddText(data)
        }
    } else if (data && typeof data === 'object') {
        if (data.cmd === 'backspace') {
            input.lvTextareaDelChar()
        } else if (data.cmd === 'enter') {
            closeActive('enter')
            return
        }
    }
    if (typeof binding.contentCb === 'function') {
        binding.contentCb(typeof data === 'string' ? data : '')
    }
    // 点键盘按键会抢走焦点，导致光标不闪；每次输入后把焦点拉回输入框
    try {
        input.focus(true)
    } catch (_e) {}
}

/** 清除输入框热区（遮罩关闭后必须删掉，否则挡住页面点击） */
function clearInputHitAreas() {
    for (let i = 0; i < inputHitAreas.length; i++) {
        try {
            dxui.del(inputHitAreas[i])
        } catch (_e) {}
    }
    inputHitAreas = []
}

/**
 * 累加相对父级坐标，得到相对屏幕的绝对位置。
 * @param {object} obj
 * @returns {{ x: number, y: number }}
 */
function getAbsPos(obj) {
    let x = 0
    let y = 0
    let cur = obj
    let guard = 0
    while (cur && guard < 40) {
        guard += 1
        try {
            if (typeof cur.update === 'function') {
                cur.update()
            }
        } catch (_e) {}
        try {
            x += Number(cur.x()) || 0
            y += Number(cur.y()) || 0
        } catch (_e) {
            break
        }
        const parentId = cur.parent
        if (parentId === undefined || parentId === null) {
            break
        }
        // 父级为图层序号（MAIN/TOP/SYS）时停止
        if (typeof parentId === 'number'
            || (typeof parentId === 'string' && /^[0-9]+$/.test(parentId))) {
            break
        }
        const parent = dxui.getParent(cur)
        if (!parent || parent === cur) {
            break
        }
        cur = parent
    }
    return { x: x, y: y }
}

/**
 * 热区尽量盖住输入框外层容器（浅底框），点击更易命中。
 * @param {object} input
 * @returns {object}
 */
function resolveHitTarget(input) {
    const parent = dxui.getParent(input)
    if (parent && typeof parent.width === 'function' && typeof parent.height === 'function') {
        try {
            if (parent.width() >= input.width() && parent.height() >= input.height()) {
                return parent
            }
        } catch (_e) {}
    }
    return input
}

/**
 * 自身或任一祖先隐藏时，不铺热区（弹层关闭后的输入框、按类型隐藏的字段等）。
 * @param {object} obj
 * @returns {boolean}
 */
function isTreeHidden(obj) {
    let cur = obj
    let guard = 0
    while (cur && guard < 40) {
        guard += 1
        try {
            if (typeof cur.isHide === 'function' && cur.isHide()) {
                return true
            }
        } catch (_e) {}
        const parentId = cur.parent
        if (parentId === undefined || parentId === null) {
            break
        }
        if (typeof parentId === 'number'
            || (typeof parentId === 'string' && /^[0-9]+$/.test(parentId))) {
            break
        }
        const parent = dxui.getParent(cur)
        if (!parent || parent === cur) {
            break
        }
        cur = parent
    }
    return false
}

/**
 * 向上找到 MAIN 层页面根（loadMain 切换后旧页仍在 bindings 里，热区必须按根隔离）。
 * @param {object} obj
 * @returns {object|null}
 */
function getScreenRoot(obj) {
    let cur = obj
    let last = obj
    let guard = 0
    while (cur && guard < 40) {
        guard += 1
        last = cur
        const parentId = cur.parent
        if (parentId === undefined || parentId === null) {
            break
        }
        if (typeof parentId === 'number'
            || (typeof parentId === 'string' && /^[0-9]+$/.test(parentId))) {
            break
        }
        const parent = dxui.getParent(cur)
        if (!parent || parent === cur) {
            break
        }
        cur = parent
    }
    return last || null
}

/**
 * @param {object} a
 * @param {object} b
 * @returns {boolean}
 */
function isSameScreen(a, b) {
    if (!a || !b) {
        return false
    }
    return getScreenRoot(a) === getScreenRoot(b)
}

/**
 * 在 TOP 层为已绑定输入框铺透明热区，便于键盘弹出时切换目标输入框。
 * exclusive 绑定时只铺当前输入；其它绑定仅限同一页面根，避免旧页数字框抢走点击。
 */
function syncInputHitAreas() {
    clearInputHitAreas()
    if (!pinyin.inited || !pinyin.dismissMask || !activeBinding) {
        return
    }
    const exclusive = !!activeBinding.exclusive
    for (let i = 0; i < keyboard.bindings.length; i++) {
        const binding = keyboard.bindings[i]
        const input = binding.input
        if (!input) {
            continue
        }
        if (exclusive && binding !== activeBinding) {
            continue
        }
        // 非当前 MAIN 页的绑定：坐标仍可能有效，热区会盖住本页「点外面收起」
        if (binding !== activeBinding && !isSameScreen(activeBinding.input, input)) {
            continue
        }
        if (isTreeHidden(input)) {
            continue
        }
        const target = resolveHitTarget(input)
        const pos = getAbsPos(target)
        let w = 0
        let h = 0
        try {
            w = target.width()
            h = target.height()
        } catch (_e) {
            continue
        }
        if (w <= 0 || h <= 0) {
            continue
        }

        const hit = dxui.View.build('kb_hit_' + i + '_' + Date.now(), dxui.Utils.LAYER.TOP)
        clearHitStyle(hit)
        hit.setSize(w, h)
        hit.setPos(pos.x, pos.y)
        hit.bgOpa(0)
        hit.clickable(true)
        hit.scroll(false)
        hit.on(dxui.Utils.EVENT.CLICK, function () {
            // 同一输入框：仅保焦，不重开键盘
            if (activeBinding === binding) {
                try {
                    binding.input.focus(true)
                } catch (_e) {}
                return
            }
            openBinding(binding)
        })
        inputHitAreas.push(hit)
    }
    for (let j = 0; j < inputHitAreas.length; j++) {
        inputHitAreas[j].moveForeground()
    }
    if (pinyin.container) {
        pinyin.container.moveForeground()
    }
}

function clearHitStyle(obj) {
    obj.radius(0)
    obj.borderWidth(0)
    obj.padAll(0)
}

/**
 * 将 binding 锁定到指定模式，并刷新原生 placeholder 为「只能输入…」。
 * @param {object} binding
 * @param {number} mode
 * @param {string} [lockedPlaceholder]
 */
function lockBindingMode(binding, mode, lockedPlaceholder) {
    if (mode !== MODE.ENGLISH && mode !== MODE.PINYIN
        && mode !== MODE.NUMBER && mode !== MODE.SYMBOL) {
        return
    }
    binding.locked = true
    binding.lockNum = mode === MODE.NUMBER
    binding.mode = mode
    if (lockedPlaceholder !== undefined) {
        binding.lockedPlaceholder = lockedPlaceholder
    }
    applyPlaceholder(binding)
}

/**
 * 取消指定输入框焦点，去掉光标闪烁。
 * @param {object|null} input
 */
function blurInput(input) {
    if (!input) {
        return
    }
    try {
        input.focus(false)
    } catch (_e) {}
}

/**
 * 关闭当前键盘并通知回调。
 * @param {'enter'|'dismiss'|'api'} reason
 */
function closeActive(reason) {
    const binding = activeBinding
    clearInputHitAreas()
    pinyin.hide()
    activeBinding = null
    if (!binding) {
        return
    }
    blurInput(binding.input)
    if (reason === 'enter' && typeof binding.enterCb === 'function') {
        binding.enterCb()
    }
    if (typeof binding.userCloseCb === 'function') {
        binding.userCloseCb()
    }
}

/**
 * 打开指定输入框的软键盘。
 * 锁定模式：打开时把 placeholder 切到「只能输入…」（空内容时由 LVGL 自动显示）。
 * @param {object} binding
 */
function openBinding(binding) {
    // 已是当前输入框且键盘开着：不重开、不闪烁
    if (activeBinding === binding) {
        try {
            binding.input.focus(true)
        } catch (_e) {}
        return
    }

    const prevBinding = activeBinding
    for (let i = 0; i < keyboard.bindings.length; i++) {
        const item = keyboard.bindings[i]
        if (item !== binding) {
            blurInput(item.input)
            if (item.parent && typeof item.parent.hide === 'function') {
                item.parent.hide()
            }
        }
    }
    if (prevBinding && prevBinding !== binding) {
        blurInput(prevBinding.input)
    }

    // 锁定项点击后确保 placeholder 为「只能输入…」提示。
    if (binding.locked) {
        applyPlaceholder(binding)
    }

    activeBinding = binding
    if (typeof binding.userOpenCb === 'function') {
        binding.userOpenCb()
    }
    pinyin.pinyinSupport(binding.pinyinEnabled !== false)
    pinyin.setDismissCb(function () {
        closeActive('dismiss')
    })
    // show() 内部会 unlock，锁定必须在 show 之后设置
    pinyin.show(binding.mode, function (data) {
        applyInputData(binding, data)
    })
    if (binding.locked) {
        pinyin.lock()
    } else {
        pinyin.unlock()
    }
    syncInputHitAreas()
    try {
        binding.input.focus(true)
    } catch (_e) {}
}

/**
 * 为单个 Textarea 绑定软键盘。
 * @param {object|null} parent
 * @param {object} input
 * @param {{ autoOpen?: boolean, mode?: number, pinyinEnabled?: boolean, placeholder?: string, lockMode?: boolean|number, lockedPlaceholder?: string, exclusive?: boolean }} [options]
 */
function bind(parent, input, options) {
    const opts = options || {}
    const binding = {
        parent: parent || null,
        input: input,
        mode: opts.mode === undefined ? MODE.ENGLISH : opts.mode,
        locked: false,
        lockNum: false,
        /** 为 true 时弹出键盘只保留本输入热区，适合弹层内输入 */
        exclusive: !!opts.exclusive,
        pinyinEnabled: opts.pinyinEnabled === undefined ? true : !!opts.pinyinEnabled,
        placeholder: opts.placeholder || '',
        lockedPlaceholder: opts.lockedPlaceholder || '',
        enterCb: null,
        userOpenCb: function () {},
        userCloseCb: function () {},
        contentCb: null,
    }
    keyboard.bindings.push(binding)

    if (parent) {
        parent.hide()
        parent.bgOpa(0)
    }

    const api = {
        open: function () {
            if (!pinyin.inited) {
                keyboard.init()
            }
            openBinding(binding)
        },
        hide: function () {
            if (activeBinding === binding) {
                closeActive('api')
            }
        },
        setEnterCb: function (cb) {
            binding.enterCb = cb
        },
        setOnOffCb: function (onCb, offCb) {
            if (onCb) {
                binding.userOpenCb = onCb
            }
            if (offCb) {
                binding.userCloseCb = offCb
            }
        },
        setContentCb: function (cb) {
            binding.contentCb = cb
        },
        setMode: function (mode) {
            if (mode === MODE.ENGLISH || mode === MODE.PINYIN
                || mode === MODE.NUMBER || mode === MODE.SYMBOL) {
                binding.mode = mode
                if (binding.locked) {
                    lockBindingMode(binding, mode)
                }
            }
        },
        setPinyinEnabled: function (enabled) {
            binding.pinyinEnabled = !!enabled
        },
        /** 设置业务 placeholder（锁定态仍优先显示「只能输入…」） */
        setPlaceholder: function (text) {
            binding.placeholder = text || ''
            applyPlaceholder(binding)
        },
        /**
         * 锁定到指定模式；placeholder 自动变为「只能输入…」。
         * @param {number} [mode]
         * @param {string} [lockedPlaceholder]
         */
        lockMode: function (mode, lockedPlaceholder) {
            const nextMode = mode === undefined ? binding.mode : mode
            lockBindingMode(binding, nextMode, lockedPlaceholder)
        },
        /** 锁定为数字键盘（兼容旧 API） */
        lockNumMode: function () {
            lockBindingMode(binding, MODE.NUMBER)
        },
        getValue: function () {
            if (!binding.input) {
                return ''
            }
            try {
                return binding.input.text() || ''
            } catch (_e) {
                return ''
            }
        },
    }

    if (opts.lockMode === true) {
        lockBindingMode(binding, binding.mode, opts.lockedPlaceholder)
    } else if (opts.lockMode === MODE.ENGLISH || opts.lockMode === MODE.PINYIN
        || opts.lockMode === MODE.NUMBER || opts.lockMode === MODE.SYMBOL) {
        lockBindingMode(binding, opts.lockMode, opts.lockedPlaceholder)
    } else {
        applyPlaceholder(binding)
    }

    if (opts.autoOpen !== false) {
        input.on(dxui.Utils.EVENT.CLICK, function () {
            api.open()
        })
    }

    return api
}

keyboard.init = function () {
    if (!pinyin.inited) {
        pinyin.init()
    }
}

keyboard.hide = function () {
    closeActive('api')
}

keyboard.hideAll = function () {
    keyboard.hide()
    for (let i = 0; i < keyboard.bindings.length; i++) {
        const item = keyboard.bindings[i]
        if (item.parent && typeof item.parent.hide === 'function') {
            item.parent.hide()
        }
    }
}

keyboard.hideExcept = function (input) {
    for (let i = 0; i < keyboard.bindings.length; i++) {
        const item = keyboard.bindings[i]
        if (item.input !== input) {
            if (item.parent && typeof item.parent.hide === 'function') {
                item.parent.hide()
            }
        }
    }
    if (activeBinding && activeBinding.input !== input) {
        closeActive('api')
    }
}

keyboard.getActiveInput = function () {
    return activeBinding ? activeBinding.input : null
}

keyboard.bind = bind
/** @deprecated 兼容 access_app 命名，等价于 bind */
keyboard.createPwd = bind

keyboard.destroy = function () {
    keyboard.hideAll()
    keyboard.bindings = []
    activeBinding = null
    clearInputHitAreas()
    pinyin.setDismissCb(null)
    pinyin.destroy()
}

export default keyboard
