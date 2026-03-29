/**
 * AccessService.js - Business layer: credential check, period rules, door, logging
 *
 * verifyAndOpen(type, value) — verify credential, period, open door, write log
 */

import log from "../../dxmodules/dxLogger.js";
import bus from "../../dxmodules/dxEventBus.js";
import AccessDB from "./AccessDB.js";
import { EVENT_UI_TIP } from "../constants.js";

// ─── Internals ────────────────────────────────────────────────────────────────

function tip(level, message) {
    bus.fire(EVENT_UI_TIP, { level, message });
}

/** "HH:MM" -> minutes from midnight */
function timeToMinutes(hhmm) {
    const parts = hhmm.split(":");
    return parseInt(parts[0], 10) * 60 + parseInt(parts[1], 10);
}

/**
 * Whether now falls in "HH:MM-HH:MM|HH:MM-HH:MM|..."
 * @param {string} slots e.g. "09:00-12:00|14:00-18:00"
 */
function isInTimeSlots(slots, now) {
    if (!slots) return false;
    const cur = now.getHours() * 60 + now.getMinutes();
    return slots.split("|").some((seg) => {
        const [start, end] = seg.split("-");
        if (!start || !end) return false;
        return cur >= timeToMinutes(start) && cur <= timeToMinutes(end);
    });
}

/**
 * @param {object} period parsed from DB
 */
function checkPeriod(period) {
    if (!period || period.type === 0) return true;

    const now = new Date();
    const nowTs = Math.floor(now.getTime() / 1000);

    if (period.range) {
        const { beginTime, endTime } = period.range;
        if (beginTime && nowTs < beginTime) return false;
        if (endTime   && nowTs > endTime)   return false;
    }

    if (period.type === 1) {
        return true;
    }

    if (period.type === 2) {
        return isInTimeSlots(period.dayPeriodTime, now);
    }

    if (period.type === 3) {
        const jsDay = now.getDay();
        const isoDay = jsDay === 0 ? 7 : jsDay;
        const slots = period.weekPeriodTime && period.weekPeriodTime[String(isoDay)];
        if (!slots) return false;
        return isInTimeSlots(slots, now);
    }

    return false;
}

// ─── API ──────────────────────────────────────────────────────────────────────

const AccessService = {
    /**
     * @param {string} type e.g. "nfc"
     * @param {string} value e.g. card id
     */
    verifyAndOpen(type, value) {
        const nowTs = Math.floor(Date.now() / 1000);

        let user = null;
        try {
            user = AccessDB.findUserByCredential(type, value);
        } catch (e) {
            log.error("[AccessService] find user failed:", e);
            tip("error", "System error, try again");
            return;
        }

        if (!user) {
            log.info(`[AccessService] no user type=${type} value=${value}`);
            tip("error", "User not found");
            AccessDB.appendAccessRecord({ userId: "", name: "", type, value, result: 0, time: nowTs });
            return false;
        }

        if (!checkPeriod(user.period)) {
            const name = user.name || user.userId;
            log.info(`[AccessService] user ${name} denied by schedule`);
            tip("error", `User ${name} not allowed at this time`);
            AccessDB.appendAccessRecord({ userId: user.userId, name: user.name, type, value, result: 0, time: nowTs });
            return false;
        }

        const name = user.name || user.userId;
        log.info(`[AccessService] granted, user: ${name}`);
        tip("success", `Welcome ${name}`);
        AccessDB.appendAccessRecord({
            userId: user.userId,
            name: user.name,
            type,
            value,
            result: 1,
            time: nowTs,
        });
        return true;
    },
};

export default AccessService;
