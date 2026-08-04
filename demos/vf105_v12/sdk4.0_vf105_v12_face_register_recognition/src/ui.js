/**
 * ui.js — All UI for the face demo.
 *
 * Owns: screen bootstrap, status bar, tracking box, welcome label under the box,
 * enroll/clear buttons, and the LVGL handler loop.
 * Face business logic stays in main.js and calls into this module.
 */
import dxLogger from '../dxmodules/dxLogger.js'
import dxStd from '../dxmodules/dxStd.js'
import dxui from '../dxmodules/dxUi.js'
import dxDriver from '../dxmodules/dxDriver.js'
import UIManager from './UIManager.js'

/** Tracking-box border colors */
const COLOR_GRAY = 0x9e9e9e
const COLOR_GREEN = 0x00c853
const COLOR_RED = 0xff1744

const SCREEN_W = dxDriver.HAL.DISPLAY.HAL_WIDTH
const SCREEN_H = dxDriver.HAL.DISPLAY.HAL_HEIGHT

/** How long a green/red box stays before returning to gray */
const COLOR_RESET_MS = 1000
/** Hide the box after this many ms without a face */
const HIDE_BOX_MS = 1000

let statusLabel = null
let faceBox = null
let welcomeLabel = null
let colorTimer = null
let hideTimer = null
let welcomeVisible = false
/** Last on-screen box rect: { x, y, w, h } */
let lastBox = null

/**
 * Build a button with a centered label (uiButton has no direct text property).
 */
function makeButton(id, parent, text, w, h, bg) {
    const btn = dxui.Button.build(id, parent)
    btn.width(w)
    btn.height(h)
    btn.bgColor(bg)
    btn.radius(8)
    const label = dxui.Label.build(id + '_lbl', btn)
    label.text(text)
    label.textFont(UIManager.font(26))
    label.textColor(0xffffff)
    label.textAlign(dxui.Utils.TEXT_ALIGN.CENTER)
    label.align(dxui.Utils.ALIGN.CENTER, 0, 0)
    return btn
}

/**
 * Normalize facial rect from array [x,y,w,h] or object {x,y,w,h}.
 * @returns {{x:number,y:number,w:number,h:number}|null}
 */
function normalizeRect(rect) {
    if (!rect) return null
    let x, y, w, h
    if (Array.isArray(rect) && rect.length >= 4) {
        x = Number(rect[0])
        y = Number(rect[1])
        w = Number(rect[2])
        h = Number(rect[3])
    } else if (typeof rect === 'object') {
        x = Number(rect.x)
        y = Number(rect.y)
        w = Number(rect.w)
        h = Number(rect.h)
    } else {
        return null
    }
    if ([x, y, w, h].some(function (v) { return isNaN(v) }) || w <= 0 || h <= 0) {
        return null
    }
    return { x: x, y: y, w: w, h: h }
}

/**
 * Place the welcome label centered under the tracking box (or above if near bottom).
 */
function positionWelcome(boxX, boxY, boxW, boxH) {
    if (!welcomeLabel) return
    const labelW = Math.max(boxW, 220)
    let labelX = Math.floor(boxX + (boxW - labelW) / 2)
    let labelY = boxY + boxH + 10
    if (labelX < 0) labelX = 0
    if (labelX + labelW > SCREEN_W) labelX = SCREEN_W - labelW
    if (labelY + 40 > SCREEN_H) labelY = Math.max(0, boxY - 44)
    welcomeLabel.width(labelW)
    welcomeLabel.setPos(labelX, labelY)
    if (typeof welcomeLabel.moveForeground === 'function') {
        welcomeLabel.moveForeground()
    }
}

const ui = {}

ui.COLOR_GRAY = COLOR_GRAY
ui.COLOR_GREEN = COLOR_GREEN
ui.COLOR_RED = COLOR_RED

/**
 * Initialize dxUi + UIManager and build the single demo screen.
 * @param {{onEnroll:Function,onClear:Function}} handlers
 */
