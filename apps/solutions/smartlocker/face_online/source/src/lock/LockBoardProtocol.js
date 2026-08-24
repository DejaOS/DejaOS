import log from "../mylogger.js";

const LockBoardProtocol = {
  HEADER_OPEN: 0x8a,
  HEADER_QUERY: 0x80,
  HEADER_MULTI_OPEN: 0x90,
  /**
   * 锁板主动上报（门/锁状态），5 字节帧。
   * 现场可能混用：**0x81**、**0x82** 均表示主动上报（不同锁板/批次），解析时二者都认。
   */
  HEADER_ACTIVE_REPORT_81: 0x81,
  HEADER_ACTIVE_REPORT_82: 0x82,

  calcBcc(bytes) {
    let bcc = 0;
    for (let i = 0; i < bytes.length; i++) {
      bcc ^= bytes[i] & 0xff;
    }
    return bcc & 0xff;
  },

  buildFrame(bytes) {
    const frame = bytes.slice();
    frame.push(this.calcBcc(frame));
    return new Uint8Array(frame);
  },

  buildOpenAll(boardAddr) {
    return this.buildFrame([this.HEADER_OPEN, boardAddr & 0xff, 0x00, 0x11]);
  },

  buildOpenOne(boardAddr, lockNo) {
    return this.buildFrame([
      this.HEADER_OPEN,
      boardAddr & 0xff,
      lockNo & 0xff,
      0x11,
    ]);
  },

  buildQueryOne(boardAddr, lockNo) {
    return this.buildFrame([
      this.HEADER_QUERY,
      boardAddr & 0xff,
      lockNo & 0xff,
      0x33,
    ]);
  },

  parseFrame(frame) {
    if (!frame || frame.length < 5) return null;
    const header = frame[0];

    if (header === this.HEADER_OPEN) {
      return {
        type: "openResult",
        header,
        boardAddr: frame[1],
        lockNo: frame[2],
        status: frame[3],
      };
    }

    if (header === this.HEADER_QUERY && frame.length === 5) {
      return {
        type: "singleStatus",
        header,
        boardAddr: frame[1],
        lockNo: frame[2],
        status: frame[3],
      };
    }

    if (
      (header === this.HEADER_ACTIVE_REPORT_81 || header === this.HEADER_ACTIVE_REPORT_82) &&
      frame.length === 5
    ) {
      return {
        type: "activeReport",
        header,
        boardAddr: frame[1],
        lockNo: frame[2],
        status: frame[3],
      };
    }

    log.info(
      `LockBoardProtocol.parseFrame: 未识别的帧: header=0x${header.toString(16)}, len=${frame.length}`
    );
    return null;
  },
};

export default LockBoardProtocol;
