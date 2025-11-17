import logger from "../../dxmodules/dxLogger.js";
import bus from "../../dxmodules/dxEventBus.js";
import dxMap from "../../dxmodules/dxMap.js";
import driver from "../driver.js";
import config from "../../dxmodules/dxConfig.js";
import sqliteService from "./sqliteService.js";
const faceService = {}

faceService.receiveMsg = function (data) {
    //代表是锁屏和息屏
    bus.fire("exitIdle")
    logger.info('[faceService] receiveMsg :' + JSON.stringify(data))
    bus.fire("trackResult", { id: data.id, result: data.userId ? true : false, userId: data.userId })
    if (data.userId) {
        // TODO d1_person.find可能为空
        let ret = sqliteService.d1_person.find({ userId: data.userId })
        if (dxMap.get("UI").get("faceAuthStart") == "Y") {
            //正在人脸登录
            if (JSON.parse(ret[0].extra).type != 0) {
                bus.fire("faceAuthResult", true)
            } else {
                bus.fire("faceAuthResult", false)
            }
            return
        }

        switch (config.get("face.voiceMode")) {
            case 0:
                break;
            case 1:
                driver.audio.ttsPlay(ret[0].name)
                break;
            case 2:
                driver.audio.ttsPlay(config.get("face.voiceModeDate") ? config.get("face.voiceModeDate") : "欢迎光临")
                break;
            default:
                break;
        }

        // 通行认证处理
        bus.fire("access", { data: { type: "300", code: data.userId }, fileName: data.picPath, similarity: true })
    } else {
        // 人脸相似度验证失败
        if (dxMap.get("UI").get("faceAuthStart") == "Y") {
            bus.fire("faceAuthResult", false)
        } else {
            switch (config.get("face.stranger")) {
                case 0:
                    break;
                case 1:
                    driver.audio.play(`/app/code/resource/${config.get("base.language") == "CN" ? "CN" : "EN"}/wav/register.wav`)
                    break;
                case 2:
                    driver.audio.play(`/app/code/resource/${config.get("base.language") == "CN" ? "CN" : "EN"}/wav/stranger.wav`)
                    break;
                default:
                    break;
            }
            bus.fire("access", { data: { type: "300", code: data.userId }, fileName: data.picPath, similarity: false })
        }
    }
}

faceService.regErrorEnum = {
    "callback": {
        title: "注册回调状态枚举",
        "-1": "faceService.contrastFailure",
        "-2": "faceService.scalingFailure",
        "-3": "faceService.failedToSavePicture",
        "-4": "faceService.convertToBase64Fail",
    },
    "feature": {
        title: "特征值注册状态枚举",
        "-1": "faceService.base64DecodingFail",
        "-10": "faceService.contrastFailure",
        "-11": "faceService.similarityOverheight",
    },
    "picture": {
        title: "图片注册状态枚举",
        "-1": "faceService.fileDoesNotExist",
        "-2": "faceService.theImageFormatIsNotSupported",
        "-3": "faceService.pictureReadFailure",
        "-4": "faceService.thePictureSizeDoesNotMatch",
        "-5": "faceService.imageParsingFailure",
        "-6": "faceService.imageYUVProcessingFailed",
        "-7": "faceService.failedToConvertJpegToImage",
        "-8": "faceService.faceInformationExtractionFailed",
        "-9": "faceService.theFaceIsNotUnique",
        "-10": "faceService.contrastFailure",
        "-11": "faceService.similarityOverheight",
    }
}


export default faceService