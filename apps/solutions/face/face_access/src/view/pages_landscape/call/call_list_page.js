/**
 * @layer    view
 * @module   call_list_page
 * @fires    none
 * @listens  none
 * @depends  dxUi,BaseView,font,layout,theme,page_header,assets,i18n,loading_spinner,router,call_store
 *
 * 呼叫列表（横屏）：对齐本地用户——5 行 × 2 列共 10 人/页；
 * 页码与上一页/下一页集中在底部中间。
 */

import dxui from '../../../../dxmodules/dxUi.js';
import BaseView from '../../pages/base_view.js';
import font from '../../components/font.js';
import layout from '../../components/layout.js';
import theme from '../../components/theme.js';
import pageHeader from '../../components/page_header.js';
import loadingSpinner from '../../components/loading_spinner.js';
import { asset } from '../../utils/assets.js';
import { t } from '../../i18n/index.js';
import router from '../../router/core.js';
import callStore from '../../pages/call/call_store.js';
import { CONTENT_W } from '../ls_metrics.js';

const IMG_EMPTY = asset('empty.png');
const IMG_ARROW = asset('keyboard-arrow-right.png');

const PAGE_SIZE = 10;
const GRID_COLS = 2;
const GRID_ROWS = 5;
const PAGER_H = 72;
const LIST_PAD = 12;
const CARD_GAP = 16;
const CARD_BG = 0xf6f6f6;
const CARD_BG_PRESSED = 0xe8e8e8;

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
        this._pagerGroup = null;
        this._prevBtn = null;
        this._nextBtn = null;
        this._pageLabel = null;
        /** @type {{ row: object, nameLbl: object, idLbl: object, contact: object|null }[]} */
        this._rowSlots = [];
        this._rowH = 0;
        this._cardW = 0;
        this._pageIndex = 0;
        /** @type {Array<{ id: string, name: string }>|null} */
        this._contacts = null;
        this._fetchToken = 0;
    }

    onCreate() {
        this.root = dxui.View.build('page_call_list', dxui.Utils.LAYER.MAIN);
        this.root.setSize(layout.width, layout.height);
        layout.clearStyle(this.root);
        this.root.bgColor(0xffffff);
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
        const listPad = layout.y(LIST_PAD);
        const cardGap = layout.x(CARD_GAP);
        const listInnerW = layout.x(CONTENT_W);
        this._cardW = Math.floor((listInnerW - cardGap) / GRID_COLS);
        this._rowH = Math.max(
            layout.y(72),
            Math.floor((listH - listPad * 2 - layout.y(CARD_GAP) * (GRID_ROWS - 1)) / GRID_ROWS)
        );

        this._content = dxui.View.build('call_list_content', this.root);
        this._content.setSize(layout.width, contentH);
        this._content.setPos(0, top);
        layout.clearStyle(this._content);
        this._content.bgColor(0xffffff);
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

        const listX = Math.round((layout.width - listInnerW) / 2);
        this._list = dxui.View.build('call_list_rows', this._listPanel);
        this._list.setSize(listInnerW, listH);
        this._list.setPos(listX, 0);
        layout.clearStyle(this._list);
        this._list.bgOpa(0);
        this._list.scroll(false);
        this._list.flexFlow(dxui.Utils.FLEX_FLOW.ROW_WRAP);
        this._list.flexAlign(
            dxui.Utils.FLEX_ALIGN.START,
            dxui.Utils.FLEX_ALIGN.START,
            dxui.Utils.FLEX_ALIGN.START
        );
        this._list.padTop(listPad);
        this._list.padBottom(listPad);
        this._list.obj.lvObjSetStylePadGap(
            layout.y(CARD_GAP),
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
        this._pager.bgColor(0xffffff);
        this._pager.bgOpa(100);
        this._pager.scroll(false);

        const pagerBtnH = layout.y(56);
        const groupW = layout.x(420);
        this._pagerGroup = dxui.View.build('call_list_pager_group', this._pager);
        layout.clearStyle(this._pagerGroup);
        this._pagerGroup.setSize(groupW, pagerBtnH);
        this._pagerGroup.align(dxui.Utils.ALIGN.CENTER, 0, 0);
        this._pagerGroup.bgOpa(0);
        this._pagerGroup.scroll(false);

        this._prevBtn = dxui.Button.build('call_list_prev', this._pagerGroup);
        this._prevBtn.setSize(layout.x(88), pagerBtnH);
        this._prevBtn.align(dxui.Utils.ALIGN.LEFT_MID, 0, 0);
        this._prevBtn.bgColor(0x1a1a1a);
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

        this._pageLabel = dxui.Label.build('call_list_page_lbl', this._pagerGroup);
        this._pageLabel.setSize(layout.x(200), layout.y(36));
        this._pageLabel.align(dxui.Utils.ALIGN.CENTER, 0, 0);
        this._pageLabel.textFont(font.getDefault(layout.fontSize(24)));
        this._pageLabel.textColor(theme.textPrimary);
        this._pageLabel.textAlign(dxui.Utils.TEXT_ALIGN.CENTER);

        this._nextBtn = dxui.Button.build('call_list_next', this._pagerGroup);
        this._nextBtn.setSize(layout.x(88), pagerBtnH);
        this._nextBtn.align(dxui.Utils.ALIGN.RIGHT_MID, 0, 0);
        this._nextBtn.bgColor(0x1a1a1a);
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

        this._listPanel.hide();
        this._pager.hide();
        this._emptyBox.show();
    }

    /**
     * @param {number} index
     */
    _createRowSlot(index) {
        const self = this;
        const row = dxui.View.build('call_list_row_' + index, this._list);
        layout.clearStyle(row);
        row.setSize(this._cardW, this._rowH);
        row.bgColor(CARD_BG);
        row.bgOpa(100);
        row.radius(layout.x(12));
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
        row.on(dxui.Utils.ENUM.LV_EVENT_PRESSED, (function (r) {
            return function () {
                r.bgColor(CARD_BG_PRESSED);
            };
        })(row));
        row.on(dxui.Utils.ENUM.LV_EVENT_RELEASED, (function (r) {
            return function () {
                r.bgColor(CARD_BG);
            };
        })(row));
        if (dxui.Utils.ENUM.LV_EVENT_PRESS_LOST !== undefined) {
            row.on(dxui.Utils.ENUM.LV_EVENT_PRESS_LOST, (function (r) {
                return function () {
                    r.bgColor(CARD_BG);
                };
            })(row));
        }

        const nameLbl = dxui.Label.build('call_list_row_' + index + '_name', row);
        nameLbl.setSize(this._cardW - layout.x(100), layout.y(36));
        nameLbl.align(dxui.Utils.ALIGN.LEFT_MID, layout.x(28), layout.y(-14));
        nameLbl.textFont(font.get(layout.fontSize(26)));
        nameLbl.textColor(0x333333);
        nameLbl.textAlign(dxui.Utils.TEXT_ALIGN.LEFT);
        nameLbl.longMode(dxui.Utils.LABEL_LONG_MODE.SCROLL_CIRCULAR);
        nameLbl.clickable(false);

        const idLbl = dxui.Label.build('call_list_row_' + index + '_id', row);
        idLbl.setSize(this._cardW - layout.x(100), layout.y(30));
        idLbl.align(dxui.Utils.ALIGN.LEFT_MID, layout.x(28), layout.y(16));
        idLbl.textFont(font.get(layout.fontSize(20)));
        idLbl.textColor(theme.textSecondary);
        idLbl.textAlign(dxui.Utils.TEXT_ALIGN.LEFT);
        idLbl.longMode(dxui.Utils.LABEL_LONG_MODE.CLIP);
        idLbl.clickable(false);

        const arrow = dxui.Image.build('call_list_row_' + index + '_arrow', row);
        arrow.source(IMG_ARROW);
        arrow.align(dxui.Utils.ALIGN.RIGHT_MID, -layout.x(24), 0);
        arrow.clickable(false);

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
            slot.row.bgColor(CARD_BG);
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
