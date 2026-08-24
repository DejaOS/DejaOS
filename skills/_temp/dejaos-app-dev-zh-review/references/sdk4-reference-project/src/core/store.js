/**
 * @layer    core
 * @module   store
 * @fires    none
 * @listens  none
 * @depends  none
 */

const ALLOWED_KEYS = new Set([]);
const state = {};

const store = {};

store.get = function (key) {
    return state[key];
};

store.set = function (key, value) {
    if (!ALLOWED_KEYS.has(key)) {
        throw new Error('store.set: key not in whitelist');
    }
    state[key] = value;
};

store.snapshot = function () {
    return Object.assign({}, state);
};

export default store;
