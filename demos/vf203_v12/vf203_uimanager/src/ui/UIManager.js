import log from '../../dxmodules/dxLogger.js';
import dxui from '../../dxmodules/dxUi.js'; // 引入 dxui 用于 loadMain
import std from '../../dxmodules/dxStd.js';

/**
 * UI Manager (Native Object Version)
 * Responsible for managing page linked lists, lazy loading initialization, automatically managing Root DOM visibility
 * Adopts single Screen multiple View mode
 */
const UIManager = {
    _viewMap: {},      // Registry: name -> ViewObject
    _currentView: null,// Currently displayed View object
    _rootScreen: null, // Global root screen container

    /**
     * Framework initialization (Must be called once when the application starts)
     */
    init: function () {
        if (this._rootScreen) return;

        log.info('UIManager init: Creating global RootScreen...');

        // 1. Create a global main screen container
        // Here use 'act' to indicate it is an Activity/Screen level object
        this._rootScreen = dxui.View.build(std.genRandomStr(10), dxui.Utils.LAYER.MAIN);

        // 清除默认边距等
        this._rootScreen.radius(0);
        this._rootScreen.borderWidth(0);
        this._rootScreen.padAll(0);
        this._rootScreen.scroll(false)

        // 3. Key: Load this main screen and make it visible
        // Afterwards, all Views are child controls on this screen, switched via show/hide
        dxui.loadMain(this._rootScreen);
    },

    /**
     * Get global root node (Used as parent when creating View)
     */
    getRoot: function () {
        if (!this._rootScreen) {
            this.init(); // Automatic remedy
        }
        return this._rootScreen;
    },

    /**
     * Register page
     */
    register: function (name, viewObj) {
        this._viewMap[name] = viewObj;

        // Inject core properties and methods (Mixin)
        viewObj.id = name;
        viewObj.hasInit = false;
        viewObj.parent = null;
        viewObj.root = null;

        const self = this;
        viewObj.open = function (targetName, data) {
            self.open(targetName, data);
        };
        viewObj.close = function (resultData) {
            self.close(viewObj, resultData);
        };
        viewObj.backTo = function (targetName, resultData) {
            self.backTo(targetName, resultData);
        };
    },

    _showRoot: function (view) {
        if (view && view.root && typeof view.root.show === 'function') {
            view.root.show();
        }
    },

    _hideRoot: function (view) {
        if (view && view.root && typeof view.root.hide === 'function') {
            view.root.hide();
        }
    },

    /**
     * Open page
     */
    open: function (name, data) {
        // Ensure framework is initialized
        if (!this._rootScreen) this.init();

        const nextView = this._viewMap[name];
        if (!nextView) {
            log.error(`UIManager: View '${name}' not registered.`);
            return;
        }

        // If the target page is already the current page, only update data
        if (this._currentView === nextView) {
            if (typeof nextView.onShow === 'function') {
                nextView.onShow(data);
            }
            return;
        }

        // 1. Check if already in stack (prevent circular reference A->B->C->A)
        // If in stack, treat as backTo (Clear Top) and refresh data
        let p = this._currentView;
        while (p) {
            if (p === nextView) {
                log.info(`UIManager: View '${name}' is already in stack. Performing backTo.`);
                this.backTo(name);
                // Because it is an explicit open, onShow should be triggered to update data even if it is a rollback
                if (typeof nextView.onShow === 'function') {
                    nextView.onShow(data);
                }
                return;
            }
            p = p.parent;
        }

        // 2. Lazy loading
        if (!nextView.hasInit) {
            if (typeof nextView.init !== 'function') {
                log.error(`UIManager: View '${name}' must have an init() function.`);
                return;
            }

            // Execute init
            const rootObj = nextView.init();
            nextView.root = rootObj;

            if (!nextView.root) {
                log.error(`UIManager: View '${name}'.init() must return a valid Root UI object.`);
                return;
            }

            nextView.hasInit = true;
        }

        // 2. Hide current view
        if (this._currentView) {
            if (nextView !== this._currentView) {
                nextView.parent = this._currentView;
            }
            this._hideRoot(this._currentView);
            if (typeof this._currentView.onHide === 'function') {
                this._currentView.onHide();
            }
        }

        // 3. Switch pointer
        this._currentView = nextView;

        // 4. Show new view
        this._showRoot(nextView);
        if (typeof nextView.onShow === 'function') {
            nextView.onShow(data);
        }
    },

    close: function (viewInstance, resultData) {
        if (viewInstance !== this._currentView) {
            log.error("UIManager: Trying to close a view that is not current.");
            return;
        }

        this._hideRoot(viewInstance);
        if (typeof viewInstance.onHide === 'function') {
            viewInstance.onHide();
        }

        const parentView = viewInstance.parent;
        if (parentView) {
            if (resultData !== undefined && typeof parentView.onClose === 'function') {
                parentView.onClose(viewInstance.id, resultData);
            }

            this._currentView = parentView;
            this._showRoot(parentView);

            viewInstance.parent = null;
        } else {
            this._currentView = null;
        }
    },

    backTo: function (targetViewName, resultData) {
        if (!this._currentView) return;

        let p = this._currentView.parent;
        let found = false;
        let targetView = null;

        while (p) {
            if (p.id === targetViewName) {
                targetView = p;
                found = true;
                break;
            }
            p = p.parent;
        }

        if (!found) {
            log.error(`UIManager: backTo failed. View '${targetViewName}' not found in history.`);
            return;
        }

        this._hideRoot(this._currentView);
        if (typeof this._currentView.onHide === 'function') {
            this._currentView.onHide();
        }

        const sourceViewId = this._currentView.id;

        let curr = this._currentView;
        while (curr && curr !== targetView) {
            const tempParent = curr.parent;
            curr.parent = null;
            curr = tempParent;
        }

        this._currentView = targetView;

        if (resultData !== undefined && typeof targetView.onClose === 'function') {
            targetView.onClose(sourceViewId, resultData);
        }

        this._showRoot(targetView);
    }
};

export default UIManager;
