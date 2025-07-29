/**
 * NFC Module
 * Features:
 * - Read M1 card, PSAM card, NTAG card
 * - Write M1 card, PSAM card, NTAG card
 * - APDU instruction interaction
 * 
 * Doc/Demo : https://github.com/DejaOS/DejaOS
 */
import { nfcClass } from './libvbar-p-dxnfc.so'
import dxCommon from './dxCommon.js'
import bus from './dxEventBus.js'
import dxMap from './dxMap.js'
const nfcObj = new nfcClass();
const map = dxMap.get("default")
const nfc = {}

/**
 * NFC initialization
 * @param {number} useEid Not required, use EID 0, do not use 1
 * @param {number} type Not required, NFC type 0 MCU 1 Chip
 * @returns {null} 
 */
nfc.init = function (useEid = 0, type = 1) {
	let pointer = nfcObj.init(useEid, type)
	if (pointer === undefined || pointer === null) {
		throw new Error("nfc.init: init failed")
	}
	dxCommon.handleId("nfc", 'nfcid', pointer)
}

/**
 * NFC ordinary card registration callback
 *  @returns {boolean} true/false
 */
nfc.cbRegister = function (callback) {
	let pointer = dxCommon.handleId("nfc", 'nfcid')
	return nfcObj.cbRegister(pointer, "nfc_cb", 1, callback)
}

/**
 * NFC PSAM card registration callback
 * @returns {boolean} true/false
 */
nfc.psamCbRegister = function (callback) {
	let pointer = dxCommon.handleId("nfc", 'nfcid')
	return nfcObj.nfcPsamCheckVgcardCallback(pointer, callback)
}

/**
 * NFC Cancel Initialization
 * @returns {boolean} true/false
 */
nfc.deinit = function () {
	let pointer = dxCommon.handleId("nfc", 'nfcid')
	let ret = nfcObj.cbUnregister(pointer, "nfc_cb")
	if (ret === false) {
		throw new Error("nfc.cbUnregister: cbUnregister failed")
	}
	return nfcObj.deinit(pointer)
}

/**
 * NFC card information creation
 * @param {number} cardType Card chip type (factory defined)
 * @param {ArrayBuffer} cardId Card number
 * @param {number} type Card type (defined by ourselves)
 * @returns {number} cardInfo(pointer)
 */
nfc.cardInfoCreate = function (cardType, cardId, type) {
	if (!cardType) {
		throw new Error("cardInfoCreate:cardType should not be null or empty")
	}
	if (!cardId) {
		throw new Error("cardInfoCreate:cardId should not be null or empty")
	}
	if (!type) {
		throw new Error("cardInfoCreate:type should not be null or empty")
	}
	return nfcObj.cardInfoCreate(cardType, cardId, type);
}

/**
 * Destruction of NFC card information
 * @param {pointer} cardInfo card information
 * @returns {boolean} true/false
 */
nfc.cardInfoDestory = function (cardInfo) {
	if (!cardInfo) {
		throw new Error("cardInfoDestory:cardInfo should not be null or empty")
	}
	return nfcObj.cardInfoDestory(cardInfo);
}

/**
 * NFC card information copying
 * @param {pointer} cardInfo card information
 * @returns {number} cardInfo(pointer)
 */
nfc.cardInfoCopy = function (cardInfo) {
	if (cardInfo == null) {
		throw new Error("cardInfoCopy:cardInfo should not be null or empty")
	}
	return nfcObj.cardInfoCopy(cardInfo);
}

/**
 * NFC determines if there is a card
 * @returns {boolean} true/false
 */
nfc.isCardIn = function () {
	let pointer = dxCommon.handleId("nfc", 'nfcid')
	return nfcObj.isCardIn(pointer);
}

