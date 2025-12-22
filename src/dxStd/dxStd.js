/**
 * dxStd Standard Library Module.
 * 
 * This module provides a comprehensive standard library for DejaOS, wrapping and extending
 * the built-in 'os' and 'std' modules. It offers a unified interface for interacting
 * with the operating system, including file I/O, timers, environment variables, and more.
 *
 * Features:
 * - High-level wrappers for file system operations (read, write, stat, etc.).
 * - Robust, non-blocking timer functions (`setInterval`, `setTimeout`).
 * - Process and environment variable management.
 * - Worker (threading) support.
 * - Utility functions for common tasks like random string generation.
 *
 * Usage:
 * - Import the module: `import dxstd from "./dxmodules/dxStd.js";`
 * - Use the functions: `dxstd.saveFile("/app/data/test.txt", "Hello, DejaOS!");`, `dxstd.sleep(1000);`
 */
import * as os from "os"
import * as std from "std"

const dxstd = {}

// --- Constants ---
// File open flags from 'os' module
dxstd.O_RDONLY = os.O_RDONLY
dxstd.O_WRONLY = os.O_WRONLY
dxstd.O_RDWR = os.O_RDWR
dxstd.O_APPEND = os.O_APPEND
dxstd.O_CREAT = os.O_CREAT
dxstd.O_EXCL = os.O_EXCL
dxstd.O_TRUNC = os.O_TRUNC

// File seek flags from 'std' module
dxstd.SEEK_SET = std.SEEK_SET
dxstd.SEEK_CUR = std.SEEK_CUR
dxstd.SEEK_END = std.SEEK_END

// File mode flags from 'os' module
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

// --- Standard I/O Streams ---
// Expose the raw standard I/O streams for direct access when needed.
dxstd.in = std.in;
dxstd.out = std.out;
dxstd.err = std.err;


/**
 * Exits the application.
 * @param {number} n - The exit code.
 */
dxstd.exit = function (n) {
    std.exit(n);
}
/**
 * Starts a timer to execute a function asynchronously after a delay.
 * @param {function} func - The function to execute.
 * @param {number} delay - The delay in milliseconds.
 * @returns {*} A timer handle that can be used with clearTimeout.
 */
dxstd.setTimeout = function (func, delay) {
    return os.setTimeout(func, delay)
}
/**
 * Clears a specified timer.
 * @param {*} handle - The timer handle returned by setTimeout.
 */
dxstd.clearTimeout = function (handle) {
    os.clearTimeout(handle)
}
// Map to store timer IDs for clearing. Only timers created in the current thread can be cleared.
let allTimerIdsMap = {}

/**
 * Sets up a recurring timer.
 * @param {function} callback - The function to be called repeatedly. Required.
 * @param {number} interval - The interval time in milliseconds. Required.
 * @param {boolean} [once] - If true, executes the callback once immediately after creation. Optional.
 * @note Any exception thrown inside the callback will be caught and logged to the standard error stream.
 * The interval will continue to run. This implementation uses a recursive setTimeout, which means
 * the interval will be delayed by the execution time of the callback. This can lead to "timer drift"
 * over long periods.
 * @returns {string} The unique timer ID for this interval, which can be used with clearInterval.
 */
dxstd.setInterval = function (callback, interval, once) {
    const timerId = this.genRandomStr(20);

    // The state for each timer is stored in a map.
    // The `handle` stores the native setTimeout identifier.
    allTimerIdsMap[timerId] = { handle: null };

    const tick = () => {
        // If the timerId was cleared from the map, it means clearInterval was called.
        // We stop the loop.
        if (!allTimerIdsMap[timerId]) {
            return;
        }

        try {
            callback();
        } catch (e) {
            std.err.puts(`Error in setInterval callback for timerId ${timerId}: ${e.message || e}\n${e.stack || ''}\n`);
            std.err.flush();
        }

        // After the callback executes, we check again.
        // This prevents rescheduling if clearInterval was called inside the callback.
        if (allTimerIdsMap[timerId]) {
            allTimerIdsMap[timerId].handle = os.setTimeout(tick, interval);
        }
    };

    // If 'once' is true, execute the callback immediately, with exception handling.
    if (once) {
        try {
            callback();
        } catch (e) {
            std.err.puts(`Error in setInterval 'once' callback for timerId ${timerId}: ${e.message || e}\n${e.stack || ''}\n`);
            std.err.flush();
        }
    }

    // Schedule the first tick.
    allTimerIdsMap[timerId].handle = os.setTimeout(tick, interval);

    return timerId;
}
/**
 * Clears an interval timer.
 * @param {string} timerId - The ID of the timer to clear. Required.
 */
