import dxui from "../../../dxmodules/dxUi.js";
import log from "../../../dxmodules/dxLogger.js";
import dxDriver from "../../../dxmodules/dxDriver.js";
import UIManager from "../UIManager.js";
import PasswordView from "../PasswordView.js";
import ntp from "../../../dxmodules/dxNtp.js";
import TipView from "../TipView.js";

// Admin: time settings page (layout similar to StoreSetPasswordPage)
const TimeSettingsPage = {
    id: "adminTimeSettings",

    init: function () {
        const parent = UIManager.getRoot();

        this.root = dxui.View.build(this.id, parent);
        this.root.setSize(dxDriver.DISPLAY.WIDTH, dxDriver.DISPLAY.HEIGHT);
        this.root.radius(0);
        this.root.borderWidth(0);
        this.root.padAll(0);
        this.root.bgColor(0xf5f7fa);

        this.data = {
            year: "",
            month: "",
            day: "",
            hour: "",
            minute: "",
            second: "",
            activeField: 0, // 0: year, 1: month, 2: day, 3: hour, 4: minute, 5: second
        };

        this._initView();

        return this.root;
    },

    _initView: function () {
        // Top tip: "Set current time"
        this.tipLabel = dxui.Label.build(this.id + "_tip", this.root);
        this.tipLabel.text("Set current time:");
        this.tipLabel.textFont(UIManager.font(20, dxui.Utils.FONT_STYLE.NORMAL));
        this.tipLabel.setPos(12, 8);

        // Top-right "Cancel" button: close and back to admin home
        this.topCancelBtn = dxui.Button.build(this.id + "_top_cancel", this.root);
        this.topCancelBtn.setSize(80, 32);
        this.topCancelBtn.radius(8);
        this.topCancelBtn.borderWidth(0);
        this.topCancelBtn.bgColor(0xcccccc);
        this.topCancelBtn.scroll(false);
        this.topCancelBtn.setPos(dxDriver.DISPLAY.WIDTH - 80 - 16, 8);

        this.topCancelLabel = dxui.Label.build(
            this.id + "_top_cancel_label",
            this.topCancelBtn
        );
        this.topCancelLabel.text("Cancel");
        this.topCancelLabel.textFont(UIManager.font(16, dxui.Utils.FONT_STYLE.NORMAL));
        this.topCancelLabel.textColor(0x333333);
        this.topCancelLabel.align(dxui.Utils.ALIGN.CENTER, 0, 0);

        this.topCancelBtn.on(dxui.Utils.EVENT.CLICK, () => {
            this.close();
        });

        // Second row: 6 clickable labels: year / month / day / hour / minute / second
        // Year label is wider, others share same width
        const yearWidth = 120;
        const fieldWidth = 50;
        const gap = 10;
        const screenWidth = dxDriver.DISPLAY.WIDTH || 480;
        const totalWidth =
            yearWidth + fieldWidth * 5 + gap * 5; // 6 fields, 5 gaps
        const startX = (screenWidth - totalWidth) / 2;
        const y = 40;

        this._fields = [];

        // Helper: create field container + label
        const createField = (key, index, width, xPos, placeholder) => {
            const field = dxui.View.build(
                this.id + "_field_" + key,
                this.root
            );
            field.setSize(width, 40);
            field.radius(8);
            field.borderWidth(2);
            field.scroll(false);
            field.setPos(xPos, y);

            const label = dxui.Label.build(
                this.id + "_field_" + key + "_label",
                field
            );
            label.text(placeholder);
            label.textFont(UIManager.font(18, dxui.Utils.FONT_STYLE.NORMAL));
            label.align(dxui.Utils.ALIGN.CENTER, 0, 0);

            field.on(dxui.Utils.EVENT.CLICK, () => {
                this._setActiveField(index);
            });

            this._fields[index] = { key, field, label, placeholder };
        };

        let x = startX;
        createField("year", 0, yearWidth, x, "Year");
        x += yearWidth + gap;
        createField("month", 1, fieldWidth, x, "Mon");
        x += fieldWidth + gap;
        createField("day", 2, fieldWidth, x, "Day");
        x += fieldWidth + gap;
        createField("hour", 3, fieldWidth, x, "Hour");
        x += fieldWidth + gap;
        createField("minute", 4, fieldWidth, x, "Min");
        x += fieldWidth + gap;
        createField("second", 5, fieldWidth, x, "Sec");

        // Bottom: common numeric keypad
        this.keypad = PasswordView.build(this.id + "_keypad", this.root, {
            onDigit: (d) => {
                this._onDigit(d);
            },
            onDelete: () => {
                this._onDelete();
            },
            onConfirm: () => {
                this._handleConfirm();
            },
        });

        this._updateActiveFieldStyle();
        this._refreshFieldTexts();
    },

    _setActiveField: function (index) {
        this.data.activeField = index >= 0 && index < 6 ? index : 0;
        this._updateActiveFieldStyle();
    },

    _updateActiveFieldStyle: function () {
        for (let i = 0; i < this._fields.length; i++) {
            const f = this._fields[i];
            if (!f) continue;
            if (i === this.data.activeField) {
                f.field.bgColor(0xe0f3ff);
            } else {
                f.field.bgColor(0xffffff);
            }
        }
    },

    _refreshFieldTexts: function () {
        const values = [
            this.data.year,
            this.data.month,
            this.data.day,
            this.data.hour,
            this.data.minute,
            this.data.second,
        ];
        for (let i = 0; i < this._fields.length; i++) {
            const f = this._fields[i];
            if (!f) continue;
            const v = values[i];
            f.label.text(v && v.length > 0 ? v : f.placeholder);
        }
    },

    _onDigit: function (d) {
        const idx = this.data.activeField;
        let key;
        switch (idx) {
            case 0:
                key = "year";
                break;
            case 1:
                key = "month";
                break;
            case 2:
                key = "day";
                break;
            case 3:
                key = "hour";
                break;
            case 4:
                key = "minute";
                break;
            case 5:
                key = "second";
                break;
            default:
                key = "year";
                break;
        }

        // Max length per field
        const maxLenMap = {
            year: 4,
            month: 2,
            day: 2,
            hour: 2,
            minute: 2,
            second: 2,
        };

        const cur = this.data[key] || "";
        const maxLen = maxLenMap[key] || 2;

        if (cur.length >= maxLen) return;

        this.data[key] = cur + d;
        this._refreshFieldTexts();
    },

    _onDelete: function () {
        const idx = this.data.activeField;
        let key;
        switch (idx) {
            case 0:
                key = "year";
                break;
            case 1:
                key = "month";
                break;
            case 2:
                key = "day";
                break;
            case 3:
                key = "hour";
                break;
            case 4:
                key = "minute";
                break;
            case 5:
                key = "second";
                break;
            default:
                key = "year";
                break;
        }

        const cur = this.data[key] || "";
        if (cur.length > 0) {
            this.data[key] = cur.slice(0, -1);
            this._refreshFieldTexts();
        }
    },

    _handleConfirm: function () {
        const y = this.data.year;
        const m = this.data.month;
        const d = this.data.day;
        const hh = this.data.hour;
        const mm = this.data.minute;
        const ss = this.data.second;

        // Basic completeness check
        if (!y || !m || !d || !hh || !mm || !ss) {
            TipView.showError("Please fill all fields");
            return;
        }

        // Length & range validation
        const yearNum = parseInt(y, 10);
        const monthNum = parseInt(m, 10);
        const dayNum = parseInt(d, 10);
        const hourNum = parseInt(hh, 10);
        const minuteNum = parseInt(mm, 10);
        const secondNum = parseInt(ss, 10);

        if (
            isNaN(yearNum) ||
            isNaN(monthNum) ||
            isNaN(dayNum) ||
            isNaN(hourNum) ||
            isNaN(minuteNum) ||
            isNaN(secondNum)
        ) {
            TipView.showError("Invalid time format");
            return;
        }

        if (y.length !== 4 || yearNum < 2000 || yearNum > 2099) {
            TipView.showError("Year must be 2000-2099");
            return;
        }
        if (monthNum < 1 || monthNum > 12) {
            TipView.showError("Month must be 1-12");
            return;
        }
        if (dayNum < 1 || dayNum > 31) {
            TipView.showError("Day must be 1-31");
            return;
        }
        if (hourNum < 0 || hourNum > 23) {
            TipView.showError("Hour must be 0-23");
            return;
        }
        if (minuteNum < 0 || minuteNum > 59) {
            TipView.showError("Minute must be 0-59");
            return;
        }
        if (secondNum < 0 || secondNum > 59) {
            TipView.showError("Second must be 0-59");
            return;
        }

        // Assemble "YYYY-MM-DD HH:mm:ss"
        const pad2 = (n) => String(n).padStart(2, "0");
        const timeStr = `${yearNum}-${pad2(monthNum)}-${pad2(dayNum)} ${pad2(
            hourNum
        )}:${pad2(minuteNum)}:${pad2(secondNum)}`;

        try {
            const ok = ntp.setTime(timeStr, true);
            log.info("TimeSettingsPage: setTime called with", timeStr, ok);
            TipView.showSuccess("Time updated", {
                duration: 3000,
                countdown: false,
                onFinish: () => {
                    this.close();
                },
            });
        } catch (e) {
            log.error("TimeSettingsPage: failed to set system time", e);
            TipView.showError("Failed to set system time, try again");
        }
    },

    onShow: function () {
        // On open, fill all fields with current system time
        try {
            const now = new Date();
            const year = now.getFullYear();
            const month = now.getMonth() + 1; // 0-based
            const day = now.getDate();
            const hour = now.getHours();
            const minute = now.getMinutes();
            const second = now.getSeconds();

            this.data.year = String(year);
            this.data.month = String(month).padStart(2, "0");
            this.data.day = String(day).padStart(2, "0");
            this.data.hour = String(hour).padStart(2, "0");
            this.data.minute = String(minute).padStart(2, "0");
            this.data.second = String(second).padStart(2, "0");
        } catch (e) {
            log.error("TimeSettingsPage: failed to get current time", e);
            // Keep placeholders if failed
        }

        // Always reset active field to "year"
        this.data.activeField = 0;
        this._updateActiveFieldStyle();
        this._refreshFieldTexts();
    },

    onHide: function () { },
};

export default TimeSettingsPage;


