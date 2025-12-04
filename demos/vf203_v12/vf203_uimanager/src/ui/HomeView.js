import v from './viewUtils.js';
import log from '../../dxmodules/dxLogger.js';
import uiManager from './UIManager.js';

const HomeView = {
    init: function () {
        log.info('[HomeView] init');

        const screen = v.create(uiManager.getRoot());

        v.chain(screen)
            .setSize(480, 800) 
            .center(0, 0)
            .bgColor(0x333333)
            .bgOpa(255);

        const title = v.create(screen, 'Label');
        v.chain(title)
            .text("Home Page")
            .textColor(0xffffff)
            .textFont(v.font(40))
            .top_mid(0, 50);

        const btn = v.create(screen, 'Button');
        v.chain(btn)
            .setSize(200, 60)
            .center(0, 0)
            .click(() => {
                log.info('Click: Go to Detail');
                this.open('detail', { id: 1001, name: 'Product A' });
            });

        const btnLabel = v.create(btn, 'Label');
        v.chain(btnLabel)
            .text("Go to Detail")
            .center(0, 0);

        return screen;
    },

    onShow: function (data) {
        log.info('[HomeView] onShow');
    },

    onHide: function () {
        log.info('[HomeView] onHide');
    },

    onClose: function (viewName, result) {
        log.info(`[HomeView] Child ${viewName} closed. Result:`, result);
    }
};

export default HomeView;
