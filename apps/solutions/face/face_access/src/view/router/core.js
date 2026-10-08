/**
 * @layer    view
 * @module   router_core
 * @fires    none
 * @listens  none
 * @depends  dxUi,dxLogger,layout,status_bar
 */

import dxui from '../../../dxmodules/dxUi.js';
import logger from '../../../dxmodules/dxLogger.js';
import layout from '../components/layout.js';
import statusBar from '../components/status_bar.js';

const MAX_STACK_DEPTH = 10;
const routes = new Map();
const stack = [];
let initialized = false;
let currentView = null;

/**
 * 状态栏用白色：深色预览叠层（摄像头画面透出）。
 * 其余白底页（设置 / 密码 / 通话等）用黑色不透明标。
 */
const STATUS_TONE_DARK_ROUTES = {
    home: true,
    wecom_capture: true,
};

function applyStatusTone(routeName) {
    try {
        statusBar.setTone(STATUS_TONE_DARK_ROUTES[routeName] ? 'dark' : 'light');
    } catch (e) {
        logger.error('router: statusBar.setTone failed: ' + e.message);
    }
}

function assertInitialized() {
    if (!initialized) {
        throw new Error('router: module is not initialized');
    }
}

function getRoute(name) {
    const route = routes.get(name);
    if (!route) {
        throw new Error("router: route '" + name + "' is not registered");
    }
    return route;
}

function validateParams(route, params) {
    if (typeof route.validate === 'function' && route.validate(params) === false) {
        throw new Error("router: invalid params for route '" + route.view.name + "'");
    }
}

function ensureCreated(view) {
    if (view.isCreated) {
        return;
    }
    try {
        view.onCreate();
        if (!view.root || !view.root.obj) {
            throw new Error('onCreate must assign a valid dxUi root to this.root');
        }
        // 外层页面禁止滚动，避免误拖。
        layout.disableScroll(view.root);
        view.isCreated = true;
    } catch (e) {
        try {
            view.destroy();
        } catch (_destroyError) {}
        throw e;
    }
}

function leaveCurrent(context) {
    if (!currentView) {
        return;
    }
    try {
        currentView.onExit(context || {});
    } catch (e) {
        logger.error('router: ' + currentView.name + '.onExit failed: ' + e.message);
    } finally {
        // 清理由 Router 强制执行，不依赖页面调用 super.onExit()。
        currentView.cleanupResources();
    }
}

function enter(route, entry, context) {
    layout.disableScroll(route.view.root);
    dxui.loadMain(route.view.root);
    currentView = route.view;
    applyStatusTone(route.view.name);
    try {
        route.view.onEnter(Object.assign({ params: entry.params }, context || {}));
    } catch (e) {
        logger.error('router: ' + route.view.name + '.onEnter failed: ' + e.message);
    }
}

const router = {};

router.init = function () {
    initialized = true;
};

router.register = function (view, options) {
    assertInitialized();
    if (!view || typeof view.name !== 'string') {
        throw new TypeError('router.register: view must be a BaseView instance');
    }
    if (routes.has(view.name)) {
        throw new Error("router.register: duplicated route '" + view.name + "'");
    }
    routes.set(view.name, { view: view, validate: options && options.validate });
    return router;
};

router.navigate = function (name, params) {
    return router.push(name, params);
};

router.push = function (name, params) {
    assertInitialized();
    const route = getRoute(name);
    validateParams(route, params);

    if (currentView === route.view) {
        stack[stack.length - 1].params = params;
        route.view.onUpdate(params);
        return true;
    }
    if (stack.length >= MAX_STACK_DEPTH) {
        logger.error('router.push: max stack depth reached');
        return false;
    }

    ensureCreated(route.view);
    const from = currentView ? currentView.name : null;
    leaveCurrent({ to: name });

    const entry = { name: name, params: params };
    stack.push(entry);
    enter(route, entry, { from: from, isBack: false });
    return true;
};

router.replace = function (name, params) {
    assertInitialized();
    const route = getRoute(name);
    validateParams(route, params);
    ensureCreated(route.view);

    const from = currentView ? currentView.name : null;
    leaveCurrent({ to: name });
    if (stack.length > 0) {
        stack.pop();
    }
    const entry = { name: name, params: params };
    stack.push(entry);
    enter(route, entry, { from: from, isBack: false });
    return true;
};

router.back = function (result) {
    assertInitialized();
    if (stack.length <= 1) {
        return false;
    }

    const source = stack[stack.length - 1];
    leaveCurrent({ isBack: true });
    stack.pop();

    const target = stack[stack.length - 1];
    enter(getRoute(target.name), target, {
        from: source.name,
        result: result,
        isBack: true,
    });
    return true;
};

router.backTo = function (name, result) {
    assertInitialized();
    let targetIndex = -1;
    for (let i = stack.length - 1; i >= 0; i--) {
        if (stack[i].name === name) {
            targetIndex = i;
            break;
        }
    }
    if (targetIndex < 0 || targetIndex === stack.length - 1) {
        return false;
    }

    const source = stack[stack.length - 1];
    leaveCurrent({ isBack: true, to: name });
    stack.splice(targetIndex + 1);

    const target = stack[targetIndex];
    enter(getRoute(target.name), target, {
        from: source.name,
        result: result,
        isBack: true,
    });
    return true;
};

router.getCurrent = function () {
    return currentView ? currentView.name : null;
};

/** 语言切换后刷新当前页文案（不改动路由栈）。 */
router.refreshCurrent = function () {
    if (!currentView || stack.length === 0) {
        return false;
    }
    const entry = stack[stack.length - 1];
    try {
        currentView.onEnter(Object.assign({ params: entry.params }, { localeRefresh: true }));
    } catch (e) {
        logger.error('router: ' + currentView.name + '.refreshCurrent failed: ' + e.message);
        return false;
    }
    return true;
};

/** @param {string} name @returns {object|null} */
router.getView = function (name) {
    const route = routes.get(name);
    return route ? route.view : null;
};

router.getStack = function () {
    return stack.map(function (entry) { return entry.name; });
};

router.isInitialized = function () {
    return initialized;
};

router.destroy = function () {
    if (!initialized) {
        return;
    }
    leaveCurrent({ destroy: true });
    routes.forEach(function (route) {
        route.view.destroy();
    });
    routes.clear();
    stack.length = 0;
    currentView = null;
    initialized = false;
};

export default router;
