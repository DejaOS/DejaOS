/**
 * Test HTTP Server Demo
 */
import log from '../../dxmodules/dxLogger.js'
import server from '../../dxmodules/dxHttpServer.js'
import std from '../../dxmodules/dxStd.js'
import tokenUtil from "../common/utils/tokenUtil.js"
import dxCommonUtils from "../../dxmodules/dxCommonUtils.js";
import config from '../../dxmodules/dxConfig.js';
import ota from "../../dxmodules/dxOta.js";
import dxCommon from "../../dxmodules/dxCommon.js";
import api from './api.js'

const messageExpired = {
    code: 401, 
    message: "The token has expired.", 
    data: {}
}

try {
    server.serveStatic("/", "/app/code/resource/web/");

    //登录
    server.route("/login", function (req, res) {
        //POST - Handle user login request
        login(req, res);
    });
    //远程控制
    server.route("/control", function (req, res) {
        control(req, res);
    });
    //远程升级
    server.route("/upgradeFirmware", function (req, res) {
        upgradeFirmware(req, res);
    });
    // Upgrade package management related APIs
    server.route("/upload", function (req, res) {
        //POST - Upload upgrade package
        uploadPackage(req, res);
    });
    // server.route("/download", function (req, res) {
    //     //GET - Download upgrade package
    //     downloadPackage(req, res);
    // });
    //查询配置
    server.route("/getConfig", function (req, res) {
        getConfig(req, res);
    });
    //修改配置
    server.route("/setConfig", function (req, res) {
        setConfig(req, res);
    });
    //新增人员
    server.route("/insertUser", function (req, res) {
        insertUser(req, res);
    });
    //修改人员
    server.route("/modifyUser", function (req, res) {
        modifyUser(req, res);
    });
    //删除人员
    server.route("/delUser", function (req, res) {
        delUser(req, res);
    });
    //查询人员
    server.route("/getUser", function (req, res) {
        getUser(req, res);
    });
    //清空人员
    server.route("/clearUser", function (req, res) {
        clearUser(req, res);
    });

    //新增凭证insertKey
    server.route("/insertKey", function (req, res) {
        insertKey(req, res);
    });
    //修改凭证
    server.route("/modifyKey", function (req, res) {
        modifyKey(req, res);
    });
    //删除凭证
    server.route("/delKey", function (req, res) {
        delKey(req, res);
    });
    //查询凭证
    server.route("/getKey", function (req, res) {
        getKey(req, res);
    });
    //清空凭证
    server.route("/clearKey", function (req, res) {
        clearKey(req, res);
    });

    //新增权限
    server.route("/insertPermission", function (req, res) {
        insertPermission(req, res);
    });
    //修改权限
    server.route("/modifyPermission", function (req, res) {
        modifyPermission(req, res);
    });
    //删除权限
    server.route("/delPermission", function (req, res) {
        delPermission(req, res);
    });
    //查询权限
    server.route("/getPermission", function (req, res) {
        getPermission(req, res);
    });
    //清空权限
    server.route("/clearPermission", function (req, res) {
        clearPermission(req, res);
    });
    //清空权限
    server.route("/getRecord", function (req, res) {
        getRecord(req, res);
    });
    //清空权限
    server.route("/getRecordMsg", function (req, res) {
        getRecordMsg(req, res);
    });
    //清空权限
    server.route("/delRecord", function (req, res) {
        delRecord(req, res);
    });
    //激活云证
    server.route("/eidActive", function (req, res) {
        eidActive(req, res);
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

//登录
function login(req, res) {
    let body = req.body;
    let result = { code: 400, message: "", data: {} }
    if (body) {
        body = JSON.parse(body);
        log.info(body);
        if (body.userPassword === config.get("base.password")) {
            result.code = 200;
            result.message = "登录成功";
            result.data.accessToken = tokenUtil.generateToken(body.userPassword + config.get("sys.sn"));
            result.data.language = config.get("base.language")
        } else {
            result.code = 403
            result.message = "用户名或密码错误"
        }
    }
    try {
        res.send(JSON.stringify(result), { "Content-Type": "application/json" });
    } catch (error) {
        log.error(error)
    }
}

//远程控制
function control(req, res) {
    let result = { code: 400, message: "", data: {} }
    if (verifyToken(req)) {
        let body = req.body;
        body = JSON.parse(body);
        log.info(body);
        try {
            let res = api.control(body)
            if (typeof res == 'string') {
                result.message = res
            } else {
                result.code = 200
            }
        } catch (error) {
            result.message = error.message
        }
    } else {
        result = messageExpired
    }
    res.send(JSON.stringify(result), { "Content-Type": "application/json" });
}

//获取配置
function getConfig(req, res) {
    let result = { code: 400, message: "", data: {} }
    if (verifyToken(req)) {
        let body = req.body;
        body = JSON.parse(body).data;
        log.info(body);
        try {
            let res = api.getConfig(body)
            if (typeof res == 'string') {
                result.message = res
            } else {
                result.code = 200
                result.data = res
            }
        } catch (error) {
            result.message = error.message
        }
    } else {
        result = messageExpired
    }
    res.send(JSON.stringify(result), { "Content-Type": "application/json" });
}

//修改配置
function setConfig(req, res) {
    let result = { code: 400, message: "", data: {} }
    if (verifyToken(req)) {
        let body = req.body;
        body = JSON.parse(body).data;
        log.info(body);
        try {
            let res = api.setConfig(body)
            if (typeof res == 'string') {
                result.message = res
            } else {
                result.code = 200
            }
        } catch (error) {
            result.message = error.message
        }
    } else {
        result = messageExpired
    }
    res.send(JSON.stringify(result), { "Content-Type": "application/json" });
}

// 固件升级
function upgradeFirmware(req, res) {
    let result = { code: 400, message: "", data: {} }
    if (verifyToken(req)) {
        let body = req.body;
        body = JSON.parse(body).data;
        log.info(body);
        try {
            let res = api.upgradeFirmware(body)
            if (typeof res == 'string') {
                result.message = res
            } else {
                result.code = 200
                result.data = res
            }
        } catch (error) {
            result.message = error.message
        }
    } else {
        result = messageExpired
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
        code: 400,
        message: "upload package failed",
        data: {}
    }
    if (verifyToken(req)) {
        try {
            // Save uploaded file
            let res = req.saveMultipartFile("/upgrades.zip");
            log.info('saveMultipartFile', res);
            if (res) {
                if (verifyMD5('/upgrades.zip', res.md5)) {
                    result.code = 200;
                    result.message = "upload package success";
                    ota.reboot()
                }
            }
        } catch (e) {
            log.error(e);
        }
    } else {
        result = messageExpired
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

//新增人员
function insertUser(req, res) {
    let result = { code: 400, message: "", data: {}, }
    if (verifyToken(req)) {
        let body = req.body;
        body = JSON.parse(body).data;
        log.info(body);
        try {
            let res = api.insertUser(body)
            if (Array.isArray(res)) {
                result.data = res
            } else {
                result.code = 200
                result.data = res
            }
        } catch (error) {
            result.message = error.message
        }
    } else {
        result = messageExpired
    }
    res.send(JSON.stringify(result), { "Content-Type": "application/json" });
}

//修改人员
function modifyUser(req, res) {
    let result = { code: 400, message: "", data: {}, }
    if (verifyToken(req)) {
        let body = req.body;
        body = JSON.parse(body).data;
        log.info(body);
        try {
            let res = api.modifyUser(body)
            if (Array.isArray(res)) {
                result.data = res
            } else {
                result.code = 200
                result.data = res
            }
        } catch (error) {
            result.message = error.message
        }
    } else {
        result = messageExpired
    }
    res.send(JSON.stringify(result), { "Content-Type": "application/json" });
}

//删除人员
function delUser(req, res) {
    let result = {
        code: 400,
        message: "",
        data: {},
    }
    if (verifyToken(req)) {
        let body = req.body;
        body = JSON.parse(body).data;
        log.info(body);
        try {
            let res = api.delUser(body)
            if (Array.isArray(res)) {
                result.data = res
            } else {
                result.code = 200
            }
        } catch (error) {
            result.message = error.message
        }
    } else {
        result = messageExpired
    }
    res.send(JSON.stringify(result), { "Content-Type": "application/json" });
}

//查询人员
function getUser(req, res) {
    let result = {
        code: 400,
        message: "",
        data: {},
    }
    if (verifyToken(req)) {
        let body = req.body;
        body = JSON.parse(body).data;
        log.info(body);
        try {
            let res = api.getUser(body)
            if (typeof res == 'string') {
                result.data = res
            } else {
                result.data = res
                result.code = 200
            }
        } catch (error) {
            result.message = error.message
        }
    } else {
        result = messageExpired
    }
    res.send(JSON.stringify(result), { "Content-Type": "application/json" });
}

//清空人员
function clearUser(req, res) {
    let result = {
        code: 400,
        message: "",
        data: {},
    }
    if (verifyToken(req)) {
        let body = req.body;
        body = JSON.parse(body).data;
        log.info(body);
        try {
            let res = api.clearUser(body)
            if (typeof res == 'string') {
                result.data = res
            } else {
                result.code = 200
            }
        } catch (error) {
            result.message = error.message
        }
    } else {
        result = messageExpired
    }
    res.send(JSON.stringify(result), { "Content-Type": "application/json" });
}

//新增凭证insertKey
function insertKey(req, res) {
    let result = {
        code: 400,
        message: "",
        data: {},
    }
    if (verifyToken(req)) {
        let body = req.body;
        body = JSON.parse(body).data;
        log.info(body);
        try {
            let res = api.insertKey(body)
            if (Array.isArray(res)) {
                result.data = res
            } else {
                result.code = 200
            } 
        } catch (error) {
            result.message = error.message
        }
    } else {
        result = messageExpired
    }
    res.send(JSON.stringify(result), { "Content-Type": "application/json" });
}

//修改凭证
function modifyKey(req, res) {
    let result = { code: 400, message: "", data: {}, }
    if (verifyToken(req)) {
        let body = req.body;
        body = JSON.parse(body).data;
        log.info(body);
        try {
            let res = api.modifyKey(body)
            if (Array.isArray(res)) {
                result.data = res
            } else {
                result.code = 200
                result.data = res
            } 
        } catch (error) {
            result.message = error.message
        }
    } else {
        result = messageExpired
    }
    res.send(JSON.stringify(result), { "Content-Type": "application/json" });
}

//删除凭证
function delKey(req, res) {
    let result = {
        code: 400,
        message: "",
        data: {},
    }
    if (verifyToken(req)) {
        let body = req.body;
        body = JSON.parse(body).data;
        log.info(body);
        try {
            let res = api.delKey(body)
            if (Array.isArray(res)) {
                result.data = res
            } else {
                result.code = 200
            }
        } catch (error) {
            result.message = error.message
        }
    } else {
        result = messageExpired
    }
    res.send(JSON.stringify(result), { "Content-Type": "application/json" });
}

//查询凭证
function getKey(req, res) {
    let result = {
        code: 400,
        message: "",
        data: {},
    }
    if (verifyToken(req)) {
        let body = req.body;
        body = JSON.parse(body).data;
        log.info(body);
        try {
            let res = api.getKey(body)
            if (typeof res == 'string') {
                result.data = res
            } else {
                result.code = 200
                result.data = res
            }
        } catch (error) {
            result.message = error.message
        }
    } else {
        result = messageExpired
    }
    res.send(JSON.stringify(result), { "Content-Type": "application/json" });
}

//清空凭证
function clearKey(req, res) {
    let result = {
        code: 400,
        message: "",
        data: {},
    }
    if (verifyToken(req)) {
        let body = req.body;
        body = JSON.parse(body);
        log.info(body);
        try {
            let res = api.clearKey(body)
            if (typeof res == 'string') {
                result.data = res
            } else {
                result.code = 200
            }
        } catch (error) {
            result.message = error.message
        }
    } else {
        result = messageExpired
    }
    res.send(JSON.stringify(result), { "Content-Type": "application/json" });
}

//新增权限
function insertPermission(req, res) {
    let result = {
        code: 400,
        message: "",
        data: {},
    }
    if (verifyToken(req)) {
        let body = req.body;
        body = JSON.parse(body).data;
        log.info(body);
        try {
            let res = api.insertPermission(body)
            if (Array.isArray(res)) {
                result.data = res
            } else {
                result.code = 200
            } 
        } catch (error) {
            result.message = error.message
        }
    } else {
        result = messageExpired
    }
    res.send(JSON.stringify(result), { "Content-Type": "application/json" });
}

//修改凭证
function modifyPermission(req, res) {
    let result = { code: 400, message: "", data: {}, }
    if (verifyToken(req)) {
        let body = req.body;
        body = JSON.parse(body).data;
        log.info(body);
        try {
            let res = api.modifyPermission(body)
            if (Array.isArray(res)) {
                result.data = res
            } else {
                result.code = 200
                result.data = res
            }
        } catch (error) {
            result.message = error.message
        }
    } else {
        result = messageExpired
    }
    res.send(JSON.stringify(result), { "Content-Type": "application/json" });
}

//删除权限
function delPermission(req, res) {
    let result = {
        code: 400,
        message: "",
        data: {},
    }
    if (verifyToken(req)) {
        let body = req.body;
        body = JSON.parse(body).data;
        try {
            let res = api.delPermission(body)
            if (Array.isArray(res)) {
                result.data = res
            } else {
                result.code = 200
            }
        } catch (error) {
            result.message = error.message
        }
    } else {
        result = messageExpired
    }
    res.send(JSON.stringify(result), { "Content-Type": "application/json" });
}

//查询权限
function getPermission(req, res) {
    let result = {
        code: 400,
        message: "",
        data: {},
    }
    if (verifyToken(req)) {
        let body = req.body;
        body = JSON.parse(body).data;
        log.info(body);
        try {
            let res = api.getPermission(body)
            if (typeof res == 'string') {
                result.data = res
            } else {
                result.code = 200
                result.data = res
            }
        } catch (error) {
            result.message = error.message
        }
    } else {
        result = messageExpired
    }
    res.send(JSON.stringify(result), { "Content-Type": "application/json" });
}

//清空权限
function clearPermission(req, res) {
    let result = {
        code: 400,
        message: "",
        data: {},
    }
    if (verifyToken(req)) {
        let body = req.body;
        body = JSON.parse(body);
        log.info(body);
        try {
            let res = api.clearPermission(body)
            if (typeof res == 'string') {
                result.data = res
            } else {
                result.code = 200
            }
        } catch (error) {
            result.message = error.message
        }
    } else {
        result = messageExpired
    }
    res.send(JSON.stringify(result), { "Content-Type": "application/json" });
}

//获取通行记录图片
function getRecordMsg(req, res) {
    let result = {
        code: 400,
        message: "",
        data: {},
    }
    if (verifyToken(req)) {
        let body = req.body;
        body = JSON.parse(body).data;
        log.info(body);
        try {
            let res = dxCommonUtils.fs.fileToBase64(body)
            result.data = res
            result.code = 200
        } catch (error) {
            log.info("获取通行图片BASE64失败")
        }
    } else {
        result = messageExpired
    }
    res.send(JSON.stringify(result), { "Content-Type": "application/json" });
}

//获取通行记录
function getRecord(req, res) {
    let result = {
        code: 400,
        message: "",
        data: {},
    }
    if (verifyToken(req)) {
        let body = req.body;
        body = JSON.parse(body).data;
        log.info(body);
        try {
            let res = api.getRecords(body)
            if (typeof res == 'string') {
                result.data = res
            } else {
                result.code = 200
                result.data = res
            }
        } catch (error) {
            result.message = error.message
        }
    } else {
        result = messageExpired
    }
    res.send(JSON.stringify(result), { "Content-Type": "application/json" });
}

//删除通行记录
function delRecord(req, res) {
    let result = {
        code: 400,
        message: "",
        data: {},
    }
    if (verifyToken(req)) {
        let body = req.body;
        body = JSON.parse(body).data;
        try {
            let res = api.delRecords(body)
            if (typeof res == 'string') {
                result.message = res
            } else {
                result.code = 200
            }
        } catch (error) {
            result.message = error.message
        }
    } else {
        result = messageExpired
    }
    res.send(JSON.stringify(result), { "Content-Type": "application/json" });
}

// 获取云证
function eidActive(req,res) {
    let result = {
        code: 400,
        message: "",
        data: {},
    }
    if (verifyToken(req)) {
        let body = req.body;
        body = JSON.parse(body).data;
        log.info(body);
        try {
            let res = api.eidActive(body)
            if (typeof res == 'string') {
                result.message = res
            } else {
                result.code = 200
            }
        } catch (error) {
            result.message = error.message
        }
    } else {
        result = messageExpired
    }
    res.send(JSON.stringify(result), { "Content-Type": "application/json" });
}

function verifyToken(req) {
    let headers = req.headers;
    if (!headers) {
        return false;
    }
    // Verify Bearer Token
    //Authorization Bearer 1234567890
    if (headers['Authorization']) {
        if (tokenUtil.verifyToken(headers['Authorization'], 1000 * 60 * 60 * 24)) {
            return true
        }
    }
    return false;
}

function isEmpty(value) {
    return value === undefined || value === null || value === ""
}

function verifyMD5(filePath, expectedMD5) {
    const hash = dxCommon.md5HashFile(filePath)
    const actualMD5 = hash.map(v => v.toString(16).padStart(2, '0')).join('')
    return actualMD5 === expectedMD5
}