/** 广告资源查询、发布和UI热更新流程。 */
import eventBus from '../core/event_bus.js';
import commands from '../core/commands.js';
import advertDomain from '../domain/advert_domain.js';
import uiDomain from '../domain/ui_domain.js';
import logger from '../../dxmodules/dxLogger.js';

let initialized = false;
const registered = [];
function dataOf(request) {
    return request && Object.prototype.hasOwnProperty.call(request, 'data') ? request.data : request;
}
function register(command, handler) {
    eventBus.registerCommand(command, handler);
    registered.push(command);
}
function refreshUi(state) {
    try { uiDomain.setAdvertisements(state); }
    catch (e) { logger.info('advert_service UI not ready: ' + e.message); }
}

const advertService = {};
advertService.init = async function () {
    if (initialized) return;
    try {
        register(commands.GET_ADVERTISEMENTS, function () { return advertDomain.get(); });
        register(commands.GET_ADVERTISEMENT_IMAGE, function (request) {
            return advertDomain.getImage(dataOf(request));
        });
        register(commands.UPDATE_ADVERTISEMENTS_REMOTE, async function (request) {
            const state = await advertDomain.updateRemote(dataOf(request));
            refreshUi(state);
            return state;
        });
        register(commands.UPLOAD_ADVERTISEMENT_CHUNK, async function (request) {
            const result = await advertDomain.uploadChunk(dataOf(request));
            if (result.complete && result.state) refreshUi(result.state);
            return result;
        });
        register(commands.ABORT_ADVERTISEMENT_UPLOAD, function () {
            return advertDomain.abortUpload();
        });
        initialized = true;
    } catch (e) {
        await advertService.destroy();
        throw e;
    }
};
advertService.destroy = async function () {
    for (let i = 0; i < registered.length; i++) eventBus.unregisterCommand(registered[i]);
    registered.length = 0;
    initialized = false;
};
export default advertService;
