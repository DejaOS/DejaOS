import v from './viewUtils.js';
import log from '../../dxmodules/dxLogger.js';
import uiManager from './UIManager.js';

const SettingView = {
    init: function () {
        log.info('[SettingView] init');
        const screen = v.create(uiManager.getRoot());
        v.chain(screen)
            .setSize(480, 800)
            .center(0, 0)
            .bgColor(0x883300)
            .bgOpa(255);

        v.chain(v.create(screen, 'Label'))
            .text("Settings")
            .textColor(0xffffff)
            .textFont(v.font(40))
            .center(0, -100);

        const btnHome = v.create(screen, 'Button');
        v.chain(btnHome)
            .setSize(220, 60)
            .center(0, 0)
            .bgColor(0xcc0000)
            .click(() => {
                this.backTo('home', { reset: true });
            });

        v.chain(v.create(btnHome, 'Label'))
            .text("Back to Home")
            .center(0, 0);

        return screen;
    },

    onShow: function (data) {
        log.info('[SettingView] onShow');
    }
};

export default SettingView;
