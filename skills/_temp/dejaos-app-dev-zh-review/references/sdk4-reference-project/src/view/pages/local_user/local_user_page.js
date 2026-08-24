/**
 * @layer    view
 * @module   local_user_page
 * @fires    none
 * @listens  none
 * @depends  dxUi,BaseView,font,layout,theme,page_header,assets,i18n,keyboard,loading_spinner,router,local_user_store
 *
 * 本地用户页：通过统一Command分页查询SQLite人员数据。
 * 支持按姓名 / ID 模糊搜索；「新增」进入录入页；加载中 → 动画；无数据 → 空态；有数据 → 分页列表。
 */

import dxui from '../../../../dxmodules/dxUi.js';
import BaseView from '../base_view.js';
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
import localUserStore from './local_user_store.js';

const IMG_EMPTY = asset('1x/empty.png');

/** 每页条数（与屏高匹配，控件数恒定） */
const PAGE_SIZE = 10;
/** 搜索栏设计稿高度 */
const SEARCH_BAR_H = 88;
/** 底部分页条设计稿高度 */
const PAGER_H = 88;
/** 列表上下内边距（设计稿） */
const LIST_PAD_V = 8;
/** 行间距（设计稿） */
const ROW_GAP = 6;
const ROW_BG = theme.pageBg;
const ROW_BG_PRESSED = 0xe0e0e0;

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
        this._prevBtn = null;
        this._nextBtn = null;
        this._pageLabel = null;
        /** @type {{ row: object, nameLbl: object, idLbl: object, user: object|null }[]} */
        this._rowSlots = [];
        this._rowH = 0;
        this._rowGap = 0;
        this._rowW = 0;
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
        this.root.bgColor(theme.pageBg);
        this.root.bgOpa(100);
        this.root.scroll(false);

        this._header = pageHeader.build(this.root, {
            idPrefix: 'local_user',
            titleKey: 'settings.menu.localUser',
        });
        this._buildContent();
    }

    onEnter() {
        if (this._header) {
            this._header.refresh();
        }
        this._refreshSearchPlaceholder();
        if (this._addBtnLabel) {
            this._addBtnLabel.text(t('localUser.add'));
        }
        this._loadUsers();
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
     * 内容区：搜索栏 + 空态 + 列表区 + 底部分页条。
     */
    _buildContent() {
        const self = this;
        const top = pageHeader.contentTop();
        const pagerH = layout.y(PAGER_H);
        const searchH = layout.y(SEARCH_BAR_H);
        const contentH = layout.height - top;
        const listH = contentH - pagerH - searchH;
        const listPadV = layout.y(LIST_PAD_V);
        const rowGap = layout.y(ROW_GAP);
        // 按列表可用高度均分行高，铺满上下空间
        const usable = Math.max(0, listH - listPadV * 2);
        this._rowGap = rowGap;
        this._rowH = Math.max(
            layout.y(64),
            Math.floor((usable - rowGap * (PAGE_SIZE - 1)) / PAGE_SIZE)
        );
        this._rowW = layout.x(720);

        this._content = dxui.View.build('local_user_content', this.root);
        this._content.setSize(layout.width, contentH);
        this._content.setPos(0, top);
        layout.clearStyle(this._content);
        this._content.bgColor(0xf5f5f5);
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

        this._list = dxui.View.build('local_user_list', this._listPanel);
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

        this._pager = dxui.View.build('local_user_pager', this._content);
        this._pager.setSize(layout.width, pagerH);
        this._pager.align(dxui.Utils.ALIGN.BOTTOM_MID, 0, 0);
        layout.clearStyle(this._pager);
        this._pager.bgColor(theme.pageBg);
        this._pager.bgOpa(100);
        this._pager.scroll(false);

        this._prevBtn = dxui.Button.build('local_user_prev', this._pager);
        this._prevBtn.setSize(layout.x(120), layout.y(56));
        this._prevBtn.align(dxui.Utils.ALIGN.LEFT_MID, layout.x(32), 0);
        this._prevBtn.bgColor(theme.activeBg);
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

        this._nextBtn = dxui.Button.build('local_user_next', this._pager);
        this._nextBtn.setSize(layout.x(120), layout.y(56));
        this._nextBtn.align(dxui.Utils.ALIGN.RIGHT_MID, -layout.x(32), 0);
        this._nextBtn.bgColor(theme.activeBg);
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

        this._pageLabel = dxui.Label.build('local_user_page_lbl', this._pager);
        this._pageLabel.setSize(layout.x(280), layout.y(40));
        this._pageLabel.align(dxui.Utils.ALIGN.CENTER, 0, 0);
        this._pageLabel.textFont(font.get(layout.fontSize(24)));
        this._pageLabel.textColor(theme.textPrimary);
        this._pageLabel.textAlign(dxui.Utils.TEXT_ALIGN.CENTER);

        this._listPanel.hide();
        this._pager.hide();
        this._emptyBox.show();
    }

    /**
     * @param {number} searchH
     */
    _buildSearchBar(searchH) {
        const self = this;
        const barInnerW = layout.x(720);
        const barH = layout.y(72);
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
        inputBox.bgColor(theme.pageBg);
        inputBox.bgOpa(100);
        inputBox.radius(layout.x(14));
        inputBox.borderWidth(0);
        inputBox.scroll(false);

        this._searchInput = dxui.Textarea.build('local_user_search_input', inputBox);
        layout.clearStyle(this._searchInput);
        this._searchInput.setSize(searchW - layout.x(40), layout.y(56));
        this._searchInput.align(dxui.Utils.ALIGN.CENTER, 0, 0);
        this._searchInput.bgOpa(0);
        this._searchInput.padAll(0);
        this._searchInput.borderWidth(0);
        this._searchInput.setOneLine(true);
        this._searchInput.setMaxLength(64);
        this._searchInput.setCursorClickPos(true);
        this._searchInput.textFont(font.get(layout.fontSize(26)));
        this._searchInput.textColor(theme.textPrimary);
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
        this._addBtn.bgColor(theme.accent);
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
        row.setSize(this._rowW, this._rowH);
        row.bgColor(ROW_BG);
        row.bgColor(ROW_BG_PRESSED, dxui.Utils.STATE.PRESSED);
        row.bgOpa(100);
        row.radius(layout.x(14));
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
                r.bgColor(ROW_BG_PRESSED);
            };
        })(row));
        row.on(dxui.Utils.ENUM.LV_EVENT_RELEASED, (function (r) {
            return function () {
                r.bgColor(ROW_BG);
            };
        })(row));
        if (dxui.Utils.ENUM.LV_EVENT_PRESS_LOST !== undefined) {
            row.on(dxui.Utils.ENUM.LV_EVENT_PRESS_LOST, (function (r) {
                return function () {
                    r.bgColor(ROW_BG);
                };
            })(row));
        }

        const nameLbl = dxui.Label.build('local_user_row_' + index + '_name', row);
        nameLbl.setSize(layout.x(400), layout.y(40));
        nameLbl.align(dxui.Utils.ALIGN.LEFT_MID, layout.x(28), layout.y(-12));
        nameLbl.textFont(font.get(layout.fontSize(28)));
        nameLbl.textColor(theme.textPrimary);
        nameLbl.textAlign(dxui.Utils.TEXT_ALIGN.LEFT);

        const idLbl = dxui.Label.build('local_user_row_' + index + '_id', row);
        idLbl.setSize(layout.x(400), layout.y(30));
        idLbl.align(dxui.Utils.ALIGN.LEFT_MID, layout.x(28), layout.y(18));
        idLbl.textFont(font.get(layout.fontSize(20)));
        idLbl.textColor(theme.textSecondary);
        idLbl.textAlign(dxui.Utils.TEXT_ALIGN.LEFT);

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
        // Router不会等待onEnter返回Promise，因此页面必须在这里自行捕获异步错误。
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