/**
 * NFC Reading M1 Card Sector
 * @param {number} taskFlg Task Flag：
 *                    0x00->AUTO informs the scanner that this instruction can be executed independently without any dependencies between instructions
 *                    0x01->START Notify the scanner that the card operation has started or has not yet ended, and there may be dependencies between instructions.
 *                    0x02->FINISH Notify the scanner that this instruction is the last instruction to operate the card, restoring the card operating environment to default.
 * @param {number} secNum sector number
 * @param {number} logicBlkNum Block number (logical numbers 0-3 within the sector)
 * @param {number} blkNums Number of Blocks
 * @param {array} key Key, length 6 bytes
 * @param {number} keyType Key type: A: 0x60 B: 0x61
 * @returns {ArrayBuffer} Read result undefined: failed
 */
nfc.m1cardReadSector = function (taskFlg, secNum, logicBlkNum, blkNums, key, keyType) {
	let pointer = dxCommon.handleId("nfc", 'nfcid')
	_validate('m1cardReadSector', taskFlg, secNum, logicBlkNum, blkNums, key, keyType, ' ')
	return nfcObj.m1cardReadSector(pointer, taskFlg, secNum, logicBlkNum, blkNums, key, keyType);
}

/**
 * NFC Writing M1 Card Sector
 * @param {number} taskFlg Task Flag：
 *                    0x00->AUTO informs the scanner that this instruction can be executed independently without any dependencies between instructions
 *                    0x01->START Notify the scanner that the card operation has started or has not yet ended, and there may be dependencies between instructions.
 *                    0x02->FINISH Notify the scanner that this instruction is the last instruction to operate the card, restoring the card operating environment to default.
 * @param {number} secNum sector number
 * @param {number} logicBlkNum Block number (logical numbers 0-3 within the sector)
 * @param {number} blkNums Number of Blocks
 * @param {array} key Key, length 6 bytes
 * @param {number} keyType Key type: A: 0x60 B: 0x61
 * @param {array} data Write data
 * @returns {number} Write length -1: Error
 */
nfc.m1cardWriteSector = function (taskFlg, secNum, logicBlkNum, blkNums, key, keyType, data) {
	let pointer = dxCommon.handleId("nfc", 'nfcid')
	_validate('m1cardWriteSector', taskFlg, secNum, logicBlkNum, blkNums, key, keyType, data)
	return nfcObj.m1cardWriteSector(pointer, taskFlg, secNum, logicBlkNum, blkNums, key, keyType, data);
}

/**
 * NFC reading M1 block
 * @param {number} taskFlg Task Flag：
 *                    0x00->AUTO informs the scanner that this instruction can be executed independently without any dependencies between instructions
 *                    0x01->START Notify the scanner that the card operation has started or has not yet ended, and there may be dependencies between instructions.
 *                    0x02->FINISH Notify the scanner that this instruction is the last instruction to operate the card, restoring the card operating environment to default.
 * @param {number} blkNums Block number
 * @param {array} key Key, length 6 bytes
 * @param {number} keyType Key type: A: 0x60 B: 0x61
 * @returns {ArrayBuffer} Read result undefined: failed
 */
nfc.m1cardReadBlk = function (taskFlg, blkNum, key, keyType) {
	let pointer = dxCommon.handleId("nfc", 'nfcid')
	_validate('m1cardReadBlk', taskFlg, 1, 0, blkNum, key, keyType, ' ')
	return nfcObj.m1cardReadBlk(pointer, taskFlg, blkNum, key, keyType);
}

/**
 * NFC writing M1 block
 * @param {number} taskFlg Task Flag：
 *                    0x00->AUTO informs the scanner that this instruction can be executed independently without any dependencies between instructions
 *                    0x01->START Notify the scanner that the card operation has started or has not yet ended, and there may be dependencies between instructions.
 *                    0x02->FINISH Notify the scanner that this instruction is the last instruction to operate the card, restoring the card operating environment to default.
 * @param {number} blkNums Block number
 * @param {array} key Key, length 6 bytes
 * @param {number} keyType Key type: A: 0x60 B: 0x61
 * @param {array} data Write data
 * @returns {number} Write length -1: Error
 */
