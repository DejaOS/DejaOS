import log from "../../dxmodules/dxLogger.js";

const LockBoardProtocol = {
    HEADER_OPEN: 0x8a,
    HEADER_QUERY: 0x80,
    HEADER_MULTI_OPEN: 0x90,
    HEADER_ACTIVE_REPORT: 0x81,

    /**
     * Compute BCC (XOR checksum)
     * @param {number[]} bytes Bytes without checksum
     * @returns {number} 1-byte BCC
     */
    calcBcc(bytes) {
        let bcc = 0;
        for (let i = 0; i < bytes.length; i++) {
            bcc ^= bytes[i] & 0xff;
        }
        return bcc & 0xff;
    },

    /**
     * Build frame: append BCC at end
     * @param {number[]} bytes Bytes without checksum
     * @returns {Uint8Array}
     */
    buildFrame(bytes) {
        const frame = bytes.slice();
        frame.push(this.calcBcc(frame));
        return new Uint8Array(frame);
    },

    /**
     * Single board "open all": 8A addr 00 11 BCC
     */
    buildOpenAll(boardAddr) {
        return this.buildFrame([this.HEADER_OPEN, boardAddr & 0xff, 0x00, 0x11]);
    },

    /**
     * Open one lock: 8A addr lockNo 11 BCC
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
     * Query one lock status: 80 addr lockNo 33 BCC
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
     * Parse one frame (BCC assumed already verified)
     * @param {Uint8Array} frame
     * @returns {object|null}
     */
    parseFrame(frame) {
        if (!frame || frame.length < 5) return null;
        const header = frame[0];

        if (header === this.HEADER_OPEN) {
            // Open/all-open response: 8A addr lockNo status BCC
            return {
                type: "openResult",
                header,
                boardAddr: frame[1],
                lockNo: frame[2],
                status: frame[3], // 0x00 / 0x11, meaning depends on lock model
            };
        }

        if (header === this.HEADER_QUERY && frame.length === 5) {
            // Query one lock response: 80 addr lockNo status BCC
            return {
                type: "singleStatus",
                header,
                boardAddr: frame[1],
                lockNo: frame[2],
                status: frame[3], // 0x00 / 0x11
            };
        }

        // Note: protocol also has 11-byte "query all locks" (80 addr 00 33...); not used here.

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

        log.info(`LockBoardProtocol.parseFrame: Unknown frame header=0x${header.toString(16)}, len=${frame.length}`);
        return null;
    },

    // This project uses 5-byte response frames (8A/80/81) only; no 11-byte "query all" or stream parsing.
};

export default LockBoardProtocol;

