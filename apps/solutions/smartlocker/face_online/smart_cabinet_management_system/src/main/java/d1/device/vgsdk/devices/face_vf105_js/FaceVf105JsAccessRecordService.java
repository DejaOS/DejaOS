package d1.device.vgsdk.devices.face_vf105_js;

import com.alibaba.fastjson2.JSONArray;
import com.alibaba.fastjson2.JSONObject;
import d1.device.vgsdk.model.AccessRecord;
import d1.device.vgsdk.service.base.BaseAccessRecordService;

import java.util.ArrayList;
import java.util.List;

/**
 * @author liuyi
 */
public class FaceVf105JsAccessRecordService extends BaseAccessRecordService {

    public FaceVf105JsAccessRecordService(String protocol) {
        super(protocol);
    }

    @Override
    public void add(String uuid, JSONArray records) {
        List<AccessRecord> rs = new ArrayList<>();
        for (Object item : records) {
            JSONObject record = (JSONObject) item;
            AccessRecord accessRecord = toAccessRecord(uuid, record, null);
            if (accessRecord != null) {
                rs.add(accessRecord);
            }
        }
        if (!rs.isEmpty()) {
            add(rs);
        }
    }

    @Override
    public AccessRecord toAccessRecord(String uuid, JSONObject record, Integer result) {
        try {
            Integer eventType = record.getInteger("type");
            if (eventType == null) {
                logger.warn("fitlock access event missing type: {}", record);
                return null;
            }
            Integer groupId = record.getInteger("groupId");
            Integer cabinetId = record.getInteger("cabinetId");
            String lockerCode = groupId != null && cabinetId != null ? groupId + "-" + cabinetId : record.getString("lockerId");
            Long timestamp = record.getLong("timestamp");
            if (timestamp == null) {
                timestamp = System.currentTimeMillis() / 1000;
            }
            return new AccessRecord(
                    uuid,
                    "1",
                    String.valueOf(eventType),
                    record.getString("userId"),
                    null,
                    lockerCode,
                    record.toJSONString(),
                    null,
                    null,
                    1,
                    timestamp * 1000);
        } catch (Exception e) {
            logger.error("take access record failed", e);
            return null;
        }
    }
}
