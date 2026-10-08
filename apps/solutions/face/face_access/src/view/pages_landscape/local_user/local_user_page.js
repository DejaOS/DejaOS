/**
 * @layer    view
 * @module   local_user_page
 * @fires    none
 * @listens  none
 * @depends  dxUi,BaseView,font,layout,theme,page_header,assets,i18n,keyboard,loading_spinner,router,local_user_store
 *
 * 本地用户页：通过统一Command分页查询SQLite人员数据。
 * 横屏：5 行 × 2 列共 10 人/页；页码与上一页/下一页集中在底部中间，互不影响竖屏。
 */

import dxui from '../../../../dxmodules/dxUi.js';
import BaseView from '../../pages/base_view.js';
import font from '../../components/font.js';
import layout from '../../components/layout.js';
import theme from '../../components/theme.js';
import pageHeader from '../../components/page_header.js';
import keyboard from '../../components/keyboard.js';
import loadingSpinner from '../../components/loading_spinner.js';
import { asset } from '../../utils/assets.js';
import { t } from '../../i18n/index.js';
import router from '../../router/core.js';
import popup from '../../components/popup.js';
import localUserStore from '../../pages/local_user/local_user_store.js';
import { CONTENT_W } from '../ls_metrics.js';

const IMG_EMPTY = asset('empty.png');
const IMG_ARROW = asset('keyboard-arrow-right.png');

/** 横屏每页条数（5×2）；竖屏 pages/local_user 独立常量，互不影响 */
const PAGE_SIZE = 10;
const GRID_COLS = 2;
const GRID_ROWS = 5;
const PAGER_H = 72;
const SEARCH_BAR_H = 88;
const LIST_PAD = 12;
const CARD_GAP = 16;
const CARD_BG = 0xf6f6f6;
const CARD_BG_PRESSED = 0xe8e8e8;

export default class LocalUserPage extends BaseView {
    constructor() {
        super('settings_localUser');
        this._header = null;
        this._content = null;
        this._searchBar = null;
        this._searchInput = null;
        this._searchKb = null;
        this._addBtn = null;
        this._addBtnLabel = null;
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
        /** @type {{ row: object, nameLbl: object, idLbl: object, user: object|null }[]} */
        this._rowSlots = [];
        this._rowH = 0;
        this._cardW = 0;
        this._cardGap = 0;
        /** 当前页，从 0 开始 */
        this._pageIndex = 0;
        /** @type {Array<{ id: string, name: string }>|null} null=加载中 */
        this._users = null;
        /** @type {Array<{ id: string, name: string }>} 搜索过滤后的列表 */
        this._filtered = [];
        /** 后端返回的总页数，列表只保留当前页数据。 */
        this._totalPage = 0;
        /** 当前搜索关键词 */
        this._keyword = '';
        this._fetchToken = 0;
    }

    onCreate() {
        this.root = dxui.View.build('page_local_user', dxui.Utils.LAYER.MAIN);
        this.root.setSize(layout.width, layout.height);
        layout.clearStyle(this.root);
        this.root.bgColor(0xffffff);
        this.root.bgOpa(100);
        this.root.scroll(false);

        this._header = pageHeader.build(this.root, {
            idPrefix: 'local_user',
            titleKey: 'settings.menu.localUser',
        });
        this._buildContent();
    }

    onEnter(context) {
        if (this._header) {
            this._header.refresh();
        }
        this._refreshSearchPlaceholder();
        if (this._addBtnLabel) {
            this._addBtnLabel.text(t('localUser.add'));
        }
        // 从编辑/子页返回时保留当前页与搜索；从菜单新进再重置
        if (context && context.isBack) {
            this._loadPage(this._pageIndex || 0);
        } else {
            this._loadUsers();
        }
    }

    onExit() {
        this._fetchToken += 1;
        if (this._spinner) {
            this._spinner.stop();
        }
        if (this._searchKb) {
            this._searchKb.hide();
        }
        keyboard.hideAll();
    }

