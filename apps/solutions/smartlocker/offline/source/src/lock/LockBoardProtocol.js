import log from "../../dxmodules/dxLogger.js";

const LockBoardProtocol = {
    HEADER_OPEN: 0x8a,
    HEADER_QUERY: 0x80,
    HEADER_MULTI_OPEN: 0x90,
    HEADER_ACTIVE_REPORT: 0x81,

    /**
     * Calculate BCC (XOR checksum).
     * @param {number[]} bytes Byte array without checksum byte.
     * @returns {number} One‑byte BCC.
     */
    calcBcc(bytes) {
        let bcc = 0;
        for (let i = 0; i < bytes.length; i++) {
            bcc ^= bytes[i] & 0xff;
        }
        return bcc & 0xff;
    },

    /**
     * Frame builder: append BCC at the end.
     * @param {number[]} bytes Byte array without checksum byte.
     * @returns {Uint8Array}
     */
    buildFrame(bytes) {
        const frame = bytes.slice();
        frame.push(this.calcBcc(frame));
        return new Uint8Array(frame);
    },

    /**
     * Single‑board "open all" command: 8A addr 00 11 BCC.
     */
    buildOpenAll(boardAddr) {
        return this.buildFrame([this.HEADER_OPEN, boardAddr & 0xff, 0x00, 0x11]);
    },

    /**
     * Single‑lock open command: 8A addr lockNo 11 BCC.
     */
    buildOpenOne(boardAddr, lockNo) {
        return this.buildFrame([
            this.HEADER_OPEN,
            boardAddr & 0xff,
            lockNo & 0xff,
            0x11,
        ]);
    },

    /**
     * Single‑lock status query: 80 addr lockNo 33 BCC.
     */
    buildQueryOne(boardAddr, lockNo) {
        return this.buildFrame([
            this.HEADER_QUERY,
            boardAddr & 0xff,
            lockNo & 0xff,
            0x33,
        ]);
    },

    /**
     * Parse a full frame (assumes BCC already verified).
     * @param {Uint8Array} frame
     * @returns {object|null}
     */
    parseFrame(frame) {
        if (!frame || frame.length < 5) return null;
        const header = frame[0];

        if (header === this.HEADER_OPEN) {
            // Open / open‑all reply: 8A addr lockNo status BCC
            return {
                type: "openResult",
                header,
                boardAddr: frame[1],
                lockNo: frame[2],
                status: frame[3], // 0x00 / 0x11, exact meaning depends on board model.
            };
        }

        if (header === this.HEADER_QUERY && frame.length === 5) {
            // Single‑lock query reply: 80 addr lockNo status BCC
            return {
                type: "singleStatus",
                header,
                boardAddr: frame[1],
                lockNo: frame[2],
                status: frame[3], // 0x00 / 0x11
            };
        }

        // Note: The board protocol also supports 11‑byte "query all locks on board" frames (80 addr 00 33 ...).
        // The smartlocker project does NOT use this command for now and will not read 11‑byte frames.
        // If needed in the future, parsing logic for 11‑byte frames can be added here.

        if (header === this.HEADER_ACTIVE_REPORT && frame.length === 5) {
            // Active report: 81 addr lockNo status BCC
            return {
                type: "activeReport",
                header,
                boardAddr: frame[1],
                lockNo: frame[2],
                status: frame[3],
            };
        }

        log.info(`LockBoardProtocol.parseFrame: unrecognized frame: header=0x${header.toString(16)}, len=${frame.length}`);
        return null;
    },

    // Note: this project currently only uses 5‑byte reply frames (8A/80/81).
    // We do not send or parse 11‑byte "query all locks" commands; streaming parser code was removed.
    // If needed in the future, related parsing helpers can be added back here.
};

export default LockBoardProtocol;

