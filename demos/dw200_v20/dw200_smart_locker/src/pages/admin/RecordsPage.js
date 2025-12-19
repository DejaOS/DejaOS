import dxui from "../../../dxmodules/dxUi.js";
import log from "../../../dxmodules/dxLogger.js";
import dxDriver from "../../../dxmodules/dxDriver.js";
import UIManager from "../UIManager.js";
import LockerService from "../../lock/LockerService.js";

// Admin: store/pick records page
const RecordsPage = {
  id: "adminRecords",

  init: function () {
    const parent = UIManager.getRoot();

    this.root = dxui.View.build(this.id, parent);
    this.root.setSize(dxDriver.DISPLAY.WIDTH, dxDriver.DISPLAY.HEIGHT);
    this.root.radius(0);
    this.root.borderWidth(0);
    this.root.padAll(0);
    this.root.bgColor(0xf5f7fa);

    this.data = {
      page: 0,
      pageSize: 4,
      total: 0,
      records: [],
    };

    this._initView();
    this._bindEvents();
    this._renderPage();

    return this.root;
  },

  _initView: function () {
    // Top title: "Records"
    this.tipLabel = dxui.Label.build(this.id + "_tip", this.root);
    this.tipLabel.text("Records");
    this.tipLabel.textFont(UIManager.font(20, dxui.Utils.FONT_STYLE.NORMAL));
    this.tipLabel.setPos(12, 8);

    // Top buttons: prev / page info / next / cancel
    this.btnPrev = dxui.Button.build(this.id + "_prev", this.root);
    this.btnPrev.setSize(80, 32);
    this.btnPrev.radius(8);
    this.btnPrev.bgColor(0xcccccc);
    this.btnPrev.borderWidth(0);
    this.btnPrev.setPos(140, 8);
    this.btnPrev.scroll(false);
    this.btnPrevLabel = dxui.Label.build(this.id + "_prev_label", this.btnPrev);
    this.btnPrevLabel.text("Prev");
    this.btnPrevLabel.textFont(UIManager.font(16, dxui.Utils.FONT_STYLE.NORMAL));
    this.btnPrevLabel.align(dxui.Utils.ALIGN.CENTER, 0, 0);

    this.btnNext = dxui.Button.build(this.id + "_next", this.root);
    this.btnNext.setSize(80, 32);
    this.btnNext.radius(8);
    this.btnNext.bgColor(0xcccccc);
    this.btnNext.borderWidth(0);
    this.btnNext.setPos(300, 8);
    this.btnNext.scroll(false);
    this.btnNextLabel = dxui.Label.build(this.id + "_next_label", this.btnNext);
    this.btnNextLabel.text("Next");
    this.btnNextLabel.textFont(UIManager.font(16, dxui.Utils.FONT_STYLE.NORMAL));
    this.btnNextLabel.align(dxui.Utils.ALIGN.CENTER, 0, 0);

    // Center page info, e.g. "1/10"
    this.pageInfoLabel = dxui.Label.build(this.id + "_page_info", this.root);
    this.pageInfoLabel.text("");
    this.pageInfoLabel.textFont(UIManager.font(16, dxui.Utils.FONT_STYLE.NORMAL));
    this.pageInfoLabel.setPos(230, 12);

    // Top-right cancel button
    this.btnCancel = dxui.Button.build(this.id + "_cancel", this.root);
    this.btnCancel.setSize(80, 32);
    this.btnCancel.radius(8);
    this.btnCancel.borderWidth(0);
    this.btnCancel.bgColor(0xcccccc);
    this.btnCancel.scroll(false);
    this.btnCancel.setPos(dxDriver.DISPLAY.WIDTH - 80 - 16, 8);

    this.btnCancelLabel = dxui.Label.build(
      this.id + "_cancel_label",
      this.btnCancel
    );
    this.btnCancelLabel.text("Back");
    this.btnCancelLabel.textFont(
      UIManager.font(16, dxui.Utils.FONT_STYLE.NORMAL)
    );
    this.btnCancelLabel.textColor(0x333333);
    this.btnCancelLabel.align(dxui.Utils.ALIGN.CENTER, 0, 0);

    // Middle: 4 record blocks
    this.itemViews = [];
    const startY = 60;
    const rowGap = 8;
    const blockHeight = 52; // two lines per record

    for (let i = 0; i < 4; i++) {
      const y = startY + i * (blockHeight + rowGap);

      const line1 = dxui.Label.build(`${this.id}_item_${i}_line1`, this.root);
      line1.text(" ");
      // First line: larger font
      line1.textFont(UIManager.font(24, dxui.Utils.FONT_STYLE.NORMAL));
      line1.setPos(12, y);

      const line2 = dxui.Label.build(`${this.id}_item_${i}_line2`, this.root);
      line2.text(" ");
      // Second line: slightly bigger font
      line2.textFont(UIManager.font(18, dxui.Utils.FONT_STYLE.NORMAL));
      line2.setPos(12, y + 28);

      this.itemViews.push({ line1, line2 });
    }
  },

  _bindEvents: function () {
    this.btnPrev.on(dxui.Utils.EVENT.CLICK, () => {
      if (this.data.page > 0) {
        this.data.page -= 1;
        this._renderPage();
      }
    });

    this.btnNext.on(dxui.Utils.EVENT.CLICK, () => {
      const maxPage =
        Math.ceil(this.data.total / this.data.pageSize) - 1;
      if (this.data.page < maxPage) {
        this.data.page += 1;
        this._renderPage();
      }
    });

    this.btnCancel.on(dxui.Utils.EVENT.CLICK, () => {
      this.close();
    });
  },

  _renderPage: function () {
    // Query total count first
    let total = 0;
    try {
      total = LockerService.getRecordsTotalCount();
    } catch (e) {
      log.error("adminRecords", "failed to get record total count", e);
      total = 0;
    }

    this.data.total = Number(total) || 0;

    const pageSize = this.data.pageSize;
    const totalPages =
      this.data.total > 0
        ? Math.ceil(this.data.total / pageSize)
        : 1;

    // If current page is out of range, clamp to last page
    const maxPage = totalPages - 1;
    if (this.data.page > maxPage) {
      this.data.page = maxPage < 0 ? 0 : maxPage;
    }

    // Then query page slice
    let slice = [];
    try {
      slice =
        LockerService.getRecordsPage({
          pageIndex: this.data.page,
          pageSize,
        }) || [];
    } catch (e) {
      log.error("adminRecords", "failed to get records page", e);
      slice = [];
    }

    // Update page info, e.g. "1/10"
    if (this.pageInfoLabel) {
      this.pageInfoLabel.text(
        `${this.data.page + 1}/${totalPages}`
      );
    }

    for (let i = 0; i < this.itemViews.length; i++) {
      const view = this.itemViews[i];
      const rec = slice[i];
      if (!rec) {
        view.line1.text("");
        view.line2.text("");
        continue;
      }

      const success = Number(rec.result) === 1;
      const pwd =
        rec.store_password != null ? String(rec.store_password) : "";

      const formatTime = (ts) => {
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
      };

      view.line1.text(
        `Cabinet: ${rec.cabinet_no}  Code: ${pwd}  Result: ${success ? "Success" : "Fail"
        }`
      );
      view.line2.text(
        `Store: ${formatTime(
          rec.store_time
        )}  Pick: ${formatTime(rec.pickup_time)}`
      );

      const color = success ? 0x1abc9c : 0xcc3333; // green for success, red for failure
      view.line1.textColor(color);
      view.line2.textColor(color);
    }
  },

  onShow: function () {
    // Always go back to first page on show
    this.data.page = 0;
    this._renderPage();
  },

  onHide: function () { },
};

export default RecordsPage;


