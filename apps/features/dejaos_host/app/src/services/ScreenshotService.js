import dxui from '../../dxmodules/dxUi.js'
import bus from '../../dxmodules/dxEventBus.js'
import log from '../../dxmodules/dxLogger.js'
import EventTopics from '../constants/EventTopics.js'

const MAX_DOUBLE_TAP_MS = 450
const MIN_DOUBLE_TAP_MS = 80
let sequence = 0

function pad(value) {
    return String(value).padStart(2, '0')
}

function buildFileName(prefix) {
    const now = new Date()
    sequence = (sequence + 1) % 100
    return String(prefix || 'host') + '_' +
        now.getFullYear() + pad(now.getMonth() + 1) + pad(now.getDate()) + '_' +
        pad(now.getHours()) + pad(now.getMinutes()) + pad(now.getSeconds()) + '_' +
        pad(sequence) + '.png'
}

function bindBlankArea(view, screenRoot, prefix) {
    if (!view || !screenRoot || typeof screenRoot.snapshot !== 'function') {
        log.error('screenshot blank area binding is invalid')
        return
    }
    let lastTapAt = 0
    view.on(dxui.Utils.EVENT.CLICK, function handleBlankAreaTap() {
        const now = Date.now()
        const interval = now - lastTapAt
        if (lastTapAt && interval >= MIN_DOUBLE_TAP_MS && interval <= MAX_DOUBLE_TAP_MS) {
            lastTapAt = 0
            const fileName = buildFileName(prefix)
            try {
                screenRoot.snapshot(fileName, 1)
                bus.fire(EventTopics.SCREENSHOT_UPLOAD_REQUEST, { fileName })
                log.info('screenshot captured and queued', fileName)
            } catch (e) {
                log.error('screenshot capture failed', e)
                bus.fire(EventTopics.SCREENSHOT_UPLOAD_RESULT, {
                    ok: false,
                    message: e.message || String(e)
                })
            }
            return
        }
        lastTapAt = now
    })
}

export default { bindBlankArea }
