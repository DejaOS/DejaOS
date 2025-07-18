import logger from "../../dxmodules/dxLogger.js";
import dxCommon from "../../dxmodules/dxCommon.js";
import bus from "../../dxmodules/dxEventBus.js";
import dxMap from "../../dxmodules/dxMap.js";
import driver from "../driver.js";
import config from "../../dxmodules/dxConfig.js";
import sqliteService from "./sqliteService.js";
let map = dxMap.get("LOGIN")
const faceService = {}

faceService.receiveMsg = function (data) {
    logger.info('[faceService] receiveMsg :' + JSON.stringify(data))
    //代表是锁屏和息屏
    bus.fire("exitIdle")

    switch (data.type) {
        case "register":
            // 注册人脸
            for (let i = 0; i < data.faces.length; i++) {
                const element = data.faces[i];
                bus.fire("beginAddFace", element)
            }
            break;
        case "compare":
            // 显示姓名，代表有注册过人脸，但是权限不一定有效，需要进一步认证
            for (let i = 0; i < data.faces.length; i++) {
                const element = data.faces[i];
                bus.fire("trackResult", { id: element.id, result: element.result, userId: element.userId })
                if (element.result) {
                    // 人脸相似度验证通过
                    let ret = sqliteService.d1_person.find({ userId: element.userId })
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
                            driver.alsa.ttsPlay(ret[0].name)
                            break;
                        case 2:
                            driver.alsa.ttsPlay(config.get("face.voiceModeDate") ? config.get("face.voiceModeDate") : "欢迎光临")
                            break;
                        default:
                            break;
                    }

                    // 通行认证处理
                    bus.fire("access", { data: { type: "300", code: element.userId }, fileName: element.fileName })
                } else {
                    // 人脸相似度验证失败
                    if (dxMap.get("UI").get("faceAuthStart") == "Y") {
                        bus.fire("faceAuthResult", false)
                    } else {
                        switch (config.get("face.stranger")) {
                            case 0:
                                break;
                            case 1:
                                driver.alsa.play(`/app/code/resource/${config.get("base.language") == "CN" ? "CN" : "EN"}/wav/register.wav`)
                                break;
                            case 2:
                                driver.alsa.play(`/app/code/resource/${config.get("base.language") == "CN" ? "CN" : "EN"}/wav/stranger.wav`)
                                break;
                            default:
                                break;
                        }
                        bus.fire("access", { data: { type: "300", code: element.userId }, fileName: element.fileName, similarity: false })
                    }
                }
            }
            break;
        default:
            break;
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