dxstd.clearInterval = function (timerId) {
    const timerState = allTimerIdsMap[timerId];
    if (timerState) {
        // Clear the scheduled native timer.
        if (timerState.handle) {
            os.clearTimeout(timerState.handle);
        }
        // By removing the entry from the map, we signal to any pending 'tick' function
        // that it should not reschedule itself. This prevents race conditions.
        delete allTimerIdsMap[timerId];
    }
}
/**
 * Clears all interval timers created in the current thread.
 * Note: This only clears timers created by the calling thread. If multiple threads exist,
 * each must call this function to clear its own timers.
 */
dxstd.clearIntervalAll = function () {
    const allIds = Object.keys(allTimerIdsMap);
    for (const timerId of allIds) {
        this.clearInterval(timerId);
    }
};
/**
 * Generates a random string of a specified length consisting of letters and numbers.
 * @param {number} [length=6] - The length of the string. Optional.
 * @returns {string} The generated random string.
 * @note This function is based on Math.random() and is not cryptographically secure. For security-sensitive applications, it is recommended to use the `dxCommonUtils.random` module.
 */
dxstd.genRandomStr = function (length = 6) {
    if (typeof length !== 'number' || length < 0 || length > 100) {
        throw new Error('Length must be a non-negative number <= 100');
    }
    const charset = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'
    let result = ''
    for (let i = 0; i < length; i++) {
        const randomIndex = Math.floor(Math.random() * charset.length)
        result += charset.charAt(randomIndex)
    }
    return result
}
/**
 * Executes a string as a JavaScript script.
 * @param {string} str - The JavaScript script string.
 * @param {boolean} [async=false] - If true, the script can use 'await' and the function returns a Promise.
 * @returns {*} The result of the script evaluation.
 */
dxstd.eval = function (str, async) {
    return std.evalScript(str, { async: async });
}
/**
 * Loads and executes the content of a file as a JavaScript script.
 * @param {string} filename - The absolute path of the script file.
 * @returns {*} The result of the script evaluation.
 */
dxstd.loadScript = function (filename) {
    return std.loadScript(filename);
}
/**
 * Loads the content of a file as a UTF-8 string.
 * @param {string} filename - The name of the file.
 * @returns {string} The content of the file.
 */
dxstd.loadFile = function (filename) {
    return std.loadFile(filename)
}
/**
 * Saves a string to a file. Creates the directory path if it doesn't exist.
 * @param {string} filename - The absolute path of the file.
 * @param {string} content - The string content to save. An empty string is allowed.
 * @param {boolean} [sync=true] - If true, performs a system-wide sync to flush all file system buffers to disk, ensuring data reliability at the cost of performance.
 * @returns {boolean} Returns true on success.
 * @throws {Error} If content is not a string, filename is empty, or the file cannot be saved.
 */
dxstd.saveFile = function (filename, content, sync = true) {
    if (typeof content !== 'string') {
        throw new Error("The 'content' value must be a string")
    }
    if (!filename) {
        throw new Error("The 'filename' should not be empty")
    }
    // This is still needed to create parent directories if they don't exist.
    this.ensurePathExists(filename)
    let fd = null
    try {
        // The "w" mode means: open for writing, create if it does not exist, and truncate it to zero length if it does.
        fd = std.open(filename, "w");
        fd.puts(content)
        fd.flush();
    } catch (e) {
        throw new Error(`Failed to save file '${filename}': ${e}`);
    } finally {
        if (fd) {
            fd.close();
        }
    }
    // 'sync' is a heavy operation that forces all buffered data to disk across the system.
    // This improves reliability at the cost of performance.
    if (sync) {
        os.exec(['sync']);
    }
    return true
}

/**
 * Saves binary data to a file. Creates the directory path if it doesn't exist.
 * Supports ArrayBuffer and Uint8Array, with optional offset and length.
 * @param {string} filename - The absolute path of the file.
 * @param {ArrayBuffer|Uint8Array} data - The binary data to save.
 * @param {number} [offset=0] - Byte offset in data to start writing from.
 * @param {number} [length=data.byteLength] - Number of bytes to write.
 * @param {boolean} [sync=true] - If true, performs a system-wide sync to flush buffers to disk.
 * @returns {boolean} Returns true on success.
 * @throws {Error} If parameters are invalid or file operation fails.
 */