nfc.m1cardWriteBlk = function (taskFlg, blkNum, key, keyType, data) {
	let pointer = dxCommon.handleId("nfc", 'nfcid')
	_validate('m1cardWriteBlk', taskFlg, 1, 0, blkNum, key, keyType, data)
	return nfcObj.m1cardWriteBlk(pointer, taskFlg, blkNum, key, keyType, data);
}

/**
 * Write values to the registers of the NFC module
 * @param {number} taskFlg Task Flag：
 *                    0x00->AUTO informs the scanner that this instruction can be executed independently without any dependencies between instructions
 *                    0x01->START Notify the scanner that the card operation has started or has not yet ended, and there may be dependencies between instructions.
 *                    0x02->FINISH Notify the scanner that this instruction is the last instruction to operate the card, restoring the card operating environment to default.
 * @param {number} regAddr Register address to be written (please refer to the corresponding manual if necessary)
 * @param {number} val The value to be written
 * @returns {boolean} true/false
 */
nfc.nfcRegWrite = function (taskFlg, regAddr, val) {
	let pointer = dxCommon.handleId("nfc", 'nfcid')
	return nfcObj.nfcRegWrite(pointer, taskFlg, regAddr, val);
}

/**
 * Read values from the registers of the NFC module
 * @param {number} taskFlg Task Flag：
 *                    0x00->AUTO informs the scanner that this instruction can be executed independently without any dependencies between instructions
 *                    0x01->START Notify the scanner that the card operation has started or has not yet ended, and there may be dependencies between instructions.
 *                    0x02->FINISH Notify the scanner that this instruction is the last instruction to operate the card, restoring the card operating environment to default.
 * @param {number} regAddr Register address to be read (please refer to the corresponding manual if necessary)

 * @returns {number} Read value/null
 */
nfc.nfcRegRead = function (taskFlg, regAddr) {
	let pointer = dxCommon.handleId("nfc", 'nfcid')
	return nfcObj.nfcRegRead(pointer, taskFlg, regAddr);
}

/**
 * ATS detection
 * @returns {boolean} true/false
 */
nfc.iso14443TypeaGetAts = function () {
	let pointer = dxCommon.handleId("nfc", 'nfcid')
	return nfcObj.iso14443TypeaGetAts(pointer)
}

/**
 * Send APDU command
 * @param {number} taskFlg Task Flag：
 *                    0x00->AUTO informs the scanner that this instruction can be executed independently without any dependencies between instructions
 *                    0x01->START Notify the scanner that the card operation has started or has not yet ended, and there may be dependencies between instructions.
 *                    0x02->FINISH Notify the scanner that this instruction is the last instruction to operate the card, restoring the card operating environment to default.
 * @param {ArrayBuffer} buffer 	The data to be sent
 * @param {number} bufferLen 	The length of the data to be sent
 * @returns {ArrayBuffer} buffer
 */
nfc.iso14443Apdu = function (taskFlg, buffer, bufferLen) {
	let pointer = dxCommon.handleId("nfc", "nfcid")
	return nfcObj.iso14443Apdu(pointer, taskFlg, buffer, bufferLen);
}

/**
 * PSAM card power failure
 * @returns {boolean} true/false
 */
nfc.nfcPsamPowerDown = function () {
	let pointer = dxCommon.handleId("nfc", "nfcid")
	return nfcObj.nfcPsamPowerDown(pointer);
}

/**
 * NFC changes state
 * @returns {boolean} true/false
 */
nfc.nfcPsamChangeBaud = function () {
	let pointer = dxCommon.handleId("nfc", "nfcid")
	return nfcObj.nfcPsamChangeBaud(pointer);
}

/**
 * PSAM card reset
 * @returns {boolean} true/false
 */
