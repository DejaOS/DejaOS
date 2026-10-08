/** @layer view @module local_user_verifier_page @depends BaseView,router,local_user_store */

import dxui from '../../../../dxmodules/dxUi.js';
import BaseView from '../base_view.js';
import router from '../../router/core.js';
import font from '../../components/font.js';
import layout from '../../components/layout.js';
import theme from '../../components/theme.js';
import pageHeader from '../../components/page_header.js';
import popup from '../../components/popup.js';
import { t } from '../../i18n/index.js';
import localUserStore from './local_user_store.js';

const PAGE_SIZE = 8;

export default class LocalUserVerifierPage extends BaseView {
    constructor() {
        super('settings_localUser_verifiers');
        this._selected = new Set();
        this._excludeId = '';
        this._page = 0;
        this._totalPage = 0;
        this._rows = [];
        this._token = 0;
        this._pageLabel = null;
    }

    onCreate() {
        const self = this;
        this.root = dxui.View.build('page_local_user_verifiers', dxui.Utils.LAYER.MAIN);
        this.root.setSize(layout.width, layout.height);
        layout.clearStyle(this.root);
        this.root.bgColor(0xf5f5f5);
        this.root.bgOpa(100);
        this.root.scroll(false);
        this._header = pageHeader.build(this.root, {
            idPrefix: 'local_user_verifiers', titleKey: 'localUser.dual.selectTitle',
        });
        const top = pageHeader.contentTop();
        const list = dxui.View.build('local_user_verifier_list', this.root);
        layout.clearStyle(list);
        list.setSize(layout.x(720), layout.height - top - layout.y(190));
        list.setPos(layout.x(40), top + layout.y(12));
        list.bgOpa(0);
        list.scroll(false);
        list.flexFlow(dxui.Utils.FLEX_FLOW.COLUMN);
        list.flexAlign(dxui.Utils.FLEX_ALIGN.START, dxui.Utils.FLEX_ALIGN.CENTER, dxui.Utils.FLEX_ALIGN.CENTER);
        list.obj.lvObjSetStylePadGap(layout.y(10), dxui.Utils.ENUM._LV_STYLE_STATE_CMP_SAME);
        for (let i = 0; i < PAGE_SIZE; i++) this._rows.push(this._buildRow(list, i));

        const pager = dxui.View.build('local_user_verifier_pager', this.root);
        layout.clearStyle(pager);
        pager.setSize(layout.x(720), layout.y(70));
        pager.align(dxui.Utils.ALIGN.BOTTOM_MID, 0, -layout.y(112));
        pager.bgOpa(0);
        const prev = this._button(pager, 'verifier_prev', '←', layout.x(120));
        prev.align(dxui.Utils.ALIGN.LEFT_MID, 0, 0);
        prev.on(dxui.Utils.EVENT.CLICK, function () { if (self._page > 0) self._load(self._page - 1); });
        const next = this._button(pager, 'verifier_next', '→', layout.x(120));
        next.align(dxui.Utils.ALIGN.RIGHT_MID, 0, 0);
        next.on(dxui.Utils.EVENT.CLICK, function () {
            if (self._page + 1 < self._totalPage) self._load(self._page + 1);
        });
        this._pageLabel = dxui.Label.build('verifier_page_label', pager);
        this._pageLabel.setSize(layout.x(260), layout.y(40));
        this._pageLabel.align(dxui.Utils.ALIGN.CENTER, 0, 0);
        this._pageLabel.textFont(font.getDefault(layout.fontSize(22)));
        this._pageLabel.textColor(theme.textPrimary);
        this._pageLabel.textAlign(dxui.Utils.TEXT_ALIGN.CENTER);

        const save = this._button(this.root, 'verifier_save', t('localUser.dual.confirm'), layout.x(720));
        save.setSize(layout.x(720), layout.y(88));
        save.align(dxui.Utils.ALIGN.BOTTOM_MID, 0, -layout.y(24));
        save.on(dxui.Utils.EVENT.CLICK, function () {
            router.back({ verifierUserIds: Array.from(self._selected) });
        });
    }