dxstd.saveBinaryFile = function (filename, data, offset = 0, length = undefined, sync = true) {
    if (!(data instanceof ArrayBuffer) && !(data instanceof Uint8Array)) {
        throw new Error("The 'data' must be an ArrayBuffer or a Uint8Array");
    }
    if (!filename) throw new Error("The 'filename' should not be empty");

    // Work with Uint8Array as it's a view and has consistent properties.
    const buf = data instanceof Uint8Array ? data : new Uint8Array(data);
    const writeLength = length !== undefined ? length : (buf.byteLength - offset);

    if (offset < 0 || writeLength < 0 || offset + writeLength > buf.byteLength) {
        throw new Error("Invalid offset or length for data buffer");
    }

    this.ensurePathExists(filename);
    let fd = -1;
    try {
        fd = this.open(filename, this.O_WRONLY | this.O_CREAT | this.O_TRUNC);
        if (fd < 0) throw new Error(`Failed to open file. Code: ${fd}`);

        if (writeLength > 0) {
            // The native os.write function strictly expects an ArrayBuffer, not a view.
            // We must provide the underlying buffer and the absolute byte offset within that buffer.
            const absoluteOffset = buf.byteOffset + offset;
            const bytesWritten = this.write(fd, buf.buffer, absoluteOffset, writeLength);
            if (bytesWritten < 0) throw new Error(`Write operation failed. Code: ${bytesWritten}`);
            if (bytesWritten !== writeLength) {
                throw new Error(`Partial write: expected ${writeLength} bytes, wrote ${bytesWritten}`);
            }
        }
    } catch (e) {
        throw new Error(`Failed to save binary file '${filename}': ${e.message || e}`);
    } finally {
        if (fd >= 0) this.close(fd);
    }

    if (sync) os.exec(['sync']);
    return true;
};

/**
 * Loads a portion or the entire content of a file as binary data into a Uint8Array.
 * @param {string} filename - The absolute path of the file.
 * @param {number} [offset=0] - Byte offset in the file to start reading from.
 * @param {number} [length] - Number of bytes to read. Defaults to reading from the offset to the end of the file.
 * @returns {Uint8Array} A Uint8Array containing the specified portion of the file's binary data.
 * @throws {Error} If the file does not exist, the path is a directory, or parameters are invalid.
 */
dxstd.loadBinaryFile = function (filename, offset = 0, length = undefined) {
    if (!filename) throw new Error("The 'filename' should not be empty");

    const [stat, err] = this.stat(filename);
    if (err) throw new Error(`Cannot access file '${filename}'. Code: ${err}`);
    if ((stat.mode & this.S_IFMT) === this.S_IFDIR) throw new Error(`Path '${filename}' is a directory`);

    const fileSize = stat.size;

    const readOffset = offset;
    const readLength = length !== undefined ? length : (fileSize - readOffset);

    if (readOffset < 0 || readLength < 0 || readOffset + readLength > fileSize) {
        throw new Error("Invalid offset or length for reading file");
    }

    if (readLength === 0) {
        return new Uint8Array(0);
    }

    let fd = -1;
    try {
        fd = this.open(filename, this.O_RDONLY);
        if (fd < 0) throw new Error(`Failed to open file. Code: ${fd}`);

        // Move the file pointer to the desired offset before reading.
        this.seek(fd, readOffset, std.SEEK_SET);

        // Read into a new buffer. The offset for the buffer itself is 0.
        const buffer = new ArrayBuffer(readLength);
        const bytesRead = this.read(fd, buffer, 0, readLength);

        if (bytesRead < 0) throw new Error(`Read operation failed. Code: ${bytesRead}`);
        if (bytesRead !== readLength) throw new Error(`Partial read: expected ${readLength} bytes, got ${bytesRead}`);

        return new Uint8Array(buffer);
    } catch (e) {
        throw new Error(`Failed to load binary file '${filename}': ${e.message || e}`);
    } finally {
        if (fd >= 0) this.close(fd);
    }
};

/**
 * Ensures that the directory path for a given filename exists. Creates it if necessary.
 * @param {string} filename - The full path of the file.
 */
