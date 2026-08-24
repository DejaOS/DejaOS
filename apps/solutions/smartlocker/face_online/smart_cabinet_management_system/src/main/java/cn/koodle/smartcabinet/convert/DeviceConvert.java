package cn.koodle.smartcabinet.convert;

import cn.koodle.smartcabinet.entity.Device;
import cn.koodle.smartcabinet.model.admin.dto.DeviceDTO;
import cn.koodle.smartcabinet.model.admin.vo.DeviceVO;
import org.mapstruct.Mapper;
import org.mapstruct.ReportingPolicy;

@Mapper(componentModel = "spring", unmappedTargetPolicy = ReportingPolicy.IGNORE)
public interface DeviceConvert {

    Device toEntity(DeviceDTO dto);

    DeviceVO toVO(Device entity);
}
