/**
 * @layer    view
 * @module   call_list_page
 * @fires    none
 * @listens  none
 * @depends  dxUi,BaseView,font,layout,theme,page_header,assets,i18n,loading_spinner,router,call_store
 *
 * 呼叫列表：分页展示联系人名称与 ID，点击行进入呼叫界面。
 */

import dxui from '../../../../dxmodules/dxUi.js';
import BaseView from '../base_view.js';
import font from '../../components/font.js';
import layout from '../../components/layout.js';
import theme from '../../components/theme.js';
import pageHeader from '../../components/page_header.js';
import loadingSpinner from '../../components/loading_spinner.js';
import { asset } from '../../utils/assets.js';
import { t } from '../../i18n/index.js';
import router from '../../router/core.js';
import callStore from './call_store.js';

const IMG_EMPTY = asset('empty.png');

const PAGE_SIZE = 10;
const PAGER_H = 88;
const LIST_PAD_V = 8;
const ROW_GAP = 6;

export default class CallListPage extends BaseView {
    constructor() {
        super('call_list');
        this._header = null;
        this._content = null;
        this._emptyBox = null;
        this._emptyImg = null;
        this._emptyLabel = null;
        this._spinner = null;
        this._listPanel = null;
        this._list = null;
        this._pager = null;
        this._prevBtn = null;
        this._nextBtn = null;
        this._pageLabel = null;
        /** @type {{ row: object, nameLbl: object, idLbl: object, contact: object|null }[]} */
        this._rowSlots = [];
        this._rowH = 0;
        this._rowGap = 0;
        this._rowW = 0;
        this._pageIndex = 0;
        /** @type {Array<{ id: string, name: string }>|null} */
        this._contacts = null;
        this._fetchToken = 0;
    }

    onCreate() {
        this.root = dxui.View.build('page_call_list', dxui.Utils.LAYER.MAIN);
        this.root.setSize(layout.width, layout.height);
        layout.clearStyle(this.root);
        this.root.bgColor(theme.pageBg);
        this.root.bgOpa(100);
        this.root.scroll(false);

        this._header = pageHeader.build(this.root, {
            idPrefix: 'call_list',
            titleKey: 'call.list.title',
        });
        this._buildContent();
    }

    onEnter() {
        if (this._header) {
            this._header.refresh();
        }
        this._loadContacts();
    }

    onExit() {
        this._fetchToken += 1;
        if (this._spinner) {
            this._spinner.stop();
        }
    }

