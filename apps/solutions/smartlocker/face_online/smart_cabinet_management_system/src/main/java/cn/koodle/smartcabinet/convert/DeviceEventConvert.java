package cn.koodle.smartcabinet.convert;

import cn.koodle.smartcabinet.entity.DeviceEvent;
import cn.koodle.smartcabinet.model.admin.vo.DeviceEventVO;
import org.mapstruct.Mapper;

import java.util.List;

@Mapper(componentModel = "spring")
public interface DeviceEventConvert {

    DeviceEventVO toVO(DeviceEvent entity);

    List<DeviceEventVO> toVOList(List<DeviceEvent> list);
}