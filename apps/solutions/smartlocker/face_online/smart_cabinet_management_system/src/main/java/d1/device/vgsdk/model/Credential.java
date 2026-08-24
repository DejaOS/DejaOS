package d1.device.vgsdk.model;


import com.alibaba.fastjson2.JSONObject;

public class Credential {
    /**
     * 透传吗--100
     */
    public final static String TYPE_QRCODE_100 = "100";
    /**
     * 动态码--104
     */
    public final static String TYPE_QRCODE_104 = "104";
    /**
     * 动态码--103
     */
    public final static String TYPE_QRCODE_103 = "103";
    /**
     * 普通pin--400
     */
    public final static String TYPE_PIN = "400";
    /**
     * 临时pin--401
     */
    public final static String TYPE_PIN_TEMP = "401";
    /**
     * 普通卡--200
     */
    public final static String TYPE_CARD = "200";
    /**
     * cpu加密卡--201
     */
    public final static String TYPE_CARD_CPU = "201";
    /**
     * 扇区加密卡--202
     */
    public final static String TYPE_CARD_SECTOR = "202";
    /**
     * 身份证
     */
    public final static String TYPE_CARD_ID = "203";
    /**
     * 人脸--300
     */
    public final static String TYPE_FACE = "300";
    /**
     * 蓝牙--600
     */
    public final static String TYPE_BLUETOOTH = "600";

    public final static String FINGERPRINT = "500";
    /**
     * 远程开门--只有通行记录才有
     */
    public final static String TYPE_REMOTE_OPEN_DOOR = "remoteOpenTheDoor";
    /**
     * 按键开门--只有通行记录才有
     */
    public final static String TYPE_BUTTON_OPEN_DOOR = "buttonOpenTheDoor";
    /**
     * 凭证 id
     */
    private String credentialId;
    /**
     * 凭证 id
     */
    private String keyId;
    /**
     * 人员 id
     */
    private String userId;
    /**
     * 凭证类型：100 透传码、103 动态码、400 pin多位数字密码、200 普通卡号、201 cpu加密卡、202 扇区加密卡、600 蓝牙开门凭证
     */
    private String type;
    /**
     * 凭证数据
     */
    private String code;
    /**
     * 额外参数
     */
    private JSONObject extra;

    public Credential() {
    }

    public Credential(String credentialId, String userId, String type, String code, JSONObject extra) {
        this.credentialId = credentialId;
        this.userId = userId;
        this.type = type;
        this.code = code;
        this.extra = extra;
    }

    public String getKeyId() {
        return keyId;
    }

    public void setKeyId(String keyId) {
        this.keyId = keyId;
    }

    public String getCredentialId() {
        return credentialId;
    }

    public void setCredentialId(String credentialId) {
        this.credentialId = credentialId;
    }

    public String getUserId() {
        return userId;
    }

    public void setUserId(String userId) {
        this.userId = userId;
    }

    public String getType() {
        return type;
    }

    public void setType(String type) {
        this.type = type;
    }

    public String getCode() {
        return code;
    }

    public void setCode(String code) {
        this.code = code;
    }

    public JSONObject getExtra() {
        return extra;
    }

    public void setExtra(JSONObject extra) {
        this.extra = extra;
    }
}