    _buildContent() {
        const self = this;
        const top = pageHeader.contentTop();
        const pagerH = layout.y(PAGER_H);
        const contentH = layout.height - top;
        const listH = contentH - pagerH;
        const listPadV = layout.y(LIST_PAD_V);
        const rowGap = layout.y(ROW_GAP);
        const usable = Math.max(0, listH - listPadV * 2);
        this._rowGap = rowGap;
        this._rowH = Math.max(
            layout.y(64),
            Math.floor((usable - rowGap * (PAGE_SIZE - 1)) / PAGE_SIZE)
        );
        this._rowW = layout.x(720);

        this._content = dxui.View.build('call_list_content', this.root);
        this._content.setSize(layout.width, contentH);
        this._content.setPos(0, top);
        layout.clearStyle(this._content);
        this._content.bgColor(0xf5f5f5);
        this._content.bgOpa(100);
        this._content.scroll(false);

        this._emptyBox = dxui.View.build('call_list_empty', this._content);
        this._emptyBox.setSize(layout.x(320), layout.y(280));
        layout.clearStyle(this._emptyBox);
        this._emptyBox.bgOpa(0);
        this._emptyBox.align(dxui.Utils.ALIGN.CENTER, 0, layout.y(-40));
        this._emptyBox.clickable(false);

        this._emptyImg = dxui.Image.build('call_list_empty_img', this._emptyBox);
        this._emptyImg.source(IMG_EMPTY);
        this._emptyImg.align(dxui.Utils.ALIGN.TOP_MID, 0, 0);

        this._spinner = loadingSpinner.build(this._emptyBox, {
            idPrefix: 'call_list_spinner',
            size: layout.x(96),
            color: theme.textSecondary,
        });
        this._spinner.root.align(dxui.Utils.ALIGN.TOP_MID, 0, layout.y(40));
        this.addCleanup(function () {
            if (self._spinner) {
                self._spinner.stop();
            }
        });

        this._emptyLabel = dxui.Label.build('call_list_empty_lbl', this._emptyBox);
        this._emptyLabel.setSize(layout.x(320), layout.y(50));
        this._emptyLabel.align(dxui.Utils.ALIGN.BOTTOM_MID, 0, 0);
        this._emptyLabel.text(t('call.list.empty'));
        this._emptyLabel.textFont(font.get(layout.fontSize(24)));
        this._emptyLabel.textColor(theme.textSecondary);
        this._emptyLabel.textAlign(dxui.Utils.TEXT_ALIGN.CENTER);

        this._listPanel = dxui.View.build('call_list_panel', this._content);
        this._listPanel.setSize(layout.width, listH);
        this._listPanel.setPos(0, 0);
        layout.clearStyle(this._listPanel);
        this._listPanel.bgOpa(0);
        this._listPanel.scroll(false);

        this._list = dxui.View.build('call_list_rows', this._listPanel);
        this._list.setSize(layout.width, listH);
        this._list.setPos(0, 0);
        layout.clearStyle(this._list);
        this._list.bgOpa(0);
        this._list.scroll(false);
        this._list.flexFlow(dxui.Utils.FLEX_FLOW.COLUMN);
        this._list.flexAlign(
            dxui.Utils.FLEX_ALIGN.START,
            dxui.Utils.FLEX_ALIGN.CENTER,
            dxui.Utils.FLEX_ALIGN.CENTER
        );
        this._list.padTop(listPadV);
        this._list.padBottom(listPadV);
        this._list.obj.lvObjSetStylePadGap(
            this._rowGap,
            dxui.Utils.ENUM._LV_STYLE_STATE_CMP_SAME
        );

        this._rowSlots = [];
        for (let i = 0; i < PAGE_SIZE; i++) {
            this._rowSlots.push(this._createRowSlot(i));
        }

        this._pager = dxui.View.build('call_list_pager', this._content);
        this._pager.setSize(layout.width, pagerH);
        this._pager.align(dxui.Utils.ALIGN.BOTTOM_MID, 0, 0);
        layout.clearStyle(this._pager);
        this._pager.bgColor(theme.pageBg);
        this._pager.bgOpa(100);
        this._pager.scroll(false);

        this._prevBtn = dxui.Button.build('call_list_prev', this._pager);
        this._prevBtn.setSize(layout.x(120), layout.y(56));
        this._prevBtn.align(dxui.Utils.ALIGN.LEFT_MID, layout.x(32), 0);
        this._prevBtn.bgColor(theme.activeBg);
        this._prevBtn.radius(layout.x(12));
        this._prevBtn.borderWidth(0);
        this._prevBtn.on(dxui.Utils.EVENT.CLICK, function () {
            self._goPage(self._pageIndex - 1);
        });
        const prevLbl = dxui.Label.build('call_list_prev_lbl', this._prevBtn);
        prevLbl.text('←');
        prevLbl.textFont(font.get(layout.fontSize(30)));
        prevLbl.textColor(theme.textOnDark);
        prevLbl.align(dxui.Utils.ALIGN.CENTER, 0, 0);

        this._nextBtn = dxui.Button.build('call_list_next', this._pager);
        this._nextBtn.setSize(layout.x(120), layout.y(56));
        this._nextBtn.align(dxui.Utils.ALIGN.RIGHT_MID, -layout.x(32), 0);
        this._nextBtn.bgColor(theme.activeBg);
        this._nextBtn.radius(layout.x(12));
        this._nextBtn.borderWidth(0);
        this._nextBtn.on(dxui.Utils.EVENT.CLICK, function () {
            self._goPage(self._pageIndex + 1);
        });
        const nextLbl = dxui.Label.build('call_list_next_lbl', this._nextBtn);
        nextLbl.text('→');
        nextLbl.textFont(font.get(layout.fontSize(30)));
        nextLbl.textColor(theme.textOnDark);
        nextLbl.align(dxui.Utils.ALIGN.CENTER, 0, 0);

        this._pageLabel = dxui.Label.build('call_list_page_lbl', this._pager);
        this._pageLabel.setSize(layout.x(280), layout.y(40));
        this._pageLabel.align(dxui.Utils.ALIGN.CENTER, 0, 0);
        this._pageLabel.textFont(font.getDefault(layout.fontSize(24)));
        this._pageLabel.textColor(theme.textPrimary);
        this._pageLabel.textAlign(dxui.Utils.TEXT_ALIGN.CENTER);

        this._listPanel.hide();
        this._pager.hide();
        this._emptyBox.show();
    }

