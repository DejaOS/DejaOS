package cn.koodle.smartcabinet.service;

import cn.koodle.smartcabinet.common.exception.ApiException;
import cn.koodle.smartcabinet.convert.UserGroupConvert;
import cn.koodle.smartcabinet.dao.UserDao;
import cn.koodle.smartcabinet.dao.UserGroupDao;
import cn.koodle.smartcabinet.entity.User;
import cn.koodle.smartcabinet.entity.UserGroup;
import cn.koodle.smartcabinet.model.admin.dto.UserGroupDTO;
import cn.koodle.smartcabinet.model.admin.dto.UserGroupExportDTO;
import cn.koodle.smartcabinet.model.admin.dto.UserGroupImportDTO;
import cn.koodle.smartcabinet.model.admin.vo.UserGroupVO;
import com.alibaba.excel.EasyExcel;
import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.baomidou.mybatisplus.core.conditions.query.QueryWrapper;
import com.baomidou.mybatisplus.extension.service.impl.ServiceImpl;
import jakarta.annotation.PostConstruct;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.CollectionUtils;
import org.springframework.util.StringUtils;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Slf4j
@Service
@RequiredArgsConstructor
public class UserGroupService extends ServiceImpl<UserGroupDao, UserGroup> {

    private final UserGroupConvert userGroupConvert;
    private final UserDao userDao;


    /**
     * 系统启动时初始化默认分组
     */
    @PostConstruct
    public void initDefaultGroup() {
        // 检查数据库中是否已经存在分组
        long count = this.count();
        if (count == 0) {
            UserGroup defaultGroup = new UserGroup();
            defaultGroup.setParentId(0L); // 顶级节点
            defaultGroup.setName("默认分组"); // 默认名称
            defaultGroup.setOrderNum(0);
            defaultGroup.setRemark("系统自动创建的默认分组");

            this.save(defaultGroup);
            log.info("===== 系统初始化: 已自动创建【默认分组】 =====");
        }
    }

    /**
     * 获取分组树（含人数统计）
     */
    public List<UserGroupVO> getDepartmentTree() {
        // 1. 查出所有分组
        List<UserGroup> allDepts = this.list(new LambdaQueryWrapper<UserGroup>().orderByAsc(UserGroup::getOrderNum));
        if (CollectionUtils.isEmpty(allDepts)) {
            return new ArrayList<>();
        }

        // 2. 查出所有用户分布情况 (Group By group_id)
        QueryWrapper<User> query = new QueryWrapper<>();
        query.select("group_id", "count(*) as total")
                .groupBy("group_id");
        List<Map<String, Object>> countMaps = userDao.selectMaps(query);

        // 转换成 Map<groupId, count>
        Map<Long, Long> directCountMap = new HashMap<>();
        for (Map<String, Object> map : countMaps) {
            Number groupIdValue = (Number) map.get("group_id");
            Number countValue = (Number) map.get("total");
            Long groupId = groupIdValue == null ? null : groupIdValue.longValue();
            Long count = countValue == null ? 0L : countValue.longValue();
            if (groupId != null) {
                directCountMap.put(groupId, count);
            }
        }

        // 3. Entity -> VO
        List<UserGroupVO> allVOs = userGroupConvert.toVOList(allDepts);

        // 4. 构建树形结构 & 递归计算人数
        // 先转成 Map<ID, VO> 方便查找
        Map<Long, UserGroupVO> voMap = allVOs.stream().collect(Collectors.toMap(UserGroupVO::getId, v -> v));
        List<UserGroupVO> rootNodes = new ArrayList<>();

        for (UserGroupVO vo : allVOs) {
            // 设置直属人数 (默认为0)
            vo.setUserCount(directCountMap.getOrDefault(vo.getId(), 0L));

            // 组装父子关系
            Long pid = vo.getParentId();
            if (pid == null || pid == 0) {
                rootNodes.add(vo);
            } else {
                UserGroupVO parent = voMap.get(pid);
                if (parent != null) {
                    if (parent.getChildren() == null) {
                        parent.setChildren(new ArrayList<>());
                    }
                    parent.getChildren().add(vo);
                }
            }
        }

        // 5. 递归累加子分组人数到父级 (实现截图中的 "机械加工部 12人" = 5+4+3)
        for (UserGroupVO root : rootNodes) {
            calculateTotalCount(root);
        }

        return rootNodes;
    }

