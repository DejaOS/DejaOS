package cn.koodle.smartcabinet.convert;

import cn.koodle.smartcabinet.entity.AuthGroup;
import cn.koodle.smartcabinet.model.admin.dto.AuthGroupDTO;
import cn.koodle.smartcabinet.model.admin.vo.AuthGroupVO;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;
import org.mapstruct.Named;

@Mapper(componentModel = "spring")
public interface AuthGroupConvert {

    AuthGroup toEntity(AuthGroupDTO dto);

    @Mapping(target = "statusText", source = "status", qualifiedByName = "statusToText")
    // userCount 和 deviceCount 在 Service 中手动填充
    AuthGroupVO toVO(AuthGroup entity);

    @Named("statusToText")
    default String statusToText(Integer status) {
        if (status == null) {
            return "未知";
        }
        return status == 1 ? "启用" : "禁用";
    }
}