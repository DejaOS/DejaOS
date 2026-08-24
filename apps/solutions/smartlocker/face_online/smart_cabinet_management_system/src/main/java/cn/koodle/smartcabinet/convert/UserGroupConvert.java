package cn.koodle.smartcabinet.convert;

import cn.koodle.smartcabinet.entity.UserGroup;
import cn.koodle.smartcabinet.model.admin.dto.UserGroupDTO;
import cn.koodle.smartcabinet.model.admin.vo.UserGroupVO;
import org.mapstruct.Mapper;

import java.util.List;

@Mapper(componentModel = "spring")
public interface UserGroupConvert {

    UserGroup toEntity(UserGroupDTO dto);

    UserGroupVO toVO(UserGroup entity);

    List<UserGroupVO> toVOList(List<UserGroup> list);
}