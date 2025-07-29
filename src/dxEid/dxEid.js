import { eidClass } from './libvbar-m-dxeid.so'
const eidObj = new eidClass();

const eid = {
    /**
     * @brief  云证激活
     * @param {string} sn       设备sn
     * @param {string} version  业务自定义版本号
     * @param {string} mac      设备mac地址
     * @param {string} codeMsg  云证激活码数据
     * @returns 
     */
    active: function(sn, version, mac, codeMsg){
        
        if(!sn){
            throw("sn should not be null or empty")
        }
        if(!version){
            throw("version should not be null or empty")
        }
        if(!mac){
            throw("mac should not be null or empty")
        }
        if(!codeMsg){
            throw("codeMsg should not be null or empty")
        }
        return eidObj.active(sn, version, mac, codeMsg);
    },
    /**
     * @brief   获取信息
     */
    getInfo: function(){
        if(data == null || data.length < 1){
            throw("data should not be null or empty")
        }
        return eidObj.getInfo(data)
    },
    /**
     * @brief   获取版本号
     */
    getVersion: function(){
        return eidObj.getVersion()
    },
}

export default eid;