dxstd.ensurePathExists = function (filename) {
    const pathSegments = filename.split('/');
    let currentPath = '';
    // We iterate to pathSegments.length - 1 because the last segment is the filename.
    for (let i = 0; i < pathSegments.length - 1; i++) {
        // Handle root directory case
        if (i === 0 && pathSegments[i] === '') {
            currentPath = '/';
            continue;
        }
        currentPath += pathSegments[i] + '/';

        const [st, err] = os.stat(currentPath);

        if (!err) {
            // Path exists, check if it is a directory.
            if ((st.mode & this.S_IFMT) !== this.S_IFDIR) {
                throw new Error(`Path component '${currentPath}' exists but is not a directory`);
            }
        } else {
            // Path does not exist, create it.
            // We assume any error from stat means the path needs to be created.
            // A subsequent mkdir failure (e.g., permission denied) will throw an error.
            this.mkdir(currentPath);
        }
    }
}
/**
 * Checks if a file or directory exists.
 * @param {string} filename - The name of the file or directory.
 * @returns {boolean} True if the file exists, false otherwise.
 */
dxstd.exist = function (filename) {
    const [, err] = os.stat(filename);
    return err === 0;
}
/**
 * Returns an object containing key-value pairs of the environment variables.
 * @returns {object} The environment variables.
 */
dxstd.getenviron = function () {
    return std.getenviron();
}
/**
 * Returns the value of an environment variable.
 * @param {string} name - The name of the variable.
 * @returns {string|undefined} The value of the variable, or undefined if not defined.
 */
dxstd.getenv = function (name) {
    return std.getenv(name);
}
/**
 * Sets the value of an environment variable.
 * @param {string} name - The name of the variable.
 * @param {string} value - The value to set.
 */
dxstd.setenv = function (name, value) {
    return std.setenv(name, value);
}
/**
 * Deletes an environment variable.
 * @param {string} name - The name of the variable to delete.
 */
dxstd.unsetenv = function (name) {
    return std.unsetenv(name);
}
/**
 * Parses a string using a superset of JSON.parse. It can parse non-standard JSON strings.
 * It accepts the following extensions:
 * - single line and multi-line comments
 * - unquoted properties (JavaScript identifiers with only ASCII chars)
 * - trailing comma in array and objects
 * - single quoted strings
 * - `\f` and `\v` are accepted as space characters
 * - leading plus in numbers
 * - octal (0o prefix) and hexadecimal (0x prefix) numbers
 * @param {string} str - The JSON string to parse.
 * @returns {*} The parsed object.
 */
dxstd.parseExtJSON = function (str) {
    return std.parseExtJSON(str);
}
/**
 * Sleeps for a specified number of milliseconds.
 * @param {number} delay_ms - The delay in milliseconds.
 */
dxstd.sleep = function (delay_ms) {
    return os.sleep(delay_ms);
}
/**
 * Returns a string representing the platform: "linux", "darwin", "win32", or "js".
 * @returns {string} The platform identifier.
 */
dxstd.platform = function () {
    return os.platform;
}
/**
 * Creates a new thread (worker). The API is close to the WebWorkers API.
 * For dynamically imported modules, the path is relative to the current script or module.
 * Threads do not share any data by default, but can share and pass data via dxMap, dxQueue, dxWpc.
 * Nested workers are not supported.
 * @param {string} module_filename - The module filename to be executed in the new thread. should be absolute path.
 * @returns {os.Worker} A new Worker instance.
 */
dxstd.Worker = function (module_filename) {
    return new os.Worker(module_filename)
}

/**
 * Opens a file.
 * @param {string} filename - The absolute path of the file.
 * @param {number} flags - A bitwise OR of file open flags (e.g., `dxstd.O_RDWR | dxstd.O_CREAT`).
 * @returns {number} A file descriptor handle, or a value < 0 on error.
 * @note The 'flags' parameter must include one of `O_RDONLY`, `O_WRONLY`, or `O_RDWR`.
 * Other common flags:
 * - `O_APPEND`: Appends data to the end of the file on every write.
 * - `O_CREAT`: Creates the file if it does not exist.
 * - `O_EXCL`: Used with `O_CREAT`, ensures that the caller creates the file. Fails if the file already exists.
 * - `O_TRUNC`: Truncates the file to zero length if it exists.
 */
dxstd.open = function (filename, flags) {
    return os.open(filename, flags);
}
/**
 * Checks if a given path is a directory.
 * @param {string} filename - The path to check.
 * @returns {boolean} True if the path is a directory, false otherwise.
 * @throws {Error} If the path does not exist.
 */
dxstd.isDir = function (filename) {
    const [stat, err] = os.stat(filename)
    if (err) {
        throw new Error(`Cannot stat path '${filename}': error code ${err}`)
    }
    return ((stat.mode & this.S_IFMT) === this.S_IFDIR);
}
/**
 * Closes a file descriptor.
 * @param {number} fd - The file descriptor handle.
 */
