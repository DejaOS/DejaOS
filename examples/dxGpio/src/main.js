//通过dxui文件来构建ui的示例
import logger from '../dxmodules/dxLogger.js'
import gpio from '../dxmodules/dxGpio.js'
import std from '../dxmodules/dxStd.js'
import * as os from "os";
//dw200 管脚号 默认
const gpio_id_dw200 = 35

//初始化 gpio
let res = gpio.init()
logger.info('初始化 gpio', res)


//申请gpio
res = gpio.request(gpio_id_dw200)
logger.info('申请gpio', res)


std.setInterval(() => {
    //输出高电平 代表打开继电器
    res = gpio.setValue(gpio_id_dw200, 1)
    logger.info('输出高电平', res);

    //获取当前是高电平还是低电平
    res = gpio.getValue(gpio_id_dw200)
    logger.info('现在电平为', res);

    //等待3秒
    os.sleep(3000)

    //输出低电平 代表关闭继电器
    res = gpio.setValue(gpio_id_dw200, 0)
    logger.info('输出低电平', res);

    res = gpio.getValue(gpio_id_dw200)
    logger.info('现在电平为', res);


}, 3000)