nfc.nfcPsamCardReset = function (force) {
	let pointer = dxCommon.handleId("nfc", "nfcid")
	return nfcObj.nfcPsamCardReset(pointer, force);
}

/**
 * Send PSAM APDU command
 * @returns {ArrayBuffer} buffer
 */
nfc.nfcPsamCardApdu = function (buffer) {
	let pointer = dxCommon.handleId("nfc", "nfcid")
	return nfcObj.nfcPsamCardApdu(pointer, buffer);
}

/**
 * EID updates cloud certificate configuration
 * @param {object} eidConfig EID configuration	
 * 		@param {string} eidConfig.appid 平台分配给应用的appid
 * 		@param {number} eidConfig.read_len; Single card reading length, default 0x80
 * 		@param {number} eidConfig.declevel; Do you want to read the photo? 1 means not read, 2 means read
 * 		@param {number} eidConfig.loglevel; Log level, supports 0, 1, 2
 * 		@param {number} eidConfig.model; Is it possible to directly check whether information 0 is 1 or not (i.e. 0 is the original return, returning identity information, 1 is forwarding, returning reqid)
 * 		@param {number} eidConfig.type; Card type: 0 ID card 1 electronic license
 * 		@param {number} eidConfig.pic_type; Photo decoding data type 0 wlt 1 jpg
 * 		@param {number} eidConfig.envCode; Environmental identification code
 * 		@param {string} eidConfig.sn[128]; Equipment serial number
 * 		@param {string} eidConfig.device_model[128]; Equipment model
 * 		@param {number} eidConfig.info_type; Information return type, 0 identity information structure, 1 original data char 
 */
nfc.eidUpdateConfig = function (eidConfig) {
	if (eidConfig == null) {
		throw new Error("eidUpdateConfig:eidConfig should not be null or empty")
	}
	return nfcObj.eidUpdateConfig(eidConfig);
}

/**
 * Read NTAG version number
 * @returns {string} NTAG version
 */
nfc.nfcNtagReadVersion = function () {
	let pointer = dxCommon.handleId("nfc", 'nfcid')
	return nfcObj.nfcNtagReadVersion(pointer);
}

/**
 * Read NTAG page content with fixed reading of 4 pages totaling 16 bytes
 * @param {number} pageNum  Starting page address：
 *                              Read four pages at a time
 *                             	If the address (Addr) is 04h, return the content of pages 04h, 05h, 06h, 07h
 * 	@returns {ArrayBuffer} buffer
 */
nfc.nfcNtagReadPage = function (pageNum) {
	let pointer = dxCommon.handleId("nfc", 'nfcid')
	if (pageNum == null) {
		throw new Error("nfcNtagReadPage:pageNum should not be null or empty")
	}
	return nfcObj.nfcNtagReadPage(pointer, pageNum);
}

/**
 * The buffer for reading data from multiple pages of NTAG, with a minimum of 4 pages; The length of the data to be read is 4 pages
 * @param {number} start_addr Starting page address
 * @param {number} end_addr End page address
 * @returns {ArrayBuffer} buffer
 */
nfc.nfcNtagFastReadPage = function (start_page, end_page) {
	let pointer = dxCommon.handleId("nfc", 'nfcid')
	if (start_page == null) {
		throw new Error("nfcNtagFastReadPage:start_page should not be null or empty")
	}
	if (end_page == null) {
		throw new Error("nfcNtagFastReadPage:end_page should not be null or empty")
	}
	return nfcObj.nfcNtagFastReadPage(pointer, start_page, end_page);
}

/**
 * Write NTAG page content
 * @param {number} pageNum Page number written: valid Addr parameter
 *                              For NTAG213, page addresses 02h to 2Ch
 *                              For NTAG215, page addresses 02h to 86h
 *                              For NTAG216, page addresses 02h to E6h
 * @param {ArrayBuffer} pageData    Write page content: four bytes
 * @returns {boolean} ture/false
 */
