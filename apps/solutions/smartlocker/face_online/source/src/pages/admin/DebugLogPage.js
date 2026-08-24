import dxui from "../../../dxmodules/dxUi.js";
import dxDriver from "../../../dxmodules/dxDriver.js";
import log from "../../mylogger.js";
import UIManager from "../../UIManager.js";

const PAGE_SIZE = 50;
const MAX_RECORDS = 500;
const MAX_DISPLAY_LINES = PAGE_SIZE * 10;
const DISPLAY_LINE_WIDTH = 92;

function splitByDisplayWidth(text, maxWidth) {
  const sourceLines = String(text == null ? "" : text)
    .replace(/\r/g, "")
    .split("\n");
  const result = [];

  for (let lineIndex = 0; lineIndex < sourceLines.length; lineIndex++) {
    const source = sourceLines[lineIndex];
    if (!source) {
      result.push("");
      continue;
    }

    let current = "";
    let width = 0;
    for (let i = 0; i < source.length; i++) {
      const ch = source.charAt(i);
      const charWidth = source.charCodeAt(i) > 255 ? 2 : 1;
      if (current && width + charWidth > maxWidth) {
        result.push(current);
        current = "";
        width = 0;
      }
      current += ch;
      width += charWidth;
    }
    if (current) result.push(current);
  }

  return result;
}

