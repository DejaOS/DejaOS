// faceWorker.js - Face recognition Worker (minimal)
import face from '../dxmodules/dxFacial.js';
import log from './log/LogProxy.js';
import std from '../dxmodules/dxStd.js';
import bus from '../dxmodules/dxEventBus.js';

let _inited = false;
let _running = false;

function safeInit() {
    if (_inited) return;
    try {
        face.init(); // Default config; see dxFacial.js for details
        //face.setStatus(false); // Pause by default to avoid idle run
        _inited = true;
        log.info('faceWorker', 'dxFacial init ok');
    } catch (e) {
        log.error('faceWorker', 'dxFacial init failed', e);
    }
}

safeInit();
// For testing: clear face feature DB
//face.cleanFea();

// Recognition callback: forward result to other workers/UI
face.setCallbacks({
    onRecognition: (event) => {
        try {
            if (!_running) { return };
            //log.info('faceWorker', 'onRecognition', event);
            // event: userId, picPath, compareScore, rect, etc. (see dxFacial.js)
            bus.fire('FACE_RECOGNIZED', event);
        } catch (e) {
            log.error('faceWorker', 'fire FACE_RECOGNIZED failed', e);
        }
    }
});

// Control: start/stop recognition
bus.on('FACE_START', () => {
    _running = true;
    log.info('faceWorker', '_running....' + _running)
});

bus.on('FACE_STOP', () => {
    _running = false;
    log.info('faceWorker', '_running....' + _running)
});
bus.on('REGISTER_FACE', (event) => {
    try {
        let userId = event
        let timeout = 5000
        face.deleteFea(userId)
        let res = face.getFeaByCap(timeout)
        if (res) {
            // res: quality_score, picPath, rect, feature
            log.info('faceWorker', 'Register facial recognition success', res)
            let feature = res.feature
            face.addFea(userId, feature)
            log.info('faceWorker', "feature added to face database")
            bus.fire('REGISTER_FACE_SUCCESS', { userId: userId, picPath: res.picPath });
        } else {
            bus.fire('REGISTER_FACE_FAILED', userId);
        }
    } catch (ex) {
        log.error('faceWorker', 'Register facial recognition failed', ex)
        bus.fire('REGISTER_FACE_FAILED', ex.message);
    }
});
bus.on('FACE_CLEAR_FEA', (event) => {
    try {
        if(event&&event.userId){
            if(event.userId == "admin"){
                // Do not delete admin face feature
                return;
            }
            let res = face.deleteFea(event.userId)
            log.info('faceWorker', 'Clear face feature success '+res, event.userId)
        }
        else{
            log.error('faceWorker', 'Clear facial recognition feature failed', 'userId is null')
        }
    } catch (ex) {
        log.error('faceWorker', 'Clear facial recognition feature failed', ex)
    }
});
// Main loop: call loop() only when running
std.setInterval(() => {
    try {
        face.loop();
    } catch (e) {
        log.error('faceWorker', 'loop error', e);
    }
}, 50);

/* std.setInterval(() => {
    //if (!_running) return;
    try {
        log.info(face.getDetectionData())
    } catch (e) {
        log.error('faceWorker', 'loop error', e);
    }
}, 1000); */