nfc.nfcNtagWritePage = function (pageNum, pageData) {
	let pointer = dxCommon.handleId("nfc", 'nfcid')
	if (pageNum == null) {
		throw new Error("nfcNtagWritePage:pageNum should not be null or empty")
	}
	if (!pageData) {
		throw new Error("nfcNtagWritePage:pageData should not be null or empty")
	}
	return nfcObj.nfcNtagWritePage(pointer, pageNum, pageData);
}

/**
 * Determine if the NFC message queue is empty
 * @returns {boolean} true/false
 */
nfc.msgIsEmpty = function () {
	let pointer = dxCommon.handleId("nfc", 'nfcid')
	return nfcObj.msgIsEmpty(pointer)
}

/**
 * Read data from the NFC message queue
 * @returns {string} JSON message object
 */
nfc.msgReceive = function () {
	let pointer = dxCommon.handleId("nfc", 'nfcid')
	let msg = nfcObj.msgReceive(pointer)
	return JSON.parse(msg);
}

function _validate(fun, taskFlg, secNum, logicBlkNum, blkNums, key, keyType, data) {
	if (![0x00, 0x01, 0x02].includes(taskFlg)) {
		throw new Error(fun, ":taskFlg error")
	}
	if (!(secNum >= 0)) {
		throw new Error(fun, ":secNum error")
	}
	if (logicBlkNum == null || logicBlkNum == undefined || logicBlkNum < 0 || logicBlkNum > 3) {
		throw new Error(fun, ":logicBlkNum error")
	}
	if (blkNums == null || blkNums == undefined || blkNums < 0 || blkNums > 59) {
		throw new Error(fun, ":blkNums error")
	}
	if (key == null || key === undefined || key.length < 0) {
		throw new Error(fun, ":key error")
	}
	if (![0x60, 0x61].includes(keyType)) {
		throw new Error(fun, ":keyType error")
	}
	if (data === null || data === undefined) {
		throw new Error(fun, ":data error")
	}
}

nfc.RECEIVE_MSG = '__nfc__MsgReceive'

/**
 * Simplify the use of NFC components, eliminating the need for polling to obtain network status. The network status will be sent out through the eventcenter
 * Run will only be executed once, and after execution, the basic network configuration cannot be modified
 * If you need real-time access to card swiping data, you can subscribe to the eventCenter's events. The topic of the event is nfc.CARD, and the content of the event is similar
 * {id: 'card id', card_type: card chip type, id_1en: card length, type: card type, timestamp: 'card swipe timestamp', monotonic_timestamp: 'relative boot time'}
 * @param {*} options 
 * 		@param {boolean} options.m1 Not required, ordinary card callback switch
 * 		@param {boolean} options.psam Not required, psam card callback switch
 */
nfc.run = function (options) {
	if (options === undefined || options.length === 0) {
		throw new Error("dxnfc.run:'options' parameter should not be null or empty")
	}
	let init = map.get("__nfc__run_init")
	if (!init) { // Ensure to initialize only once
		map.put("__nfc__run_init", options)
		bus.newWorker("__nfc", '/app/code/dxmodules/nfcWorker.js')
	}
}

/**
 * If NFC has a separate thread, you can directly use the run function, which will automatically start a thread
 * If you want to join other existing threads, you can use the following encapsulated functions
 */
nfc.worker = {
	// Before the while loop
	beforeLoop: function (options) {
		nfc.init(options.useEid)
		// PSAM and regular card callback
		if (options.m1) {
			nfc.cbRegister()
		}
		if (options.psam) {
			nfc.psamCbRegister()
		}
	},
	// In the while loop
	loop: function () {
		if (!nfc.msgIsEmpty()) {
			let res = nfc.msgReceive();
			bus.fire(nfc.RECEIVE_MSG, res)
		}
	}
}
export default nfc;