    /**
     * 内容区：搜索栏 + 空态 + 双列列表 + 底部分页（页码与翻页钮集中）。
     */
    _buildContent() {
        const self = this;
        const top = pageHeader.contentTop();
        const pagerH = layout.y(PAGER_H);
        const searchH = layout.y(SEARCH_BAR_H);
        const contentH = layout.height - top;
        const listH = contentH - pagerH - searchH;
        const listPad = layout.y(LIST_PAD);
        const cardGap = layout.x(CARD_GAP);
        const listInnerW = layout.x(CONTENT_W);
        this._cardGap = cardGap;
        this._cardW = Math.floor((listInnerW - cardGap) / GRID_COLS);
        this._rowH = Math.max(
            layout.y(72),
            Math.floor((listH - listPad * 2 - layout.y(CARD_GAP) * (GRID_ROWS - 1)) / GRID_ROWS)
        );

        this._content = dxui.View.build('local_user_content', this.root);
        this._content.setSize(layout.width, contentH);
        this._content.setPos(0, top);
        layout.clearStyle(this._content);
        this._content.bgColor(0xffffff);
        this._content.bgOpa(100);
        this._content.scroll(false);

        this._buildSearchBar(searchH);

        this._emptyBox = dxui.View.build('local_user_empty', this._content);
        this._emptyBox.setSize(layout.x(320), layout.y(280));
        layout.clearStyle(this._emptyBox);
        this._emptyBox.bgOpa(0);
        this._emptyBox.align(dxui.Utils.ALIGN.CENTER, 0, layout.y(-40));
        this._emptyBox.clickable(false);

        this._emptyImg = dxui.Image.build('local_user_empty_img', this._emptyBox);
        this._emptyImg.source(IMG_EMPTY);
        this._emptyImg.align(dxui.Utils.ALIGN.TOP_MID, 0, 0);

        this._spinner = loadingSpinner.build(this._emptyBox, {
            idPrefix: 'local_user_spinner',
            size: layout.x(96),
            color: theme.textSecondary,
        });
        this._spinner.root.align(dxui.Utils.ALIGN.TOP_MID, 0, layout.y(40));
        this.addCleanup(function () {
            if (self._spinner) {
                self._spinner.stop();
            }
        });

        this._emptyLabel = dxui.Label.build('local_user_empty_lbl', this._emptyBox);
        this._emptyLabel.setSize(layout.x(320), layout.y(50));
        this._emptyLabel.align(dxui.Utils.ALIGN.BOTTOM_MID, 0, 0);
        this._emptyLabel.text(t('localUser.empty'));
        this._emptyLabel.textFont(font.get(layout.fontSize(24)));
        this._emptyLabel.textColor(theme.textSecondary);
        this._emptyLabel.textAlign(dxui.Utils.TEXT_ALIGN.CENTER);

        this._listPanel = dxui.View.build('local_user_list_panel', this._content);
        this._listPanel.setSize(layout.width, listH);
        this._listPanel.setPos(0, searchH);
        layout.clearStyle(this._listPanel);
        this._listPanel.bgOpa(0);
        this._listPanel.scroll(false);

        const listX = Math.round((layout.width - listInnerW) / 2);
        this._list = dxui.View.build('local_user_list', this._listPanel);
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

        this._pager = dxui.View.build('local_user_pager', this._content);
        this._pager.setSize(layout.width, pagerH);
        this._pager.align(dxui.Utils.ALIGN.BOTTOM_MID, 0, 0);
        layout.clearStyle(this._pager);
        this._pager.bgColor(0xffffff);
        this._pager.bgOpa(100);
        this._pager.scroll(false);

        // 上一页 / 页码 / 下一页集中；三者同高并垂直居中对齐
        const pagerBtnH = layout.y(56);
        const groupW = layout.x(420);
        this._pagerGroup = dxui.View.build('local_user_pager_group', this._pager);
        layout.clearStyle(this._pagerGroup);
        this._pagerGroup.setSize(groupW, pagerBtnH);
        this._pagerGroup.align(dxui.Utils.ALIGN.CENTER, 0, 0);
        this._pagerGroup.bgOpa(0);
        this._pagerGroup.scroll(false);

        this._prevBtn = dxui.Button.build('local_user_prev', this._pagerGroup);
        this._prevBtn.setSize(layout.x(88), pagerBtnH);
        this._prevBtn.align(dxui.Utils.ALIGN.LEFT_MID, 0, 0);
        this._prevBtn.bgColor(0x1a1a1a);
        this._prevBtn.radius(layout.x(12));
        this._prevBtn.borderWidth(0);
        this._prevBtn.on(dxui.Utils.EVENT.CLICK, function () {
            self._goPage(self._pageIndex - 1);
        });
        const prevLbl = dxui.Label.build('local_user_prev_lbl', this._prevBtn);
        prevLbl.text('←');
        prevLbl.textFont(font.get(layout.fontSize(30)));
        prevLbl.textColor(theme.textOnDark);
        prevLbl.align(dxui.Utils.ALIGN.CENTER, 0, 0);

        this._pageLabel = dxui.Label.build('local_user_page_lbl', this._pagerGroup);
        // 标签高度贴近字号，整体 CENTER 对齐翻页钮垂直中线
        this._pageLabel.setSize(layout.x(200), layout.y(36));
        this._pageLabel.align(dxui.Utils.ALIGN.CENTER, 0, 0);
        this._pageLabel.textFont(font.getDefault(layout.fontSize(24)));
        this._pageLabel.textColor(theme.textPrimary);
        this._pageLabel.textAlign(dxui.Utils.TEXT_ALIGN.CENTER);

        this._nextBtn = dxui.Button.build('local_user_next', this._pagerGroup);
        this._nextBtn.setSize(layout.x(88), pagerBtnH);
        this._nextBtn.align(dxui.Utils.ALIGN.RIGHT_MID, 0, 0);
        this._nextBtn.bgColor(0x1a1a1a);
        this._nextBtn.radius(layout.x(12));
        this._nextBtn.borderWidth(0);
        this._nextBtn.on(dxui.Utils.EVENT.CLICK, function () {
            self._goPage(self._pageIndex + 1);
        });
        const nextLbl = dxui.Label.build('local_user_next_lbl', this._nextBtn);
        nextLbl.text('→');
        nextLbl.textFont(font.get(layout.fontSize(30)));
        nextLbl.textColor(theme.textOnDark);
        nextLbl.align(dxui.Utils.ALIGN.CENTER, 0, 0);

        this._listPanel.hide();
        this._pager.hide();
        this._emptyBox.show();
    }

