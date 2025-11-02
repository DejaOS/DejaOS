import common from '../../dxmodules/dxCommon.js'
import face from '../../dxmodules/dxFace.js'
import config from '../../dxmodules/dxConfig.js'
import std from '../../dxmodules/dxStd.js'
import map from '../../dxmodules/dxMap.js'
import base64 from '../../dxmodules/dxBase64.js'
import logger from '../../dxmodules/dxLogger.js'

const faceDriver = {
    init: function () {
        common.systemBrief('mkdir -p /app/data/user/temp/')
        let options = {
            dbPath: "/app/data/db/face.db",
            rgbPath: "/dev/video3",
            nirPath: "/dev/video0",
            capturerRgbId: "rgb",
            capturerNirId: "nir",
            dbMax: 5000, // Max number of face registrations in memory
            score: config.get("face.similarity"),
            picPath: "/app/data/user/temp",
            gThumbnailHeight: 1280 / 6,
            gThumbnailWidth: 800 / 6,
            // Whether to enable recheck
            recgFaceattrEnable: 1,
            // Liveness check switch
            livingCheckEnable: config.get("face.livenessOff"),
            // Liveness threshold
            livingScore: config.get("face.livenessVal"),
            // Mask detection switch
            detectMaskEnable: config.get("face.detectMask"),
            // Recheck interval
            recheckIntervalTime: 5000,
            // Detection timeout
            detectTimeoutTime: 1000
        }
        face.worker.beforeLoop(options)

        // Default to face recognition mode
        this.mode(0)
        // Disable all face functions initially
        this.status(false)

        // Screen brightness
        this.setDisplayBacklight(config.get("base.brightness"))

        this.screenStatus(1)


        std.setInterval(() => {
            // Screen-off check
            let screenOff = map.get("screenOff")
            if (screenOff.get("status") == 1) {
                this.setDisplayBacklight(0)
                this.screenStatus(0)
            }

            // Exit screen-off
            if (screenOff.get("status") != 1) {
                if (config.get("base.brightnessAuto") == 1) {
                    // Auto-adjust screen brightness
                    let brightness = Math.floor(face.getEnvBrightness() / 10)
                    brightness = brightness > 100 ? 100 : brightness
                    this.setDisplayBacklight(brightness)
                } else {
                    this.setDisplayBacklight(config.get("base.brightness"))
                }
            }
        }, 1000)
    },
    getTrackingBox: function () {
        return face.getTrackingBox()
    },
    loop: function () {
        face.worker.loop()
    },
    // Face thread enable switch
    status: function (flag) {
        console.log('---Face detection ' + (flag ? 'enabled' : 'paused') + '---');
        face.faceSetEnable(flag)
    },
    // Mode: 0 recognition; 1 enrollment
    mode: function (value) {
        console.log('---Face ' + (value ? 'enrollment' : 'recognition') + ' mode---');
        face.setRecgMode(value)
    },
    // Face registration
    reg: function (id, feature) {
        return face.addFaceFeatures(id, feature);
    },
    // Update face config
    faceUpdateConfig: function (options) {
        console.log("Update face config", JSON.stringify(options));
        face.faceUpdateConfig(options)
    },
    // Set screen backlight
    setDisplayBacklight: function (brightness) {
        brightness = brightness < 2 ? 2 : brightness
        face.setDisplayBacklight(brightness)
    },
    registerFaceByPicFile: function (userId, picPath) {
        return face.registerFaceByPicFile(userId, picPath)
    },
    clean: function () {
        // Clear all face data; must be done before initializing the face component
        face.faceFeaturesClean()
        common.systemBrief("rm -rf /app/data/db/face.db")
        return !std.exist("/app/data/db/face.db")
    },
    delete: function (userId) {
        return face.deleteFaceFeatures(userId)
    },
    // Enable/disable screen power mode
    screenStatus: function (status) {
        if (status) {
            face.setPowerMode(0)
        } else {
            face.setPowerMode(1)
        }
        face.setEnableStatus(status)
    },
    // Convert file to Base64
    fileToBase64: function (filePath) {
        function fileToUint8Array(filename) {
            // Read file
            const file = std.open(filename, "rb");
            if (!file) {
                throw new Error("Unable to open file");
            }

            // Get file size
            const size = std.seek(file, 0, std.SEEK_END)
            std.seek(file, 0, std.SEEK_SET)
            // Create ArrayBuffer and read file data into it
            const buffer = new ArrayBuffer(size);
            const array = new Uint8Array(buffer);
            std.read(file, array.buffer, 0, size);

            std.close(file);

            return array;
        }

        try {
            const data = fileToUint8Array(filePath);
            return base64.fromUint8Array(data);
        } catch (error) {
            logger.info(error);
        }
    }
}

export default faceDriver

