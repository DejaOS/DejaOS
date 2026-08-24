package d1.device.vgsdk.model;

/**
 * 通行记录对象
 *
 * @author liuyi
 */

public class AccessRecord {
    /**
     * 设备唯一标识
     */
    private String uuid;
    /**
     * 门控编号，比如设备是一控四，index可能就是1，2，3，4 ,可以为空
     */
    private String index;
    /**
     * 权限类型,人脸，二维码等，参考Permission的类型枚举
     */
    private String type;
    /**
     * 人员的id标识 可能为空，如果为空，可以根据code来获取用户信息
     */
    private String userId;
    /**
     * 人员姓名
     */
    private String name;
    /**
     * 通行凭证：卡号、密码、人脸照片对应的id等 可能为空，如果为空，可以根据userId来获取用户信息
     */
    private String code;
    /**
     * 扩展数据 可能为空
     */
    private String extra;
    /**
     * 某些类型可能还有子类型，比如卡，二维码可能有多种子类型，非必填
     */
    private String error;
    /**
     * 人脸实时抓拍的图片存为文件后对应的文件id或者是url
     */
    private String faceCaptureImage;
    /**
     * 通行结果 0表示失败，1表示成功，-1表示在线验证
     */
    private Integer result;
    /**
     * 通行时间
     */
    private Long timestamp;


    /**
     * 构造
     */
    public AccessRecord() {
    }

    public AccessRecord(String uuid, String index, String type, String userId, String name, String code, String extra, String error, String faceCaptureImage, Integer result, Long timestamp) {
        this.uuid = uuid;
        this.index = index;
        this.type = type;
        this.userId = userId;
        this.name = name;
        this.code = code;
        this.extra = extra;
        this.error = error;
        this.faceCaptureImage = faceCaptureImage;
        this.result = result;
        this.timestamp = timestamp;
    }

    /**
     * 比较二个对象是否相同
     *
     * @param record   传递过来的对象
     * @param interval 在某个时间间隔内，就算相同的
     * @return 是否相同
     */
    public boolean compare(AccessRecord record, long interval) {
        //type不会为null
        if (!this.getType().equals(record.getType())) {
            return false;
        }
        //uuid不会为null
        if (!this.getUuid().equals(record.getUuid())) {
            return false;
        }
        if (this.getResult().intValue() != record.getResult().intValue()) {
            return false;
        }
        //code可能为null
        if (this.getCode() == null && record.getCode() != null) {
            return false;
        }
        if (this.getCode() != null && !this.getCode().equals(record.getCode())) {
            return false;
        }
        //userId可能为null
        if (this.getUserId() == null && record.getUserId() != null) {
            return false;
        }
        if (this.getUserId() != null && !this.getUserId().equals(record.getUserId())) {
            return false;
        }
        //index可能为null
        if (this.getIndex() == null && record.getIndex() != null) {
            return false;
        }
        if (this.getIndex() != null && !this.getIndex().equals(record.getIndex())) {
            return false;
        }
        if (this.getExtra() != null && !this.getExtra().equals(record.getExtra())) {
            return false;
        }
        return Math.abs(this.getTimestamp() - record.getTimestamp()) < interval;
    }

    /**
     * @return subType
     */
    public String getError() {
        return error;
    }

    /**
     * @param error subType
     */
    public void setError(String error) {
        this.error = error;
    }

    /**
     * @return index
     */
    public String getIndex() {
        return index;
    }

    /**
     * @param index index
     */
    public void setIndex(String index) {
        this.index = index;
    }

    /**
     * @return userId
     */
    public String getUserId() {
        return userId;
    }

    /**
     * @param userId userId
     */
    public void setUserId(String userId) {
        this.userId = userId;
    }

    /**
     * @return id
     */
    public String getName() {
        return name;
    }

    /**
     * @param name id
     */
    public void setName(String name) {
        this.name = name;
    }

    /**
     * @return uuid
     */
    public String getUuid() {
        return uuid;
    }

    /**
     * @param uuid uuid
     */
    public void setUuid(String uuid) {
        this.uuid = uuid;
    }

    /**
     * @return code
     */
    public String getCode() {
        return code;
    }

    /**
     * @param code code
     */
    public void setCode(String code) {
        this.code = code;
    }

    /**
     * @return type
     */
    public String getType() {
        return type;
    }

    /**
     * @param type type
     */
    public void setType(String type) {
        this.type = type;
    }

    /**
     * @return result
     */
    public Integer getResult() {
        return result;
    }

    /**
     * @param result result
     */
    public void setResult(Integer result) {
        this.result = result;
    }

    /**
     * @return time
     */
    public Long getTimestamp() {
        return timestamp;
    }

    /**
     * @param timestamp time
     */
    public void setTimestamp(Long timestamp) {
        this.timestamp = timestamp;
    }

    /**
     * @return faceCaptureImage
     */
    public String getFaceCaptureImage() {
        return faceCaptureImage;
    }

    /**
     * @param faceCaptureImage faceCaptureImage
     */
    public void setFaceCaptureImage(String faceCaptureImage) {
        this.faceCaptureImage = faceCaptureImage;
    }

    /**
     * @return extra
     */
    public String getExtra() {
        return extra;
    }

    /**
     * @param extra extra
     */
    public void setExtra(String extra) {
        this.extra = extra;
    }

    @Override
    public String toString() {
        return "AccessRecord{" +
                "id='" + name + '\'' +
                ", uuid='" + uuid + '\'' +
                ", userId='" + (userId != null && userId.length() > 2000 ? "base64" : userId) + '\'' +
                ", extra='" + extra + '\'' +
                ", code='" + (code != null && code.length() > 2000 ? "base64" : code) + '\'' +
                ", type='" + type + '\'' +
                ", subType='" + error + '\'' +
                ", result=" + result +
                ", time=" + timestamp +
                ", faceCaptureImage='" + faceCaptureImage + '\'' +
                ", index='" + index + '\'' +
                '}';
    }
}