    /**
     * @param {number} searchH
     */
    _buildSearchBar(searchH) {
        const self = this;
        const barInnerW = layout.x(CONTENT_W);
        const barH = layout.y(66);
        const addW = layout.x(160);
        const gap = layout.x(16);
        const searchW = barInnerW - addW - gap;
        const sidePad = Math.round((layout.width - barInnerW) / 2);

        this._searchBar = dxui.View.build('local_user_search_bar', this._content);
        this._searchBar.setSize(layout.width, searchH);
        this._searchBar.setPos(0, 0);
        layout.clearStyle(this._searchBar);
        this._searchBar.bgOpa(0);
        this._searchBar.scroll(false);

        const inputBox = dxui.View.build('local_user_search_box', this._searchBar);
        inputBox.setSize(searchW, barH);
        inputBox.align(dxui.Utils.ALIGN.LEFT_MID, sidePad, 0);
        layout.clearStyle(inputBox);
        inputBox.bgColor(0xffffff);
        inputBox.bgOpa(100);
        inputBox.radius(layout.x(12));
        inputBox.borderWidth(layout.x(1));
        inputBox.setBorderColor(0xd8d8d8);
        inputBox.scroll(false);

        this._searchInput = dxui.Textarea.build('local_user_search_input', inputBox);
        layout.clearStyle(this._searchInput);
        this._searchInput.setSize(searchW - layout.x(40), layout.y(48));
        this._searchInput.align(dxui.Utils.ALIGN.CENTER, 0, 0);
        this._searchInput.bgOpa(0);
        this._searchInput.padAll(0);
        this._searchInput.borderWidth(0);
        this._searchInput.setOneLine(true);
        this._searchInput.setMaxLength(64);
        this._searchInput.setCursorClickPos(true);
        this._searchInput.textFont(font.get(layout.fontSize(26)));
        this._searchInput.textColor(theme.textPrimary);
        this._searchInput.setAlign(dxui.Utils.TEXT_ALIGN.LEFT);
        this._searchInput.text('');

        this._searchKb = keyboard.bind(null, this._searchInput, {
            mode: keyboard.MODE.PINYIN,
            placeholder: t('localUser.searchPlaceholder'),
        });
        this._searchKb.setContentCb(function () {
            self._onSearchInput();
        });
        this._searchKb.setEnterCb(function () {
            self._onSearchInput();
        });

        this._addBtn = dxui.Button.build('local_user_add', this._searchBar);
        this._addBtn.setSize(addW, barH);
        this._addBtn.align(dxui.Utils.ALIGN.RIGHT_MID, -sidePad, 0);
        this._addBtn.bgColor(0x3d3d3d);
        this._addBtn.radius(layout.x(14));
        this._addBtn.borderWidth(0);
        this._addBtn.on(dxui.Utils.EVENT.CLICK, function () {
            self._onAddUser();
        });

        this._addBtnLabel = dxui.Label.build('local_user_add_lbl', this._addBtn);
        this._addBtnLabel.text(t('localUser.add'));
        this._addBtnLabel.textFont(font.get(layout.fontSize(26)));
        this._addBtnLabel.textColor(theme.textOnDark);
        this._addBtnLabel.align(dxui.Utils.ALIGN.CENTER, 0, 0);
    }

