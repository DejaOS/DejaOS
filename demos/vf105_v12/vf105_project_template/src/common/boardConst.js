const boardConst = {}

/**
 * 设备资源枚举
*/
boardConst.GPIO = {
    // 继电器1
    RELAY1: 44,
}

boardConst.GPIO_OUTPUT0 = 0x04;

boardConst.CHANNEL = {
    // 485
    UART_485: "/dev/ttySLB2",
}

boardConst.CAPTURER = {
    // 摄像头
    capturerRgbId: 'capturerRgb1',
    capturerNirId: 'capturerNir1',
    RGB_PATH: "/dev/video3",
    RGB_WIDTH: 1280,
    RGB_HEIGHT: 800,
    RGB_PREVIEW_WIDTH: 800,
    RGB_PREVIEW_HEIGTH: 1280,
    RGB_PREVIEW_MODE: 2,
    RGB_PREVIEW_SCREEN_INDEX: 0,

    NIR_PATH: "/dev/video0",
    NIR_WIDTH: 800,
    NIR_HEIGHT: 600,
    NIR_PREVIEW_WIDTH: 300,
    NIR_PREVIEW_HEIGTH: 400,
    NIR_PREVIEW_MODE: 1,
    NIR_PREVIEW_SCREEN_INDEX: 1
}

boardConst.PWM = {
    // 白色补光灯通道
    PWM_WHITE_SUPPLEMENT_CHANNEL: 4,
    // 白色补光灯频率
    PWM_WHITE_SUPPLEMENT_PERIOD_NS: 255000,
    // 红外补光灯通道
    PWM_NIR_SUPPLEMENT_CHANNEL: 7,
    // 红外补光灯频率
    PWM_NIR_SUPPLEMENT_PERIOD_NS: 255000
}

boardConst.GPIO_KEY = {
    // GPIO_KEY事件1 门磁状态
    BOARD_GPIO_KEY_INPUT1: 256,
    // GPIO_KEY事件2 锁芯状态
    BOARD_GPIO_KEY_INPUT2: 257
}

export default boardConst