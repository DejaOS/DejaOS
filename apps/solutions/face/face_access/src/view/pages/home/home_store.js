/** @layer view @module home_store @fires CMD_START_FACE_RECOGNITION,CMD_PAUSE_FACE_RECOGNITION,CMD_START_FINGER_ACCESS,CMD_PAUSE_FINGER_ACCESS */

import eventBus from '../../../core/event_bus.js';
import commands from '../../../core/commands.js';
import dxLogger from '../../../../dxmodules/dxLogger.js';
import capabilityStore from '../../core/capability_store.js';

const homeStore = {};

/** 进入通行首页：打开人脸识别；有指纹能力时再开指纹通行轮询。 */
homeStore.startRecognition = function () {
    const tasks = [
        eventBus.execute(commands.START_FACE_RECOGNITION).catch(function (e) {
            dxLogger.error('home_store.startFace failed: ' + (e && e.message ? e.message : e));
        }),
    ];
    // 无 /etc/app/.finger 时 Service 也会直接 return false；此处按能力跳过，避免无意义 Command。
    if (capabilityStore.hasFinger()) {
        tasks.push(
            eventBus.execute(commands.START_FINGER_ACCESS).catch(function (e) {
                dxLogger.error('home_store.startFinger failed: ' + (e && e.message ? e.message : e));
            })
        );
    }
    return Promise.all(tasks);
};

/** 离开通行首页：关闭人脸识别与指纹通行（设置页不应误触发通行）。 */
homeStore.pauseRecognition = function () {
    const tasks = [
        eventBus.execute(commands.PAUSE_FACE_RECOGNITION).catch(function (e) {
            dxLogger.error('home_store.pauseFace failed: ' + (e && e.message ? e.message : e));
        }),
    ];
    if (capabilityStore.hasFinger()) {
        tasks.push(
            eventBus.execute(commands.PAUSE_FINGER_ACCESS).catch(function (e) {
                dxLogger.error('home_store.pauseFinger failed: ' + (e && e.message ? e.message : e));
            })
        );
    }
    return Promise.all(tasks);
};

export default homeStore;
