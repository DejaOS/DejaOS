//build 20240222
//quickjs 标准库，提供和操作系统相关函数，提供标准IO相关函数
import * as os from "os"
import * as std from "std"
import common from "./dxCommon.js"

const dxstd = {}
/**
 * 退出应用
 * @param {number} n 退出码
 */
dxstd.exit = function (n) {
    return std.exit(n);
}
/**
 * 启动计时器，延时异步执行函数
 * @param {function} func 需要执行的函数
 * @param {number} delay 延迟的时间（毫秒）
 * @returns timer引用
 */
dxstd.setTimeout = function (func, delay) {
    return os.setTimeout(func, delay)
}
/**
 * 清除指定的计时器
 * @param {*} handle timer引用
 */
dxstd.clearTimeout = function (handle) {
    os.clearTimeout(handle)
}
// 记录定时器id，用于clear，只能在同一线程中clear
let allTimerIdsMap = {}

/**
 * interval定时器
 * @param {function} callback 回调函数，必填
 * @param {number} interval 间隔时间，必填
 * @param {boolean} once 创建后立即执行一次，非必填
 * @param {number} timerId 定时器id，非必填
 */
dxstd.setInterval = function (callback, interval, once, timerId) {
    if (timerId === null || timerId === undefined) {
        timerId = new Date().getTime() + "_" + this.genRandomStr(5)
        allTimerIdsMap[timerId] = "ready"
    }
    if (once === true) {
        // 创建后立即执行一次
        os.setTimeout(() => {
            if (allTimerIdsMap[timerId]) {
                callback()
            }
        }, 0);
    }
    if (!allTimerIdsMap[timerId]) {
        return
    }
    allTimerIdsMap[timerId] = os.setTimeout(() => {
        if (allTimerIdsMap[timerId]) {
            callback()
            this.setInterval(callback, interval, false, timerId)
        }
    }, interval);
    return timerId
}

/**
 * 清除interval定时器
 * @param {number} timerId 定时器id，必填
 */
dxstd.clearInterval = function (timerId) {
    const timer = allTimerIdsMap[timerId];
    if (timer) {
        os.clearTimeout(timer);
        delete allTimerIdsMap[timerId];
    }
}
/**
 * 删除当前线程所有interval定时器，注意：只是删除当前线程创建的定时器，若有多个线程，每个线程都需要调用删除
 */
dxstd.clearIntervalAll = function () {
    for (let timerId in allTimerIdsMap) {
        if (allTimerIdsMap.hasOwnProperty(timerId)) {
            os.clearTimeout(allTimerIdsMap[timerId]);
            delete allTimerIdsMap[timerId];
        }
    }
}
/**
 * 生成指定长度的字母和数字组合的随机字符串
 * @param {number} length 字符串长度，非必填，缺省是6
 * @returns 
 */
dxstd.genRandomStr = function (length = 6) {
    const charset = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'
    let result = ''
    for (let i = 0; i < length; i++) {
        const randomIndex = Math.floor(Math.random() * charset.length)
        result += charset.charAt(randomIndex)
    }
    return result
}
/**
 * 把一段字符串作为 javascript 脚本执行
 * @param {string} str js脚本字符串
 * @param {boolean} async 默认为false，如果为 true，脚本中将接受 await 并返回一个 Promise 
 */
dxstd.eval = function (str, async) {
    return std.evalScript(str, { async: async });
}
/**
 * 加载一个文件内容作为 javascript 脚本执行
 * @param {string} filename js脚本内容的文件名(绝对路径)
 */
dxstd.loadScript = function (filename) {
    return std.loadScript(filename);
}
/**
 * 加载文件，读取文件里的内容（使用utf）
 * @param {string} filename 文件名
 */
dxstd.loadFile = function (filename) {
    return std.loadFile(filename)
}
/**
 * 保存字符串到文件
 * @param {string} filename 
 * @param {string} content 
 */
dxstd.saveFile = function (filename, content) {
    if (!content || (typeof content) != 'string') {
        throw new Error("The 'content' value should be string and not empty")
    }
    if (!filename) {
        throw new Error("The 'filename' should not be empty")
    }
    if (!this.exist(filename)) {
        this.ensurePathExists(filename)
        let fd = os.open(filename, os.O_RDWR | os.O_CREAT | os.O_TRUNC);
        if (fd < 0) {
            throw new Error("Create file failed:" + filename)
        }
        os.close(fd)
    }
    let fd = std.open(filename, "w");
    fd.puts(content)
    fd.flush();
    fd.close();
    common.systemBrief('sync')
    return true
}
/**
 * 确保文件对应的目录都存在，不存在就会创建
 * @param {string} filename 
 */
dxstd.ensurePathExists = function (filename) {
    const pathSegments = filename.split('/');
    let currentPath = '';
    for (let i = 0; i < pathSegments.length - 1; i++) {
        currentPath += pathSegments[i] + '/';
        if (!this.exist(currentPath)) {
            this.mkdir(currentPath);
        }
    }
}
/**
 * 判断文件是否存在
 * @param {string} filename  文件名
 * @returns true/false
 */
