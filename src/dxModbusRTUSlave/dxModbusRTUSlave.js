/**
 * dxModbusRTUSlave module
 * Implementation of Modbus RTU Slave. The Slave can only passively receive data sent by the Master and return a response.
 * 
 * The complete protocol is divided into three layers:
 * - **Application Layer**: Defines the meaning of the data, such as the business logic associated with function codes (e.g., 0x01 represents a specific operation).
 * - **Communication Layer**: Defines the structure of the communication data, including the message format and communication patterns (e.g., Modbus allows only the Master to initiate communication with the Slave).
 * - **Transport Layer**: Refers to the underlying transport protocol, such as UART, USB, or TCP.
 * 
 * This module focuses primarily on the Communication layer. It converts received binary data into JavaScript objects.
 *  Similarly, it converts JavaScript objects into binary data for transmission back to the Master.
 * 
 * A standard Modbus Slave also includes the application layer, covering function codes from 0x01 to 0x10. However, 
 * this module does not implement these functions, as the device lacks the corresponding coils and registers. Instead, we extend the function codes, using codes from 0x11 to 0x1F. 
 * 
 * For error responses, the function code must be incremented by 0x80. For example:
 * - A successful response directly returns the function code (e.g., 0x03).
 * - An error response returns the function code with the high bit set (e.g., 0x83).
 * 
 * Modbus messages are neither fixed-length nor TLV-formatted. We should receved all data before time out.
 */

import logger from './dxLogger.js'
import common from './dxCommon.js'

const slave = {}
/**
 * Decode received buffer to js object data. 
 * The data object includes:
 * - cmd: The command, a hexadecimal string.
 * - result: Whether the return is successful or failed.
 * - length: The length of the data, in bytes.
 * - data: The data as a hexadecimal string.
 * - crc: Whether the CRC check was successful. Even if it fails, it is up to the developer to decide whether to handle it.
 * Below is an example of the object:
 * {cmd:"2a", length:7, data:"0a1acc320fee32", crc:true/false}
 * @param {number} address the device unique address for modbus. The range is 1~247
 * @param {Array} buffer received data array. 
 * @returns {object} return the object above
 */
slave.decode = function (address, buffer) {
	if (buffer === null || buffer.length <= 0) {
		return;
	}
	if (buffer.length < 4) {
		throw new Error("Wrong data format,lenght should not be less than 4")
	}
	if (address < 1 || address > 247) {
		throw new Error("Wrong address,should be (1~247)")
	}
	if (buffer[0] != address) {
		throw new Error("Address not matched,ignore the received data")
	}
	let res = {}
	res.crc = validateCRC(buffer)
	res.cmd = int2hex(buffer[1])
	const data = buffer.slice(2, buffer.length - 2);
	res.length = data.length
	res.data = common.arrToHex(data)
	return res
}

/**
 * Encode data. The data can either be a string or an object.
 * The format is as described above. Example:
 * {cmd:"2a", result:true/false, data:"0a1acc320fee32"}
 * @param {number} address the device unique address for modbus. The range is 1~247
 * @param {object} data The data to be sent. This is a required parameter.
 * @returns {ArrayBuffer} buffer data
 */
slave.encode = function (address,data) {
	if (!data) {
		return
	}
	if (address < 1 || address > 247) {
		throw new Error("Wrong address,should be (1~247)")
	}
	let cmd = data.cmd
	if (!data.result) {
		cmd = int2hex(parseInt(cmd, 16) | 0x80)
	}
	let pack = int2hex(address) + cmd
	pack += data.data
	let all = common.hexToArr(pack)
	let crc = calculateModbusCRC(all)
	all.push(crc)
	return new Uint8Array(all).buffer
}

function calculateModbusCRC(data) {
	let crc = 0xFFFF; // Initialize CRC to 0xFFFF

	// Iterate over each byte
	for (let i = 0; i < data.length; i++) {
		crc ^= data[i]; // XOR the current byte with CRC

		// Process each bit of the byte
		for (let j = 0; j < 8; j++) {
			// Check if the least significant bit of CRC is 1
			if (crc & 0x0001) {
				crc >>= 1; // Shift CRC right by one bit
				crc ^= 0xA001; // If the LSB is 1, apply the polynomial 0xA001 (reversed polynomial)
			} else {
				crc >>= 1; // Otherwise, just shift right by one bit
			}
		}
	}

	return [crc & 0xFF,(crc >> 8) & 0xFF];
}

function validateCRC(buffer) {
	// Get the part of the buffer without the last 2 bytes (actual data)
	const data = buffer.slice(0, buffer.length - 2);

	// Calculate the CRC
	const calculatedCRC = calculateModbusCRC(data);

	// Check if the calculated CRC matches the received CRC
	if (calculatedCRC[0] === buffer[buffer.length - 2] && calculatedCRC[1] === buffer[buffer.length - 1]) {
		return true;
	} else {
		return false;
	}
}

function int2hex(num) {
	return num.toString(16).padStart(2, '0')
}
export default slave;