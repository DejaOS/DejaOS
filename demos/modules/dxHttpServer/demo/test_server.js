/**
 * Test HTTP Server Demo
 */
import log from '../dxmodules/dxLogger.js'
import server from '../dxmodules/dxHttpServer.js'
import std from '../dxmodules/dxStd.js'

try {
    // Configure static resource service
    server.serveStatic("/", "/app/code/src/web/");

    // Configure routes and their corresponding handlers
    server.route("/api/verify", function (req, res) {
        res.send("hello world", { "Content-Type": "text/html" });
    });

    // User authentication related APIs
    server.route("/api/login", function (req, res) {
        //POST - Handle user login request
        login(req, res);
    });

    // User management related APIs
    server.route("/api/userList", function (req, res) {
        //GET - Get user list
        userList(req, res);
    });
    server.route("/api/addUser", function (req, res) {
        //GET - Add new user
        addUser(req, res);
    });
    server.route("/api/deleteUser", function (req, res) {
        //DELETE - Delete user
        deleteUser(req, res);
    });

    // Upgrade package management related APIs
    server.route("/api/packages/upload", function (req, res) {
        //POST - Upload upgrade package
        uploadPackage(req, res);
    });
    server.route("/api/packages/download", function (req, res) {
        //GET - Download upgrade package
        downloadPackage(req, res);
    });

    // Start server and listen on port
    server.listen(8080);
} catch (e) {
    log.error(e);
}
log.info("=== END ===");

// Set server event loop
std.setInterval(() => {
    server.loop();
}, 10);

// Mock user data storage
let userListData = [
    { username: "admin", createTime: "2021-01-01" },
    { username: "guest", createTime: "2021-01-02" }];

/**
 * Get user list
 * @param {Object} req - Request object
 * @param {Object} res - Response object
 */
function userList(req, res) {
    let result = {
        code: 1,
        data: []
    }
    if (verifyToken(req)) {
        result.data = userListData;
        result.code = 0;
    }
    res.send(JSON.stringify(result), { "Content-Type": "application/json" });
}

/**
 * Delete user
 * @param {Object} req - Request object
 * @param {Object} res - Response object
 */
function deleteUser(req, res) {
    let result = {
        code: 1,
        message: "delete user failed",
        data: {}
    }
    if (verifyToken(req)) {
        let query = req.query;
        if (query) {//username=user1 
            let querys = query.split('=')
            if (querys.length == 2) {
                let username = querys[1];
                // Prevent deletion of admin and guest accounts
                if (username === "admin" || username === "guest") {
                    result.message = "admin or guest can not be deleted";
                } else {
                    userListData = userListData.filter(user => user.username != username);
                    result.code = 0;
                    result.message = "delete user success";
                }
            }
        }
    }
    res.send(JSON.stringify(result), { "Content-Type": "application/json" });
}

/**
 * Verify user token
 * @param {Object} req - Request object
 * @returns {boolean} Verification result
 */
function verifyToken(req) {
    let headers = req.headers;
    if (!headers) {
        return false;
    }
    // Verify Bearer Token
    //Authorization Bearer 1234567890
    if (headers['Authorization']) {
        if (headers['Authorization'] == 'Bearer 1234567890') {
            return true;
        }
    }
    return false;
}

/**
 * Add new user
 * @param {Object} req - Request object
 * @param {Object} res - Response object
 */
function addUser(req, res) {
    let result = {
        code: 1,
        message: "add user failed",
        data: {}
    }
    if (verifyToken(req)) {
        let query = req.query;
        if (query) {//username=user1 
            let querys = query.split('=')
            if (querys.length == 2) {
                let username = querys[1];
                // Add new user and record creation time
                userListData.push({ username: username, createTime: new Date().toISOString() });
            }
        }
        result.code = 0;
        result.message = "add user success";
    }
    res.send(JSON.stringify(result), { "Content-Type": "application/json" });
}

/**
 * User login handler
 * @param {Object} req - Request object
 * @param {Object} res - Response object
 */
function login(req, res) {
    let body = req.body;
    let result = {
        code: 1,
        message: "login failed",
        data: {}
    }
    if (body) {
        body = JSON.parse(body);
        log.info(body);
        // Verify admin account
        if (body.username == 'admin' && body.password == 'e10adc3949ba59abbe56e057f20f883e') {
            result.code = 0;
            result.message = "login success";
            result.data.token = "1234567890";
            result.data.role = "admin";
            result.data.id = "admin";
            result.data.username = "admin";
        }
        // Verify guest account
        if (body.username == 'guest' && body.password == 'e10adc3949ba59abbe56e057f20f883e') {
            result.code = 0;
            result.message = "login success";
            result.data.token = "1234567890";
            result.data.role = "user";
            result.data.id = "guest";
            result.data.username = "guest";
        }
    }
    res.send(JSON.stringify(result), { "Content-Type": "application/json" });
}

/**
 * Upload upgrade package
 * @param {Object} req - Request object
 * @param {Object} res - Response object
 */
function uploadPackage(req, res) {
    let result = {
        code: 1,
        message: "upload package failed",
        data: {}
    }
    if (verifyToken(req)) {
        try {
            // Save uploaded file
            let res = req.saveFile("/app/code/src/package.zip");
            log.info('saveFile', res);
            if (res) {
                result.code = 0;
                result.message = "upload package success";
            }
        } catch (e) {
            log.error(e);
        }
    }
    res.send(JSON.stringify(result), { "Content-Type": "application/json" });
}

/**
 * Download upgrade package
 * @param {Object} req - Request object
 * @param {Object} res - Response object
 */
function downloadPackage(req, res) {
    try {
        log.info('start download package');
        // Send file to client
        res.sendFile("/app/code/src/package.zip");
        log.info('download package success');
    } catch (e) {
        log.error(e);
    }
}