dxstd.exist = function (filename) {
    return (os.stat(filename)[1] === 0)
}
/**
 * 返回一个包含环境变量的键值对的对象。
 */
dxstd.getenviron = function () {
    return std.getenviron();
}
/**
 * 返回环境变量名称的值，如果未定义则返回undefined
 * @param {string} name 变量名
 */
dxstd.getenv = function (name) {
    return std.getenv(name);
}
/**
 * 将环境变量名的值设置为字符串值
 * @param {string} name 变量名
 * @param {string} value 变量值
 */
dxstd.setenv = function (name, value) {
    return std.setenv(name, value);
}
/**
 * 删除环境变量
 * @param {string} name 变量名
 */
dxstd.unsetenv = function (name) {
    return std.unsetenv(name);
}
/**
 * 使用JSON.parse的超集来解析字符串。可以解析非标准的 JSON 字符串。接受以下扩展：
 * - 单行和多行注释
 * - 未加引号的属性（仅ASCII字符的JavaScript标识符）
 * - 数组和对象最后可以加逗号
 * - 单引号字符串
 * - \f 和 \v 被接受为空格字符
 * - 数字中的前面可以有加号
 * - 八进制（0o前缀）和十六进制（0x前缀）数字
 * @param {string} str json字符串
 */
dxstd.parseExtJSON = function (str) {
    return std.parseExtJSON(str);
}
/**
 * 休眠delay_ms毫秒
 */
dxstd.sleep = function (delay_ms) {
    return os.sleep(delay_ms);
}
/**
 * 返回表示平台的字符串："linux"、"darwin"、"win32" 或 "js"。
 */
dxstd.platform = function () {
    return os.platform;
}
/**
 * 创建一个新线程（worker）的构造函数，其API接近于WebWorkers。
 * 对于动态导入的模块，它相对于当前脚本或模块路径。线程通常不共享任何数据，可以通过dxMap,dxQueue,dxWpc来共享和传递数据。不支持嵌套的 worker。
 * @param {string} module_filename 指定在新创建的线程中执行的模块文件名
 */
dxstd.Worker = function (module_filename) {
    return new os.Worker(module_filename)
}

dxstd.O_RDONLY = os.O_RDONLY
dxstd.O_WRONLY = os.O_WRONLY
dxstd.O_RDWR = os.O_RDWR
dxstd.O_APPEND = os.O_APPEND
dxstd.O_CREAT = os.O_CREAT
dxstd.O_EXCL = os.O_EXCL
dxstd.O_TRUNC = os.O_TRUNC
/**
 * 打开一个文件。返回一个句柄，如果出现错误则返回 < 0。
 * @param {string} filename 文件绝对路径
 * @param {number} flags O_RDONLY,O_WRONLY,O_RDWR,O_APPEND,O_CREAT,O_EXCL,O_TRUNC
 * 1. O_RDONLY ：以只读方式打开文件
 * 2. O_WRONLY ：以只写方式打开文件
 * 3. O_RDWR ：以可读可写方式打开文件
 * 以上三个是文件访问权限标志，传入的flags 参数中必须要包含其中一种标志，而且只能包含一种，打开的文件只能按照这种权限来操作，
   譬如使用了 O_RDONLY 标志，就只能对文件进行读取操作，不能写操作。

 * 4. O_APPEND ：调用 open 函数打开文件，当每次使用 write()函数对文件进行写操作时，都会自动把文件当前位置偏移量移动到文件末尾，
   从文件末尾开始写入数据，也就是意味着每次写入数据都是从文件末尾开始。
   O_APPEND标志并不会影响读文件，当读取文件时， O_APPEND 标志并不会影响读位置偏移量， 
   即使使用了 O_APPEND标志，读文件位置偏移量默认情况下依然是文件头，
   使用 lseek 函数来改变 write()时的写位置偏移量也不会成功，
   当执行 write()函数时，检测到 open 函数携带了 O_APPEND 标志，所以在 write 函数内部会自动将写位置偏移量移动到文件末尾

 * 5. O_CREAT：如果 filename 参数指向的文件不存在则创建此文件
 * 6. O_EXCL :此标志一般结合 O_CREAT 标志一起使用，用于专门创建文件。
   在 flags 参数同时使用到了 O_CREAT 和O_EXCL 标志的情况下，如果 filename 参数指向的文件已经存在，
   则 open 函数返回错误。可以用于测试一个文件是否存在，如果不存在则创建此文件，如果存在则返回错误，这使得测试和创建两者成为一个原子操作。
 * 7. O_TRUNC ：调用 open 函数打开文件的时候会将文件原本的内容全部丢弃，文件大小变为 0； 
 */
dxstd.open = function (filename, flags) {
    return os.open(filename, flags);
}
/**
 * 判断给定路径是否是一个文件夹。
 * @param {string} filename - 要检查的路径。
 * @returns {boolean} 如果是文件夹则返回 true，否则返回 false,如果不存在，抛出异常。
 */
