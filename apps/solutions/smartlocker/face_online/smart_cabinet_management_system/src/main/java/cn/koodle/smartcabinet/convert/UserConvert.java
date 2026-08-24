package cn.koodle.smartcabinet.convert;

import cn.koodle.smartcabinet.entity.User;
import cn.koodle.smartcabinet.model.admin.dto.UserDTO;
import cn.koodle.smartcabinet.model.admin.vo.UserVO;
import org.mapstruct.Mapper;

import java.util.List;

@Mapper(componentModel = "spring")
public interface UserConvert {

    // 1. DTO -> Entity (用于保存)
    User toEntity(UserDTO dto);

    // 2. Entity -> VO (用于查询)
    UserVO toVO(User entity);

    List<UserVO> toVOList(List<User> list);

}