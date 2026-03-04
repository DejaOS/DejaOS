import dxui from "../../../dxmodules/dxUi.js";
import log from "../../../dxmodules/dxLogger.js";
import dxDriver from "../../../dxmodules/dxDriver.js";
import UIManager from "../UIManager.js";
import LockerService from "../../lock/LockerService.js";

// Admin: store/pick records page, large screen, style same as AdminHomePage
const RecordsPage = {
  id: "adminRecords",

  init: function () {
    const parent = UIManager.getRoot();

    this.root = dxui.View.build(this.id, parent);
    this.root.setSize(dxDriver.DISPLAY.WIDTH, dxDriver.DISPLAY.HEIGHT);
    this.root.radius(0);
    this.root.borderWidth(0);
    this.root.padAll(0);
    this.root.bgColor(0xebebeb);

    this.data = {
      page: 0,
      pageSize: 6,
      total: 0,
      records: [],
    };

    this._initView();
    this._bindEvents();
    this._renderPage();

    return this.root;
  },

  _initView: function () {
    const W = dxDriver.DISPLAY.WIDTH;
    const H = dxDriver.DISPLAY.HEIGHT;

    const titleFontSize = Math.round(H * 0.032);
    const cancelFontSize = Math.round(H * 0.024);
    const line1FontSize = Math.round(H * 0.024);
    const line2FontSize = Math.round(H * 0.02);
    const pageInfoFontSize = Math.round(H * 0.026);

    // 1. Top title
    this.tipLabel = dxui.Label.build(this.id + "_tip", this.root);
    this.tipLabel.text("Store/Pick Records");
    this.tipLabel.textFont(UIManager.font(titleFontSize, dxui.Utils.FONT_STYLE.BOLD));
    this.tipLabel.textColor(0x333333);
    this.tipLabel.setSize(Math.round(W * 0.6), Math.round(H * 0.05));
    this.tipLabel.align(dxui.Utils.ALIGN.TOP_MID, 0, Math.round(H * 0.025));

    // 2. Cancel button: top right
    this.btnCancel = dxui.Button.build(this.id + "_cancel", this.root);
    this.btnCancel.setSize(Math.round(W * 0.15), Math.round(H * 0.05));
    this.btnCancel.radius(0);
    this.btnCancel.bgOpa(0);
    this.btnCancel.borderWidth(0);
    this.btnCancel.align(dxui.Utils.ALIGN.TOP_RIGHT, -Math.round(W * 0.03), Math.round(H * 0.02));

    this.btnCancelLabel = dxui.Label.build(this.id + "_cancel_label", this.btnCancel);
    this.btnCancelLabel.text("Cancel");
    this.btnCancelLabel.textFont(UIManager.font(cancelFontSize, dxui.Utils.FONT_STYLE.NORMAL));
    this.btnCancelLabel.textColor(0x888888);
    this.btnCancelLabel.align(dxui.Utils.ALIGN.CENTER, 0, 0);

    this.btnCancel.on(dxui.Utils.EVENT.CLICK, () => {
      this.close();
    });

    // 3. List items: 6 rows, larger row height and gap
    const rowW = Math.round(W * 0.94);
    const blockHeight = Math.round(H * 0.11);
    const rowGap = Math.round(H * 0.02);
    const listStartY = Math.round(H * 0.09);
    const pad = Math.round(rowW * 0.04);

    this.itemViews = [];
    for (let i = 0; i < 6; i++) {
      const y = listStartY + i * (blockHeight + rowGap);

      const container = dxui.View.build(`${this.id}_item_${i}`, this.root);
      container.setSize(rowW, blockHeight);
      container.radius(Math.round(blockHeight * 0.15));
      container.borderWidth(0);
      container.bgColor(0xffffff);
      container.align(dxui.Utils.ALIGN.TOP_MID, 0, y);
      container.scroll(false);

      const line1 = dxui.Label.build(`${this.id}_item_${i}_line1`, container);
      line1.text(" ");
      line1.textFont(UIManager.font(line1FontSize, dxui.Utils.FONT_STYLE.NORMAL));
      line1.setSize(rowW - pad * 2, Math.round(blockHeight * 0.45));
      line1.setPos(pad, Math.round(blockHeight * 0.08));

      const line2 = dxui.Label.build(`${this.id}_item_${i}_line2`, container);
      line2.text(" ");
      line2.textFont(UIManager.font(line2FontSize, dxui.Utils.FONT_STYLE.NORMAL));
      line2.setSize(rowW - pad * 2, Math.round(blockHeight * 0.45));
      line2.setPos(pad, Math.round(blockHeight * 0.48));

      this.itemViews.push({ container, line1, line2 });
    }

    // 4. Pagination: prev, page info, next (text buttons, no icons)
    const btnNavH = Math.round(H * 0.05);
    const btnNavW = Math.round(W * 0.22);
    const paginationY = listStartY + 6 * (blockHeight + rowGap) + Math.round(H * 0.02);

    this.btnPrev = dxui.Button.build(this.id + "_prev", this.root);
    this.btnPrev.setSize(btnNavW, btnNavH);
    this.btnPrev.radius(Math.round(btnNavH / 2));
    this.btnPrev.scroll(false);
    this.btnPrev.align(dxui.Utils.ALIGN.TOP_LEFT, Math.round(W * 0.05), paginationY);

    this.btnPrevLabel = dxui.Label.build(this.id + "_prev_label", this.btnPrev);
    this.btnPrevLabel.text("Prev");
    this.btnPrevLabel.textFont(UIManager.font(pageInfoFontSize, dxui.Utils.FONT_STYLE.NORMAL));
    this.btnPrevLabel.textColor(0xffa31f);
    this.btnPrevLabel.align(dxui.Utils.ALIGN.CENTER, 0, 0);

    this.pageInfoLabel = dxui.Label.build(this.id + "_page_info", this.root);
    this.pageInfoLabel.text("");
    this.pageInfoLabel.textFont(UIManager.font(pageInfoFontSize, dxui.Utils.FONT_STYLE.NORMAL));
    this.pageInfoLabel.textColor(0xffa31f);
    this.pageInfoLabel.setSize(Math.round(W * 0.25), btnNavH);
    this.pageInfoLabel.textAlign(dxui.Utils.TEXT_ALIGN.CENTER);
    this.pageInfoLabel.align(dxui.Utils.ALIGN.TOP_MID, 0, paginationY);

    this.btnNext = dxui.Button.build(this.id + "_next", this.root);
    this.btnNext.setSize(btnNavW, btnNavH);
    this.btnNext.radius(Math.round(btnNavH / 2));
    this.btnNext.scroll(false);
    this.btnNext.align(dxui.Utils.ALIGN.TOP_RIGHT, -Math.round(W * 0.05), paginationY);

    this.btnNextLabel = dxui.Label.build(this.id + "_next_label", this.btnNext);
    this.btnNextLabel.text("Next");
    this.btnNextLabel.textFont(UIManager.font(pageInfoFontSize, dxui.Utils.FONT_STYLE.NORMAL));
    this.btnNextLabel.textColor(0xffa31f);
    this.btnNextLabel.align(dxui.Utils.ALIGN.CENTER, 0, 0);
  },

  _bindEvents: function () {
    this.btnPrev.on(dxui.Utils.EVENT.CLICK, () => {
      if (this.data.page > 0) {
        this.data.page -= 1;
        this._renderPage();
      }
    });

    this.btnNext.on(dxui.Utils.EVENT.CLICK, () => {
      const maxPage = Math.ceil(this.data.total / this.data.pageSize) - 1;
      if (this.data.page < maxPage) {
        this.data.page += 1;
        this._renderPage();
      }
    });
  },

  _formatTime: function (ts) {
    const n = Number(ts);
    if (!n) return "-";
    const d = new Date(n);
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    const hh = String(d.getHours()).padStart(2, "0");
    const mm = String(d.getMinutes()).padStart(2, "0");
    const ss = String(d.getSeconds()).padStart(2, "0");
    return `${y}-${m}-${day} ${hh}:${mm}:${ss}`;
  },

  _renderPage: function () {
    let total = 0;
    try {
      total = LockerService.getRecordsTotalCount();
    } catch (e) {
      log.error("adminRecords", "Get record count failed", e);
      total = 0;
    }

    this.data.total = Number(total) || 0;

    const pageSize = this.data.pageSize;
    const totalPages =
      this.data.total > 0 ? Math.ceil(this.data.total / pageSize) : 1;

    const maxPage = totalPages - 1;
    if (this.data.page > maxPage) {
      this.data.page = maxPage < 0 ? 0 : maxPage;
    }

    let slice = [];
    try {
      log.info(new Date().getTime(), "Query records page", this.data.page, pageSize);
      slice =
        LockerService.getRecordsPage({
          pageIndex: this.data.page,
          pageSize,
        }) || [];
      log.info(new Date().getTime(), "Query records page", slice.length);
    } catch (e) {
      log.error("adminRecords", "Query records page failed", e);
      slice = [];
    }

    if (this.pageInfoLabel) {
      this.pageInfoLabel.text(`${this.data.page + 1}/${totalPages}`);
    }

    // Prev button style: disabled = border + gray text, enabled = orange bg + white text
    if (this.data.page <= 0) {
      this.btnPrev.borderWidth(1);
      this.btnPrev.setBorderColor(0xffa31f);
      this.btnPrev.bgOpa(0);
      if (this.btnPrevLabel) this.btnPrevLabel.textColor(0x999999);
    } else {
      this.btnPrev.borderWidth(0);
      this.btnPrev.bgColor(0xffa31f);
      this.btnPrev.bgOpa(100);
      if (this.btnPrevLabel) this.btnPrevLabel.textColor(0xffffff);
    }

    // Next button style
    if (this.data.page >= maxPage) {
      this.btnNext.borderWidth(1);
      this.btnNext.setBorderColor(0xffa31f);
      this.btnNext.bgOpa(0);
      if (this.btnNextLabel) this.btnNextLabel.textColor(0x999999);
    } else {
      this.btnNext.borderWidth(0);
      this.btnNext.bgColor(0xffa31f);
      this.btnNext.bgOpa(100);
      if (this.btnNextLabel) this.btnNextLabel.textColor(0xffffff);
    }

    for (let i = 0; i < this.itemViews.length; i++) {
      const view = this.itemViews[i];
      const rec = slice[i];
      if (!rec) {
        view.container.hide();
        continue;
      }
      view.container.show();

      const success = Number(rec.result) === 1;
      const uid = rec.user_id != null ? String(rec.user_id) : "-";

      view.line1.text(
        `Cab: ${rec.cabinet_no}  User: ${uid}  Result: ${success ? "OK" : "Fail"}`
      );
      view.line2.text(
        `Store: ${this._formatTime(rec.store_time)}  Pick: ${this._formatTime(rec.pickup_time)}`
      );

      const color = success ? 0x23bf15 : 0xf90000;
      const fadingColor = success ? 0x91df8a : 0xfc7f7f;

      view.line1.textColor(color);
      view.line2.textColor(fadingColor);
    }
  },

  onShow: function () {
    this.data.page = 0;
    this._renderPage();
  },

  onHide: function () {},
};

export default RecordsPage;
