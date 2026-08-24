package d1.device.vgsdk.service;

import d1.device.vgsdk.service.api.IAccessDeviceManagerService;
import d1.device.vgsdk.service.api.IAccessUserService;
import d1.device.vgsdk.service.api.IDeviceMqtt;
import d1.device.vgsdk.service.api.IVguangAccessDevice;

/**
 * 管理多个同样设备类型（接口类型）的服务接口
 * 是设备管理sdk的主服务接口，通过此接口屏蔽设备的差异性
 *
 * @author liuyi
 */
public interface IManagerService extends IDeviceMqtt, IAccessUserService, IVguangAccessDevice, IAccessDeviceManagerService {


}