const DebugLogPage = {
  id: "adminDebugLog",
  _lines: [],
  _pageIndex: 0,

  init: function () {
    const W = dxDriver.DISPLAY.WIDTH;
    const H = dxDriver.DISPLAY.HEIGHT;
    const parent = UIManager.getRoot();

    this.root = dxui.View.build(this.id, parent);
    this.root.setSize(W, H);
    this.root.bgColor(0x101418);
    this.root.radius(0);
    this.root.borderWidth(0);
    this.root.padAll(0);
    this.root.scroll(false);

    const headerH = Math.round(H * 0.075);
    const footerH = Math.round(H * 0.085);
    const sidePad = Math.round(W * 0.025);

    this.btnBack = this._buildButton(
      "back",
      "返回",
      sidePad,
      Math.round(H * 0.012),
      Math.round(W * 0.18),
      Math.round(H * 0.052)
    );

    this.title = dxui.Label.build(this.id + "_title", this.root);
    this.title.text("设备运行日志");
    this.title.textColor(0xffffff);
    this.title.textFont(
      UIManager.font(Math.round(H * 0.026), dxui.Utils.FONT_STYLE.BOLD)
    );
    this.title.align(dxui.Utils.ALIGN.TOP_MID, 0, Math.round(H * 0.022));

    this.btnRefresh = this._buildButton(
      "refresh",
      "刷新",
      W - sidePad - Math.round(W * 0.18),
      Math.round(H * 0.012),
      Math.round(W * 0.18),
      Math.round(H * 0.052)
    );
    this.btnClear = this._buildButton(
      "clear",
      "清空",
      W - sidePad - Math.round(W * 0.18) - Math.round(W * 0.14) - Math.round(W * 0.015),
      Math.round(H * 0.012),
      Math.round(W * 0.14),
      Math.round(H * 0.052)
    );

    this.content = dxui.Label.build(this.id + "_content", this.root);
    this.content.setPos(sidePad, headerH);
    this.content.setSize(W - sidePad * 2, H - headerH - footerH);
    this.content.text("");
    this.content.textColor(0xd8f5d0);
    this.content.textFont(
      UIManager.font(Math.round(H * 0.0125), dxui.Utils.FONT_STYLE.NORMAL)
    );
    this.content.textAlign(dxui.Utils.TEXT_ALIGN.LEFT);
    this.content.longMode(dxui.Utils.LABEL_LONG_MODE.CLIP);

    const footerY = H - footerH + Math.round(H * 0.012);
    this.btnPrev = this._buildButton(
      "prev",
      "上一页",
      sidePad,
      footerY,
      Math.round(W * 0.22),
      Math.round(H * 0.055)
    );
    this.btnNext = this._buildButton(
      "next",
      "下一页",
      W - sidePad - Math.round(W * 0.22),
      footerY,
      Math.round(W * 0.22),
      Math.round(H * 0.055)
    );

    this.pageLabel = dxui.Label.build(this.id + "_page", this.root);
    this.pageLabel.text("0/0");
    this.pageLabel.textColor(0xb0bec5);
    this.pageLabel.textFont(
      UIManager.font(Math.round(H * 0.021), dxui.Utils.FONT_STYLE.NORMAL)
    );
    this.pageLabel.align(
      dxui.Utils.ALIGN.BOTTOM_MID,
      0,
      -Math.round(H * 0.028)
    );

    this.btnBack.on(dxui.Utils.EVENT.CLICK, () => UIManager.open("adminHome"));
    this.btnRefresh.on(dxui.Utils.EVENT.CLICK, () => this.refresh());
    this.btnClear.on(dxui.Utils.EVENT.CLICK, () => {
      log.clearBufferedLogs();
      this.refresh();
    });
    this.btnPrev.on(dxui.Utils.EVENT.CLICK, () => this.previousPage());
    this.btnNext.on(dxui.Utils.EVENT.CLICK, () => this.nextPage());

    return this.root;
  },

  _buildButton: function (id, text, x, y, w, h) {
    const button = dxui.View.build(this.id + "_" + id, this.root);
    button.setSize(w, h);
    button.setPos(x, y);
    button.bgColor(0x263238);
    button.radius(Math.round(h * 0.18));
    button.borderWidth(1);
    button.setBorderColor(0x607d8b);
    button.scroll(false);

    const label = dxui.Label.build(this.id + "_" + id + "_label", button);
    label.text(text);
    label.textColor(0xffffff);
    label.textFont(
      UIManager.font(
        Math.round(dxDriver.DISPLAY.HEIGHT * 0.019),
        dxui.Utils.FONT_STYLE.NORMAL
      )
    );
    label.align(dxui.Utils.ALIGN.CENTER, 0, 0);
    return button;
  },

  refresh: function () {
    const records = log.getBufferedLogs(MAX_RECORDS);
    const lines = [];
    for (let i = 0; i < records.length; i++) {
      const recordLines = splitByDisplayWidth(
        records[i].text,
        DISPLAY_LINE_WIDTH
      );
      for (let j = 0; j < recordLines.length; j++) {
        lines.push(recordLines[j]);
      }
    }

    this._lines = lines.slice(Math.max(0, lines.length - MAX_DISPLAY_LINES));
    this._pageIndex = Math.max(0, this._getPageCount() - 1);
    this._renderPage();
  },

  previousPage: function () {
    if (this._pageIndex <= 0) return;
    this._pageIndex--;
    this._renderPage();
  },

  nextPage: function () {
    const pageCount = this._getPageCount();
    if (this._pageIndex >= pageCount - 1) return;
    this._pageIndex++;
    this._renderPage();
  },

  _getPageCount: function () {
    return Math.ceil(this._lines.length / PAGE_SIZE);
  },

  _renderPage: function () {
    const pageCount = this._getPageCount();
    if (pageCount <= 0) {
      this.content.text("暂无日志");
      this.pageLabel.text("0/0");
      return;
    }

    if (this._pageIndex >= pageCount) this._pageIndex = pageCount - 1;
    if (this._pageIndex < 0) this._pageIndex = 0;
    const start = this._pageIndex * PAGE_SIZE;
    this.content.text(this._lines.slice(start, start + PAGE_SIZE).join("\n"));
    this.pageLabel.text(`${this._pageIndex + 1}/${pageCount}`);
  },

  onShow: function () {
    this.refresh();
  },
};

export default DebugLogPage;
