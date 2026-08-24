/**
 * 通用配置与工具函数
 * 包含：API地址管理、通用请求封装、全局变量
 */
window.MyConfig = {
    // 1. 接口基础地址 (根据你的Swagger，所有接口都在 /admin/v1 下)
    API_BASE: '/smart-cabinet/admin/v1',

    // 2. 封装通用的 Ajax 请求
    request: function (url, method, data, successCallback) {
        var $ = layui.jquery;
        var layer = layui.layer;

        var fullUrl = this.API_BASE + url;
        var token = localStorage.getItem('token');

        $.ajax({
            url: fullUrl,
            type: method,
            contentType: 'application/json;charset=UTF-8',
            data: method === 'GET' ? data : JSON.stringify(data),
            headers: {
                'Authorization': token ? ('Bearer ' + token) : ''
            },
            success: function (res) {
                if (res.code === 200 || res.code === 0) {
                    if (successCallback) successCallback(res.data);
                } else {
                    layer.msg(res.message || res.msg || '操作失败', {icon: 2});
                }
            },
            error: function (xhr) {
                console.error("请求失败:", xhr);
                if (xhr.status === 401) {
                    layer.msg('登录已过期，请重新登录', {icon: 2, time: 1500}, function () {
                        localStorage.removeItem('token');
                        localStorage.removeItem('userInfo');
                        if (window.top !== window.self) {
                            window.top.location.href = '/login.html';
                        } else {
                            window.location.href = '/login.html';
                        }
                    });
                } else {
                    layer.msg('服务器连接异常 (' + xhr.status + ')', {icon: 2});
                }
            }
        });
    },

    /**
     * 通用打开表单弹窗 (Iframe模式) - 支持自定义宽高
     * * 调用方式 1 (使用默认宽高 700x550):
     * openFormModal(url, title, callback)
     * * 调用方式 2 (自定义宽高):
     * openFormModal(url, title, '800px', '600px', callback)
     */
    openFormModal: function (url, title, width, height, endCallback) {
        // --- 核心：参数重载处理 ---
        // 如果第3个参数是函数，说明用户没传宽高，直接传了回调
        if (typeof width === 'function') {
            endCallback = width;
            width = undefined;
            height = undefined;
        }

        // 如果宽高为空，则使用默认值
        var w = width || '700px';
        var h = height || '550px';

        layui.layer.open({
            type: 2, // iframe 层
            title: title,
            shade: 0.2,
            maxmin: true, // 允许最大化
            shadeClose: true, // 点击遮罩关闭
            area: [w, h], // 动态宽高
            content: url,
            end: function () {
                if (endCallback) endCallback();
            }
        });
    },

    /**
     * 获取 URL 中的查询参数
     */
    getUrlParam: function (name) {
        var reg = new RegExp("(^|&)" + name + "=([^&]*)(&|$)");
        var r = window.location.search.substr(1).match(reg);
        if (r != null) return unescape(r[2]);
        return null;
    },

    /**
     * 公共时间处理方法：修复带 T 的字符串或数组格式的时间
     * @param dateVal 后台返回的时间数据（可以是带T的字符串，也可以是数组）
     * @param onlyDate 是否只保留年月日 (true: 返回 yyyy-MM-dd, false: 返回 yyyy-MM-dd HH:mm:ss)
     */
    formatDate: function (dateVal, onlyDate) {
        if (!dateVal) return '';

        // 1. 处理被 Spring Boot 序列化成数组的情况 (例如：[2026, 5, 9, 17, 30, 46])
        if (Array.isArray(dateVal)) {
            var year = dateVal[0];
            var month = dateVal[1] < 10 ? '0' + dateVal[1] : dateVal[1];
            var day = dateVal[2] < 10 ? '0' + dateVal[2] : dateVal[2];
            var datePart = year + '-' + month + '-' + day;

            // 如果只要求年月日，或者数组长度不够时分秒
            if (onlyDate || dateVal.length < 4) {
                return datePart;
            }
            var hour = dateVal[3] < 10 ? '0' + dateVal[3] : dateVal[3];
            var minute = dateVal[4] < 10 ? '0' + dateVal[4] : dateVal[4];
            var second = dateVal[5] < 10 ? '0' + dateVal[5] : dateVal[5];
            return datePart + ' ' + hour + ':' + minute + ':' + second;
        }

        // 2. 处理标准字符串格式 (例如："2026-05-09T17:30:46.000+08:00")
        if (typeof dateVal === 'string') {
            // 把 T 替换为空格
            var cleanStr = dateVal.replace('T', ' ');
            // 截取掉可能存在的毫秒和时区，只保留前19位 (yyyy-MM-dd HH:mm:ss)
            if (cleanStr.length > 19) {
                cleanStr = cleanStr.substring(0, 19);
            }
            // 如果只要年月日，截取前10位
            if (onlyDate) {
                return cleanStr.substring(0, 10);
            }
            return cleanStr;
        }

        return String(dateVal);
    },
};