    /**
     * @param {number} index
     * @returns {{ row: object, nameLbl: object, idLbl: object, contact: object|null }}
     */
    _createRowSlot(index) {
        const self = this;
        const row = dxui.View.build('call_list_row_' + index, this._list);
        layout.clearStyle(row);
        row.setSize(this._rowW, this._rowH);
        row.bgColor(theme.pageBg);
        row.bgOpa(100);
        row.radius(layout.x(14));
        row.clickable(true);
        row.hide();
        row.on(dxui.Utils.EVENT.CLICK, function () {
            const contact = self._rowSlots[index].contact;
            if (!contact || !contact.id) {
                return;
            }
            router.navigate('call_session', {
                id: contact.id,
                name: contact.name,
            });
        });

        const nameLbl = dxui.Label.build('call_list_row_' + index + '_name', row);
        nameLbl.setSize(layout.x(520), layout.y(40));
        nameLbl.align(dxui.Utils.ALIGN.LEFT_MID, layout.x(28), layout.y(-12));
        nameLbl.textFont(font.get(layout.fontSize(28)));
        nameLbl.textColor(theme.textPrimary);
        nameLbl.textAlign(dxui.Utils.TEXT_ALIGN.LEFT);

        const idLbl = dxui.Label.build('call_list_row_' + index + '_id', row);
        idLbl.setSize(layout.x(520), layout.y(30));
        idLbl.align(dxui.Utils.ALIGN.LEFT_MID, layout.x(28), layout.y(18));
        idLbl.textFont(font.get(layout.fontSize(20)));
        idLbl.textColor(theme.textSecondary);
        idLbl.textAlign(dxui.Utils.TEXT_ALIGN.LEFT);

        return { row: row, nameLbl: nameLbl, idLbl: idLbl, contact: null };
    }

    _loadContacts() {
        const self = this;
        const token = ++this._fetchToken;
        this._contacts = null;
        this._pageIndex = 0;
        this._paint();

        callStore.loadContacts().then(function (contacts) {
            if (token !== self._fetchToken) {
                return;
            }
            self._contacts = contacts;
            self._pageIndex = 0;
            self._paint();
        }).catch(function (e) {
            if (token !== self._fetchToken) {
                return;
            }
            self._contacts = [];
            self._paint();
            self._emptyLabel.text(e && e.message ? e.message : '联系人查询失败');
        });
    }

    _paint() {
        if (this._contacts === null) {
            this._listPanel.hide();
            this._pager.hide();
            this._hideRows();
            if (this._emptyImg) {
                this._emptyImg.hide();
            }
            if (this._emptyLabel) {
                this._emptyLabel.text(t('call.list.loading'));
            }
            this._emptyBox.show();
            if (this._spinner) {
                this._spinner.start();
            }
            return;
        }

        if (this._spinner) {
            this._spinner.stop();
        }

        if (!this._contacts.length) {
            this._listPanel.hide();
            this._pager.hide();
            this._hideRows();
            if (this._emptyImg) {
                this._emptyImg.show();
            }
            if (this._emptyLabel) {
                this._emptyLabel.text(t('call.list.empty'));
            }
            this._emptyBox.show();
            return;
        }

        this._emptyBox.hide();
        this._listPanel.show();
        this._pager.show();
        this._renderPage();
    }

    _totalPages() {
        if (!this._contacts || !this._contacts.length) {
            return 1;
        }
        return Math.ceil(this._contacts.length / PAGE_SIZE);
    }

    /**
     * @param {number} pageIndex
     */
    _goPage(pageIndex) {
        const total = this._totalPages();
        if (pageIndex < 0 || pageIndex >= total) {
            return;
        }
        this._pageIndex = pageIndex;
        this._renderPage();
    }

    _renderPage() {
        const total = this._totalPages();
        if (this._pageIndex >= total) {
            this._pageIndex = Math.max(0, total - 1);
        }
        const list = this._contacts || [];
        const start = this._pageIndex * PAGE_SIZE;
        for (let i = 0; i < PAGE_SIZE; i++) {
            const slot = this._rowSlots[i];
            const contact = list[start + i];
            if (!contact) {
                slot.contact = null;
                slot.row.hide();
                continue;
            }
            slot.contact = contact;
            slot.nameLbl.text(contact.name || '');
            slot.idLbl.text(contact.id || '');
            slot.row.show();
        }

        this._pageLabel.text(t('call.list.page', {
            current: this._pageIndex + 1,
            total: total,
        }));

        if (this._pageIndex <= 0) {
            this._prevBtn.hide();
        } else {
            this._prevBtn.show();
        }
        if (this._pageIndex >= total - 1) {
            this._nextBtn.hide();
        } else {
            this._nextBtn.show();
        }
    }

    _hideRows() {
        for (let i = 0; i < this._rowSlots.length; i++) {
            this._rowSlots[i].row.hide();
        }
    }
}
