package d1.device.vgsdk.model;

/**
 * 生成配置码
 *
 * @param uuid          设备唯一标识
 * @param password      设备密码
 * @param mqttIp        mqtt服务ip+端口
 * @param mqttName      mqtt用户名
 * @param mqttPassword  mqtt用户密码
 * @param wifiSsid      wifi名
 * @param wifiPassword  wifi密码
 * @param netType       入网方式
 * @param netMode       入网模式
 * @param netIp         网络ip
 * @param netGateway    网络网关
 * @param netDns        网络DNS
 * @param netMask       子网掩码
 * @param scanInterval  扫码间隔
 * @param openMode      开门模式
 * @param onlineVerify  在线验证
 * @param verifyTime    在线验证超时时间
 * @param nfcVerify     NFC模拟卡校验
 * @param invariableMac 固定MAC开关
 * @param outMode       输出方式
 * @param uploadRule    通行记录上传策略
 * @param cmd           执行指令
 * @author mazx
 */
public record ConfigCode(String uuid, String password, String mqttIp, String mqttName,
                         String mqttPassword, String wifiSsid, String wifiPassword, Integer netType,
                         Integer netMode, String netIp, String netGateway, String netDns, String netMask,
                         Integer scanInterval, Integer openMode, Integer onlineVerify, Integer verifyTime,
                         Integer nfcVerify, Integer invariableMac, Integer outMode, Integer uploadRule,
                         Integer cmd) {
    /**
     *
     * @param uuid uuid
     * @param mqttIp mqttIp
     * @param mqttName 见上方描述
     * @param mqttPassword 见上方描述
     * @param wifiSsid 见上方描述
     * @param wifiPassword 见上方描述
     * @param netType 见上方描述
     * @param netMode 见上方描述
     * @param netIp 见上方描述
     * @param netGateway 见上方描述
     * @param netDns 见上方描述
     * @param netMask 见上方描述
     * @return 结果
     */
    public static ConfigCode of(String uuid, String mqttIp, String mqttName, String mqttPassword, String wifiSsid, String wifiPassword, Integer netType, Integer netMode, String netIp, String netGateway, String netDns, String netMask) {
        return new ConfigCode(uuid, null, mqttIp, mqttName, mqttPassword, wifiSsid, wifiPassword, netType, netMode, netIp, netGateway, netDns, netMask, null, null, null, null, null, null, null, null, null);
    }

    /**
     *
     * @param n  见上方描述
     * @param mqttIp 见上方描述
     * @param mqttName 见上方描述
     * @param mqttPassword 见上方描述
     * @return 结果
     */
    public static ConfigCode of(NetworkConfiguration n, String mqttIp, String mqttName, String mqttPassword) {
        return new ConfigCode(null, null, mqttIp, mqttName, mqttPassword,
                n.getSsid(), n.getPassword(), n.getType(), n.getDhcp(),
                n.getIp(), n.getGateway(), n.getDns(), n.getMask(),
                null, null, null, null, null, null, null, null, null);
    }
}