dxstd.isDir = function (filename) {
    let stat = os.stat(filename)
    if (stat[1] != 0) {
        throw new Error("No such file:" + filename)
    }
    return ((stat[0].mode & this.S_IFMT) === this.S_IFDIR);
}
/**
 * 关闭文件
 * @param {*} fd 文件句柄 
 */
dxstd.close = function (fd) {
    return os.close(fd)
}
dxstd.SEEK_SET = std.SEEK_SET
dxstd.SEEK_CUR = std.SEEK_CUR
dxstd.SEEK_END = std.SEEK_END
/**
 * 在文件中进行定位。使用SEEK_*来表示whence。offset可以是数字或bigint。如果offset是bigint，则返回一个bigint。
 * @param {*} fd 文件句柄
 * @param {number} offset 为偏移量，整数表示正向偏移，负数表示负向偏移
 * @param {*} whence 设定从文件的哪里开始偏移: SEEK_SET： 文件开头;SEEK_CUR： 当前位置;SEEK_END： 文件结尾
 */
dxstd.seek = function (fd, offset, whence) {
    return os.seek(fd, offset, whence)
}
/**
 * 从文件句柄fd读取length字节到位于字节位置offset的ArrayBuffer缓冲区。返回读取的字节数，如果出现错误则返回 < 0。
 * @param {*} fd 文件句柄
 * @param {*} buffer ArrayBuffer对象
 * @param {number} offset 偏移量
 * @param {number} length 读取的字节长度
 */
dxstd.read = function (fd, buffer, offset, length) {
    return os.read(fd, buffer, offset, length);
}
/**
 * 从ArrayBuffer缓冲区的字节位置offset向文件句柄fd写入length字节。返回已写入的字节数，如果出现错误则返回 < 0。
 * @param {*} fd 文件句柄
 * @param {*} buffer ArrayBuffer对象
 * @param {*} offset 偏移量
 * @param {*} length 写的字节长度
 */
dxstd.write = function (fd, buffer, offset, length) {
    return os.write(fd, buffer, offset, length);
}
/**
 * 删除文件，成功返回0否则-errno
 * @param {string} filename 文件绝对路径
 */
dxstd.remove = function (filename) {
    return os.remove(filename)
}
/**
 * 修改文件名称，成功返回0否则-errno
 * @param {string} oldname 旧文件绝对路径
 * @param {string} newname 新文件绝对路径
 */
dxstd.rename = function (oldname, newname) {
    return os.rename(oldname, newname)
}
/**
 * 返回 [str, err]，其中 str 是当前工作目录，err 是错误代码
 */
dxstd.getcwd = function () {
    return os.getcwd()
}
/**
 * 改变当前工作目录
 * @param {string} path 目录,支持绝对和相对路径 
 */
dxstd.chdir = function (path) {
    return os.chdir(path)
}
/**
 * 创建目录,成功返回0否则-errno
 * @param {string} path 目录绝对路径 
 */
dxstd.mkdir = function (path) {
    return os.mkdir(path)
}
dxstd.S_IFMT = os.S_IFMT
dxstd.S_IFIFO = os.S_IFIFO
dxstd.S_IFCHR = os.S_IFCHR
dxstd.S_IFDIR = os.S_IFDIR
dxstd.S_IFBLK = os.S_IFBLK
dxstd.S_IFREG = os.S_IFREG
dxstd.S_IFSOCK = os.S_IFSOCK
dxstd.S_IFLNK = os.S_IFLNK
dxstd.S_ISGID = os.S_ISGID
dxstd.S_ISUID = os.S_ISUID
/**
 * 返回 [obj, err]，其中 obj 是一个包含路径path的文件状态信息的对象。
 * err 是错误代码。obj 中定义了以下字段：dev、ino、mode、nlink、uid、gid、rdev、size、blocks、atime、mtime、ctime。
 * 时间以自1970年以来的毫秒为单位指定。
 * 其中mode的值对应以下枚举,例如，检查一个文件是否是目录可以使用 (mode & S_IFMT) == S_IFDIR 的方式:
   S_IFMT：位掩码，用于提取文件类型部分的位。这是一个用于屏蔽文件类型位的常量。
   S_IFIFO：表示FIFO（命名管道）。
   S_IFCHR：表示字符设备。
   S_IFDIR：表示目录。
   S_IFBLK：表示块设备。
   S_IFREG：表示常规文件。
   S_IFSOCK：表示套接字。
   S_IFLNK：表示符号链接。
   S_ISGID：设置组ID位。
   S_ISUID：设置用户ID位。
 * @param {string} path 文件或目录绝对路径 
 */
dxstd.stat = function (path) {
    return os.stat(path)
}
/**
 * lstat() 与 stat() 相同，只是它返回关于链接本身的信息。
 * @param {*} path 文件或目录绝对路径 
 */
dxstd.lstat = function (path) {
    return os.lstat(path)
}
/**
 * 返回 [array, err]，其中 array 是包含目录路径下的文件名的字符串数组。err 是错误代码。
 * @param {string} path 目录绝对路径 
 */
dxstd.readdir = function (path) {
    return os.readdir(path)
}
export default dxstd