dxstd.close = function (fd) {
    return os.close(fd)
}

/**
 * Seeks to a position in a file.
 * @param {number} fd - The file descriptor handle.
 * @param {number | bigint} offset - The offset. Can be positive or negative.
 * @param {number} whence - The starting point for the offset: `dxstd.SEEK_SET` (start), `dxstd.SEEK_CUR` (current), `dxstd.SEEK_END` (end).
 * @returns {number | bigint} The new offset from the beginning of the file.
 */
dxstd.seek = function (fd, offset, whence) {
    return os.seek(fd, offset, whence)
}
/**
 * Reads `length` bytes from file descriptor `fd` into an ArrayBuffer `buffer` at byte position `offset`.
 * @param {number} fd - The file descriptor handle.
 * @param {ArrayBuffer} buffer - The ArrayBuffer to read into.
 * @param {number} offset - The offset in the buffer to start writing at.
 * @param {number} length - The number of bytes to read.
 * @returns {number} The number of bytes read, or a value < 0 on error.
 */
dxstd.read = function (fd, buffer, offset, length) {
    return os.read(fd, buffer, offset, length);
}
/**
 * Writes `length` bytes from an ArrayBuffer `buffer` at byte position `offset` to the file descriptor `fd`.
 * @param {number} fd - The file descriptor handle.
 * @param {ArrayBuffer} buffer - The ArrayBuffer to write from.
 * @param {number} offset - The offset in the buffer to start reading from.
 * @param {number} length - The number of bytes to write.
 * @returns {number} The number of bytes written, or a value < 0 on error.
 */
dxstd.write = function (fd, buffer, offset, length) {
    return os.write(fd, buffer, offset, length);
}
/**
 * Deletes a file.
 * @param {string} filename - The absolute path of the file.
 * @returns {number} 0 on success, or -errno on failure.
 */
dxstd.remove = function (filename) {
    return os.remove(filename)
}

/**
 * Removes an empty directory by executing the system 'rmdir' command.
 * @param {string} dirname The path to the directory.
 * @returns {number} The exit code of the 'rmdir' command. Returns 0 on success.
 * @note This relies on the 'rmdir' command being available in the system's PATH.
 */
dxstd.rmdir = function (dirname) {
    return os.exec(['rmdir', dirname]);
}

/**
 * Renames a file.
 * @param {string} oldname - The old absolute path of the file.
 * @param {string} newname - The new absolute path of the file.
 * @returns {number} 0 on success, or -errno on failure.
 */
dxstd.rename = function (oldname, newname) {
    return os.rename(oldname, newname)
}
/**
 * Returns the current working directory.
 * @returns {[string, number]} An array `[str, err]`, where `str` is the current working directory and `err` is an error code.
 */
dxstd.getcwd = function () {
    return os.getcwd()
}
/**
 * Changes the current working directory.
 * @param {string} path - The directory path (absolute or relative).
 * @returns {number} 0 on success, or -errno on failure.
 */
dxstd.chdir = function (path) {
    return os.chdir(path)
}
/**
 * Creates a directory.
 * @param {string} path - The absolute path of the directory.
 * @returns {number} 0 on success, or -errno on failure.
 */
dxstd.mkdir = function (path) {
    return os.mkdir(path)
}

/**
 * Returns status information for a file or directory.
 * @param {string} path - The absolute path of the file or directory.
 * @returns {[object, number]} An array `[obj, err]`, where `obj` is an object containing status information and `err` is an error code.
 * The status object contains fields like `mode`, `size`, `mtime` (last modification time in ms since epoch), etc.
 * The `mode` can be tested against the `S_*` constants, e.g., `(stat.mode & dxstd.S_IFMT) === dxstd.S_IFDIR`.
 */
dxstd.stat = function (path) {
    return os.stat(path)
}
/**
 * Same as `stat()`, but if the path is a symbolic link, it returns information about the link itself.
 * @param {string} path - The absolute path of the file or directory.
 * @returns {[object, number]} An array `[obj, err]`, containing status info or an error code.
 */
dxstd.lstat = function (path) {
    return os.lstat(path)
}
/**
 * Returns the names of the files in a directory.
 * @param {string} path - The absolute path of the directory.
 * @returns {[string[], number]} An array `[array, err]`, where `array` is an array of filenames and `err` is an error code.
 */
dxstd.readdir = function (path) {
    return os.readdir(path)
}
export default dxstd