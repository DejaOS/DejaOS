package cn.koodle.smartcabinet.convert;

import cn.koodle.smartcabinet.entity.DeviceChannel;
import cn.koodle.smartcabinet.model.admin.dto.DeviceChannelDTO;
import cn.koodle.smartcabinet.model.admin.vo.DeviceChannelVO;
import org.mapstruct.Mapper;
import org.mapstruct.factory.Mappers;

@Mapper(componentModel = "spring")
public interface DeviceChannelConvert {

    DeviceChannelConvert INSTANCE = Mappers.getMapper(DeviceChannelConvert.class);

    DeviceChannel toEntity(DeviceChannelDTO dto);

    DeviceChannelVO toVO(DeviceChannel entity);
}