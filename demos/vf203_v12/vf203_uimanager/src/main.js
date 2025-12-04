import log from '../dxmodules/dxLogger.js'
import std from '../dxmodules/dxStd.js'
import dxui from '../dxmodules/dxUi.js'

// UI Framework Real UI Test Import
import uiManager from './ui/UIManager.js';
import HomeView from './ui/HomeView.js';
import DetailView from './ui/DetailView.js';
import SettingView from './ui/SettingView.js';
try {
    dxui.init({ orientation: 1 }, {});
    uiManager.register('home', HomeView);
    uiManager.register('detail', DetailView);
    uiManager.register('setting', SettingView);
    uiManager.open('home');
    std.setInterval(() => {
        dxui.handler()
    }, 25);
} catch (error) {
    log.error(error)
}
