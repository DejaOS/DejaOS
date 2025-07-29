/**
 * HTTP Client Module
 * Features:
 * - GET/POST requests
 * - File upload/download
 * - HTTPS support
 * - Progress callback
 * - Certificate verification
 * 
 * Usage:
 * - Simple requests: use get/post methods
 * - Complex requests: use request method
 * 
 * Doc/Demo : https://github.com/DejaOS/DejaOS
 */
import { httpclientClass } from './libvbar-m-dxhttpclient.so'

let client = null;
const httpclient = {}
/**
 * Initialize the client
 */
httpclient.init = function () {
    if (!client) {
        client = new httpclientClass();
    }
}
/**
 * Send GET request
 * @param {string} url Request URL
 * @param {number} timeout Timeout in milliseconds (default: 5000)
 * @param {Object} [opts] Additional request opts
 * @returns {Object} Response result
 * @returns {number} returns.code - Status code (0: success, non-zero: failure)
 * @returns {string} returns.message - Error message (if any)
 * @returns {string} returns.data - Response data
 * @throws {Error} Throws error during validation
 */
httpclient.get = function (url, timeout = 5000, opts = {}) {
    if (!url) {
        throw new Error("URL is required");
    }
    httpclient.init();
    client.reset();
    client.setOpt("timeout", timeout);
    client.setOpt("url", url);
    client.setOpt("method", "GET");

    for (const [key, value] of Object.entries(opts)) {
        client.setOpt(key, value);
    }

    return client.request();
}

/**
 * Send POST JSON request
 * @param {string} url Request URL
 * @param {Object} data Request body (JSON Object)
 * @param {number} timeout Timeout in milliseconds (default: 5000)
 * @param {Object} [opts] Additional request opts
 * @returns {Object} Response result
 * @returns {number} returns.code - Status code (0: success, non-zero: failure)
 * @returns {string} returns.message - Error message (if any)
 * @returns {string} returns.data - Response data
 * @throws {Error} Throws error during validation
 */
httpclient.post = function (url, data, timeout = 5000, opts = {}) {
    if (!url) {
        throw new Error("URL is required");
    }
    if (!data) {
        throw new Error("Data is required");
    }
    httpclient.init();
    client.reset();
    client.setOpt("timeout", timeout);
    client.setOpt("url", url);
    client.setOpt("method", "POST");
    client.setOpt("header", "Content-Type: application/json");
    client.setOpt("body", data);

    for (const [key, value] of Object.entries(opts)) {
        client.setOpt(key, value);
    }

    return client.request();
}

/**
 * Download file
 * @param {string} url Request URL
 * @param {string} localPath Local save path
 * @param {number} timeout Timeout in milliseconds (default: 30000)
 * @param {Object} [opts] Additional request opts
 * @returns {Object} Response result
 * @returns {number} returns.code - Status code (0: success, non-zero: failure)
 * @returns {string} returns.message - Error message (if any)
 * @throws {Error} Throws error during validation
 */
httpclient.download = function (url, localPath, timeout = 30000, opts = {}) {
    if (!url) {
        throw new Error("URL is required");
    }
    if (!localPath) {
        throw new Error("Local path is required");
    }
    httpclient.init();
    client.reset();
    client.setOpt("timeout", timeout);
    client.setOpt("url", url);
    client.setOpt("method", "GET");

    for (const [key, value] of Object.entries(opts)) {
        client.setOpt(key, value);
    }

    return client.downloadToFile(localPath);
}

/**
 * Upload file
 * @param {string} url Request URL
 * @param {string} localPath Local file path
 * @param {number} timeout Timeout in milliseconds (default: 30000)
 * @param {Object} [opts] Additional request opts
 * @returns {Object} Response result
 * @returns {number} returns.code - Status code (0: success, non-zero: failure)
 * @returns {string} returns.message - Error message (if any)
 * @throws {Error} Throws error during validation
 */
httpclient.upload = function (url, localPath, timeout = 30000, opts = {}) {
    if (!url) {
        throw new Error("URL is required");
    }
    if (!localPath) {
        throw new Error("Local path is required");
    }
    httpclient.init();
    client.reset();
    client.setOpt("url", url);
    client.setOpt("method", "POST");

    for (const [key, value] of Object.entries(opts)) {
        client.setOpt(key, value);
    }
    
    return client.uploadFile(localPath);
}

/**
 * Set request options
 * @param {string} key Option name
 * @param {string|number|boolean|Function} value Option value
 * @throws {Error} Throws error when option is invalid
 * 
 * @example
 * // Set URL
 * setOpt('url', 'https://example.com');
 * // Set request method
 * setOpt('method', 'POST');
 * // Set request header
 * setOpt('header', 'Content-Type: application/json');
 * // Set timeout
 * setOpt('timeout', 5000);
 * // Set progress callback
 * setOpt('onProgress', (totaldownload, downloaded, totalupload, uploaded) => log.info(downloaded,totaldownload, uploaded,totalupload));
 * 
 * Supported options:
 * - url: Request URL
 * - method: Request method (GET, POST, etc.)
 * - header: Request header (format: 'key: value')
 * - body: Request body
 * - timeout: Timeout in milliseconds
 * - onProgress: Progress callback function
 * - verifyPeer: Certificate verification (0: disable, 1: enable)
 * - verifyHost: Hostname verification (0: disable, 2: enable)
 * - caPath: CA certificate path
 */
httpclient.setOpt = function (key, value) {
    if (!key) {
        throw new Error("Key is required");
    }
    if (typeof key !== "string") {
        throw new Error("Key must be a string");
    }
    if (typeof value !== "string" && typeof value !== "number" && typeof value !== "boolean" && typeof value !== "function") {
        throw new Error("Value must be a string, number, boolean, or function");
    }
    httpclient.init();
    client.setOpt(key, value);
}

/**
 * Reset request, must be called before each request
 * Clears all previous request settings, including:
 */
httpclient.reset = function () {
    httpclient.init();
    client.reset();
}

/**
 * Send request, use this function for complex requests
 * @returns {Object} Response result
 * @returns {number} returns.code - Status code (0: success, non-zero: failure)
 * @returns {string} returns.message - Error message (if any)
 * @returns {string} returns.data - Response data
 * @throws {Error} Throws error during validation
 */
httpclient.request = function () {
    httpclient.init();
    return client.request();
}
/**
 * Deinitialize the client
 */
httpclient.deinit = function () {
    if (client) {
        client = null;
    }
}
/**
 * Get native client object
 * @returns {httpclientClass}
 */
httpclient.getNative = function () {
    httpclient.init();
    return client;
}

export default httpclient;