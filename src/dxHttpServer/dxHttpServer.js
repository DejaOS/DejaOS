/**
 * HTTP Server Module
 * Features:
 * - Supports GET/POST requests
 * - Supports file upload, Content-Type should be 'application/octet-stream' or 'text/plain' etc, not support 'multipart/form-data'
 * - Supports file download
 * - Supports static html file service
 * 
 * Usage:
 * - Simple WebServer
 * - Simple Web API Service
 * 
 * Doc/Demo : https://github.com/DejaOS/DejaOS
 */
import { httpserverClass } from './libvbar-m-dxhttpserver.so'

let server = null;
const httpserver = {}
httpserver.init = function () {
    if (!server) {
        server = new httpserverClass();
    }
}
/**
 * Route the HTTP request
 * @param {string} path - The path to route the request, should be start with '/'
 * @param {function} callback - The callback function to handle the request
 * @param {object} callback.req - The request object
 * @param {string} callback.req.method - The HTTP method (GET, POST, etc.)
 * @param {string} callback.req.url - The request URL
 * @param {string} callback.req.query - The query string (e.g. "a=1&b=2")
 * @param {object} callback.req.headers - The request headers
 * @param {string} [callback.req.body] - The request body (only for specific Content-Type)
 * @param {function} callback.req.saveFile - Function to save uploaded file
 * @param {object} callback.res - The response object
 * @param {function} callback.res.send - Send response with body and headers,the header should be a object and the size should be < 512
 * @param {function} callback.res.sendFile - Send file as response
 * 
 * @example
 * // Basic usage 
 * httpserver.route('/hello', function(req, res) {
 *   res.send('Hello World', {'Content-Type': 'text/plain'});
 * });
 * 
 * @example
 * // Handle file upload,only support POST request
 * httpserver.route('/upload', function(req, res) {
 *   req.saveFile('/app/code/data/file_saved.txt');
 *   res.send('File saved');
 * });
 * 
 * @example
 * // Handle file download
 * httpserver.route('/download', function(req, res) {
 *   res.sendFile('/app/code/data/file.txt');
 * });
 */
httpserver.route = function (path, callback) {
    httpserver.init();
    server.route(path, callback);
}
/**
 * Starts the HTTP server listening for connections. 
 * @param {number} port 
 */
httpserver.listen = function (port) {
    httpserver.init();
    server.listen(port);
}
/**
 * Loop the HTTP server
 */
httpserver.loop = function () {
    httpserver.init();
    server.loop();
}
/**
 * Serve static files
 * @param {string} path  The path to serve static files,should be start with '/'
 * @param {string} dir  The directory to serve static files,should be a absolute path start with '/app'
 */
httpserver.serveStatic = function (path, dir) {
    httpserver.init();
    if (!path) {
        path = '/';
    }
    if (!path.startsWith('/')) {
        path = '/' + path;
    }
    if (!path.endsWith('/')) {
        path = path + '/';
    }
    //path should be start with '/' and end with '/',or '/'
    server.serveStatic(path, dir);
}
/**
 * Deinitialize the server
 */
httpserver.deinit = function () {
    if (server) {
        server = null;
    }
}
/**
 * Get the native server object
 * @returns {Object} Native server object
 */
httpserver.getNative = function () {
    httpserver.init();
    return server;
}
export default httpserver;