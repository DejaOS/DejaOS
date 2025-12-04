import v from './viewUtils.js';
import log from '../../dxmodules/dxLogger.js';
import uiManager from './UIManager.js';

const DetailView = {
    init: function () {
        log.info('[DetailView] init');
        const screen = v.create(uiManager.getRoot());
        v.chain(screen)
            .setSize(480, 800)
            .center(0, 0)
            .bgColor(0x005588)
            .bgOpa(255);

        const title = v.create(screen, 'Label');
        this.titleLbl = title;
        v.chain(title)
            .text("Detail")
            .textColor(0xffffff)
            .textFont(v.font(30))
            .top_mid(0, 50);

        const btnNext = v.create(screen, 'Button');
        v.chain(btnNext)
            .setSize(200, 60)
            .center(0, -50)
            .click(() => {
                this.open('setting');
            });

        v.chain(v.create(btnNext, 'Label'))
            .text("Go to Setting")
            .center(0, 0);

        const btnBack = v.create(screen, 'Button');
        v.chain(btnBack)
            .setSize(200, 60)
            .center(0, 50)
            .bgColor(0x999999)
            .click(() => {
                this.close({ action: 'liked' });
            });

        v.chain(v.create(btnBack, 'Label'))
            .text("Back")
            .center(0, 0);

        return screen;
    },

    onShow: function (data) {
        log.info('[DetailView] onShow', data);
        if (data && this.titleLbl) {
            v.chain(this.titleLbl).text("Item: " + data.name);
        }
    },

    onHide: function () {
        log.info('[DetailView] onHide');
    }
};

export default DetailView;
