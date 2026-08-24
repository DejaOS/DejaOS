package d1.duoxian.mqttserver;

/**
 * @author Buter
 * date 2021/10/4 9:58
 */
public interface IMqttVerifyListener {
    /**
     * 验证mqtt连接的用户密码，如果不想校验，直接返回true即可
     * 请不要在这个函数里添加耗时操作
     *
     * @param clientId mqtt client id，有可能需要根据不同的clientid来校验不同的用户密码
     * @param username 链接的用户名
     * @param password 链接的密码
     * @return 如果返回false，则链接会自动断开，并记录日志
     */
    boolean verify(String clientId,String username, byte[] password);
}

