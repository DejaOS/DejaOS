/** @layer services @module door_service @depends event_bus,door domains */

import dxStd from '../../dxmodules/dxStd.js';
import logger from '../../dxmodules/dxLogger.js';
import eventBus from '../core/event_bus.js';
import commands from '../core/commands.js';
import scheduleDomain from '../domain/door_schedule_domain.js';
import doorDomain from '../domain/door_domain.js';

const CHECK_INTERVAL_MS = 15000;
let initialized = false;
let timer = null;
let refreshTask = null;
const registered = [];

function register(command, handler) {
    eventBus.registerCommand(command, function (request) {
        const data = request && Object.prototype.hasOwnProperty.call(request, 'data')
            ? request.data : request;
        return handler(data);
    });
    registered.push(command);
}

function refresh() {
    if (refreshTask) return refreshTask;
    refreshTask = scheduleDomain.getCurrentState().then(async function (state) {
        await doorDomain.setScheduleMode(state.mode);
        return state;
    });
    refreshTask = refreshTask.then(function (state) {
        refreshTask = null;
        return state;
    }, function (error) {
        refreshTask = null;
        throw error;
    });
    return refreshTask;
}

async function replaceAll(data) {
    await scheduleDomain.replaceAll(data);
    await refresh();
    return await scheduleDomain.getOverview();
}

function startTimer() {
    timer = dxStd.setInterval(function () {
        refresh().catch(function (error) {
            logger.error('door_service refresh failed: ' + error.message);
        });
    }, CHECK_INTERVAL_MS);
}

const doorService = { refresh: refresh };

doorService.init = async function () {
    if (initialized) return;
    try {
        register(commands.GET_DOOR_SCHEDULES, scheduleDomain.getOverview);
        register(commands.SET_DOOR_SCHEDULES, replaceAll);
        await refresh();
        startTimer();
        initialized = true;
    } catch (error) {
        await doorService.destroy();
        throw error;
    }
};

doorService.destroy = async function () {
    if (timer !== null) {
        dxStd.clearInterval(timer);
        timer = null;
    }
    for (let i = 0; i < registered.length; i++) {
        eventBus.unregisterCommand(registered[i]);
    }
    registered.length = 0;
    refreshTask = null;
    initialized = false;
};

export default doorService;
