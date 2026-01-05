/**
 * Driver module for camera and configuration management
 * Handles RGB and NIR camera initialization and control
 */

import capturer from '../dxmodules/dxCapturer.js'
import config from '../dxmodules/dxConfig.js'
import dxDriver from '../dxmodules/dxDriver.js'

const driver = {}

// Configuration management
driver.config = {
    /**
     * Initialize driver configuration
     */
    init: function () {
        config.init()
    }
}

// Camera capturer initialization and management
driver.capturer = {
    // RGB camera configuration
    options1: {
        id: "rgb",
        path: dxDriver.CAPTURER.RGB_PATH,
        width: dxDriver.CAPTURER.RGB_WIDTH,
        height: dxDriver.CAPTURER.RGB_HEIGHT,
        preview_width: dxDriver.CAPTURER.RGB_HEIGHT,
        preview_height: dxDriver.CAPTURER.RGB_WIDTH,
        preview_mode: 2,
        preview_screen_index: 0 // Display order, higher numbers appear in front
    },
    // NIR (Near Infrared) camera configuration
    options2: {
        id: "nir",
        path: dxDriver.CAPTURER.NIR_PATH,
        width: dxDriver.CAPTURER.NIR_WIDTH,
        height: dxDriver.CAPTURER.NIR_HEIGHT,
        preview_width: 150,
        preview_height: 200,
        preview_mode: 1,
        preview_left: 605,
        preview_top: 80,
        preview_screen_index: 1 // Display order, higher numbers appear in front
    },

    /**
     * Initialize camera capturer
     * Sets up both RGB and NIR cameras
     */
    init: function () {
        capturer.worker.beforeLoop(this.options1)
        capturer.worker.beforeLoop(this.options2)

        this.showNir(config.get("face.showNir"))
    },
    
    /**
     * Enable or disable NIR camera display
     * @param {boolean} enable - Whether to show NIR camera
     */
    showNir: function (enable) {
        capturer.capturerEnable(enable, this.options2.id)
    },
    
    /**
     * Convert base64 picture data to image
     * @param {string} base64Data - Base64 encoded image data
     * @returns {Object} Image object
     */
    pictureDataToImage: function (base64Data) {
        return capturer.pictureDataToImage(base64Data, base64Data.length, 1)
    },
    
    /**
     * Convert image to picture file with quality 24
     * @param {string} imageId - Image identifier
     * @param {string} savePath - File save path
     * @returns {boolean} Success status
     */
    imageToPictureFile: function (imageId, savePath) {
        return capturer.imageToPictureFile(imageId, 1, 0, 24, savePath)
    },
    
    /**
     * Convert image to picture file with quality 100
     * @param {string} imageId - Image identifier
     * @param {string} savePath - File save path
     * @returns {boolean} Success status
     */
    imageToPictureFile2: function (imageId, savePath) {
        return capturer.imageToPictureFile(imageId, 1, 0, 100, savePath)
    },
    
    /**
     * Resize image resolution
     * @param {string} imageId - Image identifier
     * @param {number} width - New width
     * @param {number} height - New height
     * @returns {boolean} Success status
     */
    imageResizeResolution: function (imageId, width, height) {
        return capturer.imageResizeResolution(imageId, width, height, 0)
    },
    
    /**
     * Main camera loop - processes both cameras
     * Called continuously to update camera feeds
     */
    loop: function () {
        capturer.worker.loop(this.options1)
        capturer.worker.loop(this.options2)
    }
}
export default driver