ui.init = function (handlers) {
    dxui.init({ orientation: dxDriver.HAL.DISPLAY.HAL_ROTATION }, {})
    UIManager.init()
    UIManager.getRoot().bgOpa(0)

    const root = dxui.View.build('main_root', UIManager.getRoot())
    root.width(SCREEN_W)
    root.height(SCREEN_H)
    root.bgOpa(0)
    root.borderWidth(0)
    root.padAll(0)
    root.scroll(false)
    root.radius(0)
    root.show()

    // --- Top status bar ---
    const topBar = dxui.View.build('top_bar', root)
    topBar.width(SCREEN_W)
    topBar.height(140)
    topBar.setPos(0, 0)
    topBar.bgColor(0x0d1117)
    topBar.bgOpa(180)
    topBar.borderWidth(0)
    topBar.radius(0)
    topBar.padAll(0)
    topBar.scroll(false)

    const title = dxui.Label.build('title', topBar)
    title.text('Face Recognition Demo')
    title.textFont(UIManager.font(34))
    title.textColor(0xffffff)
    title.align(dxui.Utils.ALIGN.TOP_MID, 0, 24)

    statusLabel = dxui.Label.build('status', topBar)
    statusLabel.text('Initializing...')
    statusLabel.textFont(UIManager.font(24))
    statusLabel.textColor(0xd0d7de)
    statusLabel.align(dxui.Utils.ALIGN.TOP_MID, 0, 80)

    // --- Face tracking box (transparent fill, colored border) ---
    faceBox = dxui.View.build('face_box', root)
    faceBox.bgOpa(0)
    faceBox.radius(0)
    faceBox.padAll(0)
    faceBox.borderWidth(6)
    faceBox.borderColor(COLOR_GRAY)
    faceBox.setSize(240, 240)
    faceBox.setPos(280, 420)
    faceBox.clickable(false)
    faceBox.hide()

    // --- Welcome text under the tracking box ---
    welcomeLabel = dxui.Label.build('welcome', root)
    welcomeLabel.text('')
    welcomeLabel.textFont(UIManager.font(28))
    welcomeLabel.textColor(COLOR_GREEN)
    welcomeLabel.textAlign(dxui.Utils.TEXT_ALIGN.CENTER)
    welcomeLabel.width(280)
    welcomeLabel.height(40)
    welcomeLabel.clickable(false)
    welcomeLabel.hide()

    // --- Bottom action bar ---
    const bottomBar = dxui.View.build('bottom_bar', root)
    bottomBar.width(SCREEN_W)
    bottomBar.height(200)
    bottomBar.setPos(0, SCREEN_H - 200)
    bottomBar.bgColor(0x0d1117)
    bottomBar.bgOpa(180)
    bottomBar.borderWidth(0)
    bottomBar.radius(0)
    bottomBar.padAll(0)
    bottomBar.scroll(false)

    const enrollBtn = makeButton('enroll_btn', bottomBar, 'Enroll Face', 320, 64, 0x238636)
    enrollBtn.align(dxui.Utils.ALIGN.TOP_MID, 0, 28)
    enrollBtn.on(dxui.Utils.EVENT.CLICK, function () {
        if (handlers && typeof handlers.onEnroll === 'function') {
            handlers.onEnroll()
        }
    })

    const clearBtn = makeButton('clear_btn', bottomBar, 'Clear All Faces', 320, 64, 0xa40e26)
    clearBtn.align(dxui.Utils.ALIGN.TOP_MID, 0, 108)
    clearBtn.on(dxui.Utils.EVENT.CLICK, function () {
        if (handlers && typeof handlers.onClear === 'function') {
            handlers.onClear()
        }
    })

    dxLogger.info('[ui] screen ready')
}

/** Start the LVGL refresh loop (~60 fps). */
ui.startLoop = function () {
    dxStd.setInterval(function () {
        try {
            dxui.handler()
        } catch (e) {
            dxLogger.error('[ui] handler: ' + (e && e.message ? e.message : e))
        }
    }, 16)
}

/** Update the top status line. */
ui.setStatus = function (text) {
    if (statusLabel) {
        statusLabel.text(String(text || ''))
    }
}

/**
 * Move / show the tracking box from a facial rect.
 * Pass null to schedule hide after HIDE_BOX_MS.
 * @param {Array|object|null} rect
 */
ui.updateFaceBox = function (rect) {
    if (!faceBox) return

    const r = normalizeRect(rect)
    if (!r) {
        if (hideTimer === null) {
            hideTimer = dxStd.setTimeout(function () {
                hideTimer = null
                if (faceBox) faceBox.hide()
                ui.hideWelcome()
                lastBox = null
            }, HIDE_BOX_MS)
        }
        return
    }

    if (hideTimer !== null) {
        dxStd.clearTimeout(hideTimer)
        hideTimer = null
    }

    // Clamp to screen so the box stays visible
    const x = Math.max(0, Math.min(r.x, SCREEN_W - 20))
    const y = Math.max(0, Math.min(r.y, SCREEN_H - 20))
    const w = Math.max(20, Math.min(r.w, SCREEN_W - x))
    const h = Math.max(20, Math.min(r.h, SCREEN_H - y))
    lastBox = { x: x, y: y, w: w, h: h }

    faceBox.setPos(x, y)
    faceBox.setSize(w, h)
    if (typeof faceBox.moveForeground === 'function') {
        faceBox.moveForeground()
    }
    faceBox.show()

    // Keep welcome text glued under the box while it is visible
    if (welcomeVisible) {
        positionWelcome(x, y, w, h)
    }
}

/**
 * Set tracking-box border color.
 * Green/red auto-reset to gray after COLOR_RESET_MS and hide the welcome text.
 * @param {number} color
 */
ui.setBoxColor = function (color) {
    if (!faceBox) return
    faceBox.borderColor(color)

    if (colorTimer !== null) {
        dxStd.clearTimeout(colorTimer)
        colorTimer = null
    }

    if (color === COLOR_GRAY) {
        ui.hideWelcome()
        return
    }

    colorTimer = dxStd.setTimeout(function () {
        colorTimer = null
        if (faceBox) faceBox.borderColor(COLOR_GRAY)
        ui.hideWelcome()
    }, COLOR_RESET_MS)
}

/**
 * Show welcome text under the current tracking box.
 * No-op if the box position is unknown yet.
 */
ui.showWelcome = function (text) {
    if (!welcomeLabel || !lastBox) return
    welcomeVisible = true
    welcomeLabel.text(String(text || ''))
    positionWelcome(lastBox.x, lastBox.y, lastBox.w, lastBox.h)
    welcomeLabel.show()
    if (typeof welcomeLabel.moveForeground === 'function') {
        welcomeLabel.moveForeground()
    }
}

/** Hide the welcome label. */
ui.hideWelcome = function () {
    welcomeVisible = false
    if (welcomeLabel) {
        welcomeLabel.hide()
        welcomeLabel.text('')
    }
}

/** Immediately hide the tracking box and welcome text. */
ui.hideFaceBox = function () {
    if (hideTimer !== null) {
        dxStd.clearTimeout(hideTimer)
        hideTimer = null
    }
    if (faceBox) faceBox.hide()
    ui.hideWelcome()
    lastBox = null
}

export default ui