    // 递归辅助方法：计算总人数
    private long calculateTotalCount(UserGroupVO current) {
        long sum = current.getUserCount(); // 先加上直属人数
        if (!CollectionUtils.isEmpty(current.getChildren())) {
            for (UserGroupVO child : current.getChildren()) {
                sum += calculateTotalCount(child); // 累加子分组人数
            }
        }
        current.setUserCount(sum); // 更新总人数
        return sum;
    }

    /**
     * 新增/修改
     */
    public boolean saveOrUpdateDept(UserGroupDTO dto) {
        UserGroup entity = userGroupConvert.toEntity(dto);
        if (entity.getParentId() == null) {
            entity.setParentId(0L);
        }
        return this.saveOrUpdate(entity);
    }

    /**
     * 导入分组
     */
    @Transactional(rollbackFor = Exception.class)
    public void importDepartments(MultipartFile file) throws IOException {
        List<UserGroupImportDTO> importList = EasyExcel.read(file.getInputStream())
                .head(UserGroupImportDTO.class)
                .sheet()
                .doReadSync();

        if (CollectionUtils.isEmpty(importList)) {
            return;
        }

        // 现有分组缓存 (Name -> ID)
        List<UserGroup> existDepts = this.list();
        Map<String, Long> nameToIdMap = existDepts.stream()
                .collect(Collectors.toMap(UserGroup::getName, UserGroup::getId, (v1, v2) -> v1));

        List<UserGroup> toSave = new ArrayList<>();

        // 简单处理：假设Excel里的上级分组已经存在，或者在本次导入列表中
        // 真实场景可能需要做两遍循环：第一遍存所有分组，第二遍更新父子关系。这里为了演示做简单处理。

        for (UserGroupImportDTO dto : importList) {
            // 如果已存在同名分组，跳过或更新 (这里选择跳过)
            if (nameToIdMap.containsKey(dto.getName())) {
                continue;
            }

            UserGroup dept = new UserGroup();
            dept.setName(dto.getName());
            dept.setOrderNum(dto.getOrderNum() == null ? 0 : dto.getOrderNum());

            // 尝试查找父级
            if (StringUtils.hasText(dto.getParentName())) {
                Long pid = nameToIdMap.get(dto.getParentName());
                dept.setParentId(pid != null ? pid : 0L);
            } else {
                dept.setParentId(0L);
            }

            // 保存并刷新缓存(因为下一条数据可能依赖这一条)
            this.save(dept);
            nameToIdMap.put(dept.getName(), dept.getId());
        }
    }

    /**
     * 导出分组结构
     */
    public void exportDepartments(HttpServletResponse response) throws IOException {
        // 获取带层级和人数的数据
        List<UserGroupVO> tree = getDepartmentTree();
        List<UserGroupExportDTO> exportList = new ArrayList<>();

        // 递归平铺 Tree -> List
        flattenTreeForExport(tree, null, exportList);

        response.setContentType("application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
        response.setCharacterEncoding("utf-8");
        String fileName = URLEncoder.encode("分组结构表", StandardCharsets.UTF_8).replaceAll("\\+", "%20");
        response.setHeader("Content-disposition", "attachment;filename*=utf-8''" + fileName + ".xlsx");

        EasyExcel.write(response.getOutputStream(), UserGroupExportDTO.class)
                .sheet("分组信息")
                .doWrite(exportList);
    }

    private void flattenTreeForExport(List<UserGroupVO> nodes, String parentName, List<UserGroupExportDTO> result) {
        if (CollectionUtils.isEmpty(nodes)) {
            return;
        }
        for (UserGroupVO node : nodes) {
            UserGroupExportDTO dto = new UserGroupExportDTO();
            dto.setName(node.getName());
            dto.setParentName(parentName);
            dto.setUserCount(node.getUserCount());
            dto.setOrderNum(node.getOrderNum());
            result.add(dto);

            // 递归处理子节点
            flattenTreeForExport(node.getChildren(), node.getName(), result);
        }
    }

    /**
     * 删除分组
     */
    public void remove(Long id) {
        // 校验1: 是否有子分组
        long childCount = this.count(new LambdaQueryWrapper<UserGroup>().eq(UserGroup::getParentId, id));
        if (childCount > 0) {
            throw new ApiException("请先删除子分组");
        }
        // 校验2: 是否有用户
        long empCount = userDao.selectCount(new LambdaQueryWrapper<User>().eq(User::getGroupId, id));
        if (empCount > 0) {
            throw new ApiException("该分组下还有用户，禁止删除");
        }
        this.removeById(id);
    }
}