    /**
     * 新增用户入口。
     */
    _onAddUser() {
        if (this._searchKb) {
            this._searchKb.hide();
        }
        keyboard.hideAll();
        router.navigate('settings_localUser_add');
    }

    _refreshSearchPlaceholder() {
        if (this._searchKb) {
            this._searchKb.setPlaceholder(t('localUser.searchPlaceholder'));
        }
    }

    /**
     * 从输入框读取关键词并刷新过滤列表。
     */
    _onSearchInput() {
        let value = '';
        if (this._searchKb) {
            value = this._searchKb.getValue() || '';
        } else if (this._searchInput) {
            value = this._searchInput.text() || '';
        }
        const next = String(value).trim();
        if (next === this._keyword) {
            return;
        }
        this._keyword = next;
        this._pageIndex = 0;
        this._loadPage(0);
    }

    /**
     * 按姓名 / ID 做不区分大小写的子串匹配。
     */
    _applyFilter() {
        if (!this._users) {
            this._filtered = [];
            return;
        }
        const kw = this._keyword.toLowerCase();
        if (!kw) {
            this._filtered = this._users.slice();
            return;
        }
        const list = [];
        for (let i = 0; i < this._users.length; i++) {
            const user = this._users[i];
            const name = String(user.name || '').toLowerCase();
            const id = String(user.id || '').toLowerCase();
            if (name.indexOf(kw) >= 0 || id.indexOf(kw) >= 0) {
                list.push(user);
            }
        }
        this._filtered = list;
    }

