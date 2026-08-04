/**
 * main.js — Minimal face enroll / recognize demo (VF105_V12, SDK 4.0).
 *
 * Responsibilities:
 *   - Init image pipeline with default component configs
 *   - Handle detection / recognition events
 *   - Enroll a new face feature and clear the feature DB
 *
 * All UI (status, tracking box, welcome label, buttons) lives in ui.js.
 *
 * Init order required by SDK 4.0:
 *   dxCapturer -> dxIvcore -> dxDisplay -> dxFacial
 */
import dxLogger from '../dxmodules/dxLogger.js'
import dxCapturer from '../dxmodules/dxCapturer.js'
import dxIvcore from '../dxmodules/dxIvcore.js'
import dxDisplay from '../dxmodules/dxDisplay.js'
import dxFacial from '../dxmodules/dxFacial.js'
import ui from './ui.js'

/** App mode: idle recognition vs active enrollment capture */
let mode = 'recognize'
let enrollBusy = false
/** Monotonic id counter for new enrollments in this process */
let enrollSeq = 0
/** Dedup map: userId -> last recognition timestamp (ms) */
const lastSeen = {}

/**
 * Detection callback (high frequency).
 * Updates the on-screen tracking box from the first detected face.
 */
function onDetection(data) {
    const faces = Array.isArray(data) ? data : (data && data.rect ? [data] : [])
    if (!faces.length) {
        ui.updateFaceBox(null)
        return
    }
    ui.updateFaceBox(faces[0].rect)
}

/**
 * Recognition callback.
 * - Registered face (isRec): green box + welcome under the box
 * - Unknown face: red box, no welcome
 * Box color resets to gray after ~1s (handled in ui.js).
 */
function onRecognition(data) {
    const raw = data || {}
    const isRegistered = !!raw.isRec
    const userId = raw.userId != null ? String(raw.userId) : ''

    if (raw.rect) {
        ui.updateFaceBox(raw.rect)
    }
    ui.setBoxColor(isRegistered ? ui.COLOR_GREEN : ui.COLOR_RED)

    if (mode !== 'recognize' || !isRegistered || !userId) {
        ui.hideWelcome()
        return
    }

    // Avoid spamming the same user every frame
    const now = Date.now()
    if (lastSeen[userId] && now - lastSeen[userId] < 2000) {
        return
    }
    lastSeen[userId] = now

    dxLogger.info('[main] recognized userId=' + userId)
    ui.setStatus('Recognized: ' + userId)
    ui.showWelcome('Welcome, ' + userId)
}

/**
 * Initialize capturer / ivcore / display / facial with default options.
 * Events are registered before facial.init so early callbacks are not missed.
 */
function initFace() {
    dxCapturer.init()
    dxIvcore.init()
    dxDisplay.init()

    dxFacial.on('detection', onDetection)
    dxFacial.on('recognition', onRecognition)
    dxFacial.init()
    // Keep engine running for both recognition and enrollment
    dxFacial.setStatus(true)
    dxLogger.info('[main] face pipeline ready (default config)')
}

/**
 * Capture one face from the camera and add it to the feature DB.
 * User ids are assigned as user_1, user_2, ... within this process.
 */
async function enrollOnce() {
    if (enrollBusy) {
        ui.setStatus('Enrollment in progress...')
        return
    }

    enrollBusy = true
    mode = 'enroll'
    dxFacial.setStatus(true)
    ui.hideWelcome()
    ui.setStatus('Capturing face, please look at the camera...')

    try {
        const cap = await dxFacial.getFeaByCap(20000)
        if (!cap || !cap.feature) {
            throw new Error('No face feature extracted')
        }

        enrollSeq += 1
        const userId = 'user_' + enrollSeq
        // addFea returns 0 on success
        const rc = dxFacial.addFea(userId, cap.feature)
        if (rc !== 0) {
            throw new Error('addFea failed, code=' + rc)
        }

        if (cap.rect) {
            ui.updateFaceBox(cap.rect)
        }
        ui.setBoxColor(ui.COLOR_GREEN)
        ui.setStatus('Enrolled: ' + userId)
        dxLogger.info('[main] enroll ok ' + userId)
    } catch (e) {
        const msg = e && e.message ? e.message : String(e)
        dxLogger.error('[main] enroll failed: ' + msg)
        ui.setBoxColor(ui.COLOR_RED)
        ui.setStatus('Enroll failed: ' + msg)
    } finally {
        enrollBusy = false
        mode = 'recognize'
        dxFacial.setStatus(true)
    }
}

/**
 * Remove every feature from the facial DB and reset local counters.
 */
function clearAllFaces() {
    try {
        const rc = dxFacial.cleanFea()
        enrollSeq = 0
        for (const k in lastSeen) {
            delete lastSeen[k]
        }
        ui.setBoxColor(ui.COLOR_GRAY)
        ui.hideFaceBox()
        ui.setStatus('All faces cleared')
        dxLogger.info('[main] cleanFea rc=' + rc)
    } catch (e) {
        const msg = e && e.message ? e.message : String(e)
        dxLogger.error('[main] cleanFea failed: ' + msg)
        ui.setStatus('Clear failed: ' + msg)
    }
}

/**
 * App entry: face hardware first, then UI, then event loop.
 */
async function bootstrap() {
    dxLogger.info('[main] face demo starting')

    initFace()

    ui.init({
        onEnroll: function () { enrollOnce() },
        onClear: function () { clearAllFaces() },
    })
    ui.setStatus('Look at the camera, or tap Enroll Face')
    ui.startLoop()

    dxLogger.info('[main] bootstrap success')
}

bootstrap().catch(function (e) {
    dxLogger.error('[main] bootstrap failed: ' + (e && e.message ? e.message : e))
})