    _button(parent, id, text, width) {
        const button = dxui.Button.build(id, parent);
        button.setSize(width, layout.y(60));
        button.bgColor(theme.activeBg);
        button.radius(layout.x(12));
        button.borderWidth(0);
        const label = dxui.Label.build(id + '_label', button);
        label.text(text);
        label.textFont(font.get(layout.fontSize(26)));
        label.textColor(theme.textOnDark);
        label.align(dxui.Utils.ALIGN.CENTER, 0, 0);
        return button;
    }

    _buildRow(parent, index) {
        const self = this;
        const row = dxui.View.build('verifier_row_' + index, parent);
        layout.clearStyle(row);
        row.setSize(layout.x(720), layout.y(84));
        row.bgColor(theme.pageBg);
        row.bgOpa(100);
        row.radius(layout.x(12));
        row.clickable(true);
        row.hide();
        const name = dxui.Label.build('verifier_name_' + index, row);
        name.setSize(layout.x(450), layout.y(36));
        name.align(dxui.Utils.ALIGN.LEFT_MID, layout.x(24), layout.y(-12));
        name.textFont(font.get(layout.fontSize(26)));
        name.textColor(theme.textPrimary);
        const id = dxui.Label.build('verifier_id_' + index, row);
        id.setSize(layout.x(450), layout.y(28));
        id.align(dxui.Utils.ALIGN.LEFT_MID, layout.x(24), layout.y(18));
        id.textFont(font.get(layout.fontSize(18)));
        id.textColor(theme.textSecondary);
        const mark = dxui.Label.build('verifier_mark_' + index, row);
        mark.setSize(layout.x(120), layout.y(44));
        mark.align(dxui.Utils.ALIGN.RIGHT_MID, -layout.x(24), 0);
        mark.textFont(font.get(layout.fontSize(26)));
        mark.textAlign(dxui.Utils.TEXT_ALIGN.RIGHT);
        const slot = { row: row, name: name, id: id, mark: mark, user: null };
        row.on(dxui.Utils.EVENT.CLICK, function () {
            if (!slot.user) return;
            if (self._selected.has(slot.user.id)) self._selected.delete(slot.user.id);
            else self._selected.add(slot.user.id);
            self._paintRow(slot);
        });
        return slot;
    }

    _paintRow(slot) {
        const selected = slot.user && this._selected.has(slot.user.id);
        slot.row.bgColor(selected ? 0xe8f3ff : theme.pageBg);
        slot.mark.text(selected ? '✓ ' + t('localUser.dual.selectedShort') : '');
        slot.mark.textColor(theme.accent);
    }

    onEnter(context) {
        if (this._header) this._header.refresh();
        const params = context && context.params ? context.params : {};
        this._excludeId = String(params.excludeId || '');
        this._selected = new Set(Array.isArray(params.selected) ? params.selected : []);
        this._load(0);
    }

    onExit() {
        this._token += 1;
    }

    _load(page) {
        const self = this;
        const token = ++this._token;
        localUserStore.list(page, PAGE_SIZE, '').then(function (result) {
            if (token !== self._token) return;
            self._page = Number(result.page) || 0;
            self._totalPage = Number(result.totalPage) || 0;
            const users = (result.users || []).filter(function (user) { return user.id !== self._excludeId; });
            for (let i = 0; i < self._rows.length; i++) {
                const slot = self._rows[i];
                const user = users[i] || null;
                slot.user = user;
                if (!user) {
                    slot.row.hide();
                    continue;
                }
                slot.name.text(user.name || '-');
                slot.id.text(user.id || '');
                self._paintRow(slot);
                slot.row.show();
            }
            self._pageLabel.text(t('localUser.page', {
                current: self._totalPage ? self._page + 1 : 0,
                total: self._totalPage,
            }));
        }).catch(function (error) {
            if (token !== self._token) return;
            popup.showError(localUserStore.errorMessage(error) || t('localUser.loadFailed'));
        });
    }
}
