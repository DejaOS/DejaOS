import capturer from '../../dxmodules/dxCapturer.js'
import dxDriver from '../../dxmodules/dxDriver.js'
import config from '../../dxmodules/dxConfig.js'

const capturerDriver = {
    // RGB camera
    options1: {
        id: "rgb",
        path: dxDriver.CAPTURER.RGB_PATH,
        width: dxDriver.CAPTURER.RGB_WIDTH,
        height: dxDriver.CAPTURER.RGB_HEIGHT,
        preview_width: dxDriver.CAPTURER.RGB_HEIGHT,
        preview_height: dxDriver.CAPTURER.RGB_WIDTH,
        preview_mode: 2,
        preview_screen_index: 0 // Z-order: larger numbers are rendered on top
    },
    // NIR (infrared) camera
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
        preview_screen_index: 1 // Z-order: larger numbers are rendered on top
    }, // NIR camera

    init: function () {
        capturer.worker.beforeLoop(this.options1)
        capturer.worker.beforeLoop(this.options2)

        this.showNir(config.get("face.showNir"))
    },
    showNir: function (enable) {
        capturer.capturerEnable(enable, this.options2.id)
    },
    pictureDataToImage: function (base64Data) {
        return capturer.pictureDataToImage(base64Data, base64Data.length, 1)
    },
    imageToPictureFile: function (imageId, savePath) {
        return capturer.imageToPictureFile(imageId, 1, 0, 24, savePath)
    },
    imageToPictureFile2: function (imageId, savePath) {
        return capturer.imageToPictureFile(imageId, 1, 0, 100, savePath)
    },
    imageResizeResolution: function (imageId, width, height) {
        return capturer.imageResizeResolution(imageId, width, height, 0)
    },
    loop: function () {
        capturer.worker.loop(this.options1)
        capturer.worker.loop(this.options2)
    }
}

export default capturerDriver