    /**
     * @param {number} index
     * @returns {{ row: object, nameLbl: object, idLbl: object }}
     */
    _createRowSlot(index) {
        const self = this;
        const row = dxui.View.build('local_user_row_' + index, this._list);
        layout.clearStyle(row);
        row.setSize(this._cardW, this._rowH);
        row.bgColor(CARD_BG);
        row.bgOpa(100);
        row.radius(layout.x(12));
        row.clickable(true);
        row.hide();
        row.on(dxui.Utils.EVENT.CLICK, function () {
            const user = self._rowSlots[index].user;
            if (!user || !user.id) {
                return;
            }
            if (self._searchKb) {
                self._searchKb.hide();
            }
            keyboard.hideAll();
            router.navigate('settings_localUser_edit', { id: user.id });
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

        const nameLbl = dxui.Label.build('local_user_row_' + index + '_name', row);
        nameLbl.setSize(this._cardW - layout.x(100), layout.y(36));
        nameLbl.align(dxui.Utils.ALIGN.LEFT_MID, layout.x(28), layout.y(-14));
        nameLbl.textFont(font.get(layout.fontSize(26)));
        nameLbl.textColor(0x333333);
        nameLbl.textAlign(dxui.Utils.TEXT_ALIGN.LEFT);
        nameLbl.longMode(dxui.Utils.LABEL_LONG_MODE.SCROLL_CIRCULAR);
        nameLbl.clickable(false);

        const idLbl = dxui.Label.build('local_user_row_' + index + '_id', row);
        idLbl.setSize(this._cardW - layout.x(100), layout.y(30));
        idLbl.align(dxui.Utils.ALIGN.LEFT_MID, layout.x(28), layout.y(16));
        idLbl.textFont(font.get(layout.fontSize(20)));
        idLbl.textColor(theme.textSecondary);
        idLbl.textAlign(dxui.Utils.TEXT_ALIGN.LEFT);
        idLbl.longMode(dxui.Utils.LABEL_LONG_MODE.CLIP);
        idLbl.clickable(false);

        const arrow = dxui.Image.build('local_user_row_' + index + '_arrow', row);
        arrow.source(IMG_ARROW);
        arrow.align(dxui.Utils.ALIGN.RIGHT_MID, -layout.x(24), 0);
        arrow.clickable(false);

        return { row: row, nameLbl: nameLbl, idLbl: idLbl, user: null };
    }

    _loadUsers() {
        this._keyword = '';
        this._pageIndex = 0;
        if (this._searchInput) {
            this._searchInput.text('');
        }
        this._loadPage(0);
    }

    _loadPage(pageIndex) {
        const self = this;
        const token = ++this._fetchToken;
        this._users = null;
        this._filtered = [];
        this._paint();
        localUserStore.list(pageIndex, PAGE_SIZE, this._keyword).then(function (result) {
            if (token !== self._fetchToken) return;
            self._users = result.users;
            self._pageIndex = result.page;
            self._totalPage = result.totalPage;
            self._applyFilter();
            self._paint();
        }).catch(function () {
            if (token !== self._fetchToken) return;
            self._users = [];
            self._filtered = [];
            self._totalPage = 0;
            self._paint();
            popup.showError(t('localUser.loadFailed'));
        });
    }

    /**
     * 加载中 → 动画；无匹配 → 空态；有数据 → 当前页列表 + 分页条。
     */
    _paint() {
        if (this._users === null) {
            this._listPanel.hide();
            this._pager.hide();
            this._hideRows();
            if (this._emptyImg) {
                this._emptyImg.hide();
            }
            if (this._emptyLabel) {
                this._emptyLabel.text(t('localUser.loading'));
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

        if (!this._filtered.length) {
            this._listPanel.hide();
            this._pager.hide();
            this._hideRows();
            if (this._emptyImg) {
                this._emptyImg.show();
            }
            if (this._emptyLabel) {
                this._emptyLabel.text(
                    this._keyword
                        ? t('localUser.noResult')
                        : t('localUser.empty')
                );
            }
            this._emptyBox.show();
            return;
        }

        this._emptyBox.hide();
        this._listPanel.show();
        this._pager.show();
        this._renderPage();
    }

    /**
     * @returns {number}
     */
    _totalPages() {
        return this._totalPage || 1;
    }

    /**
     * @param {number} pageIndex
     */
    _goPage(pageIndex) {
        const total = this._totalPages();
        if (pageIndex < 0 || pageIndex >= total) {
            return;
        }
        this._loadPage(pageIndex);
    }

    /**
     * 渲染当前页数据到固定行槽，并刷新分页控件。
     */
    _renderPage() {
        const total = this._totalPages();
        if (this._pageIndex >= total) {
            this._pageIndex = Math.max(0, total - 1);
        }
        for (let i = 0; i < PAGE_SIZE; i++) {
            const slot = this._rowSlots[i];
            const user = this._filtered[i];
            if (!user) {
                slot.user = null;
                slot.row.hide();
                continue;
            }
            slot.user = user;
            slot.nameLbl.text(user.name || '');
            slot.idLbl.text(user.id || '');
            slot.row.bgColor(CARD_BG);
            slot.row.show();
        }

        this._pageLabel.text(t('localUser.page', {
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
