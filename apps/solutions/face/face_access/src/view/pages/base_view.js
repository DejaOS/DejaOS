/**
 * @layer    view
 * @module   base_view
 * @fires    none
 * @listens  none
 * @depends  dxUi,dxStd
 */

import dxui from '../../../dxmodules/dxUi.js';
import dxStd from '../../../dxmodules/dxStd.js';

/**
 * 页面基类。
 * onCreate 只执行一次；onEnter/onExit 在每次进入、离开页面时执行。
 * 页面定时器必须使用本类提供的方法，Router 会在离开页面时统一清理。
 */
export default class BaseView {
    constructor(name) {
        if (typeof name !== 'string' || name.length === 0) {
            throw new TypeError('BaseView: name must be a non-empty string');
        }
        this.name = name;
        this.root = null;
        this.isCreated = false;
        this._timeouts = [];
        this._intervals = [];
        this._cleanups = [];
    }

    onCreate() {}

    onEnter(_context) {}

    onExit(_context) {}

    onUpdate(_data) {}

    setTimeout(callback, delay) {
        let handle = null;
        handle = dxStd.setTimeout(() => {
            this._removeHandle(this._timeouts, handle);
            callback();
        }, delay);
        this._timeouts.push(handle);
        return handle;
    }

    setInterval(callback, interval) {
        const handle = dxStd.setInterval(callback, interval);
        this._intervals.push(handle);
        return handle;
    }

    addCleanup(cleanup) {
        if (typeof cleanup !== 'function') {
            throw new TypeError('BaseView.addCleanup: cleanup must be a function');
        }
        this._cleanups.push(cleanup);
        return cleanup;
    }

    cleanupResources() {
        for (let i = 0; i < this._timeouts.length; i++) {
            dxStd.clearTimeout(this._timeouts[i]);
        }
        this._timeouts = [];

        for (let i = 0; i < this._intervals.length; i++) {
            dxStd.clearInterval(this._intervals[i]);
        }
        this._intervals = [];

        const cleanups = this._cleanups.slice().reverse();
        this._cleanups = [];
        for (let i = 0; i < cleanups.length; i++) {
            try {
                cleanups[i]();
            } catch (_e) {}
        }
    }

    destroy() {
        this.cleanupResources();
        if (this.root) {
            dxui.del(this.root);
        }
        this.root = null;
        this.isCreated = false;
    }

    _removeHandle(handles, handle) {
        const index = handles.indexOf(handle);
        if (index >= 0) {
            handles.splice(index, 1);
        }
    }
}
